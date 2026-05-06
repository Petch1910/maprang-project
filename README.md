# Maprang Project

AI character chat platform with relationship state, scene events, creator tools, usage tracking, and production-ready auth/storage hooks.

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

3. Frontend env:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

Leave blank or omit this file for local dev auth mode.
Set `VITE_API_BASE_URL` when the backend is not running at `http://localhost:3000`.

For local development with real Supabase credentials, keep `STORAGE_PROVIDER=local` in `apps/backend/.env`. This lets auth use Supabase while avatar tests and local uploads stay on disk. Use `STORAGE_PROVIDER=supabase` only in production or when intentionally testing Supabase Storage.

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

## Production Checklist

- Follow `PRODUCTION_SETUP.md` for the full production env and Supabase setup.
- Use `DEPLOY_RENDER.md` for the recommended first hosting path.
- Set backend env from `apps/backend/.env.production.example`.
- Set frontend env from `apps/frontend/.env.production.example`.
- Set `VITE_API_BASE_URL` to the deployed backend URL.
- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to deployed frontend origins only.
- Set a long random `ADMIN_API_KEY`.
- Set `SUPABASE_URL` or `SUPABASE_JWT_ISSUER` for JWT verification.
- Set `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, and `SUPABASE_STORAGE_ACCESS=signed`.
- Create the Supabase Storage bucket before multi-instance deploy.
- Run the verification commands below before deploying.

## Docker Build

```bash
docker build -f apps/backend/Dockerfile -t maprang-backend .
docker build -f apps/frontend/Dockerfile -t maprang-frontend --build-arg VITE_API_BASE_URL=https://api.example.com .
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

Or run each check separately:

```bash
bun run backend:check
```

```bash
bun run frontend:check
```

```bash
bun run smoke:doctor
```

```bash
bun run smoke:local
```

```bash
bun run smoke:chat
```

GitHub Actions also runs the same deploy checks on pushes to `main` and on pull requests.
