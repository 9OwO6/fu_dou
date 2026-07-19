begin;

create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.sqlstate_of(command text)
returns text language plpgsql as $$
begin execute command; return null; exception when others then return sqlstate; end;
$$;

insert into auth.users (id, email)
values
  ('c1200000-0000-4000-8000-000000000001', 'showcase-admin@example.invalid'),
  ('c1200000-0000-4000-8000-000000000002', 'showcase-member@example.invalid');
insert into public.profiles (id, display_name, role)
values ('c1200000-0000-4000-8000-000000000001', '快速上新测试管理员', 'admin');

create temporary table showcase_test_payload (items jsonb not null);
grant select on table pg_temp.showcase_test_payload to authenticated;
insert into showcase_test_payload values ('[
  {
    "id":"c1200000-0000-4000-8000-000000000101",
    "titleZh":"小熊玻璃杯","titleEn":"Bear glass cup","descriptionZh":"少量到货","descriptionEn":"Small batch","priceCad":"18.00",
    "tagIds":["a1000000-0000-4000-8000-000000000001"],
    "images":[
      {"id":"c1200000-0000-4000-8000-000000000201","storagePath":"showcase/c1200000-0000-4000-8000-000000000100/c1200000-0000-4000-8000-000000000201.webp","width":1000,"height":1250},
      {"id":"c1200000-0000-4000-8000-000000000202","storagePath":"showcase/c1200000-0000-4000-8000-000000000100/c1200000-0000-4000-8000-000000000202.jpg","width":1200,"height":1500}
    ]
  },
  {
    "id":"c1200000-0000-4000-8000-000000000102",
    "titleZh":"","titleEn":"","descriptionZh":"","descriptionEn":"","priceCad":"",
    "tagIds":["a1000000-0000-4000-8000-000000000006"],
    "images":[
      {"id":"c1200000-0000-4000-8000-000000000203","storagePath":"showcase/c1200000-0000-4000-8000-000000000100/c1200000-0000-4000-8000-000000000203.png","width":800,"height":1000}
    ]
  }
]'::jsonb);

select plan(41);

select is(
  (select count(*)::integer from information_schema.tables where table_schema = 'public' and table_name in (
    'showcase_batches','showcase_items','showcase_item_translations','showcase_item_images',
    'showcase_image_translations','showcase_tags','showcase_tag_translations','showcase_item_tags'
  )), 8, 'quick showcase uses eight isolated public tables');

select is(
  (select count(*)::integer from pg_class join pg_namespace on pg_namespace.oid = pg_class.relnamespace
   where nspname = 'public' and relname like 'showcase_%' and relrowsecurity),
  8, 'every showcase table has RLS enabled');

select results_eq(
  $query$select public, file_size_limit from storage.buckets where id = 'showcase-images'$query$,
  $values$values (false, 10485760::bigint)$values$,
  'showcase images use a private 10 MiB bucket');

select is(
  (select count(*)::integer from pg_proc join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
   where nspname = 'public' and proname in (
     'admin_create_showcase_tag','admin_create_showcase_batch','admin_update_showcase_items','admin_update_showcase_item',
     'admin_add_showcase_images','admin_delete_showcase_image','admin_restore_showcase_image',
     'admin_move_showcase_image','admin_replace_showcase_image','admin_revert_showcase_image_replace'
   ) and not prosecdef),
  10, 'all showcase management functions use security invoker');

select is(
  (select count(*)::integer from information_schema.routine_privileges where routine_schema = 'public' and grantee = 'anon'
   and routine_name in (
     'admin_create_showcase_tag','admin_create_showcase_batch','admin_update_showcase_items','admin_update_showcase_item',
     'admin_add_showcase_images','admin_delete_showcase_image','admin_restore_showcase_image',
     'admin_move_showcase_image','admin_replace_showcase_image','admin_revert_showcase_image_replace'
   )),
  0, 'anon cannot execute showcase management functions');

