# Maprang Project

AI character chat platform with relationship state, scene events, creator tools, usage tracking, wallet ledger, and production-ready auth/storage hooks.

## Local Setup

1. Start Postgres:

```bash
docker compose up -d postgres
```

2. Backend env:

```bash
cp apps/backend/.env.example apps/backend/.env
```

Fill `OPENROUTER_API_KEY`. Supabase values are optional for local dev. Avatar uploads use local disk by default and switch to Supabase Storage when `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_STORAGE_BUCKET` are set.

Creator Studio can draft Thai character content through OpenRouter. Real AI avatar generation is optional and needs `IMAGE_GENERATION_API_KEY`; without it the app uses a clearly labeled temporary placeholder image while still filling the character fields.

3. Frontend env:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Leave blank or omit this file for local dev auth mode.
Set `VITE_API_BASE_URL` when the backend is not running at `http://localhost:3000`.

For local development with real Supabase credentials, keep `STORAGE_PROVIDER=local` in `apps/backend/.env`. This lets auth use Supabase while avatar tests and local uploads stay on disk. Use `STORAGE_PROVIDER=supabase` only in production or when intentionally testing Supabase Storage. To create or verify the private signed `avatars` bucket, run `bun run supabase:storage:setup`; use `bun run supabase:storage:check` for a read-only verification.

4. Install and migrate:

```bash
cd apps/backend
bun install
bunx prisma generate
bunx prisma migrate deploy
```

5. Run apps:

```bash
cd apps/backend
bun run start
```

```bash
cd apps/frontend
bun run dev --host 127.0.0.1
```

Frontend: `http://127.0.0.1:5173`
Backend health: `http://127.0.0.1:3000/health`
Backend readiness: `http://127.0.0.1:3000/ready`

## Local Codebase Intelligence

This workspace is prepared for SocratiCode as a local MCP codebase intelligence tool. It is configured in
`C:\Users\Phet\.codex\config.toml` and uses the project `.socraticodeignore` to skip dependencies, build output, local
runtime files, binary assets, and env secrets.

After restarting Codex, ask the assistant to index this codebase. Keep SocratiCode as a local development tool only; do
not add it as a Maprang runtime dependency unless licensing is reviewed separately.

## Project Memory

Long-running project context lives in [`memory/README.md`](./memory/README.md). Start there when resuming work across
sessions. The memory vault tracks current blockers, QA status, deploy readiness, UI/API direction, and decision logs.
It must never contain secrets or real credentials.

```bash
bun run memory:audit
```

`memory:audit` checks required memory files, local Markdown links, provider verification notes, and common secret-shaped
values. It also runs inside `qa:local`.

## Knowledge Layer

Runtime product knowledge lives in [`knowledge/README.md`](./knowledge/README.md). This is separate from session memory:
`memory/` explains what happened in the project, while `knowledge/` stores product rules and structured packs the backend
can load for chat style, creator drafts, relationship rules, scene rules, and content policy.

```bash
bun run knowledge:audit
```

`knowledge:audit` validates the structured JSON packs, local wiki links, and secret-shaped values. The backend exposes the
structured knowledge status in `/health` and `/ready`, and `qa:local` runs the audit before smoke tests.

## Evaluation Layer

Prompt and context regression checks live in [`evals/README.md`](./evals/README.md). The deterministic local eval reads
[`evals/golden-roleplay.json`](./evals/golden-roleplay.json), assembles Maprang chat context through the backend context
service, and verifies section order, prompt-control text, relationship/scene continuity, lore injection, token budget, and
secret-shaped exclusions without calling a live model.

```bash
bun run eval:local
```

`eval:local` runs inside `qa:local` and CI. Optional Promptfoo scaffolding is also available for future live model quality
comparisons:

```bash
bun run eval:promptfoo
```

## Production Checklist

- Follow `PRODUCTION_SETUP.md` for the full production env and Supabase setup.
- Use `DEPLOY_RENDER.md` for the recommended first hosting path.
- Set backend env from `apps/backend/.env.production.example`.
- Set frontend env from `apps/frontend/.env.production.example`.
- Keep `MODEL_MAX_OUTPUT_TOKENS=1200` and `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320` for richer roleplay replies; short character turns get one backend continuation pass unless the player asks for brevity.
- Keep the default provider retry env values unless staging shows repeated transient 5xx/timeout errors.
- Run live chat smoke before production and set `CHAT_PROVIDER_LIVE_VERIFIED=1` only after the backend returns a real model reply with token usage.
- Set `IMAGE_GENERATION_API_KEY` if Creator Studio should generate real avatar images instead of placeholders. Before production, run live image smoke and set `IMAGE_GENERATION_LIVE_VERIFIED=1` only after billing/quota passes.
- Set `VITE_API_BASE_URL` to the deployed backend URL.
- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to deployed frontend origins only.
- Set a long random `ADMIN_API_KEY`.
- Set `SUPABASE_URL` or `SUPABASE_JWT_ISSUER` for JWT verification.
- Set backend `SUPABASE_ANON_KEY` so HS256/shared-secret Supabase access tokens can be verified through the Auth server when needed.
- Set `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, and `SUPABASE_STORAGE_ACCESS=signed`.
- Create the Supabase Storage bucket before multi-instance deploy.
- Run the verification commands below before deploying.

## Docker Build

```bash
docker build -f apps/backend/Dockerfile -t maprang-backend .
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

