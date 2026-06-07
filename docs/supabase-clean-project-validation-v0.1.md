# GatherUp commercial v0.1 clean Supabase validation checklist

Last updated: 2026-06-07

Use this checklist for the first full execution of GatherUp commercial v0.1 SQL against a fresh Supabase dev/staging project.

This document is intentionally operational. The goal is to make the real database validation repeatable, auditable, and easy to debug when Supabase returns an error.

## Copy-ready SQL Files

Use these SQL files in Supabase SQL Editor instead of copying query blocks from Markdown:

- [`supabase/validation/00-clean-project-preflight.sql`](../supabase/validation/00-clean-project-preflight.sql)
- [`supabase/validation/01-coverage-audit.sql`](../supabase/validation/01-coverage-audit.sql)
- [`supabase/validation/02-post-seed-counts.sql`](../supabase/validation/02-post-seed-counts.sql)
- [`supabase/validation/03-identity-integrity.sql`](../supabase/validation/03-identity-integrity.sql)
- [`supabase/validation/04-payment-setup.sql`](../supabase/validation/04-payment-setup.sql)
- [`supabase/validation/05-storage-buckets.sql`](../supabase/validation/05-storage-buckets.sql)

## 1. Validation Goal

Validate that these files execute cleanly in a real Supabase project:

- `supabase/schema.sql`
- `supabase/seed.sql`
- `supabase/storage.sql`

This phase is complete only when:

- The target project is confirmed fresh or disposable.
- `schema.sql` succeeds.
- `seed.sql` succeeds.
- `storage.sql` succeeds.
- Post-execution count checks pass.
- Identity, payment, seat, and Storage readiness checks pass.
- Any failure is recorded with the exact Supabase error, fixed locally, tested, committed, and retried on a clean target.

## 2. Target Project Rules

Required target posture:

- Supabase project environment: dev or staging.
- Region: any region is acceptable for validation, but Tokyo is preferred if this will later become Japan/Asia staging.
- Database: fresh or disposable.
- Auth: email provider enabled.
- Storage: enabled.
- Production user data: none.

Do not use the current live `gatherup` project for full schema execution. It is already partially initialized.

Before running write SQL, run:

```text
supabase/validation/00-clean-project-preflight.sql
```

Expected result for clean validation:

- `public_tables = 0`
- `custom_types = 0`

If either value is greater than `0`, stop and do not run `schema.sql`.

## 3. Local Preflight

Run locally before using Supabase SQL Editor:

```bash
npm run verify
npm run build
git diff --check
git status -sb
```

Expected:

- Tests pass.
- TypeScript passes.
- Production build passes.
- No whitespace errors.
- Working tree contains only intentional changes.

## 4. Schema Execution

Supabase Dashboard path:

```text
Project -> SQL Editor -> New query
```

Action:

1. Open `supabase/schema.sql`.
2. Copy the full file.
3. Paste into a new SQL Editor query.
4. Run once.

Expected success:

- Custom enum types are created.
- Public tables are created.
- Indexes are created.
- Trigger/helper functions are created.
- Triggers are attached.
- RLS is enabled on every public table.
- Policies are created.

If it fails, record:

```text
Step: schema.sql
Supabase project ref:
Exact error:
Line number or highlighted block:
Statement type: create type / create table / alter table / create policy / create function / trigger / other
Screenshot/export available: yes/no
```

Then stop. Do not run seed or Storage SQL until the schema failure is fixed.

## 5. Seed Execution

Run this only after `schema.sql` succeeds.

Action:

1. Open `supabase/seed.sql`.
2. Copy the full file.
3. Paste into a new SQL Editor query.
4. Run once.

Expected success:

- Demo users are inserted.
- Demo auth identities are inserted.
- Demo event is inserted.
- Event organizer roles are inserted.
- Organizer verification is inserted.
- Platform settings are inserted.
- Collection code version is inserted.
- Registrations are inserted.
- Payment rows are created or updated as expected.
- Seats and seat assignments are inserted.

If it fails, record:

```text
Step: seed.sql
Supabase project ref:
Exact error:
Line number or highlighted block:
Likely category: missing parent / duplicate key / enum mismatch / missing function / policy issue / other
Screenshot/export available: yes/no
```

Then stop. Do not run Storage SQL until the seed failure is understood.

## 6. Storage Execution

Run this only after `schema.sql` succeeds. Seed success is strongly preferred before Storage execution because some policies rely on business tables and helper functions.

Action:

1. Open `supabase/storage.sql`.
2. Copy the full file.
3. Paste into a new SQL Editor query.
4. Run once.

Expected success:

- Required private buckets are created.
- Storage policies are created on `storage.objects`.
- Policy checks use business-id-based object paths.
- Payment, refund, collection code, expense, complaint, activity material, and export access rules are present.

If it fails, record:

```text
Step: storage.sql
Supabase project ref:
Exact error:
Line number or highlighted block:
Likely category: missing storage schema / missing bucket / duplicate policy / missing helper function / policy expression error / other
Screenshot/export available: yes/no
```

## 7. Post-Execution Count Checks

Run after schema and seed succeed:

```text
supabase/validation/02-post-seed-counts.sql
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

## 8. Identity Integrity Check

Run:

```text
supabase/validation/03-identity-integrity.sql
```

Expected:

- `provider = 'email'` for demo identities.
- `provider_user_id = auth_user_id::text`.
- `provider_user_id` is not an email address.
- `auth_user_id` remains the durable Supabase Auth anchor.

## 9. Payment Setup Check

Run:

```text
supabase/validation/04-payment-setup.sql
```

Expected:

- Demo event is `registration_open`.
- Demo visibility is `public`.
- Demo price is greater than `0`.
- Collection method is organizer-side collection, currently `wechat` in seed data.
- Collection code status is `active`.
- QR path is present, but the actual file may not exist yet.

This file also checks:

- Each demo registration has one payment row.
- Confirmed demo registration has confirmed payment.
- Submitted demo registration has submitted payment.

## 10. Storage Bucket Check

Run after `storage.sql` succeeds:

```text
supabase/validation/05-storage-buckets.sql
```

Expected:

- 8 rows returned.
- `public = false` for all rows.

## 11. Failure Handling Loop

For each real SQL failure:

1. Record the failure in `docs/supabase-live-validation-log-v0.1.md`.
2. Fix the smallest responsible SQL block.
3. Add or update a contract test if the failure can be caught statically.
4. Run:

```bash
npm run verify
npm run build
git diff --check
```

5. Commit the fix.
6. Retry on a fresh dev/staging database or on a clean reset of the disposable validation database.

Do not patch the live production-like project directly until clean validation succeeds.

## 12. Handoff Template

When reporting a Supabase result back into the project thread, use this format:

```text
Supabase validation report
Project name:
Project ref:
Environment: dev/staging/live
Step: preflight/schema/seed/storage/post-check
Result: success/failure
Exact error if failure:
Rows or counts if success:
Screenshot/export available: yes/no
```
