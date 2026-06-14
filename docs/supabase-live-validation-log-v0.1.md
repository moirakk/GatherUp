# GatherUp commercial v0.1 Supabase live validation log

Last updated: 2026-06-12

This log records real Supabase validation attempts and findings. It is not a replacement for the SQL execution runbook; it captures what actually happened against a live project.

## 2026-06-05 Live Project Preflight

Project:

- Supabase project name: `gatherup`
- Supabase project ref: `mmqsirjrugprldjnvdtj`
- Dashboard branch label: `main`
- Dashboard environment label: `PRODUCTION`
- Region: Northeast Asia (Tokyo), `ap-northeast-1`
- Compute: Nano

Actions completed:

1. Restored the paused Supabase project from the Dashboard.
2. Confirmed the SQL Editor is available after restoration.
3. Ran a read-only preflight query against the primary database.

Preflight result:

- Existing target public tables: `8`
- Existing target custom types: `8`

Existing target public tables:

- `event_organizers`
- `events`
- `payments`
- `registrations`
- `seat_assignments`
- `seats`
- `user_auth_identities`
- `users`

Existing target custom types:

- `auth_identity_provider`
- `event_category`
- `event_status`
- `event_template`
- `event_visibility`
- `payment_status`
- `registration_status`
- `seat_status`

Conclusion:

- This project is not an empty validation database.
- Do not run the full `supabase/schema.sql` directly against this project.
- Running the full schema as-is would conflict with existing `create type` and `create table` statements.

Required next step:

1. Run the read-only coverage audit query from the runbook to compare the live database against the current schema draft.
2. Choose one of these paths before any write SQL:
   - Create a fresh dev/staging Supabase project and run the full schema there.
   - Reset/rebuild this project only if its current data can be discarded.
   - Write an incremental migration from the current live schema to the commercial v0.1 schema.

Current recommendation:

- Use a fresh dev/staging Supabase project for first full execution of `schema.sql`, `seed.sql`, and `storage.sql`.
- Treat the current `gatherup` project as a partially initialized environment until coverage audit proves otherwise.

## 2026-06-06 Live Project Coverage Audit

Actions completed:

1. Opened a new Supabase SQL Editor query in the live `gatherup` project.
2. Ran the read-only schema presence and RLS coverage audit from the runbook.
3. Exported the SQL result as JSON for local summarization.

Audit result:

- Total rows returned: `89`
- Expected public tables: `30`
- Existing public tables: `15`
- Missing public tables: `15`
- Existing tables with RLS enabled: `15`
- Existing tables with RLS disabled: `0`
- Expected custom types: `39`
- Existing custom types: `15`
- Missing custom types: `24`
- Expected functions: `12`
- Existing functions: `9`
- Missing functions: `3`
- Expected storage buckets: `8`
- Existing storage buckets: `0`
- Missing storage buckets: `8`

Existing public tables:

- `announcements`
- `audit_logs`
- `event_expenses`
- `event_finance_settings`
- `event_order_counters`
- `event_organizers`
- `events`
- `payment_proofs`
- `payments`
- `registration_attendees`
- `registrations`
- `seat_assignments`
- `seats`
- `user_auth_identities`
- `users`

Missing public tables:

- `activity_materials`
- `admin_users`
- `check_ins`
- `collection_code_versions`
- `complaints`
- `export_jobs`
- `notification_deliveries`
- `organizer_verifications`
- `platform_settings`
- `refund_proofs`
- `refund_requests`
- `review_requests`
- `seat_locks`
- `user_public_id_history`
- `waitlist_entries`

Existing custom types:

- `announcement_status`
- `auth_identity_provider`
- `contact_type`
- `event_category`
- `event_expense_category`
- `event_expense_status`
- `event_fee_mode`
- `event_organizer_role`
- `event_status`
- `event_template`
- `event_visibility`
- `order_number_format`
- `payment_status`
- `registration_status`
- `seat_status`

Missing custom types:

- `activity_material_type`
- `activity_material_visibility`
- `admin_role`
- `admin_status`
- `audit_risk_level`
- `check_in_status`
- `collection_code_status`
- `complaint_status`
- `complaint_target_type`
- `export_status`
- `location_visibility`
- `notification_channel`
- `notification_delivery_status`
- `organizer_verification_status`
- `payment_proof_status`
- `payment_proof_type`
- `platform_setting_value_type`
- `price_visibility`
- `refund_status`
- `review_status`
- `review_target_type`
- `seat_lock_status`
- `seat_selection_mode`
- `waitlist_status`

