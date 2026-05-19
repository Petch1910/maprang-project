# Deployment QA Checklist

Use this checklist before handing the app to testers or deploying a new environment.

## Automated Checks

Run the full local gate when Postgres, backend, and frontend are available:

```bash
bun run qa:local
```

This gate does not call the live AI provider. It verifies committed secrets, API route coverage mapping, memory/knowledge vault helper regressions, frontend bundle/static/route and route/menu audit regressions, smoke auth helper regressions, provider smoke guard regressions, readiness smoke summary regressions, DB-required backend check planning, Supabase signed-storage helper regressions, deploy status formatting, deploy configuration, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, and avatar upload. Local API smoke also passes `skipImageProvider=true` for creator draft checks, so it verifies the endpoint shape without spending image credits; live image generation stays in `api:smoke:live`, `smoke:image:live`, and `production:check`.
Real `.env` and `.env.*` files must stay untracked. `secrets:check` ignores local untracked env files for developer convenience but fails if one is ever committed or tracked.

To inspect backend API coverage without running the full suite:

```bash
bun run api:audit
```

`api:audit` reads backend route files and fails if a route exists without a documented automated/manual coverage path. It is intentionally separate from `api:smoke`: the audit answers “is every endpoint accounted for?” while the smoke answers “do the high-value runtime paths work right now?”

To inspect production env files before deploying, without printing secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

For early staging only, add `--allow-unverified-image` until the live image smoke passes and `IMAGE_GENERATION_LIVE_VERIFIED=1` is set.

To summarize the current backend deploy readiness and next steps without failing on expected staging/provider blockers:

```bash
bun run deploy:status
```

For CI logs or dashboards that need structured output:

```bash
bun scripts/deploy-status.ts --json
```

The JSON response exposes top-level `stagingReady`, `stagingBlockerCount`, `productionReady`, and `productionBlockerCount` fields so automation does not need to parse nested readiness details.

The underlying readiness rules have a deterministic self-test:

```bash
bun run deploy:readiness:test
```

To seed repeatable browser QA data and run the Playwright end-to-end smoke over desktop and mobile viewports:

```bash
bun run qa:seed
bun run e2e:smoke
```

`e2e:smoke` opens the home page, Character Lobby, Creator Studio, My Chats, Events, Profile, Wallet, Moderation,
`/admin/health`, `/admin/prompt-inspector`, `/admin/evals`, and a seeded chat on both desktop and mobile viewports. It also
verifies the Character Lobby relationship contract, the chat three-dot menu, report dialog, prompt inspector snapshot flow, local eval run flow when an admin key is
available, route rendering, browser console errors, and horizontal overflow. It avoids sending a live chat message so it
does not spend provider credits during UI smoke testing.

For the full local predeploy gate plus browser smoke:

```bash
bun run qa:full
```

For a pre-production dry run that covers all repo-owned checks plus real Supabase signed storage and admin-only APIs, run:

```bash
bun run staging:check
```

`staging:check` is useful before the final domain/provider gate. It runs `qa:full`, verifies the real `avatars` bucket through signed URLs, and reruns API smoke with admin checks required. The API smoke creates a private draft character and lore entry, checks edit/view/favorite/duplicate/reset/delete, then cleans up. It can still pass while live chat/image provider checks are left for `production:check`.

