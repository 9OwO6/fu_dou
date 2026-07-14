create or replace function public.admin_save_product_variants(
  p_product_id uuid,
  p_configuration jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  option_item jsonb;
  value_item jsonb;
  variant_item jsonb;
  selection_item jsonb;
  option_index integer;
  value_index integer;
  expected_variant_count numeric := 1;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise no_data_found using message = 'Product not found';
  end if;

  if jsonb_typeof(p_configuration) <> 'object'
    or jsonb_typeof(p_configuration -> 'options') <> 'array'
    or jsonb_typeof(p_configuration -> 'variants') <> 'array'
  then
    raise data_exception using message = 'Invalid variant configuration';
  end if;

  if jsonb_array_length(p_configuration -> 'options') > 8
    or jsonb_array_length(p_configuration -> 'variants') not between 1 and 500
  then
    raise check_violation using message = 'Variant configuration exceeds limits';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_configuration -> 'options') as item
    group by lower(btrim(item ->> 'label'))
    having count(*) > 1
  ) then
    raise unique_violation using message = 'Duplicate option label';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_configuration -> 'variants') as item
    group by lower(btrim(item ->> 'sku'))
    having count(*) > 1
  ) then
    raise unique_violation using message = 'Duplicate SKU';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_configuration -> 'options') as item
    join public.product_options as existing on existing.id = (item ->> 'id')::uuid
    where existing.product_id <> p_product_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_configuration -> 'options') as option_json
    cross join jsonb_array_elements(option_json -> 'values') as value_json
    join public.product_option_values as existing on existing.id = (value_json ->> 'id')::uuid
    join public.product_options as owner on owner.id = existing.option_id
    where owner.product_id <> p_product_id
  ) or exists (
    select 1
    from jsonb_array_elements(p_configuration -> 'variants') as item
    join public.product_variants as existing on existing.id = (item ->> 'id')::uuid
    where existing.product_id <> p_product_id
  ) then
    raise check_violation using message = 'Configuration contains an identifier owned by another product';
  end if;

  if jsonb_array_length(p_configuration -> 'options') = 0 then
    expected_variant_count := 1;
  else
    expected_variant_count := 1;
    for option_item in select value from jsonb_array_elements(p_configuration -> 'options')
    loop
      if jsonb_typeof(option_item -> 'values') <> 'array'
        or jsonb_array_length(option_item -> 'values') not between 1 and 50
      then
        raise check_violation using message = 'Each option requires between one and fifty values';
      end if;
      if exists (
        select 1
        from jsonb_array_elements(option_item -> 'values') as item
        group by lower(btrim(item ->> 'label'))
        having count(*) > 1
      ) then
        raise unique_violation using message = 'Duplicate option value label';
      end if;
      expected_variant_count := expected_variant_count * jsonb_array_length(option_item -> 'values');
    end loop;
  end if;

  if expected_variant_count <> jsonb_array_length(p_configuration -> 'variants')
    or expected_variant_count > 500
  then
    raise check_violation using message = 'Variant list does not match the Cartesian option combinations';
  end if;

  delete from public.variant_option_values
  where variant_id in (
    select id from public.product_variants where product_id = p_product_id
  );

  delete from public.product_variants as existing
  where existing.product_id = p_product_id
    and not exists (
      select 1
      from jsonb_array_elements(p_configuration -> 'variants') as item
      where (item ->> 'id')::uuid = existing.id
    );

  delete from public.product_option_values as existing
  using public.product_options as owner
  where owner.id = existing.option_id
    and owner.product_id = p_product_id
    and not exists (
      select 1
      from jsonb_array_elements(p_configuration -> 'options') as option_json
      cross join jsonb_array_elements(option_json -> 'values') as value_json
      where (value_json ->> 'id')::uuid = existing.id
    );

  delete from public.product_options as existing
  where existing.product_id = p_product_id
    and not exists (
      select 1
      from jsonb_array_elements(p_configuration -> 'options') as item
      where (item ->> 'id')::uuid = existing.id
    );

  option_index := 0;
  for option_item in select value from jsonb_array_elements(p_configuration -> 'options')
  loop
    insert into public.product_options (id, product_id, name_key, sort_order)
    values (
      (option_item ->> 'id')::uuid,
      p_product_id,
      'option_' || replace(option_item ->> 'id', '-', ''),
      option_index * 10
    )
    on conflict (id) do update
    set sort_order = excluded.sort_order;

    insert into public.product_option_translations (option_id, locale, name)
    values ((option_item ->> 'id')::uuid, 'zh', btrim(option_item ->> 'label'))
    on conflict (option_id, locale) do update set name = excluded.name;

    value_index := 0;
    for value_item in select value from jsonb_array_elements(option_item -> 'values')
    loop
      insert into public.product_option_values (id, option_id, value_key, sort_order)
      values (
        (value_item ->> 'id')::uuid,
        (option_item ->> 'id')::uuid,
        'value_' || replace(value_item ->> 'id', '-', ''),
        value_index * 10
      )
      on conflict (id) do update
      set option_id = excluded.option_id,
          sort_order = excluded.sort_order;

      insert into public.product_option_value_translations (option_value_id, locale, label)
      values ((value_item ->> 'id')::uuid, 'zh', btrim(value_item ->> 'label'))
      on conflict (option_value_id, locale) do update set label = excluded.label;
      value_index := value_index + 1;
    end loop;
    option_index := option_index + 1;
  end loop;

  for variant_item in select value from jsonb_array_elements(p_configuration -> 'variants')
  loop
    insert into public.product_variants (
      id,
      product_id,
      sku,
      price_cad,
      compare_at_price_cad,
      stock_qty,
      is_active
    )
    values (
      (variant_item ->> 'id')::uuid,
      p_product_id,
      btrim(variant_item ->> 'sku'),
      (variant_item ->> 'priceCad')::numeric,
      nullif(variant_item ->> 'compareAtPriceCad', '')::numeric,
      (variant_item ->> 'stockQty')::integer,
      (variant_item ->> 'isActive')::boolean
    )
    on conflict (id) do update
    set sku = excluded.sku,
        price_cad = excluded.price_cad,
        compare_at_price_cad = excluded.compare_at_price_cad,
        stock_qty = excluded.stock_qty,
        is_active = excluded.is_active;

    if jsonb_typeof(variant_item -> 'optionValueIds') <> 'array' then
      raise data_exception using message = 'Variant selection must be an array';
    end if;
    for selection_item in select value from jsonb_array_elements(variant_item -> 'optionValueIds')
    loop
      insert into public.variant_option_values (variant_id, option_value_id)
      values ((variant_item ->> 'id')::uuid, (selection_item #>> '{}')::uuid);
    end loop;
  end loop;

  set constraints all immediate;
  set constraints all deferred;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'catalog.product.variants.update',
    'product',
    p_product_id::text,
    jsonb_build_object(
      'option_count', jsonb_array_length(p_configuration -> 'options'),
      'variant_count', jsonb_array_length(p_configuration -> 'variants')
    )
  );
end;
$$;

revoke all on function public.admin_save_product_variants(uuid, jsonb)
  from public, anon;
grant execute on function public.admin_save_product_variants(uuid, jsonb)
  to authenticated;
