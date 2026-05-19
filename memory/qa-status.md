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
- API smoke: 31 pass, 0 fail, 1 skip for live chat in local mode.
- E2E smoke: 4 pass, 0 fail across desktop and mobile.
- Frontend build: pass.
- Bundle budget: pass.
- Secrets check: pass.
- Memory audit: pass.
- Knowledge audit: pass.
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
- Route/menu audit now covers 14 surfaces including `/admin/prompt-inspector` and `/admin/evals`.
- API smoke and E2E now cover chat world state save/read persistence.
- API smoke and Wallet UI now cover total cost, cost by model, seven-day usage trend, and remaining-request estimates.
- API smoke with `--require-admin` now passes 31 checks plus 1 local live-chat skip, including uncharged chat validation, non-mutating chat delete/report creation, admin wallet, and admin report PATCH/action validation.
- `api:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard route discovery, coverage-map regressions, and the importable route audit runner.
- `api:smoke:test` now runs in `qa:local`, CI, and Production Smoke to guard API smoke readiness/image helper regressions without calling a backend.
- `frontend:bundle:test` now runs in `qa:local`, CI, and Production Smoke to guard code-splitting, bundle budget regressions, and the importable bundle budget runner.
- `frontend:static:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard button accessibility, placeholder-copy regressions, and the importable static audit runner.
- `frontend:route:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard static link, navigate route regressions, and the importable route audit runner.
- `route-menu:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard Route/Menu Audit document, runtime row alignment, and the importable doc-check runner.
- `smoke:helpers:test` now runs in `qa:local`, CI, and Production Smoke to guard local/deployed smoke auth header behavior.
- `provider:smoke:guards:test` now runs in `qa:local`, CI, and Production Smoke to guard live chat/image smoke verification helpers.
- `smoke:doctor:test` now runs in `qa:local`, CI, and Production Smoke to guard smoke doctor blocker and strict-gate output.
- `smoke:ready:test` now runs in `qa:local`, CI, and Production Smoke to guard `/ready` summary output and the importable readiness smoke runner.
- `smoke:image:test` now runs in `qa:local`, CI, and Production Smoke to guard image smoke skip/fallback/live payload helpers without provider calls.
- `smoke:chat:test` now runs in `qa:local`, CI, and Production Smoke to guard live chat smoke validation and success payload helpers without provider calls.
- `deploy:status:test` now runs in `qa:local`, CI, and Production Smoke to guard deploy status JSON/text output and the importable deploy status runner.
- `deploy:doctor:test` now runs in `qa:local`, CI, and Production Smoke to guard deploy env parsing/JWT helpers plus the importable full doctor runner without reading real production env files.
- `vault:audit:test` now runs in `qa:local`, CI, and Production Smoke to guard shared memory/knowledge Markdown audit helpers plus importable memory and knowledge audit runners.
- `backend:check:db:test` now runs in `qa:local`, CI, and Production Smoke to guard DB-required backend check command planning and the importable DB check runner.
- `supabase:storage:test` now runs in `qa:local`, CI, and Production Smoke to guard signed-storage setup helpers without calling Supabase.
- `smoke:local:test` now runs in `qa:local`, CI, and Production Smoke to guard local smoke helper behavior without calling the backend.
- `e2e:smoke:test` now runs in `qa:local`, CI, and Production Smoke to guard browser smoke seed reset/restore command ordering without launching Playwright.
- Backend tests and health/API smoke now cover prompt budget config and history trimming behavior.
- Backend tests now cover chat provider failure classification for invalid credentials, quota exhaustion, rate limits, and timeouts.
- Live chat smoke scripts now fail on `usage.providerFailure` metadata instead of matching old fallback text.
- API smoke now covers `/chat/stream` SSE shape on an uncharged validation path.
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
- Predeploy now verifies the shared secret pattern source, its regression test, and the matching QA documentation remain present.
- CI predeploy now runs `release:handoff:check`, `release:handoff:test`, and `secrets:patterns:test` as explicit gates.
- CI predeploy now runs `security:audit`, `api:audit`, and `route-menu:audit` as explicit static gates.
- Security audit now fails if a backend `/admin` route block is missing `requireAdminApiKey`.
- Security audit now fails if a backend `/:id` route block is missing `rejectInvalidUuid`.
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
