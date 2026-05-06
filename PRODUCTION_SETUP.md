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
- `CORS_ORIGINS`
- `ADMIN_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER=supabase`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS=signed`
- `SUPABASE_SIGNED_URL_EXPIRES_IN=3600`

After adding backend env values, validate them:

```bash
cd apps/backend
bun run env:check
```

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
4. Copy the anon public key to `VITE_SUPABASE_ANON_KEY`.
5. Copy the service role key to backend-only `SUPABASE_SERVICE_ROLE_KEY`.
6. Create a storage bucket named `avatars`.
7. Set `SUPABASE_STORAGE_BUCKET=avatars`.
8. Choose storage access:
   - Recommended: private bucket with `SUPABASE_STORAGE_ACCESS=signed`.
   - Optional: public bucket with `SUPABASE_STORAGE_ACCESS=public`.

Current implementation stores stable backend avatar URLs such as `/uploads/avatars/<filename>`. The backend serves local files in development and redirects to Supabase public or signed URLs in production.

## Deployment Order

Recommended first hosting path: follow `DEPLOY_RENDER.md`.

0. Run local static deployment readiness checks:

```bash
bun run secrets:check
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

`/health` is the basic liveness and database check. `/ready` is stricter and should be green before sending real users to the backend; it requires database connectivity, OpenRouter configuration, and production auth/storage hardening.

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
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

`smoke:chat` checks the smoke user's wallet before calling OpenRouter. Keep the smoke user topped up above `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT`, default `1000`, or override the threshold for heavier test prompts.

For a single production smoke gate, run `bun run smoke:live` with the same `SMOKE_API_BASE_URL` and smoke auth variables set.

Do not point `backend:check`, `qa:local`, or `qa:live` at production data unless you intentionally want the automated persistence tests to create and archive test records there. Use those gates with local or staging databases.

10. Complete manual QA from `DEPLOYMENT_QA.md`.

You can also run the manual GitHub Actions workflow `Production Smoke` after each deploy.
Configure repository secrets `SMOKE_API_BASE_URL` and either `SMOKE_ACCESS_TOKEN` or `SMOKE_USER_ID`.
Turn on `run_chat` only when you want to spend a small amount of provider credit to verify the live AI path. Leave `min_token_balance_for_chat` at `1000` unless the smoke model or prompt needs a larger buffer.

## Production Readiness Notes

- Latest migrations include reports, admin audit logs, and wallet token transactions. Always run `bunx prisma migrate deploy` before exposing the backend.
- Admin actions now write audit logs for report status changes, hidden characters, archived messages, and manual token adjustments.
- Payment is not connected yet. Use Wallet admin token adjustment only for beta/manual grants until a payment provider is added.
- Production smoke tests require either a real Supabase access token or a known UUID user id accepted by the backend environment, and live chat smoke requires that user's wallet to be topped up.
