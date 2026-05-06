# Deployment QA Checklist

Use this checklist before handing the app to testers or deploying a new environment.

## Automated Checks

Run the full local gate when Postgres, backend, and frontend are available:

```bash
bun run qa:local
```

This gate does not call the live AI provider. It verifies committed secrets, deploy configuration, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, and avatar upload.

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

```bash
cd apps/frontend
bun run deploy:check
```

With local backend and frontend running, run:

```bash
bun run smoke:doctor
```

```bash
bun run smoke:local
```

To verify the live AI provider path, run this only when the backend is allowed to reach OpenRouter:

```bash
bun run smoke:chat
```

If `smoke:chat` reports that the backend returned the temporary AI fallback, the app, database, and chat route were reachable, but the backend could not complete the outbound provider request. Check outbound network access to `https://openrouter.ai`, `OPENROUTER_API_KEY`, provider credits, and backend logs.

For a deployed backend, point the smoke tests at the backend URL. Use either a Supabase user token or a known UUID user id:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> bun run smoke:chat
```

Expected result:

- Backend Prisma schema validates.
- No obvious committed secrets are present.
- Backend TypeScript passes.
- Backend tests pass.
- Frontend TypeScript and Vite build pass.
- Smoke doctor confirms the backend is reachable and the database is connected.
- Local smoke confirms health, seeded Maprang data, relationship preview, and avatar upload.
- Live chat smoke confirms backend-to-OpenRouter chat, chat persistence, and usage accounting.

The same deploy checks also run in GitHub Actions through `.github/workflows/ci.yml`.
CI also runs a seeded local backend smoke test and builds the backend and frontend Docker images without pushing them.

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
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS`
- `SUPABASE_SIGNED_URL_EXPIRES_IN`
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
- Optional: use public read with `SUPABASE_STORAGE_ACCESS=public`.
- Confirm avatar uploads return a stable backend URL and that opening it redirects or serves the image.

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

## Release Notes Template

- Commit or build id:
- Backend URL:
- Frontend URL:
- Database migration applied:
- Storage provider:
- Known limitations:
