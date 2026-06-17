# AI Creator Flow Gap Plan

Last updated: 2026-06-17

This is the active task checklist for closing AI Creator gaps. The system contract lives in `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`.

## Current Decision

Do not wait for more MissAI cloning. AI Creator core local contracts are now Maprang-owned. Keep hardening the repo-owned flow before treating external production as ready:

- Upload preview/validation.
- Generate blocked states for credit, level, provider, input, content, and duplicate-job cases.
- My Library detail/actions.
- Public Gallery detail/actions/reuse is implemented locally through sanitized backend data. Further work is hardening, policy copy, and production moderation runbook.

Payment/top-up remains out of scope until provider, policy, and payment flow are ready.

## Done

- First-pass `/ai-creator` route orchestration cleanup: remote backend My Library loading and Public Gallery loading now live in `useAiCreatorRemoteGalleries`, while Public Gallery DTO mapping remains in `apps/frontend/src/lib/aiCreator.ts`.
- Remaining blocked-state/upload-slot hardening tests: priority ordering now proves running/content/provider/credit/input blockers stop before debit-capable work, and aggregate upload slot validation returns stable first-failure slots.
- Production moderation runbook/policy copy for Public Gallery generation outputs, including `HIDE_GENERATION_OUTPUT` admin workflow and local/production gates.
- Browser hardening review: no new browser wait/edit smoke was added because the current repo-owned paths are already covered by helper/backend tests plus existing `/ai-creator` e2e for render, blocked states, invalid uploads, backend-backed My Library, signed storage owner path, cover publish/render, Public Gallery publish, and Public Gallery reuse.
- Retry failed generation job route/helper/UI/test coverage.
- Owner-safe cancel generation job route/helper/test coverage.
- Owner-safe backend reference routes/helpers for using a generated image as character image or cover without exposing `storageKey`.
- My Library owner detail for local and backend-backed items.
- Favorite/unfavorite for owner outputs.
- Delete for local and backend-backed outputs.
- Download route/helper/action for direct/public/signed URL resolution.
- Signed URL expiry/refresh UI state through owner-scoped download endpoint.
- Signed-storage owner-path browser smoke with local-safe signed fixture and no `storageKey` DOM/API exposure.
- Use-as-character-image and use-as-cover draft bridge to Creator Studio, wired through backend owner-safe reference endpoints for backend-backed outputs with a dev-only local-safe preview fallback when the reference endpoint returns 404.
- Persisted character cover field through `Character.coverUrl`.
- Creator Studio cover publish/render browser smoke from AI Creator My Library output.
- Template-aware upload validation helpers for image and video slot rules.
- Backend preflight parity for optional upload metadata.
- Public Gallery opt-in publish/unpublish backend route, frontend action, and visibility state.
- Public Gallery sanitized list/detail backend routes and frontend gallery panel.
- Public Gallery detail mode hides owner-only actions and shows a sanitized public-output notice.
- Public Gallery generation-output report path connected to moderation/admin action flow.
- Public Gallery reuse flow with browser smoke coverage.
- Browser smoke for `/ai-creator` render, blocked states, invalid uploads, backend-backed My Library detail, signed storage owner path, backend-reference/local-safe use-as-cover draft bridge, cover publish/render, Public Gallery publish, sanitized Public Gallery detail action visibility, and Public Gallery reuse.
- Backend persistence owner guard coverage for generation retry, favorite/unfavorite, delete, direct download, signed download, and signed creator-reference handoff. Other-owner paths return null/false and never invoke signed-storage resolvers.
- Video and Advanced Video are explicit contract states until a real provider exists. The video tab keeps Generate disabled with a visible provider-contract notice, and browser smoke verifies the notice instead of allowing a local fake video render to look production-ready.

## Remaining Gaps

### 1. Signed-Storage Timed Expiry Browser Hardening

Status: owner path done locally on 2026-06-17. Timed expiry remains covered by helper/UI state tests, not by a browser wait test.

Goal: the owner-path browser smoke already proves a backend-backed output with storage object metadata can resolve signed URLs safely. This remaining item is only for deterministic browser-level expiry/refresh timing if the product needs it.

Tasks:

1. Seed or fixture one owner-owned output with `storageKey`.
2. Stub or use storage resolver so the returned URL behaves like signed storage.
3. Open My Library detail.
4. Verify UI shows signed-active state.
5. Click download/refresh.
6. Verify signed-active state is shown.
7. Verify UI never shows `storageKey`.
8. Keep timed expiry as helper-level coverage unless a deterministic browser clock test is added.

Acceptance:

- Owner can resolve a signed URL through the download route.
- Another owner cannot resolve the URL. Backend owner guard coverage exists in persistence tests for direct download, signed download, and signed creator-reference handoff.
- `storageKey` is absent from API payload and DOM.
- `bun run e2e:smoke` covers the fixture-backed owner flow.

### 2. Creator Studio Cover Publish/Edit/Render Smoke

Status: publish/render path done locally on 2026-06-17. Edit reopen remains future if/when a dedicated edit route is productized.

Goal: prove use-as-cover is not only a local draft state, but survives character save/publish/edit and renders on product surfaces.

Tasks:

1. Send My Library output to Creator Studio as cover draft.
2. Save or publish character with `coverUrl`.
3. Submit the character.
4. Verify backend detail returns `coverUrl`.
5. Verify Character Lobby uses the persisted cover backdrop.
6. Keep edit reopen, Explore card, and Chat backdrop as follow-up smoke targets when public/edit status is productized.

