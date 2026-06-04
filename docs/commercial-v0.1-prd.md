# GatherUp commercial v0.1 PRD

Last updated: 2026-06-02

Related source of truth:

- [Commercial decision log](./decision-log-v0.1.md)
- [Current project state](./current-state-v0.1.md)
- [Product operating map](./product-operating-map-v0.1.md)
- [Commercial engineering plan](./commercial-v0.1-engineering-plan.md)
- [Schema validation checklist](./schema-validation-checklist-v0.1.md)
- [Service-layer contract](./service-layer-contract-v0.1.md)

## 1. Product Goal

GatherUp commercial v0.1 is a real, reliable event operations product for small offline community activities.

The first priority scenario is community/fandom activity operations, including offline screenings, birthday cafes, and small fan gatherings. The platform must remain generic enough to support campus activities, workshops, small conferences, private gatherings, and markets later.

The commercial v0.1 goal is not to create more prototype screens. It is to support a complete, permissioned, auditable workflow:

1. Organizer becomes eligible to create a paid event.
2. Organizer creates and publishes an activity.
3. Participant views a shared event link.
4. Participant logs in and registers.
5. System creates an order and holds capacity.
6. Participant pays the organizer directly using organizer collection information.
7. Participant uploads payment proof.
8. Organizer reviews payment proof.
9. Participant selects seats when eligible.
10. Organizer sends notifications and manages attendees.
11. Organizer checks participants in onsite.
12. Organizer handles cancellation, refunds, finance, and export when needed.
13. Platform admin can review, configure, audit, and intervene.

## 2. Non-goals For First Commercial Build

The following are reserved unless explicitly pulled forward:

- Platform-held funds and automatic settlement.
- Full platform-collected payment flow.
- Automatic official refund through payment provider.
- Full QR ticket system.
- Complex multi-round registration batches.
- Invite-code and whitelist registration.
- Full public venue marketplace.
- Full multi-role admin console.
- Complete multilingual UI translations.
- Automatic currency exchange conversion.

## 3. User Roles

### Participant

Participants can:

- View basic activity details by link before login.
- Log in or register.
- Submit registration.
- Add registered or temporary companions when allowed.
- View order status.
- Pay organizer offline/directly.
- Upload payment proof.
- Submit top-up proof when required.
- Request refund when allowed.
- Select seats when eligible.
- View notifications.
- Check order number, GatherUp ID, and seat details for onsite verification.
- Submit complaints for activity, organizer, order, or refund issues.

### Organizer

Organizers can:

- Create free activities by default.
- Create paid activities only when verified.
- Configure activity visibility, pricing, capacity, payment collection, cancellation, refund, survey, registration, and seat settings.
- Review registrations when configured.
- Review payment proofs when authorized.
- Handle top-ups, overpayment, and refund tracking.
- Manage seats.
- Send template-based notifications.
- Manage activity finance.
- Export attendee data when authorized.
- Check participants in.
- Submit private venue records and public venue review requests.

### Platform Admin

First version admin role is super admin only.

Admins can:

- View users and activities.
- Review organizer verification.
- Review public/paid/high-risk activities.
- Review venue publication requests.
- Configure risk and platform settings.
- View audit logs.
- View complaints and disputes.
- Suspend organizer paid permission or activity visibility.

## 4. Access And Visibility

### Event Visibility

Events have two primary visibility modes:

- `public`: visible in activity square and search.
- `unlisted`: link-only. This is the default.

### Logged-out Event Detail

Logged-out users with a link can see basic event details.

They cannot:

- Register.
- View orders.
- View payment QR codes.
- View payment proofs.
- View internal organizer data.
- View participant lists.

### Price Visibility

Default: public.

Config:

- `public`: visible before login.
- `login_required`: visible only after login.

### Location Visibility

Default: full location public.

Config:

- `public`.
- `login_required`.
- `registered_only`.
- `confirmed_only`.
- `hidden_until_announcement`.

## 5. Account And Identity Requirements

### Login

Required login methods:

- Email password.
- Email code or magic link.

Reserved for commercial release:

- WeChat login and account binding.

### Stable User Identity

The platform must use a stable internal `user_id`.

GatherUp ID is the public user identifier:

- Must be unique.
- Used for companions, onsite checks, organizer lookup, and support.
- Can be modified up to 2 times by normal users.
- Admins can reset, force-change, or block IDs.

Nickname:

