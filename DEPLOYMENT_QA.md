# Deployment QA Checklist

Use this checklist before handing the app to testers or deploying a new environment.

## Automated Checks

Run the full local gate when Postgres, backend, and frontend are available:

```bash
bun run qa:local
```

This gate does not call the live AI provider. It verifies committed secrets, deploy configuration, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, and avatar upload.

To seed repeatable browser QA data and run the Playwright end-to-end smoke over desktop and mobile viewports:

```bash
bun run qa:seed
bun run e2e:smoke
```

`e2e:smoke` opens the home page, Character Lobby, Creator Studio, My Chats, Events, Profile, Wallet, Moderation, `/admin/health`, and a seeded chat on both desktop and mobile viewports. It also verifies the chat three-dot menu, report dialog, route rendering, browser console errors, and horizontal overflow. It avoids sending a live chat message so it does not spend provider credits during UI smoke testing.

For the full local predeploy gate plus browser smoke:

```bash
bun run qa:full
```

Run the full local or staging provider gate only when the backend is allowed to reach OpenRouter:

```bash
bun run qa:live
```

For a deployed backend, use the smoke-only live gate with `SMOKE_API_BASE_URL` and smoke auth variables. Do not point `backend:check`, `qa:local`, or `qa:live` at production data unless you intentionally want the automated persistence tests to create and archive test records there.

```bash
bun run smoke:live
```

Or run each step separately:

```bash
bun run secrets:check
```

```bash
cd apps/backend
bun run env:check
bun run deploy:check
```

When Postgres is available and DB-backed persistence tests must not be skipped, run this stricter cross-platform gate from the repo root:

```bash
bun run backend:check:db
```

```bash
cd apps/frontend
bun run deploy:check
```

With local backend and frontend running, run:

```bash
bun run smoke:doctor
```

`smoke:doctor` can pass for local development while still printing `productionBlockers`.
Treat those blockers as staging/production tasks, then confirm with `smoke:ready` against the real backend URL.
It also prints `securityPosture` so you can quickly see how many CIA/AAA checks are currently ready.

For a stricter traffic-readiness check, run:

```bash
bun run smoke:ready
```

```bash
bun run smoke:local
```

To verify the live AI provider path, run this only when the backend is allowed to reach OpenRouter:

```bash
bun run smoke:chat
```

`smoke:chat` checks `/me/usage` before it calls the AI provider. The smoke user must have at least `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` tokens, default `1000`, so the test fails before spending provider credits when the smoke account is not topped up.

If `smoke:chat` reports that the backend returned the temporary AI fallback, the app, database, and chat route were reachable, but the backend could not complete the outbound provider request. Check outbound network access to `https://openrouter.ai`, `OPENROUTER_API_KEY`, provider credits, and backend logs.

To verify that the image generation provider is configured without spending image credits:

```bash
bun run smoke:image
```

To generate one real staging/production avatar through the configured image provider, opt in explicitly:

```bash
SMOKE_IMAGE_LIVE=1 bun run smoke:image
```

`smoke:image` only checks `/health` by default. With `SMOKE_IMAGE_LIVE=1`, it calls `/creator/ai-draft`, expects `image.provider="configured"`, and fails if Creator Studio falls back to the local placeholder image. This live mode can spend both text and image provider credits.

For a deployed backend, point the smoke tests at the backend URL. Prefer a Supabase user token:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:chat
```

If the selected smoke model uses larger prompts, raise the preflight guard:

```bash
SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=3000 SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

Expected result:

- Backend Prisma schema validates.
- No obvious committed secrets are present.
- Backend TypeScript passes.
- Backend tests pass.
- Frontend TypeScript and Vite build pass.
- Smoke doctor confirms the backend is reachable and the database is connected.
- Readiness smoke confirms the backend is ready for traffic, including OpenRouter configuration and production hardening when `NODE_ENV=production`.
- Local smoke confirms health, seeded Maprang data, relationship preview, and avatar upload.
- Image smoke confirms Creator Studio image generation is configured, and live opt-in confirms generated avatars do not fall back to placeholders.
- Live chat smoke confirms backend-to-OpenRouter chat, chat persistence, and usage accounting.

