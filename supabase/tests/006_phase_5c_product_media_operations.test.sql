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
  ('f0000000-0000-4000-8000-000000000001', 'phase5c-admin@example.invalid'),
  ('f0000000-0000-4000-8000-000000000002', 'phase5c-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('f0000000-0000-4000-8000-000000000001', 'Phase 5C 测试管理员', 'admin');

select plan(21);

select is(
  (
    select count(*)::integer
    from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_save_product_operations',
        'admin_register_product_images',
        'admin_save_product_images',
        'admin_delete_product_image',
        'admin_restore_product_image'
      )
      and not pg_proc.prosecdef
  ),
  5,
  'all Phase 5C media and operations functions use security invoker'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'anon'
      and routine_name in (
        'admin_save_product_operations',
        'admin_register_product_images',
        'admin_save_product_images',
        'admin_delete_product_image',
        'admin_restore_product_image'
      )
  ),
  0,
  'anon cannot execute Phase 5C management functions'
);

select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_operations(
      '20000000-0000-4000-8000-000000000001', true, now()
    )
  $command$),
  '42501',
  'non-admin cannot change product operations'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_register_product_images(
      '20000000-0000-4000-8000-000000000001',
      '[{"id":"70000000-0000-4000-8000-000000000001","storagePath":"products/20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.webp","altText":"无权图片","variantId":null,"width":1000,"height":1250}]'::jsonb
    )
  $command$),
  '42501',
  'non-admin cannot register product images'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"f0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $command$
    select public.admin_save_product_operations(
      '20000000-0000-4000-8000-000000000001', true, '2026-07-20T17:00:00Z'
    )
  $command$,
  'admin can set featured state and future publication time'
);

select results_eq(
  $query$
    select count(*) from public.products
    where id = '20000000-0000-4000-8000-000000000001'
      and is_featured and published_at = '2026-07-20T17:00:00Z'
  $query$,
  array[1::bigint],
  'product operations are persisted together'
);

select lives_ok(
  $command$
    select public.admin_register_product_images(
      '20000000-0000-4000-8000-000000000001',
      '[
        {"id":"70000000-0000-4000-8000-000000000001","storagePath":"products/20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000001.webp","altText":"猫咪茶杯正面图","variantId":null,"width":1000,"height":1250},
        {"id":"70000000-0000-4000-8000-000000000002","storagePath":"products/20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000002.jpg","altText":"狗狗茶杯浅蓝色侧面图","variantId":"50000000-0000-4000-8000-000000000004","width":1200,"height":1500}
      ]'::jsonb
    )
  $command$,
  'admin registers a batch of general and variant-specific images atomically'
);

select results_eq(
  $query$
    select count(*) from public.product_images
    where product_id = '20000000-0000-4000-8000-000000000001'
  $query$,
  array[2::bigint],
  'both image metadata records are present'
);

select results_eq(
  $query$
    select count(*) from public.product_images
    where id = '70000000-0000-4000-8000-000000000002'
      and variant_id = '50000000-0000-4000-8000-000000000004'
  $query$,
  array[1::bigint],
  'variant-specific image association is persisted'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_register_product_images(
      '20000000-0000-4000-8000-000000000001',
      '[{"id":"70000000-0000-4000-8000-000000000003","storagePath":"products/20000000-0000-4000-8000-000000000002/wrong.webp","altText":"错误路径","variantId":null,"width":100,"height":100}]'::jsonb
    )
  $command$),
  '23514',
  'database rejects an image path outside the product folder'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_register_product_images(
      '20000000-0000-4000-8000-000000000001',
      '[{"id":"70000000-0000-4000-8000-000000000003","storagePath":"products/20000000-0000-4000-8000-000000000001/70000000-0000-4000-8000-000000000003.webp","altText":"错误规格","variantId":"50000000-0000-4000-8000-000000000005","width":100,"height":100}]'::jsonb
    )
  $command$),
  '23514',
  'database rejects a variant image association from another product'
);

select lives_ok(
  $command$
    select public.admin_save_product_images(
      '20000000-0000-4000-8000-000000000001',
      '[
        {"id":"70000000-0000-4000-8000-000000000002","altText":"新封面","variantId":"50000000-0000-4000-8000-000000000004"},
        {"id":"70000000-0000-4000-8000-000000000001","altText":"第二张通用图","variantId":null}
      ]'::jsonb
    )
  $command$,
  'admin can reorder images and set the first image as cover'
);

select results_eq(
  $query$
    select id from public.product_images
    where product_id = '20000000-0000-4000-8000-000000000001'
    order by sort_order
    limit 1
  $query$,
  array['70000000-0000-4000-8000-000000000002'::uuid],
  'sort order zero identifies the cover image'
);

create temporary table deleted_image (payload jsonb not null);
grant insert, select on table pg_temp.deleted_image to authenticated;

select lives_ok(
  $command$
    insert into pg_temp.deleted_image
    select public.admin_delete_product_image(
      '20000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000002'
    )
  $command$,
  'image metadata can be removed before Storage deletion'
);

select results_eq(
  $query$ select count(*) from public.product_images where product_id = '20000000-0000-4000-8000-000000000001' $query$,
  array[1::bigint],
  'metadata deletion removes exactly one image'
);

select lives_ok(
  $command$ select public.admin_restore_product_image((select payload from pg_temp.deleted_image)) $command$,
  'failed Storage deletion can restore the database record'
);

select results_eq(
  $query$ select count(*) from public.product_images where product_id = '20000000-0000-4000-8000-000000000001' $query$,
  array[2::bigint],
  'compensation restores image metadata and ordering'
);

select lives_ok(
  $command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000003',
      '{"options":[],"variants":[{"id":"50000000-0000-4000-8000-000000000007","optionValueIds":[],"sku":"DEMO-DECOR-SINGLE","priceCad":"15.00","compareAtPriceCad":"18.00","saleStartsAt":"2026-07-15T17:00:00Z","saleEndsAt":"2026-07-20T17:00:00Z","stockQty":"6","isActive":true}]}'::jsonb
    )
  $command$,
  'variant save persists a valid sale price window atomically'
);

select results_eq(
  $query$
    select count(*) from public.product_variants
    where id = '50000000-0000-4000-8000-000000000007'
      and compare_at_price_cad = 18.00
      and sale_starts_at = '2026-07-15T17:00:00Z'
      and sale_ends_at = '2026-07-20T17:00:00Z'
  $query$,
  array[1::bigint],
  'sale price and time window are stored on the concrete variant'
);

select is(
  pg_temp.sqlstate_of($command$
    update public.product_variants
    set compare_at_price_cad = null
    where id = '50000000-0000-4000-8000-000000000007'
  $command$),
  '23514',
  'database rejects sale dates without a compare-at price'
);

select results_eq(
  $query$
    select count(*) from public.admin_audit_logs
    where actor_user_id = 'f0000000-0000-4000-8000-000000000001'
      and action like 'catalog.product.%'
  $query$,
  array[5::bigint],
  'successful Phase 5C operations append audit records'
);

select * from finish();
rollback;
