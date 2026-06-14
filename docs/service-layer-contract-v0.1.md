# GatherUp commercial v0.1 service-layer contract

Last updated: 2026-06-14

This document defines the service-layer operations that must exist before GatherUp commercial v0.1 can be considered reliable. UI code should not directly assemble these business transitions.

## 1. Principle

Every workflow that changes money, capacity, seat ownership, permissions, proof files, exports, complaints, or audit logs must go through a server-side service function or server action.

The service layer must:

- Validate the current Supabase Auth user.
- Resolve the current GatherUp `users.id`.
- Check organizer/admin/participant permissions.
- Run related writes in one transaction where PostgreSQL supports it.
- Write audit logs for sensitive operations.
- Return explicit success or failure states.

## 2. Required Services

### Auth Profile Sync

Operation:

- `ensureUserProfile(authUserId, email, provider, displayName, avatarUrl)`

Must:

- Create `public.users` if missing.
- Upsert `public.user_auth_identities` on `(user_id, provider)`.
- Use Supabase Auth user id as `provider_user_id`.
- Never use email as the durable provider id.

### Organizer Verification

Operation:

- `submitOrganizerVerification(input)`
- `reviewOrganizerVerification(verificationId, decision)`

Must:

- Allow users to submit their own verification.
- Allow admins to approve, reject, suspend, or require enhanced verification.
- Write audit logs for admin decisions.
- Gate paid-event publishing.

### Event Draft And Publish

Operation:

- `createEventDraft(input)`
- `updateEventDraft(eventId, input)`
- `publishEvent(eventId)`

Must:

- Create `events`, owner `event_organizers`, and `event_finance_settings`.
- Validate capacity, price, visibility, timezone, refund rule, and registration window.
- Require organizer verification for paid events.
- Create `review_requests` when risk rules require review.
- Prevent publish when required collection code or review approval is missing.

### Organizer Roles

Operation:

- `inviteEventOrganizer(eventId, userId, role, permissions)`
- `updateEventOrganizerRole(eventId, userId, role, permissions)`
- `removeEventOrganizer(eventId, userId)`

Must:

- Allow owner-level roles to manage organizer members.
- Prevent removing the last owner.
- Treat payment/refund/export permissions as sensitive.
- Write audit logs for permission changes.

### Registration And Capacity Hold

Operation:

- `createRegistration(eventId, input)`
- `expireRegistrationHold(registrationId)`
- `cancelRegistration(registrationId, reason)`

Must:

- Generate a unique order number.
- Enforce capacity before creating the registration.
- Enforce one effective order per user unless `allow_multiple_orders_per_user` is enabled.
- Create attendees.
- Set `held_until` and `payment_due_at`.
- Bind the active collection code version when the participant enters payment.
- Create the payment row through trigger or service logic.
- Release capacity when unpaid holds expire.

### Waitlist

Operation:

- `joinWaitlist(eventId, desiredQuantity)`
- `inviteWaitlistEntry(waitlistEntryId)`
- `convertWaitlistEntry(waitlistEntryId, registrationInput)`

Must:

- Never hold capacity for normal waitlist entries.
- Record invitation expiry.
- Convert only when capacity is available.
- Prevent duplicate active waitlist entries per user/event.

### Payment Proof Upload

Operation:

- `createPaymentProofUpload(registrationId, paymentId, fileMetadata)`
- `confirmPaymentProof(paymentProofId, reviewInput)`
- `rejectPaymentProof(paymentProofId, reason)`
- `requestTopup(registrationId, amountDifferenceCents)`

Must:

- Validate the uploader owns the order.
- Allow upload only for payable states.
- Use private Storage bucket `payment-proofs`.
- Insert `payment_proofs`.
- Update payment summary.
- Keep capacity held while proof is under review.
- Allow multiple proofs per order.
- Allow top-up proofs.
- Restrict review to owner, finance, or authorized cohost.
- Write audit logs for review decisions.

### Collection Code Versioning

Operation:

- `createCollectionCodeVersion(eventId, fileMetadata, instructions)`
- `activateCollectionCodeVersion(versionId)`
- `archiveCollectionCodeVersion(versionId)`

Must:

- Store files in private Storage bucket `collection-codes`.
- Version collection codes by event.
- Bind each order to the collection code version shown at payment time.
- Prevent participants without payable orders from reading collection code files.
- Write audit logs for activation and archival.

