# Maprang AI Development Process Summary

Last updated: 2026-06-17

เอกสารนี้สรุปภาพรวมกระบวนการพัฒนาเว็บ Maprang AI ในสถานะปัจจุบัน โดยยึด repo จริงและ QA gate ล่าสุดเป็น source of truth ไม่ยึดเอกสารเก่าที่อาจพูดถึง stack หรือ route ที่เลิกใช้แล้ว

## สถานะรวมล่าสุด

สถานะปัจจุบันแบ่งเป็น 3 ระดับ:

- Local server: พร้อมใช้งานเป็นเป้าหมายหลักตอนนี้
- Temporary Ngrok staging: ใช้พรีวิว/ทดสอบผ่าน HTTPS ได้ แต่ไม่ใช่ production ถาวร
- Cloud production: ยัง no-go จนกว่า live image provider และ permanent deploy evidence จะผ่านครบ

หลักฐานล่าสุด:

- `bun run qa:full` ผ่านสำหรับ local server
- `bun run e2e:smoke` ผ่านทั้ง desktop/mobile ผ่าน Ngrok เมื่อใช้ frontend `vite preview`
- `bun run staging:verify` ผ่านบน Ngrok staging
- live chat normal/stream ผ่าน และมี token usage + wallet debit evidence
- `bun run production:check` ยังไม่ผ่าน เพราะ live image/creator draft provider ตอบ 503/524 และ fallback เป็น draft/image ในเครื่อง
- `RELEASE_HANDOFF.md` ถูกตั้งเป็น `no-go` ตามผลจริงล่าสุด

## Stack ปัจจุบัน

Frontend:

- React 19
- Vite
- Redux Toolkit
- Tailwind/CSS utilities ที่ปรับตาม MissAI template
- Playwright e2e smoke

Backend:

- Bun
- Elysia
- Prisma
- PostgreSQL
- Supabase JWT auth
- Supabase Storage bucket `avatars` แบบ private + signed URL

AI/runtime:

- Local/dev: `local/mock-roleplay`
- Live chat: OpenRouter-compatible provider
- Live image: image provider จริงที่ยังต้องผ่าน clean production smoke
- BYOK: มี server-side provider key vault แล้ว ไม่เก็บ raw key ใน localStorage

## หน้าเว็บหลัก

หน้า product และ admin ที่ต้องถือว่าอยู่ใน scope ปัจจุบัน:

- `/` สำรวจตัวละคร
- `/characters/:id` Character Lobby และ Relationship Contract
- `/chat` และ `/chat/:chatId`
- `/chats`
- `/create`
- `/ai-creator`
- `/events`
- `/wallet`
- `/profile`
- `/moderation`
- `/admin/health`
- `/admin/prompt-inspector`
- `/admin/evals`
- `/announcements`
- `/creators`
- `/favorites`
- `/works`
- `/support`

หลักการคือทุกเมนูที่เห็นต้องเปิด route ได้จริง หรือมี disabled/empty state ที่บอกเหตุผลชัดเจน

## กระบวนการพัฒนาที่ใช้ตอนนี้

### 1. Repo Baseline

เป้าหมายคือให้ source code, docs, route audit, API audit และ QA gate ตรงกัน

สิ่งที่ทำแล้ว:

- ล้าง temp/scratch artifacts ออกจาก source
- เพิ่ม local/ngrok/runbook scripts
- เพิ่ม remaining-plan audit
- เพิ่ม route/menu/API/static audit
- เพิ่ม release handoff guard
- เพิ่ม memory/status เพื่อให้ agent รอบถัดไปรู้สถานะจริง

คำสั่งสำคัญ:

```powershell
bun run secrets:check
bun run docs:commands
bun run memory:audit
bun run remaining-plan:audit
bun run predeploy:check
git diff --check
```

### 2. Frontend Process

แนวทางออกแบบ:

- ใช้ MissAI เป็น template หลักด้าน structure/density/navigation
- UI ของ Maprang เพิ่มระบบเฉพาะ เช่น Relationship, Scene, AI Creator, BYOK, Admin Health
- Mobile-first โดยเฉพาะ chat composer, drawer, bottom nav, modal และ upload state
- ทุกปุ่มต้องมี action จริงหรือ disabled reason

สิ่งที่ทำแล้ว:

- Explore/Marketplace
- Character Lobby
- Chat shell
- My Chats พร้อมเมนู rename, pin/unpin, archive, select, delete
- Creator Studio
- AI Creator
- Wallet/BYOK
- Profile/Persona
- Events Inbox
- Moderation/Admin pages
- Prompt Inspector/Evals

QA ที่ใช้:

```powershell
bun run frontend:static:audit
bun run frontend:route:audit
bun run frontend:components:test
bun run frontend:check
bun run e2e:smoke
```

### 3. Backend/API Process

เป้าหมายคือ API ทุกตัวที่ frontend ใช้ต้องผ่าน helper กลางและมี smoke/test/audit coverage

สิ่งที่ทำแล้ว:

- Chat normal/stream
- Relationship presets/preview/validation
- Scene state, world state, timeline, memory context
- Characters/lore/duplicate/reset
- Creator draft/preview
- Generation jobs/outputs/library/public gallery
- Reports/moderation/admin actions/audit logs
- Wallet/token ledger
- User persona/content settings/BYOK vault
- Admin health/prompt inspector/evals

QA ที่ใช้:

```powershell
bun run api:audit
bun run backend:check
bun run backend:check:db:test
bun run security:audit
bun run smoke:local
bun run api:smoke
```

### 4. Database Process

ฐานหลักคือ PostgreSQL + Prisma

แนวทาง:

- ใช้ migrations เป็นหลัก ไม่กลับไป SQLite
- Query สำคัญต้องมี index หรือ guard
- Owner guard ต้องป้องกัน cross-user access
- Report/admin audit ต้องเก็บหลักฐาน action สำคัญ

สิ่งที่มีแล้ว:

- Character, Chat, Message, Report, Token, Generation, Provider Key, Audit models
- Migration สำหรับ cover URL, image generation token type, provider key vault
- Signed-storage owner guard
- Report retention/cascade behavior
- Large saved-chat window guard

คำสั่ง:

```powershell
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
```

### 5. Local Server Process

ตอนนี้ local server เป็นเป้าหมายหลักก่อน cloud production

ใช้ไฟล์หลัก:

- `docs/LOCAL_SERVER_RUNBOOK.md`
- `scripts/local-server-up.ts`
- `scripts/local-server-doctor.ts`
- `scripts/local-db-backup.ts`

เปิดระบบแบบรวบรัด:

```powershell
bun run local:up
```

ตรวจ local:

```powershell
bun run local:doctor
bun run qa:full
```

หมายเหตุ: `qa:full` จะรัน browser smoke แล้ว seed QA data กลับให้ระบบยังมีตัวละคร/แชททดสอบพร้อมเล่น

### 6. Ngrok Staging Process

Ngrok ใช้เป็น temporary HTTPS staging เท่านั้น

สถานะล่าสุด:

- URL: `https://subplot-unworthy-exorcist.ngrok-free.dev`
- ใช้ single-origin proxy ไปยัง frontend preview และ backend
- e2e ต้องใช้ `vite preview` ไม่ใช้ `vite dev` เพื่อเลี่ยง Vite HMR WebSocket error

คำสั่งสำคัญ:

```powershell
bun run ngrok:proxy
bun run staging:verify
bun run e2e:smoke
```

สิ่งที่ผ่านแล้ว:

- frontend/backend ผ่าน Ngrok
- health/ready ผ่าน
- e2e desktop/mobile ผ่าน
- live chat ผ่าน normal + stream
- storage signed URL check ผ่านใน current env

### 7. Production Process

Production ยังไม่ถือว่าพร้อม

สิ่งที่ต้องมีสำหรับ production จริง:

- Backend HTTPS URL ถาวร
- Frontend HTTPS domain ถาวร
- `CORS_ORIGINS` เป็น frontend origin จริง
- `VITE_API_BASE_URL` และ `SMOKE_API_BASE_URL` เป็น backend URL จริง
- Managed PostgreSQL production/staging
- Supabase project/bucket จริง
- Live chat smoke ผ่าน
- Live image smoke ผ่านแบบไม่ fallback
- Traceable deploy artifact เช่น Render deploy id, Railway deployment id, Vercel deployment id, Docker digest, หรือ GitHub Actions run

คำสั่ง:

```powershell
bun run smoke:chat
bun run smoke:image:live
bun run production:check
bun run release:handoff:check
```

