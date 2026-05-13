# Production Setup

This file lists the exact values needed before deploying Maprang outside local development.

## Admin Key

Generate a strong `ADMIN_API_KEY` locally and add it only to your hosting provider or secret manager:

```bash
bun -e "const b=new Uint8Array(32);crypto.getRandomValues(b);console.log([...b].map(x=>x.toString(16).padStart(2,'0')).join(''))"
```

Do not commit real `.env` files. Add these values directly to the hosting provider or secret manager.

## Backend Env

Start from `apps/backend/.env.production.example`.

Required:

- `NODE_ENV=production`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` only after live chat smoke passes
- `MODEL_TEMPERATURE=0.85`
- `MODEL_MAX_OUTPUT_TOKENS=1200`
- `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`
- `CHAT_PROVIDER_RETRY_ATTEMPTS=2`
- `CHAT_PROVIDER_RETRY_DELAY_MS=350`
- `CREATOR_DRAFT_RETRY_ATTEMPTS=3`
- `CREATOR_DRAFT_RETRY_DELAY_MS=350`
- `CORS_ORIGINS`
- `ADMIN_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER=supabase`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS=signed`
- `SUPABASE_SIGNED_URL_EXPIRES_IN=3600`
- `IMAGE_GENERATION_API_KEY or OPENAI_API_KEY`

Required for production Creator Studio image generation:

- `IMAGE_GENERATION_API_KEY`
- `IMAGE_GENERATION_MODEL`
- `IMAGE_GENERATION_SIZE`
- `IMAGE_GENERATION_QUALITY`
- `IMAGE_GENERATION_OUTPUT_FORMAT`
- `IMAGE_GENERATION_OUTPUT_COMPRESSION`
- `IMAGE_GENERATION_LIVE_VERIFIED=1` only after live image smoke passes

`DATABASE_URL` must be a real production Postgres URL with `sslmode=require`. Do not leave the example `USER:PASSWORD@HOST/DATABASE` values in place; `env:check` rejects placeholder credentials, localhost databases, and URLs without `sslmode=require` in production.

`OPENROUTER_API_KEY` powers creator text drafting and chat responses. It must be an OpenRouter key that starts with `sk-or-`, not an OpenAI `sk-proj-` key. Having a valid-looking key is not enough for production readiness: run `bun run smoke:chat` or `bun run api:smoke:live` against staging first, then set `CHAT_PROVIDER_LIVE_VERIFIED=1` only after the backend returns a real model reply with usage accounting. Real creator avatar generation is a separate image-provider path; if `IMAGE_GENERATION_API_KEY` is not configured, Creator Studio will still draft Thai character content but will label the avatar as a temporary system placeholder.

`MODEL_TEMPERATURE`, `MODEL_MAX_OUTPUT_TOKENS`, and `MODEL_MIN_ROLEPLAY_REPLY_CHARS` control chat feel. Keep `MODEL_MAX_OUTPUT_TOKENS` around `1200` and `MODEL_MIN_ROLEPLAY_REPLY_CHARS` around `320` for roleplay so bots have room to answer with 2-5 short paragraphs instead of one-line replies. If a character response is shorter than this guard and the player did not ask for brevity, the backend makes one continuation pass and charges the combined usage.

`CHAT_PROVIDER_RETRY_*` and `CREATOR_DRAFT_RETRY_*` make provider failures less brittle during traffic spikes or truncated JSON responses. The defaults retry chat twice and creator drafting three times with a short delay, while still failing fast for credential, billing, and policy errors.

For production, configure a real OpenAI image key before opening Creator Studio to users. The backend calls the OpenAI Images endpoint and uploads generated avatars through the same avatar storage pipeline.
Having an image key is not enough for production readiness because billing/quota can still fail. Run `bun run smoke:image:live` or `bun run api:smoke:live` against staging/production first. `api:smoke:live` may warn that `/ready` is waiting for image verification; that is expected on the first verification run. Set `IMAGE_GENERATION_LIVE_VERIFIED=1` only after the live image call passes, then rerun the final production gate.
If the live image smoke reports `billing_hard_limit_reached`, `billing hard limit`, or `insufficient_quota`, the fix is on the image provider account: increase/reset the billing limit or add quota, then rerun the same live smoke. Keep `IMAGE_GENERATION_LIVE_VERIFIED=0` until that rerun returns a configured generated image instead of a placeholder.

