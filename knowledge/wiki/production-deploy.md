# Production Deploy

Production readiness requires real infrastructure and live provider verification.

## Gate Philosophy

Configured env values are not enough. Provider keys can still fail because of quota, rate limits, billing, model access, or network restrictions.

## Current Required Gates

- Real backend URL.
- Real frontend URL.
- Production CORS.
- Supabase JWT auth.
- Private signed `avatars` bucket.
- Live chat provider smoke.
- Live image provider smoke.
- `production:check` passing.

Related memory:

- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
