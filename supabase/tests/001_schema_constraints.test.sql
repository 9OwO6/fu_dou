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

select plan(26);

select is(
  (
    select count(*)::integer
    from information_schema.tables
    where table_schema = 'public'
      and table_name in (
        'profiles', 'categories', 'category_translations', 'products',
        'product_translations', 'product_options', 'product_option_translations',
        'product_option_values', 'product_option_value_translations',
        'product_variants', 'variant_option_values', 'product_images',
        'collections', 'collection_translations', 'product_collections',
        'order_requests', 'order_request_items', 'homepage_sections',
        'homepage_section_translations', 'site_settings'
      )
  ),
  20,
  'all Phase 3 public tables exist'
);

select is(
  (
    select count(*)::integer
    from pg_catalog.pg_class
    join pg_catalog.pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname in (
        'profiles', 'categories', 'category_translations', 'products',
        'product_translations', 'product_options', 'product_option_translations',
        'product_option_values', 'product_option_value_translations',
        'product_variants', 'variant_option_values', 'product_images',
        'collections', 'collection_translations', 'product_collections',
        'order_requests', 'order_request_items', 'homepage_sections',
        'homepage_section_translations', 'site_settings'
      )
      and pg_class.relrowsecurity
  ),
  20,
  'RLS is enabled on every exposed table'
);

select is(
  (select count(*)::integer from public.product_translations where locale in ('zh', 'en')),
  6,
  'product translations hold zh and en rows without duplicating products'
);

select is(
  (select count(*)::integer from public.product_variants where product_id = '20000000-0000-4000-8000-000000000001'),
  4,
  'style and color product has four variants'
);

select is(
  (
    select count(*)::integer
    from (
      select variant_id
      from public.variant_option_values
      where variant_id in (
        select id from public.product_variants
        where product_id = '20000000-0000-4000-8000-000000000001'
      )
      group by variant_id
      having count(*) = 2
    ) as complete_variants
  ),
  4,
  'every two-option mug variant has exactly two option values'
);

select is(
  (select count(*)::integer from public.product_variants where product_id = '20000000-0000-4000-8000-000000000002'),
  2,
  'size-only product has two variants'
);

select is(
  (select count(*)::integer from public.product_options where product_id = '20000000-0000-4000-8000-000000000003'),
  0,
  'optionless product has no product_options rows'
);

select is(
  (select count(*)::integer from public.product_variants where product_id = '20000000-0000-4000-8000-000000000003'),
  1,
  'optionless product still has one price and inventory variant'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.product_variants (product_id, sku, price_cad, stock_qty)
    values ('20000000-0000-4000-8000-000000000001', 'demo-mug-cat-cream', 24.00, 1)
  $command$),
  '23505',
  'duplicate SKU is rejected case-insensitively within a product'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.product_variants (product_id, sku, price_cad, stock_qty)
    values ('20000000-0000-4000-8000-000000000001', 'DEMO-NEGATIVE-STOCK', 24.00, -1)
  $command$),
  '23514',
  'negative variant stock is rejected'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.product_variants (product_id, sku, price_cad, stock_qty)
    values ('20000000-0000-4000-8000-000000000001', 'DEMO-ZERO-PRICE', 0, 1)
  $command$),
  '23514',
  'zero variant price is rejected'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.product_variants (product_id, sku, price_cad, compare_at_price_cad, stock_qty)
    values ('20000000-0000-4000-8000-000000000001', 'DEMO-BAD-COMPARE', 24.00, 20.00, 1)
  $command$),
  '23514',
  'compare-at price must be greater than the selling price'
);

create or replace function pg_temp.create_duplicate_combination()
returns void
language plpgsql
as $$
declare
  duplicate_variant_id uuid := '90000000-0000-4000-8000-000000000001';
begin
  insert into public.product_variants (id, product_id, sku, price_cad, stock_qty)
  values (duplicate_variant_id, '20000000-0000-4000-8000-000000000001', 'DEMO-DUPLICATE-COMBO', 26.00, 1);
  insert into public.variant_option_values (variant_id, option_value_id)
  values
    (duplicate_variant_id, '40000000-0000-4000-8000-000000000001'),
    (duplicate_variant_id, '40000000-0000-4000-8000-000000000003');
  perform private.assert_product_variant_combinations('20000000-0000-4000-8000-000000000001');
end;
$$;

select is(
  pg_temp.sqlstate_of('select pg_temp.create_duplicate_combination()'),
  '23505',
  'a product cannot have two identical complete option combinations'
);

create or replace function pg_temp.create_incomplete_combination()
returns void
language plpgsql
as $$
declare
  incomplete_variant_id uuid := '90000000-0000-4000-8000-000000000002';
