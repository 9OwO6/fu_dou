create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;

create type public.product_status as enum ('draft', 'published', 'archived');
create type public.collection_type as enum ('manual', 'automatic');
create type public.order_request_status as enum (
  'new',
  'contacted',
  'confirmed',
  'preparing',
  'completed',
  'cancelled'
);
create type public.contact_preference as enum ('email', 'phone');
create type public.fulfillment_method as enum ('pickup', 'local_delivery');
create type public.homepage_section_type as enum (
  'announcement',
  'hero',
  'featured_categories',
  'new_products',
  'featured_products',
  'sale_products',
  'brand_story',
  'fulfillment',
  'faq',
  'contact_cta'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  role text not null default 'admin' check (role = 'admin'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sort_order integer not null default 0 check (sort_order >= 0),
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.category_translations (
  category_id uuid not null references public.categories (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  name text not null check (length(btrim(name)) between 1 and 160),
  description text,
  primary key (category_id, locale),
  check (description is null or length(btrim(description)) > 0)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.product_status not null default 'draft',
  default_currency text not null default 'CAD' check (default_currency = 'CAD'),
  published_at timestamptz,
  is_featured boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);

create table public.product_translations (
  product_id uuid not null references public.products (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  title text not null check (length(btrim(title)) between 1 and 200),
  short_description text,
  description text,
  seo_title text,
  seo_description text,
  primary key (product_id, locale),
  check (short_description is null or length(btrim(short_description)) > 0),
  check (description is null or length(btrim(description)) > 0),
  check (seo_title is null or length(btrim(seo_title)) > 0),
  check (seo_description is null or length(btrim(seo_description)) > 0)
);

create table public.product_options (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name_key text not null check (name_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  sort_order integer not null default 0 check (sort_order >= 0)
);

create table public.product_option_translations (
  option_id uuid not null references public.product_options (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  name text not null check (length(btrim(name)) between 1 and 100),
  primary key (option_id, locale)
);

create table public.product_option_values (
  id uuid primary key default gen_random_uuid(),
  option_id uuid not null references public.product_options (id) on delete cascade,
  value_key text not null check (value_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  color_swatch text check (color_swatch is null or color_swatch ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0 check (sort_order >= 0)
);

create table public.product_option_value_translations (
  option_value_id uuid not null references public.product_option_values (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  label text not null check (length(btrim(label)) between 1 and 100),
  primary key (option_value_id, locale)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text not null check (length(btrim(sku)) between 1 and 100),
  price_cad numeric(12, 2) not null check (price_cad > 0),
  compare_at_price_cad numeric(12, 2),
  stock_qty integer not null default 0 check (stock_qty >= 0),
  is_active boolean not null default true,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (compare_at_price_cad is null or compare_at_price_cad > price_cad),
  check (sale_starts_at is null or sale_ends_at is null or sale_ends_at > sale_starts_at)
);

create table public.variant_option_values (
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  option_value_id uuid not null references public.product_option_values (id) on delete cascade,
  primary key (variant_id, option_value_id)
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete restrict,
  storage_path text not null unique check (
    storage_path ~ '^products/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/[^/]+\.(jpg|jpeg|png|webp)$'
  ),
  alt_text text not null check (length(btrim(alt_text)) between 1 and 300),
  sort_order integer not null default 0 check (sort_order >= 0),
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  check ((width is null and height is null) or (width > 0 and height > 0))
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  type public.collection_type not null default 'manual',
  is_visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_translations (
  collection_id uuid not null references public.collections (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  name text not null check (length(btrim(name)) between 1 and 160),
  description text,
  primary key (collection_id, locale),
  check (description is null or length(btrim(description)) > 0)
);

create table public.product_collections (
  product_id uuid not null references public.products (id) on delete cascade,
  collection_id uuid not null references public.collections (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  primary key (product_id, collection_id)
);

create table public.order_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default (
    'HB-' || upper(encode(extensions.gen_random_bytes(10), 'hex'))
  ) check (request_number ~ '^HB-[A-F0-9]{20}$'),
  status public.order_request_status not null default 'new',
  customer_name text not null check (length(btrim(customer_name)) between 1 and 120),
  email text not null check (length(btrim(email)) between 3 and 320 and position('@' in email) > 1),
  phone text,
  preferred_contact public.contact_preference not null,
  fulfillment_method public.fulfillment_method not null,
  city_or_area text not null check (length(btrim(city_or_area)) between 1 and 120),
  postal_code text,
  wechat_or_other_contact text,
  preferred_time text,
  customer_note text,
  currency text not null default 'CAD' check (currency = 'CAD'),
  subtotal_snapshot numeric(12, 2) not null check (subtotal_snapshot > 0),
  shipping_amount numeric(12, 2) check (shipping_amount is null or shipping_amount >= 0),
  tax_amount numeric(12, 2) check (tax_amount is null or tax_amount >= 0),
  final_total numeric(12, 2) check (final_total is null or final_total >= 0),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is null or length(btrim(phone)) > 0),
  check (postal_code is null or length(btrim(postal_code)) > 0),
  check (preferred_contact <> 'phone' or phone is not null),
  check (fulfillment_method <> 'local_delivery' or postal_code is not null),
  check (
    final_total is null
    or final_total = subtotal_snapshot + coalesce(shipping_amount, 0) + coalesce(tax_amount, 0)
  )
);

create table public.order_request_items (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid not null references public.product_variants (id) on delete restrict,
  product_title_snapshot text not null check (length(btrim(product_title_snapshot)) between 1 and 200),
  variant_label_snapshot text not null check (length(btrim(variant_label_snapshot)) between 1 and 300),
  sku_snapshot text not null check (length(btrim(sku_snapshot)) between 1 and 100),
  unit_price_snapshot numeric(12, 2) not null check (unit_price_snapshot > 0),
  quantity integer not null check (quantity > 0),
  line_total_snapshot numeric(12, 2) not null,
  image_path_snapshot text,
  created_at timestamptz not null default now(),
  check (line_total_snapshot = unit_price_snapshot * quantity),
  check (image_path_snapshot is null or length(btrim(image_path_snapshot)) > 0)
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_type public.homepage_section_type not null unique,
  is_enabled boolean not null default false,
  sort_order integer not null default 0 check (sort_order >= 0),
  settings_json jsonb not null default '{}'::jsonb check (jsonb_typeof(settings_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_section_translations (
  section_id uuid not null references public.homepage_sections (id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  heading text,
  body text,
  cta_label text,
  cta_href text,
  primary key (section_id, locale),
  check (heading is null or length(btrim(heading)) > 0),
  check (body is null or length(btrim(body)) > 0),
  check (cta_label is null or length(btrim(cta_label)) > 0),
  check (cta_href is null or cta_href ~ '^/(?:[^[:space:]]*)?$')
);

create table public.site_settings (
  id boolean primary key default true check (id),
  shop_name text not null check (length(btrim(shop_name)) between 1 and 160),
  contact_email text,
  contact_phone text,
  social_links jsonb not null default '{}'::jsonb check (jsonb_typeof(social_links) = 'object'),
  announcement_enabled boolean not null default false,
  pickup_enabled boolean not null default true,
  local_delivery_enabled boolean not null default false,
  service_area_description text,
  order_request_notice text not null check (length(btrim(order_request_notice)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (contact_email is null or (length(btrim(contact_email)) between 3 and 320 and position('@' in contact_email) > 1)),
  check (contact_phone is null or length(btrim(contact_phone)) > 0),
  check (service_area_description is null or length(btrim(service_area_description)) > 0)
);

create unique index product_options_product_name_key_uidx
  on public.product_options (product_id, lower(name_key));
create unique index product_option_values_option_value_key_uidx
  on public.product_option_values (option_id, lower(value_key));
create unique index product_variants_product_sku_uidx
  on public.product_variants (product_id, lower(sku));
create index products_created_by_idx on public.products (created_by);
create index products_public_catalog_idx
  on public.products (status, published_at desc)
  where status = 'published';
create index product_variants_product_active_idx
  on public.product_variants (product_id, is_active);
create index variant_option_values_option_value_idx
  on public.variant_option_values (option_value_id);
create index product_images_product_sort_idx
  on public.product_images (product_id, sort_order);
create index product_images_variant_idx on public.product_images (variant_id);
create index product_collections_collection_sort_idx
  on public.product_collections (collection_id, sort_order);
create index order_requests_status_created_idx
  on public.order_requests (status, created_at desc);
create index order_request_items_order_idx
  on public.order_request_items (order_request_id);
create index order_request_items_product_idx
  on public.order_request_items (product_id);
create index order_request_items_variant_idx
  on public.order_request_items (variant_id);
create index homepage_sections_enabled_sort_idx
  on public.homepage_sections (is_enabled, sort_order);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();
create trigger categories_set_updated_at
before update on public.categories
for each row execute function private.set_updated_at();
create trigger products_set_updated_at
before update on public.products
for each row execute function private.set_updated_at();
create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function private.set_updated_at();
create trigger collections_set_updated_at
before update on public.collections
for each row execute function private.set_updated_at();
create trigger order_requests_set_updated_at
before update on public.order_requests
for each row execute function private.set_updated_at();
create trigger homepage_sections_set_updated_at
before update on public.homepage_sections
for each row execute function private.set_updated_at();
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute function private.set_updated_at();

create function private.assert_product_variant_combinations(target_product_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  expected_option_count integer;
begin
  if target_product_id is null then
    return;
  end if;

  select count(*)
  into expected_option_count
  from public.product_options
  where product_id = target_product_id;

  if exists (
    select 1
    from public.product_variants as variant
    left join public.variant_option_values as link
      on link.variant_id = variant.id
    left join public.product_option_values as option_value
      on option_value.id = link.option_value_id
    left join public.product_options as product_option
      on product_option.id = option_value.option_id
    where variant.product_id = target_product_id
    group by variant.id
    having count(link.option_value_id) <> expected_option_count
      or count(distinct option_value.option_id) <> expected_option_count
      or count(*) filter (
        where link.option_value_id is not null
          and product_option.product_id is distinct from target_product_id
      ) > 0
  ) then
    raise exception using
      errcode = '23514',
      message = 'Each variant must select exactly one value for every option of its product.';
  end if;

  if exists (
    select 1
    from (
      select
        variant.id,
        coalesce(
          array_agg(link.option_value_id order by link.option_value_id)
            filter (where link.option_value_id is not null),
          '{}'::uuid[]
        ) as option_value_signature
      from public.product_variants as variant
      left join public.variant_option_values as link
        on link.variant_id = variant.id
      where variant.product_id = target_product_id
      group by variant.id
    ) as signatures
    group by option_value_signature
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'Duplicate variant option combination for this product.';
  end if;
end;
$$;

create function private.enforce_product_variant_combinations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_product_id uuid;
  new_product_id uuid;
begin
  if tg_table_name = 'product_variants' then
    if tg_op <> 'INSERT' then
      old_product_id := old.product_id;
    end if;
    if tg_op <> 'DELETE' then
      new_product_id := new.product_id;
    end if;
  elsif tg_table_name = 'product_options' then
    if tg_op <> 'INSERT' then
      old_product_id := old.product_id;
    end if;
    if tg_op <> 'DELETE' then
      new_product_id := new.product_id;
    end if;
  elsif tg_table_name = 'product_option_values' then
    if tg_op <> 'INSERT' then
      select product_id into old_product_id
      from public.product_options where id = old.option_id;
    end if;
    if tg_op <> 'DELETE' then
      select product_id into new_product_id
      from public.product_options where id = new.option_id;
    end if;
  elsif tg_table_name = 'variant_option_values' then
    if tg_op <> 'INSERT' then
      select product_id into old_product_id
      from public.product_variants where id = old.variant_id;
    end if;
    if tg_op <> 'DELETE' then
      select product_id into new_product_id
      from public.product_variants where id = new.variant_id;
    end if;
  end if;

  perform private.assert_product_variant_combinations(old_product_id);
  if new_product_id is distinct from old_product_id then
    perform private.assert_product_variant_combinations(new_product_id);
  end if;
  return null;
end;
$$;

create constraint trigger product_variants_validate_combinations
after insert or update or delete on public.product_variants
deferrable initially deferred
for each row execute function private.enforce_product_variant_combinations();
create constraint trigger product_options_validate_combinations
after insert or update or delete on public.product_options
deferrable initially deferred
for each row execute function private.enforce_product_variant_combinations();
create constraint trigger product_option_values_validate_combinations
after insert or update or delete on public.product_option_values
deferrable initially deferred
for each row execute function private.enforce_product_variant_combinations();
create constraint trigger variant_option_values_validate_combinations
after insert or update or delete on public.variant_option_values
deferrable initially deferred
for each row execute function private.enforce_product_variant_combinations();

create function private.validate_product_image_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.variant_id is not null and not exists (
    select 1 from public.product_variants
    where id = new.variant_id and product_id = new.product_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Product image variant must belong to the same product.';
  end if;
  return new;
end;
$$;

create trigger product_images_validate_variant
before insert or update of product_id, variant_id on public.product_images
for each row execute function private.validate_product_image_variant();

create function private.validate_order_item_variant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.product_variants
    where id = new.variant_id and product_id = new.product_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Order item variant must belong to the snapshotted product.';
  end if;
  return new;
end;
$$;

create trigger order_request_items_validate_variant
before insert or update of product_id, variant_id on public.order_request_items
for each row execute function private.validate_order_item_variant();

create function private.assert_order_request_totals(target_order_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  stored_subtotal numeric(12, 2);
  item_count integer;
  calculated_subtotal numeric(12, 2);
begin
  if target_order_request_id is null then
    return;
  end if;

  select subtotal_snapshot into stored_subtotal
  from public.order_requests
  where id = target_order_request_id;

  if not found then
    return;
  end if;

  select count(*), coalesce(sum(line_total_snapshot), 0)
  into item_count, calculated_subtotal
  from public.order_request_items
  where order_request_id = target_order_request_id;

  if item_count = 0 then
    raise exception using
      errcode = '23514',
      message = 'Order request must contain at least one item snapshot.';
  end if;

  if stored_subtotal <> calculated_subtotal then
    raise exception using
      errcode = '23514',
      message = 'Order request subtotal must equal the item snapshot total.';
  end if;
end;
$$;

create function private.enforce_order_request_totals()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_request_id uuid;
  new_request_id uuid;
begin
  if tg_table_name = 'order_requests' then
    if tg_op <> 'INSERT' then
      old_request_id := old.id;
    end if;
    if tg_op <> 'DELETE' then
      new_request_id := new.id;
    end if;
  else
    if tg_op <> 'INSERT' then
      old_request_id := old.order_request_id;
    end if;
    if tg_op <> 'DELETE' then
      new_request_id := new.order_request_id;
    end if;
  end if;

  perform private.assert_order_request_totals(old_request_id);
  if new_request_id is distinct from old_request_id then
    perform private.assert_order_request_totals(new_request_id);
  end if;
  return null;
end;
$$;

create constraint trigger order_requests_validate_totals
after insert or update or delete on public.order_requests
deferrable initially deferred
for each row execute function private.enforce_order_request_totals();
create constraint trigger order_request_items_validate_totals
after insert or update or delete on public.order_request_items
deferrable initially deferred
for each row execute function private.enforce_order_request_totals();

revoke execute on all functions in schema private from public;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.category_translations enable row level security;
alter table public.products enable row level security;
alter table public.product_translations enable row level security;
alter table public.product_options enable row level security;
alter table public.product_option_translations enable row level security;
alter table public.product_option_values enable row level security;
alter table public.product_option_value_translations enable row level security;
alter table public.product_variants enable row level security;
alter table public.variant_option_values enable row level security;
alter table public.product_images enable row level security;
alter table public.collections enable row level security;
alter table public.collection_translations enable row level security;
alter table public.product_collections enable row level security;
alter table public.order_requests enable row level security;
alter table public.order_request_items enable row level security;
alter table public.homepage_sections enable row level security;
alter table public.homepage_section_translations enable row level security;
alter table public.site_settings enable row level security;

create policy profiles_admin_select
on public.profiles for select
to authenticated
using ((select private.is_admin()));

create policy categories_public_select
on public.categories for select
to anon
using (is_visible);
create policy categories_authenticated_select
on public.categories for select
to authenticated
using (is_visible or (select private.is_admin()));

create policy category_translations_public_select
on public.category_translations for select
to anon
using (
  exists (
    select 1 from public.categories
    where categories.id = category_translations.category_id
      and categories.is_visible
  )
);
create policy category_translations_authenticated_select
on public.category_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.categories
    where categories.id = category_translations.category_id
      and categories.is_visible
  )
);

create policy products_public_select
on public.products for select
to anon
using (
  status = 'published'
  and published_at is not null
  and published_at <= now()
);
create policy products_authenticated_select
on public.products for select
to authenticated
using (
  (select private.is_admin())
  or (
    status = 'published'
    and published_at is not null
    and published_at <= now()
  )
);

create policy product_translations_public_select
on public.product_translations for select
to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_translations.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_translations_authenticated_select
on public.product_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.products
    where products.id = product_translations.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_options_public_select
on public.product_options for select
to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_options.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_options_authenticated_select
on public.product_options for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.products
    where products.id = product_options.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_option_translations_public_select
on public.product_option_translations for select
to anon
using (
  exists (
    select 1
    from public.product_options
    join public.products on products.id = product_options.product_id
    where product_options.id = product_option_translations.option_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_option_translations_authenticated_select
on public.product_option_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.product_options
    join public.products on products.id = product_options.product_id
    where product_options.id = product_option_translations.option_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_option_values_public_select
on public.product_option_values for select
to anon
using (
  exists (
    select 1
    from public.product_options
    join public.products on products.id = product_options.product_id
    where product_options.id = product_option_values.option_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_option_values_authenticated_select
on public.product_option_values for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.product_options
    join public.products on products.id = product_options.product_id
    where product_options.id = product_option_values.option_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_option_value_translations_public_select
on public.product_option_value_translations for select
to anon
using (
  exists (
    select 1
    from public.product_option_values
    join public.product_options on product_options.id = product_option_values.option_id
    join public.products on products.id = product_options.product_id
    where product_option_values.id = product_option_value_translations.option_value_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_option_value_translations_authenticated_select
on public.product_option_value_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.product_option_values
    join public.product_options on product_options.id = product_option_values.option_id
    join public.products on products.id = product_options.product_id
    where product_option_values.id = product_option_value_translations.option_value_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_variants_public_select
on public.product_variants for select
to anon
using (
  is_active
  and exists (
    select 1 from public.products
    where products.id = product_variants.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_variants_authenticated_select
on public.product_variants for select
to authenticated
using (
  (select private.is_admin())
  or (
    is_active
    and exists (
      select 1 from public.products
      where products.id = product_variants.product_id
        and products.status = 'published'
        and products.published_at is not null
        and products.published_at <= now()
    )
  )
);

create policy variant_option_values_public_select
on public.variant_option_values for select
to anon
using (
  exists (
    select 1
    from public.product_variants
    join public.products on products.id = product_variants.product_id
    where product_variants.id = variant_option_values.variant_id
      and product_variants.is_active
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy variant_option_values_authenticated_select
on public.variant_option_values for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.product_variants
    join public.products on products.id = product_variants.product_id
    where product_variants.id = variant_option_values.variant_id
      and product_variants.is_active
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);

create policy product_images_public_select
on public.product_images for select
to anon
using (
  exists (
    select 1 from public.products
    where products.id = product_images.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
  and (
    variant_id is null
    or exists (
      select 1 from public.product_variants
      where product_variants.id = product_images.variant_id
        and product_variants.product_id = product_images.product_id
        and product_variants.is_active
    )
  )
);
create policy product_images_authenticated_select
on public.product_images for select
to authenticated
using (
  (select private.is_admin())
  or (
    exists (
      select 1 from public.products
      where products.id = product_images.product_id
        and products.status = 'published'
        and products.published_at is not null
        and products.published_at <= now()
    )
    and (
      variant_id is null
      or exists (
        select 1 from public.product_variants
        where product_variants.id = product_images.variant_id
          and product_variants.product_id = product_images.product_id
          and product_variants.is_active
      )
    )
  )
);

create policy collections_public_select
on public.collections for select
to anon
using (is_visible);
create policy collections_authenticated_select
on public.collections for select
to authenticated
using (is_visible or (select private.is_admin()));

create policy collection_translations_public_select
on public.collection_translations for select
to anon
using (
  exists (
    select 1 from public.collections
    where collections.id = collection_translations.collection_id
      and collections.is_visible
  )
);
create policy collection_translations_authenticated_select
on public.collection_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.collections
    where collections.id = collection_translations.collection_id
      and collections.is_visible
  )
);

create policy product_collections_public_select
on public.product_collections for select
to anon
using (
  exists (
    select 1 from public.collections
    where collections.id = product_collections.collection_id
      and collections.is_visible
  )
  and exists (
    select 1 from public.products
    where products.id = product_collections.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
);
create policy product_collections_authenticated_select
on public.product_collections for select
to authenticated
using (
  (select private.is_admin())
  or (
    exists (
      select 1 from public.collections
      where collections.id = product_collections.collection_id
        and collections.is_visible
    )
    and exists (
      select 1 from public.products
      where products.id = product_collections.product_id
        and products.status = 'published'
        and products.published_at is not null
        and products.published_at <= now()
    )
  )
);

create policy order_requests_admin_select
on public.order_requests for select
to authenticated
using ((select private.is_admin()));
create policy order_requests_admin_update
on public.order_requests for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy order_request_items_admin_select
on public.order_request_items for select
to authenticated
using ((select private.is_admin()));

create policy homepage_sections_public_select
on public.homepage_sections for select
to anon
using (is_enabled);
create policy homepage_sections_authenticated_select
on public.homepage_sections for select
to authenticated
using (is_enabled or (select private.is_admin()));

create policy homepage_section_translations_public_select
on public.homepage_section_translations for select
to anon
using (
  exists (
    select 1 from public.homepage_sections
    where homepage_sections.id = homepage_section_translations.section_id
      and homepage_sections.is_enabled
  )
);
create policy homepage_section_translations_authenticated_select
on public.homepage_section_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.homepage_sections
    where homepage_sections.id = homepage_section_translations.section_id
      and homepage_sections.is_enabled
  )
);

create policy site_settings_public_select
on public.site_settings for select
to anon
using (true);
create policy site_settings_authenticated_select
on public.site_settings for select
to authenticated
using (true);

do $admin_write_policies$
declare
  table_name text;
begin
  foreach table_name in array array[
    'categories',
    'category_translations',
    'products',
    'product_translations',
    'product_options',
    'product_option_translations',
    'product_option_values',
    'product_option_value_translations',
    'product_variants',
    'variant_option_values',
    'product_images',
    'collections',
    'collection_translations',
    'product_collections',
    'homepage_sections',
    'homepage_section_translations',
    'site_settings'
  ]
  loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_admin()))',
      table_name || '_admin_insert',
      table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()))',
      table_name || '_admin_update',
      table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_admin()))',
      table_name || '_admin_delete',
      table_name
    );
  end loop;
end
$admin_write_policies$;

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on table
  public.categories,
  public.category_translations,
  public.products,
  public.product_translations,
  public.product_options,
  public.product_option_translations,
  public.product_option_values,
  public.product_option_value_translations,
  public.product_variants,
  public.variant_option_values,
  public.product_images,
  public.collections,
  public.collection_translations,
  public.product_collections,
  public.homepage_sections,
  public.homepage_section_translations,
  public.site_settings
to anon;

grant select, insert, update, delete on table
  public.categories,
  public.category_translations,
  public.products,
  public.product_translations,
  public.product_options,
  public.product_option_translations,
  public.product_option_values,
  public.product_option_value_translations,
  public.product_variants,
  public.variant_option_values,
  public.product_images,
  public.collections,
  public.collection_translations,
  public.product_collections,
  public.homepage_sections,
  public.homepage_section_translations,
  public.site_settings
to authenticated;
grant select on table public.profiles to authenticated;
grant select, update on table public.order_requests to authenticated;
grant select on table public.order_request_items to authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy product_images_storage_public_select
on storage.objects for select
to anon
using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.product_images
    join public.products on products.id = product_images.product_id
    where product_images.storage_path = storage.objects.name
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
      and (
        product_images.variant_id is null
        or exists (
          select 1 from public.product_variants
          where product_variants.id = product_images.variant_id
            and product_variants.product_id = product_images.product_id
            and product_variants.is_active
        )
      )
  )
);

create policy product_images_storage_authenticated_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'product-images'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.product_images
      join public.products on products.id = product_images.product_id
      where product_images.storage_path = storage.objects.name
        and products.status = 'published'
        and products.published_at is not null
        and products.published_at <= now()
        and (
          product_images.variant_id is null
          or exists (
            select 1 from public.product_variants
            where product_variants.id = product_images.variant_id
              and product_variants.product_id = product_images.product_id
              and product_variants.is_active
          )
        )
    )
  )
);

create policy product_images_storage_admin_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.products
    where products.id::text = (storage.foldername(name))[2]
  )
);

create policy product_images_storage_admin_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'product-images'
  and (select private.is_admin())
)
with check (
  bucket_id = 'product-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = 'products'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.products
    where products.id::text = (storage.foldername(name))[2]
  )
);

create policy product_images_storage_admin_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'product-images'
  and (select private.is_admin())
);
