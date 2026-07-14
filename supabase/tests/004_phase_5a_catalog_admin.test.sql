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

create temporary table phase5a_ids (kind text primary key, id uuid not null);
grant select, insert on table pg_temp.phase5a_ids to authenticated;

insert into auth.users (id, email)
values
  ('d0000000-0000-4000-8000-000000000001', 'phase5a-admin@example.invalid'),
  ('d0000000-0000-4000-8000-000000000002', 'phase5a-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('d0000000-0000-4000-8000-000000000001', 'Phase 5A 测试管理员', 'admin');

select plan(20);

select is(
  (
    select count(*)::integer
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname in (
        'admin_create_product',
        'admin_update_product',
        'admin_duplicate_product',
        'admin_set_product_status',
        'admin_create_category',
        'admin_update_category'
      )
      and not pg_proc.prosecdef
  ),
  6,
  'all Phase 5A catalog functions use security invoker'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and grantee = 'anon'
      and routine_name like 'admin_%'
  ),
  0,
  'anon receives no execute privilege on admin catalog functions'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_create_product(
      'member-product', '无权商品', '', '', '', ''
    )
  $command$),
  '42501',
  'non-admin cannot create a product through the RPC'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $command$
    insert into pg_temp.phase5a_ids (kind, id)
    select 'product', public.admin_create_product(
      'phase5a-test-product',
      'Phase 5A 测试商品',
      '简短描述',
      '完整描述',
      'SEO 标题',
      'SEO 描述'
    )
  $command$,
  'admin can create a product and Chinese translation atomically'
);

select results_eq(
  $query$
    select count(*)
    from public.products
    join public.product_translations on product_translations.product_id = products.id
    where products.slug = 'phase5a-test-product'
      and product_translations.locale = 'zh'
      and product_translations.title = 'Phase 5A 测试商品'
  $query$,
  array[1::bigint],
  'created product has its required Chinese content'
);

select results_eq(
  $query$
    select count(*)
    from public.admin_audit_logs
    where action = 'catalog.product.create'
      and target_id = (select id::text from pg_temp.phase5a_ids where kind = 'product')
  $query$,
  array[1::bigint],
  'product creation writes an audit record in the same transaction'
);

select lives_ok(
  $command$
    select public.admin_update_product(
      (select id from pg_temp.phase5a_ids where kind = 'product'),
      'phase5a-updated-product',
      '已更新商品',
      '', '', '', ''
    )
  $command$,
  'admin can update base product and Chinese content'
);

select results_eq(
  $query$
    select count(*)
    from public.products
    join public.product_translations on product_translations.product_id = products.id
    where products.slug = 'phase5a-updated-product'
      and product_translations.title = '已更新商品'
  $query$,
  array[1::bigint],
  'product update changes both base and translation records'
);

select lives_ok(
  $command$
    insert into pg_temp.phase5a_ids (kind, id)
    select 'duplicate', public.admin_duplicate_product(
      (select id from pg_temp.phase5a_ids where kind = 'product')
    )
  $command$,
  'admin can duplicate a product as a draft'
);

select results_eq(
  $query$
    select count(*)
    from public.products
    where id = (select id from pg_temp.phase5a_ids where kind = 'duplicate')
      and status = 'draft'
      and published_at is null
  $query$,
  array[1::bigint],
  'duplicated product is an unpublished draft'
);

select results_eq(
  $query$
    select count(*)
    from public.product_translations
    where product_id = (select id from pg_temp.phase5a_ids where kind = 'duplicate')
      and locale = 'zh'
      and title = '已更新商品（副本）'
  $query$,
  array[1::bigint],
  'duplicate copies Chinese content with a clear suffix'
);

select results_eq(
  $query$
    select
      (select count(*) from public.product_variants where product_id = ids.id)
      + (select count(*) from public.product_images where product_id = ids.id)
    from pg_temp.phase5a_ids as ids
    where kind = 'duplicate'
  $query$,
  array[0::bigint],
  'Phase 5A duplicate does not copy variants or images'
);

select lives_ok(
  $command$
    select public.admin_set_product_status(
      (select id from pg_temp.phase5a_ids where kind = 'product'),
      'published'
    )
  $command$,
  'admin can publish a product'
);

select results_eq(
  $query$
    select count(*)
    from public.products
    where id = (select id from pg_temp.phase5a_ids where kind = 'product')
      and status = 'published'
      and published_at is not null
  $query$,
  array[1::bigint],
  'publishing sets status and first publication time'
);

select lives_ok(
  $command$
    select public.admin_set_product_status(
      (select id from pg_temp.phase5a_ids where kind = 'product'),
      'draft'
    )
  $command$,
  'admin can unpublish a product back to draft'
);

select lives_ok(
  $command$
    insert into pg_temp.phase5a_ids (kind, id)
    select 'category', public.admin_create_category(
      'phase5a-category', '测试分类', '分类描述', 20, true
    )
  $command$,
  'admin can create a category and Chinese translation atomically'
);

select results_eq(
  $query$
    select count(*)
    from public.categories
    join public.category_translations on category_translations.category_id = categories.id
    where categories.id = (select id from pg_temp.phase5a_ids where kind = 'category')
      and category_translations.name = '测试分类'
  $query$,
  array[1::bigint],
  'created category has its Chinese content'
);

select lives_ok(
  $command$
    select public.admin_update_category(
      (select id from pg_temp.phase5a_ids where kind = 'category'),
      'phase5a-category-updated', '已更新分类', '', 3, false
    )
  $command$,
  'admin can edit, sort, and hide a category'
);

select results_eq(
  $query$
    select count(*)
    from public.categories
    join public.category_translations on category_translations.category_id = categories.id
    where categories.id = (select id from pg_temp.phase5a_ids where kind = 'category')
      and categories.sort_order = 3
      and not categories.is_visible
      and category_translations.name = '已更新分类'
  $query$,
  array[1::bigint],
  'category update persists ordering, visibility, and Chinese content'
);

select results_eq(
  $query$
    select count(*)
    from public.admin_audit_logs
    where action like 'catalog.%'
      and actor_user_id = 'd0000000-0000-4000-8000-000000000001'
  $query$,
  array[7::bigint],
  'all successful Phase 5A mutations append audit records'
);

select * from finish();
rollback;
