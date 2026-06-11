# How To Run

The current repo baseline is PostgreSQL + Prisma + Bun. Do not use old SQLite setup notes.

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

Verification:

```powershell
bun run qa:repo
bun run qa:full
```
