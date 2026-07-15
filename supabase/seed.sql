-- Local development data only. DEMO records must never be treated as production inventory.
begin;
set constraints all deferred;

insert into public.categories (id, slug, sort_order, is_visible)
values
  ('10000000-0000-4000-8000-000000000001', 'demo-tableware', 10, true),
  ('10000000-0000-4000-8000-000000000002', 'demo-home-decor', 20, true)
on conflict (id) do update
set slug = excluded.slug,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible;

insert into public.category_translations (category_id, locale, name, description)
values
  ('10000000-0000-4000-8000-000000000001', 'zh', '演示餐具', '仅用于本地开发的餐具分类。'),
  ('10000000-0000-4000-8000-000000000001', 'en', 'Demo Tableware', 'Local development tableware category.'),
  ('10000000-0000-4000-8000-000000000002', 'zh', '演示家居', '仅用于本地开发的家居分类。'),
  ('10000000-0000-4000-8000-000000000002', 'en', 'Demo Home', 'Local development home category.')
on conflict (category_id, locale) do update
set name = excluded.name,
    description = excluded.description;

insert into public.products (
  id, slug, status, published_at, is_featured
)
values
  ('20000000-0000-4000-8000-000000000001', 'demo-cat-dog-mug', 'published', '2026-01-01T00:00:00Z', true),
  ('20000000-0000-4000-8000-000000000002', 'demo-size-rug', 'published', '2026-01-02T00:00:00Z', false),
  ('20000000-0000-4000-8000-000000000003', 'demo-single-decor', 'draft', null, false)
on conflict (id) do update
set slug = excluded.slug,
    status = excluded.status,
    published_at = excluded.published_at,
    is_featured = excluded.is_featured;

insert into public.product_translations (
  product_id, locale, title, short_description, description, seo_title, seo_description
)
values
  ('20000000-0000-4000-8000-000000000001', 'zh', 'DEMO 猫狗马克杯', '款式与颜色组合示例。', '验证两种规格形成四个独立 SKU、价格和库存。', 'DEMO 猫狗马克杯', '本地数据库规格测试商品。'),
  ('20000000-0000-4000-8000-000000000001', 'en', 'DEMO Cat and Dog Mug', 'Style and color combination example.', 'Validates four independent SKU, price, and stock combinations.', 'DEMO Cat and Dog Mug', 'Local database variant test product.'),
  ('20000000-0000-4000-8000-000000000002', 'zh', 'DEMO 尺寸地毯', '单一尺寸规格示例。', '验证只有尺寸规格的商品。', 'DEMO 尺寸地毯', '本地数据库尺寸规格测试商品。'),
  ('20000000-0000-4000-8000-000000000002', 'en', 'DEMO Size Rug', 'Single size option example.', 'Validates a product with size variants only.', 'DEMO Size Rug', 'Local database size variant test product.'),
  ('20000000-0000-4000-8000-000000000003', 'zh', 'DEMO 无规格摆件', '无可选规格示例。', '验证没有 option 的商品仍拥有一个库存与价格 variant。', 'DEMO 无规格摆件', '本地数据库无规格测试商品。'),
  ('20000000-0000-4000-8000-000000000003', 'en', 'DEMO Single Decor', 'No selectable option example.', 'Validates one inventory and price variant without options.', 'DEMO Single Decor', 'Local database optionless test product.')
on conflict (product_id, locale) do update
set title = excluded.title,
    short_description = excluded.short_description,
    description = excluded.description,
    seo_title = excluded.seo_title,
    seo_description = excluded.seo_description;

insert into public.product_categories (product_id, category_id, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 10),
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 20),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 10),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 10)
on conflict (product_id, category_id) do update
set sort_order = excluded.sort_order;

insert into public.product_options (id, product_id, name_key, sort_order)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'style', 10),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'color', 20),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'size', 10)
on conflict (id) do update
set product_id = excluded.product_id,
    name_key = excluded.name_key,
    sort_order = excluded.sort_order;

insert into public.product_option_translations (option_id, locale, name)
values
  ('30000000-0000-4000-8000-000000000001', 'zh', '款式'),
  ('30000000-0000-4000-8000-000000000001', 'en', 'Style'),
  ('30000000-0000-4000-8000-000000000002', 'zh', '颜色'),
  ('30000000-0000-4000-8000-000000000002', 'en', 'Color'),
  ('30000000-0000-4000-8000-000000000003', 'zh', '尺寸'),
  ('30000000-0000-4000-8000-000000000003', 'en', 'Size')
on conflict (option_id, locale) do update set name = excluded.name;

insert into public.product_option_values (id, option_id, value_key, color_swatch, sort_order)
values
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'cat', null, 10),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'dog', null, 20),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'cream', '#F6E7C8', 10),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'blue', '#A9E3EA', 20),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', '40x60', null, 10),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000003', '60x90', null, 20)
on conflict (id) do update
set option_id = excluded.option_id,
    value_key = excluded.value_key,
    color_swatch = excluded.color_swatch,
    sort_order = excluded.sort_order;

