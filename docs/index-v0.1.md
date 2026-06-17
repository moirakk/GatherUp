# GatherUp v0.1 documentation index

Last updated: 2026-06-12

This index organizes the GatherUp documents by how they should be used. The commercial v0.1 documents are the current source of truth for product direction.

## Start Here

- [Current project state](./current-state-v0.1.md): what exists in the codebase today.
- [Project architecture brief](./project-architecture-brief-v0.1.md): structured product and engineering architecture summary for reviews.
- [Product operating map](./product-operating-map-v0.1.md): one-page product and engineering map for commercial v0.1.
- [Commercial v0.1 PRD](./commercial-v0.1-prd.md): commercial product requirements and acceptance criteria.
- [Commercial v0.1 decision log](./decision-log-v0.1.md): confirmed decisions and rationale.
- [Commercial v0.1 engineering plan](./commercial-v0.1-engineering-plan.md): phased implementation plan.
- [Schema validation checklist](./schema-validation-checklist-v0.1.md): SQL, RLS, Storage, and service-layer validation checklist.
- [Clean Supabase validation checklist](./supabase-clean-project-validation-v0.1.md): step-by-step clean dev/staging SQL execution checklist.
- [RPC integration testing guide](./rpc-integration-testing-v0.1.md): opt-in real Supabase RPC integration test setup and failure logging guide.
- [Supabase live validation log](./supabase-live-validation-log-v0.1.md): real Supabase project checks and findings.
- [Service-layer contract](./service-layer-contract-v0.1.md): required server-side operations and invariants.
- [GitHub repository profile copy](./github-repository-profile-v0.1.md): suggested GitHub About, description, topics, and public-facing intro.
- [Contributing guide](../CONTRIBUTING.md): collaboration rules, verification expectations, and PR standards.
- [Security policy](../SECURITY.md): security reporting process and current security boundaries.
- [License](../LICENSE.md): current proprietary license boundary.

## Product

- [Project architecture brief](./project-architecture-brief-v0.1.md): concise architecture, module, validation, and roadmap summary.
- [Product operating map](./product-operating-map-v0.1.md): current commercial v0.1 product map.
- [Commercial v0.1 PRD](./commercial-v0.1-prd.md): requirements and acceptance criteria.
- [Commercial v0.1 decision log](./decision-log-v0.1.md): confirmed business decisions and rationale.
- [Service-layer contract](./service-layer-contract-v0.1.md): business operations that must not be frontend-only.

## Engineering

- [Current project state](./current-state-v0.1.md): implemented code, limits, and next steps.
- [Schema validation checklist](./schema-validation-checklist-v0.1.md): how to validate the commercial schema draft.
- [Commercial engineering plan](./commercial-v0.1-engineering-plan.md): implementation order from auth to launch readiness.
- [Service-layer contract](./service-layer-contract-v0.1.md): service operations, invariants, and current implementation gap.

## Supabase

- [Supabase SQL execution runbook](./supabase-sql-execution-runbook-v0.1.md): step-by-step schema and seed execution guide.
- [Clean Supabase validation checklist](./supabase-clean-project-validation-v0.1.md): operational checklist for validating schema, seed, and Storage SQL on a fresh dev/staging project.
- [RPC integration testing guide](./rpc-integration-testing-v0.1.md): how to run opt-in live RPC tests against clean Supabase.
- [Supabase live validation log](./supabase-live-validation-log-v0.1.md): live project preflight and validation findings.
- [Schema SQL draft](../supabase/schema.sql): PostgreSQL/Supabase schema draft.
- [Seed SQL draft](../supabase/seed.sql): sample data draft.
- [Storage SQL draft](../supabase/storage.sql): Supabase Storage buckets and RLS policy draft.
- [Supabase validation SQL files](../supabase/validation): copy-ready SQL checks for Supabase SQL Editor.

## Code Artifacts

- [Web app source](../src): Next.js App Router application.
- [Supabase drafts](../supabase): schema, seed, and Storage policy SQL.
- [Tests](../tests): auth and SQL/Storage contract tests.

## Repository Governance

- [Contributing guide](../CONTRIBUTING.md): how to coordinate changes and verify them.
- [Security policy](../SECURITY.md): how to report vulnerabilities privately.
- [License](../LICENSE.md): current repository license terms.

## How To Use These Docs

For new product decisions:

1. Confirm the decision in conversation or planning.
2. Add the stable decision to [Commercial v0.1 decision log](./decision-log-v0.1.md).
3. Reflect implementation requirements in [Commercial v0.1 PRD](./commercial-v0.1-prd.md).
4. Update schema, service-layer plans, tests, or runbooks only after the decision is stable.

For implementation:

1. Read the PRD section for the feature.
2. Check the decision log for the exact rule.
3. Update schema/service/permission rules before UI work.
4. Add tests and verification criteria before considering the feature complete.
