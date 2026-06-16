# ทิศทาง UI/UX ปัจจุบัน

อัปเดตล่าสุด: 2026-06-17

Current AI Creator UI status override - 2026-06-17: retry, use-as-cover bridge, signed URL expiry/refresh UI state, backend `coverUrl` publish contract, backend signed-output guard, frontend template-aware upload slot validation, backend preflight parity for slot MIME/size/duration metadata, `/ai-creator` e2e smoke contract coverage, runtime `bun run e2e:smoke` for the current blocked-state/Public Gallery contract, and backend-backed My Library use-as-cover draft smoke are done. Next UI/product work is signed-storage URL refresh smoke, cover publish/edit rendering smoke, then Public Gallery opt-in/sanitized/report/moderation/audit.

Canonical AI Creator docs were cleaned up on 2026-06-17. For future UI/product work, use `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md` as the source of truth and `docs/AI_CREATOR_FLOW_GAP_PLAN.md` as the active checklist. The missing MissAI-derived areas are now Maprang-owned implementation work: upload preview/validation, Generate blocked states, My Library detail/actions, and Public Gallery detail/actions/reuse.

## ทิศทาง template (Template Direction)

- `D:\missai.me` และ `https://www.missai.day` เป็น reference หลักสำหรับ marketplace, sidebar, card density, creator workbench, AI creator, wallet, settings, notifications และ secondary pages
- `docs/MISSAI_TEMPLATE_AUDIT.md` บันทึก mapping จากไฟล์ template local
- `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md` บันทึก flow หลังล็อกอินจริง เช่น Creator Save/Publish/Schedule validation, AI Creator permission gate, AI image/image-to-image/video/advanced-video tabs, Chat send/loading/cost/actions, model selector, chat settings, memory, custom prompt, creative library และ parallel timeline
- `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md` เป็นแผนหลักรอบถัดไป: โฟกัสระบบเล่นและสร้างก่อน แล้วค่อยทำ secondary/community/payment/video module
- `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md` เป็น source of truth สำหรับ AI Creator และ `docs/AI_CREATOR_FLOW_GAP_PLAN.md` เป็น active checklist สำหรับ upload preview/validation, Generate blocked states, My Library detail/actions, Creator Studio reuse และ Public Gallery opt-in/reuse
- การตรวจ MissAI ล่าสุดใน in-app browser เห็น public/locked state ของ `/ai-creator` เท่านั้น เพราะ session ไม่ติดล็อกอิน จึงใช้เป็นข้อมูล guest/locked behavior ไม่ใช่ logged-in flow ใหม่
- AI Creator ของ Maprang ต้องพัฒนา repo-owned flow เองสำหรับส่วนที่ MissAI ยังเก็บไม่ครบหรือไม่ควรรอ clone: upload preview/validation, Generate blocked states, My Library detail/actions, Public Gallery detail/actions/reuse
- ห้าม import `_next` runtime/chunks จาก template เข้ามาใน Vite app
- ใช้ React/Vite/Redux/API เดิมเป็น source of truth

## ทิศทางผลิตภัณฑ์ (Product Direction)

Maprang คือแพลตฟอร์ม character chat roleplay ภาษาไทยที่ต้องคุ้นมือแบบ MissAI/Khuiai แต่เพิ่มระบบเชิงเกมและความจำที่ลึกกว่า:

- Relationship Contract ก่อนเริ่มแชท
- Scene Mode และ pending events
- Relationship Timeline และ Memory ที่ตรวจสอบได้
- Creator Studio ที่ช่วยสร้างบุคลิกชัด, tag warning, AI draft/image และ preview simulator
- Prompt Inspector และ Automated Evals สำหรับ admin/debug
- Token economy, wallet usage ledger, moderation และ production readiness

## กฎการออกแบบ (Design Rules)

- Dark-first ทั้งเว็บ
- Mobile-first เสมอ
- หน้า marketplace ต้อง scan เร็ว: search, filter, tabs, rails, character cards
- หน้า chat ต้องเป็นแชทธรรมชาติ มี composer เดียว ชัดเจน ไม่ซ้อน
- หน้า create ต้องเป็น workbench ไม่ใช่ form ยาวอย่างเดียว
- ทุกปุ่มต้องมี action จริง หรือ disabled reason ที่อ่านรู้เรื่อง
- Empty state ต้องมี next action ที่กดได้
- UI ไทยต้องอ่านรู้เรื่อง ไม่มี mojibake
- หลีกเลี่ยง page/card layout ที่เหมือน dashboard ถ้า route นั้นควรเป็น marketplace หรือ chat surface

## ลำดับ UX ของ AI Creator

ลำดับปรับปรุง AI Creator:

1. Storage/output actions: backend signed/download URL read, detail download handler, backend output cards, and owner output delete are done; retry and use as cover are next
2. Public Gallery: opt-in เท่านั้น, sanitize DTO, report/moderation, reuse template/reference อย่างปลอดภัย
3. Video/advanced video: แสดงเป็น schema/disabled module ได้ แต่ห้ามทำเหมือนพร้อม production ก่อน image workflow เสถียร

