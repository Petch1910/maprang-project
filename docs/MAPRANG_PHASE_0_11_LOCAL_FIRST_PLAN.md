# Maprang Phase 0-11 Local-First Execution Plan

Last updated: 2026-06-18

## Goal

Make Maprang a real local-server product before any cloud production work:

- Users can open the local web app and complete the core loop: explore characters, create a character, enter chat, send messages, manage saved chats, report content, review wallet/events, and inspect admin health.
- UI follows the MissAI/Khuiai direction as product references while avoiding copied private media, paid flows, prompts, or competitor-specific implementation details.
- Backend/API/DB remain the source of truth: React/Vite/Redux frontend, Bun/Elysia backend, Prisma/PostgreSQL, Supabase-ready storage, and local-safe roleplay runtime.
- Cloud/production stays an external phase. Local UI must not ship dead buttons just because cloud credentials or deployed URLs are not configured yet.

## Current Evidence Baseline

- 2026-06-18 repo gate pass: `bun run qa:repo` passed end to end after the latest Phase 0-11 cleanup. Latest route/API evidence is 20 frontend routes, 80 backend routes, and 56 frontend API helper calls. Frontend build and bundle budget passed; backend check passed; `predeploy:check`, route/menu/template/static/security/import-cycle/docs/memory/release handoff/deploy doctor gates passed.
- 2026-06-18 full local runtime gate pass: Docker Desktop was started, `docker compose up -d postgres` confirmed `maprang-db` running, backend/frontend local services were started on `http://127.0.0.1:3001` and `http://127.0.0.1:5173`, and `bun run qa:full` passed end to end. Evidence includes `qa:repo`, QA seed, `smoke:doctor`, `smoke:local`, `api:smoke`, Chromium desktop/mobile `e2e:smoke`, and final QA reseed.
- 2026-06-18 local startup/source cleanup slice: `scripts/local-server-up.ts` startup/error logs are readable Thai and locked by `scripts/local-server-up.test.ts`. Evidence: `bun test scripts/local-server-up.test.ts`, `bun run local:doctor:test`, and `bun run docs:commands`.
- `bun test apps/backend/src/response-quality.service.test.ts`: 3 pass / 14 expects
- `bun run backend:check`: 343 pass / 1496 expects
- `bun run frontend:check`: pass, bundle budget pass
- `bun run frontend:static:audit`: pass
- `bun run frontend:route:audit`: 20 routes pass
- `bun run api:audit`: 80 backend routes / 56 frontend helper calls pass
- Browser smoke on `http://127.0.0.1:5173/chat`: local chat runtime can send with token balance 0, returns `local/mock-roleplay`, and shows response quality `100/100 · 1,106 ตัวอักษร` in the chat right rail.
- `bun run smoke:local`: pass against `http://127.0.0.1:3001`; normal/stream chat both returned `local/mock-roleplay`, reply lengths 1134/1089 chars, pending events 2, and saved chat/world-state/upload checks passed.
- `bun run e2e:smoke`: pass, 4/4 Chromium desktop/mobile route/menu/render checks.
- Phase 2 UI slice: `/chats` uses portrait-style character fallback images instead of letter-only avatar tiles when saved chats have no real avatar URL; shell/Explore local-runtime copy is Thai-first. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx`, `bun run frontend:check`, and `bun run e2e:smoke` 4/4.
- Phase 9 text/UI slice: Explore marketplace filters, search, empty/error states, tooltips, token copy, and rails are Thai-first while preserving route/action behavior. Evidence: `bun run frontend:check` and `bun run e2e:smoke` 4/4.
- Phase 3/4 copy slice: Creator Studio image source badges, image style choices, generated-image alt text, and AI Creator gallery reuse metadata now use Thai product-facing wording instead of `provider/fallback/manual/Remote` style labels. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx`, `bun run frontend:check`, and `bun run e2e:smoke` 4/4.
- Phase 4 route cleanup slice: `/ai-creator` character-option loading, local history persistence, upload reference validation, manual/template generation, download handling, library item actions, reference-to-Creator bridge, save-to-studio, clipboard copy actions, and gallery history view state moved into focused hooks, with source contract coverage. `AICreatorPage.tsx` is now 395 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 330 expects) and `bun run frontend:check`.
- Phase 4 Creator Studio cleanup slice: `CharacterCreateForm.tsx` draft status type, avatar source labels, local draft storage wrappers, readiness summary, UI timeout, empty form seed, and character-create payload builder moved into `creatorFormState.ts`. `CharacterCreateForm.tsx` is now 912 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 340 expects) and `bun run frontend:check`.
- Phase 4 Creator Studio cleanup slice: remote draft persistence moved into `useCreatorDraftPersistence`; avatar upload, AI draft generation, fallback generated avatar, image draft application, and generation analytics moved into `useCreatorDraftGeneration`. `CharacterCreateForm.tsx` is now 742 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 361 expects) and `bun run frontend:check`.
- Phase 4 Creator Studio cleanup slice: reset-form, clear generated avatar, clear cover draft, and use-cover-as-main actions moved into `useCreatorFormActions`. `CharacterCreateForm.tsx` is now 692 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 379 expects), `bun run frontend:check`, `bun run api:audit`, `bun run docs:commands`, `bun run memory:audit`, and `git diff --check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` now delegates API error policy, stream fallback policy, default chat runtime state builders, saved chat message limit, and unexpected-error forwarding to `workspaceRuntime.ts`. `WorkspacePage.tsx` is now 760 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 384 expects), `bun run frontend:check`, `bun run api:audit`, `bun run docs:commands`, `bun run memory:audit`, and `git diff --check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` now delegates message/character report target state and report submission to `useWorkspaceReports`. `WorkspacePage.tsx` is now 707 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 393 expects), `bun run frontend:check`, `bun run api:audit`, `bun run docs:commands`, `bun run memory:audit`, and `git diff --check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` now delegates world-state saving to `useWorkspaceWorldState`. `WorkspacePage.tsx` is now 683 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 399 expects), `bun run frontend:check`, `bun run api:audit`, `bun run docs:commands`, `bun run memory:audit`, and `git diff --check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` stream-success cleanup now has a single loading clear and one best-effort history sync block. Source contract rejects `????????` and the old nested loading cleanup pattern. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 401 expects), `bun run frontend:check`, `bun run api:audit`, `bun run docs:commands`, `bun run memory:audit`, and `git diff --check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` now delegates saved-chat history loading state/API work to `useWorkspaceChatHistory`. `WorkspacePage.tsx` is now 662 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 407 expects) and `bun run frontend:check`.
- Phase 4/Chat cleanup slice: `WorkspacePage.tsx` now delegates saved-chat runtime state composition to `savedChatRuntimeState` in `workspaceRuntime.ts`. `WorkspacePage.tsx` is now 648 lines. Evidence: `bun test apps/frontend/tests/frontend-component-contract.test.tsx` (29 pass / 411 expects) and `bun run frontend:check`.

