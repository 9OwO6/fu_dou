alter table public.homepage_section_translations
  add column content_json jsonb not null default '{}'::jsonb
  check (jsonb_typeof(content_json) = 'object');

alter table public.homepage_section_translations
  add constraint homepage_translation_heading_length_check
    check (heading is null or length(heading) <= 160),
  add constraint homepage_translation_body_length_check
    check (body is null or length(body) <= 5000),
  add constraint homepage_translation_cta_label_length_check
    check (cta_label is null or length(cta_label) <= 80),
  drop constraint homepage_section_translations_cta_href_check,
  add constraint homepage_translation_cta_href_check
    check (
      cta_href is null
      or cta_href in (
        '/products',
        '/collections/new',
        '/collections/featured',
        '/collections/sale',
        '#fulfillment',
        '#faq'
      )
    );

create or replace function public.admin_save_homepage(
  p_sections jsonb,
  p_site_settings jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  section_item jsonb;
  section_settings jsonb;
  section_translation jsonb;
  section_content jsonb;
  faq_item jsonb;
  section_name text;
  saved_section_id uuid;
  section_enabled boolean;
  section_sort_order integer;
  seen_types text[] := array[]::text[];
  seen_orders integer[] := array[]::integer[];
  allowed_types constant text[] := array[
    'announcement', 'hero', 'featured_categories', 'new_products',
    'featured_products', 'sale_products', 'brand_story',
    'fulfillment', 'faq', 'contact_cta'
  ];
  cta_targets constant text[] := array[
    '/products', '/collections/new', '/collections/featured',
    '/collections/sale', '#fulfillment', '#faq'
  ];
  id_value text;
  text_value text;
begin
  if not (select private.is_admin()) then
    raise exception 'administrator required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_sections) <> 'array' or jsonb_array_length(p_sections) <> 10 then
    raise exception 'homepage payload must contain all ten controlled sections' using errcode = '22023';
  end if;
  if jsonb_typeof(p_site_settings) <> 'object' then
    raise exception 'site settings must be an object' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_object_keys(p_site_settings) as key
    where key <> all (array[
      'contactEmail', 'contactPhone', 'pickupEnabled',
      'localDeliveryEnabled', 'serviceAreaDescription'
    ])
  ) then
    raise exception 'site settings contain unsupported keys' using errcode = '22023';
  end if;
  if jsonb_typeof(p_site_settings->'pickupEnabled') <> 'boolean'
    or jsonb_typeof(p_site_settings->'localDeliveryEnabled') <> 'boolean' then
    raise exception 'fulfillment settings must be boolean' using errcode = '22023';
  end if;
  if coalesce(p_site_settings->>'contactEmail', '') <> '' and (
    length(btrim(p_site_settings->>'contactEmail')) > 320
    or position('@' in p_site_settings->>'contactEmail') <= 1
  ) then
    raise exception 'contact email is invalid' using errcode = '22023';
  end if;
  if length(coalesce(p_site_settings->>'contactPhone', '')) > 40
    or length(coalesce(p_site_settings->>'serviceAreaDescription', '')) > 1000
    or coalesce(p_site_settings->>'contactEmail', '') ~ '[<>]'
    or coalesce(p_site_settings->>'contactPhone', '') ~ '[<>]'
    or coalesce(p_site_settings->>'serviceAreaDescription', '') ~ '[<>]' then
    raise exception 'site settings contain invalid text' using errcode = '22023';
  end if;

  for section_item in select value from jsonb_array_elements(p_sections)
  loop
    if jsonb_typeof(section_item) <> 'object' or exists (
      select 1
      from jsonb_object_keys(section_item) as key
      where key <> all (array['sectionType', 'isEnabled', 'sortOrder', 'settings', 'translation'])
    ) then
      raise exception 'section contains unsupported keys' using errcode = '22023';
    end if;

    section_name := section_item->>'sectionType';
    if section_name <> all (allowed_types) or section_name = any (seen_types) then
      raise exception 'section type is invalid or duplicated' using errcode = '22023';
    end if;
    seen_types := array_append(seen_types, section_name);

    if jsonb_typeof(section_item->'isEnabled') <> 'boolean'
      or jsonb_typeof(section_item->'sortOrder') <> 'number'
      or (section_item->>'sortOrder') !~ '^[0-9]+$' then
      raise exception 'section state or sort order is invalid' using errcode = '22023';
    end if;
    section_enabled := (section_item->>'isEnabled')::boolean;
    section_sort_order := (section_item->>'sortOrder')::integer;
    if section_sort_order > 99999 or section_sort_order = any (seen_orders) then
      raise exception 'section sort order is invalid or duplicated' using errcode = '22023';
    end if;
    seen_orders := array_append(seen_orders, section_sort_order);

    section_settings := section_item->'settings';
    section_translation := section_item->'translation';
    if jsonb_typeof(section_settings) <> 'object' or jsonb_typeof(section_translation) <> 'object' then
      raise exception 'section settings and translation must be objects' using errcode = '22023';
    end if;
    if exists (
      select 1
      from jsonb_object_keys(section_translation) as key
      where key <> all (array['heading', 'body', 'ctaLabel', 'ctaHref', 'content'])
    ) then
      raise exception 'translation contains unsupported keys' using errcode = '22023';
    end if;

    section_content := coalesce(section_translation->'content', '{}'::jsonb);
    if jsonb_typeof(section_content) <> 'object' then
      raise exception 'translation content must be an object' using errcode = '22023';
    end if;
    foreach text_value in array array[
      coalesce(section_translation->>'heading', ''),
      coalesce(section_translation->>'body', ''),
      coalesce(section_translation->>'ctaLabel', ''),
      section_content::text
    ]
    loop
      if text_value ~ '[<>]' then
        raise exception 'HTML and script-like markup are not allowed' using errcode = '22023';
      end if;
    end loop;
    if length(coalesce(section_translation->>'heading', '')) > 160
      or length(coalesce(section_translation->>'body', '')) > 5000
      or length(coalesce(section_translation->>'ctaLabel', '')) > 80
      or (
        coalesce(section_translation->>'ctaHref', '') <> ''
        and section_translation->>'ctaHref' <> all (cta_targets)
      ) then
      raise exception 'translation fields exceed the controlled schema' using errcode = '22023';
    end if;

    if section_name in ('announcement', 'fulfillment', 'faq', 'contact_cta') then
      if section_settings <> '{}'::jsonb then
        raise exception '% does not accept settings', section_name using errcode = '22023';
      end if;
    elsif section_name in ('hero', 'brand_story') then
      if exists (
        select 1 from jsonb_object_keys(section_settings) as key
        where key <> 'imageId'
      ) then
        raise exception '% contains unsupported settings', section_name using errcode = '22023';
      end if;
      id_value := nullif(section_settings->>'imageId', '');
      if id_value is not null and (
        id_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or not exists (select 1 from public.product_images where id = id_value::uuid)
      ) then
        raise exception 'selected image does not exist' using errcode = '22023';
      end if;
    elsif section_name = 'featured_categories' then
      if exists (
        select 1 from jsonb_object_keys(section_settings) as key
        where key <> 'categoryIds'
      ) or jsonb_typeof(section_settings->'categoryIds') <> 'array'
        or jsonb_array_length(section_settings->'categoryIds') > 6 then
        raise exception 'category selection is invalid' using errcode = '22023';
      end if;
      for id_value in select value from jsonb_array_elements_text(section_settings->'categoryIds')
      loop
        if id_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not exists (select 1 from public.categories where id = id_value::uuid) then
          raise exception 'selected category does not exist' using errcode = '22023';
        end if;
      end loop;
    elsif section_name in ('new_products', 'featured_products', 'sale_products') then
      if exists (
        select 1 from jsonb_object_keys(section_settings) as key
        where key <> all (array['selectionMode', 'productIds', 'limit'])
      ) or section_settings->>'selectionMode' not in ('automatic', 'manual')
        or jsonb_typeof(section_settings->'productIds') <> 'array'
        or jsonb_array_length(section_settings->'productIds') > 8
        or jsonb_typeof(section_settings->'limit') <> 'number'
        or (section_settings->>'limit') !~ '^[1-8]$' then
        raise exception 'product selection is invalid' using errcode = '22023';
      end if;
      if section_enabled and section_settings->>'selectionMode' = 'manual'
        and jsonb_array_length(section_settings->'productIds') = 0 then
        raise exception 'enabled manual product section needs at least one product' using errcode = '22023';
      end if;
      for id_value in select value from jsonb_array_elements_text(section_settings->'productIds')
      loop
        if id_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
          or not exists (select 1 from public.products where id = id_value::uuid) then
          raise exception 'selected product does not exist' using errcode = '22023';
        end if;
      end loop;
    end if;

    if section_name = 'announcement' and section_enabled
      and coalesce(btrim(section_translation->>'body'), '') = '' then
      raise exception 'announcement text is required' using errcode = '22023';
    elsif section_name in ('hero', 'brand_story', 'fulfillment', 'faq', 'contact_cta')
      and section_enabled and coalesce(btrim(section_translation->>'heading'), '') = '' then
      raise exception '% heading is required', section_name using errcode = '22023';
    end if;

    if section_name = 'fulfillment' then
      if exists (
        select 1 from jsonb_object_keys(section_content) as key
        where key <> all (array['pickupTitle', 'pickupBody', 'deliveryTitle', 'deliveryBody'])
      ) or (section_enabled and (
        coalesce(btrim(section_content->>'pickupTitle'), '') = ''
        or coalesce(btrim(section_content->>'pickupBody'), '') = ''
        or coalesce(btrim(section_content->>'deliveryTitle'), '') = ''
        or coalesce(btrim(section_content->>'deliveryBody'), '') = ''
      )) then
        raise exception 'fulfillment content is invalid' using errcode = '22023';
      end if;
    elsif section_name = 'faq' then
      if exists (
        select 1 from jsonb_object_keys(section_content) as key where key <> 'items'
      ) or jsonb_typeof(section_content->'items') <> 'array'
        or jsonb_array_length(section_content->'items') > 5
        or (section_enabled and jsonb_array_length(section_content->'items') = 0) then
        raise exception 'FAQ content is invalid' using errcode = '22023';
      end if;
      for faq_item in select value from jsonb_array_elements(section_content->'items')
      loop
        if jsonb_typeof(faq_item) <> 'object' or exists (
          select 1 from jsonb_object_keys(faq_item) as key
          where key <> all (array['question', 'answer'])
        ) or coalesce(btrim(faq_item->>'question'), '') = ''
          or coalesce(btrim(faq_item->>'answer'), '') = ''
          or length(faq_item->>'question') > 200
          or length(faq_item->>'answer') > 2000 then
          raise exception 'FAQ item is invalid' using errcode = '22023';
        end if;
      end loop;
    elsif section_name in ('announcement', 'hero', 'featured_categories', 'new_products', 'featured_products', 'sale_products', 'brand_story', 'contact_cta')
      and section_content <> '{}'::jsonb then
      raise exception '% does not accept translation content', section_name using errcode = '22023';
    end if;

    insert into public.homepage_sections (section_type, is_enabled, sort_order, settings_json)
    values (section_name::public.homepage_section_type, section_enabled, section_sort_order, section_settings)
    on conflict (section_type) do update
    set is_enabled = excluded.is_enabled,
        sort_order = excluded.sort_order,
        settings_json = excluded.settings_json
    returning id into saved_section_id;

    insert into public.homepage_section_translations (
      section_id, locale, heading, body, cta_label, cta_href, content_json
    ) values (
      saved_section_id,
      'zh',
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

  if array_length(seen_types, 1) <> array_length(allowed_types, 1) then
    raise exception 'all controlled section types are required' using errcode = '22023';
  end if;

  insert into public.site_settings (
    id, shop_name, contact_email, contact_phone, social_links,
    announcement_enabled, pickup_enabled, local_delivery_enabled,
    service_area_description, order_request_notice
  ) values (
    true,
    'Happy Beans / 福豆',
    nullif(btrim(p_site_settings->>'contactEmail'), ''),
    nullif(btrim(p_site_settings->>'contactPhone'), ''),
    '{}'::jsonb,
    coalesce((select is_enabled from public.homepage_sections where section_type = 'announcement'), false),
    (p_site_settings->>'pickupEnabled')::boolean,
    (p_site_settings->>'localDeliveryEnabled')::boolean,
    nullif(btrim(p_site_settings->>'serviceAreaDescription'), ''),
    '提交后不会立即付款，也不代表订单已经确认。店主会联系你核对库存、履约安排、税费及最终金额。'
  )
  on conflict (id) do update
  set contact_email = excluded.contact_email,
      contact_phone = excluded.contact_phone,
      announcement_enabled = excluded.announcement_enabled,
      pickup_enabled = excluded.pickup_enabled,
      local_delivery_enabled = excluded.local_delivery_enabled,
      service_area_description = excluded.service_area_description;

  insert into public.admin_audit_logs (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    (select auth.uid()),
    'homepage.settings.update',
    'homepage',
    'singleton',
    jsonb_build_object('section_count', 10)
  );
end;
$$;

revoke all on function public.admin_save_homepage(jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_homepage(jsonb, jsonb) to authenticated;

with section_defaults(section_type, is_enabled, sort_order, settings_json) as (
  values
    ('announcement'::public.homepage_section_type, true, 5, '{}'::jsonb),
    ('hero', true, 10, '{"imageId":null}'::jsonb),
    ('featured_categories', true, 20, '{"categoryIds":[]}'::jsonb),
    ('new_products', true, 30, '{"selectionMode":"automatic","productIds":[],"limit":4}'::jsonb),
    ('featured_products', true, 40, '{"selectionMode":"automatic","productIds":[],"limit":4}'::jsonb),
    ('sale_products', true, 50, '{"selectionMode":"automatic","productIds":[],"limit":4}'::jsonb),
    ('brand_story', true, 60, '{"imageId":null}'::jsonb),
    ('fulfillment', true, 70, '{}'::jsonb),
    ('faq', true, 80, '{}'::jsonb),
    ('contact_cta', true, 90, '{}'::jsonb)
)
insert into public.homepage_sections (section_type, is_enabled, sort_order, settings_json)
select section_type, is_enabled, sort_order, settings_json from section_defaults
on conflict (section_type) do nothing;

with translation_defaults(section_type, heading, body, cta_label, cta_href, content_json) as (
  values
    ('announcement'::public.homepage_section_type, null, '温哥华周边自取与本地配送 · 具体安排由店主确认', null, null, '{}'::jsonb),
    ('hero', '把一点可爱和轻松，带进每天的生活。', '挑选适合日常、家居和送礼的小物。所有价格均为 CAD，规格库存以商品详情为准。', '看看新品', '/collections/new', '{}'::jsonb),
    ('featured_categories', '从喜欢的分类开始', '杯具、餐具和可爱家居小物，按真实商品慢慢补齐。', null, null, '{}'::jsonb),
    ('new_products', '新品上架', '看看最近来到 Happy Beans 的新面孔。', null, '/collections/new', '{}'::jsonb),
    ('featured_products', '本周推荐', '适合自己用，也适合送给喜欢可爱日常的人。', '查看全部推荐', '/collections/featured', '{}'::jsonb),
    ('sale_products', '温柔特价', '在售规格会清楚显示 CAD 原价与当前价格。', '查看全部特价', '/collections/sale', '{}'::jsonb),
    ('brand_story', '关于 Happy Beans', '我们想把温暖、轻松、可爱但不幼稚的家居与礼物小物带进日常。', null, null, '{}'::jsonb),
    ('fulfillment', '自取与本地配送', '第一版服务以自取和温哥华周边的小范围本地配送为主。', null, null, '{"pickupTitle":"本地自取","pickupBody":"具体地点和时间将在订单请求确认后提供。","deliveryTitle":"小范围本地配送","deliveryBody":"提交所在区域和邮编后，店主会确认是否可送达及相关费用。"}'::jsonb),
    ('faq', '常见问题', '先把浏览商品时最常见的疑问说清楚。', null, null, '{"items":[{"question":"网站上的价格是什么币种？","answer":"所有公开价格均为加拿大元（CAD），不显示人民币，也不做汇率换算。"},{"question":"不同颜色或尺寸的库存一样吗？","answer":"不一定。每个具体规格组合都有独立价格和库存，请在商品详情页选择完整规格后查看。"},{"question":"现在可以在线付款吗？","answer":"第一版不提供在线支付。提交的是订单请求，店主会联系确认库存、履约、税费和最终金额。"}]}'::jsonb),
    ('contact_cta', '有想找的可爱小物吗？', '可以先从全部商品开始逛，也可以通过下方联系方式告诉我们。', '开始逛逛', '/products', '{}'::jsonb)
)
insert into public.homepage_section_translations (
  section_id, locale, heading, body, cta_label, cta_href, content_json
)
select section.id, 'zh', defaults.heading, defaults.body, defaults.cta_label, defaults.cta_href, defaults.content_json
from translation_defaults as defaults
join public.homepage_sections as section on section.section_type = defaults.section_type
on conflict (section_id, locale) do nothing;
