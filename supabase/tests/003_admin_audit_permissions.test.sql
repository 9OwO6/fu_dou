begin;

create extension if not exists pgtap with schema extensions;

create or replace function pg_temp.sqlstate_of(command text)
returns text
language plpgsql
as $$
begin
  execute command;
  return null;
exception
  when others then
    return sqlstate;
end;
$$;

insert into auth.users (id, email)
values
  ('c0000000-0000-4000-8000-000000000001', 'phase4-admin@example.invalid'),
  ('c0000000-0000-4000-8000-000000000002', 'phase4-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('c0000000-0000-4000-8000-000000000001', 'Phase 4 测试管理员', 'admin');

select plan(10);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.admin_audit_logs'::regclass),
  'admin audit logs have RLS enabled'
);

set local role anon;

select is(
  pg_temp.sqlstate_of('select * from public.admin_audit_logs'),
  '42501',
  'guest cannot read admin audit logs'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.admin_audit_logs (actor_user_id, action)
    values ('c0000000-0000-4000-8000-000000000001', 'auth.login')
  $command$),
  '42501',
  'guest cannot write admin audit logs'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
set local role authenticated;

select results_eq(
  'select count(*) from public.admin_audit_logs',
  array[0::bigint],
  'non-admin Auth user cannot read admin audit logs'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.admin_audit_logs (actor_user_id, action)
    values ('c0000000-0000-4000-8000-000000000002', 'auth.login')
  $command$),
  '42501',
  'non-admin Auth user cannot write admin audit logs'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"c0000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  $command$
    insert into public.admin_audit_logs (actor_user_id, action, metadata)
    values (
      'c0000000-0000-4000-8000-000000000001',
      'auth.login',
      '{"source":"server_action"}'::jsonb
    )
  $command$,
  'admin can append an audit record for self'
);

select results_eq(
  'select count(*) from public.admin_audit_logs',
  array[1::bigint],
  'admin can read admin audit logs'
);

select is(
  pg_temp.sqlstate_of($command$
    insert into public.admin_audit_logs (actor_user_id, action)
    values ('c0000000-0000-4000-8000-000000000002', 'auth.login')
  $command$),
  '42501',
  'admin cannot forge another actor identity'
);

select is(
  pg_temp.sqlstate_of($command$
    update public.admin_audit_logs set action = 'auth.changed'
  $command$),
  '42501',
  'audit records cannot be updated through the Data API'
);

select is(
  pg_temp.sqlstate_of($command$
    delete from public.admin_audit_logs
  $command$),
  '42501',
  'audit records cannot be deleted through the Data API'
);

select * from finish();
rollback;
