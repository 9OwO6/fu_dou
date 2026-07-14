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
  ('d0000000-0000-4000-8000-000000000081', 'phase8-admin@example.invalid'),
  ('d0000000-0000-4000-8000-000000000082', 'phase8-member@example.invalid');

insert into public.profiles (id, display_name, role)
values ('d0000000-0000-4000-8000-000000000081', 'Phase 8 测试管理员', 'admin');

create temporary table phase8_result (payload jsonb not null);
grant select, insert on table pg_temp.phase8_result to service_role;
grant select on table pg_temp.phase8_result to authenticated;

select plan(26);

select is(
  has_function_privilege('anon', 'public.submit_order_request(text,text,text,public.contact_preference,public.fulfillment_method,text,text,text,text,text,jsonb,text,text)', 'execute'),
  false,
  'anon cannot call the privileged order transaction directly'
);

select is(
  has_function_privilege('authenticated', 'public.submit_order_request(text,text,text,public.contact_preference,public.fulfillment_method,text,text,text,text,text,jsonb,text,text)', 'execute'),
  false,
  'authenticated users cannot call the privileged order transaction directly'
);

select is(
  has_function_privilege('service_role', 'public.submit_order_request(text,text,text,public.contact_preference,public.fulfillment_method,text,text,text,text,text,jsonb,text,text)', 'execute'),
  true,
  'only the server service role can call the order transaction'
);

set local role service_role;

select lives_ok(
  $command$
    insert into pg_temp.phase8_result (payload)
    select public.submit_order_request(
      '测试顾客',
      'CUSTOMER@EXAMPLE.INVALID',
      null,
      'email',
      'pickup',
      'Vancouver',
      null,
      null,
      '周末下午',
      '请先用邮件联系。',
      '[{"variant_id":"50000000-0000-4000-8000-000000000001","quantity":2}]'::jsonb,
      repeat('a', 64),
      repeat('b', 64)
    )
  $command$,
  'a valid cart is saved atomically'
);

select is((select payload->>'ok' from pg_temp.phase8_result), 'true', 'valid submission reports success');
select matches(
  (select payload->>'requestNumber' from pg_temp.phase8_result),
  '^HB-[A-F0-9]{20}$',
  'request number is non-sequential and hard to enumerate'
);
select results_eq(
  $query$
    select email, subtotal_snapshot
    from public.order_requests
    where id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid
  $query$,
  $values$ values ('customer@example.invalid'::text, 48.00::numeric) $values$,
  'server normalizes email and snapshots the authoritative database price'
);
select results_eq(
  $query$
    select product_title_snapshot, variant_label_snapshot, sku_snapshot,
           unit_price_snapshot, quantity, line_total_snapshot
    from public.order_request_items
    where order_request_id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid
  $query$,
  $values$ values (
    'DEMO 猫狗马克杯'::text,
    '款式：猫猫 / 颜色：奶油色'::text,
    'DEMO-MUG-CAT-CREAM'::text,
    24.00::numeric,
    2,
    48.00::numeric
  ) $values$,
  'item title, option, SKU, price, quantity, and total snapshots are authoritative'
);
select is(
  (select count(*)::integer from public.order_request_emails
   where order_request_id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid),
  2,
  'owner and customer email delivery records are created inside the transaction'
);
select is(
  (select count(*)::integer from public.order_request_emails
   where order_request_id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid
     and status = 'pending'),
  2,
  'email records start pending after the request is safely stored'
);
select is(
  (select count(*)::integer from private.order_request_rate_events
   where order_request_id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid
     and accepted),
  1,
  'successful request links to a hashed rate-limit event'
);

