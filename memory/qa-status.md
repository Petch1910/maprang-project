# QA Status

Last updated: 2026-05-19

## Latest Local Gate

Status: passing

Commands verified:
- `bun run qa:local`
- `bun run e2e:smoke`
- `bunx prisma migrate deploy`
- `bun run predeploy:check`
- `bun run deploy:status`
- `bun run deploy:readiness:test`
- `bun run memory:audit`
- `bun run knowledge:audit`
- `bun run eval:local`
- `bun run smoke:doctor`
- `git diff --check`

Results:
- Backend tests: 128 pass, 0 fail.
- API smoke: 26 pass, 0 fail, 1 skip for live chat in local mode.
- E2E smoke: 4 pass, 0 fail across desktop and mobile.
- Frontend build: pass.
- Bundle budget: pass.
- Secrets check: pass.
- Memory audit: pass.
- Knowledge audit: pass.
- Local prompt/context eval: pass.
- Route/menu audit: pass.
- Deploy status: pass, reports 2 staging blockers and 4 production blockers in local mode.
- Deploy readiness self-test: pass.
- Frontend UI smoke now covers mobile Explore bottom nav and Chat read mode.
- API smoke now covers admin-only prompt inspector snapshots, prompt diffs, and deterministic local evals.
- Route/menu audit now covers 14 surfaces including `/admin/prompt-inspector` and `/admin/evals`.
- API smoke and E2E now cover chat world state save/read persistence.
- API smoke and Wallet UI now cover total cost, cost by model, seven-day usage trend, and remaining-request estimates.
- Backend tests and health/API smoke now cover prompt budget config and history trimming behavior.
- Backend tests now cover chat provider failure classification for invalid credentials, quota exhaustion, rate limits, and timeouts.
- Live chat smoke scripts now fail on `usage.providerFailure` metadata instead of matching old fallback text.
- API smoke now covers `/chat/stream` SSE shape on an uncharged validation path.
- Production readiness now blocks on both chat provider and image provider live verification flags.
- Smoke doctor now reports separate staging blockers and production blockers; `--strict-staging` rejects local backend/CORS before provider verification.
- CI workflow includes `memory:audit`, `knowledge:audit`, and `eval:local`.
- CI and Production Smoke workflows now run deploy readiness self-test/status output before strict gates.
- Predeploy check now verifies `RELEASE_HANDOFF.md` exists and remains linked from production docs.
- `release:handoff:check` is part of `qa:local` and checks release handoff sections plus secret-shaped values.
- `release:handoff:test` is part of `qa:local` and verifies filled-mode and secret detection behavior.
- CI predeploy now runs `release:handoff:check` and `release:handoff:test` as explicit gates.
- Relationship engine focused test passes for the expanded Thai ladder and preset surface split: 12 pass, 0 fail.
- Current delta gate passes: `backend:check`, `frontend:check`, and `knowledge:audit`.
- Full local QA was rerun after starting Docker/Postgres and local backend; persistence tests ran against the local DB instead of skipping.
- Relationship preset API smoke now verifies 24 full presets, 19 player contract presets, and 24 Creator Studio presets.

## Production Gate

Status: intentionally failing until real environment is ready

Known `production:check` blockers:
- Local backend URL.
- Local or missing production CORS.
- Chat provider live smoke not marked verified.
- Image provider live smoke not marked verified.

Known `staging:verify` blockers in local mode:
- Local backend URL.
- Local or missing staging CORS.

## Browser QA

Status: passing for Admin Health, Admin Evals, and Chat UI interaction

Checked:
- `/admin/health` renders.
- `/admin/prompt-inspector` renders and can call the admin prompt snapshot flow when an admin key is available.
- `/admin/evals` renders and can run the deterministic local eval flow when an admin key is available.
- Production blocker summary is visible.
- Chat live smoke row is visible.
- `bun run production:check` guidance is visible.
- Refresh interaction works.
- `/chat` read mode toggles and shows the reading-mode notice.
- `/chat/:id` world state panel opens from the right rail, saves location/notes, and persists after reload.
- `/wallet` renders model cost breakdown and seven-day usage trend without console errors.
- `/admin/health` shows prompt budget/history settings without console errors.
- `/admin/health` deploy checklist shows a concrete next action on each blocker card.
- Console errors/warnings: none relevant.
