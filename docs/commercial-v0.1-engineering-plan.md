# GatherUp commercial v0.1 engineering plan

Last updated: 2026-06-02

This plan translates the commercial v0.1 PRD and schema draft into an implementation order. The goal is to avoid building surface UI before the product has reliable data, permissions, and state transitions.

## Principles

- Build the real data foundation before adding new UI.
- Treat permissions as product behavior, not frontend decoration.
- Put transaction-heavy workflows behind service functions or server actions.
- Keep mock/demo mode isolated from real Supabase mode.
- Verify every sensitive operation with RLS and audit logs.
- Ship commercial v0.1 in phases, not as one giant release.

## Phase 0. Repository And Documentation Foundation

Status: in progress.

Completed:

- Commercial v0.1 PRD.
- Commercial v0.1 decision log.
- GitHub repository profile copy.
- Documentation index.
- README rewrite.
- Commercial schema draft expansion.
- Product operating map.
- Auth and schema contract tests.

Remaining:

- Validate SQL in PostgreSQL/Supabase.
- Convert SQL draft to migrations if needed.
- Decide repository license and public/private posture before any public launch.

Acceptance:

- Docs clearly state current prototype limitations.
- README points to current source-of-truth documents.
- Schema validation checklist exists.
- `npm test` covers auth rules and schema/seed contract checks.

## Phase 1. Auth Foundation

Goal: replace prototype auth behavior with a reliable Supabase-backed account foundation.

Tasks:

- Confirm Supabase project and environment variables.
- Validate Supabase Auth email password.
- Validate Supabase email code or magic link.
- Sync `auth.users` into `public.users`.
- Ensure stable internal `user_id`.
- Keep GatherUp ID unique and editable up to 2 times.
- Implement server-side session strategy.
- Keep middleware route protection aligned with public event detail rules.
- Update `/dev/status` to check:
  - Supabase env.
  - Auth session.
  - `users` profile.
  - commercial schema tables.
  - admin bootstrap status.

Acceptance:

- Refresh keeps session.
- Direct links preserve intended destination.
- Logged-out users can view allowed event detail only.
- Registration and account actions require login.
- Demo mode remains isolated when Supabase is not configured.

## Phase 2. Commercial Schema Validation

Goal: prove the schema runs and supports the required access model.

Tasks:

- Run `supabase/schema.sql` in a real database.
- Run `supabase/seed.sql`.
- Run `supabase/storage.sql`.
- Fix SQL syntax/runtime issues.
- Keep static schema/seed contract tests passing.
- Test RLS role matrix.
- Create required Storage buckets.
- Draft Storage access policies.
- Add schema readiness checks to docs and `/dev/status`.

Acceptance:

- Schema and seed execute cleanly.
- Storage buckets and policies execute cleanly.
- RLS blocks unauthorized payment proof access.
- RLS blocks unauthorized collection code access.
- Admin-only tables are admin-only.
- Demo seed data reflects owner/cohost/finance/payment-proof flow.

## Phase 3. Organizer Verification And Admin Minimum Backend

Goal: paid activity creation has a trust gate.

Tasks:

- Implement organizer verification application.
- Implement admin bootstrap.
- Implement minimum admin dashboard:
  - verification queue.
  - review requests.
  - platform settings.
  - complaint list.
  - audit log list.
- Implement paid-event permission check.
- Implement high-risk review request creation.

Acceptance:

- Free activities can be created by ordinary users.
- Paid activities require verified organizer status.
- New organizer paid events can trigger review.
- Admin can approve/reject/suspend verification.
- Review actions write audit logs.

## Phase 4. Real Event Creation

Goal: event creation writes real database records.

Tasks:

- Replace local draft save with database draft save in Supabase mode.
- Write `events`.
- Write `event_organizers`.
- Write finance settings.
- Write collection code versions for paid events.
- Write review request when required.
- Support public/unlisted visibility.
- Support price and location visibility.
- Support event timezone and structured location.
- Support capacity, waitlist, cancellation, refund, and seat settings.

