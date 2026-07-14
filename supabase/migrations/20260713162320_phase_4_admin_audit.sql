create table public.admin_audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  action text not null check (action ~ '^[a-z][a-z0-9_.]{2,79}$'),
  target_type text check (
    target_type is null or target_type ~ '^[a-z][a-z0-9_]{1,79}$'
  ),
  target_id text check (
    target_id is null or length(btrim(target_id)) between 1 and 200
  ),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  check ((target_type is null) = (target_id is null))
);

create index admin_audit_logs_actor_created_idx
  on public.admin_audit_logs (actor_user_id, created_at desc);
create index admin_audit_logs_action_created_idx
  on public.admin_audit_logs (action, created_at desc);

alter table public.admin_audit_logs enable row level security;

create policy admin_audit_logs_admin_select
on public.admin_audit_logs for select
to authenticated
using ((select private.is_admin()));

create policy admin_audit_logs_admin_insert
on public.admin_audit_logs for insert
to authenticated
with check (
  (select private.is_admin())
  and actor_user_id = (select auth.uid())
);

revoke all on table public.admin_audit_logs from anon, authenticated;
revoke all on sequence public.admin_audit_logs_id_seq from anon, authenticated;
grant select, insert on table public.admin_audit_logs to authenticated;
grant usage, select on sequence public.admin_audit_logs_id_seq to authenticated;
