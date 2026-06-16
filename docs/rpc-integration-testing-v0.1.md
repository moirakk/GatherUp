# GatherUp RPC integration testing guide

Last updated: 2026-06-16

This guide explains how to run opt-in integration tests against a real clean Supabase dev/staging project.

These tests are separate from `npm test` on purpose. They create temporary Supabase Auth users and business rows, call real PostgreSQL RPC functions through Supabase clients, and clean up after themselves.

## Current Coverage

The first integration test file is:

```text
tests/integration/rpc/registration.test.mts
```

It validates `public.create_registration_atomic` against a real Supabase project:

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

## Required Environment

Use a clean dev/staging Supabase project, not production.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GATHERUP_RUN_RPC_INTEGRATION=1
```

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
GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc
```

If `GATHERUP_RUN_RPC_INTEGRATION` is not set to `1`, the test suite skips without touching Supabase.

## Expected Result

Expected local output:

```text
GatherUp RPC integration
  ✔ rejects unauthenticated calls
  ✔ creates an order with the event-scoped number format
  ✔ rejects duplicate active registrations for the same user and event
  ✔ prevents oversell when two users compete for the last capacity slot
  ✔ reviews a submitted payment through the audited payment RPC
  ✔ checks in a confirmed order through the audited check-in RPC
  ✔ requests, reviews, and records proof for a refund through audited refund RPCs
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

Do not continue to seat RPC validation until registration, payment review, check-in, and refund proof upload pass. Seating workflows depend on confirmed registrations and payments, and refund workflows exercise the same payment state machine from the reversal side.

## Next RPCs To Add

Recommended order:

1. `create_seat_lock_atomic`
2. `confirm_seat_assignment_atomic`
3. refund participant confirmation and dispute RPCs, once implemented

Keep each integration test isolated, self-cleaning, and opt-in.
