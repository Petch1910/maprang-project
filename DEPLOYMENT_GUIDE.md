# Deployment Guide

Use this file as a deployment index. The detailed source of truth is:

- [STAGING_RUNBOOK.md](STAGING_RUNBOOK.md)
- [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)
- [DEPLOYMENT_QA.md](DEPLOYMENT_QA.md)
- [memory/production/checklist.md](memory/production/checklist.md)

## Required Before Staging Or Production

- HTTPS backend URL.
- HTTPS frontend URL.
- `CORS_ORIGINS` containing only real deployed frontend origins.
- PostgreSQL database for the target environment.
- Supabase project configured for Auth.
- Supabase Storage bucket `avatars`, private read, signed URL delivery.
- Live chat provider configured and verified.
- Live image provider configured and verified.

## Local Gate

Local mock mode proves the repo-owned flows, not production provider readiness.

```powershell
bun run qa:full
```

## Staging Gate

```powershell
bun run staging:verify
```

## Production Gate

```powershell
bun run production:check
```

## Important

Do not mark production ready from local `local/mock-roleplay` evidence. Production readiness requires live chat/image smoke, signed storage verification, deployed CORS, and target database smoke.
