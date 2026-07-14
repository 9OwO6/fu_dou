begin;

create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.sqlstate_of(command text)
returns text
language plpgsql
as $$
begin
  execute command;
  return null;
exception
  when others then
    return sqlstate;
end;
$$;

insert into auth.users (id, email)
values
  ('da000000-0000-4000-8000-000000000001', 'delete-admin@example.invalid'),
  ('da000000-0000-4000-8000-000000000002', 'delete-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('da000000-0000-4000-8000-000000000001', '删除测试管理员', 'admin');

insert into public.products (id, slug, status, published_at)
values
  ('da100000-0000-4000-8000-000000000001', 'delete-draft', 'draft', null),
  ('da100000-0000-4000-8000-000000000002', 'delete-published', 'published', now()),
  ('da100000-0000-4000-8000-000000000003', 'delete-ordered', 'draft', null);

insert into public.product_translations (product_id, locale, title)
values
  ('da100000-0000-4000-8000-000000000001', 'zh', '待删除草稿'),
  ('da100000-0000-4000-8000-000000000002', 'zh', '已发布商品'),
  ('da100000-0000-4000-8000-000000000003', 'zh', '订单引用商品');

insert into public.product_variants (id, product_id, sku, price_cad, stock_qty)
values
  ('da200000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001', 'DELETE-DRAFT', 12.00, 1),
  ('da200000-0000-4000-8000-000000000003', 'da100000-0000-4000-8000-000000000003', 'DELETE-ORDERED', 18.00, 1);

insert into public.product_images (id, product_id, storage_path, alt_text)
values ('da300000-0000-4000-8000-000000000001', 'da100000-0000-4000-8000-000000000001', 'products/da100000-0000-4000-8000-000000000001/delete.webp', '待删除图片');

insert into public.order_requests (
  id, customer_name, email, preferred_contact, fulfillment_method,
  city_or_area, subtotal_snapshot
) values (
  'da400000-0000-4000-8000-000000000001', '测试顾客', 'customer@example.invalid',
  'email', 'pickup', 'Vancouver', 18.00
);

insert into public.order_request_items (
  order_request_id, product_id, variant_id, product_title_snapshot,
  variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
  line_total_snapshot
) values (
  'da400000-0000-4000-8000-000000000001',
  'da100000-0000-4000-8000-000000000003',
  'da200000-0000-4000-8000-000000000003',
  '订单引用商品', '默认规格', 'DELETE-ORDERED', 18.00, 1, 18.00
);

update public.homepage_sections
set settings_json = jsonb_set(settings_json, '{productIds}', '["da100000-0000-4000-8000-000000000001"]'::jsonb)
where section_type = 'featured_products';

update public.homepage_sections
set settings_json = jsonb_set(settings_json, '{imageId}', '"da300000-0000-4000-8000-000000000001"'::jsonb)
where section_type = 'hero';

select plan(12);

select ok(
  not (select prosecdef from pg_proc where oid = 'public.admin_delete_product(uuid)'::regprocedure),
  'product delete function uses security invoker'
);

select is(
  (select count(*)::integer from information_schema.routine_privileges
   where routine_schema = 'public' and routine_name = 'admin_delete_product' and grantee = 'anon'),
  0,
  'anon cannot execute product deletion'
);

select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$ select public.admin_delete_product('da100000-0000-4000-8000-000000000001') $command$),
  '42501',
  'non-admin cannot delete a product'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"da000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$ select public.admin_delete_product('da100000-0000-4000-8000-000000000002') $command$),
  '55000',
  'published product must be unpublished before deletion'
);

select is(
  pg_temp.sqlstate_of($command$ select public.admin_delete_product('da100000-0000-4000-8000-000000000003') $command$),
  '23503',
  'order-referenced product cannot be deleted'
);

select results_eq(
  $query$ select unnest(public.admin_delete_product('da100000-0000-4000-8000-000000000001')) $query$,
  array['products/da100000-0000-4000-8000-000000000001/delete.webp'::text],
  'draft deletion returns Storage paths for API cleanup'
);

select is((select count(*)::integer from public.products where id = 'da100000-0000-4000-8000-000000000001'), 0, 'draft product is deleted');
select is((select count(*)::integer from public.product_variants where product_id = 'da100000-0000-4000-8000-000000000001'), 0, 'dependent variants are deleted');
select is((select count(*)::integer from public.product_images where product_id = 'da100000-0000-4000-8000-000000000001'), 0, 'dependent image metadata is deleted');
select is((select settings_json->'productIds' from public.homepage_sections where section_type = 'featured_products'), '[]'::jsonb, 'homepage manual selection is cleaned');
select is((select settings_json->'imageId' from public.homepage_sections where section_type = 'hero'), 'null'::jsonb, 'homepage image selection is cleaned');
select is((select count(*)::integer from public.admin_audit_logs where action = 'catalog.product.delete' and target_id = 'da100000-0000-4000-8000-000000000001'), 1, 'successful deletion is audited');

select * from finish();
rollback;
