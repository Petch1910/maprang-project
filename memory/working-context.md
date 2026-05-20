# Working Context

Last updated: 2026-05-20

## Current Goal

Bring Maprang AI to a production-ready state before deploy. The local system should stay stable while production-only blockers are made explicit and impossible to miss.

## Current Local Status

Status: static/unit/build QA ready; final local smoke needs Docker/Postgres and backend running

Verified:
- Latest full `qa:local` attempt reached final runtime smoke and then failed because Docker Desktop/Postgres plus backend `http://127.0.0.1:3000` were not running in this desktop session.
- Backend tests pass: 147 pass, 0 fail.
- Frontend deploy check passes.
- Local API smoke passes: 32 pass, 0 fail, 1 live chat skip.
- Playwright e2e smoke passes on desktop and mobile: 4 pass, 0 fail.
- Local Postgres is reachable through Docker and migrations are applied.
- Frontend UI pass added mobile Explore bottom nav and real Chat read-mode behavior.
- Frontend Thai localization pass now covers admin utility pages, prompt/usage labels, route/menu audit table headings, chat prompt budget, System Status model budget labels, and Character Lobby/Profile/Create helper copy.
- Route/menu audit runtime data and `ROUTE_MENU_AUDIT.md` now use Thai-first surface names and control descriptions while keeping the Route/Menu Audit marker for automated docs checks.
- Route/menu staging row now describes staging as a checklist rather than a fake in-app button, and frontend static audit blocks the old ambiguous copy from returning.
- Route/menu doc check now fails directly on stale mixed-language audit copy such as `รัน eval`, `prompt-control`, `token budget`, `accordion`, or ` disabled `, instead of relying only on predeploy.
- Route/menu document check diagnostics now use Thai-first output for missing navigation, missing audit/preload rows, weak status labels, stale mixed-language copy, and pass/fail summaries.
- Frontend static audit now guards a focused set of English UI label regressions for Thai-first pages, including Admin Health, Prompt Inspector, Automated Evals, Relationship Contract, Chat budget, Supabase/Auth labels, and route/menu surface names.
- Frontend static audit diagnostics now report Thai-first failure messages for button accessibility, placeholder controls, raw error exposure, ApiError fallback, mixed UI copy, mojibake, and stale Vite starter files.
- Frontend route audit and bundle budget CLI output now report Thai-first pass/fail guidance while keeping exact file, route, and chunk names for debugging.
- Predeploy, API smoke, bundle budget, audit, eval, memory, knowledge, release handoff, route/menu, and deploy doctor self-test CLI summaries now use Thai-first pass/fail prefixes instead of `ok -` or `fail -`, with focused regression tests on the changed runners.
- Predeploy now verifies the Relationship Contract Thai-first regression guard remains wired into the frontend static audit source and tests.
- Frontend Thai polish now removes mixed English debug wording such as prompt-control, token budget, relationship state, scene state, system relationship, anchor, hook, fallback, disabled, and eval from user-facing admin/chat surfaces plus route/menu docs; static audit and predeploy guard those phrases from returning.
- Frontend Redux fallback errors for failed character/chat loading are now Thai-first, and the static audit blocks the old `Could not load...` copy from returning.
- Frontend auth and Redux load failures no longer surface raw provider/browser English error messages directly; they now map to Thai-first user-facing notes, and frontend static/predeploy guards block the old raw-error patterns from returning.
- Frontend API fallback errors now use Thai-first `ApiError` messages when a backend response has no JSON error string, and the static audit blocks stale `failed with status` wording from returning.
- Frontend `ApiError` now prefers backend `message` fields before machine-readable `error` codes, falls back to Thai-first retry copy when `message` is missing, and keeps raw backend codes in `payload` only; `frontend:api:test` plus the static audit block raw `payload.error` display regressions.
- Backend chat validation/access/token/rating/empty-provider fallback replies now use centralized Thai-first copy, and short-reply continuation skips those operational replies instead of trying to extend them as roleplay.
- Backend rate-limit responses now keep the machine-readable `rate_limited` code while returning a Thai-first user message.
- Backend avatar storage failures now return Thai-first messages for Supabase configuration, upload, signed URL, and route-level storage-unavailable cases.
- Backend avatar upload validation now returns Thai-first messages for missing files, unsupported file types, oversized files, and avatar-not-found responses.
- Backend invalid UUID route guard now returns Thai-first messages for character, chat, lore, report, user, and parent-lore ids while keeping machine-readable error codes.
- Backend chat route persistence and not-found errors now return Thai-first `message` fields while preserving machine-readable `database_not_configured` and `chat_not_found` codes for frontend handling.
- Backend character route persistence, unauthorized, create-failed, not-found, and forbidden errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend lore route persistence, not-found, forbidden, and create-failed errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend report route validation, access, persistence, not-found, and admin-action errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend admin summary/token/audit/eval/prompt-inspector routes now return Thai-first `message` fields for access, persistence, unavailable, and token-adjustment errors while preserving machine-readable codes.
- Backend user usage/content-settings/persona routes now share centralized Thai-first `message` fields for persistence and user-not-found errors.
- Backend route error fallback now returns a generic Thai retry message for unmapped codes instead of mislabeling non-ID failures as invalid IDs; explicit ID guards still use `invalid_id`.
- Backend production auth failures now return Thai-first 401 messages for missing login and invalid/expired Supabase tokens.
- Frontend content rating labels shown in Explore/Character Lobby are now Thai-first, and the static audit blocks stale `Teen romance`, `Mature 18+`, and `Restricted 18+` labels from returning.
- Chat selection accessibility labels in the sidebar and My Chats are now Thai-first, and the static audit blocks stale `Select chat` labels from returning.
- Admin summary top-character rows now show Thai-first character status labels and Thai dashboard/lore wording instead of raw enum/mixed labels.
- Chat role panel now shows Thai-first character publication and visibility labels instead of raw `DRAFT`/`PRIVATE` enum values.
- Character publication and visibility labels are now centralized in `characterLabels.ts` so Admin Summary, Chat role panel, Character List, and Character Manager share the same Thai display names.
- Creator Studio and chat/admin status copy now avoid mixed English operational wording such as `image provider`, `production`, `backend`, `Lobby`, and raw `prompt` in user-facing Thai copy, with frontend static/predeploy guards for those stale phrases.
- Admin Health copy now maps visible operational wording to Thai-first terms for backend/frontend/provider/environment/checklist/final-gate guidance while preserving exact env names and commands.
- Admin Health live chat/image guidance now avoids raw `usage.providerFailure`, `billing/quota limit`, `local/dev`, and reversed `production/staging` wording in visible helper copy, with frontend static audit coverage.
- Backend Creator Draft image status and warning messages now return Thai-first user-facing copy for missing/configured/failed image provider paths while preserving actionable smoke/env guidance.
- Backend relationship tag validation messages now return Thai-first creator warnings for adult-mode conflicts, no-romance/romance conflicts, progression-speed conflicts, safety-tone conflicts, and too-many-engine-tag guidance.
- Backend character quality review notes now return Thai-first creator guidance for missing name/tagline/description/biography/scenario/system prompt/compact prompt/greeting/tags.
- Backend runtime env validation, health readiness failures, security posture details, deploy readiness blockers, deploy status output, and smoke doctor blocker output now use Thai-first copy while preserving exact env names, commands, and provider names.
- Deploy env doctor image-key diagnostics now use Thai-first wording for missing, valid, short, misrouted OpenRouter, and unknown provider key shapes while preserving exact env names.
- Runtime env validation and deploy env doctor now describe placeholder database credentials as leftover example values instead of mixed English `placeholder credentials` wording.
- Deploy readiness and backend readiness failures now use Thai-first provider labels for live chat verification, live image verification, and missing image-generation setup.
- Deploy readiness next-step fixes now avoid mixed `backend host secrets`, `placeholder value`, and `backend production environment` wording while preserving exact env names.
- Staging/production docs now describe live chat/image provider blockers with Thai-first billing, quota, providerFailure, and placeholder guidance while preserving exact commands and verification flags.
- README, Deployment QA, Production Setup, and deploy blockers now use Thai-first live provider handoff wording for smoke wallet checks, `usage.providerFailure`, image billing/quota, and DB example-value rejection while preserving exact env names and commands.
- Smoke doctor, deploy status, and readiness smoke failure guidance now use Thai-first local/staging/deploy fix wording while preserving exact commands, env names, and service identifiers.
- Deploy readiness health rows now use Thai-first ready/default/unknown labels such as `พร้อม`, `ยังไม่พร้อม`, `ไม่ทราบ`, and `ค่าเริ่มต้น` while preserving exact row keys for CLI/dashboard parsing.
- Deploy blocker handoff memory now uses Thai-first headings, status, current-issue, required-action, and not-blocker wording while preserving exact env names, commands, and provider flags.
- Memory inbox and production checklist now use Thai-first handoff wording while preserving exact smoke/deploy commands, env names, and production-data safety warnings.
- Memory and knowledge README entry points now use Thai-first safety, update, layer, and runtime usage wording, with vault audits and predeploy guarding the Thai snippets.
- Project map, UI/UX direction, and API/backend direction handoff docs now use Thai-first guidance while preserving route names, commands, and technical identifiers.
- Knowledge wiki core pages now use Thai-first product, creator, relationship, and production deploy guidance while preserving structured knowledge paths and gate command names.
- Raw knowledge inbox and decision index now use Thai-first entry-point wording while preserving decision links and safety boundaries.
- Deploy status and smoke doctor text output now use Thai-first headers, no-blocker labels, fix sections, gate guidance, and next-step labels while keeping JSON/readiness keys stable.
- Decision records 0001-0005 now use Thai-first rationale and implementation notes for SocratiCode, memory vault, live provider verification, adult-mode warnings, and memory audit setup.
- Decision records 0006-0010 now use Thai-first rationale for runtime knowledge, deterministic evals, staged observability, Prompt Inspector, and Admin Automated Evals.
- Decision records 0011-0014 now use Thai-first rationale for world state, usage/cost intelligence, prompt budgeting, and provider failure classification.
- Smoke doctor now warns about missing image-generation configuration with Thai-first Creator Studio placeholder guidance.
- Smoke doctor roleplay reply-budget recommendation warnings now use Thai-first wording while preserving exact budget values and env names.
- Live chat smoke, image smoke, provider smoke guard hints, and API smoke image issue text now use Thai-first failure/fix wording while preserving exact verification flags, env names, commands, and provider terms.
- Live image/API smoke helper messages now avoid mixed English fix copy for missing image providers, billing, quota, invalid image keys, placeholder fallback, missing image URLs, and local SVG placeholders while preserving exact env names and commands.
- Local smoke helper failures for backend health, avatar upload shape/access, missing seed character, and relationship preview now use Thai-first CLI output, with `smoke:local:test` guarding the messages.
- Backend DB-required check CLI now uses Thai-first failure/local/deploy guidance, with regression coverage in `backend:check:db:test`.
- Backend DB test gate skip/forced-failure guidance now uses Thai-first output for optional persistence suites, with focused regression coverage in `db.test-gate.test.ts`.
- Prompt tooling UI copy now uses Thai-first labels for system prompt reset, redacted prompt snapshots, runtime/persona inputs, section budget, and route/menu audit descriptions.
- Profile content settings, tag conflict helper warnings, Prompt Inspector helper labels, and route/menu staging rows now avoid mixed `backend`, `prompt`, `runtime`, `persona`, and staging/deploy wording in user-facing Thai copy; frontend static audit and predeploy guard those stale phrases.
- Predeploy now has its own regression test and is wired into local QA, CI, and Production Smoke so critical predeploy/e2e wording guards cannot drift silently.
- Browser smoke assertions now use Thai-first admin UI labels for Admin Health, Prompt Inspector, and Automated Evals, and the frontend static audit also blocks English admin checklist labels from returning.
- Backend Prompt Inspector now exposes an admin-only redacted prompt snapshot/diff endpoint for context debugging.
- Prompt Inspector now redacts secret-shaped values in retrieved lore keyword/alias/preview as well as final prompt and section content.
- Prompt Inspector warning messages returned to the admin UI are now Thai-first for redaction, oversized prompt, missing policy/runtime sections, and prompt-injection review hints.
- Frontend Prompt Inspector page is available at `/admin/prompt-inspector` and is included in route/menu audit.
- Automated Evals are available through `/admin/evals` and `GET /admin/evals/local` using the same deterministic suite as `bun run eval:local`.
- Admin Health page renders production blockers and has no browser console errors.
- Admin Health deploy cards now show the next action for each blocker so staging setup can be followed directly from the UI.
- `staging:verify` is now the strict deployed-staging gate for real backend URL, CORS, signed storage, `/ready`, and admin smoke before provider verification.
- Route/menu audit exists and is wired into QA.
- Security audit, route audit, deploy env doctor self-test, and predeploy check pass.
- Project memory, runtime knowledge, and deterministic prompt/context evals are part of the local QA gate.
- Memory and knowledge vault audits now use Thai-first diagnostics for missing required files/snippets, secret-shaped content, local link escapes/breaks, structured knowledge errors, and pass/fail summaries.
- Backend health/readiness now reports structured knowledge pack status.
- Chat provider failures are typed as `providerFailure`, returned with zero usage/cost, surfaced in Chat UI, and read directly by live smoke scripts.
- Roleplay reply depth defaults now favor longer Thai roleplay turns: `MODEL_MAX_OUTPUT_TOKENS=1600`, `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`, stronger default system prompt guidance, and a larger continuation budget when the first reply is too short.
- Runtime prompt assembly and the structured chat style guide now match the same longer roleplay target: 4-6 short paragraphs, at least 5 complete sentences, and usually 8-14 sentences unless the player asks for brevity.
- Deploy env doctor now fails production/staging envs with roleplay reply budget below the production baseline `MODEL_MAX_OUTPUT_TOKENS=1200` or `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`.
- Runtime production env validation now applies the same reply-budget baseline, so `/health`, `deploy:status`, and `production:check` surface thin-reply model settings even if `deploy:doctor` was not run first.
- Deploy readiness regression coverage now proves `/health` invalid env entries for thin roleplay reply budgets become staging and production blockers with concrete next-step output.
- Deploy env doctor now warns when production env uses the baseline 1200/320 roleplay reply budget instead of the richer recommended 1600/420, while still failing values below baseline.
- Deploy env doctor roleplay reply budget failures and recommendations now use Thai-first output, with predeploy guarding the Thai wording.
- `smoke:doctor` now warns only when roleplay reply budget passes the 1200/320 production baseline but remains below the richer 1600/420 recommendation, leaving below-baseline values to the readiness blocker output.
- `deploy:status` regression coverage now verifies invalid roleplay reply budget env from `/health` appears in both JSON and text readiness output and blocks staging/production readiness.
- Admin Health now distinguishes the minimum reply-budget baseline from the recommended richer roleplay target, so environments at 1200/320 still get a next action to move toward 1600/420.
- Relationship ladder now supports the expanded Thai seed set from hostile to committed routes: enemy, disliked, rival, bickering rival, acquaintance, friend, close friend, ride-or-die, crush, friend-crush, dating trial, talking stage, partner, toxic partner, lover, life partner, spouse, toxic spouse, and soulmate.
- Frontend relationship status labels are centralized so Explore, Chat, My Chats, Events, Relationship preview, and debug panels use the same Thai display names.
- Frontend Redux slice selectors now import shared store types from `store/types.ts` instead of importing `store.ts`, removing the six frontend circular dependency chains that SocratiCode reported for store -> slice -> store.
- Backend character relationship types now live in `character.types.ts`, and avatar upload root resolution no longer trips the static import graph; SocratiCode reports no circular dependencies.
- Import-cycle architecture audit is now repo-owned through `bun run import-cycle:audit` and `bun run import-cycle:audit:test`, wired into local QA, CI, Production Smoke, and predeploy guard checks; it now catches static imports, re-exports, dynamic imports, TypeScript import-equals `require()`, and CommonJS `require()` calls, with predeploy guarding the audit logic, regression test, and deployment QA docs.
- Relationship presets now expose API surfaces: `contract` for Character Lobby relationship contracts and `creator` for Creator Studio tag presets. Character Lobby loads `contract` from the backend and falls back to local copy only if the API is unavailable. Backend tests and API smoke verify that contract excludes creator-only presets while Creator Studio keeps them available.
- Agent handoff docs are now available through `AGENTS.md` and canonical `agent.md`, and `predeploy:check` verifies the guide exists with required scope, continuation, minimum-check, commit/push, and operating sections.
- Deploy readiness logic is shared by `smoke:doctor` and `deploy:status`, and covered by `deploy:readiness:test`, so current staging/production blockers and next steps can be printed without duplicating blocker rules.
- `smoke:doctor` now validates backend root identity before `/health`, and its importable runner can be tested without calling a live backend.
- Deploy readiness blocks CORS that is empty, local, or non-https; staging and production must use the real HTTPS frontend domain.
- Render deploy documentation now uses HTTPS-only frontend/backend placeholders and predeploy verifies the Render CORS warning cannot drift back to localhost/http/wildcard examples.
- Staging and production setup docs now use the same local/non-https CORS language that deploy readiness enforces.
- Canonical agent guide production blockers now require deployed HTTPS backend and frontend CORS origins, and predeploy checks the wording.
- `smoke:doctor` now prints the same ordered deploy next steps as `deploy:status`.
- `deploy:status --json` now exposes top-level staging/production ready flags and blocker counts for CI/dashboard automation.
- CI runs deploy readiness self-test, and the manual Production Smoke workflow prints `deploy:status` before strict production checks.
- Local `staging:verify` and `production:check` now print `deploy:status` before strict smoke gates, so failed staging/production runs include blocker details and next steps in the same CLI log.
- README and predeploy guard now document and enforce the same deploy-status-first behavior for CLI staging/production gates.
- `RELEASE_HANDOFF.md` is available as the no-secrets final release handoff template, and predeploy checks verify it stays documented.
- `release:handoff:check` verifies the release handoff template and can require all handoff fields with `--filled` before sharing a real release note.
- `release:handoff:test` covers filled handoff validation, blank-field detection, secret-shaped value detection, and the importable release handoff runner.
- Secret audits share `scripts/secret-patterns.ts` and catch private key blocks, GitHub tokens, Google API keys, and Slack tokens across repo, memory, knowledge, and release handoff checks.
- Secret scan and release handoff checks now use Thai-first diagnostics for tracked env files, detected secret-shaped values, missing handoff sections, blank filled-mode fields, and pass/fail summaries.
- `secrets:check` now fails on tracked `.env`/`.env.*` files while still ignoring untracked local env files used for development, and exports an importable runner for CI/dashboard reuse.
- `.gitignore` ignores real `.env.*` files while allowing `.env.example` and `.env.production.example` templates; predeploy verifies this rule.
- `secrets:patterns:test` now locks the split between strict repo secret scanning and stricter memory/release handoff scanning, and it runs inside `qa:local`, CI, and Production Smoke.
- `predeploy:check` verifies the shared secret pattern source, regression test, and QA documentation so secret-audit wiring cannot drift silently.
- `predeploy:check` verifies backend security audit keeps the route error response and routeErrorResponse mapping guards wired.
- CI predeploy now runs the release handoff check, self-test, and secret pattern regression test directly, not only through `qa:local`.
- CI predeploy now runs security, API route, and route/menu static audits directly before deploy checks.
- API route audit now auto-discovers `apps/backend/index.ts` plus backend `*.routes.ts` files and covers `GET /`, while API smoke, local smoke, and browser e2e smoke verify the backend root identity response before deeper checks, so new route files and the backend root endpoint cannot drift outside the coverage map; route audit regression tests lock this behavior.
- API route audit Creator AI draft coverage note now uses Thai-first image live-smoke wording for real provider readiness.
- API route audit CLI output now reports discovered route counts, missing coverage, stale coverage, weak coverage, and pass status in Thai-first wording.
- Security audit now scans the backend entrypoint as well as backend source/prisma files, so route/security logic added to `apps/backend/index.ts` is covered before deploy.
- Security audit now also checks that every backend `/admin` route block contains `requireAdminApiKey`, catching missing admin guards before deploy.
- Security audit now also checks that backend `/:id` route blocks contain `rejectInvalidUuid` before resource access.
- Security audit now also blocks backend route files from returning raw error objects, including literal or dynamic `{ error: ... }` responses, without a Thai-first `message` or `routeErrorResponse` helper.
- Security audit now verifies every literal `routeErrorResponse('code')` call is backed by an explicit `routeErrorMessages` entry, preventing new codes from falling back to a generic invalid-id message.
- Backend security audit and import-cycle audit CLI output now use Thai-first pass/fail guidance while preserving exact helper, route, file, and graph names for debugging.
- Security audit regression tests now cover unsafe raw SQL helpers, tagged raw SQL allowance, missing admin guards, missing UUID guards, and the importable backend security audit runner, and run in local QA, CI, and Production Smoke.
- Manual Production Smoke now runs predeploy and release handoff guards before validating deployed smoke secrets or spending provider credits.
- Manual Production Smoke also runs secrets, secret pattern tests, memory, knowledge, eval, security, API route, and route/menu audits before deployed smoke validation.
- Manual Production Smoke now also runs deploy readiness, deploy status, and deploy env doctor regression/self-tests before validating deployed smoke secrets or spending provider credits.
- API smoke with admin auth now covers non-mutating admin report PATCH/action validation so moderation admin routes are exercised without resolving or hiding real production records.
- API smoke with admin auth now covers non-mutating wallet token route validation so the admin wallet route is exercised without changing balances.
- API smoke now covers non-mutating report creation validation with SQL-like character ids before persistence.
- API smoke now covers the uncharged `POST /chat` validation path before the live-provider-only chat smoke.
- API smoke validation-path provider-failure errors now use Thai-first diagnostics for both normal chat and stream validation checks.
- API smoke now covers non-mutating delete-chat validation so the delete route is exercised without removing real chats.
- API smoke invalid-id checks now require Thai-first `message` fields as well as machine-readable error codes for chat delete, report creation, admin wallet, and admin report validation paths.
- API route audit regression tests now cover route discovery, missing/stale/empty coverage entries, and the importable route audit runner, and run in local QA, CI, and Production Smoke.
- Frontend bundle budget regression tests now cover main/chat chunk detection, split-route missing failures, oversized chunk reporting, human-readable KB formatting, and the importable bundle budget runner.
- Frontend static audit regression tests now cover button type/accessible-name rules plus placeholder links, empty handlers, not-implemented errors, line-number reporting, and the importable static audit runner.
- Frontend static audit now has explicit regression coverage for Thai coming-soon placeholder copy, replacement characters, C1 control characters, and common Thai UTF-8 mojibake sequences before they can reach frontend source.
- Admin Health/System Status UI copy now removes leftover English operational labels such as Knowledge pack, Production gates, Local readiness, and staging/future gate, with frontend static audit coverage guarding those Thai-first labels.
- Frontend route audit regression tests now cover declared React Router paths, dynamic route matching, static link normalization, missing route detection for `to`, `href`, and `navigate`, and the importable route audit runner.
- Route/menu doc-check regression tests now cover Markdown table parsing, route/menu/app/preload alignment, missing navigation coverage, empty field detection, status label guards, and the importable route/menu doc-check runner.
- Smoke helper regression tests now cover local target defaults, deployed target auth behavior, explicit smoke user/token/admin headers, and JSON payload formatting.
- Smoke helper regression tests now also centralize backend root identity validation used by API smoke and local smoke.
- Provider smoke guard regression tests now cover live chat minimum token thresholds, provider failure messaging, live image opt-in detection, and image provider failure hints before any verification flag can be set.
- Deploy status now validates backend root identity before `/health`, and regression tests cover JSON readiness counts, text blocker output, health failure reporting, root preflight, and the importable deploy status runner without calling a live backend.
- Deploy status helpers no longer default the root identity to `maprang-backend` unless the runner/test supplies an actual root preflight result, so helper-only output cannot imply the backend root was verified.
- Readiness smoke now validates backend root identity before `/ready`; regression tests cover the root preflight, `/ready` summary output, failure visibility, readiness status fallback, and the importable readiness smoke runner without calling a live backend.
- Shared smoke helper failures for backend root identity, backend reachability, non-OK responses, and non-JSON responses now use Thai-first diagnostics across local/API/live smoke scripts.
- Shared smoke helper fetch failures now translate common connection refused/timeout reasons to Thai-first diagnostics before smoke doctor/local/API smoke output.
- Memory/knowledge vault audits now share Markdown link/include helpers, and both memory and knowledge audits export importable runners covered by regression tests for required snippets, local link collection, vault-boundary checks, full memory audit output, and full knowledge audit output.
- Backend DB check planning is covered by `backend:check:db:test`, ensuring DB availability is checked before backend tests run with `REQUIRE_DB_TESTS=true`, and the DB check command plan has an importable runner for CI/dashboard reuse.
- Supabase signed-storage setup now exports testable helpers and an importable setup runner for env loading, config validation, bucket privacy checks, smoke object upload/sign/cleanup flow, signed URL normalization, and object path encoding; `supabase:storage:test` covers them with fake operations without hitting Supabase.
- Supabase signed-storage setup failures now use Thai-first guidance for missing env, signed-access requirements, bucket privacy, signed URL, upload, fetch, and cleanup errors.
- Local smoke now exports testable helpers and an importable smoke runner for smoke character selection, avatar upload validation, cleanup, and QA summary formatting; `smoke:local:test` covers them without hitting the backend.
- Browser e2e smoke now exports a testable command plan, and `e2e:smoke:test` guards seed reset, Playwright execution, and seed restore ordering without launching the browser.
- E2E smoke command labels and failure text now use Thai-first wording while preserving the QA seed and Playwright identifiers.
- Secret scanning now exports path-rule helpers, and `secrets:check:test` guards tracked `.env` rejection plus source/docs/config scan selection.
- Local eval CLI now exports output formatting helpers, and `eval:local:test` guards pass/fail summary output without rerunning the deterministic prompt suite.
- Local eval CLI pass/fail summaries and prompt token estimates now use Thai-first output while preserving scenario ids for debugging.
- Smoke doctor now exports a report builder, and `smoke:doctor:test` guards staging blocker next steps, strict staging failure, and backend health failure output without calling a live backend.
- Image smoke now exports fallback/live payload helpers and an importable smoke runner, and `smoke:image:test` guards skipped live-image output plus placeholder/no-URL/SVG failure handling without spending provider credits.
- Live chat smoke now exports validation/payload helpers and an importable smoke runner, and `smoke:chat:test` guards provider-failure precedence, token threshold checks, wallet debit matching, and success payload formatting without spending provider credits.
- Deploy env doctor now keeps core parsing/env/JWT helpers import-safe, exports a callable `runDeployEnvDoctor` runner for dashboard/admin reuse, and `deploy:doctor:test` guards both helpers and full-run output without reading real production env files.
- Deploy env doctor self-test now exports `runDeployEnvDoctorSelfTest`, keeping the file import-safe while preserving the CLI self-test used by `qa:local` and Production Smoke.
- Smoke doctor success output and deploy env doctor self-test diagnostics now use Thai-first pass/fail wording while preserving exact command and env names.
- API smoke now reuses the shared live chat/image provider helpers so live chat provider failures are reported before empty-reply checks and image failure hints stay aligned across smoke scripts.
- Live chat and live image smoke now validate backend root identity before health/provider checks, preventing provider credits from being spent against the wrong deployed target.
- API smoke readiness/image helper logic now lives in `scripts/api-smoke-helpers.ts`, and the main smoke flow exports importable `runApiSmoke` plus `buildApiSmokeSummary` helpers so CI/dashboard code can import and summarize smoke output without executing network checks; `api:smoke:test` guards live-verification-only readiness, image provider hints, safe JSON parsing, summary counts, and runner import safety without hitting a backend.
- API smoke endpoint assertion diagnostics now use Thai-first wording for health/readiness, wallet usage, persona, relationship presets, character/lore CRUD, chat/menu/world-state validation, admin checks, SSE parsing, and expected-error validation while preserving exact endpoint names and machine-readable codes.
- API smoke result rows now format statuses as Thai labels (`ผ่าน`, `เตือน`, `ไม่ผ่าน`, `ข้าม`) instead of `PASS/WARN/FAIL/SKIP`, with `api:smoke:test` guarding the mapping.
- Production checklist memory now includes deploy doctor/status review, live API smoke, and production-data safety guidance, and predeploy guards those handoff notes from drifting.
- Production deploy knowledge wiki now documents reply-budget baselines/recommendations and the deploy-status-first staging gate order.

## Current Production Status

Status: blocked by real environment and provider verification

Known blockers:
- Backend URL is still local in current smoke environment.
- Frontend backend URL is still local in current smoke environment.
- `CORS_ORIGINS` is still local/non-production in current smoke environment.
- Chat provider needs stable live smoke verification before setting `CHAT_PROVIDER_LIVE_VERIFIED=1`.
- Image provider live smoke is blocked by provider billing hard limit. Keep `IMAGE_GENERATION_LIVE_VERIFIED=0`.
- Structured knowledge must remain valid through `bun run knowledge:audit` before deploy.
- Prompt/context assembly must remain valid through `bun run eval:local` before deploy.

## Most Important Next Steps

1. Deploy staging backend and frontend.
2. Set real staging URLs and HTTPS-only production-like CORS.
3. Run `staging:verify` against the deployed staging backend.
4. Run ordered live provider smoke against staging, preferably `api:smoke:live`.
5. Set verification flags only after live smoke passes.
6. Rerun `production:check`.
