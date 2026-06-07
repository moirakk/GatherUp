# GatherUp

GatherUp is a commercial v0.1 event operations platform for small offline community activities.

The first priority scenario is fandom/community activity operations: offline screenings, birthday cafes, small fan gatherings, and similar events where organizers need to manage registration, organizer-collected payment proofs, seat selection, notifications, check-in, finance, and exports in one place.

GatherUp is designed as a general offline event platform, not a fandom-only tool. The model keeps activity scene, workflow template, visibility, payment, registration, seating, check-in, finance, and venue intelligence separate so the product can later support campus events, workshops, small conferences, private gatherings, and markets.

## Status

Current status: **frontend prototype plus commercial v0.1 backend foundation drafts, contract tests, and live Supabase preflight coverage audit**.

Implemented prototype coverage:

- Next.js App Router, TypeScript, React, global CSS.
- Unified account prototype: one account can participate in events and organize events.
- Login/register/code/reset UI with Supabase Auth adapter preparation.
- Activity square, event detail, registration flow, order detail, profile center.
- Organizer workspace, event creation wizard, event management console, finance center.
- Local event draft saving, publish readiness checks, and local created event records.
- Organizer promotion center, notification center, payment review prototype, seat management prototype.
- Venue intelligence prototype.
- Supabase client dependency, Auth adapter, user profile sync adapter, schema/seed/Storage SQL drafts, and contract tests.
- Middleware-level login redirect foundation and safe internal `next` path handling.
- Real Supabase live project preflight and read-only coverage audit logs.

Not production-ready yet:

- Core business data still uses mock/local prototype data.
- Event creation, registration, payment proof, refund, seat selection, check-in, finance, and admin workflows are not yet backed by real database services.
- Supabase schema, seed, and Storage policy drafts exist. A live Supabase project has been restored and audited, but it is partially initialized, so full SQL execution must happen first in a fresh dev/staging project.
- Permission enforcement and RLS need real database testing.
- Transactional service functions, email business notifications, organizer verification UI, admin review UI, complaints, audit log writes, and data retention jobs are still planned.

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
npm run typecheck
npm run build
```

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
- [Product operating map](./docs/product-operating-map-v0.1.md)
- [Commercial v0.1 PRD](./docs/commercial-v0.1-prd.md)
- [Commercial v0.1 decision log](./docs/decision-log-v0.1.md)
- [Commercial v0.1 engineering plan](./docs/commercial-v0.1-engineering-plan.md)
- [Service-layer contract](./docs/service-layer-contract-v0.1.md)
- [Schema validation checklist](./docs/schema-validation-checklist-v0.1.md)
- [Current project state](./docs/current-state-v0.1.md)
- [GitHub repository profile copy](./docs/github-repository-profile-v0.1.md)

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

1. Auth foundation: real Supabase session strategy, route protection, user profile sync, and `/dev/status` reliability.
2. Commercial schema update: organizer verification, activity state machine, orders, payment proofs, refunds, seat locks, audit logs, admin review.
3. Real event creation: draft, publish, organizer roles, visibility, capacity, and review gates.
4. Real registration and order service: capacity hold, order number generation, attendee records, waitlist.
5. Organizer-collected payment proof workflow: collection-code versions, Storage upload, review, top-up, overpayment/underpayment.
6. Refund tracking and finance.
7. Seat locks, assignments, and lightweight check-in.
8. Notifications, export, complaints, and minimum admin backend.

## Repository Notes

Suggested GitHub description, topics, and About copy are documented in:

- [GitHub repository profile copy](./docs/github-repository-profile-v0.1.md)
