-- GatherUp commercial v0.1 clean dev/staging post-execution summary.
-- Run after schema.sql, seed.sql, storage.sql, and 06-public-read-grants.sql.
--
-- Expected:
--   Every row should have ok = true.

with expected_tables(name) as (
  values
    ('users'), ('user_public_id_history'), ('user_auth_identities'),
    ('organizer_verifications'), ('events'), ('event_organizers'),
    ('review_requests'), ('collection_code_versions'), ('event_finance_settings'),
    ('event_expenses'), ('event_order_counters'), ('registrations'),
    ('registration_attendees'), ('payments'), ('payment_proofs'),
    ('refund_requests'), ('refund_proofs'), ('waitlist_entries'),
    ('seats'), ('seat_locks'), ('seat_assignments'), ('check_ins'),
    ('announcements'), ('notification_deliveries'), ('activity_materials'),
    ('export_jobs'), ('complaints'), ('platform_settings'), ('admin_users'),
    ('audit_logs')
),
expected_types(name) as (
  values
    ('event_category'), ('event_template'), ('event_visibility'), ('event_status'),
    ('registration_status'), ('payment_status'), ('seat_status'),
    ('announcement_status'), ('contact_type'), ('order_number_format'),
    ('event_organizer_role'), ('event_fee_mode'), ('event_expense_category'),
    ('event_expense_status'), ('auth_identity_provider'),
    ('organizer_verification_status'), ('review_target_type'), ('review_status'),
    ('price_visibility'), ('location_visibility'), ('seat_selection_mode'),
    ('collection_code_status'), ('payment_proof_type'), ('payment_proof_status'),
    ('refund_status'), ('waitlist_status'), ('seat_lock_status'),
    ('check_in_status'), ('notification_channel'), ('notification_delivery_status'),
    ('activity_material_type'), ('activity_material_visibility'), ('export_status'),
    ('complaint_target_type'), ('complaint_status'), ('admin_role'), ('admin_status'),
    ('platform_setting_value_type'), ('audit_risk_level')
),
expected_functions(name) as (
  values
    ('set_updated_at'), ('prevent_public_id_over_limit'),
    ('create_payment_for_registration'), ('mark_payment_submitted_from_proof'),
    ('sync_seat_status_on_assignment'), ('create_registration_atomic'), ('current_app_user_id'),
    ('can_manage_event'), ('can_edit_event'), ('can_manage_event_finance'),
    ('can_manage_event_payments'), ('can_handle_event_refunds'), ('is_platform_admin')
),
expected_buckets(name) as (
  values
    ('activity-covers'), ('activity-materials'), ('collection-codes'),
    ('payment-proofs'), ('refund-proofs'), ('expense-proofs'),
    ('complaint-evidence'), ('exports')
),
seed_counts as (
  select 'users' as name, count(*) as actual, 3 as expected_minimum from public.users
  union all select 'user_auth_identities', count(*), 3 from public.user_auth_identities
  union all select 'events', count(*), 1 from public.events
  union all select 'event_organizers', count(*), 3 from public.event_organizers
  union all select 'organizer_verifications', count(*), 1 from public.organizer_verifications
  union all select 'collection_code_versions', count(*), 1 from public.collection_code_versions
  union all select 'registrations', count(*), 2 from public.registrations
  union all select 'payments', count(*), 2 from public.payments
  union all select 'seats', count(*), 72 from public.seats
  union all select 'seat_assignments', count(*), 2 from public.seat_assignments
),
identity_issues as (
  select
    count(*) filter (where i.provider <> 'email') as non_email_provider_count,
    count(*) filter (where i.provider_user_id <> u.auth_user_id::text) as provider_user_id_mismatch_count,
    count(*) filter (where i.provider_user_id like '%@%') as provider_user_id_looks_like_email_count
  from public.users u
  join public.user_auth_identities i on i.user_id = u.id
),
payment_setup as (
  select
    count(*) as collection_code_count,
    count(*) filter (where status = 'active') as active_collection_code_count,
    count(*) filter (where qr_file_url is null or length(trim(qr_file_url)) = 0) as missing_qr_count
  from public.collection_code_versions
),
payment_counts as (
  select
    count(*) as payment_count,
    count(*) filter (where status = 'confirmed') as confirmed_count,
    count(*) filter (where status = 'submitted') as submitted_count
  from public.payments
),
storage_summary as (
  select
    count(*) as bucket_count,
    count(*) filter (where public = false) as private_bucket_count
  from storage.buckets
  where id in (select name from expected_buckets)
),
coverage_summary as (
  select
    (select count(*) from expected_tables e left join pg_catalog.pg_class c on c.relname = e.name left join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public' where c.oid is null) as missing_table_count,
    (select count(*) from expected_tables e join pg_catalog.pg_class c on c.relname = e.name join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public' where coalesce(c.relrowsecurity, false) = false) as rls_disabled_table_count,
    (select count(*) from expected_types e left join pg_catalog.pg_type t on t.typname = e.name left join pg_catalog.pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public' where t.oid is null) as missing_type_count,
    (select count(*) from expected_functions e left join pg_catalog.pg_proc p on p.proname = e.name left join pg_catalog.pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public' where p.oid is null) as missing_function_count,
    (select count(*) from expected_buckets e left join storage.buckets b on b.id = e.name where b.id is null) as missing_bucket_count
)
select
  'seed_count:' || name as check_name,
  actual >= expected_minimum as ok,
  jsonb_build_object('actual', actual, 'expected_minimum', expected_minimum) as details
from seed_counts
union all
select
  'identity_integrity',
  non_email_provider_count = 0
    and provider_user_id_mismatch_count = 0
    and provider_user_id_looks_like_email_count = 0,
  to_jsonb(identity_issues)
from identity_issues
union all
select
  'payment_setup',
  collection_code_count >= 1
    and active_collection_code_count >= 1
    and missing_qr_count = 0,
  to_jsonb(payment_setup)
from payment_setup
union all
select
  'payment_records',
  payment_count >= 2 and confirmed_count >= 1 and submitted_count >= 1,
  to_jsonb(payment_counts)
from payment_counts
union all
select
  'storage_buckets',
  bucket_count = 8 and private_bucket_count = 8,
  to_jsonb(storage_summary)
from storage_summary
union all
select
  'object_coverage',
  missing_table_count = 0
    and rls_disabled_table_count = 0
    and missing_type_count = 0
    and missing_function_count = 0
    and missing_bucket_count = 0,
  to_jsonb(coverage_summary)
from coverage_summary
order by check_name;
