# Quick Fix Guide

Use this file for current repo fixes only. The supported baseline is PostgreSQL + Prisma + Bun.

## Backend Not Reachable

1. Start PostgreSQL:

```powershell
docker compose up -d
```

2. Start backend:

```powershell
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun run dev
```

3. If backend uses a non-default port, set the same URL in frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:3001
```

Restart the frontend after changing env files.

## Frontend Route Or Menu Feels Broken

Run the static gates from repo root:

```powershell
bun run frontend:static:audit
bun run frontend:route:audit
bun run route-menu:audit
bun run e2e:smoke
```

## API Contract Drift

Run:

```powershell
bun run api:audit
bun run api:smoke
```

If `api:audit` fails, fix `apps/frontend/src/lib/api.ts` or the backend route declarations so they match.

## Full Local Confidence

```powershell
bun run qa:full
```

If a blocker requires real domains, Supabase, production DB, or live providers, record it as a staging/production blocker instead of treating local mock mode as proof.
