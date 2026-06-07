# GatherUp GitHub repository profile copy

Last updated: 2026-06-06

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

Current status: frontend prototype plus commercial v0.1 backend foundation drafts, contract tests, and live Supabase preflight coverage audit.

The codebase already includes the Next.js app skeleton, local/mock workflows, Supabase Auth/profile adapter preparation, route protection middleware, commercial schema/seed/Storage SQL drafts, auth/schema/storage contract tests, event creation prototype, organizer workspace, registration flow, payment review prototype, seat management prototype, finance prototype, notification center, venue intelligence prototype, and real Supabase validation runbooks/logs.

The live Supabase project has been restored and audited. It is partially initialized, not empty and not complete, so the full schema draft must not be run against it as-is. The next engineering phase is to validate `schema.sql`, `seed.sql`, and `storage.sql` in a fresh dev/staging Supabase project, then implement transactional service functions, replace prototype data with real Supabase-backed workflows, enforce explicit permissions, write audit logs, connect Storage uploads, add organizer verification, and build minimum admin review.

## One-paragraph README Summary

GatherUp is an offline event operations platform focused first on community/fandom activities such as screenings, birthday cafes, and small fan gatherings. It helps organizers manage activity creation, registration, organizer-collected payment proof review, refunds, seat selection, notifications, lightweight check-in, finance, venue knowledge, and exports in one place. The current repository contains the frontend prototype, commercial v0.1 product decisions, Supabase schema/Storage drafts, service-layer contracts, static tests, and live Supabase validation notes for moving from mock data to real Supabase-backed workflows.

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
- License decision is made.
- Public issue/PR expectations are clear.
