-- GatherUp commercial v0.1 expected object coverage audit.
-- Run this when a database is not empty, or after validation execution
-- to compare actual objects against the current schema/storage drafts.

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
)
select 'table' as object_kind, e.name, (c.relname is not null) as exists, coalesce(c.relrowsecurity, false) as rls_enabled
from expected_tables e
left join pg_catalog.pg_class c on c.relname = e.name
left join pg_catalog.pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.oid is null or n.nspname = 'public'
union all
select 'type' as object_kind, e.name, (t.typname is not null) as exists, null::boolean as rls_enabled
from expected_types e
left join pg_catalog.pg_type t on t.typname = e.name
left join pg_catalog.pg_namespace n on n.oid = t.typnamespace and n.nspname = 'public'
where t.oid is null or n.nspname = 'public'
union all
select 'function' as object_kind, e.name, (p.proname is not null) as exists, null::boolean as rls_enabled
from expected_functions e
left join pg_catalog.pg_proc p on p.proname = e.name
left join pg_catalog.pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.oid is null or n.nspname = 'public'
union all
select 'storage_bucket' as object_kind, e.name, (b.id is not null) as exists, null::boolean as rls_enabled
from expected_buckets e
left join storage.buckets b on b.id = e.name
order by object_kind, name;
