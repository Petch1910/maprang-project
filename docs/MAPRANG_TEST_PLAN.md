# Maprang AI Test Plan

Last updated: 2026-06-28

เอกสารนี้แทน test plan เก่าที่ไม่ตรงกับ repo ปัจจุบัน ให้ใช้เป็น source of truth สำหรับ QA gate ก่อน staging/production โดยยึดระบบจริงใน repo ไม่ยึดเอกสารภายนอกหรือ docx รุ่นเก่า

## Current Architecture

- Frontend: React 19, Vite, Redux Toolkit, Tailwind, Playwright
- Backend: Bun, Elysia, Prisma, PostgreSQL
- Auth: local dev header ในเครื่อง, Supabase JWT สำหรับ production
- Storage: local fallback ในเครื่อง, Supabase Storage `avatars` แบบ signed URL สำหรับ production
- AI chat: `local/mock-roleplay` ใน local QA, OpenRouter/live provider สำหรับ staging/production
- AI image: system draft image ใน local เมื่อไม่มี provider, live image provider ต้อง verified ก่อน production
- UI template direction: MissAI/Khuiai-like marketplace shell plus Maprang relationship/scene/memory systems
- Core product direction: `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md` โฟกัส Chat play loop, Creator Studio, Character Lobby, My Chats, Credit usage state และ AI Creator image workflow ก่อนระบบรอง

## Status Taxonomy

ใช้สถานะเหล่านี้เท่านั้นเมื่อเขียน test plan, route/menu audit หรือ deploy handoff:

| Status | Meaning |
| --- | --- |
| `local ready` | ใช้ได้ครบในเครื่องและต้องผ่าน repo/runtime smoke |
| `guarded` | ใช้ได้แต่ต้องมี admin/auth guard หรือ audit log ชัดเจน |
| `staging required` | ต้องมี HTTPS staging, staging DB, CORS จริง หรือ Supabase จริงก่อนถือว่าผ่าน |
| `production blocker` | ยังปล่อย production ไม่ได้จนกว่าจะมี credential/domain/provider ภายนอกและ smoke ผ่าน |
| `future` | งานเผื่ออนาคต ยังไม่ควรเป็น route/menu ที่ผู้ใช้กดแล้วคาดหวังผลจริง |

## Route Coverage

Route source: App.tsx declares 20 routes; test plan groups them into 13 product surfaces.

Compatibility snippet: Route source: App.tsx declares 15 routes; test plan groups them into 13 product surfaces.

หมายเหตุ: `App.tsx` ประกาศ route จริง 20 รายการ เพราะแยก route technical เช่น `/chat` และ `/chat/:chatId` ออกจากกัน แต่ QA/product planning นับเป็น 13 product surfaces เพื่อให้ตรวจตามประสบการณ์ผู้ใช้ ไม่ใช่จำนวน path ดิบอย่างเดียว

| Route | Product surface | Purpose | Required status |
| --- | --- | --- | --- |
| `/` | Explore | ตลาดตัวละคร, continue chatting, search/filter/rails | local ready |
| `/characters/:id` | Character Lobby | โปรไฟล์ตัวละครและ Relationship Contract | local ready |
| `/chat`, `/chat/:chatId` | Chat Room | ห้องแชท, scene mode, report, world state, memory | local ready |
| `/chats` | My Chats | กล่องแชท, three-dot menu, bulk actions | local ready |
| `/create` | Creator Studio | สร้างตัวละคร, AI draft, upload, preview simulator | local ready |
| `/ai-creator` | AI Creator | สร้างภาพ/ร่างภาพ, permission/cost/provider state | local ready |
| `/events` | Events Inbox | pending scene/event inbox | local ready |
| `/profile` | Profile/Persona | persona, content mode, account state, BYOK settings | local ready |
| `/wallet` | Credit Usage | credit balance, usage ledger, admin adjustment guard | local ready |
| `/announcements` | Announcements | ข่าวสาร/อัปเดตระบบ | local ready |
| `/creators` | Creators | อันดับ/ค้นหานักสร้าง | local ready |
| `/favorites` | Favorites | ตัวละครโปรด | local ready |
| `/works` | Works | ผลงาน/draft/published ของผู้สร้าง | local ready |
| `/support` | Support | FAQ/support/feedback | local ready |
| `/moderation` | Moderation | report queue และ admin audit log | guarded |
| `/admin/health` | Admin Health | deploy readiness dashboard | guarded |
| `/admin/prompt-inspector` | Prompt Inspector | redacted prompt snapshot และ diff | guarded |
| `/admin/evals` | Automated Evals | prompt/context eval status | guarded |
| `*` | Not Found | fallback route | local ready |

ไม่เพิ่ม route เก่าจากเอกสารภายนอก เช่น leaderboard, store, subscription จนกว่าจะเป็น product scope จริง

AI Creator test status note:

- `/ai-creator` เป็น `local ready` สำหรับ UI/local-safe workflow: template/cost state, upload preview/validation helper, blocked reasons, My Library detail/actions, Creator Studio reuse, owner download/signed URL state, and Public Gallery opt-in/sanitized/reuse/report path.
- ยังไม่ถือว่า production-ready สำหรับ generation library จนกว่า live image provider, Supabase signed storage, deployed backend/frontend, CORS จริง, และ production moderation/runbook verification ผ่าน gate.
- QA ต้องไม่ตี fallback/system image เป็น live provider success.

## Frontend Coverage

ต้องรักษา gate เหล่านี้ให้ผ่าน:

```powershell
bun run frontend:static:audit
bun run frontend:route:audit
bun run frontend:components:test
bun run frontend:check
bun run route-menu:audit
```

สิ่งที่ต้องตรวจ:

- ทุกปุ่มมีผลจริง หรือ disabled พร้อมเหตุผลภาษาไทยที่อ่านรู้เรื่อง
- ไม่มี route/menu ที่กดแล้วตัน
- Empty state ต้องมี next action ที่กดได้จริง
- Mobile viewport ต้องผ่านสำหรับ `/`, `/chat`, `/create`, `/chats`, `/wallet`, `/moderation`, `/admin/health`
- API error ต้องผ่าน helper กลางและไม่โชว์ raw technical error โดยไม่จำเป็น
- UI เป็น dark-first และไปทางเดียวกับ MissAI template reference
- ไม่มี horizontal overflow ที่เกี่ยวข้องกับหน้าหลัก
- Component/unit coverage ต้องครอบ core UI อย่างน้อย: chat composer, message bubble, character card, relationship picker, report dialog, creator readiness/form flow
- E2E smoke ต้องตรวจ state สำคัญ ไม่ใช่แค่ render route: create draft, AI draft system-draft/live flag, chat send local, chat menu actions, report, wallet, moderation, admin health, mobile viewport

## Backend/API Coverage

ต้องรักษา gate เหล่านี้ให้ผ่าน:

```powershell
bun run api:audit
bun run backend:check
bun run backend:check:db:test
```

สิ่งที่ต้องครอบคลุม:

- Frontend API helper ต้องเรียก route ที่ backend มีจริง
- Admin routes ต้องใช้ `ADMIN_API_KEY`
- Owner resources ต้องมี user/owner guard
- Chat local runtime ต้องตอบยาวพอสำหรับ roleplay และไม่ใช้ provider credit
- Stream chat ต้องส่ง delta และ done event ได้
- Saved chats ต้องคืนรายการแชทและ bounded message window
- Chat world state ต้อง get/patch ได้เพื่อรองรับ scene/universe continuity
- Creator AI draft ต้องมี system draft image/fallback status เมื่อยังไม่มี live image provider
- AI Creator ต้องมี template/cost state, upload validation, blocked reason, generation job/library state และไม่หัก token ก่อน backend รับ job ผ่าน validation
- Creator Preview simulator ต้องตอบ local preview โดยไม่สร้าง chat จริง
- Credit ledger ต้องบันทึก balance/usage ถูกต้อง
- Report/admin actions ต้องสร้าง audit log
- Upload/storage ต้องแยก local fallback ออกจาก Supabase signed production path

## Runtime QA Gates

Baseline/docs:

```powershell
bun run secrets:check
bun run docs:commands
bun run test-plan:audit
git diff --check
```

Repo-owned deterministic gate:

```powershell
bun run qa:repo
```

Local runtime gate:

```powershell
bun run qa:seed
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```

Full local:

```powershell
bun run qa:full
```

DB-focused local:

```powershell
bun run backend:check:db:test
bun run backend:check:db
```

Staging:

```powershell
bun run staging:verify
```

Production:

```powershell
bun run production:check
```

## Production Blockers

Production ยังไม่ถือว่าพร้อมจนกว่าจะมีหลักฐานจริง:

- Backend HTTPS origin
- Frontend HTTPS origin
- `CORS_ORIGINS` เป็น frontend HTTPS origin จริง
- Production `DATABASE_URL`
- Supabase JWT configured
- Supabase Storage bucket `avatars` private + signed URL
- `bun run smoke:chat` ผ่านกับ live chat provider
- `bun run smoke:image:live` ผ่านกับ live image provider
- `/admin/health` ไม่มี blocker จาก env/provider/storage/CORS

## Acceptance Criteria

ระบบถือว่า local-complete เมื่อ:

- `bun run qa:full` ผ่าน
- `bun run api:audit` ผ่าน
- `bun run route-menu:audit` ผ่าน
- Browser smoke ผ่านทั้ง desktop/mobile
- ไม่มีไฟล์ทดลองหรือเอกสารเก่าที่ทำ audit fail
- เอกสารหลักทั้งหมดชี้ไป PostgreSQL/Prisma/Bun/local QA roleplay ทางเดียวกัน
- UI หลักยึด MissAI template direction และ Maprang-exclusive systems ไม่ขัดกัน

ระบบถือว่า production-ready เมื่อ:

- staging ผ่าน `bun run staging:verify`
- live chat และ live image smoke ผ่าน
- Supabase signed storage ผ่าน
- production env doctor และ `bun run production:check` ผ่าน
- release handoff มี URL, commit, migration, QA gate, live provider evidence และ go/no-go ครบ
