begin;
select plan(18);

select has_table('public', 'product_categories', 'product_categories exists');
select row_security_active('public.product_categories'), 'product_categories has RLS';
select has_index('public', 'product_categories', 'product_categories_category_sort_idx', 'category lookup index exists');
select has_function('public', 'admin_save_product_categories', array['uuid', 'uuid[]'], 'admin category save RPC exists');

set local role anon;
select is(
  (select count(*)::integer from public.product_categories),
  3,
  'anon reads links for published products and visible categories only'
);
select ok(
  exists (
    select 1 from public.product_categories
    where product_id = '20000000-0000-4000-8000-000000000001'
      and category_id = '10000000-0000-4000-8000-000000000001'
  ),
  'published product may appear in its first category'
);
select ok(
  exists (
    select 1 from public.product_categories
    where product_id = '20000000-0000-4000-8000-000000000001'
      and category_id = '10000000-0000-4000-8000-000000000002'
  ),
  'published product may appear in multiple categories'
);
select throws_ok(
  $$insert into public.product_categories(product_id, category_id) values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'anon cannot assign categories'
);
select throws_ok(
  $$select public.admin_save_product_categories('20000000-0000-4000-8000-000000000001', array['10000000-0000-4000-8000-000000000001']::uuid[])$$,
  '42501',
  null,
  'anon cannot execute admin save RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '91000000-0000-4000-8000-000000000001',
  'role', 'authenticated'
)::text, true);

select is(
  (select count(*)::integer from public.product_categories),
  3,
  'ordinary authenticated user sees public category links only'
);
select throws_ok(
  $$insert into public.product_categories(product_id, category_id) values ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001')$$,
  '42501',
  null,
  'ordinary authenticated user cannot assign categories'
);
select throws_ok(
  $$select public.admin_save_product_categories('20000000-0000-4000-8000-000000000001', array['10000000-0000-4000-8000-000000000001']::uuid[])$$,
  '42501',
  null,
  'ordinary authenticated user fails RPC authorization'
);

reset role;
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values (
  '91000000-0000-4000-8000-000000000002',
  'authenticated',
  'authenticated',
  'phase6-admin@example.invalid',
  'not-a-login-password',
  now(),
  now(),
  now()
);
insert into public.profiles (id, display_name, role)
values ('91000000-0000-4000-8000-000000000002', 'Phase 6 Admin', 'admin');

set local role authenticated;
select set_config('request.jwt.claims', json_build_object(
  'sub', '91000000-0000-4000-8000-000000000002',
  'role', 'authenticated'
)::text, true);

select is(
  (select count(*)::integer from public.product_categories),
  4,
  'admin sees links for draft and published products'
);
select lives_ok(
  $$select public.admin_save_product_categories(
    '20000000-0000-4000-8000-000000000002',
    array[
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000002'
    ]::uuid[]
  )$$,
  'admin saves multiple categories atomically'
);
select is(
  (select count(*)::integer from public.product_categories where product_id = '20000000-0000-4000-8000-000000000002'),
  2,
  'admin save replaces the product category set'
);
select is(
  (select array_agg(category_id order by sort_order)::text from public.product_categories where product_id = '20000000-0000-4000-8000-000000000002'),
  '{10000000-0000-4000-8000-000000000001,10000000-0000-4000-8000-000000000002}',
  'category order follows the submitted array'
);
select throws_ok(
  $$select public.admin_save_product_categories(
    '20000000-0000-4000-8000-000000000002',
    array[
      '10000000-0000-4000-8000-000000000001',
      '10000000-0000-4000-8000-000000000001'
    ]::uuid[]
  )$$,
  '22023',
  'duplicate_categories',
  'duplicate categories are rejected'
);
select throws_ok(
  $$select public.admin_save_product_categories(
    '20000000-0000-4000-8000-000000000002',
    array['99999999-9999-4999-8999-999999999999']::uuid[]
  )$$,
  'P0002',
  'category_not_found',
  'unknown category is rejected'
);
select ok(
  exists (
    select 1 from public.admin_audit_logs
    where action = 'catalog.product_categories.update'
      and target_id = '20000000-0000-4000-8000-000000000002'
  ),
  'successful category save is audited'
);

reset role;
select * from finish();
rollback;
