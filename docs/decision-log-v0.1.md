# GatherUp commercial v0.1 decision log

Last updated: 2026-06-02

This document records confirmed product and engineering decisions for GatherUp commercial v0.1. It is the source of truth for later PRD, schema, permission, and implementation work.

## 1. Product Scope

### D001. v0.1 target

Decision: GatherUp v0.1 is a commercial-ready product direction, not only a demo or internal trial.

Implications:

- The product must support real users, real events, real orders, real payment proof review, refund handling, audit logs, and minimum admin operations.
- UI-only prototype work is no longer enough.
- Every core workflow needs data rules, permission rules, and verification criteria.

### D002. First activity category

Decision: The first priority category is community/fandom activities, especially offline screenings, birthday cafes, and small fan gatherings.

Implications:

- Product copy and templates may optimize for this scene first.
- The underlying model must remain generic through activity scene, workflow template, and custom tags.
- The platform must not be hard-coded as a screening or fandom-only product.

### D003. Payment positioning

Decision: Early v0.1 uses organizer-collected payments. Future platform-collected payment remains a planned extension.

Implications:

- Organizers configure their own WeChat Pay or Alipay collection QR codes.
- Participants pay the organizer directly, then upload payment proof.
- Organizers review and confirm payments in GatherUp.
- GatherUp does not hold event funds in the first implementation.
- The data model should remain platform-payment-ready for future official payment, settlement, refund, and service fee workflows.

### D004. Business model

Decision: Use a combined monetization path.

Implications:

- Early phase may be free, discounted, or invite-only.
- Later monetization can include organizer Pro plans, activity publishing fees, advanced features, higher quotas, export, notifications, finance, collaboration, and future platform-payment service fees.
- The system should reserve plan, quota, feature flag, and organizer entitlement concepts.

## 2. Organizer Trust And Review

### D005. Paid event creation permission

Decision: All logged-in users can create free activities. Paid activities require organizer verification.

Implications:

- Free events have a lower entry barrier.
- Any event with price, collection QR code, payment proof, or paid order requires organizer verification.
- Paid permissions can be paused by the platform.

### D006. Organizer verification model

Decision: Organizer verification is tiered.

Levels:

- Unverified: can create free activities only.
- Light verified: can create low-risk paid activities.
- Enhanced verified: can create higher-risk or higher-volume paid activities.
- Suspended: cannot create new paid activities.

Implications:

- Low-risk paid event limit is configurable by platform settings.
- Default suggested low-risk single-event gross amount: CNY 3000 equivalent.
- Enhanced verification may be required for higher amount events or future platform-collected payments.

### D007. Paid private event review

Decision: Paid unlisted events do not always require platform review, but high-risk cases do.

Review triggers:

- Amount exceeds configurable threshold.
- Organizer is new.
- Organizer is manually marked for forced review.
- Organizer has complaint, dispute, or suspicious collection-code history.

Default: New organizers need review for the first 3 successfully completed paid events. The count is configurable.

### D008. Public paid event review

Decision: Public and paid events require platform review.

Implications:

- Free unlisted events normally do not require platform review.
- Free public events may be published but can be checked by platform risk controls.
- Review statuses include `not_required`, `pending`, `approved`, `rejected`, `changes_requested`, and `suspended`.

### D009. Admin review queue

Decision: Organizer verification, paid event review, public event review, venue publication review, and dispute review share one admin review queue.

Implications:

- First version is handled by super admins.
- Future roles can include operations, risk, finance, and support admins.
- Every review action records reviewer, time, decision, reason, note, and target object.

## 3. Visibility And Public Access

### D010. Default event visibility

Decision: New events default to unlisted/link-only visibility.

Implications:

- Events are not listed in the public activity square unless organizers choose public visibility.
- Unlisted activities can still be accessed by link.
- Paid public activities may require stronger review.

### D011. Logged-out event detail access

Decision: Logged-out users with a link can view basic event details. Registration requires login.

Visible before login:

- Title.
- Cover or template cover.
- Time.
- Basic venue information based on visibility settings.
- Price based on price visibility settings.
- Organizer-facing sensitive data is hidden.

