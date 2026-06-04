# GatherUp commercial v0.1 Supabase SQL execution runbook

Last updated: 2026-06-02

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

## 2. Create A Fresh Supabase Project

For the first commercial v0.1 validation, use a fresh Supabase project or an empty dev database.

Do not run the current schema draft on a production database.

Recommended project posture:

- Environment: development or staging.
- Auth: email enabled.
- RLS: keep enabled.
- Storage: buckets can wait until schema execution succeeds.

## 3. Execute Schema In SQL Editor

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

## 4. Execute Seed

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

## 5. Post-Execution SQL Checks

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

## 6. Identity Checks

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

## 7. Event And Payment Setup Checks

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

## 8. RLS Smoke Checks

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

## 9. Execute Storage Policies

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

## 10. Completion Criteria

This phase is complete only when:

- `schema.sql` executes cleanly in Supabase/PostgreSQL.
- `seed.sql` executes cleanly.
- `storage.sql` executes cleanly.
- Post-execution count checks match expected minimums.
- Identity checks confirm Supabase Auth id is the durable provider id.
- Demo event payment setup exists.
- At least one real test account can log in and sync into `public.users`.
- `/dev/status` reports Supabase Auth, profile sync, and commercial schema readiness.
