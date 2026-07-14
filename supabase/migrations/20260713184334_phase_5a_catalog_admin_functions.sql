create or replace function public.admin_create_product(
  p_slug text,
  p_title text,
  p_short_description text,
  p_description text,
  p_seo_title text,
  p_seo_description text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  product_id uuid;
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  insert into public.products (slug, created_by)
  values (btrim(p_slug), actor_id)
  returning id into product_id;

  insert into public.product_translations (
    product_id,
    locale,
    title,
    short_description,
    description,
    seo_title,
    seo_description
  )
  values (
    product_id,
    'zh',
    btrim(p_title),
    nullif(btrim(p_short_description), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_seo_title), ''),
    nullif(btrim(p_seo_description), '')
  );

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id
  )
  values (actor_id, 'catalog.product.create', 'product', product_id::text);

  return product_id;
end;
$$;

create or replace function public.admin_update_product(
  p_product_id uuid,
  p_slug text,
  p_title text,
  p_short_description text,
  p_description text,
  p_seo_title text,
  p_seo_description text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.products
  set slug = btrim(p_slug)
  where id = p_product_id;

  if not found then
    raise no_data_found using message = 'Product not found';
  end if;

  insert into public.product_translations (
    product_id,
    locale,
    title,
    short_description,
    description,
    seo_title,
    seo_description
  )
  values (
    p_product_id,
    'zh',
    btrim(p_title),
    nullif(btrim(p_short_description), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_seo_title), ''),
    nullif(btrim(p_seo_description), '')
  )
  on conflict (product_id, locale) do update
  set title = excluded.title,
      short_description = excluded.short_description,
      description = excluded.description,
      seo_title = excluded.seo_title,
      seo_description = excluded.seo_description;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id
  )
  values (actor_id, 'catalog.product.update', 'product', p_product_id::text);
end;
$$;

create or replace function public.admin_duplicate_product(p_product_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  source_product public.products%rowtype;
  duplicate_id uuid;
  duplicate_slug text;
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  select *
  into source_product
  from public.products
  where id = p_product_id;

  if not found then
    raise no_data_found using message = 'Product not found';
  end if;

  duplicate_slug := source_product.slug || '-copy-' || left(extensions.gen_random_uuid()::text, 8);

  insert into public.products (slug, status, default_currency, created_by)
  values (duplicate_slug, 'draft', 'CAD', actor_id)
  returning id into duplicate_id;

  insert into public.product_translations (
    product_id,
    locale,
    title,
    short_description,
    description,
    seo_title,
    seo_description
  )
  select
    duplicate_id,
    locale,
    case when locale = 'zh' then title || '（副本）' else title || ' Copy' end,
    short_description,
    description,
    seo_title,
    seo_description
  from public.product_translations
  where product_id = p_product_id;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'catalog.product.duplicate',
    'product',
    duplicate_id::text,
    jsonb_build_object('source_product_id', p_product_id::text)
  );

  return duplicate_id;
end;
$$;

create or replace function public.admin_set_product_status(
  p_product_id uuid,
  p_status public.product_status
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.products
  set status = p_status,
      published_at = case
        when p_status = 'published' then coalesce(published_at, now())
        else published_at
      end
  where id = p_product_id;

  if not found then
    raise no_data_found using message = 'Product not found';
  end if;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'catalog.product.status',
    'product',
    p_product_id::text,
    jsonb_build_object('status', p_status::text)
  );
end;
$$;

create or replace function public.admin_create_category(
  p_slug text,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_is_visible boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category_id uuid;
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  insert into public.categories (slug, sort_order, is_visible)
  values (btrim(p_slug), p_sort_order, p_is_visible)
  returning id into category_id;

  insert into public.category_translations (
    category_id,
    locale,
    name,
    description
  )
  values (
    category_id,
    'zh',
    btrim(p_name),
    nullif(btrim(p_description), '')
  );

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id
  )
  values (actor_id, 'catalog.category.create', 'category', category_id::text);

  return category_id;
end;
$$;

create or replace function public.admin_update_category(
  p_category_id uuid,
  p_slug text,
  p_name text,
  p_description text,
  p_sort_order integer,
  p_is_visible boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  update public.categories
  set slug = btrim(p_slug),
      sort_order = p_sort_order,
      is_visible = p_is_visible
  where id = p_category_id;

  if not found then
    raise no_data_found using message = 'Category not found';
  end if;

  insert into public.category_translations (
    category_id,
    locale,
    name,
    description
  )
  values (
    p_category_id,
    'zh',
    btrim(p_name),
    nullif(btrim(p_description), '')
  )
  on conflict (category_id, locale) do update
  set name = excluded.name,
      description = excluded.description;

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  )
  values (
    actor_id,
    'catalog.category.update',
    'category',
    p_category_id::text,
    jsonb_build_object(
      'sort_order', p_sort_order,
      'is_visible', p_is_visible
    )
  );
end;
$$;

revoke all on function public.admin_create_product(text, text, text, text, text, text)
  from public, anon;
revoke all on function public.admin_update_product(uuid, text, text, text, text, text, text)
  from public, anon;
revoke all on function public.admin_duplicate_product(uuid)
  from public, anon;
revoke all on function public.admin_set_product_status(uuid, public.product_status)
  from public, anon;
revoke all on function public.admin_create_category(text, text, text, integer, boolean)
  from public, anon;
revoke all on function public.admin_update_category(uuid, text, text, text, integer, boolean)
  from public, anon;

grant execute on function public.admin_create_product(text, text, text, text, text, text)
  to authenticated;
grant execute on function public.admin_update_product(uuid, text, text, text, text, text, text)
  to authenticated;
grant execute on function public.admin_duplicate_product(uuid)
  to authenticated;
grant execute on function public.admin_set_product_status(uuid, public.product_status)
  to authenticated;
grant execute on function public.admin_create_category(text, text, text, integer, boolean)
  to authenticated;
grant execute on function public.admin_update_category(uuid, text, text, text, integer, boolean)
  to authenticated;