insert into public.product_option_value_translations (option_value_id, locale, label)
values
  ('40000000-0000-4000-8000-000000000001', 'zh', '猫猫'),
  ('40000000-0000-4000-8000-000000000001', 'en', 'Cat'),
  ('40000000-0000-4000-8000-000000000002', 'zh', '狗狗'),
  ('40000000-0000-4000-8000-000000000002', 'en', 'Dog'),
  ('40000000-0000-4000-8000-000000000003', 'zh', '奶油色'),
  ('40000000-0000-4000-8000-000000000003', 'en', 'Cream'),
  ('40000000-0000-4000-8000-000000000004', 'zh', '浅蓝色'),
  ('40000000-0000-4000-8000-000000000004', 'en', 'Light Blue'),
  ('40000000-0000-4000-8000-000000000005', 'zh', '40×60 cm'),
  ('40000000-0000-4000-8000-000000000005', 'en', '40×60 cm'),
  ('40000000-0000-4000-8000-000000000006', 'zh', '60×90 cm'),
  ('40000000-0000-4000-8000-000000000006', 'en', '60×90 cm')
on conflict (option_value_id, locale) do update set label = excluded.label;

insert into public.product_variants (
  id, product_id, sku, price_cad, compare_at_price_cad, stock_qty, is_active
)
values
  ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'DEMO-MUG-CAT-CREAM', 24.00, null, 8, true),
  ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'DEMO-MUG-CAT-BLUE', 24.00, 29.00, 3, true),
  ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'DEMO-MUG-DOG-CREAM', 25.00, null, 5, true),
  ('50000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000001', 'DEMO-MUG-DOG-BLUE', 25.00, null, 0, true),
  ('50000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'DEMO-RUG-40X60', 39.00, null, 4, true),
  ('50000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'DEMO-RUG-60X90', 69.00, null, 2, true),
  ('50000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'DEMO-DECOR-SINGLE', 18.00, null, 6, true)
on conflict (id) do update
set product_id = excluded.product_id,
    sku = excluded.sku,
    price_cad = excluded.price_cad,
    compare_at_price_cad = excluded.compare_at_price_cad,
    stock_qty = excluded.stock_qty,
    is_active = excluded.is_active;

insert into public.variant_option_values (variant_id, option_value_id)
values
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000001'),
  ('50000000-0000-4000-8000-000000000002', '40000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000003'),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000002'),
  ('50000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000004'),
  ('50000000-0000-4000-8000-000000000005', '40000000-0000-4000-8000-000000000005'),
  ('50000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000006')
on conflict (variant_id, option_value_id) do nothing;

insert into public.collections (id, slug, type, is_visible, sort_order)
values
  ('60000000-0000-4000-8000-000000000001', 'new', 'automatic', true, 10),
  ('60000000-0000-4000-8000-000000000002', 'featured', 'manual', true, 20),
  ('60000000-0000-4000-8000-000000000003', 'sale', 'automatic', true, 30)
on conflict (id) do update
set slug = excluded.slug,
    type = excluded.type,
    is_visible = excluded.is_visible,
    sort_order = excluded.sort_order;

insert into public.collection_translations (collection_id, locale, name, description)
values
  ('60000000-0000-4000-8000-000000000001', 'zh', '新品', '本地演示新品集合。'),
  ('60000000-0000-4000-8000-000000000001', 'en', 'New', 'Local demo new collection.'),
  ('60000000-0000-4000-8000-000000000002', 'zh', '推荐', '本地演示推荐集合。'),
  ('60000000-0000-4000-8000-000000000002', 'en', 'Featured', 'Local demo featured collection.'),
  ('60000000-0000-4000-8000-000000000003', 'zh', '特价', '本地演示特价集合。'),
  ('60000000-0000-4000-8000-000000000003', 'en', 'Sale', 'Local demo sale collection.')
on conflict (collection_id, locale) do update
set name = excluded.name,
    description = excluded.description;

insert into public.product_collections (product_id, collection_id, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 10),
  ('20000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000003', 10),
  ('20000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', 20)
on conflict (product_id, collection_id) do update set sort_order = excluded.sort_order;

insert into public.homepage_section_translations (
  section_id, locale, heading, body, cta_label, cta_href, content_json
)
select section.id, defaults.locale, defaults.heading, defaults.body, defaults.cta_label, defaults.cta_href, defaults.content_json
from (
  values
    ('hero'::public.homepage_section_type, 'en', 'Local Demo Hero', 'Used only to validate the translation structure.', 'View demo products', '/products', '{}'::jsonb),
    ('faq'::public.homepage_section_type, 'en', 'Local Demo FAQ', 'Used only to validate the translation structure.', null, null, '{"items":[{"question":"Can I pay online?","answer":"This demo accepts an unpaid order request only."}]}'::jsonb)
) as defaults(section_type, locale, heading, body, cta_label, cta_href, content_json)
join public.homepage_sections as section on section.section_type = defaults.section_type
on conflict (section_id, locale) do update
set heading = excluded.heading,
    body = excluded.body,
    cta_label = excluded.cta_label,
    cta_href = excluded.cta_href,
    content_json = excluded.content_json;

insert into public.site_settings (
  id,
  shop_name,
  contact_email,
  social_links,
  announcement_enabled,
  pickup_enabled,
  local_delivery_enabled,
  service_area_description,
  order_request_notice
)
values (
  true,
  'Happy Beans / 福豆',
  'demo@example.invalid',
  '{}'::jsonb,
  true,
  true,
  true,
  '本地演示服务区域，不代表正式配送范围。',
  '这是订单请求，尚未付款，也不代表订单已经最终确认。'
)
on conflict (id) do update
set shop_name = excluded.shop_name,
    contact_email = excluded.contact_email,
    social_links = excluded.social_links,
    announcement_enabled = excluded.announcement_enabled,
    pickup_enabled = excluded.pickup_enabled,
    local_delivery_enabled = excluded.local_delivery_enabled,
    service_area_description = excluded.service_area_description,
    order_request_notice = excluded.order_request_notice;

commit;
