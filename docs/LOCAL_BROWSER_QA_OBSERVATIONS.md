# Local Browser QA Observations

Last updated: 2026-06-18

เป้าหมายรอบนี้คือกดใช้งานจริงบน local server หลัง MissAI account/admin rewrite และตรวจว่าปุ่มหลักไม่ตันโดยไม่มีเหตุผล

## Environment

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3001`
- Backend health: database connected, local chat runtime active, image/storage/provider health visible
- Important local setting: `apps/frontend/.env` must point `VITE_API_BASE_URL=http://127.0.0.1:3001` for local browser QA

## Result Summary

| Route | Result | Evidence |
| --- | --- | --- |
| `/wallet` | pass | Refresh works. Admin key save/clear works. Token adjustment buttons return to disabled after clearing admin key. |
| `/profile` | pass | Persona template fills textarea. Content mode controls render 3 states. BYOK vault panel remains visible without storing a raw key. |
| `/support` | pass | Local support ticket form accepts title/detail and submits to local state. |
| `/events` | pass | Events inbox renders one scene list with 13 pending scene rows in current QA data. |
| `/admin/health` | pass | Shows local readiness, deploy checklist, and route/menu readiness in product-facing Thai copy. |
| `/moderation` | pass | Shows report queue page and admin-key guard when no admin key is active. |
| `/chat/e52fabe1-6ad3-421b-80d6-48981655eb7e` | pass after fix | Composer count is 1. Sending a Thai roleplay message appends user + assistant messages. Composer clears after send. After response, typing a new draft enables submit again. |

## Bug Found And Fixed

### Chat composer looked stuck after reply

Observed behavior:

- Chat reply text arrived and message count increased.
- Composer stayed disabled in the initial test observation.
- No browser console errors appeared.

Root causes:

- Local browser was initially pointing frontend API calls to the Ngrok URL in `apps/frontend/.env`, not the local backend.
- The stream helper waited for the HTTP stream connection to close even after a terminal `done` event.
- `WorkspacePage` kept the loading state active while waiting for post-reply history sync.

Fixes applied:

- Switched local frontend env back to `VITE_API_BASE_URL=http://127.0.0.1:3001`.
- `streamChatMessage` now resolves and cancels the reader after `done` or `error`.
- `WorkspacePage` now releases loading immediately after a response, then syncs history as a best-effort follow-up instead of blocking the composer or retrying chat.
- Added regression coverage in `scripts/frontend-api-errors.test.ts` for a stream that sends `done` but keeps the connection open.

## Follow-Up

- Keep `.env` local during local QA. Use the Ngrok URL only for temporary staging preview.
- Full `bun run e2e:smoke` passed after this browser-driven fix and `/profile` smoke-copy sync. QA seed was restored afterward with `bun run qa:seed`.
- Larger cleanup remains for `AICreatorPage.tsx`, `CharacterCreateForm`, and `WorkspacePage`, but the local browser play path is usable after this fix.
