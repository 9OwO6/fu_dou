create type public.order_email_kind as enum ('owner_notification', 'customer_confirmation');
create type public.order_email_status as enum ('pending', 'sending', 'sent', 'failed');

create table public.order_request_emails (
  id uuid primary key default gen_random_uuid(),
  order_request_id uuid not null references public.order_requests (id) on delete cascade,
  kind public.order_email_kind not null,
  status public.order_email_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  provider_message_id text,
  failure_summary text check (failure_summary is null or length(failure_summary) <= 300),
  last_attempt_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_request_id, kind),
  check ((status = 'sent') = (sent_at is not null)),
  check (status <> 'sent' or provider_message_id is not null)
);

create index order_request_emails_request_idx
  on public.order_request_emails (order_request_id, kind);
create index order_request_emails_status_idx
  on public.order_request_emails (status, updated_at);

create trigger order_request_emails_set_updated_at
before update on public.order_request_emails
for each row execute function private.set_updated_at();

alter table public.order_request_emails enable row level security;

create policy order_request_emails_admin_select
on public.order_request_emails for select
to authenticated
using ((select private.is_admin()));

revoke all on table public.order_request_emails from anon, authenticated;
grant select on table public.order_request_emails to authenticated;
grant select, insert, update on table public.order_requests to service_role;
grant select, insert on table public.order_request_items to service_role;
grant select, insert, update on table public.order_request_emails to service_role;
grant select, update on table public.products, public.product_variants to service_role;
grant select on table
  public.product_translations,
  public.variant_option_values,
  public.product_option_values,
  public.product_options,
  public.product_option_translations,
  public.product_option_value_translations,
  public.product_images
to service_role;

