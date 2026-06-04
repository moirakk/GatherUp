# GatherUp commercial v0.1 schema validation checklist

Last updated: 2026-06-02

This checklist is used to validate `supabase/schema.sql` and `supabase/seed.sql` before treating them as a real database foundation.

## 1. Current Local Limitation

The current local workspace does not have:

- `psql`
- Supabase CLI
- Docker

Because of that, the schema has only been checked by text review and project typecheck. It has not yet been executed against PostgreSQL/Supabase in this workspace.

Static contract tests now exist and should be run before real SQL execution:

```bash
npm run test:schema
```

These tests verify required tables, enum values, foreign-key table order, enum definition order, RLS enable statements, policy table targets, helper/trigger function ordering, key helper functions, sensitive policies, seed insert order, seed conflict targets, seed alignment, Storage buckets, and Storage policy contracts. They do not replace PostgreSQL/Supabase execution.

For step-by-step real execution, use:

```text
docs/supabase-sql-execution-runbook-v0.1.md
```

## 2. Validation Goal

The goal is to prove that the commercial v0.1 schema can support:

- Users and login identities.
- GatherUp ID history.
- Organizer verification.
- Event creation and organizer roles.
- Event review and platform review queue.
- Organizer collection code versions.
- Registration orders.
- Multi-attendee orders.
- Capacity holds.
- Waitlist.
- Payment proofs and review.
- Top-up and amount differences.
- Refund requests and refund proofs.
- Seat locks and seat assignments.
- Check-in.
- Notifications.
- Activity materials.
- Export jobs.
- Complaints.
- Platform settings.
- Admin users.
- Audit logs.
- Row Level Security for participants, organizers, finance roles, and admins.

## 3. Required Environment

Use either:

- A real Supabase project.
- A local PostgreSQL 15+ database with Supabase-compatible extensions and auth simulation.
- Supabase CLI local stack.

Required extension:

- `pgcrypto`

## 4. Execution Order

Run:

```bash
psql "$DATABASE_URL" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

If using Supabase SQL Editor:

1. Paste and run `supabase/schema.sql`.
2. Paste and run `supabase/seed.sql`.
3. Confirm no enum, policy, trigger, or function errors.

## 5. Syntax Checks

Confirm:

- All enum values used in `seed.sql` exist in `schema.sql`.
- All tables referenced by foreign keys already exist.
- All functions used by policies exist before policies are created.
- All triggers reference existing functions.
- All partial unique indexes compile.
- JSONB default values and casts compile.
- RLS policies compile without ambiguous column references.

## 6. Seed Checks

After seed, verify:

```sql
select count(*) from public.users;
select count(*) from public.user_auth_identities;
select count(*) from public.events;
select count(*) from public.event_organizers;
select count(*) from public.organizer_verifications;
select count(*) from public.collection_code_versions;
select count(*) from public.registrations;
select count(*) from public.payments;
select count(*) from public.seats;
```

Expected:

- At least 3 users.
- Each seed user has one primary `email` identity whose `provider_user_id` matches the user's `auth_user_id`.
- At least 1 event.
- Event has owner, cohost, and finance organizer roles.
- Organizer has light verification.
- Event has one active collection code version.
- Demo registrations have generated payments.
- Demo seats exist.

## 7. Auth And Profile Sync Checks

The runtime profile sync expects Supabase Auth to be the durable identity anchor.

Verify:

- `users.auth_user_id` equals `auth.users.id`.
- `user_auth_identities.provider_user_id` stores the same stable Supabase Auth user id, not the email address.
- `user_auth_identities` allows only one row per `(user_id, provider)`.
- A changed email updates identity email metadata without creating a second primary identity for the same provider.
- `ensureSupabaseProfile()` creates a `users` row, then upserts the primary identity.
- Existing Supabase sessions can recreate the GatherUp cookie session after refresh or direct navigation.
- `/login?next=/some/path` redirects only to safe internal paths.
- `/events/[eventId]` remains publicly readable without a GatherUp cookie.
- Protected routes redirect unauthenticated users to `/login?next=...`.

GatherUp ID change rules:

- A user can update `public_id` at most 2 times.
- Each successful `public_id` change increments `public_id_change_count`.
- Each successful `public_id` change writes one `user_public_id_history` row.
- `user_public_id_history.changed_by` resolves from the current Supabase Auth user when available.
- A third change raises `public_id can only be changed twice`.

## 8. RLS Role Test Matrix

Create or simulate these users:

- Participant who owns an order.
- Participant who does not own the order.
- Event owner.
- Cohost without payment permission.
- Cohost with `can_manage_payments`.
- Finance organizer.
- Staff organizer.
- Viewer organizer.
- Super admin.

Test each role can or cannot read:

- Event.
- Registration.
- Payment.
- Payment proof.
- Collection code version.
- Refund request.
- Refund proof.
- Seat lock.
- Seat assignment.
- Check-in.
- Export job.
- Complaint.
- Audit log.
- Platform settings.

## 9. Sensitive Access Rules To Verify

Payment proof:

- Owner can view.
- Finance can view.
- Cohost cannot view by default.
- Cohost can view only when `event_organizers.permissions.can_manage_payments = true`.
- Staff and viewer cannot view.
- Order owner can view their own proof.

Collection code:

- Participant can view only when their order is in a payable state.
- Logged-in user without an order cannot view.
- Owner and finance can view.
- Admin can view.

Refund proof:

- Order owner can view.
- Owner and finance can view.
- Admin can view.
- Cohost cannot view by default.

Export jobs:

- Requester can view.
- Event managers can view.
- Admin can view.
- Field scope must be recorded.

Platform settings:

- Admin only.

## 10. Service Layer Transaction Tests

These cannot be solved by schema alone and must be validated in service/server-action code.

Required transactions:

- Generate order number without duplicates.
- Create registration and capacity hold.
- Expire capacity hold.
- Bind collection code version to order at payment-page time.
- Upload payment proof and update payment summary.
- Confirm payment proof and recompute confirmed amount.
- Request top-up and keep capacity held.
- Process refund status changes.
- Create active seat locks without duplicate active lock.
- Confirm seat assignment from locks.
- Convert waitlist entry to registration invitation.
- Create export job with field scope.
- Write audit logs for sensitive operations.

## 11. Storage Policy Checks

Storage buckets needed:

- `activity-covers`
- `activity-materials`
- `collection-codes`
- `payment-proofs`
- `refund-proofs`
- `expense-proofs`
- `complaint-evidence`
- `exports`

Verify:

- `supabase/storage.sql` executes after `supabase/schema.sql`.
- All required buckets are private.
- Payment proof files are not public.
- Refund proof files are not public.
- Collection code files are not public outside payable order access.
- Export files expire or require signed URLs.
- Admin access to sensitive files is logged in app audit logs.

## 12. Known Follow-up Work

After SQL execution succeeds:

1. Convert schema changes into migrations if using Supabase migrations.
2. Add service-layer functions for transaction-heavy workflows.
3. Add RLS test fixtures.
4. Add Storage bucket creation and policies.
5. Update frontend data access away from mock data.
6. Update `/dev/status` to check commercial schema readiness.
