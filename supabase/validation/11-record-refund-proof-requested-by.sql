-- GatherUp commercial v0.1 refund proof notification patch.
--
-- Run after schema.sql when live RPC integration shows record_refund_proof_atomic
-- returning INTERNAL_ERROR after refund approval.
--
-- Why:
--   record_refund_proof_atomic writes a participant notification to
--   v_refund.requested_by, but the function query must select rr.requested_by
--   into the record before that field is referenced.
--
-- Expected:
--   Success. The final result row should have ok = true.

create or replace function public.record_refund_proof_atomic(
  p_refund_request_id uuid,
  p_file_url text,
  p_amount_cents integer default null
)
returns jsonb as $$
declare
  v_actor_id uuid;
  v_refund record;
  v_amount_cents integer;
  v_now timestamptz := now();
begin
  v_actor_id := public.current_app_user_id();

  if v_actor_id is null then
    return jsonb_build_object('success', false, 'error_code', 'UNAUTHORIZED', 'message', 'Please sign in before uploading refund proof.');
  end if;

  if nullif(trim(coalesce(p_file_url, '')), '') is null then
    return jsonb_build_object('success', false, 'error_code', 'MISSING_FILE', 'message', 'Refund proof file is required.');
  end if;

  select
    rr.id as refund_request_id,
    rr.registration_id,
    rr.payment_id,
    rr.status as refund_status,
    rr.requested_by,
    rr.requested_amount_cents,
    rr.approved_amount_cents,
    r.event_id,
    r.order_number,
    r.status as registration_status,
    p.status as payment_status
  into v_refund
  from public.refund_requests rr
  join public.registrations r on r.id = rr.registration_id
  join public.payments p on p.id = rr.payment_id
  where rr.id = p_refund_request_id
  for update of rr, r, p;

  if not found then
    return jsonb_build_object('success', false, 'error_code', 'REFUND_REQUEST_NOT_FOUND', 'message', 'Refund request not found.');
  end if;

  if not (public.can_handle_event_refunds(v_refund.event_id) or public.is_platform_admin()) then
    return jsonb_build_object('success', false, 'error_code', 'FORBIDDEN', 'message', 'Only refund managers can upload refund proof.');
  end if;

  if v_refund.refund_status <> 'approved' then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_REFUND_STATUS', 'message', 'Refund proof can only be uploaded after approval.');
  end if;

  v_amount_cents := coalesce(p_amount_cents, v_refund.approved_amount_cents, v_refund.requested_amount_cents);

  if v_amount_cents <= 0 then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Refund proof amount must be greater than zero.');
  end if;

  if v_refund.approved_amount_cents is not null and v_amount_cents > v_refund.approved_amount_cents then
    return jsonb_build_object('success', false, 'error_code', 'INVALID_AMOUNT', 'message', 'Refund proof amount cannot exceed the approved refund amount.');
  end if;

  insert into public.refund_proofs (
    refund_request_id,
    file_url,
    amount_cents,
    uploaded_by,
    uploaded_at
  ) values (
    v_refund.refund_request_id,
    trim(p_file_url),
    v_amount_cents,
    v_actor_id,
    v_now
  );

  update public.refund_requests
  set
    status = 'proof_uploaded',
    paid_at = v_now,
    updated_at = v_now
  where id = v_refund.refund_request_id;

  update public.registrations
  set
    status = 'refunding',
    updated_at = v_now
  where id = v_refund.registration_id;

  update public.payments
  set
    status = 'refunding',
    updated_at = v_now
  where id = v_refund.payment_id;

  insert into public.audit_logs (
    actor_id,
    actor_role,
    event_id,
    target_type,
    target_id,
    action,
    risk_level,
    reason,
    before_snapshot,
    after_snapshot,
    metadata
  ) values (
    v_actor_id,
    case when public.is_platform_admin() then 'admin' else 'refund_manager' end,
    v_refund.event_id,
    'refund_request',
    v_refund.refund_request_id,
    'refund.proof_uploaded',
    'medium',
    'Refund transfer proof uploaded',
    jsonb_build_object(
      'refund_status', v_refund.refund_status,
      'registration_status', v_refund.registration_status,
      'payment_status', v_refund.payment_status
    ),
    jsonb_build_object(
      'refund_status', 'proof_uploaded',
      'registration_status', 'refunding',
      'payment_status', 'refunding',
      'paid_at', v_now
    ),
    jsonb_build_object(
      'registration_id', v_refund.registration_id,
      'payment_id', v_refund.payment_id,
      'order_number', v_refund.order_number,
      'amount_cents', v_amount_cents,
      'file_url', trim(p_file_url)
    )
  );

  insert into public.notification_deliveries (
    event_id,
    recipient_id,
    channel,
    status,
    template_key,
    title,
    body,
    metadata,
    sent_at
  ) values (
    v_refund.event_id,
    v_refund.requested_by,
    'in_app',
    'sent',
    'refund_proof_uploaded',
    'Refund proof uploaded',
    'Refund transfer proof has been uploaded for order ' || v_refund.order_number || '.',
    jsonb_build_object(
      'workflow', 'refund_proof_upload',
      'eventId', v_refund.event_id,
      'registrationId', v_refund.registration_id,
      'paymentId', v_refund.payment_id,
      'refundRequestId', v_refund.refund_request_id,
      'orderNumber', v_refund.order_number,
      'from', v_refund.refund_status,
      'to', 'proof_uploaded',
      'amountCents', v_amount_cents,
      'fileUrl', trim(p_file_url)
    ),
    v_now
  );

  return jsonb_build_object(
    'success', true,
    'refund_request_id', v_refund.refund_request_id,
    'registration_id', v_refund.registration_id,
    'order_number', v_refund.order_number,
    'status', 'proof_uploaded',
    'amount_cents', v_amount_cents,
    'file_url', trim(p_file_url)
  );
exception
  when deadlock_detected or serialization_failure then
    return jsonb_build_object('success', false, 'error_code', 'CONCURRENT_CONFLICT', 'message', 'Refund proof upload is busy. Please retry.');
  when others then
    raise warning '[GatherUp] record_refund_proof_atomic: % | %', sqlstate, sqlerrm;
    return jsonb_build_object('success', false, 'error_code', 'INTERNAL_ERROR', 'message', 'Refund proof upload failed.');
end;
$$ language plpgsql security definer set search_path = public, auth, pg_temp;

revoke all on function public.record_refund_proof_atomic(uuid, text, integer) from public;
grant execute on function public.record_refund_proof_atomic(uuid, text, integer) to authenticated;

select
  'record_refund_proof_selects_requested_by' as check_name,
  pg_catalog.pg_get_functiondef('public.record_refund_proof_atomic(uuid, text, integer)'::regprocedure) like '%rr.requested_by%' as ok;