Existing functions:

- `can_edit_event`
- `can_manage_event`
- `can_manage_event_finance`
- `create_payment_for_registration`
- `current_app_user_id`
- `mark_payment_submitted_from_proof`
- `prevent_public_id_over_limit`
- `set_updated_at`
- `sync_seat_status_on_assignment`

Missing functions:

- `can_handle_event_refunds`
- `can_manage_event_payments`
- `is_platform_admin`

Missing storage buckets:

- `activity-covers`
- `activity-materials`
- `collection-codes`
- `complaint-evidence`
- `expense-proofs`
- `exports`
- `payment-proofs`
- `refund-proofs`

Conclusion:

- The live `gatherup` project is a partially initialized GatherUp database.
- It should not receive the full `supabase/schema.sql` as-is.
- Because all existing expected tables have RLS enabled, the partial database is not obviously unsafe at the table-RLS layer, but it is incomplete for commercial v0.1.

Recommended next step:

1. Create and validate against a fresh dev/staging Supabase project first.
2. After the clean dev/staging execution passes, decide whether to rebuild the live project or write an incremental migration for the missing objects above.

## 2026-06-07 Clean Dev/Staging Execution

Actions completed:

1. Created a new Supabase organization for isolated validation:
   - Organization name: `GatherUp Dev`
   - Plan shown in Dashboard: `Free`
   - Organization ref shown in project creation URL: `juvctqcorlckelbvhefc`
2. Created the clean validation project:
   - Supabase project name: `gatherup-commercial-v01-validation`
   - Supabase project ref: `oxbrxkllftyevlzmiydt`
   - Dashboard URL: `https://supabase.com/dashboard/project/oxbrxkllftyevlzmiydt`
   - API URL: `https://oxbrxkllftyevlzmiydt.supabase.co`
   - Dashboard branch label: `main`
   - Dashboard environment label: `PRODUCTION`
   - Region: Tokyo, `ap-northeast-1`
   - Compute: Nano, `t4g.nano`
3. Confirmed project creation posture:
   - `Enable Data API`: enabled.
   - `Automatically expose new tables`: disabled before creation.
   - `Enable automatic RLS`: left disabled because `supabase/schema.sql` explicitly enables RLS on all public tables.
4. Ran `supabase/validation/00-clean-project-preflight.sql`.
5. Ran `supabase/schema.sql`.
6. Ran `supabase/seed.sql`.
7. Ran `supabase/storage.sql`.

Preflight result:

- Existing target public tables: `0`
- Existing target custom types: `0`
- Conclusion: safe clean first-run validation target.

Execution result:

- `supabase/schema.sql`: succeeded with `Success. No rows returned`.
- `supabase/seed.sql`: succeeded with `Success. No rows returned`.
- `supabase/storage.sql`: first attempt failed, then succeeded after local fix.

Storage failure:

```text
ERROR: 22P02: invalid input value for enum activity_material_visibility: "public"
```

Root cause:

- `supabase/schema.sql` defines `activity_material_visibility` as:
  - `participant`
  - `organizer_internal`
- `supabase/storage.sql` still referenced older draft values:
  - `public`
  - `participants_only`

Fix applied:

- Updated the activity material Storage read policy to use `m.visibility = 'participant'`.
- Removed the stale `participants_only` participant-registration branch from the Storage policy.
- This aligns Storage access with the table-level `activity_materials` read policy, where participant-visible materials are represented by `participant`.

Current state:

- Clean dev/staging schema execution is validated through `schema.sql`, `seed.sql`, and corrected `storage.sql`.
- The corrected `storage.sql` has been rerun successfully in the Supabase SQL Editor.
- The SQL Editor became unstable while attempting follow-up validation queries, so the post-execution validation queries below still need to be run and recorded.

Remaining validation queries:

1. `supabase/validation/02-post-seed-counts.sql`
2. `supabase/validation/03-identity-integrity.sql`
3. `supabase/validation/04-payment-setup.sql`
4. `supabase/validation/05-storage-buckets.sql`
5. `supabase/validation/01-coverage-audit.sql`

Local verification after the Storage fix:

- `npm run verify`: passed.
- `npm run build`: passed.
- `git diff --check`: passed.

Important:

- Do not record database passwords in repository files.
- Do not run SQL against the live `gatherup` project.

## 2026-06-12 Public Read Grant Follow-Up

Reason:

- The public event detail page is intentionally visible before login for public and link-only events.
- The existing RLS policies allowed the public surfaces, but the schema grant section did not yet grant anonymous `select` on those public-facing tables.
- Without the grants, the first Supabase-backed public read path could fail even when RLS policy logic is correct.

Local changes completed:

1. Added anonymous read grants in `supabase/schema.sql` for only the public event detail surfaces:
   - `public.events`
   - `public.announcements`
   - `public.activity_materials`
2. Added anonymous execute grants for helper functions referenced by public read RLS policies:
   - `public.current_app_user_id()`
   - `public.can_manage_event(uuid)`
   - `public.is_platform_admin()`
3. Kept sensitive workflow tables private to authenticated/service flows:
   - `registrations`
   - `payments`
   - `payment_proofs`
   - `refund_requests`
   - `refund_proofs`
4. Added a schema contract test to prevent accidental anonymous grants on sensitive workflow tables.
5. Added `supabase/validation/06-public-read-grants.sql` as a patch for clean dev/staging databases that were created before the grant update.
6. Added `supabase/validation/07-clean-dev-post-execution-summary.sql` to consolidate post-execution validation into one result table.

Real SQL execution status:

- `06-public-read-grants.sql`: pending in Supabase SQL Editor.
- `07-clean-dev-post-execution-summary.sql`: pending in Supabase SQL Editor.

Blocker:

- The local environment rejected the required system-clipboard authorization used to paste SQL into the already-authenticated Supabase SQL Editor.
- Because the approval denial explicitly prohibited indirect workarounds, the SQL Editor execution step was not forced through another path.

Next required action:

1. Run `supabase/validation/06-public-read-grants.sql` in the clean dev/staging project `oxbrxkllftyevlzmiydt`.
2. Run `supabase/validation/07-clean-dev-post-execution-summary.sql` in the same project.
3. Record the resulting rows here. The expected state is that every returned row has `ok = true`.

## 2026-06-12 First Supabase-Backed Public Reads

Local application changes completed:

1. Added a server-side Supabase client in `src/lib/supabase/server.ts`.
2. Added `src/lib/events-data.ts` as the first real-data adapter for public event reads.
3. Updated `/` to load activity square data through `getPublicEvents()`.
4. Updated `/events/[eventId]` to load event detail data through `getPublicEventDetail()`.
5. Preserved mock fallback behavior for local development and unavailable Supabase environments.

Current read behavior:

- Activity square lists only `visibility = 'public'` events.
- Event detail can be loaded by UUID or `public_code`.
- Public and link-only detail access remains governed by database RLS.
- Published announcements are read from Supabase when available.
- Registration counts, payment counts, seat counts, organizer public profile data, and write workflows remain mock/future-service-layer work.

Local verification:

- `npm run verify`: passed before this documentation update.
- `npm run build`: passed before this documentation update.
- `git diff --check`: passed before this documentation update.

## 2026-06-14 Atomic Registration RPC Draft

Reason:

- The early `/api/orders` implementation generated order numbers in application code by counting registrations.
- That approach is not safe under concurrent registration bursts because two users can observe the same count and attempt the same order number.
- Capacity checks also need to happen inside the same database transaction path as registration creation.

Local changes completed:

1. Added `public.create_registration_atomic(...)` to `supabase/schema.sql`.
2. The RPC uses the current GatherUp schema instead of external draft field names:
   - `events.price_cents`
   - `event_order_counters.current_number`
   - `registrations.order_number`
   - `registration_answers` and `form_answers`
   - `registration_attendees.public_id` / `display_name`
3. The RPC intentionally does not handle seat selection yet. Seat locking remains a separate future RPC because the confirmed product flow is payment confirmation before seat selection.
4. Updated `/api/orders` to call the RPC with a user JWT client when Supabase Auth is available.
5. Added `supabase/validation/08-create-registration-rpc-contract.sql` for live database contract verification.
6. Updated coverage validation expected function lists to include `create_registration_atomic`.
7. Added local schema contract coverage for the RPC.

Local verification:

- `npm run verify`: passed with `29` tests.
- `npm run build`: passed after clearing stale `.next` build cache.
- `git diff --check`: pending final pre-commit run.

Real SQL execution status:

- `create_registration_atomic` has not yet been applied to the clean Supabase project.
- Required next SQL sequence on clean dev/staging:
  1. Apply the updated `supabase/schema.sql` or an equivalent migration containing `create_registration_atomic`.
  2. Run `supabase/validation/08-create-registration-rpc-contract.sql`.
  3. Re-run `supabase/validation/07-clean-dev-post-execution-summary.sql`.