select set_config('request.jwt.claims', '{"sub":"c1200000-0000-4000-8000-000000000002","role":"authenticated"}', true);
set local role authenticated;
select is(pg_temp.sqlstate_of($command$select public.admin_create_showcase_tag('stationery','文具','Stationery')$command$), '42501', 'ordinary authenticated users cannot create tags');
select is(pg_temp.sqlstate_of($command$select public.admin_create_showcase_batch('c1200000-0000-4000-8000-000000000100',(select items from showcase_test_payload))$command$), '42501', 'ordinary authenticated users cannot publish a showcase batch');
select is(
  pg_temp.sqlstate_of($command$select public.admin_add_showcase_images('c1200000-0000-4000-8000-000000000101','[]'::jsonb)$command$),
  '42501',
  'ordinary authenticated users cannot edit showcase images');

reset role;
select set_config('request.jwt.claims', '{"sub":"c1200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;

create temporary table created_tag (id uuid not null);
grant insert, select on table pg_temp.created_tag to authenticated;
select lives_ok($command$insert into created_tag select public.admin_create_showcase_tag('stationery','文具','Stationery')$command$, 'admin can create a lightweight bilingual tag');
select results_eq($query$select count(*) from public.showcase_tag_translations where tag_id = (select id from created_tag)$query$, array[2::bigint], 'new tag stores both supplied translations');

select lives_ok($command$select public.admin_create_showcase_batch('c1200000-0000-4000-8000-000000000100',(select items from showcase_test_payload))$command$, 'admin publishes a multi-item multi-image batch atomically');
select is((select count(*)::integer from public.showcase_batches where id = 'c1200000-0000-4000-8000-000000000100'), 1, 'one published batch exists');
select is((select count(*)::integer from public.showcase_items where batch_id = 'c1200000-0000-4000-8000-000000000100'), 2, 'both lightweight items exist');
select is((select count(*)::integer from public.showcase_item_images), 3, 'all three image records exist');
select is((select count(*)::integer from public.showcase_image_translations), 6, 'every image receives zh and en accessible alt text');
select is((select count(*)::integer from public.showcase_item_tags where item_id in ('c1200000-0000-4000-8000-000000000101','c1200000-0000-4000-8000-000000000102')), 2, 'batch tags are linked to both items');
select ok((select price_cad is null from public.showcase_items where id = 'c1200000-0000-4000-8000-000000000102'), 'price is genuinely optional');
select ok((select short_code ~ '^HB-[0-9A-F]{12}$' from public.showcase_items where id = 'c1200000-0000-4000-8000-000000000101'), 'item receives a stable public short code');
select ok((select alt_text ~ 'Happy Beans new arrival HB-[0-9A-F]{12}' from public.showcase_image_translations where image_id = 'c1200000-0000-4000-8000-000000000203' and locale = 'en'), 'unnamed images receive a safe language-specific generated alt');

select lives_ok(
  $command$select public.admin_add_showcase_images(
    'c1200000-0000-4000-8000-000000000101',
    '[{"id":"c1200000-0000-4000-8000-000000000204","storagePath":"showcase/c1200000-0000-4000-8000-000000000101/c1200000-0000-4000-8000-000000000204.webp","width":900,"height":1200}]'::jsonb
  )$command$,
  'admin can append an image to an existing showcase item');
select is((select count(*)::integer from public.showcase_item_images where item_id = 'c1200000-0000-4000-8000-000000000101'), 3, 'appended image is registered');
select lives_ok(
  $command$select public.admin_move_showcase_image('c1200000-0000-4000-8000-000000000101','c1200000-0000-4000-8000-000000000204',0)$command$,
  'admin can promote an existing image to cover');
select is((select sort_order from public.showcase_item_images where id = 'c1200000-0000-4000-8000-000000000204'), 0, 'cover image receives sort order zero');
select lives_ok(
  $command$select public.admin_replace_showcase_image(
    'c1200000-0000-4000-8000-000000000101',
    'c1200000-0000-4000-8000-000000000202',
    '{"id":"c1200000-0000-4000-8000-000000000205","storagePath":"showcase/c1200000-0000-4000-8000-000000000101/c1200000-0000-4000-8000-000000000205.jpg","width":1000,"height":1300}'::jsonb
  )$command$,
  'admin can atomically replace an image');
select results_eq(
  $query$select id, sort_order from public.showcase_item_images where id in ('c1200000-0000-4000-8000-000000000202','c1200000-0000-4000-8000-000000000205') order by id$query$,
  $values$values ('c1200000-0000-4000-8000-000000000205'::uuid, 2)$values$,
  'replacement keeps the old display position and removes old metadata');
select lives_ok(
  $command$select public.admin_delete_showcase_image('c1200000-0000-4000-8000-000000000101','c1200000-0000-4000-8000-000000000205')$command$,
  'admin can remove one image while another remains');
select results_eq(
  $query$select sort_order from public.showcase_item_images where item_id = 'c1200000-0000-4000-8000-000000000101' order by sort_order$query$,
  $values$values (0), (1)$values$,
  'remaining image order is dense after removal');
select is(
  pg_temp.sqlstate_of($command$select public.admin_delete_showcase_image('c1200000-0000-4000-8000-000000000102','c1200000-0000-4000-8000-000000000203')$command$),
  '23514',
  'admin cannot remove the last showcase image');

create temporary table deleted_showcase_image (payload jsonb not null);
grant insert, select on table pg_temp.deleted_showcase_image to authenticated;
select lives_ok(
  $command$insert into deleted_showcase_image
    select public.admin_delete_showcase_image('c1200000-0000-4000-8000-000000000101','c1200000-0000-4000-8000-000000000201')$command$,
  'delete returns enough metadata for compensation');
select lives_ok(
  $command$select public.admin_restore_showcase_image((select payload from deleted_showcase_image))$command$,
  'failed Storage deletion can restore image metadata');
select is((select count(*)::integer from public.showcase_item_images where item_id = 'c1200000-0000-4000-8000-000000000101'), 2, 'compensation restores the removed image');

create temporary table replaced_showcase_image (payload jsonb not null);
grant insert, select on table pg_temp.replaced_showcase_image to authenticated;
select lives_ok(
  $command$insert into replaced_showcase_image
    select public.admin_replace_showcase_image(
      'c1200000-0000-4000-8000-000000000101',
      'c1200000-0000-4000-8000-000000000201',
      '{"id":"c1200000-0000-4000-8000-000000000206","storagePath":"showcase/c1200000-0000-4000-8000-000000000101/c1200000-0000-4000-8000-000000000206.png","width":800,"height":1000}'::jsonb
    )$command$,
  'replacement returns enough metadata for compensation');
select lives_ok(
  $command$select public.admin_revert_showcase_image_replace((select payload from replaced_showcase_image),'c1200000-0000-4000-8000-000000000206')$command$,
  'failed old Storage deletion can revert a replacement');
select results_eq(
  $query$select id from public.showcase_item_images where id in ('c1200000-0000-4000-8000-000000000201','c1200000-0000-4000-8000-000000000206') order by id$query$,
  $values$values ('c1200000-0000-4000-8000-000000000201'::uuid)$values$,
  'replacement compensation restores only the original image');

select lives_ok(
  $command$select public.admin_update_showcase_item('c1200000-0000-4000-8000-000000000102','苹果盘','','','','12.50',array[(select id from created_tag)])$command$,
  'admin can later edit optional content, price, and tags');
select results_eq(
  $query$select t.title, i.price_cad from public.showcase_items i join public.showcase_item_translations t on t.item_id = i.id and t.locale = 'zh' where i.id = 'c1200000-0000-4000-8000-000000000102'$query$,
  $values$values ('苹果盘'::text, 12.50::numeric)$values$,
  'optional item edits persist together');

select lives_ok($command$select public.admin_update_showcase_items(array['c1200000-0000-4000-8000-000000000101'::uuid],'sold')$command$, 'admin marks an item sold in one action');
select lives_ok($command$select public.admin_update_showcase_items(array['c1200000-0000-4000-8000-000000000102'::uuid],'archived')$command$, 'admin archives an item without deleting it');

reset role;
set local role anon;
select is((select count(*)::integer from public.showcase_items), 1, 'anon sees published sold items but not archived items');
select is(pg_temp.sqlstate_of($command$insert into public.showcase_tags (slug) values ('blocked')$command$), '42501', 'anon cannot write showcase data');

reset role;
select is((select count(*)::integer from public.admin_audit_logs where action like 'showcase.%'), 13, 'successful showcase operations append thirteen audit events');

select * from finish();
rollback;