Frontend `VITE_*` values are compiled into the static bundle at build time. The Supabase anon key is intended to be public, but service role keys must stay backend-only.

Run database migrations before starting the production backend:

```bash
cd apps/backend
bunx prisma migrate deploy
```

## Current Verification

```bash
bun run qa:local
```

Use this as the normal local readiness gate. It checks secrets, memory and knowledge audits, deterministic prompt/context evals, API route coverage mapping, deploy wiring, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, and avatar upload. Local API smoke skips the external image provider for creator draft checks so routine QA is deterministic; live avatar generation is verified only by `api:smoke:live`, `smoke:image:live`, or `production:check`.
It also audits the project memory vault and runtime knowledge packs so long-running context cannot silently lose required files or pick up secret-shaped values.

To check only backend API route coverage:

```bash
bun run api:audit
```

This verifies that every route declared in `apps/backend/src/*.routes.ts` is accounted for by smoke, browser e2e, backend tests, live-provider smoke, admin smoke, or a manual production gate.

To check production env files before deploy without printing secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

Use `--allow-unverified-image` only for early staging before `smoke:image:live` passes.

Run the full local or staging provider gate only when the backend can reach OpenRouter:

```bash
bun run qa:live
```

`qa:live` and `api:smoke:live` call real providers. They can fail when the key exists but billing, quota, model access, provider rate limits, or outbound networking is not ready. Treat that as a staging blocker before production. `api:smoke:live` checks `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` before the live chat call and covers one live chat plus one live image-generation call, so use `smoke:chat` or `smoke:image:live` only when you want to retry one provider path by itself. Avoid running separate live smoke commands in parallel on quota-limited accounts; use `api:smoke:live` for a single ordered pass. The first successful live chat verification should be followed by setting `CHAT_PROVIDER_LIVE_VERIFIED=1`; the first successful live image verification should be followed by setting `IMAGE_GENERATION_LIVE_VERIFIED=1`; then rerun the final production gate.

For an already deployed backend, use the smoke-only live gate with `SMOKE_API_BASE_URL` and smoke auth variables when you only want to retry provider connectivity without running persistence tests against production data:

```bash
bun run smoke:live
```

For production/staging go/no-go, use:

```bash
bun run production:check
```

This runs the strict production health gate, Supabase signed-avatar storage smoke, and live API smoke, including real chat and real image-generation checks. It will fail if the `avatars` bucket cannot issue signed URLs or if image generation falls back to a placeholder because of billing or quota limits.

When you want to verify all repo-owned surfaces before the final live provider/domain gate, run:

```bash
bun run staging:check
```

This runs the full local QA suite, desktop/mobile Playwright smoke, real Supabase signed-storage verification, and admin-required API smoke. It does not mark production ready by itself; `production:check` remains the final gate after real domains, CORS, and live image/chat provider paths are available.

Or run each check separately:

```bash
bun run backend:check
```

Use this stricter backend gate when Postgres is running and you want persistence tests to be mandatory:

```bash
bun run backend:check:db
```

```bash
bun run frontend:check
```

```bash
bun run smoke:doctor
```

`smoke:doctor` reports local health plus `productionReady`, `productionBlockerCount`, and `productionBlockers`; clear those blockers on staging before deploy.

```bash
bun run smoke:ready
```

```bash
bun run smoke:local
```

```bash
bun run smoke:chat
```

`smoke:chat` verifies only the real backend-to-OpenRouter path and can fail when outbound provider networking, API credits, or the provider key are not ready. It checks the smoke user's token balance before calling the AI provider and defaults to `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=1000`. GitHub Actions also runs deploy checks, a seeded local smoke test, and Docker image builds on pushes to `main` and on pull requests.

```bash
bun run smoke:image:live
```

`smoke:image:live` verifies that the configured image provider can actually generate a real image. A configured key is not enough; billing and model access must also be ready.