- Can duplicate.
- Must not be used as unique identity.
- Key organizer views display nickname plus GatherUp ID.

## 6. Organizer Verification

Paid event creation requires verification.

Verification levels:

- `unverified`.
- `light_verified`.
- `enhanced_verified`.
- `suspended`.

Rules:

- Unverified users can create free activities.
- Light verified organizers can create low-risk paid activities.
- Enhanced verified organizers can create higher-risk or higher-amount paid activities.
- Suspended organizers cannot create new paid activities.

Platform settings:

- Low-risk paid event amount threshold.
- Default suggested threshold: CNY 3000 equivalent per event.
- New organizer paid event review count.
- Default suggested count: first 3 successfully completed paid events.

## 7. Activity Lifecycle

Database statuses:

- `draft`
- `interest_collecting`
- `registration_scheduled`
- `registration_open`
- `registration_closed`
- `payment_reviewing`
- `seat_selection_scheduled`
- `seat_selection_open`
- `ready`
- `completed`
- `cancelled`

Rules:

- Status values are stable English keys.
- UI labels are localized separately.
- Automatic transitions are allowed for scheduled timings.
- Organizers can manually move status within allowed bounds.
- Critical transitions require confirmation and audit logs.
- Cancelled/completed events cannot be freely reopened.

## 8. Event Creation Requirements

Required event setup areas:

- Basic information.
- Activity scene and workflow template.
- Visibility.
- Timezone.
- Structured location.
- Price and currency.
- Capacity.
- Registration settings.
- Payment collection settings if paid.
- Cancellation and refund rules.
- Seat settings if seat selection is enabled.
- Notification settings.
- Materials and cover.

Currency:

- Each event has one currency.
- Initial supported currencies: CNY, JPY, KRW, USD.
- No exchange-rate conversion.

Time:

- Store UTC.
- Compute deadlines and scheduled events by event timezone.

Address:

- Country/region.
- City.
- District/area.
- Venue display name.
- Detailed address.
- Map link.
- Location note.
- Location visibility.
- Timezone.

## 9. Registration And Capacity

### Registration Requirement

Registration requires login.

No guest registration in commercial v0.1.

### Multi-person Registration

Default:

- Companions should be registered GatherUp users and identified by GatherUp ID.

Optional organizer setting:

- Temporary companions.

Temporary companion fields:

- Display name.
- Note.
- Optional contact information.

Primary registrant:

- Owns the order.
- Pays for the order.
- Selects seats for the order.

### Capacity

If seat map is enabled:

- Capacity equals sellable seats.

If seat map is not enabled:

- Capacity is manually configurable.

Paid events must pass capacity checks before publishing.

### Capacity Hold

When a user registers:

- Create order.
- Hold capacity.
- Enter `awaiting_payment`.
- Start payment/proof deadline.

Default hold duration:

- 30 minutes.
- Organizer configurable within platform range.

Payment proof upload:

- Keeps capacity held.
- Moves to review.
- Does not auto-release for organizer review delay.

Rejected proof:

- Defaults to resubmission allowed.
- Organizer can immediately release.
- Default resubmission window: 1 hour.

### Duplicate Orders

Default:

- One user can have one effective order per event.

Organizer can enable:

- Multiple orders per user.

Cancelled, expired, and refunded orders do not block new registration.

## 10. Waitlist

Waitlist is organizer-configurable.

Rules:

- Waitlist does not create a full payable order.
- Waitlist does not hold capacity.
- Default order is first-come-first-served.
- Organizer can manually adjust order or select a user.
- Manual changes are logged.

Turn-up flow:

- Organizer or system invites waitlist user.
- User receives notification.
- User gets a configurable payment/confirmation window.
- Default: 30 minutes.
- Expired behavior is configurable; default is exit waitlist.

Statuses:

- `waiting`.
- `invited`.
- `converted`.
- `expired`.
- `cancelled`.
- `skipped`.

## 11. Payment Proof Workflow

Commercial v0.1 default payment mode:

- Organizer-collected payment.
- Participant pays organizer directly using organizer collection QR code or instructions.
- Platform records order, proof, review, refund, and audit trail.

Collection QR code visibility:

- Only users with payable orders can view collection code.
- Collection code is not shown on public event detail.

Payment page must show:

- Payable amount.
- Currency.
- Collection method.
- Collection QR code or instructions.
- Payment deadline.
- Organizer payment note.
- Refund/cancellation summary.