สถานะล่าสุด:

- Chat provider: ผ่าน
- Image provider: ยังไม่ผ่าน clean production gate
- `production:check`: fail เพราะ `/creator/ai-draft` fallback หลัง provider 503/524
- `RELEASE_HANDOFF.md`: no-go

## QA Gate ระดับต่าง ๆ

### Gate สั้นก่อนแก้งานต่อ

```powershell
bun run secrets:check
bun run frontend:static:audit
bun run api:audit
git diff --check
```

### Gate หลังแก้ frontend

```powershell
bun run frontend:components:test
bun run frontend:check
bun run e2e:smoke
```

### Gate หลังแก้ backend/API

```powershell
bun run api:audit
bun run backend:check
bun run smoke:local
bun run api:smoke
```

### Gate เต็มของ repo

```powershell
bun run qa:repo
```

### Gate เต็มของ local server

```powershell
bun run qa:full
```

### Gate สำหรับ production จริง

```powershell
bun run staging:verify
bun run smoke:chat
bun run smoke:image:live
bun run production:check
```

## สิ่งที่ถือว่าเสร็จแล้วในเป้าหมาย local

- Local play flow ใช้งานได้
- Explore/Lobby/Chat/My Chats/Create/AI Creator/Wallet/Profile/Events/Moderation/Admin routes มี coverage
- Backend/API เชื่อมกับ frontend helper แล้ว
- PostgreSQL/Prisma เป็นฐานหลัก
- Chat normal/stream รองรับ local และ live path
- Relationship/Scene/Timeline/World State/Memory ถูกผูกกับ runtime
- Report/Admin audit มี backend และ UI
- Prompt Inspector/Evals ใช้งานได้
- BYOK vault ฝั่ง server พร้อม local-safe flow
- Browser smoke desktop/mobile ผ่าน
- Route/menu/API/static/docs/memory audits ผ่านตาม gate ล่าสุด

## สิ่งที่ยังเหลือ

เหลือเฉพาะส่วนที่ต้องพึ่ง external production environment:

- Deploy backend/frontend ไป hosting จริง
- ตั้ง CORS/domain จริง
- ตั้ง production/staging DB จริง
- ยืนยัน Supabase storage บน environment นั้น
- แก้หรือเปลี่ยน live image provider ให้ผ่าน `production:check`
- เติม release handoff ด้วย deploy artifact ที่ trace ได้จริง
- เปลี่ยน Go/no-go เป็น `go` หลัง production smoke ผ่านครบ

## ไฟล์อ้างอิงสำคัญ

- `AGENTS.md`: กติกาการทำงานของ agent
- `agent.md`: handoff สำหรับ agent ใน repo นี้
- `START_HERE.md`: วิธีเริ่มรัน repo
- `docs/LOCAL_SERVER_RUNBOOK.md`: วิธีเปิด local server
- `docs/NGROK_STAGING_RUNBOOK.md`: วิธีใช้ Ngrok staging
- `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`: แผนงานที่เหลือ
- `docs/MAPRANG_TEST_PLAN.md`: test plan ปัจจุบัน
- `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`: core play/create scope
- `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`: AI Creator scope
- `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`: reference จาก MissAI
- `RELEASE_HANDOFF.md`: หลักฐานปล่อย release และ go/no-go
- `memory/working-context.md`: context ล่าสุด
- `memory/qa-status.md`: สถานะ QA ล่าสุด
- `memory/deploy-blockers.md`: blocker ก่อน deploy

## แนวทางทำงานต่อ

ถ้าจะพัฒนาต่อในเครื่องนี้ ให้เริ่มจาก local target:

1. อ่าน `AGENTS.md`
2. อ่าน `docs/MAPRANG_DEVELOPMENT_PROCESS_SUMMARY.md`
3. อ่าน `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`
4. รัน `bun run local:doctor`
5. ทำงานเฉพาะ task ที่เป็น local/repo-owned
6. ปิดด้วย `bun run qa:full`

ถ้าจะไป production ให้เริ่มจาก deploy target:

1. เตรียม backend/frontend HTTPS domains จริง
2. ตั้ง env จริง
3. รัน staging smoke
4. รัน live chat/image smoke
5. รัน `bun run production:check`
6. อัปเดต `RELEASE_HANDOFF.md` เฉพาะเมื่อผ่านจริง