## Phase 0 - Repo Baseline And Source Of Truth

Tasks:

1. Check `git status --short` before every implementation slice.
2. Separate source work from temp, scratch, generated artifacts, and user assets.
3. Keep `AGENTS.md`, `agent.md`, memory, and this plan aligned.
4. Keep old docs as reference only when they conflict with current code/tests.
5. Run docs/memory gates after source-of-truth changes.

Acceptance:

- Future agents can find the active plan without reading every historical doc.
- No source-of-truth doc claims local work is open when current code/tests prove it is closed.
- No temp/scratch file is treated as required source without a runtime/test/doc reference.

QA:

- `bun run docs:commands`
- `bun run memory:audit`
- `git diff --check`

## Phase 1 - Core Chat Quality

Tasks:

1. Keep the backend Response Quality Controller as the central rule for reply depth.
2. Keep chat request fields wired through the API helper: `modelRoute`, `replyProfile`, `responseDepth`.
3. Expose user-facing reply presets in chat:
   - เร็ว: quick, fast chat
   - สมดุล: balanced roleplay
   - ละเอียด: deep roleplay
   - ฉากเข้มข้น: cinematic scene
4. Show latest response quality evidence in the chat right rail.
5. Keep mobile access to reply presets through the chat action menu.
6. Preserve scene/relationship/world-state prompt context and Prompt Inspector visibility.
7. Add/keep tests that prove shallow roleplay gets flagged and richer replies score higher.

Current local status:

- Backend controller exists in `apps/backend/src/response-quality.service.ts`.
- Workspace sends selected reply settings to `streamChatMessage` and fallback `sendChatMessage`.
- Chat UI exposes reply presets in desktop right rail and mobile action menu.
- Local server startup forces `LOCAL_CHAT_PROVIDER=1`, `CHAT_PROVIDER=local`, and `LOCAL_CHAT_MODEL_NAME=local/mock-roleplay`.
- Local chat runtime bypasses the token gate; production/live provider runtimes still use the token gate.

Acceptance:

- User can choose reply depth before sending.
- Backend receives the selected profile and stores quality metadata in message/context metadata.
- The UI shows latest quality score/length when usage metadata exists.
- Local roleplay no longer depends only on hidden prompt defaults to avoid shallow replies.

QA:

- `bun test apps/backend/src/response-quality.service.test.ts`
- `bun run backend:check`
- `bun run frontend:check`
- `bun run api:audit`
- focused browser smoke for chat send/profile switching when runtime is available

## Phase 2 - Core Chat UI And Chat Management

Tasks:

1. Keep one composer per chat viewport.
2. Keep send/loading state guarded against duplicate submits.
3. Keep message actions real or disabled with readable reasons.
4. Keep `/chats` menu actions complete: rename, pin/unpin, archive/restore, select, delete.
5. Ensure chat avatars use character images where available, not letter-only fallback for real character cards.
6. Keep scene notice, relationship bar, report flow, wallet warning, and world-state panel visually aligned with the MissAI-style shell.

Current local status:

- `/chats` menu actions are wired to real local/API behavior and covered by route/menu/e2e smoke.
- Saved-chat avatars use `characterImageUrl`; missing real avatar URLs now render generated portrait-style character images rather than letter-only tiles.
- Shell and Explore sidebar local-runtime copy uses Thai product-facing wording.

Acceptance:

- User can create/open/manage chats locally without dead controls.
- Chat UI feels like a normal chat app, not a dashboard/event board.
- Mobile composer/menu/drawer do not overlap.

QA:

- `bun run frontend:check`
- `bun run route-menu:audit`
- `bun run e2e:smoke`

## Phase 3 - Creator Studio

Tasks:

1. Keep Creator Studio as the primary character creation route.
2. Make image upload/URL/AI-generated image use one clear visual slot.
3. Keep image URL lower in the form and image preview centered.
4. Keep AI draft/image states explicit: idle, loading, success, fallback, error, fill result.
5. Keep readiness, personality clarity, tag analysis, content warning, and preview simulator visible.
6. Publish/save draft must have real local behavior or a clear disabled reason.

Current local status:

- Creator Studio has image upload, URL, AI draft/image, and cover draft handoff states.
- Image source badges are product-facing Thai labels: ระบบสร้างรูป, ภาพร่างระบบ, ผู้ใช้เลือกเอง.
- Image style choices are Thai-first and avoid developer/provider wording.

Acceptance:

- User can create a local character, publish it, open lobby, and start chat.
- AI draft/image fallback is product-facing and does not look like demo data.

QA:

- `bun run frontend:storage:test`
- `bun run frontend:components:test`
- `bun run frontend:check`
- `bun run backend:check`
- browser create/publish smoke

## Phase 4 - AI Creator And Media Loop

Tasks:

1. Keep AI Creator job-based and private by default.
2. Keep text-to-image, image-to-image, image/video template contracts visible.
3. Keep Upload preview/validation, Generate blocked states, My Library detail/actions, Public Gallery detail/actions/reuse.
4. Keep chat-to-image handoff planned: generate image from current scene/message without leaking private chat by default.
5. Keep video/advanced-video as visible contract states until a provider is wired.

Current local status:

- AI Creator has upload validation, blocked states, My Library detail/actions, Public Gallery detail/actions/reuse, creator reference handoff, and local-safe provider contract states.
- Public gallery reuse metadata shows Thai labels for image/video references and remote files.
- Video/advanced-video remains an explicit provider-contract state until real provider execution exists.

Acceptance:

- User can understand why Generate is blocked.
- Local image draft/fallback can be reused into Creator Studio.
- Public Gallery only shows sanitized backend public outputs.

QA:

- `bun run frontend:storage:test`
- `bun run frontend:check`
- `bun run api:audit`
- `bun run e2e:smoke`

## Phase 5 - Persona, Wallet, BYOK, And Content Mode

Tasks:

1. Keep persona editable and injected into chat context.
2. Keep content mode and age gate server-aware.
3. Keep wallet balance, ledger, and usage breakdown readable.
4. Keep BYOK/server-side vault safe: no raw key in persistent frontend storage.
5. Add clear product copy for managed provider vs BYOK vs local mode.

Acceptance:

- User sees how tokens/provider mode affect chat and generation.
- BYOK does not create a secret-storage regression.

QA:

- `bun run frontend:check`
- `bun run backend:check`
- `bun run security:audit`

## Phase 6 - Backend/API/DB Completion

Tasks:

1. Keep frontend API calls through `apps/frontend/src/lib/api.ts`.
2. Keep `api:audit` green after adding routes or helpers.
3. Keep Prisma migrations aligned with schema.
4. Keep owner guards on chats, characters, generation jobs, reports, wallet, and admin actions.
5. Keep local mock-roleplay playable without live provider keys.

Acceptance:

- Every visible feature has a local API path or explicit disabled reason.
- Local DB migration/test gate proves persistence contracts.