-- This table intentionally lives outside the exposed schema. It stores only
-- keyed hashes, never raw IP addresses or email addresses.
create table private.order_request_rate_events (
  id bigint generated always as identity primary key,
  ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
  email_hash text not null check (email_hash ~ '^[a-f0-9]{64}$'),
  order_request_id uuid references public.order_requests (id) on delete set null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index order_request_rate_events_ip_idx
  on private.order_request_rate_events (ip_hash, created_at desc);
create index order_request_rate_events_email_idx
  on private.order_request_rate_events (email_hash, created_at desc);
create index order_request_rate_events_created_idx
  on private.order_request_rate_events (created_at);

revoke all on table private.order_request_rate_events from public, anon, authenticated;
revoke all on sequence private.order_request_rate_events_id_seq from public, anon, authenticated;
grant usage on schema private to service_role;
grant select, insert, update, delete on table private.order_request_rate_events to service_role;
grant usage, select on sequence private.order_request_rate_events_id_seq to service_role;

create function public.submit_order_request(
  p_customer_name text,
  p_email text,
  p_phone text,
  p_preferred_contact public.contact_preference,
  p_fulfillment_method public.fulfillment_method,
  p_city_or_area text,
  p_postal_code text,
  p_wechat_or_other_contact text,
  p_preferred_time text,
  p_customer_note text,
  p_items jsonb,
  p_ip_hash text,
  p_email_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_email text := lower(btrim(p_email));
  normalized_phone text := nullif(btrim(p_phone), '');
  normalized_postal_code text := nullif(upper(btrim(p_postal_code)), '');
  rate_event_id bigint;
  recent_ip_count integer;
  recent_email_count integer;
  item_count integer;
  distinct_item_count integer;
  item record;
  variant_row record;
  variant_label text;
  image_path text;
  snapshot_items jsonb := '[]'::jsonb;
  subtotal numeric(12, 2) := 0;
  request_id uuid;
  public_request_number text;
begin
  if p_customer_name is null or length(btrim(p_customer_name)) not between 1 and 120 then
    raise invalid_parameter_value using message = 'invalid_customer_name';
  end if;
  if normalized_email is null or length(normalized_email) not between 3 and 320
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise invalid_parameter_value using message = 'invalid_email';
  end if;
  if p_preferred_contact = 'phone' and normalized_phone is null then
    raise invalid_parameter_value using message = 'phone_required';
  end if;
  if normalized_phone is not null and length(normalized_phone) > 40 then
    raise invalid_parameter_value using message = 'invalid_phone';
  end if;
  if p_city_or_area is null or length(btrim(p_city_or_area)) not between 1 and 120 then
    raise invalid_parameter_value using message = 'invalid_city_or_area';
  end if;
  if p_fulfillment_method = 'local_delivery' and normalized_postal_code is null then
    raise invalid_parameter_value using message = 'postal_code_required';
  end if;
  if normalized_postal_code is not null and length(normalized_postal_code) > 20 then
    raise invalid_parameter_value using message = 'invalid_postal_code';
  end if;
  if length(coalesce(p_wechat_or_other_contact, '')) > 120
    or length(coalesce(p_preferred_time, '')) > 200
    or length(coalesce(p_customer_note, '')) > 2000 then
    raise invalid_parameter_value using message = 'customer_text_too_long';
  end if;
  if p_ip_hash !~ '^[a-f0-9]{64}$' or p_email_hash !~ '^[a-f0-9]{64}$' then
    raise invalid_parameter_value using message = 'invalid_rate_limit_key';
  end if;
  if not coalesce(jsonb_typeof(p_items) = 'array', false) then
    raise invalid_parameter_value using message = 'invalid_items';
  end if;

  select count(*), count(distinct value->>'variant_id')
  into item_count, distinct_item_count
  from jsonb_array_elements(p_items);
  if item_count < 1 or item_count > 100 or item_count <> distinct_item_count then
    raise invalid_parameter_value using message = 'invalid_items';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_ip_hash, 8018));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_email_hash, 8019));

  delete from private.order_request_rate_events
  where created_at < statement_timestamp() - interval '24 hours';

  select count(*) into recent_ip_count
  from private.order_request_rate_events
  where ip_hash = p_ip_hash
    and created_at >= statement_timestamp() - interval '1 hour';
  select count(*) into recent_email_count
  from private.order_request_rate_events
  where email_hash = p_email_hash
    and created_at >= statement_timestamp() - interval '1 hour';

  insert into private.order_request_rate_events (ip_hash, email_hash)
  values (p_ip_hash, p_email_hash)
  returning id into rate_event_id;

  if recent_ip_count >= 3 or recent_email_count >= 3 then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  for item in
    select variant_id, quantity
    from jsonb_to_recordset(p_items) as parsed(variant_id uuid, quantity integer)
    order by variant_id
  loop
    if item.variant_id is null or item.quantity is null or item.quantity < 1 or item.quantity > 99 then
      raise invalid_parameter_value using message = 'invalid_items';
    end if;

    select
      variant.id,
      variant.product_id,
      variant.sku,
      variant.price_cad,
      variant.stock_qty,
      translation.title
    into variant_row
    from public.product_variants as variant
    join public.products as product on product.id = variant.product_id
    join public.product_translations as translation
      on translation.product_id = product.id and translation.locale = 'zh'
    where variant.id = item.variant_id
      and variant.is_active
      and product.status = 'published'
      and product.published_at is not null
      and product.published_at <= statement_timestamp()
    for share of variant, product;

    if not found then
      raise invalid_parameter_value using message = 'item_unavailable';
    end if;
    if variant_row.stock_qty < item.quantity then
      raise invalid_parameter_value using message = 'insufficient_stock';
    end if;

    select coalesce(
      string_agg(
        option_translation.name || '：' || value_translation.label,
        ' / ' order by option_row.sort_order, value_row.sort_order, value_row.id
      ),
      '默认规格'
    )
    into variant_label
    from public.variant_option_values as link
    join public.product_option_values as value_row on value_row.id = link.option_value_id
    join public.product_options as option_row on option_row.id = value_row.option_id
    join public.product_option_translations as option_translation
      on option_translation.option_id = option_row.id and option_translation.locale = 'zh'
    join public.product_option_value_translations as value_translation
      on value_translation.option_value_id = value_row.id and value_translation.locale = 'zh'
    where link.variant_id = variant_row.id;

    select product_image.storage_path
    into image_path
    from public.product_images as product_image
    where product_image.product_id = variant_row.product_id
      and (product_image.variant_id = variant_row.id or product_image.variant_id is null)
    order by (product_image.variant_id = variant_row.id) desc, product_image.sort_order, product_image.id
    limit 1;

    subtotal := subtotal + (variant_row.price_cad * item.quantity);
    snapshot_items := snapshot_items || jsonb_build_array(jsonb_build_object(
      'product_id', variant_row.product_id,
      'variant_id', variant_row.id,
      'product_title', variant_row.title,
      'variant_label', variant_label,
      'sku', variant_row.sku,
      'unit_price', variant_row.price_cad,
      'quantity', item.quantity,
      'line_total', variant_row.price_cad * item.quantity,
      'image_path', image_path
    ));
  end loop;

  insert into public.order_requests (
    customer_name, email, phone, preferred_contact, fulfillment_method,
    city_or_area, postal_code, wechat_or_other_contact, preferred_time,
    customer_note, subtotal_snapshot
  ) values (
    btrim(p_customer_name), normalized_email, normalized_phone, p_preferred_contact,
    p_fulfillment_method, btrim(p_city_or_area), normalized_postal_code,
    nullif(btrim(p_wechat_or_other_contact), ''), nullif(btrim(p_preferred_time), ''),
    nullif(btrim(p_customer_note), ''), subtotal
  )
  returning id, request_number into request_id, public_request_number;

  insert into public.order_request_items (
    order_request_id, product_id, variant_id, product_title_snapshot,
    variant_label_snapshot, sku_snapshot, unit_price_snapshot, quantity,
    line_total_snapshot, image_path_snapshot
  )
  select
    request_id, snapshot.product_id, snapshot.variant_id, snapshot.product_title,
    snapshot.variant_label, snapshot.sku, snapshot.unit_price, snapshot.quantity,
    snapshot.line_total, snapshot.image_path
  from jsonb_to_recordset(snapshot_items) as snapshot(
    product_id uuid,
    variant_id uuid,
    product_title text,
    variant_label text,
    sku text,
    unit_price numeric,
    quantity integer,
    line_total numeric,
    image_path text
  );

  insert into public.order_request_emails (order_request_id, kind)
  values
    (request_id, 'owner_notification'),
    (request_id, 'customer_confirmation');

  update private.order_request_rate_events
  set accepted = true, order_request_id = request_id
  where id = rate_event_id;

  return jsonb_build_object(
    'ok', true,
    'orderRequestId', request_id,
    'requestNumber', public_request_number
  );
