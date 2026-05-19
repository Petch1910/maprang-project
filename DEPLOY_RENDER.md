# Deploy on Render

This is the recommended first production path because it can host the backend Docker service, frontend static site, and managed Postgres in one place.

## 1. Create Postgres

Create a Render Postgres database and copy the external connection string.

Use it as backend `DATABASE_URL`.

Before deploying public traffic, run the repository readiness checks locally:

```bash
bun run secrets:check
bun run predeploy:check
bun run backend:check
bun run frontend:check
```

If Docker/Postgres is not available locally, run `backend:check` against a staging database before production.

## 2. Deploy Backend

Create a new Render Web Service from this repository.

Settings:

- Environment: Docker
- Dockerfile path: `apps/backend/Dockerfile`
- Docker context: repository root
- Health check path: `/ready`

Backend environment:

```bash
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=<render-postgres-external-url>
OPENROUTER_API_KEY=<openrouter-key>
OPENROUTER_MODEL=google/gemini-2.0-flash-001
MODEL_INPUT_COST_PER_1M=0.1
MODEL_OUTPUT_COST_PER_1M=0.4
MAX_INPUT_CHARS=4000
MIN_TOKEN_BALANCE_FOR_CHAT=1
IMAGE_GENERATION_API_KEY=<openai-image-key>
IMAGE_GENERATION_MODEL=gpt-image-1.5
IMAGE_GENERATION_SIZE=1024x1536
IMAGE_GENERATION_QUALITY=medium
IMAGE_GENERATION_OUTPUT_FORMAT=webp
IMAGE_GENERATION_OUTPUT_COMPRESSION=85
CORS_ORIGINS=https://<frontend-domain>
ADMIN_API_KEY=<long-random-admin-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=avatars
SUPABASE_STORAGE_ACCESS=signed
SUPABASE_SIGNED_URL_EXPIRES_IN=3600
```

Do not set `PORT` unless Render asks for it. Render injects `PORT`.

`CORS_ORIGINS` must be the deployed frontend HTTPS origin only. Do not include localhost, `http://` origins, wildcard origins, or the backend URL in staging or production.

After the backend deploys, run migrations from a local terminal with production env loaded, or from a Render shell:

```bash
cd apps/backend
bunx prisma migrate deploy
```

The current migration set includes moderation reports and admin audit logs. Do not skip this step.

## 3. Deploy Frontend

Create a Render Static Site from this repository.

Settings:

- Root directory: `apps/frontend`
- Build command: `bun install --frozen-lockfile && bun run build`
- Publish directory: `dist`

Frontend environment:

```bash
VITE_API_BASE_URL=https://<backend-domain>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

After the frontend URL is known, update backend `CORS_ORIGINS` to exactly that HTTPS origin.

## 4. Supabase Storage

Create bucket:

- Name: `avatars`
- Recommended access: private

Backend will return stable URLs under `/uploads/avatars/<filename>` and redirect to signed Supabase URLs.

## 5. Smoke Test Production

Use a real Supabase access token or a known UUID user id:

```bash
SMOKE_API_BASE_URL=https://<backend-domain> SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://<backend-domain> SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

Before `smoke:chat` calls OpenRouter, it verifies the smoke user has at least `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` tokens, default `1000`. Top up that user through the admin wallet flow before running live production smoke. If you smoke with `SMOKE_USER_ID` instead of a real Supabase token, set `SMOKE_ADMIN_API_KEY` too.

Expected:

- `/health` returns `ok=true`.
- `/ready` returns `ok=true` before traffic is sent to the service.
- `/health` reports `imageGenerationConfigured=true` for real Creator Studio image generation.
- Avatar upload returns `provider=supabase` and `access=signed`.
- Live chat returns a reply, `chatId`, and token usage.
