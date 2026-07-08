# Contributing To GatherUp

GatherUp is currently a focused pre-commercial product project, not a general open-source project. Contributions should be coordinated with the repository owner before implementation.

## Development Principles

Core workflows should be built in this order:

1. Confirm the business rule.
2. Update the data model and state machine.
3. Define permissions, RLS, and service boundaries.
4. Implement server-side logic or PostgreSQL RPCs for sensitive transitions.
5. Connect the UI.
6. Add focused tests.
7. Verify against real Supabase behavior when applicable.

## Local Setup

```bash
npm install
npm run dev:webpack -- --hostname 127.0.0.1 --port 3000
```

Copy `.env.example` to `.env.local` when testing real Supabase behavior. Never commit `.env.local`.

## Verification

Before proposing a change, run:

```bash
npm test
npm run verify
git diff --check
```

For high-risk backend changes, also run:

```bash
npm run build
```

Real Supabase RPC tests are opt-in and should only run against a clean dev/staging project:

```bash
GATHERUP_RUN_RPC_INTEGRATION=1 GATHERUP_RPC_INTEGRATION_TARGET=clean-dev GATHERUP_RPC_INTEGRATION_ALLOWED_REF=<clean-dev-project-ref> npm run test:integration:rpc
```

## Pull Request Expectations

- Keep changes scoped to one product or engineering concern.
- Do not mix unrelated refactors with feature work.
- Update README/docs when behavior, architecture, environment variables, or verification steps change.
- Include test evidence in the PR description.
- Do not commit secrets, screenshots containing private user data, or production Supabase credentials.
- Use the repository PR template and fill in risk level, workflow area, verification, and security notes.

## Issues

Use the GitHub issue templates for bug reports, feature requests, and engineering tasks. Security reports should follow [SECURITY.md](./SECURITY.md) instead of public issues.

## Documentation

Start with:

- [Documentation index](./docs/index-v0.1.md)
- [Current project state](./docs/current-state-v0.1.md)
- [Service-layer contract](./docs/service-layer-contract-v0.1.md)
- [RPC integration testing guide](./docs/rpc-integration-testing-v0.1.md)
