# Security Policy

GatherUp is currently a pre-commercial v0.1 product foundation. Security-sensitive workflows are being moved from prototype behavior into Supabase Auth, PostgreSQL RLS, private Storage policies, and audited PostgreSQL RPCs.

## Supported Version

Only the current `main` branch is actively maintained.

## Reporting A Security Issue

Please do not open a public issue for suspected vulnerabilities.

Report security concerns directly to the repository owner with:

- affected route, SQL function, policy, or workflow;
- steps to reproduce;
- expected behavior;
- observed behavior;
- impact assessment if known;
- screenshots or logs with secrets removed.

## Current Security Boundaries

- `.env`, `.env.local`, and service-role keys must never be committed.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Participant and organizer APIs should use verified Supabase Bearer tokens or Supabase SSR session cookies.
- Prototype cookies and localStorage are not trusted authorization sources for production workflows.
- Sensitive files such as payment proofs and refund proofs should use private Supabase Storage buckets and path-bound policies.
- Financial, check-in, refund, and permission-sensitive transitions should go through audited server/RPC paths.

## Known Pre-Production Limits

GatherUp is not production-ready yet. Mock/local fallback paths are intended only for unconfigured local development and explicit `NEXT_PUBLIC_GATHERUP_DEMO_MODE=1` demos. Configured Supabase deployments should surface query or permission failures instead of silently replacing real data with mock content.
