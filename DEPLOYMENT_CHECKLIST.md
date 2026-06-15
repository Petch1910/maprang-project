# Deployment Checklist

Use this checklist with [STAGING_RUNBOOK.md](STAGING_RUNBOOK.md), [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md), and [memory/production/checklist.md](memory/production/checklist.md).

## Local Gate

- [x] `bun run secrets:check`
- [x] `bun run docs:commands`
- [x] `bun run frontend:static:audit`
- [x] `bun run frontend:route:audit`
- [x] `bun run route-menu:audit`
- [x] `bun run api:audit`
- [x] `bun run backend:check`
- [x] `bun run backend:check:db:test`
- [x] `bun run qa:full`
- [x] `git diff --check`

## Staging Gate

- [ ] HTTPS backend is deployed.
- [ ] HTTPS frontend is deployed.
- [ ] `CORS_ORIGINS` contains the staging frontend origin only.
- [ ] Staging `DATABASE_URL` points at managed PostgreSQL.
- [ ] Prisma migrations ran against staging.
- [ ] Supabase Auth values are configured.
- [ ] Supabase Storage bucket `avatars` is private and signed URL mode is enabled.
- [ ] `bun run staging:verify` passes.

## Production Gate

- [ ] Production `DATABASE_URL` points at managed PostgreSQL.
- [ ] Production frontend and backend domains are final.
- [ ] Production `CORS_ORIGINS` is locked to final frontend origins.
- [ ] Live chat provider is configured.
- [ ] Live image provider is configured.
- [ ] `bun run smoke:chat` passes.
- [ ] `bun run smoke:image:live` passes.
- [ ] `bun run production:check` passes.

## Production Blocker Rule

Local `local/mock-roleplay` and fallback image generation are valid for local QA only. They do not clear staging or production.
