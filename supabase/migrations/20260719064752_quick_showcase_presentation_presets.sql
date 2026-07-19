create type public.showcase_presentation_preset as enum (
  'sunny_shelf',
  'joyful_scrapbook',
  'today_spotlight'
);

alter table public.showcase_batches
  add column presentation_preset public.showcase_presentation_preset not null default 'sunny_shelf',
  add column featured_item_id uuid references public.showcase_items(id) on delete set null;

create index showcase_batches_featured_item_idx
  on public.showcase_batches (featured_item_id)
  where featured_item_id is not null;

create or replace function public.admin_update_showcase_batch_presentation(
  p_batch_id uuid,
  p_presentation_preset public.showcase_presentation_preset,
  p_featured_item_id uuid default null
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
  if p_batch_id is null or p_presentation_preset is null then
    raise invalid_parameter_value using message = 'Invalid showcase presentation';
  end if;

  perform 1 from public.showcase_batches where id = p_batch_id for update;
  if not found then
    raise no_data_found using message = 'Showcase batch not found';
  end if;
  if p_featured_item_id is not null and not exists (
    select 1 from public.showcase_items
    where id = p_featured_item_id and batch_id = p_batch_id
  ) then
    raise check_violation using message = 'Featured item must belong to the showcase batch';
  end if;

  update public.showcase_batches
  set presentation_preset = p_presentation_preset,
      featured_item_id = p_featured_item_id
  where id = p_batch_id;

  insert into public.admin_audit_logs (actor_user_id, action, target_type, target_id, metadata)
  values (
    actor_id,
    'showcase.batch.presentation.update',
    'showcase_batch',
    p_batch_id::text,
    jsonb_build_object(
      'presentation_preset', p_presentation_preset,
      'featured_item_id', p_featured_item_id
    )
  );
end;
$$;

revoke all on function public.admin_update_showcase_batch_presentation(
  uuid,
  public.showcase_presentation_preset,
  uuid
) from public, anon;
grant execute on function public.admin_update_showcase_batch_presentation(
  uuid,
  public.showcase_presentation_preset,
  uuid
) to authenticated;
