# GatherUp commercial v0.1 Supabase SQL execution runbook

Last updated: 2026-06-05

This runbook is for executing `supabase/schema.sql`, `supabase/seed.sql`, and `supabase/storage.sql` against a real Supabase/PostgreSQL environment.

The local workspace currently does not have `psql`, Supabase CLI, or Docker, so local SQL execution is not available yet. Use the Supabase SQL Editor first, or install a PostgreSQL/Supabase local toolchain later.

## 1. Preflight

Run these local checks before touching the real database:

```bash
npm test
npm run typecheck
npm run build
```

Expected:

- Auth and schema contract tests pass.
- TypeScript passes.
- Next build passes.

Important: static tests do not prove PostgreSQL execution. They catch contract mistakes before SQL Editor execution, including table presence, enum values, foreign-key table order, enum definition order, RLS policy targets, function ordering, seed insert order, and seed conflict targets.

## 2. Live Database Safety Preflight

Before running any write SQL against a Supabase project, confirm the target is a fresh dev/staging database or explicitly safe to rebuild.

Do not run the current schema draft directly against a database that already contains target GatherUp tables or enum types. The draft uses direct `create type` and `create table` statements, so it is intended for first execution on a clean database, not as an incremental production migration.

Run this read-only query first:

```sql
select
  'public_tables' as check_name,
  count(*) as existing_count,
  string_agg(tablename, ', ' order by tablename) as existing_names
from pg_catalog.pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'user_auth_identities',
    'user_public_id_history',
    'events',
    'event_organizers',
    'registrations',
    'payments',
    'seats',
    'seat_assignments',
    'collection_code_versions',
    'organizer_verifications'
  )
union all
select
  'custom_types' as check_name,
  count(*) as existing_count,
  string_agg(t.typname, ', ' order by t.typname) as existing_names
from pg_catalog.pg_type t
join pg_catalog.pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public'
  and t.typname in (
    'event_category',
    'event_template',
    'event_visibility',
    'event_status',
    'registration_status',
    'payment_status',
    'seat_status',
    'auth_identity_provider'
  );
```

Expected for a clean first-run validation database:

- `public_tables = 0`
- `custom_types = 0`

If either count is greater than `0`:

1. Stop immediately.
2. Do not run `supabase/schema.sql`.
3. Record the existing tables and types in the live validation log.
4. Choose one path:
   - create a fresh dev/staging project for full schema execution;
   - reset/rebuild this project only if its data can be discarded;
   - write an incremental migration from the existing live schema to the current schema draft.

Use this read-only coverage audit when a database is not empty:

```sql
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
```

## 3. Create A Fresh Supabase Project

For the first commercial v0.1 validation, use a fresh Supabase project or an empty dev database.

Do not run the current schema draft on a production database.

Recommended project posture:

- Environment: development or staging.
- Auth: email enabled.
- RLS: keep enabled.
- Storage: buckets can wait until schema execution succeeds.

## 4. Execute Schema In SQL Editor

Open Supabase Dashboard:

```text
Project → SQL Editor → New query
```

Paste the full content of:

```text
supabase/schema.sql
```

Run it once.

Expected:

- All enum types are created.
- All public tables are created.
- Indexes are created.
- Trigger functions are created before triggers.
- RLS is enabled on all public tables.
- Policies are created.

If this step fails:

1. Stop immediately.
2. Do not run `seed.sql`.
3. Copy the exact error message.
4. Record the failing line or SQL block.
5. Fix `supabase/schema.sql`.
6. Re-run `npm test`.
7. Retry on a fresh database, or drop/recreate the failed objects carefully in dev only.

## 5. Execute Seed

Only run seed after schema succeeds.

Paste the full content of:

```text
supabase/seed.sql
```

Run it once.

Expected:

- Demo users are inserted.
- Demo identities are inserted.
- Demo event is inserted.
- Owner/cohost/finance organizer roles are inserted.
- Organizer verification is inserted.
- Platform settings are inserted.
- Active organizer collection code is inserted.
- Registrations are inserted.
- Payment rows are created by trigger.
- Seats and seat assignments are inserted.

If seed fails:

1. Copy the exact error.
2. Check whether the failing insert references a missing parent row.
3. Check whether `on conflict (...)` has a matching unique constraint.
4. Check whether enum values match `schema.sql`.
5. Fix `seed.sql` or `schema.sql`.
6. Re-run `npm test`.

## 6. Post-Execution SQL Checks

Run these queries after schema and seed:

```sql
select count(*) as users from public.users;
select count(*) as identities from public.user_auth_identities;
select count(*) as events from public.events;
select count(*) as event_organizers from public.event_organizers;
select count(*) as organizer_verifications from public.organizer_verifications;
select count(*) as collection_code_versions from public.collection_code_versions;
select count(*) as registrations from public.registrations;
select count(*) as payments from public.payments;
select count(*) as seats from public.seats;
select count(*) as seat_assignments from public.seat_assignments;
```

Expected minimums:

- `users >= 3`
- `identities >= 3`
- `events >= 1`
- `event_organizers >= 3`
- `organizer_verifications >= 1`
- `collection_code_versions >= 1`
- `registrations >= 2`
- `payments >= 2`
- `seats >= 72`
- `seat_assignments >= 2`

## 7. Identity Checks

Run:

```sql
select
  u.id,
  u.auth_user_id,
  u.email,
  i.provider,
  i.provider_user_id,
  i.email as identity_email
from public.users u
join public.user_auth_identities i on i.user_id = u.id
order by u.id;
```

Expected:

- `provider = 'email'`
- `provider_user_id = auth_user_id::text`
- `identity_email` may equal user email.
- `provider_user_id` must not be an email address.

## 8. Event And Payment Setup Checks

Run:

```sql
select
  e.public_code,
  e.status,
  e.visibility,
  e.price_cents,
  c.method,
  c.status as collection_code_status,
  c.qr_file_url
from public.events e
join public.collection_code_versions c on c.event_id = e.id;
```

Expected:

- Event status is `registration_open`.
- Visibility is `public` for demo seed.
- Price is greater than 0.
- Collection code method is `wechat`.
- Collection code status is `active`.
- QR file path is stored, but actual Storage file may not exist yet.

Run:

```sql
select
  r.order_number,
  r.status as registration_status,
  p.status as payment_status,
  p.amount_cents
from public.registrations r
join public.payments p on p.registration_id = r.id
order by r.order_number;
```

Expected:

- Each registration has one payment row.
- Confirmed demo order has confirmed payment.
- Submitted demo order has submitted payment.

## 9. RLS Smoke Checks

RLS needs authenticated Supabase users to test properly. After creating real test accounts, verify:

- Anonymous users can read public/unlisted event detail only where intended.
- Anonymous users cannot read payment proofs.
- Participants can read their own registrations and payments.
- Participants cannot read another participant's payment proof.
- Owner and finance can read payment proofs.
- Cohost cannot read payment proofs unless `permissions.can_manage_payments = true`.
- Admin can read admin-only tables.

This runbook does not replace the full RLS role matrix in:

```text
docs/schema-validation-checklist-v0.1.md
```

## 10. Execute Storage Policies

Do not upload real payment or refund proof files until private Storage buckets and policies exist.

Required buckets for commercial v0.1:

- `activity-covers`
- `activity-materials`
- `collection-codes`
- `payment-proofs`
- `refund-proofs`
- `expense-proofs`
- `complaint-evidence`
- `exports`

First Storage priority:

1. `collection-codes`
2. `payment-proofs`
3. `refund-proofs`
4. `exports`

After schema succeeds, run:

```text
supabase/storage.sql
```

Expected:

- Required buckets are created as private buckets.
- Storage policies are created on `storage.objects`.
- Object paths include business IDs so policies can validate ownership and roles.
- Payment proof files are readable only by order owner, payment roles, or admins.
- Refund proof files are readable only by order owner, refund roles, or admins.
- Collection code files are readable only by payable order owners, payment roles, or admins.
- Export files are readable only by requester, event managers, or admins.

If Storage SQL fails:

1. Confirm `schema.sql` already succeeded.
2. Confirm helper functions such as `public.current_app_user_id()` and `public.can_manage_event_payments()` exist.
3. Confirm Supabase Storage is enabled in the project.
4. Copy the exact error message.
5. Fix `supabase/storage.sql`.
6. Re-run `npm test`.

## 11. Completion Criteria

This phase is complete only when:

- `schema.sql` executes cleanly in Supabase/PostgreSQL.
- `seed.sql` executes cleanly.
- `storage.sql` executes cleanly.
- Post-execution count checks match expected minimums.
- Identity checks confirm Supabase Auth id is the durable provider id.
- Demo event payment setup exists.
- At least one real test account can log in and sync into `public.users`.
- `/dev/status` reports Supabase Auth, profile sync, and commercial schema readiness.
