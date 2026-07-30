create table public.showcase_style_groups (
  id uuid primary key default gen_random_uuid(),
  featured_item_id uuid not null references public.showcase_items(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.showcase_style_group_translations (
  group_id uuid not null references public.showcase_style_groups(id) on delete cascade,
  locale text not null check (locale in ('en', 'zh')),
  name text not null check (char_length(name) between 1 and 120),
  primary key (group_id, locale)
);

create table public.showcase_style_group_items (
  group_id uuid not null references public.showcase_style_groups(id) on delete cascade,
  item_id uuid not null references public.showcase_items(id) on delete cascade,
  sort_order integer not null check (sort_order between 0 and 5),
  primary key (group_id, item_id),
  unique (item_id),
  unique (group_id, sort_order)
);

create table public.showcase_style_group_item_translations (
  group_id uuid not null,
  item_id uuid not null,
  locale text not null check (locale in ('en', 'zh')),
  label text not null check (char_length(label) between 1 and 60),
  primary key (group_id, item_id, locale),
  foreign key (group_id, item_id)
    references public.showcase_style_group_items(group_id, item_id)
    on delete cascade
);

alter table public.showcase_style_groups
  add constraint showcase_style_groups_featured_member_fkey
  foreign key (id, featured_item_id)
  references public.showcase_style_group_items(group_id, item_id)
  deferrable initially deferred;

create index showcase_style_groups_featured_idx on public.showcase_style_groups (featured_item_id);
create index showcase_style_groups_created_by_idx on public.showcase_style_groups (created_by);
create index showcase_style_group_items_group_idx on public.showcase_style_group_items (group_id, sort_order);

create trigger showcase_style_groups_set_updated_at before update on public.showcase_style_groups
for each row execute function private.set_updated_at();

create or replace function private.enforce_showcase_style_group_members()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_group_id uuid;
  member_count integer;
  minimum_order integer;
  maximum_order integer;
begin
  if tg_table_name = 'showcase_style_groups' then
    target_group_id := coalesce(new.id, old.id);
  else
    target_group_id := coalesce(new.group_id, old.group_id);
  end if;
  if not exists (select 1 from public.showcase_style_groups where id = target_group_id) then
    return null;
  end if;
  select count(*), min(sort_order), max(sort_order)
  into member_count, minimum_order, maximum_order
  from public.showcase_style_group_items
  where group_id = target_group_id;
  if member_count not between 2 and 6 or minimum_order <> 0 or maximum_order <> member_count - 1 then
    raise check_violation using message = 'Showcase style groups require 2-6 densely ordered members';
  end if;
  return null;
end;
$$;

revoke all on function private.enforce_showcase_style_group_members() from public, anon, authenticated;

create constraint trigger showcase_style_groups_validate_members
after insert or update on public.showcase_style_groups
deferrable initially deferred
for each row execute function private.enforce_showcase_style_group_members();

create constraint trigger showcase_style_group_items_validate_members
after insert or update or delete on public.showcase_style_group_items
deferrable initially deferred
for each row execute function private.enforce_showcase_style_group_members();

alter table public.showcase_style_groups enable row level security;
alter table public.showcase_style_group_translations enable row level security;
alter table public.showcase_style_group_items enable row level security;
alter table public.showcase_style_group_item_translations enable row level security;

create or replace function private.showcase_style_group_is_public(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 2
  from public.showcase_style_group_items member
  join public.showcase_items item on item.id = member.item_id
  join public.showcase_batches batch on batch.id = item.batch_id
  where member.group_id = p_group_id
    and item.availability <> 'archived'
    and batch.status = 'published'
    and batch.published_at <= now()
$$;

revoke all on function private.showcase_style_group_is_public(uuid) from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.showcase_style_group_is_public(uuid) to anon, authenticated;

create policy showcase_style_groups_public_select on public.showcase_style_groups for select to anon
using ((select private.showcase_style_group_is_public(showcase_style_groups.id)));
create policy showcase_style_groups_authenticated_select on public.showcase_style_groups for select to authenticated
using ((select private.is_admin()) or (select private.showcase_style_group_is_public(showcase_style_groups.id)));
create policy showcase_style_groups_admin_insert on public.showcase_style_groups for insert to authenticated
with check ((select private.is_admin()) and created_by = (select auth.uid()));
create policy showcase_style_groups_admin_update on public.showcase_style_groups for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_style_groups_admin_delete on public.showcase_style_groups for delete to authenticated
using ((select private.is_admin()));

create policy showcase_style_group_translations_public_select on public.showcase_style_group_translations for select to anon
using ((select private.showcase_style_group_is_public(showcase_style_group_translations.group_id)));
create policy showcase_style_group_translations_authenticated_select on public.showcase_style_group_translations for select to authenticated
using ((select private.is_admin()) or (select private.showcase_style_group_is_public(showcase_style_group_translations.group_id)));
create policy showcase_style_group_translations_admin_insert on public.showcase_style_group_translations for insert to authenticated
with check ((select private.is_admin()));
create policy showcase_style_group_translations_admin_update on public.showcase_style_group_translations for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_style_group_translations_admin_delete on public.showcase_style_group_translations for delete to authenticated
using ((select private.is_admin()));

create policy showcase_style_group_items_public_select on public.showcase_style_group_items for select to anon
using (
  (select private.showcase_style_group_is_public(showcase_style_group_items.group_id))
  and exists (select 1 from public.showcase_items item where item.id = showcase_style_group_items.item_id)
);
create policy showcase_style_group_items_authenticated_select on public.showcase_style_group_items for select to authenticated
using (
  (select private.is_admin())
  or (
    (select private.showcase_style_group_is_public(showcase_style_group_items.group_id))
    and exists (select 1 from public.showcase_items item where item.id = showcase_style_group_items.item_id)
  )
);
create policy showcase_style_group_items_admin_insert on public.showcase_style_group_items for insert to authenticated
with check ((select private.is_admin()));
create policy showcase_style_group_items_admin_update on public.showcase_style_group_items for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_style_group_items_admin_delete on public.showcase_style_group_items for delete to authenticated
using ((select private.is_admin()));

create policy showcase_style_group_item_translations_public_select on public.showcase_style_group_item_translations for select to anon
using (
  (select private.showcase_style_group_is_public(showcase_style_group_item_translations.group_id))
  and exists (select 1 from public.showcase_items item where item.id = showcase_style_group_item_translations.item_id)
);
create policy showcase_style_group_item_translations_authenticated_select on public.showcase_style_group_item_translations for select to authenticated
using (
  (select private.is_admin())
  or (
    (select private.showcase_style_group_is_public(showcase_style_group_item_translations.group_id))
    and exists (select 1 from public.showcase_items item where item.id = showcase_style_group_item_translations.item_id)
  )
);
create policy showcase_style_group_item_translations_admin_insert on public.showcase_style_group_item_translations for insert to authenticated
with check ((select private.is_admin()));
create policy showcase_style_group_item_translations_admin_update on public.showcase_style_group_item_translations for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_style_group_item_translations_admin_delete on public.showcase_style_group_item_translations for delete to authenticated
using ((select private.is_admin()));

grant select on public.showcase_style_groups, public.showcase_style_group_translations,
  public.showcase_style_group_items, public.showcase_style_group_item_translations to anon;
grant select, insert, update, delete on public.showcase_style_groups, public.showcase_style_group_translations,
  public.showcase_style_group_items, public.showcase_style_group_item_translations to authenticated;

create or replace function public.admin_save_showcase_style_group(
  p_group_id uuid,
  p_name_zh text,
  p_name_en text,
  p_featured_item_id uuid,
  p_members jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  style_group_id uuid := coalesce(p_group_id, gen_random_uuid());
  member_count integer;
  member jsonb;
  member_item_id uuid;
  member_label_zh text;
  member_label_en text;
  member_sort_order integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;

  p_name_zh := btrim(coalesce(p_name_zh, ''));
  p_name_en := nullif(btrim(coalesce(p_name_en, '')), '');
  member_count := case when jsonb_typeof(p_members) = 'array' then jsonb_array_length(p_members) else 0 end;
  if char_length(p_name_zh) not between 1 and 120
    or (p_name_en is not null and char_length(p_name_en) > 120)
    or member_count not between 2 and 6
    or p_featured_item_id is null
  then
    raise invalid_parameter_value using message = 'Invalid showcase style group';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_members) value
    where jsonb_typeof(value) <> 'object'
      or value - array['itemId', 'labelZh', 'labelEn', 'sortOrder']::text[] <> '{}'::jsonb
      or not (value ?& array['itemId', 'labelZh', 'labelEn', 'sortOrder'])
  ) then
    raise invalid_parameter_value using message = 'Invalid showcase style group member shape';
  end if;

  if (select count(distinct (value ->> 'itemId')::uuid) from jsonb_array_elements(p_members) value) <> member_count
    or (select count(distinct (value ->> 'sortOrder')::integer) from jsonb_array_elements(p_members) value) <> member_count
    or (select min((value ->> 'sortOrder')::integer) from jsonb_array_elements(p_members) value) <> 0
    or (select max((value ->> 'sortOrder')::integer) from jsonb_array_elements(p_members) value) <> member_count - 1
    or not exists (select 1 from jsonb_array_elements(p_members) value where (value ->> 'itemId')::uuid = p_featured_item_id)
  then
    raise invalid_parameter_value using message = 'Style group members must be unique and densely ordered';
  end if;

  if (
    select count(*)
    from public.showcase_items item
    join public.showcase_batches batch on batch.id = item.batch_id
    where item.id in (select (value ->> 'itemId')::uuid from jsonb_array_elements(p_members) value)
      and item.availability <> 'archived'
      and batch.status = 'published'
  ) <> member_count then
    raise check_violation using message = 'Style group members must be visible showcase items';
  end if;

  if exists (
    select 1
    from public.showcase_style_group_items existing
    where existing.item_id in (select (value ->> 'itemId')::uuid from jsonb_array_elements(p_members) value)
      and (p_group_id is null or existing.group_id <> p_group_id)
  ) then
    raise unique_violation using message = 'A showcase item can belong to only one style group';
  end if;

  if p_group_id is null then
    insert into public.showcase_style_groups (id, featured_item_id, created_by)
    values (style_group_id, p_featured_item_id, actor_id);
  else
    if not exists (select 1 from public.showcase_style_groups where id = p_group_id) then
      raise no_data_found using message = 'Showcase style group not found';
    end if;
    update public.showcase_style_groups
    set featured_item_id = p_featured_item_id
    where id = p_group_id;
  end if;

  insert into public.showcase_style_group_translations (group_id, locale, name)
  values
    (style_group_id, 'zh', p_name_zh),
    (style_group_id, 'en', coalesce(p_name_en, 'New style collection'))
  on conflict (group_id, locale) do update set name = excluded.name;

  delete from public.showcase_style_group_items where group_id = style_group_id;

  for member in select value from jsonb_array_elements(p_members)
  loop
    member_item_id := (member ->> 'itemId')::uuid;
    member_label_zh := btrim(coalesce(member ->> 'labelZh', ''));
    member_label_en := nullif(btrim(coalesce(member ->> 'labelEn', '')), '');
    member_sort_order := (member ->> 'sortOrder')::integer;
    if char_length(member_label_zh) not between 1 and 60
      or (member_label_en is not null and char_length(member_label_en) > 60)
    then
      raise invalid_parameter_value using message = 'Invalid showcase style label';
    end if;

    insert into public.showcase_style_group_items (group_id, item_id, sort_order)
    values (style_group_id, member_item_id, member_sort_order);
    insert into public.showcase_style_group_item_translations (group_id, item_id, locale, label)
    values
      (style_group_id, member_item_id, 'zh', member_label_zh),
      (style_group_id, member_item_id, 'en', coalesce(member_label_en, 'Style ' || (member_sort_order + 1)));
  end loop;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    case when p_group_id is null then 'showcase.style_group.create' else 'showcase.style_group.update' end,
    'showcase_style_group',
    style_group_id::text,
    jsonb_build_object('member_count', member_count, 'featured_item_id', p_featured_item_id)
  );
  return style_group_id;
end;
$$;

create or replace function public.admin_dissolve_showcase_style_group(p_group_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  deleted_count integer;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  delete from public.showcase_style_groups where id = p_group_id;
  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then
    raise no_data_found using message = 'Showcase style group not found';
  end if;
  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id)
  values (actor_id, 'showcase.style_group.dissolve', 'showcase_style_group', p_group_id::text);
end;
$$;

revoke all on function public.admin_save_showcase_style_group(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_dissolve_showcase_style_group(uuid) from public, anon, authenticated;
grant execute on function public.admin_save_showcase_style_group(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.admin_dissolve_showcase_style_group(uuid) to authenticated;