### Refunds

Operation:

- `requestRefund(registrationId, amount, reason)`
- `reviewRefundRequest(refundRequestId, decision)`
- `uploadRefundProof(refundRequestId, fileMetadata)`
- `confirmRefundReceived(refundRequestId)`
- `markRefundDisputed(refundRequestId, reason)`

Must:

- Restrict refund request creation to order owner.
- Restrict refund decisions to owner, finance, or admin.
- Store refund proof files in private Storage bucket `refund-proofs`.
- Track requested, approved, paid, confirmed, rejected, and disputed states.
- Update finance summaries through service logic.
- Write audit logs for all refund decisions.

### Seat Locks And Assignments

Operation:

- `createSeatLock(registrationId, seatId)`
- `refreshSeatLock(seatLockId)`
- `confirmSeatAssignment(seatLockId, attendeeId)`
- `expireSeatLocks(eventId)`

Must:

- Allow selection only for eligible confirmed registrations when payment-before-seat is required.
- Prevent duplicate active locks for the same seat.
- Prevent duplicate final assignment for the same seat.
- Enforce lock expiry.
- Assign seats per attendee.

### Check-in

Operation:

- `checkInAttendee(eventId, attendeeId, method)`
- `undoCheckIn(checkInId, reason)`

Must:

- Restrict check-in to event managers/staff/admin.
- Record checker, method, timestamp, and note.
- Update attendee check-in state.
- Write audit logs for undo.

### Notifications

Operation:

- `publishAnnouncement(eventId, input)`
- `createNotificationDeliveries(announcementId, audience)`
- `markNotificationDelivery(deliveryId, status)`

Must:

- Separate organizer drafts from participant-visible announcements.
- Record intended channel and delivery state.
- Keep email provider details behind an adapter.

### Exports

Operation:

- `createExportJob(eventId, fieldScope)`
- `completeExportJob(exportJobId, fileMetadata)`

Must:

- Restrict export creation to event managers.
- Store export files in private Storage bucket `exports`.
- Record field scope.
- Write audit logs for export creation and file access.

### Complaints

Operation:

- `createComplaint(input)`
- `assignComplaint(complaintId, adminId)`
- `updateComplaintStatus(complaintId, status)`

Must:

- Allow participants and organizers to submit complaints.
- Store evidence in private Storage bucket `complaint-evidence`.
- Restrict updates to admins.
- Keep complaint evidence private.
- Write audit logs for status changes.

## 3. Non-Negotiable Invariants

- No paid event can publish without organizer verification.
- No participant can see collection code files without a payable order.
- No participant can read another participant's payment proof.
- No cohost can review payment proofs unless explicitly authorized.
- No order number can duplicate within an event.
- No seat can have two active final assignments.
- No sensitive export can be created without a recorded field scope.
- No sensitive file bucket can be public.

## 4. Current Status

Implemented:

- Auth/profile adapter foundation.
- Middleware route protection foundation.
- SQL schema draft.
- Seed draft.
- Storage policy draft.
- Auth/schema/storage static contract tests.
- Atomic registration order creation through `create_registration_atomic`.
- JWT-gated organizer APIs for event creation, payment review, check-in verification, and exports.
- Initial private Storage payment-proof path: browser upload to `payment-proofs`, then `/api/orders/payment-proof` verifies user ownership, payment binding, object path, and Storage object existence before inserting `payment_proofs`.
- Initial participant refund request/review RPC/API drafts that restrict requests to owned confirmed orders, restrict review to refund managers, update registration/payment/refund state, and write `audit_logs`.
- Initial seat-lock RPC/API drafts and order-detail UI wiring for expiring stale locks, creating active locks, and confirming seat assignments under database constraints.
- Initial check-in RPC/API draft that updates registration state, attendee state, `check_ins`, and `audit_logs` in one database function.

Not implemented yet:

- Transactional service functions.
- Server actions for commercial workflows.
- End-to-end real Supabase session/RLS validation for Storage uploads.
- End-to-end real Supabase session/RLS validation for refund requests and review.
- End-to-end real Supabase session/RLS validation for seat-lock RPCs and UI wiring.
- End-to-end real Supabase session/RLS validation for check-in verification.
- Real RLS role matrix execution in Supabase.
- Audit log writes from service operations.
