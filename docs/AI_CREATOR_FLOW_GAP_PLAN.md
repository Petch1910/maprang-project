# AI Creator Flow Gap Plan

Last updated: 2026-06-17

This is the active task checklist for closing AI Creator gaps. The system contract lives in `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`.

## Current Decision

Do not wait for more MissAI cloning. The missing areas must be implemented as Maprang-owned contracts:

- Upload preview/validation.
- Generate blocked states for credit, level, provider, input, content, and duplicate-job cases.
- My Library detail/actions.
- Public Gallery detail/actions/reuse.

Payment/top-up remains out of scope until provider, policy, and payment flow are ready.

## Done

- Retry failed generation job route/helper/UI/test coverage.
- My Library owner detail for local and backend-backed items.
- Favorite/unfavorite for owner outputs.
- Delete for local and backend-backed outputs.
- Download route/helper/action for direct/public/signed URL resolution.
- Signed URL expiry/refresh UI state through owner-scoped download endpoint.
- Signed-storage owner-path browser smoke with local-safe signed fixture and no `storageKey` DOM/API exposure.
- Use-as-character-image and use-as-cover draft bridge to Creator Studio.
- Persisted character cover field through `Character.coverUrl`.
- Creator Studio cover publish/render browser smoke from AI Creator My Library output.
- Template-aware upload validation helpers for image and video slot rules.
- Backend preflight parity for optional upload metadata.
- Public Gallery disabled contract panel with private-by-default copy and no fake public data.
- Browser smoke for `/ai-creator` render, blocked states, invalid uploads, Public Gallery disabled actions, backend-backed My Library detail, and use-as-cover draft bridge.

## Remaining Gaps

### 1. Signed-Storage Output Browser Smoke

Status: owner path done locally on 2026-06-17. Timed expiry remains covered by helper/UI state tests, not by a browser wait test.

Goal: prove a backend-backed output with storage object metadata can refresh signed URLs safely.

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
- Another owner cannot resolve the URL. Backend owner guard coverage exists in persistence tests.
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

Goal: move Public Gallery from disabled contract to real public surface.

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

1. Public Gallery publish/unpublish backend and UI.
2. Public Gallery sanitized list/detail.
3. Public Gallery report/moderation/audit.
4. Public Gallery reuse flow.
5. Remaining blocked-state/upload-slot tests.

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
- Do not count fallback output as live provider verification.
- Keep page components thin; put rules in helpers and API calls in `apps/frontend/src/lib/api.ts`.
