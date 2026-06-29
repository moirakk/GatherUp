# GatherUp GitHub repository profile copy

Last updated: 2026-06-29

Use this document when updating the GitHub repository About section, README summary, social preview copy, or public project introduction.

## Repository Name

```text
GatherUp
```

## Short Description

```text
Commercial v0.1 event operations platform for small offline community activities.
```

Alternative shorter option:

```text
Offline community event operations: registration, payment proof review, seating, check-in, finance, and exports.
```

## Website

If there is no deployed URL yet, leave the GitHub website field empty.

When deployed, suggested URL options:

```text
https://gatherup.app
https://gatherup.events
```

## Topics

Suggested GitHub topics:

```text
nextjs
react
typescript
supabase
event-management
event-registration
offline-events
community-events
ticketing
seat-selection
check-in
payment-proof
organizer-tools
```

## Public Intro

GatherUp is a commercial v0.1 event operations platform for small offline community activities.

It starts with fandom/community events such as offline screenings, birthday cafes, and small fan gatherings, where organizers often need to coordinate registration, organizer-collected payments, payment screenshots, seat selection, notifications, check-in, finance, refunds, and export lists across many separate tools.

GatherUp brings those workflows into one product while keeping the data model generic enough for campus events, workshops, small conferences, private gatherings, and markets.

## Current Status Copy

Current status: commercial v0.1 Supabase integration foundation, contract tests, organizer workflow UX improvements, clean Supabase dev/staging execution validation, Supabase SSR middleware auth, Bearer/SSR-cookie API auth, atomic registration order creation, private Storage-backed proof flows, audited payment/check-in/refund RPC paths, seat-lock concurrency validation, organizer finance permission hardening, Supabase-backed announcement publishing, and a passing opt-in real Supabase RPC/Storage integration suite.

The codebase already includes the Next.js app skeleton, mock fallback workflows for local/demo mode, Supabase Auth/profile adapters, Supabase SSR route protection middleware, Bearer/SSR-cookie API auth helpers, commercial schema/seed/Storage SQL, auth/schema/storage/API contract tests, event creation prototype, public event Supabase reads, participant registration/order Supabase paths, organizer dashboard and event workspace Supabase reads, organizer finance Supabase reads and exports, organizer workflow stepper, dynamic next-action guidance, atomic registration RPC integration, JWT-protected organizer APIs, private payment-proof and refund-proof Storage paths, audited payment-review/check-in/refund RPCs, seat-lock RPC/API paths with a real order-detail seat selection panel, notification domain contracts, in-app notification API/UI, Supabase-backed announcement publishing, seat management prototype, venue intelligence prototype, architecture briefing docs, committed README screenshots, and real Supabase validation runbooks/logs.

The original live Supabase project has been restored and audited. It is partially initialized, not empty and not complete, so the full schema draft must not be run against it as-is. A clean dev/staging Supabase project executed `schema.sql`, `seed.sql`, corrected `storage.sql`, post-execution validation scripts, and the opt-in RPC/Storage integration suite. The latest clean validation baseline passed 19/19 real Supabase integration tests against project ref `oxbrxkllftyevlzmiydt`. The next engineering phase is to keep replacing remaining prototype surfaces with real Supabase-backed workflows, finish event creation and expense persistence, add organizer verification, connect external notification delivery, and build minimum admin review.

## One-paragraph README Summary

GatherUp is an offline event operations platform focused first on community/fandom activities such as screenings, birthday cafes, and small fan gatherings. It helps organizers manage activity creation, registration, organizer-collected payment proof review, refunds, seat selection, notifications, lightweight check-in, finance, venue knowledge, and exports in one place. The current repository contains the commercial v0.1 product decisions, Supabase schema/Storage/RLS foundation, atomic registration and audited workflow RPCs, JWT/SSR-cookie-gated APIs, private Storage-backed proof submission paths, Supabase-backed participant and organizer workspaces, static contract tests, opt-in real Supabase RPC/Storage integration tests, committed product screenshots, and validation notes for finishing the move from prototype fallback paths to real database-backed workflows.

## Social Preview Caption

```text
GatherUp: reliable operations for small offline community events.
```

## Maintainer-facing Notes

Recommended repository visibility while the product is still pre-commercial:

- Private, if product strategy and implementation are not ready to share.
- Public only after removing sensitive local configuration and confirming the README accurately describes prototype limitations.

Before making the repository public, confirm:

- No secrets are committed.
- `.env.local` is ignored.
- Prototype limitations are clearly stated.
- License decision is made and reflected in `LICENSE.md`.
- Security reporting expectations are reflected in `SECURITY.md`.
- Contribution expectations are reflected in `CONTRIBUTING.md`.
- Public issue/PR expectations are clear.