Each order must record:

- Collection code version shown at payment time.

Payment proof:

- Multiple proofs per order are supported.
- Proof types include initial payment, top-up, and difference handling.
- Participant can optionally enter actual paid amount.
- Organizer can confirm actual amount.

Amount mismatch:

- Underpayment: organizer can accept with reason, request top-up, or reject/release.
- Overpayment: organizer can confirm and record difference, handle difference refund first, or reject.

## 12. Refund Workflow

Refund handling is required in commercial v0.1, even though payment is organizer-collected.

Flow:

1. Participant requests refund when rules allow.
2. Organizer approves or rejects.
3. Organizer refunds offline.
4. Organizer uploads refund proof.
5. Participant confirms receipt.
6. Participant can dispute if needed.

Refund statuses:

- `refund_requested`.
- `refund_approved`.
- `refund_rejected`.
- `refund_paid_offline`.
- `refund_proof_uploaded`.
- `refund_confirmed`.
- `refund_disputed`.

Refund rules:

- Platform provides defaults by activity type.
- Organizer can adjust.
- Rules must be visible before registration.
- Paid event registration requires refund rule confirmation.

## 13. Seat Selection

Seat selection opening is configurable:

- Immediately after payment confirmation.
- Scheduled opening time.
- Manual opening.
- No seat selection.

Temporary seat lock:

- Required.
- Default: 5 minutes.
- Organizer configurable within platform limits.

Seat confirmation must validate:

- Order is effective.
- Payment/registration eligibility is satisfied.
- Seat selection is open.
- Seat is still available.
- Seat count equals order attendee count.

Temporary locks expire automatically.

## 14. Check-in

Commercial v0.1 includes lightweight check-in.

Capabilities:

- Search by order number.
- Search by GatherUp ID.
- Search by nickname.
- Search by seat number.
- Mark whole order as arrived.
- Expand order and mark attendees individually.

Attendee states:

- Not arrived.
- Arrived.
- Exception.

Order rollup:

- Not arrived.
- Partially arrived.
- Arrived.
- Exception.

Primary verification:

- Order number.
- GatherUp ID.
- Seat number.

Reserved:

- Ticket code.
- QR ticket.

## 15. Survey And Venue Preference

Interest collection is optional.

Survey is not registration and does not hold capacity.

Supported survey uses:

- Available time.
- Venue preference.
- Acceptable price.
- Expected attendee count.
- Notes.

Venue voting is implemented as a survey question type in v0.1. A full voting system is reserved.

## 16. Notifications

Required channels:

- In-app notification.
- Email.

Reserved:

- WeChat notification.

Email:

- Supabase Auth handles account emails.
- Business emails use an abstract provider.
- First implementation target: Resend.

Notification types:

- Registration submitted.
- Registration approved/rejected.
- Awaiting payment.
- Payment proof submitted.
- Payment confirmed.
- Payment rejected.
- Top-up required.
- Seat selection open.
- Activity changed.
- Activity cancelled.
- Refund status changed.
- Waitlist invited.
- Activity reminder.

Organizer notification sending:

- Template-first.
- Organizer can edit supplemental content.
- Key system status wording cannot be freely changed.
- Sending history is saved.
- Platform can inspect abuse and suspend notification capability.

## 17. Export

Export permission:

- Configurable by owner.
- Default roles: owner and cohost.

Default export fields:

- Order number.
- Primary registrant nickname.
- Primary registrant GatherUp ID.
- Attendee count.
- Companion nickname/GatherUp ID.
- Payment status.
- Registration status.
- Seat status.
- Seat number.
- Note.
- Registration time.

Sensitive export fields require explicit permission and selection:

- Email.
- Phone.
- WeChat/SNS.
- Payment proof links.
- Refund information.
- Sensitive custom question answers.

Every export logs:

- Operator.
- Time.
- Export type.
- Field scope.
- Activity ID.

## 18. Finance

Activity finance must include:

- Receivable amount.
- Confirmed income.
- Pending income.
- Refunded amount.
- Pending refund.
- Expenses.
- Expense categories.
- Expense proof status.
- Estimated balance.
- Per-person cost.
- Finance export.
- Audit trail.

Expense proof:

- Optional in v0.1.
- Missing proof is visibly marked.

Finance visibility:

- Owner.
- Cohost.
- Finance.

Expense editing:

- Owner and finance by default.
- Cohost edit permission is owner-configurable.
- Default: cohost cannot edit expenses.

Refund handling:

- Owner and finance only.

## 19. Materials And Cover

Activity materials have visibility:

- Public participant-visible materials.
- Internal organizer-only materials.

Supported assets:

- Image.
- PDF.
- Document link.
- External link.

Fields:

- Title.
- Type.
- Visibility.
- Uploader.
- Uploaded time.

Cover:

- Organizer can upload an image.
- Organizer can choose platform template cover.
- Upload is optional.
- Public activities should have upload or template cover.

## 20. Venue Library

Venue library is an auxiliary module, not the blocker for core commercial workflow.

v0.1 scope:

- Venue list.
- City filter.
- Venue type filter.
- Support status filter.
- Venue detail.
- Organizer experience notes.

Venue contribution:

- Organizers can submit venue records/experience.
- New records are private to the submitter/team.
- Platform review is required before public venue library publication.

Creating events:

- Organizer can select public venue.
- Organizer can select private submitted venue.
- Organizer can manually enter location.

## 21. Admin Backend

Minimum commercial admin backend:

- User view.
- Activity view.
- Organizer verification review.
- Activity review queue.
- Platform settings.
- Audit log view.
- Complaint/dispute view.
- Manual suspension controls.

Admin roles:

- First version: super admin.
- Future reserved: operations, risk, finance, support.

Bootstrap:

- Environment variable can identify bootstrap admin email.
- Database role must confirm admin access.
- Suggested env: `GATHERUP_BOOTSTRAP_ADMIN_EMAIL`.

## 22. Complaints

Complaint/reporting is required.

Rules:

- Login required.
- Any logged-in user can report activity or organizer.
- Order/refund complaints require order ownership.
- Complaints are private.
- Admin can view and update status.

Complaint statuses:

- Pending.
- In progress.
- Resolved.
- Rejected.
- Needs more information.

## 23. Privacy And Retention

Privacy groups:

- Public: nickname, GatherUp ID, optional avatar, optional public profile.
- Private: email, phone, WeChat binding, provider IDs.
- Activity-visible: order nickname, GatherUp ID, companion info, notes, seat number, check-in status.
- Sensitive: payment proof, refund proof, contact details, audit logs.

Payment proof access:

- Default roles: owner and finance.
- Cohost requires explicit authorization.
- Default organizer access after event end: 90 days.
- Platform-configurable.
- Open disputes/refunds can extend access.

Account deletion:

- v0.1 supports deletion request.
- No immediate hard deletion.
- Open orders, refunds, events, organizer roles, and disputes must be handled first.
- Personal data can be anonymized while necessary transaction/audit records remain.

## 24. Audit Logs

Audit logs are required for all key operations.

Minimum fields:

- Actor user ID.
- Actor role.
- Action type.
- Target object type.
- Target object ID.
- Previous/new value summary.
- Time.
- Reason or note.
- Risk level.
- Optional IP and user agent.

Must log:

- Profile and GatherUp ID changes.
- Organizer verification.
- Activity create/publish/cancel/status changes.
- Reviews.
- Collection code changes.
- Registration changes.
- Payment proof upload/view/review.
- Top-up and amount difference handling.
- Refund workflow.
- Seat lock/assign/release/adjust.
- Check-in.
- Export.
- Finance changes.
- Notifications.
- Admin actions.
- Complaints.

## 25. Acceptance Criteria

Commercial v0.1 is not ready until:

- Typecheck passes.
- Production build passes.
- Real account login works for email password and email code.
- User profile sync works.
- Organizer verification can gate paid activities.
- Activity creation writes real database records.
- Public/unlisted visibility works.
- Logged-out detail access works according to visibility settings.
- Registration creates real orders.
- Capacity hold and expiry work.
- Payment proof upload writes Storage and database records.
- Payment proof review works with permissions.
- Multiple proofs/top-up work.
- Refund workflow is trackable.
- Seat temporary lock and final assignment prevent duplicate seat selection.
- Lightweight check-in works.
- Export respects permissions and field scope.
- Finance records income, refunds, expenses, and balance.
- Admin can review organizer/activity and inspect logs.
- Complaints can be submitted and viewed by admin.
- RLS and service-layer permission checks are tested.
- Sensitive file access is restricted.
- Key audit logs are written.
- Mobile participant flow is usable.
- Desktop organizer flow is usable.
