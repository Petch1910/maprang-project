# Working Context

Last updated: 2026-05-19

## Current Goal

Bring Maprang AI to a production-ready state before deploy. The local system should stay stable while production-only blockers are made explicit and impossible to miss.

## Current Local Status

Status: local QA ready

Verified:
- Backend tests pass: 128 pass, 0 fail.
- Frontend deploy check passes.
- Local API smoke passes: 26 pass, 0 fail, 1 live chat skip.
- Playwright e2e smoke passes on desktop and mobile: 4 pass, 0 fail.
- Local Postgres is reachable through Docker and migrations are applied.
- Frontend UI pass added mobile Explore bottom nav and real Chat read-mode behavior.
- Backend Prompt Inspector now exposes an admin-only redacted prompt snapshot/diff endpoint for context debugging.
- Prompt Inspector now redacts secret-shaped values in retrieved lore keyword/alias/preview as well as final prompt and section content.
- Frontend Prompt Inspector page is available at `/admin/prompt-inspector` and is included in route/menu audit.
- Automated Evals are available through `/admin/evals` and `GET /admin/evals/local` using the same deterministic suite as `bun run eval:local`.
- Admin Health page renders production blockers and has no browser console errors.
- Admin Health deploy cards now show the next action for each blocker so staging setup can be followed directly from the UI.
- `staging:verify` is now the strict deployed-staging gate for real backend URL, CORS, signed storage, `/ready`, and admin smoke before provider verification.
- Route/menu audit exists and is wired into QA.
- Security audit, route audit, deploy env doctor self-test, and predeploy check pass.
- Project memory, runtime knowledge, and deterministic prompt/context evals are part of the local QA gate.
- Backend health/readiness now reports structured knowledge pack status.
- Chat provider failures are typed as `providerFailure`, returned with zero usage/cost, surfaced in Chat UI, and read directly by live smoke scripts.
- Relationship ladder now supports the expanded Thai seed set from hostile to committed routes: enemy, disliked, rival, bickering rival, acquaintance, friend, close friend, ride-or-die, crush, friend-crush, dating trial, talking stage, partner, toxic partner, lover, life partner, spouse, toxic spouse, and soulmate.
- Frontend relationship status labels are centralized so Explore, Chat, My Chats, Events, Relationship preview, and debug panels use the same Thai display names.
- Relationship presets now expose API surfaces: `contract` for Character Lobby relationship contracts and `creator` for Creator Studio tag presets. Character Lobby loads `contract` from the backend and falls back to local copy only if the API is unavailable. Backend tests and API smoke verify that contract excludes creator-only presets while Creator Studio keeps them available.
- Agent handoff docs are now available through `AGENTS.md` and canonical `agent.md`, and `predeploy:check` verifies the guide exists with required scope, continuation, minimum-check, commit/push, and operating sections.
- Deploy readiness logic is shared by `smoke:doctor` and `deploy:status`, and covered by `deploy:readiness:test`, so current staging/production blockers and next steps can be printed without duplicating blocker rules.
- `smoke:doctor` now prints the same ordered deploy next steps as `deploy:status`.
- `deploy:status --json` now exposes top-level staging/production ready flags and blocker counts for CI/dashboard automation.
- CI runs deploy readiness self-test, and the manual Production Smoke workflow prints `deploy:status` before strict production checks.
- Local `staging:verify` and `production:check` now print `deploy:status` before strict smoke gates, so failed staging/production runs include blocker details and next steps in the same CLI log.
- README and predeploy guard now document and enforce the same deploy-status-first behavior for CLI staging/production gates.
- `RELEASE_HANDOFF.md` is available as the no-secrets final release handoff template, and predeploy checks verify it stays documented.
- `release:handoff:check` verifies the release handoff template and can require all handoff fields with `--filled` before sharing a real release note.
- `release:handoff:test` covers filled handoff validation, blank-field detection, and secret-shaped value detection for the release handoff guard.
- Secret audits share `scripts/secret-patterns.ts` and catch private key blocks, GitHub tokens, Google API keys, and Slack tokens across repo, memory, knowledge, and release handoff checks.
- `secrets:check` now fails on tracked `.env` files while still ignoring untracked local `.env` files used for development.
- `secrets:patterns:test` now locks the split between strict repo secret scanning and stricter memory/release handoff scanning, and it runs inside `qa:local`, CI, and Production Smoke.
- `predeploy:check` verifies the shared secret pattern source, regression test, and QA documentation so secret-audit wiring cannot drift silently.
- CI predeploy now runs the release handoff check and self-test directly, not only through `qa:local`.
- CI predeploy now runs security, API route, and route/menu static audits directly before deploy checks.
- Security audit now also checks that every backend `/admin` route block contains `requireAdminApiKey`, catching missing admin guards before deploy.
- Security audit now also checks that backend `/:id` route blocks contain `rejectInvalidUuid` before resource access.
- Manual Production Smoke now runs predeploy and release handoff guards before validating deployed smoke secrets or spending provider credits.
- Manual Production Smoke also runs secrets, memory, knowledge, eval, security, API route, and route/menu audits before deployed smoke validation.

## Current Production Status

Status: blocked by real environment and provider verification

Known blockers:
- Backend URL is still local in current smoke environment.
- Frontend backend URL is still local in current smoke environment.
- `CORS_ORIGINS` still includes local origins in current smoke environment.
- Chat provider needs stable live smoke verification before setting `CHAT_PROVIDER_LIVE_VERIFIED=1`.
- Image provider live smoke is blocked by provider billing hard limit. Keep `IMAGE_GENERATION_LIVE_VERIFIED=0`.
- Structured knowledge must remain valid through `bun run knowledge:audit` before deploy.
- Prompt/context assembly must remain valid through `bun run eval:local` before deploy.

## Most Important Next Steps

1. Deploy staging backend and frontend.
2. Set real staging URLs and production-like CORS.
3. Run `staging:verify` against the deployed staging backend.
4. Run ordered live provider smoke against staging, preferably `api:smoke:live`.
5. Set verification flags only after live smoke passes.
6. Rerun `production:check`.
