# GatherUp commercial v0.1 Supabase live validation log

Last updated: 2026-06-05

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
