# Quick Start

Use [RUN_NOW.md](RUN_NOW.md) for the canonical quick local path.

Short version:

```powershell
docker compose up -d
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun prisma/seed.ts
bun run dev
```

In another terminal:

```powershell
cd apps/frontend
bun run dev
```

Open `http://127.0.0.1:5173`.

If your backend `.env` uses a non-default port such as `3001`, set `VITE_API_BASE_URL` in `apps/frontend/.env` to the same backend URL and restart the frontend.

Verify from the repo root:

```powershell
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```
