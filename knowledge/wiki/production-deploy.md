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
- Production roleplay reply budget at least `MODEL_MAX_OUTPUT_TOKENS=1200` and `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`.
- Recommended roleplay reply budget near `MODEL_MAX_OUTPUT_TOKENS=1600` and `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`.
- Live chat provider smoke.
- Live image provider smoke.
- `deploy:status` output reviewed for blocker counts and next steps.
- `staging:verify` passing against the deployed staging backend.
- `production:check` passing.

## Gate Order

1. Run local `qa:local`.
2. Review env files with `deploy:doctor`.
3. Review shared readiness output with `deploy:status`.
4. Run `staging:verify` against the real staging backend URL.
5. Run live provider smoke only after staging infra, CORS, auth, storage, and wallet are ready.
6. Set live verification flags only in the target environment after live smoke succeeds.
7. Run `production:check` and fill `RELEASE_HANDOFF.md`.

Related memory:

- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
