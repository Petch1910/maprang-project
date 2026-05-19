# Production Checklist Memory

Last updated: 2026-05-19

## Before Production

- Deploy staging backend.
- Deploy staging frontend.
- Set real backend URL for frontend.
- Set real HTTPS frontend domain in backend CORS.
- Run migrations against staging database.
- Verify Supabase Auth configuration.
- Verify private signed `avatars` bucket.
- Run `bun run deploy:doctor -- --backend-env <backend-env> --frontend-env <frontend-env>` before pointing smoke at staging.
- Run `bun run deploy:status` to confirm blocker next steps are visible.
- Run `bun run staging:check`.
- After staging domains exist, run `bun run staging:verify` with `SMOKE_API_BASE_URL` and `SMOKE_ADMIN_API_KEY`.
- Run ordered live provider smoke.
- Set provider live verification flags only after successful live smoke.
- Run `bun run production:check`.
- Fill `RELEASE_HANDOFF.md` after `production:check` passes, without secrets or private database URLs.
- Run `bun run release:handoff:check -- --filled` before sharing the handoff.
- Use `/admin/health` to follow the next action shown on every blocker before rerunning the final gate.

## Commands

Local confidence:

```bash
bun run qa:local
```

Environment file review:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env.production --frontend-env apps/frontend/.env.production
bun run deploy:status
```

Staging confidence:

```bash
bun run staging:check
SMOKE_API_BASE_URL=https://<backend-staging-domain> SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

Final production gate:

```bash
bun run production:check
```

Targeted live provider checks:

```bash
bun run api:smoke:live
bun run smoke:chat
bun run smoke:image:live
```

## Do Not Do

- Do not set `CHAT_PROVIDER_LIVE_VERIFIED=1` from a local skipped smoke.
- Do not set `IMAGE_GENERATION_LIVE_VERIFIED=1` while image generation falls back to placeholder.
- Do not deploy with local or non-https CORS.
- Do not paste secrets into memory files.
- Do not point `qa:local` or DB-backed backend tests at production data unless test record creation is intentional.