After adding backend env values, validate them:

```bash
cd apps/backend
bun run env:check
```

To validate backend and frontend env files together without printing secret values, run this from the repo root:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

`deploy:doctor` catches common production mistakes before deploy, including Supabase dashboard URLs, mismatched anon keys, service role keys accidentally placed in frontend env, local CORS origins, OpenAI/OpenRouter key mixups, missing `sslmode=require`, and image generation that has not been live-verified yet. During early staging you can add `--allow-unverified-image` only while you are still waiting to run `smoke:image:live`.

## Frontend Env

Start from `apps/frontend/.env.production.example`.

Required:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

All `VITE_*` values are compiled into the frontend bundle at build time.

## Supabase Setup

1. Create a Supabase project.
2. Copy the project URL to `SUPABASE_URL` and `VITE_SUPABASE_URL`.
3. Set `SUPABASE_JWT_ISSUER` to `<SUPABASE_URL>/auth/v1`.
4. Copy the anon public key to `VITE_SUPABASE_ANON_KEY` and backend `SUPABASE_ANON_KEY`.
5. Copy the service role key to backend-only `SUPABASE_SERVICE_ROLE_KEY`.
6. Create a storage bucket named `avatars`.
7. Set `SUPABASE_STORAGE_BUCKET=avatars`.
8. Choose storage access:
   - Production: private bucket with `SUPABASE_STORAGE_ACCESS=signed`.
   - Development only: public buckets are supported by code, but production readiness fails until signed URLs are used.

After the Supabase project is active and backend Supabase env values are available locally, you can let the repo verify or create the bucket:

```bash
bun run supabase:storage:setup
```

This command keeps the bucket private, uploads a tiny smoke image, creates a signed URL, fetches it, and cleans the object up. For a non-mutating check, run:

```bash
bun run supabase:storage:check
```

Current implementation stores stable backend avatar URLs such as `/uploads/avatars/<filename>`. The backend serves local files in development and redirects to Supabase public or signed URLs in production.

Keep RLS enabled on the public app tables. Supabase Advisor may show `RLS Enabled No Policy` as an INFO notice; that is expected while the frontend uses the backend API instead of direct Supabase table access. Add explicit RLS policies only if you intentionally expose an app table to `anon` or `authenticated` through the Supabase Data API.

## Deployment Order

Recommended first hosting path: follow `DEPLOY_RENDER.md`.

0. Run local static deployment readiness checks:

```bash
bun run secrets:check
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
bun run predeploy:check
bun run backend:check
bun run frontend:check
```

`backend:check` requires a reachable database for persistence tests. If local Docker is not running, start Docker/Postgres first or run the check against a staging database.

1. Provision production Postgres.
2. Add backend env values.
3. Run database migrations:

```bash
cd apps/backend
bunx prisma migrate deploy
```

4. Deploy backend.
5. Check backend health:

```bash
curl https://api.example.com/health
```

6. Check backend traffic readiness:

```bash
curl https://api.example.com/ready
```

`/health` is the basic liveness and database check. `/ready` is stricter and should be green before sending real users to the backend; it requires database connectivity, OpenRouter configuration, production auth/storage hardening, and `IMAGE_GENERATION_LIVE_VERIFIED=1` after live image smoke passes.
The `/health` response and `/admin/health` page also show CIA/AAA security posture: confidentiality, integrity, availability, authentication, authorization, and accounting/audit.

7. Build frontend with production API URL:

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

8. Deploy frontend.
9. Run smoke against production backend:

```bash
SMOKE_API_BASE_URL=https://api.example.com bun run production:check
```

For targeted debugging after a failed gate, run only the path you need:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

`production:check` is the hard final gate. It fails if the backend URL is still local, auth is not Supabase JWT, avatar storage is not Supabase signed URL, the real `avatars` bucket cannot upload/fetch through signed URLs, CORS still points at localhost, OpenRouter is missing, the image generation provider is missing, or live chat/image provider calls fail.

The GitHub `Production Smoke` workflow also requires repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so it can verify the private `avatars` bucket instead of only trusting backend health flags.
It also requires `SMOKE_ADMIN_API_KEY` so the smoke run verifies admin summary, moderation reports, and audit logs instead of silently skipping admin-only APIs.

`smoke:chat` and the combined `api:smoke:live` provider gate check the smoke user's wallet before calling OpenRouter. Keep the smoke user topped up above `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT`, default `1000`, or override the threshold for heavier test prompts. If the backend returns the temporary AI fallback, the route is reachable but the live provider path is still blocked; check OpenRouter credits/quota, model access, key validity, outbound networking, and backend logs before deploy.

`smoke:image` checks the image provider configuration without spending image credits by default. To generate one real staging/production avatar, run `bun run smoke:image:live` or `SMOKE_IMAGE_LIVE=1 bun run smoke:image`; this calls `/creator/ai-draft` and fails if Creator Studio falls back to the placeholder image.

For production, prefer a real `SMOKE_ACCESS_TOKEN` for user flows, and always set `SMOKE_ADMIN_API_KEY` for admin smoke checks. If you use `SMOKE_USER_ID` instead of an access token, `SMOKE_ADMIN_API_KEY` is also required so the backend treats header-based user id as an admin-only smoke path, not public authentication.

For the hard production gate, run `bun run production:check` with the same `SMOKE_API_BASE_URL`, smoke auth, Supabase storage, and admin smoke variables set. Use `smoke:live`, `smoke:chat`, or `smoke:image:live` only when retrying a narrower failed provider path. On the first staging verification, run `api:smoke:live` or the narrower live smoke command, set `CHAT_PROVIDER_LIVE_VERIFIED=1` after live chat succeeds, set `IMAGE_GENERATION_LIVE_VERIFIED=1` after live image succeeds, then rerun `production:check`.

Do not point `backend:check`, `qa:local`, or `qa:live` at production data unless you intentionally want the automated persistence tests to create and archive test records there. Use those gates with local or staging databases.

10. Complete manual QA from `DEPLOYMENT_QA.md`.

You can also run the manual GitHub Actions workflow `Production Smoke` after each deploy.
Configure repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, and either `SMOKE_ACCESS_TOKEN` or `SMOKE_USER_ID`.
`SMOKE_API_BASE_URL` must be a deployed `https://` backend URL. The workflow rejects `http://`, localhost, and missing signed-storage secrets before it can spend provider credits.
The workflow always verifies admin summary, moderation reports, and audit logs through `SMOKE_ADMIN_API_KEY` without spending provider credits.
Turn on `run_chat` only when you want to spend a small amount of provider credit to verify the live AI path. Leave `min_token_balance_for_chat` at `1000` unless the smoke model or prompt needs a larger buffer.
Turn on both `run_chat` and `run_image` when you want the workflow to run the combined `api:smoke:live` provider gate after the strict production readiness checks.

## Production Readiness Notes

- Latest migrations include reports, admin audit logs, wallet token transactions, and user content settings. Always run `bunx prisma migrate deploy` before exposing the backend.
- Production auth rejects plain `x-user-id` impersonation. Use Supabase access tokens for users; reserve `SMOKE_USER_ID` for admin-key smoke tests only.
- Admin actions now write audit logs for report status changes, hidden characters, archived messages, and manual token adjustments.
- Payment is not connected yet. Use Wallet admin token adjustment only for beta/manual grants until a payment provider is added.
- Production smoke tests require either a real Supabase access token or an admin-key-authorized UUID user id, and live chat smoke requires that user's wallet to be topped up.
- Live image smoke is opt-in through `bun run smoke:image:live` or `SMOKE_IMAGE_LIVE=1` for `smoke:image`, while `production:check`, `qa:live`, and `api:smoke:live` intentionally require a real image provider call.
