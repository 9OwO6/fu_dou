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
  ('a0000000-0000-4000-8000-000000000001', 'admin@example.invalid'),
  ('a0000000-0000-4000-8000-000000000002', 'member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('a0000000-0000-4000-8000-000000000001', '测试管理员', 'admin');

insert into public.order_requests (
  id, customer_name, email, preferred_contact, fulfillment_method,
  city_or_area, subtotal_snapshot
)
values (
  'b0000000-0000-4000-8000-000000000001',
  '权限测试顾客',
  'rls-customer@example.invalid',
  'email',
  'pickup',
  'Vancouver',
  24.00
);

insert into public.order_request_items (
  id, order_request_id, product_id, variant_id, product_title_snapshot,
  variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
  line_total_snapshot
)
values (
  'b1000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '权限测试快照',
  '猫猫 / 奶油色',
  'DEMO-MUG-CAT-CREAM',
  24.00,
  1,
  24.00
);

select private.assert_order_request_totals('b0000000-0000-4000-8000-000000000001');

select plan(24);

set local role anon;

select results_eq(
  'select count(*) from public.products',
  array[2::bigint],
  'anon sees only the two published products'
);

select results_eq(
  $query$select count(*) from public.products where slug = 'demo-single-decor'$query$,
  array[0::bigint],
  'anon cannot see draft products'
);

select results_eq(
  'select count(*) from public.product_variants',
  array[6::bigint],
  'anon sees active variants only for published products'
);

select is(
  pg_temp.sqlstate_of('select * from public.order_requests'),
  '42501',
  'anon has no direct read privilege on order requests'
);

select is(
  pg_temp.sqlstate_of('select * from public.profiles'),
  '42501',
  'anon has no direct read privilege on profiles'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.products (slug) values ('anon-cannot-write')
  $command$),
  '42501',
  'anon cannot write catalog data'
);

select results_eq(
  'select count(*) from public.homepage_sections',
  array[10::bigint],
  'anon sees only enabled homepage sections'
);

select results_eq(
  'select count(*) from public.site_settings',
  array[1::bigint],
  'anon can read public site settings'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  'select count(*) from public.products',
  array[2::bigint],
  'non-admin authenticated user sees only published products'
);

select results_eq(
  'select count(*) from public.order_requests',
  array[0::bigint],
  'non-admin cannot read order requests'
);

select results_eq(
  'select count(*) from public.profiles',
  array[0::bigint],
  'non-admin cannot read administrator profiles'
);

select results_eq(
  $query$
    with changed as (
      update public.product_variants
      set stock_qty = 999
      where id = '50000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*) from changed
  $query$,
  array[0::bigint],
  'non-admin cannot update variant inventory'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.products (slug) values ('member-cannot-write')
  $command$),
  '42501',
  'non-admin cannot insert catalog data'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into storage.objects (bucket_id, name)
    values ('product-images', 'products/20000000-0000-4000-8000-000000000001/member.jpg')
  $command$),
  '42501',
  'non-admin cannot upload product images'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  'select count(*) from public.products',
  array[3::bigint],
  'admin sees published and draft products'
);

select results_eq(
  'select count(*) from public.order_requests',
  array[1::bigint],
  'admin can read order requests'
);

select results_eq(
  $query$
    with changed as (
      update public.product_variants
      set stock_qty = 7
      where id = '50000000-0000-4000-8000-000000000001'
      returning 1
    )
    select count(*) from changed
  $query$,
  array[1::bigint],
  'admin can update variant inventory'
);

select is(
  pg_temp.sqlstate_of($command$
    update public.order_requests
    set status = 'contacted'
    where id = 'b0000000-0000-4000-8000-000000000001'
  $command$),
  '42501',
  'Phase 8 prevents direct order updates so admins must use the audited transition RPC'
);

select is(
  pg_temp.sqlstate_of($command$
    update public.profiles
    set display_name = '不允许浏览器修改'
    where id = 'a0000000-0000-4000-8000-000000000001'
  $command$),
  '42501',
  'even admins cannot modify authorization profiles through the Data API'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into storage.objects (bucket_id, name)
    values ('product-images', 'products/20000000-0000-4000-8000-000000000001/bad.exe')
  $command$),
  '42501',
  'admin upload policy rejects disallowed file extensions'
);

select lives_ok(
  $command$
    insert into storage.objects (bucket_id, name)
    values ('product-images', 'products/20000000-0000-4000-8000-000000000001/admin.jpg')
  $command$,
  'admin can create a product image object at an approved path'
);

select results_eq(
  $query$
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'product_images_storage_admin_delete'
      and cmd = 'DELETE'
  $query$,
  array[1::bigint],
  'an explicit admin DELETE policy exists for the Storage API'
);

select results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'admin can read the administrator profile set'
);

reset role;

select is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name = 'order_requests'
  ),
  0,
  'anon receives no Data API grant on order requests'
);

select * from finish();
rollback;