Hidden before login:

- Registration actions.
- Orders.
- Payment QR codes.
- Payment proofs.
- Participant lists.
- Internal organizer information.

### D012. Price visibility

Decision: Price visibility is configurable. Default is public.

Field:

- `price_visibility`: `public` or `login_required`.

### D013. Location visibility

Decision: Full location is public by default, with configurable hiding options.

Suggested `location_visibility` values:

- `public`.
- `login_required`.
- `registered_only`.
- `confirmed_only`.
- `hidden_until_announcement`.

## 4. Account And Identity

### D014. Registration requirement

Decision: Registration, orders, payment, seat selection, refunds, and complaints require login.

Implications:

- No guest registration in commercial v0.1.
- Activity detail can be shared publicly by link, but actions bind to a real platform user.

### D015. Login providers

Decision: Support email password, email code/magic link, and WeChat login direction.

Implementation priority:

- First engineering path: email password and email code.
- WeChat login: reserve UI, model, and binding flow; real integration before formal commercial launch.

Implications:

- Email remains the global account base.
- User identity is not equal to email.
- Login providers must be modeled as linked identities under a stable platform user ID.

### D016. GatherUp ID

Decision: Keep GatherUp ID as a public user identifier.

Rules:

- Internal `user_id` is the database identity.
- `gatherup_id` is the public identity used for attendees, lookup, support, and onsite checks.
- Nicknames can duplicate.
- Key views must show nickname plus GatherUp ID.

### D017. GatherUp ID modification

Decision: Users can modify GatherUp ID up to 2 times. Admins can reset, force-change, or block IDs.

Implications:

- GatherUp ID is unique.
- ID history should be retained for dispute and impersonation handling.
- Historical records bind to internal `user_id`, not GatherUp ID.

### D018. ID and handle format

Decision: Use mixed identity direction.

Implementation:

- v0.1 implements stable IDs such as `GU-A7K29`.
- Future display handles such as `@miki` are reserved.

## 5. Registration, Orders, Capacity

### D019. Multi-person registration

Decision: Multi-person registration defaults to registered attendees, but organizers can enable temporary attendees.

Rules:

- Default: companions should provide GatherUp IDs.
- If temporary attendees are enabled, the primary registrant can add display name, note, and optional contact information.
- Primary registrant owns payment and seat selection for the whole order.
- Temporary attendees can later be linked to real users.

### D020. Seat selection ownership

Decision: The primary registrant selects seats for the entire order in v0.1.

Implications:

- Seat count must equal order attendee count.
- Future versions can support each registered attendee confirming their own seat.

### D021. Capacity

Decision: If an event has a seat map, capacity is derived from available seats. If no seat map exists, capacity is manually configurable.

Rules:

- Locked or unavailable seats do not count as sellable capacity.
- Paid events must pass capacity checks before publishing.

### D022. Capacity hold after registration

Decision: Submitted registration temporarily holds capacity until payment/proof deadline.

Rules:

- Order enters `awaiting_payment`.
- Hold expires after a configurable period.
- Platform default: 30 minutes.
- Organization can configure within platform limits.
- If proof is uploaded, capacity remains held during review.

### D023. Payment proof review delay

Decision: Payment proof submission keeps capacity held. Organizer delay triggers reminders, not automatic release.

Default reminders:

- 12 hours after proof upload: remind organizer.
- 24 hours after proof upload: mark as delayed review and remind again.
- Before event start: high-priority reminder.

### D024. Rejected payment proof

Decision: Rejected payment defaults to allowing resubmission. Organizer can choose immediate release.

Rules:

- Rejection requires reason.
- Resubmission window is configurable.
- Platform default: 1 hour.
- If resubmission expires, order closes and capacity/seat locks release.

### D025. Duplicate orders

Decision: A user can have only one effective order per event by default. Organizers can enable multiple orders.

Effective statuses include:

- Awaiting payment.
- Payment submitted.
- Confirmed.
- Awaiting seat selection.
- Completed.

Cancelled, expired, and refunded orders do not block new registration.

### D026. Waitlist

Decision: Waitlist is organizer-configurable.

Rules:

- Waitlist does not create a full order immediately.
- Waitlist does not hold capacity.
- Default order is first-come-first-served.
- Organizers can manually adjust or select waitlist users.
- Turned-up waitlist invitation has a configurable payment window.
- Platform default: 30 minutes.
- Expired waitlist invitation behavior is configurable; default is exit waitlist.

### D027. Registration review

Decision: Organizer can configure whether registration requires review.

Modes:

- No review: payment confirmation completes registration.
- Review before payment: organizer approves registration, then user proceeds to payment.
- Free activity review: free registrations can wait for organizer confirmation.
- Invite/whitelist modes are reserved for future work.

### D028. Registration questions

Decision: Support template questions plus custom questions.

v0.1 question types:

- Single-line text.
- Multi-line text.
- Single choice.
- Multiple choice.
- Required checkbox confirmation.

Rules:

- Required/optional is configurable.
- Exportability is configurable per question.
- Sensitive questions are not exported by default.

### D029. Agreement confirmation

Decision: Platform provides default event rule/disclaimer templates, and organizers can add terms.

Paid event registrations must confirm:

- Information is true.
- Refund/cancellation rules were read.
- Organizer-collected payment mode is understood.
- Event rules are understood.

The confirmed terms version and timestamp must be stored.

## 6. Payment, Proof, Refund

### D030. Collection QR code access

Decision: Collection QR codes are visible only to users with an order in a payable state.

Rules:

- Logged-out users cannot see collection QR codes.
- Logged-in users without an order cannot see collection QR codes.
- Collection QR codes are paired with payable amount and payment instructions.
- Organizer-side edit/view permission defaults to owner and finance.

### D031. Collection code review and history

Decision: Collection code changes are not always pre-reviewed, but risky cases are reviewed and all versions are retained.

Rules:

- New organizers and high-risk activities can require review.
- Code changes store uploader, time, target activity, old version, new version, reason, and status.
- Collection code versions cannot be hard-deleted.

### D032. Order payment code snapshot

Decision: Each order records the collection-code version shown at payment time.

Implications:

- Later collection-code changes do not break dispute traceability.
- Payment review and complaints can inspect the original shown collection code.

### D033. Actual paid amount

Decision: Participant may optionally enter actual paid amount when uploading proof. Organizer can adjust confirmed amount during review.

Rules:

- System payable amount remains authoritative.
- Actual paid amount helps review.
- Differences are flagged as underpayment or overpayment.

### D034. Underpayment

Decision: Organizer can accept underpayment or request top-up.

Rules:

- Accepting underpayment requires reason.
- Requesting top-up creates a top-up workflow.
- Order state can become `partial_paid_needs_topup`.

### D035. Overpayment

Decision: Organizer can confirm and record overpayment, handle difference first, or reject.

Rules:

- Overpaid difference is recorded in finance.
- Difference refund can enter refund/difference return workflow.

### D036. Multiple payment proofs

Decision: One order can have multiple payment proofs.

Proof types:

- Initial payment.
- Top-up.
- Difference handling.

Each proof records screenshot, user-entered amount, upload time, review status, reviewer, and note.

### D037. Refund workflow

Decision: v0.1 includes full offline refund tracking.

Workflow:

- Refund requested.
- Approved or rejected by organizer.
- Offline refund completed.
- Refund proof uploaded.
- Participant confirms receipt.
- Dispute can be opened.

Platform does not automatically refund organizer-collected payments in early v0.1.

### D038. Refund deadline

Decision: Platform provides default refund windows by activity type, and organizers can adjust.

Default examples:

- Screening/package venue: 48 hours before start.
- Birthday cafe/material-heavy events: 24 to 48 hours before start or material-lock rules.
- General gathering: 24 hours before start.
- Free events: cancellation rules only.

Refund rules must be shown before registration confirmation.

## 7. Seat Selection And Check-in

### D039. Seat selection opening

Decision: Seat selection opening is configurable.

Modes:

- Immediately after payment confirmation.
- Scheduled opening time.
- Manual opening.
- No seat selection.

### D040. Temporary seat lock

Decision: Selecting seats creates temporary locks.

