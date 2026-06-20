# GatherUp

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict%20frontend-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Postgres%20%2B%20Storage-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![CI](https://github.com/moirahoumiki/GatherUp/actions/workflows/ci.yml/badge.svg)](https://github.com/moirahoumiki/GatherUp/actions/workflows/ci.yml)
[![Tests](https://img.shields.io/badge/tests-contract%20%2B%20opt--in%20RPC%20integration-6f8f78)](#quality-bar)

GatherUp is a commercial v0.1 event operations platform for small offline community activities.

The first priority scenario is fandom/community activity operations: offline screenings, birthday cafes, small fan gatherings, and similar events where organizers need to manage registration, organizer-collected payment proofs, seat selection, notifications, check-in, finance, and exports in one place.

GatherUp is designed as a general offline event platform, not a fandom-only tool. The model keeps activity scene, workflow template, visibility, payment, registration, seating, check-in, finance, and venue intelligence separate so the product can later support campus events, workshops, small conferences, private gatherings, and markets.

## At A Glance

- Product: offline community event operations, starting with fandom/community activities.
- Core users: organizers, participants, event staff, finance/refund reviewers, and future platform admins.
- Core workflows: event setup, registration, organizer-collected payment proof, review, seating, check-in, refund tracking, finance, and export.
- Current engineering stage: prototype UI plus commercial v0.1 Supabase transaction foundation.
- Reliability direction: PostgreSQL RPCs for atomic state changes, Supabase RLS/Storage for access boundaries, and contract tests to prevent accidental regression.

## Repository

- GitHub: [github.com/moirahoumiki/GatherUp](https://github.com/moirahoumiki/GatherUp)
- Current branch: `main`
- Current stage: commercial v0.1 foundation, moving from prototype flows into Supabase-backed transactional workflows.
- License: proprietary / all rights reserved during pre-commercial development.

## Product Preview

The screenshots below are generated from the local Next.js app and committed as repository assets.

| Account and Auth Foundation | Public Event Detail |
| --- | --- |
| ![GatherUp account and auth screen](./docs/assets/gatherup-home.png) | ![GatherUp public event detail screen](./docs/assets/gatherup-event-detail.png) |

## Product Architecture Snapshot

```mermaid
flowchart LR
  Visitor["Visitor / Participant"] --> PublicEvent["Public or link-only event page"]
  PublicEvent --> Auth["Supabase Auth"]
  Auth --> Registration["Atomic registration RPC"]
  Registration --> Payment["Organizer-collected payment proof"]
  Payment --> Review["Organizer payment review RPC"]
  Review --> Seat["Seat lock and assignment RPC"]
  Review --> CheckIn["Check-in RPC"]
  Review --> Refund["Refund request / review / proof RPCs"]

  Organizer["Organizer workspace"] --> EventOps["Event setup and operations"]
  EventOps --> Review
  EventOps --> Seat
  EventOps --> CheckIn
  EventOps --> Finance["Finance and export"]

  Supabase["Supabase PostgreSQL + RLS + Storage"] --> Registration
  Supabase --> Payment
  Supabase --> Review
  Supabase --> Seat
  Supabase --> CheckIn
  Supabase --> Refund
```

## Directory Snapshot

```text
GatherUp/
├── src/
│   ├── app/                         Next.js App Router pages and API routes
│   │   ├── api/                     Authenticated workflow endpoints
│   │   ├── events/                  Public event detail and registration flows
│   │   ├── me/                      Participant profile and order detail
│   │   ├── organizer/               Organizer workspace and event console
│   │   └── venues/                  Venue intelligence prototype
│   ├── components/                  Shared UI and workflow components
│   └── lib/                         Auth, data access, Supabase, and server helpers
├── supabase/
│   ├── schema.sql                   Commercial v0.1 database schema and RPCs
│   ├── seed.sql                     Demo seed data
│   ├── storage.sql                  Private Storage buckets and policies
│   └── validation/                  Copy-ready SQL validation scripts
├── tests/
│   └── integration/rpc/             Opt-in real Supabase RPC integration tests
├── docs/                            Product, architecture, runbooks, and status docs
└── prototype/                       Earlier reference/prototype artifacts
```

## Status

Current status: **commercial v0.1 foundation with Supabase-backed public reads, Supabase SSR/Bearer-gated endpoints, atomic registration order creation, and the first private Storage proof-upload paths in progress**.

Implemented prototype coverage:

- Next.js App Router, TypeScript, React, global CSS.
- Unified account prototype: one account can participate in events and organize events.
- Login/register/code/reset UI with Supabase Auth adapter preparation.
- Activity square, event detail, registration flow, order detail, profile center.
- Organizer workspace, event creation wizard, event management console, finance center.
- Organizer workflow stepper and dynamic next-action guidance for the main organizer workspace and per-event management console.
- Local event draft saving, publish readiness checks, and local created event records.
- Organizer promotion center, notification center, payment review prototype, seat management prototype.
- Venue intelligence prototype.
- Supabase client dependency, Auth adapter, user profile sync adapter, schema/seed/Storage SQL drafts, and contract tests.
- Server-side Supabase read adapter for public event listing and public/unlisted event detail, with mock fallback when Supabase is not configured or unavailable.
- Initial guarded server APIs for event creation, registration orders, payment review, check-in verification, and Excel exports.
- Organizer-sensitive APIs now use a shared Supabase auth helper that accepts verified Bearer tokens for API clients and Supabase SSR session cookies for same-origin browser requests; they no longer trust local prototype cookies.
- Route protection now uses Supabase SSR middleware with verified `getUser()` session checks and cookie refresh support when Supabase is configured.
- Atomic registration RPC draft for real Supabase order creation: user identity is resolved in PostgreSQL through `current_app_user_id()`, event capacity is checked under an event-row lock, order numbers are generated through `event_order_counters`, attendee and payment stub rows are created in the same database transaction path.
- Participant registration order creation now calls the atomic RPC through an authenticated Supabase client. Paid orders return the generated registration and payment identifiers needed for Storage-backed payment proof submission.
- Payment proof submission has started moving to a real private Storage flow: the browser uploads to the `payment-proofs` bucket under the policy path `{event_id}/{registration_id}/{payment_id}/{filename}`, then a JWT-protected API records the proof and moves the order into payment review.
- Refund proof submission now has an initial private Storage-backed path: refund managers upload transfer proof to `refund-proofs` under `{event_id}/{refund_request_id}/{filename}`, then a JWT-protected API records the proof through an audited RPC and moves the refund to proof uploaded.
- Seat locking now has PostgreSQL RPC drafts plus JWT API entry points for expiring stale locks, creating active locks, and confirming assignments under database constraints. The order detail page has an initial real seat-selection panel; live Supabase validation is still pending.
- Check-in verification now has an audited PostgreSQL RPC path: event staff submit a check-in code through the JWT API, and the database updates the order, attendees, `check_ins`, and `audit_logs` together.
- Supabase SSR middleware login redirect foundation and safe internal `next` path handling.
- Real Supabase live project preflight, read-only coverage audit logs, and clean dev/staging schema, seed, and Storage execution notes.

Not production-ready yet:

- Most business workflows still use mock/local prototype data; public event listing and public/unlisted event detail now have an initial Supabase read path.
- Real write APIs are still early integration endpoints. Registration creation now uses the database RPC for atomic order numbering and capacity protection, organizer APIs verify Supabase identities through Bearer or SSR cookie sessions, payment proof upload has an initial Storage-backed path, payment review has an audited RPC draft wired through the API, and seat locking has RPC-backed API endpoints with an initial order-detail UI; full live RLS verification still needs production-grade implementation.
- Event creation, finance, and admin workflows are not yet fully backed by production-grade database services; payment review, payment proof submission, refund request/review/proof upload, seat selection, and check-in now have initial RPC/API paths that still need live Supabase validation.
- Mutating API routes now have a shared in-process rate limiter and a contract test that blocks new write endpoints without rate limiting. This is an early abuse-control baseline for local and single-instance deployments; multi-instance production should replace the in-memory bucket store with a shared Redis/Upstash-backed limiter.
- Supabase schema, seed, and Storage policy drafts exist. The original live project has been restored and audited as partially initialized. A clean dev/staging project has been created, `schema.sql` and `seed.sql` have executed successfully, and `storage.sql` has been corrected after a real enum mismatch surfaced during execution.
- Anonymous public-read grants for public event detail surfaces are now included in the schema draft and local contract tests. The follow-up grant patch and consolidated post-execution summary SQL still need to be run in the clean Supabase project after dashboard access/tooling is available.
- Permission enforcement and RLS need continued real database testing beyond the first public read path.
- Broader transactional service functions, email business notifications, organizer verification UI, admin review UI, complaints, and data retention jobs are still planned.

## Commercial v0.1 Direction

Commercial v0.1 is not a UI-only milestone. It must become a reliable workflow product with real data, explicit permissions, and auditability.

The target workflow:

1. Organizer becomes eligible to create paid events.
2. Organizer creates and publishes an event.
3. Participant views the shared event page.
4. Participant logs in and registers.
5. System creates an order and temporarily holds capacity.
6. Participant pays the organizer directly through organizer-configured WeChat/Alipay collection information.
7. Participant uploads payment proof.
8. Organizer reviews payment proof.
9. Participant selects seats when eligible.
10. Organizer sends notifications, manages attendees, and checks participants in onsite.
11. Organizer handles refunds, finance, and export when needed.
12. Platform admin can review, configure, audit, and intervene.

Important confirmed decisions:

- First scenario: fandom/community activities.
- Early payment model: organizer-collected payment, not platform-held funds.
- Future extension: platform-collected payments can be added later.
- Paid activities require organizer verification.
- All users can create free activities.
- New events default to link-only visibility.
- Linked event detail can be viewed before login, but registration/payment/order actions require login.
- GatherUp ID remains the public user identifier.
- Seat selection uses temporary locks.
- Refund tracking, lightweight check-in, notifications, export, finance, complaints, admin review, and audit logs are part of the commercial v0.1 scope.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Supabase JavaScript client
- Supabase Auth, PostgreSQL, and Storage as planned backend foundation
- lucide-react icons
- Global CSS design tokens

## Quality Bar

GatherUp is intentionally being moved from a prototype into a reliable product foundation. Current quality gates include:

- Static contract tests for auth rules, route protection, schema structure, seed data, Storage policy shape, and API/RPC wiring.
- GitHub Actions CI for push and pull request verification.
- Domain status-machine tests for registration, payment, refund, and check-in workflows, aligned with Supabase enum values.
- Workflow event contract tests that derive audit actions, notification types, audiences, and risk levels from valid status transitions.
- Notification queue contract tests that turn workflow events into channel-aware notification items without sending external messages yet.
- Notification delivery schema contract that keeps queued message content, template keys, and metadata persistable in Supabase.
- In-app notification API contract for authenticated reads and RPC-scoped read-state updates.
- Shared notification bell UI for Supabase sessions, backed by the in-app notification API.
- Shared server rate limiting is enforced on all mutating API routes, with an API contract test that scans every `POST`, `PATCH`, `PUT`, and `DELETE` route for `enforceRateLimit(request)`.
- Registration creation RPC writes participant in-app notifications for payment or confirmation next steps.
- Payment proof submission trigger writes in-app review notifications for event payment managers.
- Payment review RPC writes participant in-app notifications in the same transaction as approval/rejection state changes.
- Seat assignment RPC writes participant in-app notifications after a seat is confirmed.
- Check-in RPC writes participant in-app notifications after onsite check-in succeeds.
- Refund request RPC writes in-app review notifications for event refund managers.
- Refund review RPC writes participant in-app notifications when refund requests are approved or rejected.
- Refund proof upload RPC writes participant in-app notifications after transfer proof is recorded.
- Opt-in real Supabase RPC integration tests for registration creation, duplicate protection, capacity contention, payment review, check-in, and refund request/review/proof upload.
- Database-first transactional design for sensitive workflows: registration, payment review, seat locking, check-in, and refunds are represented as PostgreSQL RPC paths rather than loose client-side state changes.
- Supabase SSR middleware and Bearer-token API support so browser sessions and external API calls share the same verified identity model.
- API route authentication is guarded by a directory-scanning contract test: every `src/app/api/**/route.ts` file must call the shared Supabase server auth helpers inside the handler because middleware intentionally lets `/api` requests reach route-level authorization.
- Private Storage path contracts for sensitive proof files, including payment proofs and refund proofs.
- Documentation-first runbooks for clean Supabase project execution, validation logging, and future service-layer expansion.

Current local verification:

```bash
npm test
npm run verify
npm run typecheck
npm run build
```

Opt-in live Supabase verification:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc
```

## Local Development

Install dependencies:

```bash
npm install
```

Run the local app:

```bash
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000
```

Recommended checks:

```bash
npm test
npm run verify
npm run typecheck
npm run build
```

Real Supabase RPC integration checks are opt-in:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc
```

This requires `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. The test creates isolated temporary Supabase Auth users and events, validates `create_registration_atomic`, `review_payment_atomic`, `check_in_order_atomic`, and the refund request/review/proof-upload RPC chain, then cleans up.

The project currently recommends `dev:webpack` for local preview because it has been more stable than Turbopack dev mode in this workspace.

## Demo Account

When Supabase is not configured, the app falls back to local prototype account behavior.

```text
Email: miki@gatherup.local
Password: gatherup123
```

This demo mode is for prototype verification only. It is not a production account system.

## Documentation

Start here:

- [Documentation index](./docs/index-v0.1.md)
- [Project architecture brief](./docs/project-architecture-brief-v0.1.md)
- [Product operating map](./docs/product-operating-map-v0.1.md)
- [Commercial v0.1 PRD](./docs/commercial-v0.1-prd.md)
- [Commercial v0.1 decision log](./docs/decision-log-v0.1.md)
- [Commercial v0.1 engineering plan](./docs/commercial-v0.1-engineering-plan.md)
- [Service-layer contract](./docs/service-layer-contract-v0.1.md)
- [Schema validation checklist](./docs/schema-validation-checklist-v0.1.md)
- [Current project state](./docs/current-state-v0.1.md)
- [GitHub repository profile copy](./docs/github-repository-profile-v0.1.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [License](./LICENSE.md)

Product and architecture:

- [Product operating map](./docs/product-operating-map-v0.1.md)
- [Commercial v0.1 PRD](./docs/commercial-v0.1-prd.md)
- [Commercial v0.1 decision log](./docs/decision-log-v0.1.md)
- [Commercial v0.1 engineering plan](./docs/commercial-v0.1-engineering-plan.md)
- [Service-layer contract](./docs/service-layer-contract-v0.1.md)

Supabase:

- [SQL draft](./supabase/schema.sql)
- [Seed draft](./supabase/seed.sql)
- [Storage policy draft](./supabase/storage.sql)
- [Copy-ready Supabase validation SQL files](./supabase/validation)
- [Schema validation checklist](./docs/schema-validation-checklist-v0.1.md)
- [Supabase SQL execution runbook](./docs/supabase-sql-execution-runbook-v0.1.md)
- [Clean Supabase validation checklist](./docs/supabase-clean-project-validation-v0.1.md)
- [Supabase live validation log](./docs/supabase-live-validation-log-v0.1.md)
- [RPC integration testing guide](./docs/rpc-integration-testing-v0.1.md)

## Engineering Principles

From this point forward, GatherUp should be developed as a reliable product, not as surface-level prototype work.

Every core feature should be implemented in this order:

1. Confirm business rules.
2. Fix data model and state machine.
3. Define permissions and RLS/service checks.
4. Implement service layer or server action.
5. Connect UI.
6. Add focused tests.
7. Verify with real Supabase behavior where applicable.

## Next Milestones

Recommended order:

1. Run `supabase/validation/06-public-read-grants.sql` and `07-clean-dev-post-execution-summary.sql` in the clean Supabase project and record the results.
2. Execute `GATHERUP_RUN_RPC_INTEGRATION=1 npm run test:integration:rpc` against clean Supabase to validate registration creation, duplicate protection, unauthenticated rejection, concurrent capacity behavior, payment review, and check-in.
3. Expand the real data service layer beyond public reads: event creation, draft/publish, organizer roles, visibility, capacity, and review gates.
4. Auth foundation: continue replacing prototype page cookies with durable Supabase SSR/session handling while preserving Bearer token support for API clients.
5. Validate the new private Storage payment-proof flow against the clean Supabase project with real user sessions.
6. Organizer-collected payment proof workflow: collection-code versions, review, top-up, overpayment/underpayment.
7. Validate the audited payment review RPC against the clean Supabase project.
8. Validate the order-detail seat selection flow against real Supabase users and concurrency behavior.
9. Validate seating against real Supabase users, then continue refund confirmation, disputes, notifications, export jobs, complaints, and minimum admin backend.

## Repository Notes

Suggested GitHub description, topics, and About copy are documented in:

- [GitHub repository profile copy](./docs/github-repository-profile-v0.1.md)

Repository governance:

- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [License](./LICENSE.md)
- GitHub issue templates for bugs, feature requests, and engineering tasks.
- GitHub pull request template with risk, workflow, verification, and security sections.
