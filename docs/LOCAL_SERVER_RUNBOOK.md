# งาน - Maprang Local Server Runbook

Last updated: 2026-06-18

This runbook is the operator path for running Maprang as a local server product before cloud production. The local target is the current v1 priority because hosting is not finalized yet. Ngrok is only for temporary HTTPS preview, and cloud deployment is a separate external phase.

## งาน - Local Target

Local server means:

- Backend runs on the same machine, normally `http://127.0.0.1:3001`.
- Frontend runs on the same machine, normally `http://127.0.0.1:5173`.
- PostgreSQL runs locally or through Docker Compose.
- Local-safe roleplay uses `local/mock-roleplay` so development and QA do not require a live chat provider.
- Supabase/live image providers can be configured when available, but local QA must still work without them.
- Ngrok is optional and should be used only when another device or tester needs temporary HTTPS access.

## งาน - Current Status

Latest verified full local baseline was `bun run qa:full` on 2026-06-18. It covered repo QA, seed data, smoke doctor, local smoke, API smoke, browser e2e, and final reseed.

Current 2026-06-18 runtime note: Docker Desktop was started successfully, `maprang-db` is running through Docker Compose, backend is available at `http://127.0.0.1:3001`, frontend is available at `http://127.0.0.1:5173`, and the local runtime gate passed. If a future session reports that the Docker Desktop engine pipe is unavailable, start Docker Desktop first and rerun the startup order below.

## งาน - Startup Order

Preferred one-command local startup:

```powershell
bun run local:up
```

That command runs this sequence:

```powershell
docker compose up -d postgres
bunx prisma migrate deploy
bun run qa:seed
```

Then it starts:

- Backend: `http://127.0.0.1:3001`
- Frontend: `http://127.0.0.1:5173`

If PostgreSQL, migrations, and seed data are already ready, start only backend/frontend:

```powershell
bun run local:up -- --skip-docker --skip-migrate --skip-seed
```

To use custom ports:

```powershell
bun run local:up -- --backend-port 3010 --frontend-port 5174
```

## งาน - Manual Startup

Use this only when debugging startup pieces separately.

```powershell
docker compose up -d postgres
```

```powershell
cd apps/backend
bunx prisma migrate deploy
```

```powershell
bun run qa:seed
```

```powershell
cd apps/backend
$env:HOST='127.0.0.1'
$env:PORT='3001'
$env:LOCAL_CHAT_PROVIDER='1'
$env:CHAT_PROVIDER='local'
$env:LOCAL_CHAT_MODEL_NAME='local/mock-roleplay'
bun run start
```

```powershell
cd apps/frontend
$env:VITE_API_BASE_URL='http://127.0.0.1:3001'
bun run dev -- --host 127.0.0.1 --port 5173
```

## งาน - Local QA Gate

Run deterministic repo checks:

```powershell
bun run qa:repo
```

Run runtime local verification after services are available:

```powershell
bun run qa:full
```

Useful focused checks:

```powershell
bun run local:doctor
bun run smoke:doctor
bun run smoke:local
bun run api:smoke
bun run e2e:smoke
```

If `bun run e2e:smoke` clears QA data, restore it:

```powershell
bun run qa:seed
```

## งาน - Local Database Backup

Create a backup before large manual QA or risky migrations:

```powershell
bun run local:db:backup
```

The default writes a PostgreSQL custom dump under `/backups/`, for example:

```text
backups/maprang-local-20260617T123456Z.dump
```

The helper uses Docker Compose service `postgres`, database `maprang_local`, and user `admin` by default. Backup files use `*.dump` and are ignored by source control.

Custom backup path:

```powershell
bun run local:db:backup -- --file backups/before-large-change.dump
```

Restore requires an explicit confirmation flag:

```powershell
bun run local:db:restore -- --file backups/before-large-change.dump --confirm-restore
```

Custom database/service options:

```powershell
bun run local:db:backup -- --database maprang_local --user admin --service postgres
```

## งาน - Ngrok Preview

Use Ngrok only for a temporary public preview or staging-like HTTPS test. Prefer the repo proxy script instead of exposing separate backend/frontend tunnels.

```powershell
bun run ngrok:proxy
```

See:

```text
docs/NGROK_STAGING_RUNBOOK.md
```

## งาน - Operator Checklist

Before a local QA session:

1. Start Docker Desktop.
2. Run `docker compose up -d postgres` or `bun run local:up`.
3. Run migrations with `bunx prisma migrate deploy` if `local:up` was not used.
4. Run `bun run qa:seed`.
5. Run `bun run local:doctor`.
6. Open `http://127.0.0.1:5173`.
7. Test explore, create, chat, saved chats, report, wallet, events, moderation, and `/admin/health`.
8. Run `bun run qa:full` before treating the local build as verified.

## งาน - Local Server Tasks / Completed Local Work

- Local startup command: `bun run local:up`
- Local doctor command: `bun run local:doctor`
- Backup/restore commands: `bun run local:db:backup` and `bun run local:db:restore -- --file <dump> --confirm-restore`
- Repo QA wiring includes `local:up:test`, `local:db:test`, and `local:doctor:test`.
- Route/menu/API/static audits are wired into the local gate.
- Local chat is forced to `local/mock-roleplay` by the startup helper.

## งาน - Future / External

These are not blockers for local-server completion:

- Deploy backend to a real HTTPS URL.
- Deploy frontend to a real HTTPS domain.
- Configure production `CORS_ORIGINS`.
- Configure production/staging database URL.
- Verify Supabase Storage bucket `avatars` with private signed URL access on the real environment.
- Run live chat/image/storage/admin smoke against deployed URLs.
- Fill release handoff evidence after staging/production verification.
