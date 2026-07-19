create table public.showcase_display_sets (
  id uuid primary key default gen_random_uuid(),
  status public.showcase_batch_status not null default 'published',
  presentation_preset public.showcase_presentation_preset not null default 'sunny_shelf'
    check (presentation_preset in ('sunny_shelf', 'joyful_scrapbook')),
  featured_item_id uuid references public.showcase_items(id) on delete set null,
  published_at timestamptz not null default now(),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.showcase_display_set_items (
  display_set_id uuid not null references public.showcase_display_sets(id) on delete cascade,
  item_id uuid not null references public.showcase_items(id) on delete cascade,
  sort_order integer not null check (sort_order between 0 and 7),
  primary key (display_set_id, item_id),
  unique (display_set_id, sort_order)
);

create unique index showcase_display_sets_one_published_idx
  on public.showcase_display_sets (status)
  where status = 'published';
create index showcase_display_sets_published_idx
  on public.showcase_display_sets (published_at desc)
  where status = 'published';
create index showcase_display_sets_featured_item_idx
  on public.showcase_display_sets (featured_item_id)
  where featured_item_id is not null;
create index showcase_display_set_items_item_idx
  on public.showcase_display_set_items (item_id, display_set_id);

create trigger showcase_display_sets_set_updated_at before update on public.showcase_display_sets
for each row execute function private.set_updated_at();

alter table public.showcase_display_sets enable row level security;
alter table public.showcase_display_set_items enable row level security;

create policy showcase_display_sets_public_select on public.showcase_display_sets for select to anon
using (status = 'published' and published_at <= now());
create policy showcase_display_sets_authenticated_select on public.showcase_display_sets for select to authenticated
using ((select private.is_admin()) or (status = 'published' and published_at <= now()));
create policy showcase_display_sets_admin_insert on public.showcase_display_sets for insert to authenticated
with check ((select private.is_admin()) and created_by = (select auth.uid()));
create policy showcase_display_sets_admin_update on public.showcase_display_sets for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_display_sets_admin_delete on public.showcase_display_sets for delete to authenticated
using ((select private.is_admin()));

create policy showcase_display_set_items_public_select on public.showcase_display_set_items for select to anon
using (
  exists (
    select 1 from public.showcase_display_sets display_set
    where display_set.id = display_set_id
      and display_set.status = 'published'
      and display_set.published_at <= now()
  )
  and exists (
    select 1 from public.showcase_items item
    join public.showcase_batches batch on batch.id = item.batch_id
    where item.id = item_id
      and item.availability <> 'archived'
      and batch.status = 'published'
      and batch.published_at <= now()
  )
);
create policy showcase_display_set_items_authenticated_select on public.showcase_display_set_items for select to authenticated
using (
  (select private.is_admin())
  or (
    exists (
      select 1 from public.showcase_display_sets display_set
      where display_set.id = display_set_id
        and display_set.status = 'published'
        and display_set.published_at <= now()
    )
    and exists (
      select 1 from public.showcase_items item
      join public.showcase_batches batch on batch.id = item.batch_id
      where item.id = item_id
        and item.availability <> 'archived'
        and batch.status = 'published'
        and batch.published_at <= now()
    )
  )
);
create policy showcase_display_set_items_admin_insert on public.showcase_display_set_items for insert to authenticated
with check ((select private.is_admin()));
create policy showcase_display_set_items_admin_update on public.showcase_display_set_items for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy showcase_display_set_items_admin_delete on public.showcase_display_set_items for delete to authenticated
using ((select private.is_admin()));

grant select on public.showcase_display_sets, public.showcase_display_set_items to anon;
grant select, insert, update, delete on public.showcase_display_sets, public.showcase_display_set_items to authenticated;

create or replace function public.admin_save_showcase_display_set(
  p_item_ids uuid[],
  p_presentation_preset public.showcase_presentation_preset,
  p_featured_item_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  display_set_id uuid := gen_random_uuid();
  item_count integer := coalesce(array_length(p_item_ids, 1), 0);
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator required';
  end if;
  if item_count not between 2 and 8
    or p_presentation_preset not in ('sunny_shelf', 'joyful_scrapbook')
    or p_featured_item_id is null
    or not (p_featured_item_id = any(p_item_ids))
    or (select count(distinct item_id) from unnest(p_item_ids) as item_id) <> item_count
  then
    raise invalid_parameter_value using message = 'Invalid showcase display set';
  end if;
  if (
    select count(*)
    from public.showcase_items item
    join public.showcase_batches batch on batch.id = item.batch_id
    where item.id = any(p_item_ids)
      and item.availability <> 'archived'
      and batch.status = 'published'
  ) <> item_count then
    raise check_violation using message = 'Display set items must be visible showcase items';
  end if;

  lock table public.showcase_display_sets in share row exclusive mode;
  update public.showcase_display_sets
  set status = 'archived'
  where status = 'published';

  insert into public.showcase_display_sets (
    id,
    status,
    presentation_preset,
    featured_item_id,
    created_by
  ) values (
    display_set_id,
    'published',
    p_presentation_preset,
    p_featured_item_id,
    actor_id
  );

  insert into public.showcase_display_set_items (display_set_id, item_id, sort_order)
  select display_set_id, item_id, ordinality - 1
  from unnest(p_item_ids) with ordinality as selected(item_id, ordinality);

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.display_set.publish',
    'showcase_display_set',
    display_set_id::text,
    jsonb_build_object(
      'presentation_preset', p_presentation_preset,
      'featured_item_id', p_featured_item_id,
      'item_count', item_count
    )
  );

  return display_set_id;
end;
$$;

revoke all on function public.admin_save_showcase_display_set(
  uuid[],
  public.showcase_presentation_preset,
  uuid
) from public, anon;
grant execute on function public.admin_save_showcase_display_set(
  uuid[],
  public.showcase_presentation_preset,
  uuid
) to authenticated;
