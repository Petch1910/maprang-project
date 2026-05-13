# Working Context

Last updated: 2026-05-13

## Current Goal

Bring Maprang AI to a production-ready state before deploy. The local system should stay stable while production-only blockers are made explicit and impossible to miss.

## Current Local Status

Status: local QA ready

Verified:
- Backend tests pass: 109 pass, 0 fail.
- Frontend deploy check passes.
- Local API smoke passes: 22 pass, 0 fail, 1 live chat skip.
- Playwright e2e smoke passes on desktop and mobile: 4 pass, 0 fail.
- Admin Health page renders production blockers and has no browser console errors.
- Route/menu audit exists and is wired into QA.
- Security audit, route audit, deploy env doctor self-test, and predeploy check pass.
- Project memory and runtime knowledge audits are part of the local QA gate.
- Backend health/readiness now reports structured knowledge pack status.

## Current Production Status

Status: blocked by real environment and provider verification

Known blockers:
- Backend URL is still local in current smoke environment.
- Frontend backend URL is still local in current smoke environment.
- `CORS_ORIGINS` still includes local origins in current smoke environment.
- Chat provider needs stable live smoke verification before setting `CHAT_PROVIDER_LIVE_VERIFIED=1`.
- Image provider live smoke is blocked by provider billing hard limit. Keep `IMAGE_GENERATION_LIVE_VERIFIED=0`.
- Structured knowledge must remain valid through `bun run knowledge:audit` before deploy.

## Most Important Next Steps

1. Deploy staging backend and frontend.
2. Set real staging URLs and production-like CORS.
3. Run ordered live provider smoke against staging, preferably `api:smoke:live`.
4. Set verification flags only after live smoke passes.
5. Rerun `production:check`.
