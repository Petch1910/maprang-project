# Maprang AI Creator System Plan

Last updated: 2026-06-17

This is the canonical implementation contract for Maprang AI Creator. Use it before editing `/ai-creator`, generation APIs, Creator Studio image reuse, storage/download behavior, or Public Gallery behavior.

If documents disagree, use this order:

1. `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`
2. `docs/AI_CREATOR_FLOW_GAP_PLAN.md`
3. `docs/AI_CREATOR_COMPLETION_PLAN.md`
4. `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`

`docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md` is evidence/reference only. Do not clone payment/top-up flows, do not copy explicit UGC prompts/media, and do not wait for exact MissAI behavior when Maprang already has a clear repo-owned contract.

## Product Goal

AI Creator is a job-based asset workflow for character creation and roleplay. It must help users create, inspect, reuse, and manage generated images or videos without pretending unsupported production systems are ready.

Core principles:

- Private by default: generated outputs belong to the owner until explicitly published.
- No fake production: Public Gallery may show only backend-owned public outputs returned through sanitized DTOs. Never seed fake public content or expose private storage metadata.
- No silent debit: validation, permission, provider, and content-gate blocks must not charge tokens.
- Token ledger contract: chat usage already records `CHAT_USAGE`; the schema now reserves `IMAGE_GENERATION` rows so wallet history can label image-generation debits once live provider execution and debit policy are enabled.
- One contract: frontend and backend must share the same template/upload/provider/cost assumptions.
- Creator-first: generated outputs must flow into Creator Studio without manual URL copying.
- Observable states: every visible button must either work or show a clear disabled reason.

## Current Local Status

Implemented:

- `/ai-creator` route and MissAI-style local UI shell.
- Template-aware upload validation helpers for text-to-image, image-to-image, image-to-video, and advanced-video input contracts.
- Generate blocked-state helper and visible QA matrix for prompt, upload, credit, level, provider, content gate, and duplicate-running-job states.
- Local fallback generation with explicit fallback labeling.
- Backend generation foundation:
  - `GET /generation/templates`
  - `POST /generation/jobs`
  - `GET /generation/jobs`
  - `GET /generation/jobs/:id`
  - `POST /generation/jobs/:id/retry`
  - `POST /generation/jobs/:id/cancel`
  - `POST /generation/outputs/:id/favorite`
  - `DELETE /generation/outputs/:id/favorite`
  - `GET /generation/outputs/:id/download`
  - `POST /generation/outputs/:id/use-as-character-image`
  - `POST /generation/outputs/:id/use-as-cover`
  - `DELETE /generation/outputs/:id`
  - `POST /generation/gallery/:id/publish`
  - `DELETE /generation/gallery/:id`
  - `GET /generation/gallery`
  - `GET /generation/gallery/:id`
- Prisma generation model and private-by-default outputs.
- My Library list/detail for local and backend-backed items.
- My Library actions where supported: open detail, reuse, favorite, delete, download, retry, and owner-safe cancel state.
- Use-as-character-image and use-as-cover bridge into Creator Studio draft state. Backend-backed outputs now request owner-safe reference URLs before handoff; local/dev can fall back to an existing local-safe preview URL only when the backend reference returns 404.
- Persisted character cover contract through `Character.coverUrl`.
- Signed URL expiry/refresh UI state through owner-scoped download route. Backend persistence tests cover other-owner denial for retry, favorite, delete, direct download, signed download, and signed creator-reference handoff, including the rule that other-owner paths do not invoke signed-storage resolvers or expose `storageKey`.
- Video and Advanced Video provider execution are intentionally gated. The current UI exposes the form as a contract surface but keeps generation disabled with a visible provider-contract notice until a real video provider, debit policy, and smoke evidence exist.
- Public Gallery opt-in publish/unpublish, sanitized list/detail, generation-output report/moderation path, safe reuse UI flow, and a public detail mode that hides owner-only actions such as publish/unpublish, delete, retry, cancel, download, and system-prompt copy.
- Production moderation runbook and policy copy in `docs/AI_CREATOR_PRODUCTION_MODERATION_RUNBOOK.md`.
- Browser smoke covers `/ai-creator`, invalid upload blocking, Generate blocked/enabled states, backend-backed My Library detail, direct download availability, signed-storage owner-path download notice, no `storageKey` DOM exposure, use-as-cover draft handoff with backend-reference/local-safe fallback behavior, Creator Studio cover publish/render through Character Lobby, Public Gallery publish, Public Gallery sanitized detail action visibility, and Public Gallery reuse.

Not complete:

- Browser smoke proving `coverUrl` survives dedicated edit flow and renders on Explore/Chat surfaces.
- Public Gallery deployed production moderation evidence.
- Production live image provider verification. Local fallback is not production evidence.
- Full video/advanced-video provider execution. The UI may expose contracts, but production execution is deferred until image workflow and provider policy are stable.

## Required User Flows

### Upload Preview And Validation

For every template slot:

- Show preview immediately after file selection.
- Show file name, MIME type, readable size, slot count, and video duration when available.
- Support replace/remove per slot.
- Show slot-level error copy.
- Use shared validation helpers, not duplicated component rules.
- Recompute Generate blocked state immediately after each file change.
- Backend preflight must repeat validation before creating a job or debiting tokens.

Minimum validation:

- required slot count
- MIME allowlist
- file size limit
- video duration limit
- prompt requirement
- content/age gate
- provider readiness