QA:

- `bun run api:audit`
- `bun run backend:check`
- `bun run backend:check:db:test`

## Phase 7 - Moderation, Safety, And Abuse Controls

Tasks:

1. Keep report routes for character, message, and generation output.
2. Keep admin moderation actions audited.
3. Keep content taxonomy structured for adult mode and public discovery.
4. Keep SQL injection, broken access control, rate-limit, and prompt-control checks green.

Acceptance:

- Reported content reaches moderation queue.
- Admin action leaves audit evidence.
- User-generated adult roleplay is treated as fictional simulation while blocked categories stay blocked.

QA:

- `bun run security:audit`
- `bun run backend:check`
- `bun run route-menu:audit`

## Phase 8 - Prompt Inspector, Memory, Evals, And Analytics

Tasks:

1. Keep Prompt Inspector redacted and diff-capable.
2. Keep context snapshots redacted and process-mining safe.
3. Keep roleplay evals for depth, continuity, and prompt-injection resistance.
4. Add frontend event capture beyond chat runtime when starting analytics UI work.

Acceptance:

- Developer can inspect why a reply was shallow, off-character, or expensive.
- Analytics does not store raw full prompt text.

QA:

- prompt-inspector tests
- analytics tests
- `bun run backend:check`

## Phase 9 - UI/UX Consolidation

Tasks:

1. Continue redesign pages toward MissAI/Khuiai density:
   - `/`
   - `/chats`
   - `/chat`
   - `/create`
   - `/ai-creator`
   - `/wallet`
   - `/profile`
   - `/events`
   - `/support`
   - `/moderation`
   - `/admin/health`
2. No fake menu: every button has a result or disabled reason.
3. Remove visible demo wording from user-facing surfaces.
4. Keep avatar/card/image surfaces image-led.
5. Check 390px, 430px, 1440px, and 1920px viewports.

Current local status:

- Explore marketplace copy is Thai-first across filters, search placeholders, rail labels, empty state, error state, tooltips, and token wording.
- Saved-chat cards and chat rails use image-led character avatar surfaces; missing avatar URLs render generated portrait-style character images instead of letter-only tiles.
- Desktop/mobile smoke still passes after these UI copy and avatar changes.

Acceptance:

- Pages look like one product, not separate prototypes.
- Mobile-first workflows remain usable.

QA:

- `bun run missai:template:audit`
- `bun run frontend:static:audit`
- `bun run frontend:check`
- `bun run e2e:smoke`

## Phase 10 - Local Runtime QA And Evidence

Tasks:

1. Run local server acceptance when services are available.
2. Click through real local flows:
   - Explore
   - Character Lobby
   - Create
   - AI Creator
   - Chat send
   - Chat management
   - Report
   - Wallet
   - Profile
   - Events
   - Moderation
   - Admin Health
3. Record observations in docs/memory.
4. Fix bugs found during real clicking before checkpoint.

Current local status:

- Focused `/chat` browser smoke passed for preset switching, local send with token 0, and right-rail response-quality evidence.
- `bun run smoke:local` passed with local normal/stream chat, creator draft fallback, creator preview, wallet, moderation, saved chats, world state, and upload checks.
- `bun run e2e:smoke` passed desktop/mobile core route/menu smoke and primary route rendering checks.

Acceptance:

- Local play/create loop is demonstrably usable end-to-end.
- QA evidence is captured with commands and observed behavior.

QA:

- `bun run qa:repo`
- `bun run qa:local`
- `bun run e2e:smoke`

## Phase 11 - External Staging/Production

This phase is not required to prove local server readiness.

Tasks:

1. Deploy backend to real HTTPS URL.
2. Deploy frontend to real HTTPS domain.
3. Set production/staging `CORS_ORIGINS`, `VITE_API_BASE_URL`, `SMOKE_API_BASE_URL`.
4. Verify Supabase private `avatars` bucket with signed URL.
5. Verify live image provider and live chat provider.
6. Run staging/production smoke and update release handoff evidence.

Acceptance:

- `bun run staging:verify` passes against deployed URLs.
- `bun run production:check` passes only when real production evidence is present.

QA:

- `bun run staging:verify`
- `bun run smoke:chat`
- `bun run smoke:image:live`
- `bun run production:check`

## Immediate Next Order

1. Keep Phase 1 reply quality controls green and browser-testable.
2. Run focused chat browser smoke when local services are available.
3. Continue Phase 2/3 UI cleanup for `/chat`, `/chats`, and `/create`.
4. Update memory after every verified slice.
5. Do not mark the overall Phase 0-11 goal complete until local runtime QA proves all core routes and production blockers are separated.
