# Local Browser QA Observations

Last updated: 2026-06-28

เป้าหมายรอบนี้คือกดใช้งานจริงบน local server หลัง MissAI account/admin rewrite และตรวจว่าปุ่มหลักไม่ตันโดยไม่มีเหตุผล

## Environment

- Frontend: `http://127.0.0.1:5173`
- Backend: `http://127.0.0.1:3001`
- Backend health: database connected, local chat runtime active, image/storage/provider health visible
- Important local setting: `apps/frontend/.env` must point `VITE_API_BASE_URL=http://127.0.0.1:3001` for local browser QA

## Result Summary

| Route | Result | Evidence |
| --- | --- | --- |
| `/wallet` | pass 2026-06-28 | Credit Usage page shows credit balance, admin credit adjustment, and credit ledger copy. No coin/top-up/payment wording was found in the page text. |
| `/ai-creator` | pass 2026-06-28 | AI Creator shows credit cost, template controls, disabled Generate reason when prompt/input is missing, My Library/Public Gallery sections, and no coin/top-up/payment wording. |
| `/profile` | pass 2026-06-28 | Profile shows persona, content mode, BYOK/API section, credit usage, and no coin/top-up/payment wording. |
| `/create` | pass 2026-06-28 | Creator Studio shows AI image/content draft controls, image URL section, relationship presets, readiness, and preview simulator. Clicking `ทดสอบ 5 เทิร์น` produced preview turns without error. |
| `/chat` | pass 2026-06-28 | Forced-local backend/frontend were running. Sending a real Thai roleplay message returned a 1103-character local reply, cleared the composer, and typing a new draft re-enabled the send button. Browser console error log was empty. |
| `/chat` | pass 2026-06-28 follow-up | In-app browser sent a new Thai roleplay prompt from the actual composer. The app created/opened `/chat/a67de6ec-7dec-40bd-9d38-40621d77c4a5`, displayed the user prompt plus a long Thai MIKA reply, cleared the composer, and keyboard clearing returned submit to disabled. Browser console errors: 0. |
| `/create` | pass 2026-06-28 follow-up | Creator Studio rendered AI image/content controls, manual image URL mode, relationship presets, greeting/system/scenario fields, and preview simulator. Clicking `ทดสอบ 5 เทิร์น` completed without error and the assistant panel reported `จำลอง 5 เทิร์นแล้ว`. |
| `/ai-creator` | pass 2026-06-28 follow-up | AI Creator rendered credit cost, missing-input disabled reason, My Library, Public Gallery, and no coin/top-up wording. Video tab showed disabled Generate with the local contract text that real video generation is not open yet. |
| `/chats` | pass 2026-06-28 follow-up | Chat cards render portrait images/backgrounds instead of letter-only tiles. The latest chat three-dot menu exposes `แก้ไขแชท`, `ปักหมุดแชท`, `จัดเก็บแชท`, `เลือก`, and `ลบแชท`. Browser console errors: 0. |
| `/profile` | pass 2026-06-28 follow-up 2 | Clicked the persona template button. The persona textarea filled successfully, character count updated to `92/2,000 ตัวอักษร`, developer API/BYOK area remained visible, credit copy remained present, and no coin/top-up wording appeared. |
| `/support` | pass 2026-06-28 follow-up 2 | Filled the local support title/detail fields and clicked `ส่งรายงาน`. The form cleared, success/ticket copy appeared, and no browser console error appeared. |
| `/events` | pass 2026-06-28 follow-up 2 | Scene rows render as real links with `เปิดแชท`. Clicking the first scene row navigated to `/chat/61aaecf2-a85b-4e01-a7ee-0973eef62699` and the chat composer loaded. |
| `/moderation` | pass 2026-06-28 follow-up 2 | Refresh worked without admin key. The page kept the ADMIN_API_KEY guard visible, report/moderation copy visible, and no error/coin leak appeared. |
| `/admin/health` | pass 2026-06-28 follow-up 2 | Admin Health showed local server ready, DB ready, local chat ready, route/menu readiness, and production/external blockers separately. Browser console errors after the route set: 0. |
| `/wallet` | pass | Refresh works. Admin key save/clear works. Credit adjustment buttons return to disabled after clearing admin key. |
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
- 2026-06-28 browser click-through confirmed the current credit-usage and local-chat-quality checkpoint. Larger cleanup remains for future maintainability, but the local browser play path is usable after this fix.
- 2026-06-28 automated browser smoke was rerun after syncing the credit-copy contracts: focused desktop/mobile Playwright smoke passed, then `bun run e2e:smoke` passed 4/4 and `bun run qa:full` passed. New local avatar uploads from QA are ignored as runtime artifacts via `.gitignore`; tracked seed avatar files remain committed.
