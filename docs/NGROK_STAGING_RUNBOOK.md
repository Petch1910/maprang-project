# Maprang Ngrok Staging Runbook

Use this when the team needs a temporary HTTPS staging URL from the local machine before deploying to Render/Railway/Fly.

Ngrok is acceptable for staging smoke and browser QA. Do not treat it as the final production domain unless a stable paid/reserved domain and release policy are explicitly approved.

## Current Local Pattern

This repo supports a single public Ngrok URL by running a local proxy:

- Browser page navigation and Vite assets go to the frontend preview/dev server.
- API calls go to the backend server.
- The browser sees one HTTPS origin, so normal app traffic does not depend on CORS between two Ngrok domains.
- The proxy strips decoded upstream transfer headers such as `content-encoding` and routes `/fonts/` to the frontend. This avoids blank pages caused by decoded Bun proxy bodies still carrying gzip headers.

The proxy is `scripts/ngrok-staging-proxy.ts` and is started with:

```powershell
bun run ngrok:proxy
```

Default local targets:

- Proxy: `http://127.0.0.1:8787`
- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3001`

Override targets only when needed:

```powershell
$env:NGROK_PROXY_PORT="8787"
$env:NGROK_FRONTEND_ORIGIN="http://127.0.0.1:5173"
$env:NGROK_BACKEND_ORIGIN="http://127.0.0.1:3001"
bun run ngrok:proxy
```

## Startup Order

1. Start Postgres.

```powershell
docker compose up -d postgres
```

2. Set the backend CORS origin to the Ngrok HTTPS origin you will use, then restart backend.

Example for the current reserved endpoint:

```powershell
$env:CORS_ORIGINS="https://subplot-unworthy-exorcist.ngrok-free.dev"
cd apps/backend
bun run start
```

If you start backend from `apps/backend/.env`, set:

```env
CORS_ORIGINS=https://subplot-unworthy-exorcist.ngrok-free.dev
```

3. Set frontend API base URL to the same Ngrok HTTPS origin, then restart frontend.

```env
VITE_API_BASE_URL=https://subplot-unworthy-exorcist.ngrok-free.dev
```

For browser e2e through Ngrok, prefer a production preview build instead of the Vite dev server. This avoids HMR websocket noise and matches staging behavior more closely. QA seed visibility in a production preview build is intentionally gated by `VITE_ALLOW_QA_SEED=1`; do not set this flag for real production.

```powershell
cd apps/frontend
$env:VITE_API_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
$env:VITE_ALLOW_QA_SEED="1"
bun run build
bun run preview -- --host 127.0.0.1 --port 5173 --strictPort
```

The dev server is still acceptable for manual UI iteration:

```powershell
cd apps/frontend
bun run dev -- --host 127.0.0.1
```

4. Start the Maprang proxy.

```powershell
cd <repo-root>
bun run ngrok:proxy
```

5. Start Ngrok against the proxy, not directly against backend or frontend.

```powershell
ngrok http 8787
```

If your Ngrok account has a reserved endpoint, it may reuse that endpoint automatically. If not, copy the generated `https://...ngrok-free...` URL and use it for `CORS_ORIGINS`, `VITE_API_BASE_URL`, `SMOKE_API_BASE_URL`, `E2E_BASE_URL`, and `E2E_API_BASE_URL`, then restart backend/frontend/proxy.

## Verification Commands

Replace the URL if Ngrok generated a different one.

```powershell
$env:SMOKE_API_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
bun run smoke:doctor
bun run smoke:ready
```

For browser smoke through the same Ngrok origin:

```powershell
$env:E2E_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
$env:E2E_API_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
bun run e2e:smoke
```

For staging verification:

```powershell
$env:SMOKE_API_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
$env:SMOKE_ADMIN_API_KEY="<admin-key>"
bun run staging:verify
```

Do not paste the real admin key into tracked files or Markdown. Set it only in the shell or CI secret store.

If the admin key in `apps/backend/.env` is quoted, strip the surrounding quotes before exporting it to smoke commands:

```powershell
$raw=(Select-String -Path apps\backend\.env -Pattern '^ADMIN_API_KEY=(.+)$').Matches.Groups[1].Value.Trim()
if (($raw.StartsWith('"') -and $raw.EndsWith('"')) -or ($raw.StartsWith("'") -and $raw.EndsWith("'"))) { $raw=$raw.Substring(1,$raw.Length-2) }
$env:SMOKE_ADMIN_API_KEY=$raw
$env:E2E_ADMIN_API_KEY=$raw
```

For live chat verification, restart the backend with local fallback disabled so the smoke proves the real provider path:

```powershell
$env:CORS_ORIGINS="https://subplot-unworthy-exorcist.ngrok-free.dev"
$env:LOCAL_CHAT_PROVIDER="0"
cd apps/backend
bun run start
```

Then run:

```powershell
$env:SMOKE_API_BASE_URL="https://subplot-unworthy-exorcist.ngrok-free.dev"
bun run smoke:chat
```

## Common Failures

- `ERR_NGROK_334`: the reserved endpoint is already online. Stop the existing Ngrok process or route both frontend/backend through `bun run ngrok:proxy` and expose only port `8787`.
- Browser opens Ngrok warning page: frontend API calls already include `ngrok-skip-browser-warning`; manual browser visits may still show the warning once.
- `staging:verify` reports CORS blocker: backend `CORS_ORIGINS` is not the current Ngrok HTTPS origin or still points to an example domain.
- Frontend calls old backend: restart Vite after changing `VITE_API_BASE_URL`; Vite reads `VITE_*` at dev-server startup.
- `e2e:smoke` cannot see QA seed in a production preview build: rebuild frontend with `VITE_ALLOW_QA_SEED=1` for staging QA only.
- `smoke:chat` returns zero-token stream results in dev mode: restart backend with `LOCAL_CHAT_PROVIDER=0` when the goal is live-provider verification, otherwise a provider stream failure can fall back to local roleplay.
- `production:check` still fails on Supabase: Ngrok does not replace real `avatars` private signed storage verification.

## Release Rule

Ngrok can clear temporary HTTPS smoke and browser QA blockers. It does not clear these production blockers by itself:

- permanent frontend domain
- permanent backend domain
- final production CORS origin
- production database handoff
- Supabase signed storage with production credentials
- release rollback plan