begin
  insert into public.product_variants (id, product_id, sku, price_cad, stock_qty)
  values (incomplete_variant_id, '20000000-0000-4000-8000-000000000001', 'DEMO-INCOMPLETE-COMBO', 26.00, 1);
  insert into public.variant_option_values (variant_id, option_value_id)
  values (incomplete_variant_id, '40000000-0000-4000-8000-000000000001');
  perform private.assert_product_variant_combinations('20000000-0000-4000-8000-000000000001');
end;
$$;

select is(
  pg_temp.sqlstate_of('select pg_temp.create_incomplete_combination()'),
  '23514',
  'a variant must select one value for every product option'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.category_translations (category_id, locale, name)
    values ('10000000-0000-4000-8000-000000000001', 'zh', '重复翻译')
  $command$),
  '23505',
  'translation table rejects a duplicate entity and locale pair'
);

insert into public.order_requests (
  id, customer_name, email, preferred_contact, fulfillment_method,
  city_or_area, subtotal_snapshot
)
values (
  '80000000-0000-4000-8000-000000000001',
  '数据库测试顾客',
  'customer@example.invalid',
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
  '81000000-0000-4000-8000-000000000001',
  '80000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  '下单时商品标题',
  '猫猫 / 奶油色',
  'DEMO-MUG-CAT-CREAM',
  24.00,
  1,
  24.00
);

select lives_ok(
  $command$select private.assert_order_request_totals('80000000-0000-4000-8000-000000000001')$command$,
  'a valid order request item snapshot matches its stored subtotal'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.order_request_items (
      order_request_id, product_id, variant_id, product_title_snapshot,
      variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
      line_total_snapshot
    ) values (
      '80000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      '标题', '规格', 'DEMO-BAD-LINE', 24.00, 2, 24.00
    )
  $command$),
  '23514',
  'line snapshot total must equal unit price times quantity'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.order_request_items (
      order_request_id, product_id, variant_id, product_title_snapshot,
      variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
      line_total_snapshot
    ) values (
      '80000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      '标题', '规格', 'DEMO-ZERO-QTY', 24.00, 0, 0
    )
  $command$),
  '23514',
  'zero order item quantity is rejected'
);

create or replace function pg_temp.create_bad_order_subtotal()
returns void
language plpgsql
as $$
begin
  insert into public.order_requests (
    id, customer_name, email, preferred_contact, fulfillment_method,
    city_or_area, subtotal_snapshot
  ) values (
    '80000000-0000-4000-8000-000000000002', '测试顾客',
    'subtotal@example.invalid', 'email', 'pickup', 'Burnaby', 99.00
  );
  insert into public.order_request_items (
    order_request_id, product_id, variant_id, product_title_snapshot,
    variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
    line_total_snapshot
  ) values (
    '80000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    '快照标题', '快照规格', 'DEMO-MUG-CAT-CREAM', 24.00, 1, 24.00
  );
  perform private.assert_order_request_totals('80000000-0000-4000-8000-000000000002');
end;
$$;

select is(
  pg_temp.sqlstate_of('select pg_temp.create_bad_order_subtotal()'),
  '23514',
  'order subtotal snapshot must equal the sum of item snapshots'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.order_request_items (
      order_request_id, product_id, variant_id, product_title_snapshot,
      variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
      line_total_snapshot
    ) values (
      '80000000-0000-4000-8000-000000000001',
      '20000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000005',
      '错误商品快照', '错误规格', 'DEMO-CROSS-PRODUCT', 39.00, 1, 39.00
    )
  $command$),
  '23514',
  'order item rejects a variant belonging to another product'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.order_requests (
      customer_name, email, preferred_contact, fulfillment_method,
      city_or_area, subtotal_snapshot
    ) values ('测试', 'delivery@example.invalid', 'email', 'local_delivery', 'Richmond', 10.00)
  $command$),
  '23514',
  'local delivery requires a postal code'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.order_requests (
      customer_name, email, preferred_contact, fulfillment_method,
      city_or_area, subtotal_snapshot
    ) values ('测试', 'phone@example.invalid', 'phone', 'pickup', 'Vancouver', 10.00)
  $command$),
  '23514',
  'phone preference requires a phone number'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.products (slug, status)
    values ('demo-published-without-date', 'published')
  $command$),
  '23514',
  'published products require published_at'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.products (slug, default_currency)
    values ('demo-wrong-currency', 'USD')
  $command$),
  '23514',
  'product currency is fixed to CAD'
);

select is(
  (
    select file_size_limit
    from storage.buckets
    where id = 'product-images'
  ),
  10485760::bigint,
  'product image bucket has a 10 MiB limit'
);

select is(
  (
    select allowed_mime_types
    from storage.buckets
    where id = 'product-images'
  ),
  array['image/jpeg', 'image/png', 'image/webp']::text[],
  'product image bucket restricts MIME types'
);

select * from finish();
rollback;