Rules:

- Platform default lock duration: 5 minutes.
- Organizer can configure within platform limits.
- Other users see temporarily locked seats as unavailable/processing.
- Confirmation converts temporary locks into final assignments.
- Submission still performs final validation.

### D041. Lightweight check-in

Decision: v0.1 includes lightweight check-in.

Rules:

- Default quick check-in by order.
- Orders can be expanded for per-attendee check-in.
- Attendee-level states roll up to order-level status.
- Search by order number, GatherUp ID, nickname, or seat number.

### D042. Ticket and entry code

Decision: First version uses order number and GatherUp ID for onsite verification, while reserving ticket code/QR code fields.

Implications:

- No required QR ticket in first implementation.
- Future electronic ticket can be added without replacing order identity.

## 8. Cancellation, Activity State, Survey

### D043. Activity state machine

Decision: Use English database statuses and Chinese UI labels.

Statuses:

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

### D044. State transition control

Decision: Activity status is automatic-first, with organizer manual control within allowed bounds.

Rules:

- Time-based transitions can be automatic.
- Critical operations require confirmation.
- Dangerous backward transitions are restricted.
- Manual transitions require audit logs with reason.

### D045. Activity cancellation

Decision: Organizers can cancel activities, but paid/active orders require impact and refund checks.

Cancellation with orders must show:

- Registered count.
- Paid count.
- Pending payment review.
- Seat selection count.
- Refund handling count.

Cancellation requires reason, closes workflows, sends notifications, and records logs.

### D046. Interest collection

Decision: Interest collection/survey is an optional module.

Rules:

- Survey is not formal registration.
- Survey does not hold capacity.
- Survey can collect time, venue preference, acceptable price, expected attendee count, and notes.
- Venue voting is implemented as a survey question type in v0.1.

## 9. Notification, Export, Finance, Materials

### D047. Notifications

Decision: v0.1 supports in-app notifications and email. WeChat notification is reserved.

Email:

- Supabase Auth handles account email.
- Business email uses an abstract email provider.
- First implementation target: Resend.

Organizer messages:

- Template-first.
- Editable supplemental content.
- Default no pre-review.
- Platform can inspect history and suspend abusive notification capability.

### D048. Export

Decision: Export permission is organizer-configurable. Default export roles are owner and cohost.

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

Sensitive fields require explicit selection and permission:

- Email.
- Phone.
- WeChat/SNS.
- Payment proof links.
- Refund information.
- Custom question answers marked sensitive.

Every export records field scope and operator.

### D049. Finance

Decision: Activity finance supports income, expenses, refunds, proof status, balance, and export.

Required:

- Receivable.
- Confirmed income.
- Pending income.
- Refunded amount.
- Pending refund.
- Expenses.
- Expense categories.
- Expense proofs.
- Estimated balance.
- Per-person cost.
- Finance export.
- Finance audit logs.

Expense proof is optional in v0.1.

### D050. Finance visibility and edit rights

Decision: Owner, cohost, and finance can view finance by default.

Rules:

- Owner and finance can add/edit expenses.
- Cohost expense editing is configurable by owner.
- Default: cohost cannot edit expenses.
- Refund handling is owner and finance only.

### D051. Materials

Decision: Activity materials support public participant materials and internal organizer materials.

Supported in v0.1:

- Images.
- PDFs.
- Document links.
- External links.
- Title.
- Type.
- Visibility.
- Uploader.
- Upload time.

Activity cover can use a platform template or organizer upload.

## 10. Admin, Complaint, Privacy, Data Retention

### D052. Minimum admin backend

Decision: Commercial v0.1 requires a minimum admin backend.

Required:

- User view.
- Activity view.
- Organizer verification review.
- Activity review.
- Platform settings.
- Audit log view.
- Complaint/dispute view.
- Manual suspension of paid permission or activity.

First version has super admin only, while reserving multi-role admins.

### D053. Super admin bootstrap

Decision: Super admin uses environment variable plus database role confirmation.

Suggested variable:

- `GATHERUP_BOOTSTRAP_ADMIN_EMAIL`

Rules:

- Environment variable can bootstrap the first admin.
- Database admin role must exist for backend access.
- Admin actions are never trusted from frontend-only checks.

### D054. Organizer roles

Decision: v0.1 supports simple event organizer roles.

Roles:

- `owner`
- `cohost`
- `finance`
- `staff`
- `viewer`

Permission highlights:

- Payment proof view/review defaults to owner and finance.
- Cohost can be granted payment permission by owner.
- Refund handling is owner and finance.
- Check-in defaults to owner, cohost, and staff.
- Export defaults to owner and cohost, configurable by owner.

### D055. Complaint

Decision: v0.1 includes lightweight complaint/reporting.

Rules:

- Login required.
- Any logged-in user can report an activity or organizer.
- Order/refund complaints require the user to own the order.
- Complaints are private and visible to platform admins.

### D056. Privacy fields

Decision: Use field-level privacy groups.

Public:

- Nickname.
- GatherUp ID.
- Optional avatar.
- Optional public profile.

Private:

- Email.
- Phone.
- WeChat binding.
- Provider IDs.

Activity-visible:

- Order nickname.
- GatherUp ID.
- Companion info.
- Notes.
- Seat number.
- Check-in status.

Sensitive:

- Payment proof.
- Refund proof.
- Contact details.
- Audit logs.

### D057. Sensitive data retention

Decision: Use archival, deletion request, and sensitive-data retention windows.

Rules:

- Activity archives after completion.
- Sensitive data has access windows.
- Default organizer payment-proof access after activity end: 90 days.
- This is platform-configurable.
- Open complaints/refunds can extend access.
- Admin access after window requires audit logging.

### D058. Account deletion

Decision: v0.1 supports account deletion request, not immediate hard deletion.

Rules:

- Open orders, refunds, active events, organizer roles, and disputes must be resolved first.
- Personal profile can be anonymized.
- Necessary transaction and audit records can remain.

### D059. Audit logs

Decision: Commercial v0.1 requires audit logs for all key operations.

Must log:

- Important profile changes.
- GatherUp ID changes.
- Organizer verification.
- Activity create/publish/cancel/status change.
- Review actions.
- Collection code changes.
- Registration create/cancel/expire.
- Payment proof upload/view/review/reject.
- Top-up and difference handling.
- Refund workflow.
- Seat lock/assign/release/adjust.
- Check-in.
- Export.
- Finance changes.
- Notification sends.
- Admin actions.
- Complaint handling.

## 11. Region, Language, Currency, Address

### D060. Language

Decision: First UI language is Chinese. Architecture reserves English, Japanese, and Korean.

Implications:

- Do not store Chinese labels as database enum values.
- Use stable keys for status, notification templates, and activity types.

### D061. Region priority

Decision: Prioritize East Asian fandom/community activity circles: Mainland China, Japan, Korea, and overseas Chinese users.

Implications:

- Support WeChat/Alipay organizer collection QR codes.
- Reserve Japanese and Korean language support.
- Avoid region-specific assumptions in time, address, phone, and currency logic.

### D062. Currency

Decision: Support multiple currencies, but each event uses one currency.

Initial currencies:

- CNY.
- JPY.
- KRW.
- USD.

Rules:

- No automatic exchange-rate conversion in v0.1.
- Store amounts in minor units where applicable.
- Format by currency.

### D063. Time zone

Decision: Store times in UTC, and each event has its own timezone field.

Rules:

- Deadlines, notification times, and opening times are computed by event timezone.
- UI should show activity timezone when useful.

### D064. Address

Decision: Use structured address plus display name and map link.

Fields:

- Country/region.
- City.
- District/area.
- Venue display name.
- Detailed address.
- Map link.
- Location note.
- Location visibility.
- Timezone.

Coordinates are reserved but not required in v0.1.

## 12. Documentation

### D065. Commercial docs

Decision: Confirmed decisions should be stored in both a decision log and a commercial PRD.

Files:

- `docs/decision-log-v0.1.md`
- `docs/commercial-v0.1-prd.md`

Purpose:

- Decision log records why and what was decided.
- PRD translates decisions into product requirements and engineering acceptance criteria.
