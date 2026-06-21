# GatherUp RPC integration testing guide

Last updated: 2026-06-20

This guide explains how to run opt-in integration tests against a real clean Supabase dev/staging project.

These tests are separate from `npm test` on purpose. They create temporary Supabase Auth users and business rows, call real PostgreSQL RPC functions through Supabase clients, and clean up after themselves.

## Current Coverage

The opt-in integration test files are:

```text
tests/integration/rpc/_helpers.mts
tests/integration/rpc/registration.test.mts
tests/integration/rpc/concurrency.test.mts
tests/integration/rpc/storage-proof-access.test.mts
```

`_helpers.mts` contains shared setup and cleanup helpers. It is not matched by the `*.test.mts` runner glob.

`registration.test.mts` validates `public.create_registration_atomic` against a real Supabase project:

- anonymous callers are rejected;
- authenticated users can create a registration;
- generated order numbers follow the event prefix sequence;
- duplicate active registrations are rejected;
- two users competing for the last capacity slot result in exactly one success and one `CAPACITY_EXCEEDED` response.

It also validates `public.review_payment_atomic` after creating a registration:

- a payment stub is created by the registration trigger;
- inserting `payment_proofs` moves the order to `payment_submitted`;
- an event owner can approve the payment through the RPC;
- the registration and payment move to `confirmed`;
- the payment reviewer is recorded as the owner app user.

It also validates `public.check_in_order_atomic` after payment confirmation:

- a confirmed registration exposes a check-in code;
- an event owner can check in the order through the RPC;
- the registration and attendee move to `arrived`;
- a `check_ins` record is created;
- duplicate check-in is rejected with `ALREADY_CHECKED_IN`.

It also validates the audited refund RPC chain after payment confirmation:

- a participant can request a refund with `public.request_refund_atomic`;
- an event owner can approve the request with `public.review_refund_request_atomic`;
- an event owner can record transfer proof with `public.record_refund_proof_atomic`;
- the refund request moves from `requested` to `approved` to `proof_uploaded`;
- the registration and payment stay in `refunding`;
- a `refund_proofs` record is created;
- duplicate refund proof upload is rejected with `INVALID_REFUND_STATUS`.

`concurrency.test.mts` validates high-risk competing writes:

- two payment managers racing to approve/reject the same submitted payment produce exactly one successful review and one typed `INVALID_ORDER_STATUS` rejection;
- two staff members racing to check in the same code produce exactly one successful check-in and one `ALREADY_CHECKED_IN` rejection;
- two confirmed participants racing to lock the same seat produce exactly one active seat lock and one typed seat conflict rejection.

`storage-proof-access.test.mts` validates real Supabase Storage RLS:

- payment proof upload is limited to the registration owner and the policy path `{event_id}/{registration_id}/{payment_id}/{filename}`;
- payment proof reads are limited to the order owner and payment managers;
- refund proof upload is limited to refund managers, not the participant;
- refund proof reads are limited to the order owner and refund managers, with cohost payment permission intentionally kept separate from refund permission.

## Required Environment

Use a clean dev/staging Supabase project, not production.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GATHERUP_RUN_RPC_INTEGRATION=1
GATHERUP_RPC_INTEGRATION_TARGET=clean-dev
```

The integration helper loads `.env.local` for convenience, without overriding variables already set in the shell. `GATHERUP_RUN_RPC_INTEGRATION=1` and `GATHERUP_RPC_INTEGRATION_TARGET=clean-dev` should still be passed explicitly when running the suite so the tests never touch Supabase by accident. The target marker is intentionally narrow: it confirms the service-role test run is pointed at a disposable clean dev/staging project, not production or a shared live project.

The service role key is required only for test setup and cleanup:

- create temporary Supabase Auth users;
- insert matching `public.users` and `public.user_auth_identities` rows;
- insert temporary test events;
- delete temporary rows and Auth users after the test.

Application behavior still uses authenticated user clients for the RPC calls under test.

## Preflight

Before running integration tests, the clean Supabase project should have already executed:

```text
supabase/schema.sql
supabase/seed.sql
supabase/storage.sql
supabase/validation/06-public-read-grants.sql
supabase/validation/07-clean-dev-post-execution-summary.sql
```

Also run local checks:

```bash
npm test
npm run typecheck
npm run build
git diff --check
```

## Run

Run the integration test explicitly:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev npm run test:integration:rpc
```

If `GATHERUP_RUN_RPC_INTEGRATION` is not set to `1`, or `GATHERUP_RPC_INTEGRATION_TARGET` is not set to `clean-dev`, the test suite skips without touching Supabase.

## Expected Result

Expected local output:

```text
GatherUp RPC concurrency
  ✔ allows exactly one reviewer to win when two payment managers race the same order
  ✔ allows exactly one check-in when two staff members scan the same code at once
  ✔ lets exactly one participant lock a seat when two confirmed orders compete for it
GatherUp RPC integration
  ✔ rejects unauthenticated calls
  ✔ creates an order with the event-scoped number format
  ✔ rejects duplicate active registrations for the same user and event
  ✔ prevents oversell when two users compete for the last capacity slot
  ✔ reviews a submitted payment through the audited payment RPC
  ✔ checks in a confirmed order through the audited check-in RPC
  ✔ requests, reviews, and records proof for a refund through audited refund RPCs
GatherUp Storage RLS
  ✔ only lets the registration owner upload to their own payment-proofs path
  ✔ restricts payment-proofs reads to the order owner and payment managers, not a permission-less cohost
  ✔ never lets a participant upload their own refund-proofs file, only refund managers
  ✔ restricts refund-proofs reads to the order owner and refund managers, excluding cohost even with payment permissions
```

Expected database side effects after cleanup:

- temporary test events removed;
- temporary `public.users` removed;
- temporary Supabase Auth users removed;
- registrations/payments/attendees created by the temporary events removed through cascade deletes.

## Failure Logging

Record any failure in `docs/supabase-live-validation-log-v0.1.md` with:

```text
Date:
Supabase project ref:
Command:
Failing test:
Exact error:
Expected behavior:
Observed behavior:
Database cleanup needed: yes/no
Follow-up commit:
```

Do not treat the clean Supabase project as validated for commercial v0.1 until the registration, payment review, check-in, refund proof, concurrency, and Storage RLS suites all pass. Seating workflows depend on confirmed registrations and payments, and refund workflows exercise the same payment state machine from the reversal side.

## Next RPCs To Add

Recommended order:

1. `confirm_seat_assignment_atomic` concurrent assignment coverage.
2. refund participant confirmation and dispute RPCs, once implemented.
3. notification delivery side-effect assertions after live RPC success.

Keep each integration test isolated, self-cleaning, and opt-in.
