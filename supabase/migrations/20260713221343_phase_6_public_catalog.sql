create table public.product_categories (
  product_id uuid not null references public.products (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  primary key (product_id, category_id)
);

create index product_categories_category_sort_idx
  on public.product_categories (category_id, sort_order, product_id);

alter table public.product_categories enable row level security;

create policy product_categories_public_select
on public.product_categories for select
to anon
using (
  exists (
    select 1
    from public.products
    where products.id = product_categories.product_id
      and products.status = 'published'
      and products.published_at is not null
      and products.published_at <= now()
  )
  and exists (
    select 1
    from public.categories
    where categories.id = product_categories.category_id
      and categories.is_visible
  )
);

create policy product_categories_authenticated_select
on public.product_categories for select
to authenticated
using (
  (select private.is_admin())
  or (
    exists (
      select 1
      from public.products
      where products.id = product_categories.product_id
        and products.status = 'published'
        and products.published_at is not null
        and products.published_at <= now()
    )
    and exists (
      select 1
      from public.categories
      where categories.id = product_categories.category_id
        and categories.is_visible
    )
  )
);

create policy product_categories_admin_insert
on public.product_categories for insert
to authenticated
with check ((select private.is_admin()));

create policy product_categories_admin_update
on public.product_categories for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy product_categories_admin_delete
on public.product_categories for delete
to authenticated
using ((select private.is_admin()));

revoke all on table public.product_categories from anon, authenticated;
grant select on table public.product_categories to anon;
grant select, insert, update, delete on table public.product_categories to authenticated;

create or replace function public.admin_save_product_categories(
  p_product_id uuid,
  p_category_ids uuid[]
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  category_count integer;
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  select count(distinct category_id)
  into category_count
  from unnest(coalesce(p_category_ids, array[]::uuid[])) as category_id;

  if category_count > 20 then
    raise exception 'too_many_categories' using errcode = '22023';
  end if;

  if category_count <> coalesce(cardinality(p_category_ids), 0) then
    raise exception 'duplicate_categories' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(p_category_ids, array[]::uuid[])) as selected(category_id)
    left join public.categories on categories.id = selected.category_id
    where categories.id is null
  ) then
    raise exception 'category_not_found' using errcode = 'P0002';
  end if;

  delete from public.product_categories
  where product_id = p_product_id;

  insert into public.product_categories (product_id, category_id, sort_order)
  select p_product_id, selected.category_id, (selected.ordinality - 1)::integer * 10
  from unnest(coalesce(p_category_ids, array[]::uuid[])) with ordinality
    as selected(category_id, ordinality);

  insert into public.admin_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) values (
    (select auth.uid()),
    'catalog.product_categories.update',
    'product',
    p_product_id,
    jsonb_build_object('category_count', category_count)
  );
end;
$$;

revoke all on function public.admin_save_product_categories(uuid, uuid[]) from public, anon;
grant execute on function public.admin_save_product_categories(uuid, uuid[]) to authenticated;