After staging domains exist, run the strict deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` prints `bun run deploy:status` first, then runs `smoke-doctor --strict-staging`, Supabase signed-storage check, `/ready`, and admin-required API smoke against the deployed backend. It fails on localhost URLs, local/non-https CORS, missing signed storage, broken readiness, or missing admin smoke auth, but it does not require `CHAT_PROVIDER_LIVE_VERIFIED=1` or `IMAGE_GENERATION_LIVE_VERIFIED=1` yet.

Run the full local or staging provider gate only when the backend is allowed to reach OpenRouter:

```bash
bun run qa:live
```

`qa:live` runs the local QA gate and then one `api:smoke:live` pass. That live pass already checks chat and image generation, so do not chain `smoke:chat` or `smoke:image:live` afterward unless you are retrying one failed provider path.
When staging is verifying providers for the first time, run `api:smoke:live` or the narrower live smoke commands before marking verification flags. After the live chat call succeeds, set `CHAT_PROVIDER_LIVE_VERIFIED=1`. After the live image call succeeds, set `IMAGE_GENERATION_LIVE_VERIFIED=1`, then rerun the final production gate.

For a deployed backend, use the smoke-only live gate with `SMOKE_API_BASE_URL` and smoke auth variables when retrying provider connectivity. Do not point `backend:check`, `qa:local`, or `qa:live` at production data unless you intentionally want the automated persistence tests to create and archive test records there.

```bash
bun run smoke:live
```

Or run each step separately:

```bash
bun run secrets:check
```

```bash
bun run secrets:patterns:test
```

```bash
bun run memory:audit
```

`memory:audit` verifies the project memory vault structure, local Markdown links, production blocker notes, and common secret-shaped values. It is included in `qa:local` so project context stays safe and complete across long-running sessions.

```bash
bun run knowledge:audit
```

`knowledge:audit` verifies the runtime knowledge layer under `knowledge/`, including structured JSON packs, local wiki links, and secret-shaped values. It is included in `qa:local` so chat/creator prompt rules cannot drift silently.

```bash
bun run eval:local
```

`eval:local` runs deterministic prompt assembly checks against `evals/golden-roleplay.json`. The same suite is exposed to
admins through `/admin/evals` and `GET /admin/evals/local`. It verifies prompt-control ordering, runtime knowledge
injection, lore placement, relationship/scene continuity, rough token budget, and secret-shaped exclusions without calling
a live model. It is included in `qa:local` and CI so context changes fail before they reach staging.

Admin prompt inspection and deterministic evals are covered by `/admin/prompt-inspector`, `/admin/evals`,
`POST /admin/prompt-inspector`, `GET /admin/evals/local`, local `api:smoke`, and browser e2e when an admin key is available.
Use it before blaming the model provider: it shows the redacted final prompt, section token estimates, retrieved lore, and
the diff between the current and previous prompt shape without making a live model call.

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

`smoke:doctor` can pass for local development while still printing `productionReady`, `productionBlockerCount`, `productionBlockers`, and ordered `nextSteps`.
Treat those blockers as staging/production tasks, then confirm with `smoke:ready` against the real backend URL.
It also prints `securityPosture` so you can quickly see how many CIA/AAA checks are currently ready.
If `/health` reports invalid production env, `smoke:doctor` also prints `missingRequired` and `invalidEnv` so the fix is visible before `/ready` fails.

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

`smoke:chat` and `api:smoke:live` check `/me/usage` before they call the AI provider. The smoke user must have at least `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` tokens, default `1000`, so the test fails before spending provider credits when the smoke account is not topped up. `smoke:chat` is a targeted retry/debug command; use `production:check` for the final go/no-go gate.

If `smoke:chat` reports `usage.providerFailure`, the app, database, and chat route were reachable, but the backend could not complete the outbound provider request. Check outbound network access to `https://openrouter.ai`, `OPENROUTER_API_KEY`, provider credits/quota, selected model access, and backend logs.
Do not set `CHAT_PROVIDER_LIVE_VERIFIED=1` until a live chat smoke returns a real model reply, `chatId`, token usage, and a matching `CHAT_USAGE` wallet transaction.

To verify that the image generation provider is configured without spending image credits:

```bash
bun run smoke:image
```

To generate one real staging/production avatar through the configured image provider, opt in explicitly:

```bash
bun run smoke:image:live
```

`smoke:image` only checks `/health` by default. With `bun run smoke:image:live` or `SMOKE_IMAGE_LIVE=1`, it calls `/creator/ai-draft`, expects `image.provider="configured"`, and fails if Creator Studio falls back to the local placeholder image. This live mode can spend both text and image provider credits.
If the live run reports `billing_hard_limit_reached`, `billing hard limit`, or `insufficient_quota`, do not set `IMAGE_GENERATION_LIVE_VERIFIED=1` yet. Increase or reset the image provider billing limit/quota, rerun `bun run smoke:image:live`, and only mark live verification after the generated image path returns `image.provider="configured"`.

For a deployed backend, point the smoke tests at the backend URL. Prefer a Supabase user token:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:image:live
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
- Readiness smoke confirms the backend is ready for traffic, including OpenRouter configuration, production hardening, and live chat/image verification when `NODE_ENV=production`.
- Local smoke confirms health, seeded Maprang data, relationship preview, and avatar upload.
- API smoke confirms temporary character creation/edit/view/favorite/duplicate/reset/delete and temporary lore create/edit/delete.
- API smoke confirms `/relationship/presets` returns the full preset set, `/relationship/presets?surface=contract` returns only player-facing relationship contracts, and `/relationship/presets?surface=creator` keeps creator-only presets available for Creator Studio.
- API smoke confirms chat menu mutations by renaming one seeded chat, archiving it, verifying the archived list, and restoring it back to active chats.
- API smoke confirms admin prompt inspection returns redacted prompt snapshots, section accounting, and prompt diffs.
- Image smoke confirms Creator Studio image generation is configured, and live opt-in confirms generated avatars do not fall back to placeholders.
- Live chat smoke confirms backend-to-OpenRouter chat, chat persistence, and usage accounting.