Acceptance:

- Created event persists across browser/session.
- Unlisted event is link-accessible but not listed.
- Paid event cannot publish without required verification/review.
- Event owner can invite roles.
- Unauthorized users cannot manage event.

## Phase 5. Registration, Orders, Capacity Holds

Goal: participants can create real orders.

Tasks:

- Implement order number generation transaction.
- Implement registration creation.
- Implement attendee creation.
- Support temporary attendees when enabled.
- Enforce default one-effective-order rule in service layer.
- Respect `allow_multiple_orders_per_user`.
- Create capacity hold and expiration fields.
- Implement waitlist join and manual turn-up.
- Bind registration to selected collection code version when payment starts.

Acceptance:

- Order numbers do not duplicate.
- Capacity hold prevents oversell.
- Expired unpaid order releases capacity.
- Multiple-order setting works.
- Waitlist does not hold capacity.

## Phase 6. Organizer-collected Payment Proof Workflow

Goal: payment proof review is reliable and traceable.

Tasks:

- Create Storage upload path for payment proofs.
- Insert `payment_proofs`.
- Update payment summary.
- Implement payment proof review.
- Implement rejection with resubmission.
- Implement top-up request.
- Implement overpayment handling record.
- Restrict collection code and proof access by role.
- Write audit logs for view/review/export-sensitive actions.

Acceptance:

- Participant can upload proof.
- Owner/finance can review.
- Cohost cannot review by default.
- Authorized cohost can review when granted permission.
- Payment proof can be rejected and resubmitted.
- Multiple proofs per order work.
- Order reaches confirmed only through valid review.

## Phase 7. Refund Tracking And Finance

Goal: offline refund and activity finance are tracked.

Tasks:

- Implement refund request.
- Implement organizer approval/rejection.
- Implement refund proof upload.
- Implement participant confirmation.
- Implement disputed status.
- Connect confirmed income, pending income, refunds, expenses, and balance.
- Implement expense proof upload.
- Implement finance export job.

Acceptance:

- Refund flow records all major steps.
- Refund proof access is restricted.
- Finance numbers reflect payment/refund state.
- Expense proof is optional but visible as missing when absent.

## Phase 8. Seats And Check-in

Goal: seat selection and onsite flow work without duplicate seats.

Tasks:

- Generate seats for seat-map events.
- Implement active `seat_locks`.
- Expire seat locks.
- Confirm seat assignments from active locks.
- Enforce selected seat count equals attendee count.
- Implement organizer seat adjustment.
- Implement lightweight check-in by order.
- Implement attendee-level check-in.

Acceptance:

- Two users cannot confirm the same seat.
- Expired locks release seats.
- Payment-confirmed orders can select seats only when selection is open.
- Check-in supports whole order and individual attendee states.

## Phase 9. Notifications, Materials, Export, Complaints

Goal: supporting commercial operations are real, not mock-only.

Tasks:

- Implement in-app notifications.
- Add abstract email provider.
- First email provider target: Resend.
- Implement notification delivery records.
- Implement activity materials with public/internal visibility.
- Implement export jobs and field scopes.
- Implement complaint submission and admin handling.

Acceptance:

- Notifications are recorded.
- Email delivery status is recorded.
- Internal materials are not participant-visible.
- Export logs field scope and requester.
- Complaints require login and can be viewed by admin.

## Phase 10. Hardening And Launch Readiness

Goal: make commercial v0.1 trustworthy enough for controlled use.

Tasks:

- RLS regression tests.
- Service-layer transaction tests.
- End-to-end participant flow.
- End-to-end organizer flow.
- Mobile participant QA.
- Desktop organizer QA.
- Sensitive data retention behavior.
- Terms, privacy policy, organizer self-collection disclaimer.
- Backup and incident response checklist.

Acceptance:

- Typecheck passes.
- Build passes.
- Schema executes.
- RLS matrix passes.
- Core workflows pass.
- Sensitive data is restricted.
- Audit logs exist for key operations.
- Terms and privacy pages exist before commercial launch.
