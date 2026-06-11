# Delivery Status

This repo is in a local-ready, staging-required state.

Do not treat old `*PageNew` notes or local mock evidence as production readiness. The canonical app surfaces are the routes declared in `apps/frontend/src/App.tsx` and documented in [docs/MAPRANG_TEST_PLAN.md](docs/MAPRANG_TEST_PLAN.md).

## Delivered Locally

- Explore, character lobby, chat, my chats, creator studio, events, profile, wallet, moderation, admin health, prompt inspector, evals, and not-found routes are covered by audits.
- Frontend API helpers are checked against backend route declarations.
- Backend deterministic tests and local smoke cover chat, stream chat, creator draft fallback, reports/admin audit, wallet ledger, storage fallback, relationship, scene, prompt, and world-state paths.
- Playwright smoke covers desktop and mobile core flows.

## Required Before Production Delivery

- Real staging and production environment variables.
- Managed PostgreSQL target smoke.
- Supabase private `avatars` bucket and signed URL check.
- Live chat provider smoke.
- Live image provider smoke.
- Deployed HTTPS frontend/backend URLs and production CORS.

## Verification Commands

```powershell
bun run qa:full
bun run staging:verify
bun run production:check
```
