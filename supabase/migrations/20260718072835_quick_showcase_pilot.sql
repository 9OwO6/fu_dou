create type public.showcase_batch_status as enum ('published', 'archived');
create type public.showcase_item_availability as enum ('inquiry', 'sold', 'archived');

create table public.showcase_batches (
  id uuid primary key,
  status public.showcase_batch_status not null default 'published',
  published_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.showcase_items (
  id uuid primary key,
  batch_id uuid not null references public.showcase_batches(id) on delete cascade,
  short_code text not null unique check (short_code ~ '^HB-[0-9A-F]{12}$'),
  availability public.showcase_item_availability not null default 'inquiry',
  price_cad numeric(10, 2) check (price_cad is null or price_cad > 0),
  sort_order integer not null check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_id, sort_order)
);

create table public.showcase_item_translations (
  item_id uuid not null references public.showcase_items(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh')),
  title text check (title is null or char_length(title) between 1 and 120),
  description text check (description is null or char_length(description) between 1 and 500),
  primary key (item_id, locale)
);

create table public.showcase_item_images (
  id uuid primary key,
  item_id uuid not null references public.showcase_items(id) on delete cascade,
  storage_path text not null unique,
  sort_order integer not null check (sort_order >= 0),
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  created_at timestamptz not null default now(),
  unique (item_id, sort_order)
);

create table public.showcase_image_translations (
  image_id uuid not null references public.showcase_item_images(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh')),
  alt_text text not null check (char_length(alt_text) between 1 and 300),
  primary key (image_id, locale)
);

create table public.showcase_tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_visible boolean not null default true,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.showcase_tag_translations (
  tag_id uuid not null references public.showcase_tags(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh')),
  name text not null check (char_length(name) between 1 and 60),
  primary key (tag_id, locale)
);

create table public.showcase_item_tags (
  item_id uuid not null references public.showcase_items(id) on delete cascade,
  tag_id uuid not null references public.showcase_tags(id) on delete cascade,
  primary key (item_id, tag_id)
);

create index showcase_batches_public_idx on public.showcase_batches (published_at desc) where status = 'published';
create index showcase_items_batch_idx on public.showcase_items (batch_id, sort_order);
create index showcase_images_item_idx on public.showcase_item_images (item_id, sort_order);
create index showcase_item_tags_tag_idx on public.showcase_item_tags (tag_id, item_id);
create index showcase_tags_visible_idx on public.showcase_tags (sort_order, slug) where is_visible;

create trigger showcase_batches_set_updated_at before update on public.showcase_batches
for each row execute function private.set_updated_at();
create trigger showcase_items_set_updated_at before update on public.showcase_items
for each row execute function private.set_updated_at();
create trigger showcase_tags_set_updated_at before update on public.showcase_tags
for each row execute function private.set_updated_at();

alter table public.showcase_batches enable row level security;
alter table public.showcase_items enable row level security;
alter table public.showcase_item_translations enable row level security;
alter table public.showcase_item_images enable row level security;
alter table public.showcase_image_translations enable row level security;
alter table public.showcase_tags enable row level security;
alter table public.showcase_tag_translations enable row level security;
alter table public.showcase_item_tags enable row level security;

create policy showcase_batches_public_select on public.showcase_batches for select to anon
using (status = 'published' and published_at <= now());
create policy showcase_batches_authenticated_select on public.showcase_batches for select to authenticated
using ((select private.is_admin()) or (status = 'published' and published_at <= now()));
create policy showcase_batches_admin_insert on public.showcase_batches for insert to authenticated
with check ((select private.is_admin()) and created_by = (select auth.uid()));
create policy showcase_batches_admin_update on public.showcase_batches for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_batches_admin_delete on public.showcase_batches for delete to authenticated
using ((select private.is_admin()));

create policy showcase_items_public_select on public.showcase_items for select to anon
using (
  availability <> 'archived'
  and exists (select 1 from public.showcase_batches b where b.id = batch_id and b.status = 'published' and b.published_at <= now())
);
create policy showcase_items_authenticated_select on public.showcase_items for select to authenticated
using (
  (select private.is_admin())
  or (availability <> 'archived' and exists (select 1 from public.showcase_batches b where b.id = batch_id and b.status = 'published' and b.published_at <= now()))
);
create policy showcase_items_admin_insert on public.showcase_items for insert to authenticated with check ((select private.is_admin()));
create policy showcase_items_admin_update on public.showcase_items for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_items_admin_delete on public.showcase_items for delete to authenticated using ((select private.is_admin()));

create policy showcase_item_translations_public_select on public.showcase_item_translations for select to anon
using (exists (select 1 from public.showcase_items i where i.id = item_id));
create policy showcase_item_translations_authenticated_select on public.showcase_item_translations for select to authenticated
using ((select private.is_admin()) or exists (select 1 from public.showcase_items i where i.id = item_id));
create policy showcase_item_translations_admin_insert on public.showcase_item_translations for insert to authenticated with check ((select private.is_admin()));
create policy showcase_item_translations_admin_update on public.showcase_item_translations for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_item_translations_admin_delete on public.showcase_item_translations for delete to authenticated using ((select private.is_admin()));

create policy showcase_item_images_public_select on public.showcase_item_images for select to anon
using (exists (select 1 from public.showcase_items i where i.id = item_id));
create policy showcase_item_images_authenticated_select on public.showcase_item_images for select to authenticated
using ((select private.is_admin()) or exists (select 1 from public.showcase_items i where i.id = item_id));
create policy showcase_item_images_admin_insert on public.showcase_item_images for insert to authenticated with check ((select private.is_admin()));
create policy showcase_item_images_admin_update on public.showcase_item_images for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_item_images_admin_delete on public.showcase_item_images for delete to authenticated using ((select private.is_admin()));

create policy showcase_image_translations_public_select on public.showcase_image_translations for select to anon
using (exists (select 1 from public.showcase_item_images image where image.id = image_id));
create policy showcase_image_translations_authenticated_select on public.showcase_image_translations for select to authenticated
using ((select private.is_admin()) or exists (select 1 from public.showcase_item_images image where image.id = image_id));
create policy showcase_image_translations_admin_insert on public.showcase_image_translations for insert to authenticated with check ((select private.is_admin()));
create policy showcase_image_translations_admin_update on public.showcase_image_translations for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_image_translations_admin_delete on public.showcase_image_translations for delete to authenticated using ((select private.is_admin()));

create policy showcase_tags_public_select on public.showcase_tags for select to anon using (is_visible);
create policy showcase_tags_authenticated_select on public.showcase_tags for select to authenticated using ((select private.is_admin()) or is_visible);
create policy showcase_tags_admin_insert on public.showcase_tags for insert to authenticated with check ((select private.is_admin()));
create policy showcase_tags_admin_update on public.showcase_tags for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_tags_admin_delete on public.showcase_tags for delete to authenticated using ((select private.is_admin()));

create policy showcase_tag_translations_public_select on public.showcase_tag_translations for select to anon
using (exists (select 1 from public.showcase_tags tag where tag.id = tag_id and tag.is_visible));
create policy showcase_tag_translations_authenticated_select on public.showcase_tag_translations for select to authenticated
using ((select private.is_admin()) or exists (select 1 from public.showcase_tags tag where tag.id = tag_id and tag.is_visible));
create policy showcase_tag_translations_admin_insert on public.showcase_tag_translations for insert to authenticated with check ((select private.is_admin()));
create policy showcase_tag_translations_admin_update on public.showcase_tag_translations for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_tag_translations_admin_delete on public.showcase_tag_translations for delete to authenticated using ((select private.is_admin()));

create policy showcase_item_tags_public_select on public.showcase_item_tags for select to anon
using (
  exists (select 1 from public.showcase_items i where i.id = item_id)
  and exists (select 1 from public.showcase_tags tag where tag.id = tag_id and tag.is_visible)
);
create policy showcase_item_tags_authenticated_select on public.showcase_item_tags for select to authenticated
using (
  (select private.is_admin())
  or (
    exists (select 1 from public.showcase_items i where i.id = item_id)
    and exists (select 1 from public.showcase_tags tag where tag.id = tag_id and tag.is_visible)
  )
);
create policy showcase_item_tags_admin_insert on public.showcase_item_tags for insert to authenticated with check ((select private.is_admin()));
create policy showcase_item_tags_admin_update on public.showcase_item_tags for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_item_tags_admin_delete on public.showcase_item_tags for delete to authenticated using ((select private.is_admin()));

grant select on public.showcase_batches, public.showcase_items, public.showcase_item_translations,
  public.showcase_item_images, public.showcase_image_translations, public.showcase_tags,
  public.showcase_tag_translations, public.showcase_item_tags to anon;
grant select, insert, update, delete on public.showcase_batches, public.showcase_items,
  public.showcase_item_translations, public.showcase_item_images, public.showcase_image_translations,
  public.showcase_tags, public.showcase_tag_translations, public.showcase_item_tags to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('showcase-images', 'showcase-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy showcase_images_storage_public_select on storage.objects for select to anon
using (
  bucket_id = 'showcase-images'
  and exists (
    select 1
    from public.showcase_item_images image
    join public.showcase_items item on item.id = image.item_id
    join public.showcase_batches batch on batch.id = item.batch_id
    where image.storage_path = storage.objects.name
      and item.availability <> 'archived'
      and batch.status = 'published'
      and batch.published_at <= now()
  )
);
create policy showcase_images_storage_authenticated_select on storage.objects for select to authenticated
using (
  bucket_id = 'showcase-images'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.showcase_item_images image
      join public.showcase_items item on item.id = image.item_id
      join public.showcase_batches batch on batch.id = item.batch_id
      where image.storage_path = storage.objects.name
        and item.availability <> 'archived'
        and batch.status = 'published'
        and batch.published_at <= now()
    )
  )
);
create policy showcase_images_storage_admin_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'showcase-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = 'showcase'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);
create policy showcase_images_storage_admin_update on storage.objects for update to authenticated
using (bucket_id = 'showcase-images' and (select private.is_admin()))
with check (
  bucket_id = 'showcase-images'
  and (select private.is_admin())
  and (storage.foldername(name))[1] = 'showcase'
  and (storage.foldername(name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);
create policy showcase_images_storage_admin_delete on storage.objects for delete to authenticated
using (bucket_id = 'showcase-images' and (select private.is_admin()));

create or replace function public.admin_create_showcase_tag(
  p_slug text,
  p_name_zh text,
  p_name_en text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  tag_id uuid := gen_random_uuid();
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  p_slug := lower(btrim(p_slug));
  p_name_zh := btrim(p_name_zh);
  p_name_en := nullif(btrim(p_name_en), '');
  if p_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or char_length(p_slug) > 60
    or char_length(p_name_zh) not between 1 and 60
    or (p_name_en is not null and char_length(p_name_en) > 60)
  then
    raise invalid_parameter_value using message = 'Invalid showcase tag';
  end if;

  insert into public.showcase_tags (id, slug, sort_order)
  values (tag_id, p_slug, coalesce((select max(sort_order) + 10 from public.showcase_tags), 10));
  insert into public.showcase_tag_translations (tag_id, locale, name)
  values (tag_id, 'zh', p_name_zh);
  if p_name_en is not null then
    insert into public.showcase_tag_translations (tag_id, locale, name)
    values (tag_id, 'en', p_name_en);
  end if;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (actor_id, 'showcase.tag.create', 'showcase_tag', tag_id::text, jsonb_build_object('slug', p_slug));
  return tag_id;
end;
$$;

create or replace function public.admin_create_showcase_batch(
  p_batch_id uuid,
  p_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  item jsonb;
  image jsonb;
  tag_value jsonb;
  item_id uuid;
  image_id uuid;
  item_code text;
  title_zh text;
  title_en text;
  description_zh text;
  description_en text;
  price_value numeric(10, 2);
  image_index integer;
  item_index integer := 0;
  total_images integer := 0;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if p_batch_id is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise check_violation using message = 'A showcase batch must contain between one and thirty items';
  end if;

  insert into public.showcase_batches (id, created_by) values (p_batch_id, actor_id);

  for item in select value from jsonb_array_elements(p_items)
  loop
    item_id := (item ->> 'id')::uuid;
    item_code := 'HB-' || upper(substr(md5(item_id::text), 1, 12));
    title_zh := nullif(btrim(item ->> 'titleZh'), '');
    title_en := nullif(btrim(item ->> 'titleEn'), '');
    description_zh := nullif(btrim(item ->> 'descriptionZh'), '');
    description_en := nullif(btrim(item ->> 'descriptionEn'), '');
    price_value := nullif(item ->> 'priceCad', '')::numeric;

    if (title_zh is not null and char_length(title_zh) > 120)
      or (title_en is not null and char_length(title_en) > 120)
      or (description_zh is not null and char_length(description_zh) > 500)
      or (description_en is not null and char_length(description_en) > 500)
      or (price_value is not null and price_value <= 0)
      or jsonb_typeof(item -> 'images') <> 'array'
      or jsonb_array_length(item -> 'images') not between 1 and 10
      or jsonb_typeof(coalesce(item -> 'tagIds', '[]'::jsonb)) <> 'array'
      or jsonb_array_length(coalesce(item -> 'tagIds', '[]'::jsonb)) > 10
    then
      raise check_violation using message = 'Invalid showcase item';
    end if;

    total_images := total_images + jsonb_array_length(item -> 'images');
    if total_images > 30 then
      raise check_violation using message = 'A showcase batch can contain at most thirty images';
    end if;

    insert into public.showcase_items (id, batch_id, short_code, price_cad, sort_order)
    values (item_id, p_batch_id, item_code, price_value, item_index);
    insert into public.showcase_item_translations (item_id, locale, title, description)
    values (item_id, 'zh', title_zh, description_zh), (item_id, 'en', title_en, description_en);

    for tag_value in select value from jsonb_array_elements(coalesce(item -> 'tagIds', '[]'::jsonb))
    loop
      insert into public.showcase_item_tags (item_id, tag_id)
      values (item_id, (tag_value #>> '{}')::uuid);
    end loop;

    image_index := 0;
    for image in select value from jsonb_array_elements(item -> 'images')
    loop
      image_id := (image ->> 'id')::uuid;
      if image ->> 'storagePath' !~ (
        '^showcase/' || p_batch_id::text ||
        '/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
      ) then
        raise check_violation using message = 'Invalid showcase image path';
      end if;
      insert into public.showcase_item_images (id, item_id, storage_path, sort_order, width, height)
      values (
        image_id,
        item_id,
        image ->> 'storagePath',
        image_index,
        nullif(image ->> 'width', '')::integer,
        nullif(image ->> 'height', '')::integer
      );
      insert into public.showcase_image_translations (image_id, locale, alt_text)
      values
        (image_id, 'zh', coalesce(title_zh, 'Happy Beans 新品 ' || item_code) || ' 图片 ' || (image_index + 1)),
        (image_id, 'en', coalesce(title_en, 'Happy Beans new arrival ' || item_code) || ', image ' || (image_index + 1));
      image_index := image_index + 1;
    end loop;
    item_index := item_index + 1;
  end loop;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.batch.publish',
    'showcase_batch',
    p_batch_id::text,
    jsonb_build_object('item_count', jsonb_array_length(p_items), 'image_count', total_images)
  );
  return p_batch_id;
end;
$$;

create or replace function public.admin_update_showcase_items(
  p_item_ids uuid[],
  p_availability public.showcase_item_availability
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  changed integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if coalesce(cardinality(p_item_ids), 0) not between 1 and 100 or p_availability is null then
    raise invalid_parameter_value using message = 'Invalid showcase item status update';
  end if;
  update public.showcase_items set availability = p_availability where id = any(p_item_ids);
  get diagnostics changed = row_count;
  if changed <> cardinality(p_item_ids) then
    raise no_data_found using message = 'Showcase item not found';
  end if;
  insert into public.admin_audit_logs (actor_user_id, action, metadata)
  values (actor_id, 'showcase.items.status.update', jsonb_build_object('item_count', changed, 'availability', p_availability));
  return changed;
end;
$$;

create or replace function public.admin_update_showcase_item(
  p_item_id uuid,
  p_title_zh text,
  p_title_en text,
  p_description_zh text,
  p_description_en text,
  p_price_cad numeric,
  p_tag_ids uuid[]
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
  p_title_zh := nullif(btrim(p_title_zh), '');
  p_title_en := nullif(btrim(p_title_en), '');
  p_description_zh := nullif(btrim(p_description_zh), '');
  p_description_en := nullif(btrim(p_description_en), '');
  if not exists (select 1 from public.showcase_items where id = p_item_id)
    or (p_title_zh is not null and char_length(p_title_zh) > 120)
    or (p_title_en is not null and char_length(p_title_en) > 120)
    or (p_description_zh is not null and char_length(p_description_zh) > 500)
    or (p_description_en is not null and char_length(p_description_en) > 500)
    or (p_price_cad is not null and p_price_cad <= 0)
    or coalesce(cardinality(p_tag_ids), 0) > 10
    or coalesce((select count(distinct value) from unnest(p_tag_ids) value), 0) <> coalesce(cardinality(p_tag_ids), 0)
    or exists (select 1 from unnest(p_tag_ids) value where not exists (select 1 from public.showcase_tags where id = value))
  then
    raise invalid_parameter_value using message = 'Invalid showcase item update';
  end if;
  update public.showcase_items set price_cad = p_price_cad where id = p_item_id;
  update public.showcase_item_translations set title = p_title_zh, description = p_description_zh where item_id = p_item_id and locale = 'zh';
  update public.showcase_item_translations set title = p_title_en, description = p_description_en where item_id = p_item_id and locale = 'en';
  delete from public.showcase_item_tags where item_id = p_item_id;
  insert into public.showcase_item_tags (item_id, tag_id) select p_item_id, value from unnest(p_tag_ids) value;
  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id)
  values (actor_id, 'showcase.item.update', 'showcase_item', p_item_id::text);
end;
$$;

revoke all on function public.admin_create_showcase_tag(text, text, text) from public, anon;
revoke all on function public.admin_create_showcase_batch(uuid, jsonb) from public, anon;
revoke all on function public.admin_update_showcase_items(uuid[], public.showcase_item_availability) from public, anon;
revoke all on function public.admin_update_showcase_item(uuid, text, text, text, text, numeric, uuid[]) from public, anon;
grant execute on function public.admin_create_showcase_tag(text, text, text) to authenticated;
grant execute on function public.admin_create_showcase_batch(uuid, jsonb) to authenticated;
grant execute on function public.admin_update_showcase_items(uuid[], public.showcase_item_availability) to authenticated;
grant execute on function public.admin_update_showcase_item(uuid, text, text, text, text, numeric, uuid[]) to authenticated;

insert into public.showcase_tags (id, slug, sort_order)
values
  ('a1000000-0000-4000-8000-000000000001', 'cups', 10),
  ('a1000000-0000-4000-8000-000000000002', 'tableware', 20),
  ('a1000000-0000-4000-8000-000000000003', 'decor', 30),
  ('a1000000-0000-4000-8000-000000000004', 'plush', 40),
  ('a1000000-0000-4000-8000-000000000005', 'rugs', 50),
  ('a1000000-0000-4000-8000-000000000006', 'gifts', 60)
on conflict (id) do nothing;

insert into public.showcase_tag_translations (tag_id, locale, name)
values
  ('a1000000-0000-4000-8000-000000000001', 'zh', '水杯'), ('a1000000-0000-4000-8000-000000000001', 'en', 'Cups'),
  ('a1000000-0000-4000-8000-000000000002', 'zh', '餐具'), ('a1000000-0000-4000-8000-000000000002', 'en', 'Tableware'),
  ('a1000000-0000-4000-8000-000000000003', 'zh', '摆件'), ('a1000000-0000-4000-8000-000000000003', 'en', 'Decor'),
  ('a1000000-0000-4000-8000-000000000004', 'zh', '玩偶'), ('a1000000-0000-4000-8000-000000000004', 'en', 'Plush'),
  ('a1000000-0000-4000-8000-000000000005', 'zh', '地毯'), ('a1000000-0000-4000-8000-000000000005', 'en', 'Rugs'),
  ('a1000000-0000-4000-8000-000000000006', 'zh', '礼物'), ('a1000000-0000-4000-8000-000000000006', 'en', 'Gifts')
on conflict (tag_id, locale) do nothing;
