create or replace function private.refresh_showcase_image_alt_text(p_item_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.showcase_image_translations translation
  set alt_text = coalesce(item_translation.title, 'Happy Beans 新品 ' || item.short_code)
    || ' 图片 ' || (image.sort_order + 1)
  from public.showcase_item_images image
  join public.showcase_items item on item.id = image.item_id
  left join public.showcase_item_translations item_translation
    on item_translation.item_id = item.id and item_translation.locale = 'zh'
  where translation.image_id = image.id
    and translation.locale = 'zh'
    and image.item_id = p_item_id;

  update public.showcase_image_translations translation
  set alt_text = coalesce(item_translation.title, 'Happy Beans new arrival ' || item.short_code)
    || ', image ' || (image.sort_order + 1)
  from public.showcase_item_images image
  join public.showcase_items item on item.id = image.item_id
  left join public.showcase_item_translations item_translation
    on item_translation.item_id = item.id and item_translation.locale = 'en'
  where translation.image_id = image.id
    and translation.locale = 'en'
    and image.item_id = p_item_id;
end;
$$;

create or replace function public.admin_add_showcase_images(
  p_item_id uuid,
  p_images jsonb
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  image jsonb;
  image_id uuid;
  image_index integer;
  current_count integer;
  added_count integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if p_item_id is null or jsonb_typeof(p_images) <> 'array'
    or jsonb_array_length(p_images) not between 1 and 10
  then
    raise invalid_parameter_value using message = 'Invalid showcase image addition';
  end if;

  perform 1 from public.showcase_items where id = p_item_id for update;
  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;

  select count(*)::integer
  into current_count
  from public.showcase_item_images
  where item_id = p_item_id;

  added_count := jsonb_array_length(p_images);
  if current_count + added_count > 10 then
    raise check_violation using message = 'A showcase item can contain at most ten images';
  end if;

  image_index := current_count;
  for image in select value from jsonb_array_elements(p_images)
  loop
    image_id := (image ->> 'id')::uuid;
    if image ->> 'storagePath' !~ (
      '^showcase/' || p_item_id::text || '/' || image_id::text || '\.(jpg|jpeg|png|webp)$'
    ) then
      raise check_violation using message = 'Invalid edited showcase image path';
    end if;

    insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
    values (
      image_id,
      p_item_id,
      image ->> 'storagePath',
      image_index,
      nullif(image ->> 'width', '')::integer,
      nullif(image ->> 'height', '')::integer
    );
    insert into public.showcase_image_translations (image_id, locale, alt_text)
    values (image_id, 'zh', 'Happy Beans 新品图片'), (image_id, 'en', 'Happy Beans new arrival image');
    image_index := image_index + 1;
  end loop;

  perform private.refresh_showcase_image_alt_text(p_item_id);
  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.images.add',
    'showcase_item',
    p_item_id::text,
    jsonb_build_object('image_count', added_count)
  );
  return added_count;
end;
$$;

create or replace function public.admin_delete_showcase_image(
  p_item_id uuid,
  p_image_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deleted_image public.showcase_item_images%rowtype;
  shifted_image record;
  image_count integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  perform 1 from public.showcase_items where id = p_item_id for update;
  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;

  select count(*)::integer
  into image_count
  from public.showcase_item_images
  where item_id = p_item_id;

  if image_count <= 1 then
    raise check_violation using message = 'A showcase item must keep at least one image';
  end if;

  delete from public.showcase_item_images
  where id = p_image_id and item_id = p_item_id
  returning * into deleted_image;
  if deleted_image.id is null then
    raise no_data_found using message = 'Showcase image not found';
  end if;

  for shifted_image in
    select id
    from public.showcase_item_images
    where item_id = p_item_id and sort_order > deleted_image.sort_order
    order by sort_order
  loop
    update public.showcase_item_images
    set sort_order = sort_order - 1
    where id = shifted_image.id;
  end loop;

  perform private.refresh_showcase_image_alt_text(p_item_id);
  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.image.delete',
    'showcase_item',
    p_item_id::text,
    jsonb_build_object('image_id', p_image_id, 'storage_path', deleted_image.storage_path)
  );
  return to_jsonb(deleted_image) - 'created_at';
end;
$$;

create or replace function public.admin_restore_showcase_image(p_image jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  restored_id uuid := (p_image ->> 'id')::uuid;
  restored_item_id uuid := (p_image ->> 'item_id')::uuid;
  restored_path text := p_image ->> 'storage_path';
  restored_sort integer := (p_image ->> 'sort_order')::integer;
  shifted_image record;
  image_count integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  perform 1 from public.showcase_items where id = restored_item_id for update;
  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;

  select count(*)::integer
  into image_count
  from public.showcase_item_images
  where item_id = restored_item_id;

  if image_count >= 10
    or restored_sort not between 0 and image_count
    or restored_path !~ (
      '^showcase/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
      || restored_id::text || '\.(jpg|jpeg|png|webp)$'
    )
  then
    raise invalid_parameter_value using message = 'Invalid showcase image restoration';
  end if;

  for shifted_image in
    select id
    from public.showcase_item_images
    where item_id = restored_item_id and sort_order >= restored_sort
    order by sort_order desc
  loop
    update public.showcase_item_images
    set sort_order = sort_order + 1
    where id = shifted_image.id;
  end loop;

  insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
  values (
    restored_id,
    restored_item_id,
    restored_path,
    restored_sort,
    nullif(p_image ->> 'width', '')::integer,
    nullif(p_image ->> 'height', '')::integer
  );
  insert into public.showcase_image_translations (image_id, locale, alt_text)
  values (restored_id, 'zh', 'Happy Beans 新品图片'), (restored_id, 'en', 'Happy Beans new arrival image');
  perform private.refresh_showcase_image_alt_text(restored_item_id);

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.image.restore',
    'showcase_item',
    restored_item_id::text,
    jsonb_build_object('image_id', restored_id)
  );
end;
$$;

create or replace function public.admin_move_showcase_image(
  p_item_id uuid,
  p_image_id uuid,
  p_target_sort_order integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_sort integer;
  image_count integer;
  shifted_image record;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  select sort_order
  into current_sort
  from public.showcase_item_images
  where id = p_image_id and item_id = p_item_id
  for update;
  select count(*)::integer into image_count from public.showcase_item_images where item_id = p_item_id;

  if current_sort is null or p_target_sort_order not between 0 and image_count - 1 then
    raise invalid_parameter_value using message = 'Invalid showcase image move';
  end if;
  if current_sort = p_target_sort_order then
    return;
  end if;

  update public.showcase_item_images set sort_order = 1000 where id = p_image_id;
  if p_target_sort_order < current_sort then
    for shifted_image in
      select id from public.showcase_item_images
      where item_id = p_item_id and sort_order between p_target_sort_order and current_sort - 1
      order by sort_order desc
    loop
      update public.showcase_item_images set sort_order = sort_order + 1 where id = shifted_image.id;
    end loop;
  else
    for shifted_image in
      select id from public.showcase_item_images
      where item_id = p_item_id and sort_order between current_sort + 1 and p_target_sort_order
      order by sort_order
    loop
      update public.showcase_item_images set sort_order = sort_order - 1 where id = shifted_image.id;
    end loop;
  end if;
  update public.showcase_item_images set sort_order = p_target_sort_order where id = p_image_id;

  perform private.refresh_showcase_image_alt_text(p_item_id);
  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.image.move',
    'showcase_item',
    p_item_id::text,
    jsonb_build_object('image_id', p_image_id, 'target_sort_order', p_target_sort_order)
  );
end;
$$;

create or replace function public.admin_replace_showcase_image(
  p_item_id uuid,
  p_old_image_id uuid,
  p_new_image jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  old_image public.showcase_item_images%rowtype;
  new_image_id uuid := (p_new_image ->> 'id')::uuid;
  new_storage_path text := p_new_image ->> 'storagePath';
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  perform 1 from public.showcase_items where id = p_item_id for update;
  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;

  select *
  into old_image
  from public.showcase_item_images
  where id = p_old_image_id and item_id = p_item_id
  for update;
  if old_image.id is null then
    raise no_data_found using message = 'Showcase image not found';
  end if;
  if new_storage_path !~ (
    '^showcase/' || p_item_id::text || '/' || new_image_id::text || '\.(jpg|jpeg|png|webp)$'
  ) then
    raise check_violation using message = 'Invalid replacement showcase image path';
  end if;

  update public.showcase_item_images set sort_order = 1000 where id = old_image.id;
  insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
  values (
    new_image_id,
    p_item_id,
    new_storage_path,
    old_image.sort_order,
    nullif(p_new_image ->> 'width', '')::integer,
    nullif(p_new_image ->> 'height', '')::integer
  );
  insert into public.showcase_image_translations (image_id, locale, alt_text)
  values (new_image_id, 'zh', 'Happy Beans 新品图片'), (new_image_id, 'en', 'Happy Beans new arrival image');
  delete from public.showcase_item_images where id = old_image.id;
  perform private.refresh_showcase_image_alt_text(p_item_id);

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.image.replace',
    'showcase_item',
    p_item_id::text,
    jsonb_build_object('old_image_id', p_old_image_id, 'new_image_id', new_image_id)
  );
  return to_jsonb(old_image) - 'created_at';
end;
$$;

create or replace function public.admin_revert_showcase_image_replace(
  p_old_image jsonb,
  p_new_image_id uuid
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  old_id uuid := (p_old_image ->> 'id')::uuid;
  old_item_id uuid := (p_old_image ->> 'item_id')::uuid;
  old_path text := p_old_image ->> 'storage_path';
  old_sort integer := (p_old_image ->> 'sort_order')::integer;
  new_image public.showcase_item_images%rowtype;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  perform 1 from public.showcase_items where id = old_item_id for update;
  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;
  select *
  into new_image
  from public.showcase_item_images
  where id = p_new_image_id and item_id = old_item_id
  for update;
  if new_image.id is null or new_image.sort_order <> old_sort
    or old_path !~ (
      '^showcase/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/'
      || old_id::text || '\.(jpg|jpeg|png|webp)$'
    )
  then
    raise invalid_parameter_value using message = 'Invalid showcase image replacement rollback';
  end if;

  delete from public.showcase_item_images where id = new_image.id;
  insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
  values (
    old_id,
    old_item_id,
    old_path,
    old_sort,
    nullif(p_old_image ->> 'width', '')::integer,
    nullif(p_old_image ->> 'height', '')::integer
  );
  insert into public.showcase_image_translations (image_id, locale, alt_text)
  values (old_id, 'zh', 'Happy Beans 新品图片'), (old_id, 'en', 'Happy Beans new arrival image');
  perform private.refresh_showcase_image_alt_text(old_item_id);

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.image.replace.restore',
    'showcase_item',
    old_item_id::text,
    jsonb_build_object('old_image_id', old_id, 'removed_new_image_id', p_new_image_id)
  );
end;
$$;

revoke all on function private.refresh_showcase_image_alt_text(uuid) from public, anon;
revoke all on function public.admin_add_showcase_images(uuid, jsonb) from public, anon;
revoke all on function public.admin_delete_showcase_image(uuid, uuid) from public, anon;
revoke all on function public.admin_restore_showcase_image(jsonb) from public, anon;
revoke all on function public.admin_move_showcase_image(uuid, uuid, integer) from public, anon;
revoke all on function public.admin_replace_showcase_image(uuid, uuid, jsonb) from public, anon;
revoke all on function public.admin_revert_showcase_image_replace(jsonb, uuid) from public, anon;

grant execute on function private.refresh_showcase_image_alt_text(uuid) to authenticated;
grant execute on function public.admin_add_showcase_images(uuid, jsonb) to authenticated;
grant execute on function public.admin_delete_showcase_image(uuid, uuid) to authenticated;
grant execute on function public.admin_restore_showcase_image(jsonb) to authenticated;
grant execute on function public.admin_move_showcase_image(uuid, uuid, integer) to authenticated;
grant execute on function public.admin_replace_showcase_image(uuid, uuid, jsonb) to authenticated;
grant execute on function public.admin_revert_showcase_image_replace(jsonb, uuid) to authenticated;
