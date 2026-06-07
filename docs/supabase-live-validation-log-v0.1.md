# GatherUp commercial v0.1 Supabase live validation log

Last updated: 2026-06-06

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

## 2026-06-07 Clean Dev/Staging Preparation

Actions completed:

1. Created a new Supabase organization for isolated validation:
   - Organization name: `GatherUp Dev`
   - Plan shown in Dashboard: `Free`
   - Organization ref shown in project creation URL: `juvctqcorlckelbvhefc`
2. Opened the new project creation page under `GatherUp Dev`.
3. Set the intended validation project name to:
   - `gatherup-commercial-v01-validation`
4. Confirmed the project creation defaults that need attention before creating the project:
   - `Enable Data API`: enabled by default.
   - `Automatically expose new tables`: enabled by default, but should be disabled for controlled RLS/service validation.
   - `Enable automatic RLS`: disabled by default.
   - Region selector displayed `Asia-Pacific`; exact city/region still needs confirmation before project creation.

Current state:

- The clean validation organization exists.
- The clean validation project has not yet been confirmed as created.
- No `schema.sql`, `seed.sql`, `storage.sql`, or validation SQL has been executed against the clean validation project yet.
- Browser interaction became unstable while handling the database password/autofill prompt, so SQL execution was not started.

Required next step:

1. Reopen the Supabase Dashboard.
2. Go to organization `GatherUp Dev`.
3. Finish creating project `gatherup-commercial-v01-validation`.
4. Before clicking create, verify:
   - Region is appropriate for dev/staging, preferably Tokyo/Japan if available.
   - Database password is saved somewhere safe outside the repository, such as the browser password manager.
   - `Automatically expose new tables` is disabled.
5. After project creation finishes, run `supabase/validation/00-clean-project-preflight.sql`.

Important:

- Do not record database passwords in repository files.
- Do not run SQL against the live `gatherup` project.