The same deploy checks also run in GitHub Actions through `.github/workflows/ci.yml`.
CI also runs a seeded local backend smoke test and builds the backend and frontend Docker images without pushing them.

For deployed environments, use the manual GitHub Actions workflow `Production Smoke`.
Set repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, and either `SMOKE_ACCESS_TOKEN` or `SMOKE_USER_ID`.
The workflow rejects local or non-https backend URLs and requires signed Supabase storage smoke secrets before it reaches provider-spending steps.
It also runs `bun run predeploy:check`, secrets/secret-pattern/memory/knowledge/eval/security/API/menu audits plus audit regression tests, `bun run release:handoff:check`, and `bun run release:handoff:test` before validating smoke configuration, so repository drift is caught before provider or storage checks.
It prints `bun run deploy:status` before the strict production doctor so the workflow log shows blocker details and next steps in one place.
Admin summary, non-mutating wallet token validation, moderation report creation validation, moderation reports, non-mutating admin report validation, and audit logs are verified on every workflow run through `SMOKE_ADMIN_API_KEY`. The optional `run_chat` input also verifies the live AI provider path and uses provider credits. The workflow input `min_token_balance_for_chat` maps to `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` and defaults to `1000`.
The optional `run_image` input verifies the live image provider path and uses image provider credits.
When `run_chat` and `run_image` are both enabled, the workflow uses one combined `api:smoke:live` pass so chat and image are checked together without duplicate provider calls.

## Required Production Environment

Use `PRODUCTION_SETUP.md` as the source of truth for production env values and Supabase setup.

Backend:

- `NODE_ENV=production`
- `DATABASE_URL` เป็น Postgres production จริงพร้อม `sslmode=require`
- `OPENROUTER_API_KEY` เป็น OpenRouter key ที่ขึ้นต้นด้วย `sk-or-`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` หลัง live chat smoke ผ่านจริง
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
- `MODEL_MIN_ROLEPLAY_REPLY_CHARS`
- `CHAT_PROVIDER_RETRY_ATTEMPTS`
- `CHAT_PROVIDER_RETRY_DELAY_MS`
- `CREATOR_DRAFT_RETRY_ATTEMPTS`
- `CREATOR_DRAFT_RETRY_DELAY_MS`

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
- With backend Supabase env available locally, run `bun run supabase:storage:setup` to create/verify the private `avatars` bucket, upload a tiny smoke image, fetch it through a signed URL, and clean it up. Use `bun run supabase:storage:check` when you only want to verify an existing bucket. The final `production:check` gate now runs this storage check as well, so keep `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, and signed-storage env available in the smoke environment.
- The GitHub `Production Smoke` workflow fails early if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` repository secrets are missing, because production storage must be checked against the real bucket.
- It also fails early without `SMOKE_ADMIN_API_KEY`, because the final production smoke must exercise admin reports and audit logs rather than skipping admin-only APIs.

## Mobile QA

Run one pass at 390x844 and one pass at 430x932, or the closest real devices available.

- Chat: sidebar/drawer opens and closes, composer stays pinned above the bottom edge, `+` suggestions do not cover the send button, report/delete/edit menus are reachable, and scene notifications fit without horizontal scroll.
- Create: image panel stays centered, generated image preview and crop modal fit, all accordions are tappable, AI draft fills content after image generation, and publish buttons remain visible.
- Wallet: balance card, usage rows, and token history cards wrap without clipping long Thai text.
- Moderation: queue filters, action buttons, report dialogs, and admin audit details are usable without desktop hover.

## Manual QA

- Open `/health` and confirm `ok=true`, `databaseConnected=true`, and the expected `avatarStorage`.
- Open `/relationship/presets?surface=contract` and confirm it returns player-facing relationship contracts only. It should include `soulmate` and exclude creator-only presets such as `safe-family-bond`.
- Open `/relationship/presets?surface=creator` and confirm it still includes creator-only presets such as `safe-family-bond` for Creator Studio.
- Create a character as the owner.
- Edit the character and confirm validation notes update.
- Upload a PNG/WebP avatar and confirm it renders after refresh.
- Add, edit, and delete lore.
- Open Character Lobby and confirm relationship contracts load from the backend, selecting a contract changes the active state, and the start button includes `relationship_seed=<selected-id>`.
- Open Creator Studio and confirm relationship preset picker still applies creator tags without changing the Character Lobby contract list.
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
