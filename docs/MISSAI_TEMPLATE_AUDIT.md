# MissAI Template Migration Audit

เอกสารนี้เป็น contract สำหรับการย้าย UI ของ Maprang ให้ยึด `D:\missai.me` เป็น visual source หลัก โดยยังคง React/Vite/Redux/API เดิมของ Maprang

## Template Source

- Reference root: `D:\missai.me`
- Import assets: `D:\missai.me\fonts` เท่านั้น
- Do not import: `_next`, Next runtime chunks, generated route scripts, analytics scripts
- Frontend target: `apps/frontend`

## Required Design Utilities

ทุกหน้าใหม่หรือหน้าที่ refactor แล้วควรใช้ utility กลางแทนการฝังสีซ้ำเอง:

- `missai-page`
- `missai-shell`
- `missai-card`
- `missai-button-primary`
- `missai-button-secondary`
- `missai-button-danger`
- `missai-icon-button`
- `missai-input`
- `missai-dialog`
- `missai-rail`
- `missai-sidebar`
- `missai-bottom-nav`
- `missai-menu`
- `missai-menu-item`
- `missai-menu-item-danger`
- `missai-tab`
- `missai-tab-active`
- `missai-badge`
- `missai-empty`

## Template Mapping

| MissAI source | Maprang route | Shell | Required behavior |
| --- | --- | --- | --- |
| `home.html` | `/` | Marketplace | ค้นหา, filter, category chips, character rails, continue chatting, card ไป lobby ได้จริง |
| `history.html` | `/chats` | Marketplace | รายการแชท scan ง่าย, three-dot menu, pin/unpin, archive, select, delete, bulk action |
| `creation.html` | `/create` | Marketplace | รูปอยู่กลาง/เด่น, link รูปอยู่ด้านล่าง, AI draft/image มี loading/fallback/error/fill state |
| `ai-creator.html` | `/ai-creator` | Marketplace | เชื่อม creator draft/image endpoint, แสดง live/fallback provider ชัด |
| `notifications.html` | `/events` | Marketplace | pending scene จากทุก chat เข้า chat ได้จริง |
| `points.html`, `points.1.html` | `/wallet` | Marketplace | balance, usage ledger, token state, future top-up state |
| `settings.html` | `/profile` | Marketplace | persona, content settings, developer settings/BYOK, account state |
| `announcements.html` | `/announcements` | Marketplace | ข่าวระบบจริงหรือ empty state พร้อม action |
| `support.html` | `/support` | Marketplace | FAQ, feedback/support action, readable disabled/loading state |
| `creators.html` | `/creators` | Marketplace | creator ranking/discovery และ link ไปผลงาน/ตัวละครได้ |
| `favorites.html` | `/favorites` | Marketplace | favorite list, empty state, link กลับ marketplace |
| `works.html` | `/works` | Marketplace | งานของผู้ใช้, draft/published state, link ไป create/profile |
| `creative-plaza.html` | `/` หรือ `/ai-creator` | Marketplace | ใช้เป็น community/creator discovery section ไม่สร้าง route ลอยถ้ายังไม่มี scope |

## Maprang Exclusive Mapping

| Maprang route | Shell | Required behavior |
| --- | --- | --- |
| `/chat`, `/chat/:chatId` | Chat | sidebar แชท, stage กลาง, composer เดียว, relationship bar, scene notice, world state, report, wallet warning |
| `/characters/:id` | Marketplace | character lobby, Relationship Contract, start chat ส่ง `relationship_seed` |
| `/moderation` | Admin | report queue, status update, admin action, audit log |
| `/admin/health` | Admin | readiness blockers, deploy/storage/provider state |
| `/admin/prompt-inspector` | Admin | final prompt, section token estimate, diff |
| `/admin/evals` | Admin | eval status/run history |

## Functional Rules

- ทุก nav item ต้องมี route จริงใน `App.tsx`
- ทุกปุ่มที่เห็นต้องมี action จริง หรือ disabled พร้อม `title`/`aria-label` ที่ผู้ใช้อ่านรู้เรื่อง
- ทุก empty state ต้องมี next action ที่กดได้
- ห้ามมี user-facing mojibake, replacement character, C1 control character
- ห้าม copy `_next` runtime/chunks เข้า frontend source

## QA Gate

- `bun run missai:template:audit`
- `bun run frontend:static:audit`
- `bun run frontend:route:audit`
- `bun run route-menu:audit`
- `bun run e2e:smoke`