end;
$$;

revoke execute on function public.submit_order_request(
  text, text, text, public.contact_preference, public.fulfillment_method,
  text, text, text, text, text, jsonb, text, text
) from public, anon, authenticated;
grant execute on function public.submit_order_request(
  text, text, text, public.contact_preference, public.fulfillment_method,
  text, text, text, text, text, jsonb, text, text
) to service_role;

create function public.admin_update_order_request(
  p_order_request_id uuid,
  p_status public.order_request_status,
  p_admin_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_status public.order_request_status;
begin
  if not (select private.is_admin()) then
    raise insufficient_privilege using message = 'Administrator access required';
  end if;
  if length(coalesce(p_admin_note, '')) > 2000 then
    raise invalid_parameter_value using message = 'Admin note is too long';
  end if;

  select status into previous_status
  from public.order_requests
  where id = p_order_request_id
  for update;
  if not found then
    raise no_data_found using message = 'Order request not found';
  end if;

  if p_status <> previous_status and not (
    (previous_status = 'new' and p_status in ('contacted', 'cancelled'))
    or (previous_status = 'contacted' and p_status in ('confirmed', 'cancelled'))
    or (previous_status = 'confirmed' and p_status in ('preparing', 'cancelled'))
    or (previous_status = 'preparing' and p_status in ('completed', 'cancelled'))
  ) then
    raise invalid_parameter_value using message = 'Invalid order request status transition';
  end if;

  update public.order_requests
  set status = p_status, admin_note = nullif(btrim(p_admin_note), '')
  where id = p_order_request_id;

  insert into public.admin_audit_logs (
    actor_user_id, action, target_type, target_id, metadata
  ) values (
    (select auth.uid()),
    'orders.request.update',
    'order_request',
    p_order_request_id::text,
    jsonb_build_object('fromStatus', previous_status, 'toStatus', p_status)
  );
end;
$$;

revoke update on table public.order_requests from authenticated;
revoke execute on function public.admin_update_order_request(
  uuid, public.order_request_status, text
) from public, anon;
grant execute on function public.admin_update_order_request(
  uuid, public.order_request_status, text
) to authenticated;