### Generate Blocked States

Every blocked state needs:

- stable internal code
- short user-facing title
- cause
- next action
- debit policy

Required codes:

| Code | Meaning | Debit |
| --- | --- | --- |
| `missing_template` | no template selected | no |
| `missing_prompt` | required prompt missing | no |
| `missing_upload` | required file slot missing | no |
| `invalid_upload` | MIME/size/duration/count invalid | no |
| `insufficient_credit` | balance too low | no |
| `level_locked` | user level/permission too low | no |
| `provider_missing` | live provider not configured | no |
| `provider_unavailable` | provider down/rate-limited before accepted job | no |
| `content_gate` | selected content mode does not match template | no |
| `age_gate` | required age/content gate not passed | no |
| `job_running` | duplicate running job blocked | no duplicate debit |

### My Library Detail And Actions

My Library is owner-only.

List requirements:

- filters: all, favorites, image, video, failed/blocked
- bounded pagination
- empty state with action back to generation
- no fake backend sync claims

Detail requirements:

- preview
- status
- template/mode
- source: fallback, live provider, backend private, public, signed-active, signed-expired
- prompt/brief/input summary
- created time
- cost/debit state
- failure reason if any
- owner/private/public visibility
- signed URL expiry and refresh state

Action contract:

| Action | Required behavior |
| --- | --- |
| Open detail | always works for visible item |
| Reuse template | fills the same template/mode locally |
| Reuse own prompt | only for owner/private item |
| Use as character image | writes safe Creator Studio draft reference |
| Use as cover | writes safe Creator Studio cover draft reference |
| Favorite/unfavorite | owner-only backend mutation where item is backend-backed |
| Retry failed job | owner-only, idempotent, no duplicate debit before accepted job |
| Delete/archive | owner-only; local fallback deletes local only |
| Download | direct/public/signed URL only; never expose `storageKey` |
| Refresh signed URL | owner-only download route returns fresh signed URL |

### Public Gallery Detail And Reuse

Public Gallery is not allowed to show fake production content.

Enable it only when these exist:

- explicit owner publish/unpublish
- sanitized public list/detail DTO
- report route to moderation queue
- admin audit log for moderation action
- public media reference that never leaks storage keys
- reuse policy that separates template reuse, sanitized prompt reuse, and public media reference reuse

Public detail may show:

- media preview
- sanitized prompt only when policy allows
- template metadata
- public author display name
- report button
- reuse template
- use as reference when allowed

Never expose:

- private prompt
- owner source file
- raw provider payload
- raw `storageKey`
- account-private metadata

## Backend/API Target

Implemented routes are listed in Current Local Status.

Implemented through existing route groups:

- `GET /generation/gallery`
- `GET /generation/gallery/:id`
- `POST /generation/gallery/:id/publish`
- `DELETE /generation/gallery/:id`
- `POST /generation/jobs/:id/cancel`
- `POST /generation/outputs/:id/use-as-character-image`
- `POST /generation/outputs/:id/use-as-cover`
- Generation output reports use the shared report route with `generationOutputId`, then appear in moderation/admin flows.

API rules:

- Frontend calls go through `apps/frontend/src/lib/api.ts`.
- Components must not call `fetch` directly.
- Owner, public, and admin guards must be explicit.
- Provider errors must map to stable safe error codes.
- Billing and refund/no-debit decisions must be backend-owned and idempotent.

## Frontend Boundary

Keep the current split:

- `apps/frontend/src/lib/aiCreator.ts`: pure rules, validation, blocked states, local item transforms.
- `AICreatorPage.tsx`: route-level orchestration only.
- `components/ai-creator/*`: presentation components.
- `apps/frontend/src/lib/api.ts`: backend boundary.
- `apps/frontend/src/lib/characterDraft.ts`: Creator Studio draft bridge.

Do not move AI Creator state to Redux until more than one route needs live shared generation state.

## Implementation Priority

1. Sync docs/memory to the implemented Public Gallery local contract.
2. Remove committed MissAI extraction/temp artifacts that are not referenced by runtime, tests, docs, or scripts.
3. Reduce `/ai-creator` route orchestration by moving reusable business logic into existing helpers or focused hooks.
4. Add cover smoke expansion for dedicated edit flow, Explore card, and Chat backdrop when those statuses are productized.
5. Expand video/advanced-video execution only after image flow is stable.

## QA Gate

Docs-only changes:

```powershell
bun run docs:commands
bun run memory:audit
bun run secrets:check
git diff --check
```

AI Creator code changes:

```powershell
bun run frontend:storage:test
bun run frontend:components:test
bun run frontend:static:audit
bun run frontend:route:audit
bun run api:audit
bun run backend:check
bun run frontend:check
git diff --check
```

Runtime/browser flow changes:

```powershell
bun run e2e:smoke
```

Live provider/storage changes:

```powershell
bun run smoke:image:live
bun run staging:verify
```

## Definition Of Done

AI Creator is local-ready when:

- Upload validation is visible and testable for every exposed template mode.
- Generate blocked states are complete, stable-coded, and no-debit.
- My Library detail/actions work or show clear disabled reasons.
- Generated images can be reused in Creator Studio without manual URL copying.
- Public Gallery does not show fake production content.
- API audit, frontend checks, backend checks, and browser smoke pass.
- Remaining blockers are only external credentials/domains/storage/provider verification.
