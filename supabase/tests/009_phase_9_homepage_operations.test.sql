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
  ('d9000000-0000-4000-8000-000000000001', 'phase9-admin@example.invalid'),
  ('d9000000-0000-4000-8000-000000000002', 'phase9-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('d9000000-0000-4000-8000-000000000001', 'Phase 9 测试管理员', 'admin');

create temporary table phase9_payload (sections jsonb, site_settings jsonb);
grant select on table pg_temp.phase9_payload to authenticated;
insert into phase9_payload values (
  '[
    {"sectionType":"announcement","isEnabled":true,"sortOrder":5,"settings":{},"translation":{"heading":"","body":"测试公告","ctaLabel":"","ctaHref":"","content":{}}},
    {"sectionType":"hero","isEnabled":true,"sortOrder":10,"settings":{"imageId":null},"translation":{"heading":"测试 Hero","body":"纯文本说明","ctaLabel":"查看新品","ctaHref":"/collections/new","content":{}}},
    {"sectionType":"featured_categories","isEnabled":true,"sortOrder":20,"settings":{"categoryIds":[]},"translation":{"heading":"热门分类","body":"分类说明","ctaLabel":"","ctaHref":"","content":{}}},
    {"sectionType":"new_products","isEnabled":true,"sortOrder":30,"settings":{"selectionMode":"automatic","productIds":[],"limit":4},"translation":{"heading":"新品","body":"新品说明","ctaLabel":"查看新品","ctaHref":"/collections/new","content":{}}},
    {"sectionType":"featured_products","isEnabled":true,"sortOrder":40,"settings":{"selectionMode":"automatic","productIds":[],"limit":4},"translation":{"heading":"推荐","body":"推荐说明","ctaLabel":"查看推荐","ctaHref":"/collections/featured","content":{}}},
    {"sectionType":"sale_products","isEnabled":false,"sortOrder":50,"settings":{"selectionMode":"automatic","productIds":[],"limit":4},"translation":{"heading":"特价","body":"特价说明","ctaLabel":"查看特价","ctaHref":"/collections/sale","content":{}}},
    {"sectionType":"brand_story","isEnabled":true,"sortOrder":60,"settings":{"imageId":null},"translation":{"heading":"品牌故事","body":"真实故事待店主维护。","ctaLabel":"","ctaHref":"","content":{}}},
    {"sectionType":"fulfillment","isEnabled":true,"sortOrder":70,"settings":{},"translation":{"heading":"履约说明","body":"履约简介","ctaLabel":"","ctaHref":"","content":{"pickupTitle":"自取","pickupBody":"自取说明","deliveryTitle":"配送","deliveryBody":"配送说明"}}},
    {"sectionType":"faq","isEnabled":true,"sortOrder":80,"settings":{},"translation":{"heading":"FAQ","body":"问题说明","ctaLabel":"","ctaHref":"","content":{"items":[{"question":"是否已付款？","answer":"尚未付款。"}]}}},
    {"sectionType":"contact_cta","isEnabled":true,"sortOrder":90,"settings":{},"translation":{"heading":"联系我们","body":"联系说明","ctaLabel":"逛商品","ctaHref":"/products","content":{}}}
  ]'::jsonb,
  '{"contactEmail":"shop@example.invalid","contactPhone":"","pickupEnabled":true,"localDeliveryEnabled":true,"serviceAreaDescription":"测试服务区域"}'::jsonb
);

select plan(12);

select has_column('public', 'homepage_section_translations', 'content_json', 'homepage translations store controlled structured locale content');

select ok(
  not (select prosecdef from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace where pg_namespace.nspname = 'public' and proname = 'admin_save_homepage'),
  'homepage save RPC uses security invoker'
);

select ok(
  not has_function_privilege('anon', 'public.admin_save_homepage(jsonb,jsonb)', 'execute'),
  'anon cannot execute homepage save RPC'
);

select set_config('request.jwt.claims', '{"sub":"d9000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;

select is(
  pg_temp.sqlstate_of($command$select public.admin_save_homepage((select sections from phase9_payload), (select site_settings from phase9_payload))$command$),
  '42501',
  'ordinary authenticated user cannot save homepage configuration'
);

reset role;
select set_config('request.jwt.claims', '{"sub":"d9000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

select lives_ok(
  $command$select public.admin_save_homepage((select sections from phase9_payload), (select site_settings from phase9_payload))$command$,
  'admin can save all ten sections atomically'
);

select is((select count(*)::integer from public.homepage_sections), 10, 'exactly ten controlled section types exist');
select is((select is_enabled from public.homepage_sections where section_type = 'sale_products'), false, 'admin can hide a section');
select is((select content_json->'items'->0->>'answer' from public.homepage_section_translations join public.homepage_sections on homepage_sections.id = section_id where section_type = 'faq' and locale = 'zh'), '尚未付款。', 'FAQ structured translation is saved');
select is((select contact_email from public.site_settings where id), 'shop@example.invalid', 'contact settings are saved in the same transaction');
select is((select count(*)::integer from public.admin_audit_logs where action = 'homepage.settings.update'), 1, 'homepage save writes one audit record');

select is(
  pg_temp.sqlstate_of($command$
    select public.admin_save_homepage(
      jsonb_set((select sections from phase9_payload), '{1,translation,heading}', '"<script>bad</script>"'),
      (select site_settings from phase9_payload)
    )
  $command$),
  '22023',
  'database schema rejects HTML or script-like text'
);

reset role;
set local role anon;

select is((select count(*)::integer from public.homepage_sections), 9, 'anon only sees enabled homepage sections');

select * from finish();
rollback;
