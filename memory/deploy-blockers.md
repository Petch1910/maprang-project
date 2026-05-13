# Deploy Blockers

Last updated: 2026-05-14

## Active Blockers

### Backend and frontend URLs

Status: blocked until staging/production hosting exists

Current issue:
- Smoke environment still points at local backend/frontend URLs.

Required:
- Set deployed backend URL for `SMOKE_API_BASE_URL`.
- Set deployed backend URL for frontend `VITE_API_BASE_URL`.
- Set real frontend domain in backend `CORS_ORIGINS`.

### Chat provider live verification

Status: needs verification

Current issue:
- One live chat smoke returned a real model reply with token usage and wallet debit.
- A later live chat smoke reached the provider failure path.
- Provider failures are now classified as `usage.providerFailure`, but the live provider path still needs a clean staging smoke before production.

Required:
- Run `bun run smoke:chat` or `bun run api:smoke:live` against staging.
- Verify a real model reply, `chatId`, token usage, and matching `CHAT_USAGE` wallet transaction.
- Then set `CHAT_PROVIDER_LIVE_VERIFIED=1` only in that target environment.

### Image provider live verification

Status: blocked by provider account

Current issue:
- `bun run smoke:image:live` falls back to placeholder because image provider reports billing hard limit.

Required:
- Increase or reset the image provider billing/quota limit.
- Rerun `bun run smoke:image:live` or `bun run api:smoke:live`.
- Set `IMAGE_GENERATION_LIVE_VERIFIED=1` only after generated image provider returns `configured`.

## Not Blockers

- Local backend test suite currently passes.
- Local API smoke currently passes.
- Frontend build and bundle budget currently pass.
- Desktop/mobile e2e smoke currently passes.
- Supabase signed avatar storage is implemented and checked by the production gate.
