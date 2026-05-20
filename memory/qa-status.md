# QA Status

Last updated: 2026-05-20

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
- Backend tests: 147 pass, 0 fail.
- API smoke: 32 pass, 0 fail, 1 skip for live chat in local mode.
- E2E smoke: 4 pass, 0 fail across desktop and mobile.
- Frontend build: pass.
- Bundle budget: pass.
- Frontend Redux circular dependency cleanup: pass via `frontend:check` and SocratiCode graph check; store/slice cycles dropped from six frontend chains to zero.
- Backend circular dependency cleanup: pass via focused backend tests and SocratiCode graph check; project graph now reports no circular dependencies.
- Import-cycle audit: pass via `import-cycle:audit`, `import-cycle:audit:test`, and `predeploy:check`; the repo-owned audit currently checks 122 app/QA source files and 272 relative import edges, including TypeScript import-equals `require()` and CommonJS `require()` calls, and predeploy now guards that coverage plus its docs.
- Frontend Thai localization pass: pass via frontend static audit and frontend deploy check.
- Admin browser smoke Thai labels: pass via `frontend:static:audit:test`, `frontend:check`, `e2e:smoke:test`, and `predeploy:check`.
- Browser e2e smoke now checks the Thai-first Automated Evals heading `ทดสอบคุณภาพพรอมป์และบริบท` instead of the old mixed `prompt/context` wording, and the latest desktop/mobile run passes 4/4 again.
- Predeploy now also blocks the stale `prompt/context` wording from returning to the e2e browser smoke spec.
- `predeploy:check:test` now runs in local QA, CI, and Production Smoke to guard predeploy/e2e wording wiring without rerunning the full predeploy gate.
- Full `qa:local` was rerun after wiring `predeploy:check:test`; the new predeploy regression test passed inside the full local gate.
- Predeploy now explicitly requires `qa:local` and CI to keep `deploy:doctor:self-test` wired, matching the deployed smoke workflow.
- Route/menu Thai localization: pass via `route-menu:audit`, `route-menu:audit:test`, and `frontend:check`.
- Route/menu staging checklist copy now passes `frontend:static:audit:test`, `route-menu:audit`, `route-menu:audit:test`, and `frontend:check`; the static audit blocks the old ambiguous `ยังไม่ใช่ปุ่มในแอปเครื่องนี้` wording from returning.
- Thai-first UI label regression guard: pass via `frontend:static:audit:test`.
- Full local QA was rerun after the latest Thai UI copy guards and route/menu mixed-language guard; `qa:local` still passes across backend, frontend, local smoke, and API smoke.
- Full local QA was rerun after the latest Thai-first frontend/admin copy and Creator Draft image-provider copy passes; `qa:local` still passes across backend, frontend, local smoke, API smoke, audits, evals, and predeploy.
- Secrets check: pass.
- Memory audit: pass.
- Knowledge audit: pass.
- Production deploy knowledge wiki: updated to reflect reply-budget gates and staging/deploy-status order.
- Local prompt/context eval: pass.
- Route/menu audit: pass.
- Deploy status: pass, reports 2 staging blockers and 4 production blockers in local mode.
- Deploy readiness now treats CORS that is empty, local, or non-https as a staging/production blocker.
- Predeploy now verifies `DEPLOY_RENDER.md` keeps HTTPS-only CORS/frontend-backend URL guidance for Render staging/production.
- Predeploy now also checks staging and production docs mention local/non-https CORS blockers consistently.
- Predeploy now verifies the canonical agent guide keeps deployed HTTPS backend/CORS blocker wording.
- Smoke doctor now prints ordered deploy next steps from the shared readiness evaluator.
- Deploy status JSON now exposes top-level staging/production ready flags and blocker counts for automation.
- Deploy readiness self-test: pass.
- Frontend UI smoke now covers mobile Explore bottom nav and Chat read mode.
- API smoke now covers admin-only prompt inspector snapshots, prompt diffs, and deterministic local evals.
- Prompt Inspector service tests now cover secret redaction in retrieved lore previews and aliases.
- Prompt Inspector service tests now also guard Thai-first warning copy for redaction, injection review hints, and oversized prompt warnings.
- Route/menu audit now covers 14 surfaces including `/admin/prompt-inspector` and `/admin/evals`.
- API smoke and E2E now cover chat world state save/read persistence.
- API smoke and Wallet UI now cover total cost, cost by model, seven-day usage trend, and remaining-request estimates.
- API smoke with `--require-admin` now passes 32 checks plus 1 local live-chat skip, including backend root identity, uncharged chat validation, non-mutating chat delete/report creation, admin wallet, and admin report PATCH/action validation.
- API smoke invalid-id validation now requires Thai-first `message` fields in addition to `error` codes for chat/report/admin validation paths, guarded by `api:smoke:test` import safety and predeploy.
- `api:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard route discovery, coverage-map regressions, and the importable route audit runner.
- `import-cycle:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard relative import extraction, extension/index resolution, cycle detection, and the importable architecture audit runner.
- `api:smoke:test` now runs in `qa:local`, CI, and Production Smoke to guard API smoke readiness/image helper regressions, summary counts, and API smoke runner import safety without calling a backend.
- `frontend:api:test` now runs in `qa:local`, CI, and Production Smoke to guard frontend `ApiError` behavior: backend Thai `message` fields win, missing-message fallbacks stay Thai-first, and raw machine-readable `error` codes remain in `payload` instead of becoming user-facing copy.
- `frontend:bundle:test` now runs in `qa:local`, CI, and Production Smoke to guard code-splitting, bundle budget regressions, and the importable bundle budget runner.
- `frontend:static:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard button accessibility, placeholder-copy regressions, admin/system/relationship English UI label regressions, mixed English debug copy regressions, Thai text/mojibake regressions, and the importable static audit runner.
- `frontend:static:audit:test` now also blocks stale English Redux fallback errors such as `Could not load chats` and `Could not load characters`.
- Frontend load/auth failure handling now maps raw provider/browser error messages to Thai-first notes before showing them to users, with static/predeploy regression guards for raw auth/provider and Redux async error display patterns.
- Frontend API fallback error wording now passes Thai-first coverage via `frontend:static:audit:test` and full `frontend:check`.
- Frontend `ApiError` backend-message precedence now passes `frontend:api:test`, `frontend:static:audit:test`, and full `frontend:check`; the static audit blocks the old payload.error-first constructor and `payloadError` fallback patterns.
- `frontend:static:audit:test` now also blocks stale English content-rating badges such as `Teen romance`, `Mature 18+`, and `Restricted 18+`.
- `frontend:static:audit:test` now also blocks stale English chat-selection accessibility labels such as `Select chat`.
- Admin summary Thai status labels now pass full `frontend:check`.
- Chat role panel Thai publication/visibility labels now pass full `frontend:check`.
- Centralized character publication/visibility labels now pass full `frontend:check`, `import-cycle:audit`, and `import-cycle:audit:test`.
- `frontend:static:audit:test` now also blocks stale mixed Creator Studio copy such as `image provider`, `production ควรตั้งค่า`, `Lobby ดูน่ากด`, `แกน prompt`, and `backend ช่วยร่าง`.
- `frontend:static:audit:test` now also blocks stale mixed Admin Health operational copy such as `backend ยังไม่พร้อมเต็ม`, `health response จาก backend`, `provider จริง`, `final gate`, and `mobile overflow`.
- `frontend:static:audit:test` now also blocks stale Admin Health provider guidance such as raw `usage.providerFailure`, `billing/quota limit`, `local/dev ยังไม่บังคับ`, and reversed `production/staging` wording.
- Creator Draft image-provider copy now passes focused backend coverage with Thai-first missing-provider, configured-failure, and billing-limit messages.
- Backend relationship validation copy now passes Thai-first coverage via `bun test apps\backend\src\relationship.engine.test.ts`, focused character validation tests, and full `backend:check` with 132 pass.
- Backend character quality notes now pass Thai-first coverage via `bun test apps\backend\src\character.validation.test.ts` and full `backend:check` with 133 pass.
- Backend runtime env/readiness copy now passes Thai-first coverage via `bun test apps\backend\src\env.test.ts apps\backend\src\health.service.test.ts scripts\deploy-readiness.test.ts scripts\deploy-status.test.ts scripts\smoke-doctor.test.ts scripts\api-smoke-helpers.test.ts`, `backend:check`, `deploy:readiness:test`, `deploy:status:test`, `smoke:doctor:test`, `api:smoke:test`, and `predeploy:check`.
- Deploy readiness provider blocker wording now passes `bun test apps\backend\src\health.service.test.ts`, `deploy:readiness:test`, `deploy:status:test`, `smoke:doctor:test`, `api:smoke:test`, and `predeploy:check`.
- Deploy readiness next-step fix wording now passes `deploy:readiness:test`, `deploy:status:test`, `smoke:doctor:test`, and `predeploy:check`.
- Deploy env doctor image-key wording now passes through `deploy:doctor:test`, `deploy:doctor:self-test`, and `predeploy:check`.
- Smoke/deploy CLI failure guidance now passes Thai-first coverage via `bun run deploy:status:test`, `bun run smoke:doctor:test`, `bun run smoke:ready:test`, and `predeploy:check`.
- Smoke doctor missing image-generation warning now passes Thai-first coverage via `bun run smoke:doctor:test`.
- Smoke doctor roleplay reply-budget recommendation warning now passes Thai-first coverage via `bun run smoke:doctor:test`.
- Live provider smoke guidance now passes Thai-first coverage via `bun run smoke:image:test`, `bun run smoke:chat:test`, `bun run provider:smoke:guards:test`, `bun run api:smoke:test`, and `predeploy:check`.
- Live image/API smoke helper copy now passes Thai-first coverage for missing provider config, provider billing, quota, invalid image keys, placeholder fallback, missing image URL, and local SVG fallback through `api:smoke:test`, `smoke:image:test`, `provider:smoke:guards:test`, and `predeploy:check`.
- Local smoke failure guidance now passes Thai-first coverage via `bun run smoke:local:test`.
- Backend DB-required check guidance now passes Thai-first coverage via `bun run backend:check:db:test`.
- Backend DB test gate guidance now passes Thai-first coverage via `bun test apps\backend\src\db.test-gate.test.ts` and full `backend:check` with 141 pass.
- Backend chat validation/access/token/rating/empty-provider fallback copy now passes Thai-first coverage via `bun test apps\backend\src\chat.runtime.test.ts apps\backend\src\character.persistence.test.ts` and full `backend:check` with 141 pass.
- Backend rate-limit response copy now passes Thai-first coverage via `bun test apps\backend\src\security.test.ts` and full `backend:check` with 141 pass.
- Backend avatar storage failure copy now passes Thai-first coverage via `bun test apps\backend\src\storage.service.test.ts apps\backend\src\upload.routes.test.ts` and full `backend:check` with 141 pass.
- Backend production auth 401 copy now passes Thai-first coverage via `bun test apps\backend\src\security.test.ts` and full `backend:check` with 141 pass.
- Backend avatar upload validation copy now passes Thai-first coverage via `bun test apps\backend\src\storage.service.test.ts apps\backend\src\upload.routes.test.ts` and full `backend:check` with 141 pass.
- Backend invalid UUID guard copy now passes Thai-first coverage via `bun test apps\backend\src\route-id-validation.test.ts apps\backend\src\chat.routes.security.test.ts` and full `backend:check` with 141 pass.
- Backend chat route persistence/not-found error copy now passes Thai-first coverage via `bun test apps\backend\src\route-id-validation.test.ts apps\backend\src\chat.routes.security.test.ts` and full `backend:check` with 142 pass.
- Backend character route persistence/access/not-found error copy now passes Thai-first coverage via `bun test apps\backend\src\character.validation.test.ts apps\backend\src\route-id-validation.test.ts` and full `backend:check` with 143 pass.
- Backend lore route persistence/access/not-found error copy now passes Thai-first coverage via `bun test apps\backend\src\route-id-validation.test.ts` and full `backend:check` with 144 pass.
- Backend report route access/persistence/admin-action error copy now passes Thai-first coverage via `bun test apps\backend\src\route-id-validation.test.ts apps\backend\src\report.service.test.ts` and full `backend:check` with 145 pass.
- Backend admin route access/persistence/token-adjustment error copy now passes Thai-first coverage via `bun test apps\backend\src\admin.prompt-inspector.routes.test.ts apps\backend\src\admin.service.test.ts` and full `backend:check` with 146 pass.
- Backend user route persistence error copy now passes Thai-first coverage via `bun test apps\backend\src\user.service.test.ts` and full `backend:check` with 147 pass.
- Backend route error fallback copy now passes focused route-id coverage and full `backend:check` with 147 pass, 460 expect calls.
- Full `api:smoke` was not rerun in this delta because Docker Desktop/Postgres is not available in the local environment; `api:smoke:test` still passes and the changed smoke validation assertion now expects the Thai invalid-character reply.
- Profile/tag helper and route/menu staging copy now pass Thai-first coverage via `frontend:static:audit:test`, `frontend:check`, `route-menu:audit`, `route-menu:audit:test`, and `predeploy:check`; the static audit also blocks stale `backend`/`prompt`/`runtime`/`persona` helper wording from returning.
- `frontend:static:audit:test` now also blocks stale mixed prompt/admin tooling copy such as `System prompt`, `redacted prompt`, `Runtime note`, `prompt snapshot`, `admin API`, and `frontend domain`.
- `frontend:route:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard static link, navigate route regressions, and the importable route audit runner.
- `route-menu:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard Route/Menu Audit document, runtime row alignment, stale mixed-language audit copy, and the importable doc-check runner.
- `smoke:helpers:test` now runs in `qa:local`, CI, and Production Smoke to guard local/deployed smoke auth header behavior and shared backend root identity validation.
- `provider:smoke:guards:test` now runs in `qa:local`, CI, and Production Smoke to guard live chat/image smoke verification helpers.
- `smoke:doctor:test` now runs in `qa:local`, CI, and Production Smoke to guard backend root identity preflight, smoke doctor blocker output, and strict-gate output.
- `smoke:ready:test` now runs in `qa:local`, CI, and Production Smoke to guard backend root identity preflight, `/ready` summary output, and the importable readiness smoke runner.
- Shared smoke helper diagnostics now pass Thai-first coverage via `smoke:helpers:test`, `smoke:local:test`, `deploy:status:test`, `smoke:image:test`, `smoke:chat:test`, `smoke:ready:test`, and `smoke:doctor:test`.
- `smoke:image:test` now runs in `qa:local`, CI, and Production Smoke to guard backend root identity preflight, image smoke skip/fallback/live payload helpers, and the importable image smoke runner without provider calls.
- `smoke:chat:test` now runs in `qa:local`, CI, and Production Smoke to guard backend root identity preflight, live chat smoke validation, success payload helpers, and the importable live chat smoke runner without provider calls.
- `deploy:status:test` now runs in `qa:local`, CI, and Production Smoke to guard backend root identity preflight, deploy status JSON/text output, and the importable deploy status runner.
- `deploy:status:test` now also verifies helper-only payload/text output does not invent a root identity when no root preflight result was supplied.
- `deploy:doctor:test` now runs in `qa:local`, CI, and Production Smoke to guard deploy env parsing/JWT helpers plus the importable full doctor runner without reading real production env files.
- `deploy:doctor:test` also imports the deploy doctor self-test runner without executing it, and `deploy:doctor:self-test` remains the CLI self-test gate in `qa:local`.
- `vault:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard shared memory/knowledge Markdown audit helpers plus importable memory and knowledge audit runners.
- `backend:check:db:test` now runs in `qa:local`, CI, and Production Smoke to guard DB-required backend check command planning and the importable DB check runner.
- `supabase:storage:test` now runs in `qa:local`, CI, and Production Smoke to guard signed-storage setup helpers plus the importable setup runner without calling Supabase.
- Supabase signed-storage setup failure guidance now passes Thai-first coverage via `supabase:storage:test`.
- `smoke:local:test` now runs in `qa:local`, CI, and Production Smoke to guard local smoke helper behavior and the importable local smoke runner without calling the backend.
- `e2e:smoke:test` now runs in `qa:local`, CI, and Production Smoke to guard browser smoke seed reset/restore command ordering without launching Playwright.
- Backend tests and health/API smoke now cover prompt budget config and history trimming behavior.
- Backend tests now cover chat provider failure classification for invalid credentials, quota exhaustion, rate limits, and timeouts.
- Live chat smoke scripts now fail on `usage.providerFailure` metadata instead of matching old fallback text.
- API smoke now covers `/chat/stream` SSE shape on an uncharged validation path.
- Roleplay depth budget bump to 1600/420: pass via backend chat/env/health tests, live chat smoke helper test, deploy doctor test, and API smoke helper test.
- Runtime prompt depth alignment: pass via `context.service.test`, `chat.runtime.test`, `knowledge:audit`, and `predeploy:check`; predeploy now blocks stale shorter 3-6/4-sentence/7-12-sentence guidance from returning.
- Production reply budget env guard: pass via `deploy:doctor:test`, `deploy:doctor:self-test`, and `predeploy:check`; deploy doctor now fails values below 1200 output tokens or 320 roleplay reply characters.
- Deploy doctor reply-budget recommendation warning: pass via `deploy:doctor:test`; envs at 1200/320 now warn to move toward 1600/420 without failing the baseline gate.
- Deploy doctor roleplay reply-budget wording now passes Thai-first coverage via `deploy:doctor:test` and `predeploy:check`.
- Runtime env reply-budget guard: pass via `env.test`, `health.service.test`, and `predeploy:check`; production `/health` now reports reply-budget values below 1200/320 as invalid env.
- Deploy readiness reply-budget propagation: pass via `deploy:readiness:test`; invalid `/health` roleplay budget entries now become staging/production blockers and next-step fixes.
- Smoke doctor reply-budget recommendation warning: pass via `smoke:doctor:test`; environments at 1200/320 still pass baseline but emit a CLI warning to move toward 1600/420, while below-baseline values rely on readiness blockers instead of duplicate warnings.
- Deploy status reply-budget blocker output: pass via `deploy:status:test`; invalid `/health` roleplay budget entries are visible in JSON/text output and block readiness.
- Admin Health reply-budget recommendation UI: pass via `frontend:check`, `predeploy:check`, and `e2e:smoke:test`.
- Production readiness now blocks on both chat provider and image provider live verification flags.
- Smoke doctor now reports separate staging blockers and production blockers; `--strict-staging` rejects local backend/CORS before provider verification.
- CI workflow includes `memory:audit`, `knowledge:audit`, and `eval:local`.
- CI and Production Smoke workflows now run deploy readiness self-test/status output before strict gates.
- Predeploy check now verifies `RELEASE_HANDOFF.md` exists and remains linked from production docs.
- `release:handoff:check` is part of `qa:local` and checks release handoff sections plus secret-shaped values through an importable runner.
- `release:handoff:test` is part of `qa:local` and verifies filled-mode and secret detection behavior.
- Secret audits now share `scripts/secret-patterns.ts` and cover private key blocks, GitHub tokens, Google API keys, and Slack tokens in addition to project-specific keys.
- `secrets:check` now fails on tracked `.env`/`.env.*` files while still ignoring untracked local env files used for development.
- `secrets:check:test` now runs in `qa:local`, CI, and Production Smoke to guard tracked env-file rules, scan path rules, and the importable committed secret scanner runner.
- `.gitignore` now ignores real `.env.*` files while allowing example templates, and predeploy verifies that rule.
- `secrets:patterns:test` is part of `qa:local`, CI, and Production Smoke; it verifies repo scans allow documentation placeholders while memory/release handoff scans still reject sensitive values.
- `eval:local:test` now runs in `qa:local`, CI, and Production Smoke to guard local eval CLI pass/fail output formatting.
- Local eval CLI output now passes Thai-first coverage via `eval:local:test`.
- Predeploy now verifies the shared secret pattern source, its regression test, and the matching QA documentation remain present.
- Predeploy now verifies backend security audit keeps route error response and routeErrorResponse mapping guards wired.
- CI predeploy now runs `release:handoff:check`, `release:handoff:test`, and `secrets:patterns:test` as explicit gates.
- CI predeploy now runs `security:audit`, `api:audit`, and `route-menu:audit` as explicit static gates.
- API route audit now auto-discovers `apps/backend/index.ts` plus backend `*.routes.ts` files, covers `GET /`, and API smoke, local smoke, plus browser e2e smoke verify the root `maprang-backend` identity response; `api:audit:test` now locks discovery and root coverage.
- Security audit now scans `apps/backend/index.ts` plus backend source/prisma files.
- Security audit now fails if a backend `/admin` route block is missing `requireAdminApiKey`.
- Security audit now fails if a backend `/:id` route block is missing `rejectInvalidUuid`.
- Security audit now fails if a backend route returns raw literal or dynamic `{ error: ... }` objects without a Thai-first `message` or `routeErrorResponse` helper.
- Security audit now fails if a literal `routeErrorResponse('code')` call is missing an explicit `routeErrorMessages` entry.
- `security:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard the backend security audit rules and importable runner.
- Production Smoke workflow now runs predeploy and release handoff guards before deployed smoke validation.
- Production Smoke workflow now runs secrets, secret-pattern tests, memory, knowledge, eval, security, API, and route/menu audits before deployed smoke validation.
- Production Smoke workflow now runs deploy readiness/status and deploy env doctor regression/self-tests before deployed smoke validation.
- `staging:verify` and `production:check` now print `deploy:status` before strict smoke gates so failed deployed checks show blockers and next steps directly.
- Predeploy now verifies README/STAGING_RUNBOOK documentation stays aligned with deploy-status-first CLI gates.
- Relationship engine focused test passes for the expanded Thai ladder and preset surface split: 12 pass, 0 fail.
- Current delta gate passes: `backend:check`, `frontend:check`, and `knowledge:audit`.
- Full local QA was rerun after starting Docker/Postgres and local backend; persistence tests ran against the local DB instead of skipping.
- Relationship preset API smoke now verifies 24 full presets, 19 player contract presets, and 24 Creator Studio presets.

## Production Gate

Status: intentionally failing until real environment is ready

Known `production:check` blockers:
- Local backend URL.
- Local, missing, or non-https production CORS.
- Chat provider live smoke not marked verified.
- Image provider live smoke not marked verified.

Known `staging:verify` blockers in local mode:
- Local backend URL.
- Local, missing, or non-https staging CORS.

## Browser QA

Status: passing for Admin Health, Admin Evals, and Chat UI interaction

Checked:
- `/admin/health` renders.
- `/admin/prompt-inspector` renders and can call the admin prompt snapshot flow when an admin key is available.
- `/admin/evals` renders and can run the deterministic local eval flow when an admin key is available.
- สรุป blocker production is visible.
- Chat live smoke row is visible.
- `bun run production:check` guidance is visible.
- Refresh interaction works.
- `/chat` read mode toggles and shows the reading-mode notice.
- `/chat/:id` world state panel opens from the right rail, saves location/notes, and persists after reload.
- `/wallet` renders model cost breakdown and seven-day usage trend without console errors.
- `/admin/health` shows prompt budget/history settings without console errors.
- `/admin/health` deploy checklist shows a concrete next action on each blocker card.
- Console errors/warnings: none relevant.