select is(
  pg_temp.sqlstate_of($command$
    select public.submit_order_request(
      '库存测试', 'stock@example.invalid', null, 'email', 'pickup', 'Burnaby',
      null, null, null, null,
      '[{"variant_id":"50000000-0000-4000-8000-000000000001","quantity":9}]'::jsonb,
      repeat('c',64), repeat('d',64)
    )
  $command$),
  '22023',
  'quantity above current stock is rejected'
);
select is(
  pg_temp.sqlstate_of($command$
    select public.submit_order_request(
      '售罄测试', 'soldout@example.invalid', null, 'email', 'pickup', 'Burnaby',
      null, null, null, null,
      '[{"variant_id":"50000000-0000-4000-8000-000000000004","quantity":1}]'::jsonb,
      repeat('e',64), repeat('f',64)
    )
  $command$),
  '22023',
  'sold-out variant is rejected'
);

select public.submit_order_request(
  '限流一', 'rate1@example.invalid', null, 'email', 'pickup', 'Richmond', null, null, null, null,
  '[{"variant_id":"50000000-0000-4000-8000-000000000005","quantity":1}]'::jsonb,
  repeat('1',64), repeat('2',64)
);
select public.submit_order_request(
  '限流二', 'rate2@example.invalid', null, 'email', 'pickup', 'Richmond', null, null, null, null,
  '[{"variant_id":"50000000-0000-4000-8000-000000000005","quantity":1}]'::jsonb,
  repeat('1',64), repeat('3',64)
);
select public.submit_order_request(
  '限流三', 'rate3@example.invalid', null, 'email', 'pickup', 'Richmond', null, null, null, null,
  '[{"variant_id":"50000000-0000-4000-8000-000000000005","quantity":1}]'::jsonb,
  repeat('1',64), repeat('4',64)
);
select is(
  (public.submit_order_request(
    '限流四', 'rate4@example.invalid', null, 'email', 'pickup', 'Richmond', null, null, null, null,
    '[{"variant_id":"50000000-0000-4000-8000-000000000005","quantity":1}]'::jsonb,
    repeat('1',64), repeat('5',64)
  )->>'code'),
  'rate_limited',
  'fourth request from one hashed IP within an hour is gently rate limited'
);
select is(
  (select count(*)::integer from public.order_requests where customer_name = '限流四'),
  0,
  'rate-limited request creates no order row'
);

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000082","role":"authenticated"}',
  true
);
set local role authenticated;
select is(
  pg_temp.sqlstate_of(format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'contacted', ''
  )),
  '42501',
  'non-admin cannot update an order request'
);
select is((select count(*)::integer from public.order_requests), 0, 'non-admin cannot read order requests');
select is((select count(*)::integer from public.order_request_emails), 0, 'non-admin cannot read email delivery state');

reset role;
select set_config(
  'request.jwt.claims',
  '{"sub":"d0000000-0000-4000-8000-000000000081","role":"authenticated"}',
  true
);
set local role authenticated;

select lives_ok(
  format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'contacted', '已发送邮件'
  ),
  'admin can move a request from new to contacted and save a note'
);
select is(
  pg_temp.sqlstate_of(format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'completed', '跳过流程'
  )),
  '22023',
  'admin cannot skip required status steps'
);
select lives_ok(
  format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'confirmed', '顾客已确认'
  ),
  'admin can move contacted to confirmed'
);
select lives_ok(
  format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'preparing', '准备中'
  ),
  'admin can move confirmed to preparing'
);
select lives_ok(
  format(
    'select public.admin_update_order_request(%L, %L, %L)',
    (select payload->>'orderRequestId' from pg_temp.phase8_result), 'completed', '已完成'
  ),
  'admin can complete the full status flow'
);
select results_eq(
  $query$
    select status, admin_note
    from public.order_requests
    where id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid
  $query$,
  $values$ values ('completed'::public.order_request_status, '已完成'::text) $values$,
  'final status and admin note are persisted'
);
select is(
  (select count(*)::integer from public.admin_audit_logs
   where action = 'orders.request.update'
     and target_id = (select payload->>'orderRequestId' from pg_temp.phase8_result)),
  4,
  'each successful admin status change is audited'
);
select is(
  (select count(*)::integer from public.order_request_items
   where order_request_id = ((select payload->>'orderRequestId' from pg_temp.phase8_result))::uuid),
  1,
  'admin status updates never alter immutable item snapshots'
);

select * from finish();
rollback;
