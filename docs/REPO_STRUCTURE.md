# Maprang Repo Structure

This file is the short operator map for the current repository. Use it when you need to know which folder or root file owns each part of the system.

## Product Code

- `apps/backend`: Bun/Elysia API, Prisma access, roleplay runtime, relationship/scene/context engines, admin routes, storage adapters, and backend smoke behavior.
- `apps/backend/prisma`: Prisma schema, migrations, seed scripts, QA seed utilities, and QA clear utilities.
- `apps/frontend`: React 19, Vite, Redux Toolkit frontend for Explore, Chat, Creator Studio, My Chats, Wallet, Profile, Events, Moderation, Admin Health, Prompt Inspector, and Evals.
- `apps/frontend/tests`: frontend component and route contract tests.

## QA And Automation

- `scripts`: repo-owned audits, smoke tests, deployment checks, secret scanners, route/API audits, Supabase setup checks, and readiness scripts.
- `tests/e2e`: Playwright smoke coverage for desktop and mobile browser flows.
- `evals`: local roleplay evaluation fixtures and Promptfoo config.
- `test-results`: generated Playwright output; not a source of truth.

## Runtime Knowledge

- `memory`: current work state, deploy blockers, production checklist, decisions, and handoff history.
- `knowledge`: structured knowledge used by context and RAG-style runtime logic.
- `AGENTS.md`: entry point for future agents.
- `agent.md`: canonical agent/developer operating guide.

## Deployment Files

- `render.yaml`: Render Blueprint for backend Docker service, frontend static site, and managed Postgres.
- `DEPLOY_RENDER.md`: step-by-step Render deployment guide.
- `PRODUCTION_SETUP.md`: production environment setup guide.
- `STAGING_RUNBOOK.md`: staging verification path.
- `RELEASE_HANDOFF.md`: release evidence template.
- `SECURITY_CHECKLIST.md`: security and secret-handling checklist.
- `docker-compose.yml`: local PostgreSQL for development and local QA.

## Product And QA Documentation

- `README.md`: project overview and primary command list.
- `START_HERE.md`: current local run path and source-of-truth pointers.
- `RUN_NOW.md`, `HOW_TO_RUN.md`, `QUICK_START.md`: local operator guides.
- `docs/MAPRANG_TEST_PLAN.md`: repo-owned test plan aligned with the current stack and routes.
- `ROUTE_MENU_AUDIT.md`: route/menu behavior contract and disabled-reason audit.
- `DEPLOYMENT_QA.md`, `DEPLOYMENT_CHECKLIST.md`, `DEPLOYMENT_GUIDE.md`: QA/deployment support docs.
- `FINAL_STATUS.md`, `FINAL_DELIVERY.md`: historical delivery summaries.

## Root Config

- `package.json`: root command registry and QA gates.
- `bun.lock`: dependency lockfile.
- `playwright.config.ts`: Playwright configuration.
- `tsconfig.json`: shared TypeScript settings.
- `.github`: CI/workflow configuration.
- `.gitignore`, `.dockerignore`, `.socraticodeignore`: ignore rules.

## Current External Blockers

These cannot be completed by repo edits alone:

- Deploy backend to a real HTTPS URL and set `SMOKE_API_BASE_URL`.
- Deploy frontend to a real HTTPS domain and set frontend `VITE_API_BASE_URL`.
- Set backend `CORS_ORIGINS` to the real frontend HTTPS origin only.
- Configure Supabase Storage bucket `avatars` as private signed URL storage.
- Configure a real image generation provider and pass `bun run smoke:image:live`.
- Pass live chat smoke on staging or production before setting live verification flags.

After those are configured, run:

```powershell
bun run staging:verify
bun run e2e:smoke
bun run smoke:image:live
bun run smoke:chat
bun run production:check
```
