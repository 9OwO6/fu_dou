create or replace function public.admin_delete_product(p_product_id uuid)
returns text[]
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  product_record public.products%rowtype;
  image_paths text[];
  image_ids text[];
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  select *
  into product_record
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise no_data_found using message = 'Product not found';
  end if;

  if product_record.status = 'published' then
    raise object_not_in_prerequisite_state
      using message = 'Published products must be unpublished before deletion';
  end if;

  if exists (
    select 1
    from public.order_request_items
    where product_id = p_product_id
  ) then
    raise foreign_key_violation
      using message = 'Products referenced by order requests cannot be deleted';
  end if;

  select
    coalesce(array_agg(storage_path order by sort_order, id), array[]::text[]),
    coalesce(array_agg(id::text order by sort_order, id), array[]::text[])
  into image_paths, image_ids
  from public.product_images
  where product_id = p_product_id;

  update public.homepage_sections
  set settings_json = jsonb_set(
    settings_json,
    '{productIds}',
    coalesce(
      (
        select jsonb_agg(item)
        from jsonb_array_elements(coalesce(settings_json->'productIds', '[]'::jsonb)) as item
        where item <> to_jsonb(p_product_id::text)
      ),
      '[]'::jsonb
    )
  )
  where section_type in ('new_products', 'featured_products', 'sale_products')
    and jsonb_typeof(settings_json->'productIds') = 'array';

  update public.homepage_sections
  set settings_json = jsonb_set(settings_json, '{imageId}', 'null'::jsonb)
  where section_type in ('hero', 'brand_story')
    and settings_json->>'imageId' = any(image_ids);

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    actor_id,
    'catalog.product.delete',
    'product',
    p_product_id::text,
    jsonb_build_object(
      'slug', product_record.slug,
      'status', product_record.status::text,
      'image_paths', to_jsonb(image_paths)
    )
  );

  delete from public.products where id = p_product_id;

  return image_paths;
end;
$$;

revoke all on function public.admin_delete_product(uuid) from public, anon;
grant execute on function public.admin_delete_product(uuid) to authenticated;
