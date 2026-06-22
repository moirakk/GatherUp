-- GatherUp commercial v0.1 payment proof submission and Storage immutability patch.
--
-- Run after schema.sql and storage.sql when live RPC integration shows that:
--   1. inserting payment_proofs does not move registrations to payment_submitted;
--   2. uploaded payment/refund proof Storage objects can be deleted by authenticated users.
--
-- Expected:
--   Success. The final result rows should all have ok = true.

create or replace function public.mark_payment_submitted_from_proof()
returns trigger as $$
begin
  update public.payments
  set
    status = 'submitted',
    proof_url = new.file_url,
    submitted_at = now()
  where id = new.payment_id;

  update public.registrations
  set
    status = 'payment_submitted',
    updated_at = now()
  where id = new.registration_id
    and status in ('awaiting_payment', 'payment_rejected_resubmittable', 'partial_paid_needs_topup');

  with payment_context as (
    select
      r.event_id,
      r.order_number,
      e.name as event_name,
      e.organizer_id
    from public.registrations r
    join public.events e on e.id = r.event_id
    where r.id = new.registration_id
  ),
  recipients as (
    select organizer_id as user_id
    from payment_context
    union
    select eo.user_id
    from public.event_organizers eo
    join payment_context pc on pc.event_id = eo.event_id
    where eo.role in ('owner', 'finance')
       or (eo.role = 'cohost' and coalesce((eo.permissions ->> 'can_manage_payments')::boolean, false))
  )
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
  )
  select
    pc.event_id,
    recipients.user_id,
    'in_app',
    'sent',
    'payment_proof_submitted',
    'New payment proof needs review',
    'A participant submitted payment proof for ' || pc.event_name || '. Please review order ' || pc.order_number || '.',
    jsonb_build_object(
      'workflow', 'payment_proof_submission',
      'eventId', pc.event_id,
      'registrationId', new.registration_id,
      'paymentId', new.payment_id,
      'paymentProofId', new.id,
      'orderNumber', pc.order_number
    ),
    now()
  from payment_context pc
  join recipients on true
  where recipients.user_id is not null;

  return new;
end;
$$ language plpgsql;

drop policy if exists "payment proof files are immutable" on storage.objects;
create policy "payment proof files are immutable"
  as restrictive
  on storage.objects for update
  using (bucket_id <> 'payment-proofs')
  with check (bucket_id <> 'payment-proofs');

drop policy if exists "payment proof files cannot be deleted" on storage.objects;
create policy "payment proof files cannot be deleted"
  as restrictive
  on storage.objects for delete
  using (bucket_id <> 'payment-proofs');

drop policy if exists "refund proof files are immutable" on storage.objects;
create policy "refund proof files are immutable"
  as restrictive
  on storage.objects for update
  using (bucket_id <> 'refund-proofs')
  with check (bucket_id <> 'refund-proofs');

drop policy if exists "refund proof files cannot be deleted" on storage.objects;
create policy "refund proof files cannot be deleted"
  as restrictive
  on storage.objects for delete
  using (bucket_id <> 'refund-proofs');

with trigger_source as (
  select pg_catalog.pg_get_functiondef('public.mark_payment_submitted_from_proof()'::regprocedure) as definition
),
storage_policy_checks as (
  select
    exists (
      select 1
      from pg_catalog.pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'payment proof files cannot be deleted'
        and permissive = 'RESTRICTIVE'
    ) as payment_delete_locked,
    exists (
      select 1
      from pg_catalog.pg_policies
      where schemaname = 'storage'
        and tablename = 'objects'
        and policyname = 'refund proof files cannot be deleted'
        and permissive = 'RESTRICTIVE'
    ) as refund_delete_locked
)
select
  'payment_proof_trigger_updates_registration_status' as check_name,
  definition like '%status = ''payment_submitted''%' as ok
from trigger_source
union all
select
  'payment_proof_delete_policy_is_restrictive',
  payment_delete_locked
from storage_policy_checks
union all
select
  'refund_proof_delete_policy_is_restrictive',
  refund_delete_locked
from storage_policy_checks
order by check_name;
