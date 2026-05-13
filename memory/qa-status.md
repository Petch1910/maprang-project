# QA Status

Last updated: 2026-05-13

## Latest Local Gate

Status: passing

Commands verified:
- `bun run qa:local`
- `bun run e2e:smoke`
- `bun run predeploy:check`
- `bun run memory:audit`
- `bun run knowledge:audit`
- `bun run smoke:doctor`
- `git diff --check`

Results:
- Backend tests: 109 pass, 0 fail.
- API smoke: 22 pass, 0 fail, 1 skip for live chat in local mode.
- E2E smoke: 4 pass, 0 fail across desktop and mobile.
- Frontend build: pass.
- Bundle budget: pass.
- Secrets check: pass.
- Memory audit: pass.
- Knowledge audit: pass.
- Route/menu audit: pass.
- CI workflow includes `memory:audit` and `knowledge:audit`.

## Production Gate

Status: intentionally failing until real environment is ready

Known `production:check` blockers:
- Local backend URL.
- Local or missing production CORS.
- Chat provider live smoke not marked verified.
- Image provider live smoke not marked verified.

## Browser QA

Status: passing for Admin Health

Checked:
- `/admin/health` renders.
- Production blocker summary is visible.
- Chat live smoke row is visible.
- `bun run production:check` guidance is visible.
- Refresh interaction works.
- Console errors/warnings: none relevant.