Acceptance:

- `coverUrl` is submitted through frontend API.
- Backend returns `coverUrl` in public character DTO.
- Character Lobby prefers cover where designed.
- Smoke proves the flow without manual URL copy.

### 3. Public Gallery Opt-In Publish

Status: done locally on 2026-06-17.

Goal: keep Public Gallery as a real opt-in public surface backed by sanitized backend DTOs, reports, and moderation. Do not regress to fake data or disabled-only placeholder behavior.

Tasks:

1. Add owner-only publish action for generation outputs.
2. Add owner-only unpublish action.
3. Store public visibility state separately from private owner library state.
4. Add public list route with sanitized output DTO.
5. Add public detail route with sanitized output DTO.
6. Add frontend gallery list/detail UI.
7. Keep empty state when no public outputs exist.

Acceptance:

- Outputs are private by default.
- Public output appears only after explicit publish.
- Unpublish removes it from public routes.
- Public DTO never includes private prompt, source file, provider payload, or `storageKey`.

### 4. Public Gallery Report And Moderation

Status: done locally on 2026-06-17 for generation-output reports and moderation queue visibility.

Goal: public content can be reported and moderated before Maprang opens community reuse.

Tasks:

1. Add public output report route.
2. Connect report action to existing moderation queue model or add dedicated generation report model.
3. Add admin moderation row for generation output reports.
4. Add admin action audit log.
5. Add UI disabled reason when reporting is unavailable.

Acceptance:

- Public detail has report action.
- Report creates moderation-visible record.
- Admin action creates audit log.
- Route/API audit covers new routes.

### 5. Public Gallery Reuse

Status: done locally on 2026-06-17.

Goal: users can reuse public assets without leaking private data.

Tasks:

1. Reuse template from public output schema.
2. Reuse sanitized public prompt only when allowed.
3. Use public media as reference only when policy permits.
4. Show disabled reason when reuse is disallowed.
5. Add e2e smoke for at least one allowed reuse path.

Acceptance:

- Reuse template does not copy private owner prompt.
- Reuse prompt uses sanitized public text only.
- Use-as-reference uses public media reference only.
- No raw storage/provider metadata is exposed.

### 6. Generate Blocked-State Expansion

Goal: keep every Generate block testable and product-readable.

Tasks:

1. Confirm current helper covers all required codes:
   - `missing_template`
   - `missing_prompt`
   - `missing_upload`
   - `invalid_upload`
   - `insufficient_credit`
   - `level_locked`
   - `provider_missing`
   - `provider_unavailable`
   - `content_gate`
   - `age_gate`
   - `job_running`
2. Add missing code if any.
3. Add helper tests for missing code.
4. Add UI surface for code/cause/next action/debit state.

Acceptance:

- No blocked state debits tokens before backend accepts a valid job.
- Every visible disabled Generate button has a reason.
- Tests cover every stable blocked code.

### 7. Upload Slot Hardening

Goal: no unsupported file passes local or backend preflight.

Tasks:

1. Compare frontend rules and backend rules for:
   - MIME
   - size
   - count
   - duration
   - prompt required
2. Add missing backend validation tests.
3. Add missing frontend helper tests.
4. Add per-slot error display if missing in UI.

Acceptance:

- Frontend and backend reject the same invalid metadata.
- Invalid upload creates no provider job.
- Invalid upload does not debit.
- Error points to the exact slot.

## Execution Order

Use this order unless the user explicitly redirects:

1. Production live provider/storage verification after real external services are configured.

Completed setup steps:

- Sync docs and memory after the Public Gallery implementation.
- Clean temporary MissAI extraction artifacts from source control.
- First-pass `AICreatorPage.tsx` orchestration cleanup into focused remote-gallery hook.
- Remaining blocked-state/upload-slot hardening tests.
- Production moderation runbook/policy copy for public generation outputs.
- Backend-safe Creator Studio handoff wiring for use-as-character-image/use-as-cover.
- Browser hardening review; no extra browser-only test needed for the current local contract.

## QA Commands

For docs-only edits:

```powershell
bun run docs:commands
bun run memory:audit
bun run secrets:check
git diff --check
```

For frontend/helper edits:

```powershell
bun run frontend:storage:test
bun run frontend:components:test
bun run frontend:static:audit
bun run frontend:route:audit
bun run frontend:check
git diff --check
```

For backend/API edits:

```powershell
bun run api:audit
bun run backend:check
git diff --check
```

For browser/runtime flow edits:

```powershell
bun run e2e:smoke
```

## Notes For Future Agents

- Do not add fake Public Gallery data.
- Do not expose raw `storageKey`.
- Do not call providers from frontend components.
- Do not store raw BYOK/provider keys in frontend production state.
- Current BYOK contract has two safe modes: session-only raw keys for the current browser tab, and a server-side encrypted provider-key vault with owner-scoped metadata, redacted responses, and user audit logs. Raw user API keys must not be persisted to `localStorage` or source/log output; cloud production still requires real domain/provider policy verification before it can be sold as a stable account feature.
- Do not count fallback output as live provider verification.
- Keep page components thin; put rules in helpers and API calls in `apps/frontend/src/lib/api.ts`.
