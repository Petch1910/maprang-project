# Environment Setup Guide

This file is a short pointer for the current repo baseline. For the full local run path, use [START_HERE.md](START_HERE.md) and [RUN_NOW.md](RUN_NOW.md).

## Current Stack

- Frontend: React 19, Vite, Redux Toolkit
- Backend: Bun, Elysia, Prisma
- Database: PostgreSQL
- Local chat mode: `local/mock-roleplay`
- Production auth/storage: Supabase JWT and private `avatars` bucket with signed URLs

Do not use legacy embedded-database instructions for this repo. PostgreSQL is the supported baseline.

## Backend Env

Create `apps/backend/.env` from `apps/backend/.env.example`.

Minimum local values:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/maprang?schema=public
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
OPENROUTER_MODEL=local/mock-roleplay
ADMIN_API_KEY=replace-with-long-random-admin-key
```

Production/staging also require real provider and storage values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_JWT_ISSUER=https://your-project.supabase.co/auth/v1
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
SUPABASE_STORAGE_BUCKET=avatars
SUPABASE_STORAGE_ACCESS=signed
SUPABASE_SIGNED_URL_EXPIRES_IN=3600
OPENROUTER_API_KEY=replace-with-live-chat-provider-key
IMAGE_GENERATION_API_KEY=replace-with-live-image-provider-key
```

## Frontend Env

Create `apps/frontend/.env` from `apps/frontend/.env.example`.

```env
VITE_API_BASE_URL=http://127.0.0.1:3000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=replace-with-anon-key
```

If the local backend uses a different port, update `VITE_API_BASE_URL` and restart the frontend.

## Verify

From the repo root:

```powershell
bun run secrets:check
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```

Production readiness is not proven by local mock mode. Use:

```powershell
bun run staging:verify
bun run production:check
```
