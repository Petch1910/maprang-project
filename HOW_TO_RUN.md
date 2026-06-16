# How To Run

The current repo baseline is PostgreSQL + Prisma + Bun. Do not use legacy embedded-database setup notes.
Local/dev chat can use `local/mock-roleplay` for playable QA without spending live provider credits. Staging and production still require live provider smoke.

For the full step-by-step guide, start here:

- [START_HERE.md](START_HERE.md)
- [RUN_NOW.md](RUN_NOW.md)

Minimum local flow:

```powershell
docker compose up -d
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun prisma/seed.ts
bun run dev
```

Then run the frontend:

```powershell
cd apps/frontend
bun run dev
```

Expected URLs:

- Backend: `http://127.0.0.1:3000` unless `apps/backend/.env` overrides `PORT`
- Frontend: `http://127.0.0.1:5173`

When backend `PORT` is overridden, use that backend origin for frontend `VITE_API_BASE_URL`. Smoke/deploy CLIs (`smoke:doctor`, `api:smoke`, `deploy:status`) read `PORT` from `apps/backend/.env` when `SMOKE_API_BASE_URL` is not set, and `bun run e2e:smoke` reads the same file when `E2E_API_BASE_URL` is not set.

For local loopback smoke, admin smoke uses `SMOKE_ADMIN_API_KEY` first and can fall back to `ADMIN_API_KEY` from untracked `apps/backend/.env`. Staging and production must set `SMOKE_ADMIN_API_KEY` explicitly as a secret.

Verification:

```powershell
bun run qa:repo
bun run qa:full
```
