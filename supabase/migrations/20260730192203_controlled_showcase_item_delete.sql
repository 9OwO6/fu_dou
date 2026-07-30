create or replace function public.admin_delete_showcase_item(p_item_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  item_short_code text;
  item_availability public.showcase_item_availability;
  storage_paths jsonb;
  style_group_id uuid;
  deleted_count integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  select item.short_code, item.availability
  into item_short_code, item_availability
  from public.showcase_items item
  where item.id = p_item_id
  for update;

  if not found then
    raise no_data_found using message = 'Showcase item not found';
  end if;
  if item_availability <> 'archived' then
    raise check_violation using message = 'Only archived showcase items can be permanently deleted';
  end if;

  select coalesce(jsonb_agg(image.storage_path order by image.sort_order), '[]'::jsonb)
  into storage_paths
  from public.showcase_item_images image
  where image.item_id = p_item_id;

  select member.group_id
  into style_group_id
  from public.showcase_style_group_items member
  where member.item_id = p_item_id;

  if style_group_id is not null then
    delete from public.showcase_style_groups where id = style_group_id;
  end if;

  delete from public.showcase_items where id = p_item_id;
  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then
    raise no_data_found using message = 'Showcase item not found';
  end if;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.item.delete',
    'showcase_item',
    p_item_id::text,
    jsonb_build_object(
      'short_code', item_short_code,
      'image_count', jsonb_array_length(storage_paths),
      'dissolved_style_group_id', style_group_id
    )
  );

  return jsonb_build_object(
    'item_id', p_item_id,
    'short_code', item_short_code,
    'storage_paths', storage_paths,
    'dissolved_style_group_id', style_group_id
  );
end;
$$;

revoke all on function public.admin_delete_showcase_item(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_showcase_item(uuid) to authenticated;
