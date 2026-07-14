alter table public.product_variants
  add constraint product_variants_sale_window_requires_compare_price
  check (
    (sale_starts_at is null and sale_ends_at is null)
    or compare_at_price_cad is not null
  );

alter function public.admin_save_product_variants(uuid, jsonb)
  rename to admin_save_product_variants_phase_5b;

create function public.admin_save_product_variants(
  p_product_id uuid,
  p_configuration jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  variant_item jsonb;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.product_variants
  set sale_starts_at = null,
      sale_ends_at = null
  where product_id = p_product_id;

  perform public.admin_save_product_variants_phase_5b(p_product_id, p_configuration);

  for variant_item in select value from jsonb_array_elements(p_configuration -> 'variants')
  loop
    update public.product_variants
    set sale_starts_at = nullif(variant_item ->> 'saleStartsAt', '')::timestamptz,
        sale_ends_at = nullif(variant_item ->> 'saleEndsAt', '')::timestamptz
    where id = (variant_item ->> 'id')::uuid
      and product_id = p_product_id;
  end loop;
end;
$$;

create or replace function public.admin_save_product_operations(
  p_product_id uuid,
  p_is_featured boolean,
  p_published_at timestamptz
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  current_status public.product_status;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  select status into current_status
  from public.products
  where id = p_product_id;

  if current_status is null then
    raise no_data_found using message = 'Product not found';
  end if;

  if current_status = 'published' and p_published_at is null then
    raise check_violation using message = 'Published product requires a publication time';
  end if;

  update public.products
  set is_featured = p_is_featured,
      published_at = p_published_at
  where id = p_product_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    'catalog.product.operations.update',
    'product',
    p_product_id::text,
    jsonb_build_object(
      'is_featured', p_is_featured,
      'published_at', p_published_at
    )
  );
end;
$$;

create or replace function public.admin_register_product_images(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  image_item jsonb;
  next_sort_order integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise no_data_found using message = 'Product not found';
  end if;

  if jsonb_typeof(p_images) <> 'array'
    or jsonb_array_length(p_images) not between 1 and 20
  then
    raise check_violation using message = 'Image batch must contain between one and twenty files';
  end if;

  select coalesce(max(sort_order) + 1, 0)
  into next_sort_order
  from public.product_images
  where product_id = p_product_id;

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    if image_item ->> 'storagePath' !~ (
      '^products/' || p_product_id::text ||
      '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
    ) then
      raise check_violation using message = 'Invalid product image path';
    end if;

    insert into public.product_images (
      id,
      product_id,
      variant_id,
      storage_path,
      alt_text,
      sort_order,
      width,
      height
    ) values (
      (image_item ->> 'id')::uuid,
      p_product_id,
      nullif(image_item ->> 'variantId', '')::uuid,
      image_item ->> 'storagePath',
      btrim(image_item ->> 'altText'),
      next_sort_order,
      nullif(image_item ->> 'width', '')::integer,
      nullif(image_item ->> 'height', '')::integer
    );
    next_sort_order := next_sort_order + 1;
  end loop;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    'catalog.product.images.upload',
    'product',
    p_product_id::text,
    jsonb_build_object('image_count', jsonb_array_length(p_images))
  );
end;
$$;

create or replace function public.admin_save_product_images(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  image_item jsonb;
  image_index integer := 0;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  if jsonb_typeof(p_images) <> 'array'
    or jsonb_array_length(p_images) > 100
  then
    raise check_violation using message = 'Invalid image configuration';
  end if;

  if jsonb_array_length(p_images) <> (
    select count(*) from public.product_images where product_id = p_product_id
  ) or exists (
    select 1
    from public.product_images as existing
    where existing.product_id = p_product_id
      and not exists (
        select 1
        from jsonb_array_elements(p_images) as item
        where (item ->> 'id')::uuid = existing.id
      )
  ) then
    raise check_violation using message = 'Image configuration is stale';
  end if;

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    update public.product_images
    set alt_text = btrim(image_item ->> 'altText'),
        variant_id = nullif(image_item ->> 'variantId', '')::uuid,
        sort_order = image_index
    where id = (image_item ->> 'id')::uuid
      and product_id = p_product_id;

    if not found then
      raise check_violation using message = 'Image does not belong to product';
    end if;
    image_index := image_index + 1;
  end loop;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    'catalog.product.images.update',
    'product',
    p_product_id::text,
    jsonb_build_object('image_count', jsonb_array_length(p_images))
  );
end;
$$;

create or replace function public.admin_delete_product_image(
  p_product_id uuid,
  p_image_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deleted_image public.product_images%rowtype;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  delete from public.product_images
  where id = p_image_id and product_id = p_product_id
  returning * into deleted_image;

  if deleted_image.id is null then
    raise no_data_found using message = 'Product image not found';
  end if;

  update public.product_images
  set sort_order = sort_order - 1
  where product_id = p_product_id
    and sort_order > deleted_image.sort_order;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    'catalog.product.images.delete',
    'product_image',
    p_image_id::text,
    jsonb_build_object('product_id', p_product_id)
  );

  return to_jsonb(deleted_image);
end;
$$;

create or replace function public.admin_restore_product_image(
  p_image jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.product_images
  set sort_order = sort_order + 1
  where product_id = (p_image ->> 'product_id')::uuid
    and sort_order >= (p_image ->> 'sort_order')::integer;

  insert into public.product_images (
    id,
    product_id,
    variant_id,
    storage_path,
    alt_text,
    sort_order,
    width,
    height,
    created_at
  ) values (
    (p_image ->> 'id')::uuid,
    (p_image ->> 'product_id')::uuid,
    nullif(p_image ->> 'variant_id', '')::uuid,
    p_image ->> 'storage_path',
    p_image ->> 'alt_text',
    (p_image ->> 'sort_order')::integer,
    nullif(p_image ->> 'width', '')::integer,
    nullif(p_image ->> 'height', '')::integer,
    (p_image ->> 'created_at')::timestamptz
  );
end;
$$;

revoke all on function public.admin_save_product_operations(uuid, boolean, timestamptz)
  from public, anon;
revoke all on function public.admin_save_product_variants(uuid, jsonb)
  from public, anon;
revoke all on function public.admin_register_product_images(uuid, jsonb)
  from public, anon;
revoke all on function public.admin_save_product_images(uuid, jsonb)
  from public, anon;
revoke all on function public.admin_delete_product_image(uuid, uuid)
  from public, anon;
revoke all on function public.admin_restore_product_image(jsonb)
  from public, anon;

grant execute on function public.admin_save_product_operations(uuid, boolean, timestamptz)
  to authenticated;
grant execute on function public.admin_save_product_variants(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_register_product_images(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_save_product_images(uuid, jsonb)
  to authenticated;
grant execute on function public.admin_delete_product_image(uuid, uuid)
  to authenticated;
grant execute on function public.admin_restore_product_image(jsonb)
  to authenticated;
