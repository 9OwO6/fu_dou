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

create temporary table phase5b_configs (kind text primary key, configuration jsonb not null);
grant select on table pg_temp.phase5b_configs to authenticated;

insert into phase5b_configs (kind, configuration)
values
  ('mug', $json$
    {
      "options": [
        {"id":"30000000-0000-4000-8000-000000000001","label":"款式","values":[{"id":"40000000-0000-4000-8000-000000000001","label":"猫猫"},{"id":"40000000-0000-4000-8000-000000000002","label":"狗狗"}]},
        {"id":"30000000-0000-4000-8000-000000000002","label":"颜色","values":[{"id":"40000000-0000-4000-8000-000000000003","label":"奶油色"},{"id":"40000000-0000-4000-8000-000000000004","label":"浅蓝色"}]}
      ],
      "variants": [
        {"id":"50000000-0000-4000-8000-000000000001","optionValueIds":["40000000-0000-4000-8000-000000000001","40000000-0000-4000-8000-000000000003"],"sku":"DEMO-MUG-CAT-CREAM","priceCad":"24.00","compareAtPriceCad":"","stockQty":"8","isActive":true},
        {"id":"50000000-0000-4000-8000-000000000002","optionValueIds":["40000000-0000-4000-8000-000000000001","40000000-0000-4000-8000-000000000004"],"sku":"DEMO-MUG-CAT-BLUE","priceCad":"24.00","compareAtPriceCad":"29.00","stockQty":"3","isActive":true},
        {"id":"50000000-0000-4000-8000-000000000003","optionValueIds":["40000000-0000-4000-8000-000000000002","40000000-0000-4000-8000-000000000003"],"sku":"DEMO-MUG-DOG-CREAM","priceCad":"25.00","compareAtPriceCad":"","stockQty":"5","isActive":true},
        {"id":"50000000-0000-4000-8000-000000000004","optionValueIds":["40000000-0000-4000-8000-000000000002","40000000-0000-4000-8000-000000000004"],"sku":"DEMO-MUG-DOG-BLUE","priceCad":"25.00","compareAtPriceCad":"","stockQty":"0","isActive":false}
      ]
    }
  $json$::jsonb),
  ('rug', $json$
    {
      "options": [{"id":"30000000-0000-4000-8000-000000000003","label":"尺寸","values":[{"id":"40000000-0000-4000-8000-000000000005","label":"40×60 cm"},{"id":"40000000-0000-4000-8000-000000000006","label":"60×90 cm"}]}],
      "variants": [
        {"id":"50000000-0000-4000-8000-000000000005","optionValueIds":["40000000-0000-4000-8000-000000000005"],"sku":"DEMO-RUG-40X60","priceCad":"39.00","compareAtPriceCad":"","stockQty":"7","isActive":true},
        {"id":"50000000-0000-4000-8000-000000000006","optionValueIds":["40000000-0000-4000-8000-000000000006"],"sku":"DEMO-RUG-60X90","priceCad":"69.00","compareAtPriceCad":"79.00","stockQty":"2","isActive":true}
      ]
    }
  $json$::jsonb),
  ('optionless', $json$
    {
      "options": [],
      "variants": [{"id":"50000000-0000-4000-8000-000000000007","optionValueIds":[],"sku":"DEMO-DECOR-SINGLE","priceCad":"18.00","compareAtPriceCad":"","stockQty":"6","isActive":true}]
    }
  $json$::jsonb);

insert into auth.users (id, email)
values
  ('e0000000-0000-4000-8000-000000000001', 'phase5b-admin@example.invalid'),
  ('e0000000-0000-4000-8000-000000000002', 'phase5b-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('e0000000-0000-4000-8000-000000000001', 'Phase 5B 测试管理员', 'admin');

select plan(19);

select has_function(
  'public',
  'admin_save_product_variants',
  array['uuid', 'jsonb'],
  'Phase 5B atomic save function exists'
);

select is(
  (
    select prosecdef
    from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public' and pg_proc.proname = 'admin_save_product_variants'
  ),
  false,
  'variant save function uses security invoker'
);

select is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where routine_schema = 'public'
      and routine_name = 'admin_save_product_variants'
      and grantee = 'anon'
  ),
  0,
  'anon cannot execute the variant save function'
);

select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000001',
      (select configuration from pg_temp.phase5b_configs where kind = 'mug')
    )
  $command$),
  '42501',
  'non-admin cannot save variants through the RPC'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"e0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000001',
      (select configuration from pg_temp.phase5b_configs where kind = 'mug')
    )
  $command$,
  'admin saves the cat/dog mug matrix atomically'
);

