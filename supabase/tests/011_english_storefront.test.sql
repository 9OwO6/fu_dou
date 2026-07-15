begin;

create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.sqlstate_of(command text)
returns text
language plpgsql
as $$
begin
  execute command;
  return null;
exception when others then
  return sqlstate;
end;
$$;

insert into auth.users (id, email)
values
  ('db000000-0000-4000-8000-000000000001', 'english-admin@example.invalid'),
  ('db000000-0000-4000-8000-000000000002', 'english-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('db000000-0000-4000-8000-000000000001', '英文功能测试管理员', 'admin');

create temporary table english_results (kind text primary key, payload jsonb);
grant select, insert on table pg_temp.english_results to service_role;
grant select, insert on table pg_temp.english_results to authenticated;

select plan(15);

select has_table('public', 'product_image_translations', 'product images have locale-specific alt text');
select has_table('public', 'site_setting_translations', 'site settings have locale-specific public content');
select has_column('public', 'order_requests', 'request_locale', 'orders retain the customer storefront locale');
select ok((select relrowsecurity from pg_class where oid = 'public.product_image_translations'::regclass), 'image translations have RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.site_setting_translations'::regclass), 'site setting translations have RLS enabled');

select is(
  has_function_privilege('anon', 'public.submit_order_request_localized(text,text,text,text,public.contact_preference,public.fulfillment_method,text,text,text,text,text,jsonb,text,text)', 'execute'),
  false,
  'anon cannot call the localized order transaction directly'
);
select is(
  has_function_privilege('service_role', 'public.submit_order_request_localized(text,text,text,text,public.contact_preference,public.fulfillment_method,text,text,text,text,text,jsonb,text,text)', 'execute'),
  true,
  'only the server service role can call the localized order transaction'
);

select set_config('request.jwt.claims', '{"sub":"db000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(
  pg_temp.sqlstate_of($command$
    select public.admin_create_product_bilingual(
      'member-product', '会员商品', null, null, null, null,
      'Member product', null, null, null, null
    )
  $command$),
  '42501',
  'ordinary authenticated users cannot create bilingual products'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"db000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $command$
    insert into pg_temp.english_results(kind, payload)
    select 'product', jsonb_build_object('id', public.admin_create_product_bilingual(
      'english-test-product', '英文测试商品', '中文简介', null, null, null,
      'English test product', 'English summary', null, null, null
    ))
  $command$,
  'admin can save Chinese and English product content atomically'
);
select is(
  (select title from public.product_translations
   where product_id = ((select payload->>'id' from pg_temp.english_results where kind = 'product'))::uuid
     and locale = 'en'),
  'English test product',
  'English product title is stored in the translation model'
);

select lives_ok(
  $command$
    insert into pg_temp.english_results(kind, payload)
    select 'category', jsonb_build_object('id', public.admin_create_category_bilingual(
      'english-test-category', '英文测试分类', '中文说明',
      'English test category', 'English description', 90, true
    ))
  $command$,
  'admin can save Chinese and English category content atomically'
);
select is(
  (select name from public.category_translations
   where category_id = ((select payload->>'id' from pg_temp.english_results where kind = 'category'))::uuid
     and locale = 'en'),
  'English test category',
  'English category name is stored in the translation model'
);

reset role;
set local role service_role;

select lives_ok(
  $command$
    insert into pg_temp.english_results(kind, payload)
    select 'order', public.submit_order_request_localized(
      'en', 'English Customer', 'english-customer@example.invalid', null,
      'email', 'pickup', 'Vancouver', null, null, null, null,
      '[{"variant_id":"50000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
      repeat('7', 64), repeat('8', 64)
    )
  $command$,
  'English order request is saved atomically with localized snapshots'
);
select results_eq(
  $query$
    select request_locale, product_title_snapshot, variant_label_snapshot
    from public.order_requests
    join public.order_request_items on order_request_items.order_request_id = order_requests.id
    where order_requests.id = ((select payload->>'orderRequestId' from pg_temp.english_results where kind = 'order'))::uuid
  $query$,
  $values$ values ('en'::text, 'DEMO Cat and Dog Mug'::text, 'Style: Cat / Color: Cream'::text) $values$,
  'request locale and English product and option snapshots are authoritative'
);
select is(
  pg_temp.sqlstate_of($command$
    select public.submit_order_request_localized(
      'fr', 'Bad Locale', 'bad-locale@example.invalid', null,
      'email', 'pickup', 'Vancouver', null, null, null, null,
      '[{"variant_id":"50000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb,
      repeat('9', 64), repeat('0', 64)
    )
  $command$),
  '22023',
  'unsupported locales are rejected before an order is stored'
);

select * from finish();
rollback;
