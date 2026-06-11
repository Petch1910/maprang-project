# Current Status

Maprang AI is locally playable and the repo-owned QA gates are green for the current baseline.

This does not mean production is complete. Staging and production still require real external infrastructure and live-provider smoke evidence.

## Local Ready

- Frontend routes and menu surfaces are audited.
- Backend route contract is audited against frontend API helpers.
- Local/mock roleplay mode supports local chat testing without a live provider.
- Browser smoke covers the core desktop and mobile flows.
- PostgreSQL + Prisma is the database baseline.

## Still Required Before Production

- Deployed HTTPS backend URL.
- Deployed HTTPS frontend URL.
- Real `CORS_ORIGINS` for the deployed frontend.
- Production or staging PostgreSQL database migration and smoke evidence.
- Supabase project with private `avatars` bucket and signed URL checks.
- Live chat provider smoke.
- Live image provider smoke.

## Source Of Truth

- Local run guide: [START_HERE.md](START_HERE.md), [RUN_NOW.md](RUN_NOW.md)
- Test plan: [docs/MAPRANG_TEST_PLAN.md](docs/MAPRANG_TEST_PLAN.md)
- Deployment readiness: [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md), [STAGING_RUNBOOK.md](STAGING_RUNBOOK.md)
- Current blockers: [memory/deploy-blockers.md](memory/deploy-blockers.md)
