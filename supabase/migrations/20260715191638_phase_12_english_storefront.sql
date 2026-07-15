create table public.product_image_translations (
  image_id uuid not null references public.product_images(id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  alt_text text not null check (length(btrim(alt_text)) between 1 and 300),
  primary key (image_id, locale)
);

create table public.site_setting_translations (
  site_settings_id boolean not null default true references public.site_settings(id) on delete cascade,
  locale text not null check (locale ~ '^[a-z]{2}(?:-[A-Z]{2})?$'),
  service_area_description text,
  order_request_notice text,
  primary key (site_settings_id, locale),
  constraint site_setting_translation_singleton check (site_settings_id),
  constraint site_setting_translation_service_area_length
    check (service_area_description is null or length(service_area_description) <= 1000),
  constraint site_setting_translation_order_notice_length
    check (order_request_notice is null or length(order_request_notice) <= 2000)
);

alter table public.order_requests
  add column request_locale text;

update public.order_requests set request_locale = 'zh' where request_locale is null;

alter table public.order_requests
  alter column request_locale set not null,
  alter column request_locale set default 'en',
  add constraint order_requests_request_locale_check check (request_locale in ('en', 'zh'));

alter table public.product_image_translations enable row level security;
alter table public.site_setting_translations enable row level security;

create policy product_image_translations_public_select
on public.product_image_translations for select
to anon
using (
  exists (
    select 1
    from public.product_images
    join public.products on products.id = product_images.product_id
    where product_images.id = product_image_translations.image_id
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

create policy product_image_translations_authenticated_select
on public.product_image_translations for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.product_images
    join public.products on products.id = product_images.product_id
    where product_images.id = product_image_translations.image_id
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

create policy product_image_translations_admin_insert
on public.product_image_translations for insert
to authenticated
with check ((select private.is_admin()));

create policy product_image_translations_admin_update
on public.product_image_translations for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy product_image_translations_admin_delete
on public.product_image_translations for delete
to authenticated
using ((select private.is_admin()));

create policy site_setting_translations_public_select
on public.site_setting_translations for select
to anon
using (true);

create policy site_setting_translations_authenticated_select
on public.site_setting_translations for select
to authenticated
using (true);

create policy site_setting_translations_admin_insert
on public.site_setting_translations for insert
to authenticated
with check ((select private.is_admin()));

create policy site_setting_translations_admin_update
on public.site_setting_translations for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy site_setting_translations_admin_delete
on public.site_setting_translations for delete
to authenticated
using ((select private.is_admin()));

grant select on table public.product_image_translations, public.site_setting_translations to anon;
grant select, insert, update, delete on table public.product_image_translations, public.site_setting_translations to authenticated;

insert into public.product_image_translations (image_id, locale, alt_text)
select id, 'zh', alt_text from public.product_images
on conflict (image_id, locale) do nothing;

insert into public.site_settings (
  id,
  shop_name,
  order_request_notice
)
values (
  true,
  'Happy Beans / 福豆',
  '提交后不会立即付款，也不代表订单已经确认。店主会联系你核对库存、履约安排、税费及最终金额。'
)
on conflict (id) do nothing;

insert into public.site_setting_translations (
  site_settings_id,
  locale,
  service_area_description,
  order_request_notice
)
select
  id,
  'zh',
  service_area_description,
  order_request_notice
from public.site_settings
on conflict (site_settings_id, locale) do nothing;

insert into public.site_setting_translations (
  site_settings_id,
  locale,
  service_area_description,
  order_request_notice
)
values (
  true,
  'en',
  'Pickup and local delivery are available in Vancouver and nearby areas. The owner will confirm availability and any fees.',
  'Submitting this form does not take payment or confirm an order. Happy Beans will contact you to verify stock, fulfillment, taxes, and the final amount.'
)
on conflict (site_settings_id, locale) do nothing;

create or replace function public.admin_create_product_bilingual(
  p_slug text,
  p_zh_title text,
  p_zh_short_description text,
  p_zh_description text,
  p_zh_seo_title text,
  p_zh_seo_description text,
  p_en_title text,
  p_en_short_description text,
  p_en_description text,
  p_en_seo_title text,
  p_en_seo_description text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  product_id uuid;
  has_english boolean := coalesce(btrim(p_en_title), '') <> ''
    or coalesce(btrim(p_en_short_description), '') <> ''
    or coalesce(btrim(p_en_description), '') <> ''
    or coalesce(btrim(p_en_seo_title), '') <> ''
    or coalesce(btrim(p_en_seo_description), '') <> '';
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if has_english and coalesce(btrim(p_en_title), '') = '' then
    raise check_violation using message = 'English title is required when English content is present';
  end if;

  product_id := public.admin_create_product(
    p_slug,
    p_zh_title,
    p_zh_short_description,
    p_zh_description,
    p_zh_seo_title,
    p_zh_seo_description
  );

  if has_english then
    insert into public.product_translations (
      product_id, locale, title, short_description, description, seo_title, seo_description
    ) values (
      product_id,
      'en',
      btrim(p_en_title),
      nullif(btrim(p_en_short_description), ''),
      nullif(btrim(p_en_description), ''),
      nullif(btrim(p_en_seo_title), ''),
      nullif(btrim(p_en_seo_description), '')
    );
  end if;

  return product_id;
end;
$$;

create or replace function public.admin_update_product_bilingual(
  p_product_id uuid,
  p_slug text,
  p_zh_title text,
  p_zh_short_description text,
  p_zh_description text,
  p_zh_seo_title text,
  p_zh_seo_description text,
  p_en_title text,
  p_en_short_description text,
  p_en_description text,
  p_en_seo_title text,
  p_en_seo_description text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  has_english boolean := coalesce(btrim(p_en_title), '') <> ''
    or coalesce(btrim(p_en_short_description), '') <> ''
    or coalesce(btrim(p_en_description), '') <> ''
    or coalesce(btrim(p_en_seo_title), '') <> ''
    or coalesce(btrim(p_en_seo_description), '') <> '';
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if has_english and coalesce(btrim(p_en_title), '') = '' then
    raise check_violation using message = 'English title is required when English content is present';
  end if;

  perform public.admin_update_product(
    p_product_id,
    p_slug,
    p_zh_title,
    p_zh_short_description,
    p_zh_description,
    p_zh_seo_title,
    p_zh_seo_description
  );

  if has_english then
    insert into public.product_translations (
      product_id, locale, title, short_description, description, seo_title, seo_description
    ) values (
      p_product_id,
      'en',
      btrim(p_en_title),
      nullif(btrim(p_en_short_description), ''),
      nullif(btrim(p_en_description), ''),
      nullif(btrim(p_en_seo_title), ''),
      nullif(btrim(p_en_seo_description), '')
    )
    on conflict (product_id, locale) do update
    set title = excluded.title,
        short_description = excluded.short_description,
        description = excluded.description,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description;
  else
    delete from public.product_translations
    where product_id = p_product_id and locale = 'en';
  end if;
end;
$$;

create or replace function public.admin_create_category_bilingual(
  p_slug text,
  p_zh_name text,
  p_zh_description text,
  p_en_name text,
  p_en_description text,
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
  has_english boolean := coalesce(btrim(p_en_name), '') <> ''
    or coalesce(btrim(p_en_description), '') <> '';
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if has_english and coalesce(btrim(p_en_name), '') = '' then
    raise check_violation using message = 'English category name is required when English content is present';
  end if;

  category_id := public.admin_create_category(
    p_slug, p_zh_name, p_zh_description, p_sort_order, p_is_visible
  );

  if has_english then
    insert into public.category_translations (category_id, locale, name, description)
    values (category_id, 'en', btrim(p_en_name), nullif(btrim(p_en_description), ''));
  end if;

  return category_id;
end;
$$;

create or replace function public.admin_update_category_bilingual(
  p_category_id uuid,
  p_slug text,
  p_zh_name text,
  p_zh_description text,
  p_en_name text,
  p_en_description text,
  p_sort_order integer,
  p_is_visible boolean
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  has_english boolean := coalesce(btrim(p_en_name), '') <> ''
    or coalesce(btrim(p_en_description), '') <> '';
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if has_english and coalesce(btrim(p_en_name), '') = '' then
    raise check_violation using message = 'English category name is required when English content is present';
  end if;

  perform public.admin_update_category(
    p_category_id, p_slug, p_zh_name, p_zh_description, p_sort_order, p_is_visible
  );

  if has_english then
    insert into public.category_translations (category_id, locale, name, description)
    values (p_category_id, 'en', btrim(p_en_name), nullif(btrim(p_en_description), ''))
    on conflict (category_id, locale) do update
    set name = excluded.name, description = excluded.description;
  else
    delete from public.category_translations
    where category_id = p_category_id and locale = 'en';
  end if;
end;
$$;

revoke all on function public.admin_create_product_bilingual(
  text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
revoke all on function public.admin_update_product_bilingual(
  uuid, text, text, text, text, text, text, text, text, text, text, text
) from public, anon;
revoke all on function public.admin_create_category_bilingual(
  text, text, text, text, text, integer, boolean
) from public, anon;
revoke all on function public.admin_update_category_bilingual(
  uuid, text, text, text, text, text, integer, boolean
) from public, anon;

grant execute on function public.admin_create_product_bilingual(
  text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.admin_update_product_bilingual(
  uuid, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;
grant execute on function public.admin_create_category_bilingual(
  text, text, text, text, text, integer, boolean
) to authenticated;
grant execute on function public.admin_update_category_bilingual(
  uuid, text, text, text, text, text, integer, boolean
) to authenticated;

create or replace function public.admin_save_product_variants_bilingual(
  p_product_id uuid,
  p_configuration jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  option_item jsonb;
  value_item jsonb;
  saved_option_id uuid;
  saved_value_id uuid;
  english_label text;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  perform public.admin_save_product_variants(p_product_id, p_configuration);

  for option_item in select value from jsonb_array_elements(p_configuration -> 'options')
  loop
    saved_option_id := (option_item ->> 'id')::uuid;
    english_label := btrim(coalesce(option_item ->> 'labelEn', ''));
    if length(english_label) > 100 then
      raise check_violation using message = 'English option name is too long';
    elsif english_label = '' then
      delete from public.product_option_translations
      where product_option_translations.option_id = saved_option_id and locale = 'en';
    else
      insert into public.product_option_translations (option_id, locale, name)
      values (saved_option_id, 'en', english_label)
      on conflict (option_id, locale) do update set name = excluded.name;
    end if;

    for value_item in select value from jsonb_array_elements(option_item -> 'values')
    loop
      saved_value_id := (value_item ->> 'id')::uuid;
      english_label := btrim(coalesce(value_item ->> 'labelEn', ''));
      if length(english_label) > 100 then
        raise check_violation using message = 'English option value is too long';
      elsif english_label = '' then
        delete from public.product_option_value_translations
        where product_option_value_translations.option_value_id = saved_value_id and locale = 'en';
      else
        insert into public.product_option_value_translations (option_value_id, locale, label)
        values (saved_value_id, 'en', english_label)
        on conflict (option_value_id, locale) do update set label = excluded.label;
      end if;
    end loop;
  end loop;
end;
$$;

create or replace function public.admin_register_product_images_bilingual(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  image_item jsonb;
  saved_image_id uuid;
  english_alt text;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  perform public.admin_register_product_images(p_product_id, p_images);

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    saved_image_id := (image_item ->> 'id')::uuid;
    insert into public.product_image_translations (image_id, locale, alt_text)
    values (saved_image_id, 'zh', btrim(image_item ->> 'altText'))
    on conflict (image_id, locale) do update set alt_text = excluded.alt_text;

    english_alt := btrim(coalesce(image_item ->> 'altTextEn', ''));
    if length(english_alt) > 300 then
      raise check_violation using message = 'English image alt text is too long';
    elsif english_alt <> '' then
      insert into public.product_image_translations (image_id, locale, alt_text)
      values (saved_image_id, 'en', english_alt)
      on conflict (image_id, locale) do update set alt_text = excluded.alt_text;
    end if;
  end loop;
end;
$$;

create or replace function public.admin_save_product_images_bilingual(
  p_product_id uuid,
  p_images jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  image_item jsonb;
  saved_image_id uuid;
  english_alt text;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  perform public.admin_save_product_images(p_product_id, p_images);

  for image_item in select value from jsonb_array_elements(p_images)
  loop
    saved_image_id := (image_item ->> 'id')::uuid;
    insert into public.product_image_translations (image_id, locale, alt_text)
    values (saved_image_id, 'zh', btrim(image_item ->> 'altText'))
    on conflict (image_id, locale) do update set alt_text = excluded.alt_text;

    english_alt := btrim(coalesce(image_item ->> 'altTextEn', ''));
    if length(english_alt) > 300 then
      raise check_violation using message = 'English image alt text is too long';
    elsif english_alt = '' then
      delete from public.product_image_translations
      where product_image_translations.image_id = saved_image_id and locale = 'en';
    else
      insert into public.product_image_translations (image_id, locale, alt_text)
      values (saved_image_id, 'en', english_alt)
      on conflict (image_id, locale) do update set alt_text = excluded.alt_text;
    end if;
  end loop;
end;
$$;

revoke all on function public.admin_save_product_variants_bilingual(uuid, jsonb) from public, anon;
revoke all on function public.admin_register_product_images_bilingual(uuid, jsonb) from public, anon;
revoke all on function public.admin_save_product_images_bilingual(uuid, jsonb) from public, anon;
grant execute on function public.admin_save_product_variants_bilingual(uuid, jsonb) to authenticated;
grant execute on function public.admin_register_product_images_bilingual(uuid, jsonb) to authenticated;
grant execute on function public.admin_save_product_images_bilingual(uuid, jsonb) to authenticated;

create or replace function public.admin_save_homepage_bilingual(
  p_zh_sections jsonb,
  p_site_settings jsonb,
  p_en_sections jsonb,
  p_en_service_area_description text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_item jsonb;
  section_translation jsonb;
  section_content jsonb;
  faq_item jsonb;
  section_name text;
  saved_section_id uuid;
  section_enabled boolean;
  seen_types text[] := array[]::text[];
  allowed_types constant text[] := array[
    'announcement', 'hero', 'featured_categories', 'new_products',
    'featured_products', 'sale_products', 'brand_story',
    'fulfillment', 'faq', 'contact_cta'
  ];
  cta_targets constant text[] := array[
    '/products', '/collections/new', '/collections/featured',
    '/collections/sale', '#fulfillment', '#faq'
  ];
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  if jsonb_typeof(p_en_sections) <> 'array' or jsonb_array_length(p_en_sections) <> 10 then
    raise invalid_parameter_value using message = 'English homepage payload must contain all ten sections';
  end if;
  if length(coalesce(p_en_service_area_description, '')) > 1000
    or coalesce(p_en_service_area_description, '') ~ '[<>]' then
    raise invalid_parameter_value using message = 'English service area description is invalid';
  end if;

  perform public.admin_save_homepage(p_zh_sections, p_site_settings);

  for section_item in select value from jsonb_array_elements(p_en_sections)
  loop
    if jsonb_typeof(section_item) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(section_item) as key
        where key <> all (array['sectionType', 'translation'])
      ) then
      raise invalid_parameter_value using message = 'English homepage section contains unsupported keys';
    end if;

    section_name := section_item ->> 'sectionType';
    if section_name <> all (allowed_types) or section_name = any (seen_types) then
      raise invalid_parameter_value using message = 'English homepage section type is invalid or duplicated';
    end if;
    seen_types := array_append(seen_types, section_name);

    section_translation := coalesce(section_item -> 'translation', '{}'::jsonb);
    if jsonb_typeof(section_translation) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(section_translation) as key
        where key <> all (array['heading', 'body', 'ctaLabel', 'ctaHref', 'content'])
      ) then
      raise invalid_parameter_value using message = 'English homepage translation is invalid';
    end if;
    section_content := coalesce(section_translation -> 'content', '{}'::jsonb);

    select id, is_enabled into saved_section_id, section_enabled
    from public.homepage_sections
    where section_type = section_name::public.homepage_section_type;

    if saved_section_id is null then
      raise no_data_found using message = 'Homepage section not found';
    end if;
    if length(coalesce(section_translation->>'heading', '')) > 160
      or length(coalesce(section_translation->>'body', '')) > 5000
      or length(coalesce(section_translation->>'ctaLabel', '')) > 80
      or coalesce(section_translation->>'heading', '') ~ '[<>]'
      or coalesce(section_translation->>'body', '') ~ '[<>]'
      or coalesce(section_translation->>'ctaLabel', '') ~ '[<>]'
      or (
        coalesce(section_translation->>'ctaHref', '') <> ''
        and section_translation->>'ctaHref' <> all (cta_targets)
      ) then
      raise invalid_parameter_value using message = 'English homepage text exceeds the controlled schema';
    end if;

    if section_enabled and section_name = 'announcement'
      and coalesce(btrim(section_translation->>'body'), '') = '' then
      raise invalid_parameter_value using message = 'English announcement text is required';
    elsif section_enabled and section_name <> 'announcement'
      and coalesce(btrim(section_translation->>'heading'), '') = '' then
      raise invalid_parameter_value using message = 'English section heading is required';
    end if;

    if section_name = 'fulfillment' then
      if jsonb_typeof(section_content) <> 'object'
        or exists (
          select 1 from jsonb_object_keys(section_content) as key
          where key <> all (array['pickupTitle', 'pickupBody', 'deliveryTitle', 'deliveryBody'])
        )
        or coalesce(section_content::text, '') ~ '[<>]'
        or length(coalesce(section_content->>'pickupTitle', '')) > 120
        or length(coalesce(section_content->>'deliveryTitle', '')) > 120
        or length(coalesce(section_content->>'pickupBody', '')) > 2000
        or length(coalesce(section_content->>'deliveryBody', '')) > 2000
        or (section_enabled and (
          coalesce(btrim(section_content->>'pickupTitle'), '') = ''
          or coalesce(btrim(section_content->>'pickupBody'), '') = ''
          or coalesce(btrim(section_content->>'deliveryTitle'), '') = ''
          or coalesce(btrim(section_content->>'deliveryBody'), '') = ''
        )) then
        raise invalid_parameter_value using message = 'English fulfillment content is invalid';
      end if;
    elsif section_name = 'faq' then
      if jsonb_typeof(section_content) <> 'object'
        or exists (select 1 from jsonb_object_keys(section_content) as key where key <> 'items')
        or jsonb_typeof(section_content->'items') <> 'array'
        or jsonb_array_length(section_content->'items') > 5
        or (section_enabled and jsonb_array_length(section_content->'items') = 0) then
        raise invalid_parameter_value using message = 'English FAQ content is invalid';
      end if;
      for faq_item in select value from jsonb_array_elements(section_content->'items')
      loop
        if jsonb_typeof(faq_item) <> 'object'
          or exists (
            select 1 from jsonb_object_keys(faq_item) as key
            where key <> all (array['question', 'answer'])
          )
          or coalesce(btrim(faq_item->>'question'), '') = ''
          or coalesce(btrim(faq_item->>'answer'), '') = ''
          or length(faq_item->>'question') > 200
          or length(faq_item->>'answer') > 2000
          or coalesce(faq_item::text, '') ~ '[<>]' then
          raise invalid_parameter_value using message = 'English FAQ item is invalid';
        end if;
      end loop;
    elsif section_content <> '{}'::jsonb then
      raise invalid_parameter_value using message = 'English section does not accept structured content';
    end if;

    insert into public.homepage_section_translations (
      section_id, locale, heading, body, cta_label, cta_href, content_json
    ) values (
      saved_section_id,
      'en',
      nullif(btrim(section_translation->>'heading'), ''),
      nullif(btrim(section_translation->>'body'), ''),
      nullif(btrim(section_translation->>'ctaLabel'), ''),
      nullif(section_translation->>'ctaHref', ''),
      section_content
    )
    on conflict (section_id, locale) do update
    set heading = excluded.heading,
        body = excluded.body,
        cta_label = excluded.cta_label,
        cta_href = excluded.cta_href,
        content_json = excluded.content_json;
  end loop;

  insert into public.site_setting_translations (
    site_settings_id, locale, service_area_description, order_request_notice
  ) values (
    true,
    'zh',
    nullif(btrim(p_site_settings->>'serviceAreaDescription'), ''),
    '提交后不会立即付款，也不代表订单已经确认。店主会联系你核对库存、履约安排、税费及最终金额。'
  )
  on conflict (site_settings_id, locale) do update
  set service_area_description = excluded.service_area_description,
      order_request_notice = excluded.order_request_notice;

  insert into public.site_setting_translations (
    site_settings_id, locale, service_area_description, order_request_notice
  ) values (
    true,
    'en',
    nullif(btrim(p_en_service_area_description), ''),
    'Submitting this form does not take payment or confirm an order. Happy Beans will contact you to verify stock, fulfillment, taxes, and the final amount.'
  )
  on conflict (site_settings_id, locale) do update
  set service_area_description = excluded.service_area_description,
      order_request_notice = excluded.order_request_notice;
end;
$$;

revoke all on function public.admin_save_homepage_bilingual(jsonb, jsonb, jsonb, text) from public, anon;
grant execute on function public.admin_save_homepage_bilingual(jsonb, jsonb, jsonb, text) to authenticated;

with english_defaults(section_type, heading, body, cta_label, cta_href, content_json) as (
  values
    ('announcement'::public.homepage_section_type, null, 'Pickup and local delivery around Vancouver · Final arrangements are confirmed by the owner', null, null, '{}'::jsonb),
    ('hero', 'A little more joy for everyday life.', 'Discover cheerful home goods, tableware, and gifts. All prices are in CAD, with variant-level stock shown on each product page.', 'Shop new arrivals', '/collections/new', '{}'::jsonb),
    ('featured_categories', 'Start with a category you love', 'Browse cups, tableware, and cheerful home accents at your own pace.', null, null, '{}'::jsonb),
    ('new_products', 'New arrivals', 'Meet the newest finds at Happy Beans.', null, '/collections/new', '{}'::jsonb),
    ('featured_products', 'This week''s picks', 'Sweet everyday pieces for your home or someone special.', 'View all featured items', '/collections/featured', '{}'::jsonb),
    ('sale_products', 'Lovely little deals', 'Current and original CAD prices are shown clearly for every eligible variant.', 'View sale items', '/collections/sale', '{}'::jsonb),
    ('brand_story', 'About Happy Beans', 'We gather warm, cheerful home and gift items that feel cute without feeling childish.', null, null, '{}'::jsonb),
    ('fulfillment', 'Pickup and local delivery', 'Our first version focuses on pickup and limited local delivery around Vancouver.', null, null, '{"pickupTitle":"Local pickup","pickupBody":"The owner will confirm the pickup location and available time after receiving your request.","deliveryTitle":"Limited local delivery","deliveryBody":"Share your area and postal code, and the owner will confirm availability and any fees."}'::jsonb),
    ('faq', 'Frequently asked questions', 'A few helpful details before you send an order request.', null, null, '{"items":[{"question":"What currency are the prices in?","answer":"All public prices are in Canadian dollars (CAD). We do not display RMB or perform currency conversion."},{"question":"Do all colours and sizes have the same stock?","answer":"Not necessarily. Each exact variant has its own price and stock. Select every option on the product page to see the current details."},{"question":"Can I pay online?","answer":"Online payment is not available in this version. You can submit an order request, and the owner will contact you to confirm stock, fulfillment, taxes, and the final amount."}]}'::jsonb),
    ('contact_cta', 'Looking for something cheerful?', 'Browse all products or contact us with the kind of item you have in mind.', 'Start browsing', '/products', '{}'::jsonb)
)
insert into public.homepage_section_translations (
  section_id, locale, heading, body, cta_label, cta_href, content_json
)
select
  section.id,
  'en',
  defaults.heading,
  defaults.body,
  defaults.cta_label,
  defaults.cta_href,
  defaults.content_json
from english_defaults as defaults
join public.homepage_sections as section on section.section_type = defaults.section_type
on conflict (section_id, locale) do nothing;

create or replace function public.submit_order_request_localized(
  p_request_locale text,
  p_customer_name text,
  p_email text,
  p_phone text,
  p_preferred_contact public.contact_preference,
  p_fulfillment_method public.fulfillment_method,
  p_city_or_area text,
  p_postal_code text,
  p_wechat_or_other_contact text,
  p_preferred_time text,
  p_customer_note text,
  p_items jsonb,
  p_ip_hash text,
  p_email_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_locale text := lower(btrim(p_request_locale));
  normalized_email text := lower(btrim(p_email));
  normalized_phone text := nullif(btrim(p_phone), '');
  normalized_postal_code text := nullif(upper(btrim(p_postal_code)), '');
  rate_event_id bigint;
  recent_ip_count integer;
  recent_email_count integer;
  item_count integer;
  distinct_item_count integer;
  item record;
  variant_row record;
  variant_label text;
  option_value_count integer;
  translated_option_value_count integer;
  image_path text;
  snapshot_items jsonb := '[]'::jsonb;
  subtotal numeric(12, 2) := 0;
  request_id uuid;
  public_request_number text;
begin
  if normalized_locale not in ('en', 'zh') then
    raise invalid_parameter_value using message = 'invalid_locale';
  end if;
  if p_customer_name is null or length(btrim(p_customer_name)) not between 1 and 120 then
    raise invalid_parameter_value using message = 'invalid_customer_name';
  end if;
  if normalized_email is null or length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise invalid_parameter_value using message = 'invalid_email';
  end if;
  if p_preferred_contact = 'phone' and normalized_phone is null then
    raise invalid_parameter_value using message = 'phone_required';
  end if;
  if normalized_phone is not null and length(normalized_phone) > 40 then
    raise invalid_parameter_value using message = 'invalid_phone';
  end if;
  if p_city_or_area is null or length(btrim(p_city_or_area)) not between 1 and 120 then
    raise invalid_parameter_value using message = 'invalid_city_or_area';
  end if;
  if p_fulfillment_method = 'local_delivery' and normalized_postal_code is null then
    raise invalid_parameter_value using message = 'postal_code_required';
  end if;
  if normalized_postal_code is not null and length(normalized_postal_code) > 20 then
    raise invalid_parameter_value using message = 'invalid_postal_code';
  end if;
  if length(coalesce(p_wechat_or_other_contact, '')) > 120
    or length(coalesce(p_preferred_time, '')) > 200
    or length(coalesce(p_customer_note, '')) > 2000 then
    raise invalid_parameter_value using message = 'customer_text_too_long';
  end if;
  if p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise invalid_parameter_value using message = 'invalid_rate_limit_key';
  end if;
  if not coalesce(jsonb_typeof(p_items) = 'array', false) then
    raise invalid_parameter_value using message = 'invalid_items';
  end if;

  select count(*), count(distinct value->>'variant_id')
  into item_count, distinct_item_count
  from jsonb_array_elements(p_items);
  if item_count < 1 or item_count > 100 or item_count <> distinct_item_count then
    raise invalid_parameter_value using message = 'invalid_items';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 8018));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_email_hash, 8019));

  delete from private.order_request_rate_events
  where created_at < statement_timestamp() - interval '24 hours';

  select count(*) into recent_ip_count
  from private.order_request_rate_events
  where ip_hash = p_ip_hash
    and created_at >= statement_timestamp() - interval '1 hour';
  select count(*) into recent_email_count
  from private.order_request_rate_events
  where email_hash = p_email_hash
    and created_at >= statement_timestamp() - interval '1 hour';

  insert into private.order_request_rate_events (ip_hash, email_hash)
  values (p_ip_hash, p_email_hash)
  returning id into rate_event_id;

  if recent_ip_count >= 3 or recent_email_count >= 3 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  for item in
    select variant_id, quantity
    from jsonb_to_recordset(p_items) as parsed(variant_id uuid, quantity integer)
    order by variant_id
  loop
    if item.variant_id is null or item.quantity is null or item.quantity < 1 or item.quantity > 99 then
      raise invalid_parameter_value using message = 'invalid_items';
    end if;

    select
      variant.id,
      variant.product_id,
      variant.sku,
      variant.price_cad,
      variant.stock_qty,
      translation.title
    into variant_row
    from public.product_variants as variant
    join public.products as product on product.id = variant.product_id
    join public.product_translations as translation
      on translation.product_id = product.id and translation.locale = normalized_locale
    where variant.id = item.variant_id
      and variant.is_active
      and product.status = 'published'
      and product.published_at is not null
      and product.published_at <= statement_timestamp()
    for share of variant, product;

    if not found then
      raise invalid_parameter_value using message = 'item_unavailable';
    end if;
    if variant_row.stock_qty < item.quantity then
      raise invalid_parameter_value using message = 'insufficient_stock';
    end if;

    select count(*) into option_value_count
    from public.variant_option_values
    where variant_id = variant_row.id;

    select count(*) into translated_option_value_count
    from public.variant_option_values as link
    join public.product_option_values as value_row on value_row.id = link.option_value_id
    join public.product_options as option_row on option_row.id = value_row.option_id
    join public.product_option_translations as option_translation
      on option_translation.option_id = option_row.id and option_translation.locale = normalized_locale
    join public.product_option_value_translations as value_translation
      on value_translation.option_value_id = value_row.id and value_translation.locale = normalized_locale
    where link.variant_id = variant_row.id;

    if option_value_count <> translated_option_value_count then
      raise invalid_parameter_value using message = 'item_translation_incomplete';
    end if;

    select coalesce(
      string_agg(
        option_translation.name || case when normalized_locale = 'zh' then '：' else ': ' end || value_translation.label,
        ' / ' order by option_row.sort_order, value_row.sort_order, value_row.id
      ),
      case when normalized_locale = 'zh' then '默认规格' else 'Default option' end
    )
    into variant_label
    from public.variant_option_values as link
    join public.product_option_values as value_row on value_row.id = link.option_value_id
    join public.product_options as option_row on option_row.id = value_row.option_id
    join public.product_option_translations as option_translation
      on option_translation.option_id = option_row.id and option_translation.locale = normalized_locale
    join public.product_option_value_translations as value_translation
      on value_translation.option_value_id = value_row.id and value_translation.locale = normalized_locale
    where link.variant_id = variant_row.id;

    select product_image.storage_path
    into image_path
    from public.product_images as product_image
    where product_image.product_id = variant_row.product_id
      and (product_image.variant_id = variant_row.id or product_image.variant_id is null)
    order by (product_image.variant_id = variant_row.id) desc, product_image.sort_order, product_image.id
    limit 1;

    subtotal := subtotal + (variant_row.price_cad * item.quantity);
    snapshot_items := snapshot_items || jsonb_build_array(jsonb_build_object(
      'product_id', variant_row.product_id,
      'variant_id', variant_row.id,
      'product_title', variant_row.title,
      'variant_label', variant_label,
      'sku', variant_row.sku,
      'unit_price', variant_row.price_cad,
      'quantity', item.quantity,
      'line_total', variant_row.price_cad * item.quantity,
      'image_path', image_path
    ));
  end loop;

  insert into public.order_requests (
    request_locale, customer_name, email, phone, preferred_contact, fulfillment_method,
    city_or_area, postal_code, wechat_or_other_contact, preferred_time,
    customer_note, subtotal_snapshot
  ) values (
    normalized_locale, btrim(p_customer_name), normalized_email, normalized_phone, p_preferred_contact,
    p_fulfillment_method, btrim(p_city_or_area), normalized_postal_code,
    nullif(btrim(p_wechat_or_other_contact), ''), nullif(btrim(p_preferred_time), ''),
    nullif(btrim(p_customer_note), ''), subtotal
  )
  returning id, request_number into request_id, public_request_number;

  insert into public.order_request_items (
    order_request_id, product_id, variant_id, product_title_snapshot,
    variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
    line_total_snapshot, image_path_snapshot
  )
  select
    request_id, snapshot.product_id, snapshot.variant_id, snapshot.product_title,
    snapshot.variant_label, snapshot.sku, snapshot.unit_price, snapshot.quantity,
    snapshot.line_total, snapshot.image_path
  from jsonb_to_recordset(snapshot_items) as snapshot(
    product_id uuid,
    variant_id uuid,
    product_title text,
    variant_label text,
    sku text,
    unit_price numeric,
    quantity integer,
    line_total numeric,
    image_path text
  );

  insert into public.order_request_emails (order_request_id, kind)
  values
    (request_id, 'owner_notification'),
    (request_id, 'customer_confirmation');

  update private.order_request_rate_events
  set accepted = true, order_request_id = request_id
  where id = rate_event_id;

  return jsonb_build_object(
    'ok', true,
    'orderRequestId', request_id,
    'requestNumber', public_request_number
  );
end;
$$;

revoke execute on function public.submit_order_request_localized(
  text, text, text, text, public.contact_preference, public.fulfillment_method,
  text, text, text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.submit_order_request_localized(
  text, text, text, text, public.contact_preference, public.fulfillment_method,
  text, text, text, text, text, jsonb, text, text
) to service_role;

notify pgrst, 'reload schema';