The same deploy checks also run in GitHub Actions through `.github/workflows/ci.yml`.
CI also runs a seeded local backend smoke test and builds the backend and frontend Docker images without pushing them.

For deployed environments, use the manual GitHub Actions workflow `Production Smoke`.
Set repository secrets `SMOKE_API_BASE_URL` and either `SMOKE_ACCESS_TOKEN`, or both `SMOKE_USER_ID` and `SMOKE_ADMIN_API_KEY`.
The optional `run_chat` input also verifies the live AI provider path and uses provider credits. The workflow input `min_token_balance_for_chat` maps to `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` and defaults to `1000`.
The optional `run_image` input verifies the live image provider path and uses image provider credits.

## Required Production Environment

Use `PRODUCTION_SETUP.md` as the source of truth for production env values and Supabase setup.

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `CORS_ORIGINS`
- `ADMIN_API_KEY`

Recommended backend:

- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS`
- `SUPABASE_SIGNED_URL_EXPIRES_IN`
- `IMAGE_GENERATION_API_KEY` or `OPENAI_API_KEY`
- `MODEL_INPUT_COST_PER_1M`
- `MODEL_OUTPUT_COST_PER_1M`

Frontend:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

For Docker frontend builds, pass Vite values as build args. The Docker build arg for the Supabase anon value is named `VITE_SUPABASE_ANON_PUBLIC` to avoid noisy secret-name warnings, and the Dockerfile maps it to `VITE_SUPABASE_ANON_KEY` only for the Vite build step.

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

`VITE_SUPABASE_ANON_KEY` is a frontend public anon key, but it is still baked into the static build like every other `VITE_*` value.

## Supabase Storage

- Create a bucket matching `SUPABASE_STORAGE_BUCKET`.
- Use the service role key only on the backend.
- Recommended: keep the bucket private and set `SUPABASE_STORAGE_ACCESS=signed`.
- Public read is supported only for development or temporary staging; production readiness expects signed URLs.
- Confirm avatar uploads return a stable backend URL and that opening it redirects or serves the image.

## Mobile QA

Run one pass at 390x844 and one pass at 430x932, or the closest real devices available.

- Chat: sidebar/drawer opens and closes, composer stays pinned above the bottom edge, `+` suggestions do not cover the send button, report/delete/edit menus are reachable, and scene notifications fit without horizontal scroll.
- Create: image panel stays centered, generated image preview and crop modal fit, all accordions are tappable, AI draft fills content after image generation, and publish buttons remain visible.
- Wallet: balance card, usage rows, and token history cards wrap without clipping long Thai text.
- Moderation: queue filters, action buttons, report dialogs, and admin audit details are usable without desktop hover.

## Manual QA

- Open `/health` and confirm `ok=true`, `databaseConnected=true`, and the expected `avatarStorage`.
- Create a character as the owner.
- Edit the character and confirm validation notes update.
- Upload a PNG/WebP avatar and confirm it renders after refresh.
- Add, edit, and delete lore.
- Start a new chat and confirm the first AI response streams.
- Trigger a relationship event and confirm the sandbox notification appears before entering a scene.
- Enter a scene, accept or resolve an outcome, then confirm the timeline records it.
- Confirm per-event cooldown prevents immediate repeat events.
- Confirm a different user cannot edit another user's character without admin access.
- Confirm admin summary loads only when admin access is configured.
- Open Wallet and confirm token transaction history shows chat debits and admin adjustments.
- Select adult/general content mode and confirm `/me/content-settings` persists the server-side rating cap.

## Release Notes Template

- Commit or build id:
- Backend URL:
- Frontend URL:
- Database migration applied:
- Storage provider:
- Known limitations:
