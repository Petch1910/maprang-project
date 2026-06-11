# Maprang AI Test Plan

Last updated: 2026-06-11

เอกสารนี้แทน test plan เก่าที่ไม่ตรงกับ repo ปัจจุบัน ให้ใช้เป็น source of truth สำหรับการตรวจระบบก่อน deploy

## Current Architecture

- Frontend: React 19, Vite, Redux Toolkit, Tailwind, Playwright
- Backend: Bun, Elysia, Prisma, PostgreSQL
- Auth: local dev header ในเครื่อง, Supabase JWT สำหรับ production
- Storage: local fallback ในเครื่อง, Supabase Storage `avatars` แบบ signed URL สำหรับ production
- AI chat: `local/mock-roleplay` ใน local QA, OpenRouter/live provider สำหรับ staging/production
- AI image: fallback image ใน local ถ้าไม่มี provider, live image provider ต้อง verified ก่อน production

## Status Taxonomy

ใช้สถานะเหล่านี้เท่านั้นเมื่อเขียน test plan, route/menu audit, หรือ deploy handoff:

| Status | Meaning |
| --- | --- |
| `local ready` | ใช้ได้ครบในเครื่องและต้องผ่าน repo/runtime smoke |
| `guarded` | ใช้ได้แต่ต้องมี admin/auth guard หรือ audit log ชัดเจน |
| `staging required` | ต้องมี HTTPS staging, staging DB, CORS จริง, หรือ Supabase จริงก่อนถือว่าผ่าน |
| `production blocker` | ยังปล่อย production ไม่ได้จนกว่าจะมี credential/domain/provider ภายนอกและ smoke ผ่าน |
| `future` | งานเผื่ออนาคต ยังไม่ควรเป็น route/menu ที่ผู้ใช้กดแล้วคาดหวังผลจริง |

## Route Coverage

Route ที่ต้องตรวจใน browser smoke:

Route source: App.tsx declares 14 routes; test plan groups them into 13 product surfaces.

หมายเหตุ: `App.tsx` ประกาศ route จริง 14 รายการ เพราะแยก `/chat` และ `/chat/:chatId` ออกจากกัน แต่ในแผนทดสอบให้นับเป็น 13 product surfaces โดยรวมสอง route นี้เป็นพื้นผิว "ห้องแชท" เดียวกัน การรัน `bun run frontend:route:audit` ต้องเห็น 14 รายการและไม่มี finding

| Route | Purpose | Required status |
| --- | --- | --- |
| `/` | สำรวจตัวละครและเล่นต่อ | local ready |
| `/characters/:id` | Character Lobby และ relationship contract | local ready |
| `/chat`, `/chat/:chatId` | ห้องแชท, scene mode, report, world state | local ready |
| `/chats` | กล่องแชท, เมนูสามจุด, bulk actions | local ready |
| `/create` | Creator Studio, AI draft, upload, preview simulator | local ready |
| `/events` | Pending events inbox | local ready |
| `/profile` | Persona, content mode, account state | local ready |
| `/wallet` | Token balance, usage, admin adjustment guard | local ready |
| `/moderation` | Report queue และ admin audit log | guarded |
| `/admin/health` | Deploy readiness dashboard | guarded |
| `/admin/prompt-inspector` | Redacted prompt snapshot และ diff | guarded |
| `/admin/evals` | Automated prompt/context evals | guarded |
| `*` | Not found fallback | local ready |

ไม่เพิ่ม route เก่าจากเอกสารภายนอก เช่น leaderboard, store, subscription จนกว่าจะเป็น product scope จริง

## API And Backend Coverage

ต้องรักษา gate เหล่านี้ให้ผ่าน:

```powershell
bun run api:audit
bun run backend:check
bun run backend:check:db:test
```

สิ่งที่ต้องครอบคลุม:

- Frontend API helper ต้องเรียก route ที่ backend มีจริง
- Admin routes ต้องมี `ADMIN_API_KEY`
- Owner resources ต้องใช้ user/owner guard
- Chat local runtime ต้องตอบยาวพอสำหรับ roleplay และไม่ใช้เครดิต provider
- Stream chat ต้องส่ง delta และ done event ได้
- Creator AI draft ต้องมี fallback ที่บอกสถานะชัดเจนเมื่อยังไม่มี live image provider
- Token ledger ต้องบันทึก balance และ usage ถูกต้อง
- Report/admin actions ต้องสร้าง audit log
- Upload/storage ต้องแยก local fallback ออกจาก Supabase signed production path

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

- ทุกปุ่มมีผลจริง หรือ disabled พร้อมเหตุผลภาษาไทย
- ไม่มี route/menu ที่กดแล้วตัน
- Empty state ต้องบอกผู้ใช้ว่าทำอะไรต่อได้
- Mobile viewport ต้องผ่านสำหรับ `/`, `/chat`, `/create`, `/chats`, `/wallet`, `/moderation`, `/admin/health`
- API error ต้องผ่าน helper กลางและไม่โชว์ raw technical error
- UI ใช้ธีมเดียวกันเป็น dark-first และไม่มี horizontal overflow
- Component/unit coverage ต้องครอบ core UI อย่างน้อย: chat composer, message bubble, character card, relationship picker, report dialog, และ creator readiness/form flow
- E2E smoke ต้องตรวจ state สำคัญ ไม่ใช่แค่ render route: create draft, AI draft fallback/live flag, chat send local, chat menu actions, report, wallet, moderation, admin health, และ mobile viewport

## QA Gates

Baseline/docs:

```powershell
bun run secrets:check
bun run docs:commands
bun run test-plan:audit
git diff --check
```

Repo-owned local:

```powershell
bun run qa:repo
```

Runtime local:

```powershell
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```

หมายเหตุ: `bun run smoke:local` ต้องตรวจ local chat runtime เมื่อ backend health รายงานว่าใช้ local provider โดยยิง `POST /chat` และ `POST /chat/stream`, ตรวจว่ามี `chatId`, คำตอบยาวถึงขั้นต่ำ roleplay, stream มี delta/done event, model เป็น local runtime ที่คาดไว้, และ `totalTokens=0`

หมายเหตุ: `bun run e2e:smoke` ต้องตรวจ PostgreSQL ผ่าน `apps/backend/src/db.required-check.ts` ก่อน `qa:seed` เสมอ เพื่อกัน browser smoke ทำงานต่อเมื่อ Docker/Postgres ยังไม่พร้อมหรือ DB เชื่อมต่อไม่ได้

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
- `/admin/health` ไม่มี blocker ที่เกิดจาก env/provider/storage/CORS

## Acceptance Criteria

ระบบถือว่า local-complete เมื่อ:

- `bun run qa:full` ผ่าน
- `bun run api:audit` ผ่าน
- `bun run route-menu:audit` ผ่าน
- เปิด browser smoke ได้ครบทั้ง desktop/mobile
- ไม่มีไฟล์ทดลองหรือเอกสารเก่าที่ทำให้ audit fail
- เอกสารหลักทั้งหมดชี้ไป PostgreSQL/Prisma/Bun/local QA roleplay ทางเดียวกัน

ระบบถือว่า production-ready เมื่อ:

- staging ผ่าน `bun run staging:verify`
- live chat และ live image smoke ผ่าน
- Supabase signed storage ผ่าน
- production env doctor และ `bun run production:check` ผ่าน
- release handoff มี URL, commit, migration, QA gate, live provider evidence, และ go/no-go ครบ