select results_eq(
  $query$
    select count(*) from public.product_variants
    where product_id = '20000000-0000-4000-8000-000000000001'
  $query$,
  array[4::bigint],
  'cat/dog mug has all four Cartesian combinations'
);

select results_eq(
  $query$
    select count(distinct signature)
    from (
      select string_agg(option_value_id::text, ',' order by option_value_id) as signature
      from public.product_variants
      join public.variant_option_values on variant_option_values.variant_id = product_variants.id
      where product_id = '20000000-0000-4000-8000-000000000001'
      group by product_variants.id
    ) as combinations
  $query$,
  array[4::bigint],
  'all mug combination signatures are unique'
);

select results_eq(
  $query$
    select count(*) from public.product_variants
    where id = '50000000-0000-4000-8000-000000000004'
      and not is_active and stock_qty = 0 and price_cad = 25.00
  $query$,
  array[1::bigint],
  'an invalid-for-sale mug combination can be disabled while retaining price and stock'
);

select lives_ok(
  $command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000002',
      (select configuration from pg_temp.phase5b_configs where kind = 'rug')
    )
  $command$,
  'admin saves a size-only rug'
);

select results_eq(
  $query$
    select count(*) from public.product_variants
    where product_id = '20000000-0000-4000-8000-000000000002'
      and ((sku = 'DEMO-RUG-40X60' and stock_qty = 7) or (sku = 'DEMO-RUG-60X90' and compare_at_price_cad = 79.00))
  $query$,
  array[2::bigint],
  'size rug keeps independent SKU, price, compare-at price, and inventory'
);

select lives_ok(
  $command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000003',
      (select configuration from pg_temp.phase5b_configs where kind = 'optionless')
    )
  $command$,
  'admin saves an optionless product with one default variant'
);

select results_eq(
  $query$
    select count(*) from public.product_variants
    left join public.variant_option_values on variant_option_values.variant_id = product_variants.id
    where product_id = '20000000-0000-4000-8000-000000000003'
      and variant_option_values.variant_id is null
  $query$,
  array[1::bigint],
  'optionless product has exactly one empty combination'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000001',
      jsonb_set(
        (select configuration from pg_temp.phase5b_configs where kind = 'mug'),
        '{variants,1,sku}', '"DEMO-MUG-CAT-CREAM"'
      )
    )
  $command$),
  '23505',
  'database rejects duplicate SKU'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000003',
      jsonb_set(
        (select configuration from pg_temp.phase5b_configs where kind = 'optionless'),
        '{variants,0,stockQty}', '"-1"'
      )
    )
  $command$),
  '23514',
  'database rejects negative inventory'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000003',
      jsonb_set(
        (select configuration from pg_temp.phase5b_configs where kind = 'optionless'),
        '{variants,0,priceCad}', '"0"'
      )
    )
  $command$),
  '23514',
  'database rejects a zero CAD price'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000003',
      jsonb_set(
        jsonb_set(
          (select configuration from pg_temp.phase5b_configs where kind = 'optionless'),
          '{variants,0,priceCad}', '"20"'
        ),
        '{variants,0,compareAtPriceCad}', '"19"'
      )
    )
  $command$),
  '23514',
  'database rejects compare-at price that is not above the current price'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000001',
      jsonb_set(
        (select configuration from pg_temp.phase5b_configs where kind = 'mug'),
        '{variants,3,optionValueIds}',
        '["40000000-0000-4000-8000-000000000001","40000000-0000-4000-8000-000000000003"]'
      )
    )
  $command$),
  '23505',
  'database rejects duplicate option combinations'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_product_variants(
      '20000000-0000-4000-8000-000000000001',
      jsonb_set(
        (select configuration from pg_temp.phase5b_configs where kind = 'mug'),
        '{variants}',
        ((select configuration -> 'variants' from pg_temp.phase5b_configs where kind = 'mug') - 3)
      )
    )
  $command$),
  '23514',
  'database rejects an incomplete Cartesian combination list'
);

select results_eq(
  $query$
    select count(*) from public.admin_audit_logs
    where action = 'catalog.product.variants.update'
      and actor_user_id = 'e0000000-0000-4000-8000-000000000001'
  $query$,
  array[3::bigint],
  'each successful Phase 5B save appends one audit record'
);

select * from finish();
rollback;