## ชุด utility กลางของ UI (Shared UI Utilities)

ใช้ shared classes ใน `apps/frontend/src/index.css` ก่อนสร้าง class เฉพาะหน้า:

- `.missai-page`
- `.missai-shell`
- `.missai-card`
- `.missai-button-primary`
- `.missai-button-secondary`
- `.missai-icon-button`
- `.missai-input`
- `.missai-dialog`
- `.missai-rail`
- `.missai-sidebar`
- `.missai-bottom-nav`
- `.missai-menu*`
- `.missai-tab*`
- `.missai-badge`
- `.missai-empty`

## ทิศทางแต่ละ route surface (Route Surface Direction)

- Explore `/`: marketplace, continue chatting, search/filter, character rails
- Character Lobby `/characters/:id`: Relationship Contract เด่นและ CTA เข้าแชทชัด
- Chat `/chat`, `/chat/:chatId`: one composer, message actions, scene notice, relationship bar, report, model/settings/memory panels
- My Chats `/chats`: list/grid แชท, three-dot menu, rename, pin/unpin, archive, restore, delete, bulk action
- Creator Studio `/create`: AI draft/image state, upload/avatar URL, readiness validation, preview simulator, publish/schedule guard
- AI Creator `/ai-creator`: prompt, aspect ratio, cost, permission/provider/fallback state, template-driven image-to-image, video/advanced-video as deferred modules, library/history. Current component boundary: `AICreatorPage.tsx` owns orchestration state; `AiCreatorControlPanel`, `AiCreatorResultPreview`, `AiCreatorHistoryGallery`, `AiCreatorHistoryDetailDialog`, and `AiCreatorPublicGalleryPanel` own presentation surfaces
- AI generation: ทำแบบ job-based, มี upload preview/validation, blocked reason, cost state, private library, opt-in public gallery และให้ Creator Studio ใช้รูปที่สร้างแล้วได้
- AI Creator ห้ามเป็นหน้า gallery/prompt ที่กดแล้วตัน: ทุก Generate ต้องมี disabled reason, ทุก upload ต้องมี preview/validation, ทุก library item ต้องมี detail/action ที่ปลอดภัย และ Public Gallery ต้อง private-by-default + opt-in เท่านั้น
- AI Creator local-ready ตอนนี้มี My Library detail, favorite/unfavorite, delete local/backend-output, reuse, download local/fallback/backend-output item, backend job outputs ใน My Library พร้อม `backendOutputId`, `ใช้รูปนี้` เข้า Creator Studio draft, Public Gallery contract panel แบบ disabled/empty ไม่มีข้อมูลสาธารณะปลอม, backend template/preflight route, Prisma generation model/migration, `POST /generation/jobs` แบบ blocked/no-debit persistence เมื่อ DB/migration พร้อม, owner library read routes (`GET /generation/jobs`, `GET /generation/jobs/:id`), owner output favorite/unfavorite routes, owner output download URL route (`GET /generation/outputs/:id/download`), owner output delete route (`DELETE /generation/outputs/:id`), frontend helper/read path ผ่าน API boundary, และ visible blocked-state QA matrix
- AI Creator งานต่อทันทีตาม `docs/AI_CREATOR_FLOW_GAP_PLAN.md`: retry failed generation job, use-as-cover bridge, signed URL expiry/refresh UI state, backend `coverUrl` publish contract, และ backend signed-output guard เสร็จแล้ว; ต่อไปคือ tighten template-aware upload validation, browser smoke for signed output/cover rendering when fixtures exist, then Public Gallery opt-in/sanitized/report/moderation/audit
- Wallet `/wallet`: balance, usage ledger, model cost breakdown, future payment placeholders, BYOK mode summary
- Profile `/profile`: persona, content mode, account, language, BYOK/developer settings
- Events `/events`: pending scene/event inbox พร้อม jump-to-chat
- Admin pages: `/moderation`, `/admin/health`, `/admin/prompt-inspector`, `/admin/evals` เป็น tool/dashboard layout ไม่ใช่ marketplace

## เกณฑ์คุณภาพปัจจุบัน (Current Quality Bar)

ก่อนถือว่า UI งานหลักเสร็จ ต้องผ่าน:

- `bun run frontend:static:audit`
- `bun run frontend:route:audit`
- `bun run frontend:components:test`
- `bun run frontend:check`
- `bun run route-menu:audit`
- `bun run e2e:smoke`

ก่อนถือว่า repo พร้อมส่งต่อ ต้องผ่าน:

- `bun run qa:repo`
- `bun run qa:full` เมื่อ local backend/PostgreSQL พร้อม

## ตัวกั้นภายนอก (External Blockers)

สิ่งที่ยังไม่ถือว่าจบด้วย local QA:

- deployed HTTPS backend/frontend URLs
- production/staging `DATABASE_URL`
- production CORS origins
- Supabase signed `avatars` verification
- live chat provider smoke
- live image provider smoke
- real payment/top-up flow
