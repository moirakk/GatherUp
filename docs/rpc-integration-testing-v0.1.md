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
tests/integration/rpc/rate-limit.test.mts
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
- refund proof reads are limited to the order owner and refund managers, with cohost payment permission intentionally kept separate from refund permission;
- same-event participants cannot upload into another participant's payment-proof path;
- confirmed orders cannot receive replacement participant payment-proof uploads;
- malformed proof paths are rejected before they can match a Storage policy;
- payment-proof and refund-proof objects are immutable to authenticated non-service clients after upload.

Each Storage test creates its own temporary event so registration idempotency and order state from one case cannot leak into another.

`rate-limit.test.mts` validates the distributed API limiter RPC introduced by `supabase/migrations/20260705000100_api_rate_limits.sql`:

- the service-role client can call `consume_rate_limit`;
- fixed-window counters return two allowed decisions and one typed rejection when the limit is exceeded;
- the `api_rate_limits` row is persisted for the bucket key;
- anonymous clients cannot execute the RPC.

## Required Environment

Use a clean dev/staging Supabase project, not production.

Required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GATHERUP_RUN_RPC_INTEGRATION=1
GATHERUP_RPC_INTEGRATION_TARGET=clean-dev
GATHERUP_RPC_INTEGRATION_ALLOWED_REF=<clean-dev-project-ref>
```

The integration helper loads `.env.local` for convenience, without overriding variables already set in the shell. `GATHERUP_RUN_RPC_INTEGRATION=1`, `GATHERUP_RPC_INTEGRATION_TARGET=clean-dev`, and `GATHERUP_RPC_INTEGRATION_ALLOWED_REF=<clean-dev-project-ref>` should still be passed explicitly when running the suite so the tests never touch Supabase by accident. The target marker is intentionally narrow: it confirms the service-role test run is pointed at a disposable clean dev/staging project, not production or a shared live project. The allowed ref check binds that marker to the physical Supabase project ref extracted from `NEXT_PUBLIC_SUPABASE_URL`.

The service role key is required only for test setup and cleanup:

- create temporary Supabase Auth users;
- insert matching `public.users` and `public.user_auth_identities` rows;
- insert temporary test events;
- delete temporary rows and Auth users after the test.

Application behavior still uses authenticated user clients for the RPC calls under test.

## Preflight

Before running integration tests, the clean Supabase project should have already executed:

```text
supabase/validation/00-reset-clean-validation-project.sql
supabase/schema.sql
supabase/seed.sql
supabase/storage.sql
supabase/validation/06-public-read-grants.sql
supabase/validation/09-service-role-grants.sql
supabase/validation/08-create-registration-rpc-contract.sql
supabase/validation/07-clean-dev-post-execution-summary.sql
supabase/migrations/20260705000100_api_rate_limits.sql
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
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=<clean-dev-project-ref> npm run test:integration:rpc
```

If `GATHERUP_RUN_RPC_INTEGRATION` is not set to `1`, `GATHERUP_RPC_INTEGRATION_TARGET` is not set to `clean-dev`, or `GATHERUP_RPC_INTEGRATION_ALLOWED_REF` does not match the project ref extracted from `NEXT_PUBLIC_SUPABASE_URL`, the test suite skips without touching Supabase.

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
  ✔ blocks same-event participants from uploading into another participant's payment-proofs path
  ✔ blocks replacement payment-proof uploads after the order is confirmed
  ✔ rejects malformed proof paths before they can match a Storage policy
  ✔ keeps payment-proof objects immutable for authenticated participants
  ✔ keeps refund-proof objects immutable for authenticated refund managers
GatherUp distributed rate-limit RPC
  ✔ counts requests atomically and returns a typed rejection after the limit
  ✔ does not expose the rate-limit RPC to anonymous clients
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

As of 2026-06-28, the clean validation project `oxbrxkllftyevlzmiydt` has passed this suite with 19/19 tests. Keep this command as the regression gate after schema, RPC, or Storage policy changes.

## Next RPCs To Add

Recommended order:

1. Add refund participant confirmation and dispute RPCs, then extend this suite around those states.
2. Add notification delivery side-effect assertions after live RPC success.
3. Add UI/API smoke tests that exercise the verified RPC paths through real route handlers rather than direct Supabase RPC calls only.

Keep each integration test isolated, self-cleaning, and opt-in.
