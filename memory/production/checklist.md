# Production Checklist Memory

Last updated: 2026-05-13

## Before Production

- Deploy staging backend.
- Deploy staging frontend.
- Set real backend URL for frontend.
- Set real frontend domain in backend CORS.
- Run migrations against staging database.
- Verify Supabase Auth configuration.
- Verify private signed `avatars` bucket.
- Run `bun run staging:check`.
- Run ordered live provider smoke.
- Set provider live verification flags only after successful live smoke.
- Run `bun run production:check`.

## Commands

Local confidence:

```bash
bun run qa:local
```

Staging confidence:

```bash
bun run staging:check
```

Final production gate:

```bash
bun run production:check
```

Targeted live provider checks:

```bash
bun run smoke:chat
bun run smoke:image:live
```

## Do Not Do

- Do not set `CHAT_PROVIDER_LIVE_VERIFIED=1` from a local skipped smoke.
- Do not set `IMAGE_GENERATION_LIVE_VERIFIED=1` while image generation falls back to placeholder.
- Do not deploy with local CORS.
- Do not paste secrets into memory files.
