# โปรเจกต์ Maprang (Maprang Project)

แพลตฟอร์ม AI character chat ที่มี relationship state, scene events, creator tools, usage tracking, wallet ledger, และ production-ready auth/storage hooks.

## ตั้งค่า local

1. เปิด Postgres:

```bash
docker compose up -d postgres
```

2. ตั้งค่า Backend env:

```bash
cp apps/backend/.env.example apps/backend/.env
```

ใส่ `OPENROUTER_API_KEY`. ค่า Supabase เป็น optional สำหรับ local dev. Avatar uploads จะใช้ local disk เป็นค่าเริ่มต้น และจะเปลี่ยนไปใช้ Supabase Storage เมื่อมี `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, และ `SUPABASE_STORAGE_BUCKET`.
อย่า track ไฟล์ `.env` และ `.env.*` จริงใน git. Repo อนุญาตเฉพาะ env templates เช่น `.env.example` และ `.env.production.example`; `secrets:check` จะ fail ถ้ามี tracked `.env` จริง.

Creator Studio ร่างเนื้อหาตัวละครภาษาไทยผ่าน OpenRouter ได้. การสร้าง AI avatar จริงเป็นตัวเลือกเสริมและต้องมี `IMAGE_GENERATION_API_KEY`; ถ้าไม่มี key ระบบจะใช้ภาพตัวอย่างชั่วคราวที่ระบุชัด แต่ยังเติม character fields ให้ได้.

3. ตั้งค่า Frontend env:

```bash
cp apps/frontend/.env.example apps/frontend/.env
```

ปล่อยว่างหรือละไฟล์นี้ได้สำหรับ local dev auth mode.
ตั้ง `VITE_API_BASE_URL` เมื่อ backend ไม่ได้รันที่ `http://localhost:3000`.

สำหรับ local development ที่ใช้ Supabase credentials จริง ให้คง `STORAGE_PROVIDER=local` ใน `apps/backend/.env`. วิธีนี้ทำให้ auth ใช้ Supabase ได้ แต่ avatar tests และ local uploads ยังอยู่บน disk. ใช้ `STORAGE_PROVIDER=supabase` เฉพาะ production หรือเมื่อตั้งใจทดสอบ Supabase Storage. ถ้าต้องการสร้างหรือตรวจ bucket `avatars` แบบ private signed ให้รัน `bun run supabase:storage:setup`; ใช้ `bun run supabase:storage:check` สำหรับ read-only verification.

4. ติดตั้งและ migrate:

```bash
cd apps/backend
bun install
bunx prisma generate
bunx prisma migrate deploy
```

5. รัน apps:

```bash
cd apps/backend
bun run start
```

```bash
cd apps/frontend
bun run dev --host 127.0.0.1
```

Frontend: `http://127.0.0.1:5173`
Backend health: `http://127.0.0.1:3000/health`
Backend readiness: `http://127.0.0.1:3000/ready`

## เครื่องมืออ่านโค้ดในเครื่อง (Local Codebase Intelligence)

Workspace นี้เตรียมไว้ให้ใช้ SocratiCode เป็น local MCP codebase intelligence tool. การตั้งค่าอยู่ที่
`C:\Users\Phet\.codex\config.toml` และใช้ `.socraticodeignore` ของโปรเจกต์เพื่อข้าม dependencies, build output, local
runtime files, binary assets, และ env secrets.

หลัง restart Codex ให้สั่ง assistant index codebase นี้. ใช้ SocratiCode เป็น local development tool เท่านั้น; อย่าเพิ่มเป็น Maprang runtime dependency จนกว่าจะ review licensing แยกต่างหาก.

## ความจำโปรเจกต์ (Project Memory)

บริบทโปรเจกต์ระยะยาวอยู่ที่ [`memory/README.md`](./memory/README.md). ให้เริ่มตรงนั้นเมื่อต้อง resume งานข้าม session. Memory vault เก็บ current blockers, QA status, deploy readiness, UI/API direction, และ decision logs.
ห้ามใส่ secrets หรือ credentials จริงลงใน memory.

## ส่งต่องานให้เอเจนต์ (Agent Handoff)

agents และ developers ที่มาสานต่อควรเริ่มจาก [`AGENTS.md`](./AGENTS.md), ซึ่งชี้ไปที่ operating guide หลัก
[`agent.md`](./agent.md). คู่มือนี้สรุป mission, product direction, QA gates, production blockers, และ relationship/scene/prompt systems ที่ต้องรักษาให้เสถียร.

```bash
bun run memory:audit
```

`memory:audit` ตรวจ required memory files, local Markdown links, provider verification notes, และ common secret-shaped values. คำสั่งนี้รันอยู่ใน `qa:local` ด้วย.

## สถานะ deploy (Deploy Status)

ใช้คำสั่งนี้ก่อน staging handoff เมื่อต้องการดู current blockers และ next actions ในที่เดียว:

```bash
bun run deploy:status
```

ใช้ JSON mode สำหรับ CI logs หรือ dashboards:

```bash
bun scripts/deploy-status.ts --json
```

JSON output มี field top-level `stagingReady`, `stagingBlockerCount`, `productionReady`, และ `productionBlockerCount` สำหรับ automation พร้อมรายละเอียด `readiness` และ `nextSteps` ตามลำดับ. ถ้า root identity หรือ `/health` อ่านไม่ได้ JSON จะยังคืน `ok=false`, `failures`, `nextSteps`, และ `rootIdentity.ok=false` เพื่อให้ dashboard/CI อ่านสาเหตุได้โดยไม่ต้อง parse stderr.

## ชั้นความรู้ (Knowledge Layer)

Runtime product knowledge อยู่ที่ [`knowledge/README.md`](./knowledge/README.md). ส่วนนี้แยกจาก session memory:
`memory/` อธิบายสิ่งที่เกิดขึ้นในโปรเจกต์ ส่วน `knowledge/` เก็บกฎผลิตภัณฑ์และชุด structured ที่ backend โหลดไปใช้กับสไตล์แชท, creator drafts, relationship rules, scene rules, และ content policy.

```bash
bun run knowledge:audit
```

`knowledge:audit` ตรวจชุด JSON structured, ลิงก์ wiki ใน repo, และค่าที่มีรูปทรงเหมือน secret. Backend แสดงสถานะ structured knowledge ใน `/health` และ `/ready`; `qa:local` จะรัน audit นี้ก่อน smoke tests.

## ชั้นประเมินผล (Evaluation Layer)

ชุดตรวจ regression ของพรอมป์และบริบทอยู่ที่ [`evals/README.md`](./evals/README.md). local eval แบบ deterministic อ่าน
[`evals/golden-roleplay.json`](./evals/golden-roleplay.json), ประกอบ Maprang chat context ผ่าน backend context
service, แล้วตรวจลำดับ section, ข้อความคุมพรอมป์, relationship/scene continuity, lore injection, งบ token, และการกัน secret-shaped values โดยไม่เรียก live model.

```bash
bun run eval:local
```

`eval:local` รันใน `qa:local` และ CI. Admins รัน deterministic suite ชุดเดียวกันจาก `/admin/evals` หรือ
`GET /admin/evals/local` ได้โดยไม่ใช้ token ของ live model. มี Promptfoo scaffold แบบเลือกใช้เองสำหรับเทียบคุณภาพ live model ในอนาคต:

```bash
bun run eval:promptfoo
```

## ตัวตรวจพรอมป์ (Prompt Inspector)

หน้าตรวจพรอมป์สำหรับ admin เปิดใช้ผ่าน `/admin/prompt-inspector` และ `POST /admin/prompt-inspector`. มัน
ประกอบบล็อกบริบทพื้นฐานชุดเดียวกับที่ chat ใช้, เพิ่ม persona/runtime memory/user message context แบบเลือกใช้ได้, คืนเฉพาะ
พรอมป์ที่ปิดข้อมูลลับแล้ว, ประมาณโทเคนที่ใช้ตาม section, และเทียบ diff ระหว่างข้อความปัจจุบันกับข้อความก่อนหน้าได้. ใช้หน้านี้เมื่อ character reply สั้นเกินไป, lore หาย, หรือ relationship/scene continuity drift.

Local API smoke ครอบ endpoint นี้และ `/admin/evals/local` เมื่อมี `ADMIN_API_KEY` หรือ `SMOKE_ADMIN_API_KEY`.

## เช็กลิสต์ production

- ทำตาม `PRODUCTION_SETUP.md` สำหรับ production env และ Supabase setup แบบครบ.
- ใช้ `DEPLOY_RENDER.md` เป็น recommended first hosting path.
- กรอก `RELEASE_HANDOFF.md` หลัง `bun run production:check` ผ่าน และก่อนเปิดให้ผู้ใช้จริงเข้า release. หลังกรอกแล้วให้รัน `bun run release:handoff:check -- --filled`.
- ใน `RELEASE_HANDOFF.md` ให้ `Frontend URL` และ `Backend URL` เป็น deployed origin ล้วน และให้ `Health URL`/`Ready URL` ชี้ backend origin เดียวกันที่ `/health` กับ `/ready`.
- ใน `RELEASE_HANDOFF.md` ให้บันทึก `E2E_BASE_URL` และ `E2E_API_BASE_URL` ที่ใช้รัน `bun run e2e:smoke`; production handoff ต้องเป็น deployed origins เดียวกับ Frontend/Backend URL.
- ตั้ง backend env จาก `apps/backend/.env.production.example`.
- ตั้ง frontend env จาก `apps/frontend/.env.production.example`.
- คง `MODEL_MAX_OUTPUT_TOKENS=1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420` เพื่อให้ roleplay replies มีเนื้อขึ้น; character turns ที่สั้นจะได้ backend continuation pass หนึ่งครั้ง ยกเว้นผู้เล่นขอให้ตอบสั้น.
- คงค่า default provider retry env values เว้นแต่ staging แสดง transient 5xx/timeout errors ซ้ำ ๆ.
- รันทดสอบแชทจริงก่อนโปรดักชัน และตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` เฉพาะหลังระบบหลังบ้านคืนคำตอบจริงจากโมเดลพร้อมข้อมูลโทเคนที่ใช้.
- ตั้ง `IMAGE_GENERATION_API_KEY` ถ้า Creator Studio ต้องสร้าง avatar จริงแทนภาพตัวอย่างระบบก่อนโปรดักชัน ให้รันทดสอบสร้างรูปจริงและตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` เฉพาะหลังบัญชีผู้ให้บริการผ่าน billing และ quota แล้ว.
- ตั้ง `VITE_API_BASE_URL` เป็น deployed backend URL.
- ตั้ง `NODE_ENV=production`.
- ตั้ง `CORS_ORIGINS` เป็น deployed frontend origins เท่านั้น.
- ตั้ง `ADMIN_API_KEY` เป็นค่าสุ่มยาว.
- ตั้ง `SUPABASE_URL` หรือ `SUPABASE_JWT_ISSUER` สำหรับ JWT verification.
- ตั้ง backend `SUPABASE_ANON_KEY` เพื่อให้ HS256/shared-secret Supabase access tokens verify ผ่าน Auth server ได้เมื่อจำเป็น.
- ตั้ง `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, และ `SUPABASE_STORAGE_ACCESS=signed`.
- สร้าง Supabase Storage bucket ก่อน multi-instance deploy.
- รันคำสั่ง verification ด้านล่างก่อน deploy.

## สร้างอิมเมจ Docker (Docker Build)

```bash
docker build -f apps/backend/Dockerfile -t maprang-backend .
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

ค่า Frontend `VITE_*` จะถูก compile เข้า static bundle ตอน build. Supabase anon key ตั้งใจให้ public ได้ แต่ service role keys ต้องอยู่ backend-only.

รัน database migrations ก่อน start production backend:

```bash
cd apps/backend
bunx prisma migrate deploy
```

## การตรวจปัจจุบัน

```bash
bun run qa:repo
```

ใช้คำสั่งนี้เมื่อต้องตรวจ repo-owned checks ที่ไม่ต้องพึ่ง backend runtime, Postgres ที่เปิดอยู่, หรือ staging URL จริง. มันเหมาะกับงาน agent ต่อเนื่อง, งานเอกสาร, guard, unit/static tests, backend/frontend build, และ predeploy wiring ก่อนค่อยไปขั้น runtime smoke.

```bash
bun run qa:local
```

`qa:local` เริ่มจาก `qa:repo` เสมอ แล้วค่อยต่อ `smoke:doctor`, `smoke:local`, และ `api:smoke` เฉพาะส่วน runtime ที่ต้องมี backend/Postgres เปิดอยู่จริง เพื่อลดรายการเช็คซ้ำและกัน QA gate drift ระยะยาว.

ใช้คำสั่งนี้เป็น local readiness gate ปกติ. มันตรวจ secrets, regression tests สำหรับ secret-pattern, memory/knowledge audits, deterministic prompt/context evals, API route coverage mapping, import-cycle architecture audit, deploy/predeploy wiring, backend tests, frontend build, backend root identity, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, avatar upload, และ local chat normal/stream runtime เมื่อ backend ใช้ `CHAT_PROVIDER=local` หรือ local fallback. Local API smoke ยังข้าม external image provider สำหรับ creator draft checks เพื่อให้ routine QA deterministic; live avatar generation จะตรวจเฉพาะใน `api:smoke:live`, `smoke:image:live`, หรือ `production:check`.
ถ้า backend health รายงาน `chatRuntimeProvider=local`, `api:smoke` จะยิง `POST /chat local mock` และ `POST /chat/stream local mock` จริง พร้อมตรวจว่าใช้ `local/mock-roleplay`, `totalTokens=0`, ไม่มี provider failure, และคำตอบยาวพอสำหรับ roleplay ก่อนยังคงข้ามเฉพาะ live provider routes ที่ต้องใช้ staging/production.
`smoke:doctor` และ `deploy:status --json` จะโชว์ field ชุดเดียวกันเพื่อ handoff ให้ชัด: `chatRuntimeProvider`, `chatLocalFallbackEnabled`, `chatForcedLocal`, และ `chatLocalModel`. ถ้าเห็น `chatRuntimeProvider=local` หรือ `chatForcedLocal=true` แปลว่า local เล่นได้โดยไม่ใช้เครดิต provider แต่ยังห้ามนับเป็น live-provider verification สำหรับ staging/production.
ขั้น local smoke ท้าย ๆ ต้องมี Docker Desktop/Postgres ที่รันอยู่ และ backend ต้องตอบที่ `http://127.0.0.1:3000`; ถ้า Docker หยุดหรือ backend ยังไม่ได้ start, `smoke:doctor` จะ fail ก่อน API smoke จะรัน.
มันยัง audit project memory vault และ runtime knowledge packs เพื่อไม่ให้ long-running context เสีย required files หรือมี secret-shaped values หลุดเข้าไปเงียบ ๆ.
ด่านตรวจ secrets จะละเว้น untracked local env files สำหรับ development ปกติ แต่จะ reject tracked `.env` หรือ `.env.*` files ก่อน commit/CI.

ถ้าต้องการตรวจเฉพาะ backend API route coverage และ frontend API helper contract:

```bash
bun run api:audit
```

คำสั่งนี้ยืนยันว่า route ทุกตัวใน `apps/backend/index.ts` และ `apps/backend/src/*.routes.ts` ถูกนับใน smoke, การตรวจเบราว์เซอร์แบบ e2e, backend tests, live-provider smoke, admin smoke, หรือ manual production gate แล้ว และตรวจว่า frontend helper ใน `apps/frontend/src/lib/api.ts` ที่เรียก `requestJson` หรือ `fetch(API_BASE_URL...)` ชี้ไปยัง method/path ที่ backend ประกาศไว้จริง. นอกจากนี้ audit จะ fail ถ้า admin route ขาด `admin-smoke`, live-provider routes เช่น `POST /chat`, `POST /chat/stream`, และ `POST /creator/ai-draft` ขาด `live-smoke`, coverage มีแค่ `manual-production`, หรือ coverage note ว่าง โดย output จะแสดง weak coverage reason ต่อ route ให้แก้ตรงจุด.

ถ้าต้องการตรวจ import cycles ใน app และ QA source:

```bash
bun run import-cycle:audit
```

ถ้าต้องการตรวจ frontend static/control และ route wiring แบบเร็ว ให้ใช้ alias ตรงจาก root:

```bash
bun run frontend:static:audit
bun run frontend:route:audit
```

Frontend state regression tests that are also covered by `qa:repo`, CI, and Production Smoke:

```bash
bun run frontend:env:test
bun run frontend:storage:test
bun run frontend:clipboard:test
```

Use this set to guard Supabase JWT/env parsing, localStorage persisted state, and clipboard helpers that the UI depends on.

สองคำสั่งนี้เป็นส่วนหนึ่งของ `qa:repo`, CI, และ Production Smoke แล้ว จึงใช้เช็คเฉพาะหน้าบ้านได้โดยไม่ต้องจำ path ของสคริปต์ใน `scripts/`.

คำสั่งนี้ยืนยันว่า backend, frontend, scripts, seed data, Playwright config, และ e2e smoke files ไม่มี circular relative imports.

ถ้าต้องการตรวจว่าเอกสารหลักและ GitHub Actions อ้างคำสั่ง `bun run ...` ตรงกับ package context จริง:

```bash
bun run docs:commands
```

To verify that the repo-owned Maprang test plan still matches the real source of truth for stack, routes, QA gates, and production blockers:

```bash
bun run test-plan:audit
```

This guard keeps `docs/MAPRANG_TEST_PLAN.md`, `START_HERE.md`, `RUN_NOW.md`, and `HOW_TO_RUN.md` aligned to the PostgreSQL/Prisma/Bun baseline, the 14 declared frontend routes / 13 product surfaces split, local/mock-roleplay local QA, and staging/production blocker language.

ถ้าต้องการตรวจว่าไฟล์ทดสอบใหม่ทุกไฟล์ถูกผูกเข้า QA gate แล้ว:

```bash
bun run tests:audit
```

คำสั่งนี้ค้นหาไฟล์ `.test.ts`, `.test.tsx`, `.spec.ts`, และ `.spec.tsx` ของ repo โดยไม่แตะ `node_modules` แล้วจะ fail ถ้า test ใน `scripts/` หรือ `apps/frontend/tests/` ไม่มี root script รันตรง, root `*:test` ไม่อยู่ใน `qa:repo`, backend tests ไม่ถูกครอบด้วย `backend:check`, หรือ e2e specs ไม่ถูกครอบด้วย `e2e:smoke`.

คำสั่งนี้ช่วยกันเอกสาร deploy, README ของ app, และ workflow แนะนำ script ที่ไม่มีอยู่จริงในตำแหน่งที่รัน.

ถ้าต้องการตรวจ production env files ก่อน deploy โดยไม่พิมพ์ secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

ใช้ `--allow-unverified-image` เฉพาะ early staging ก่อน `smoke:image:live` ผ่าน.

รัน full local หรือ staging provider gate เฉพาะเมื่อ backend ติดต่อ OpenRouter ได้:

```bash
bun run qa:live
```

`qa:live` และ `api:smoke:live` เรียกผู้ให้บริการจริง จึงอาจ fail ได้แม้ key มีอยู่แล้ว ถ้า billing, quota, สิทธิ์โมเดล, ข้อจำกัดอัตราการเรียกของผู้ให้บริการ, หรือการเชื่อมต่อออกนอกระบบยังไม่พร้อม กรณี chat จะรายงานเป็น `usage.providerFailure` เพื่อชี้ failure class ที่ถูกต้อง ให้ถือว่าเป็น staging blocker ก่อน production. `api:smoke:live` ตรวจ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ก่อนเรียกแชทจริง และครอบคลุมแชทจริงหนึ่งครั้ง, สตรีมแชทจริงหนึ่งครั้งพร้อม wallet `CHAT_USAGE` แยกครบ, พร้อมสร้างรูปจริงหนึ่งครั้ง ดังนั้นใช้ `smoke:chat` หรือ `smoke:image:live` เฉพาะตอนต้อง retry เส้นทางผู้ให้บริการที่ fail เพียงจุดเดียว อย่ารัน live smoke หลายคำสั่งพร้อมกันบนบัญชีที่ quota จำกัด ให้ใช้ `api:smoke:live` เป็นรอบตรวจตามลำดับครั้งเดียว หลังยืนยันแชทจริงสำเร็จครั้งแรกให้ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`; หลังยืนยันรูปจริงสำเร็จครั้งแรกให้ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`; แล้ว rerun production gate สุดท้าย. ใน `RELEASE_HANDOFF.md` ให้บันทึก `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, และ `Chat smoke stream walletTransactionId` จากผล smoke จริง เพื่อยืนยันทั้ง normal chat, stream chat, token usage, และ wallet `CHAT_USAGE` แยกครบก่อน go.

`api:smoke:live` จะพิมพ์ field หลักฐานแชทแบบคัดลง handoff ได้ตรง ๆ ในแถว `POST /chat/stream live` และรวมหลักฐาน live provider ที่ผ่านจริงไว้ใน JSON summary `handoffEvidence`: `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, และ `Chat smoke stream walletTransactionId`. Combined summary จะมี `handoffEvidence` เฉพาะเมื่อหลักฐานแชทปกติ แชทสตรีม และรูปครบทุกช่องพร้อม token/elapsedMs มากกว่า 0; ถ้าไม่มี object นี้ให้คัดจาก narrow smoke ที่ผ่านจริงหรือ rerun `api:smoke:live`.

สำหรับ backend ที่ deploy แล้ว ให้ใช้ smoke-only live gate พร้อม `SMOKE_API_BASE_URL` และ smoke auth variables เมื่อต้องการ retry provider connectivity โดยไม่รัน persistence tests กับ production data:

```bash
bun run smoke:live
```

สำหรับ production และ staging go/no-go ให้ใช้:

```bash
bun run production:check
```

คำสั่งนี้จะรัน production health gate แบบเข้ม, smoke ของพื้นที่เก็บรูปตัวละครแบบ Supabase signed URL, และ live API smoke รวมถึงการตรวจแชทจริง, สตรีมแชทจริง, กับการสร้างรูปจริง ถ้า bucket `avatars` ออก signed URL ไม่ได้ หรือ image generation ถอยกลับเป็นภาพตัวอย่างเพราะ billing หรือ quota ของผู้ให้บริการยังไม่พร้อม คำสั่งจะล้ม.
script จะพิมพ์ `bun run deploy:status` ก่อน เพื่อให้สรุป blocker และ next steps แสดงก่อน gate เข้ม fail.

ถ้าต้องการตรวจพื้นที่ที่ repo ดูแลทั้งหมดก่อนด่านสุดท้ายของโดเมนและผู้ให้บริการจริง ให้รัน:

```bash
bun run staging:check
```

คำสั่งนี้รันชุด QA local ครบ, Playwright smoke บนเดสก์ท็อป/มือถือ, ตรวจ Supabase signed-storage จริง, และ API smoke ที่บังคับ admin. มันไม่ได้ประกาศว่า production พร้อมด้วยตัวเอง; `production:check` ยังเป็น gate สุดท้ายหลังโดเมนจริง, CORS, และเส้นทาง live image/chat provider พร้อมแล้ว.

หลังมี staging backend/frontend domains แล้ว ให้รัน deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` จะพิมพ์ `bun run deploy:status` ก่อน. Deploy status ตรวจ backend root identity ก่อน health จากนั้นปฏิเสธ localhost/loopback backend URLs, local/non-https CORS, CORS origin ที่มี credential/userinfo หรือ path/query/hash, Supabase signed storage ที่ขาด, `/ready` ที่ไม่ผ่าน, และ admin smoke coverage ที่ขาด. มันตั้งใจปล่อยให้ chat/image live verification flags ยัง pending ได้ เพื่อให้คุณรัน live provider smoke ต่อ แล้วค่อยใช้ `production:check` เป็น go/no-go สุดท้าย.

บนหน้าเว็บให้เปิด `/admin/health` แล้วดู section `ลำดับงานก่อนปล่อยจริง` ควบคู่กับผล CLI. หน้า Admin Health ต้องแสดงลำดับเดียวกันคือ `bun run staging:verify + bun run e2e:smoke`, ต่อด้วย `bun run api:smoke:live`, แล้วปิดด้วย `bun run production:check` เพื่อไม่ให้ทีม deploy ข้ามด่าน staging หรือ live-provider smoke โดยไม่ตั้งใจ.

หรือรันแต่ละ check แยกกัน:

```bash
bun run backend:check
```

ใช้ stricter backend gate นี้เมื่อ Postgres รันอยู่และต้องการบังคับ persistence tests:

```bash
bun run backend:check:db
```

```bash
bun run frontend:check
```

```bash
bun run smoke:doctor
```

`smoke:doctor` ตรวจ backend root identity แล้วรายงาน local health พร้อม `productionReady`, `productionBlockerCount`, `productionBlockers`, และ `nextSteps` ตามลำดับ; เคลียร์ blockers เหล่านั้นบน staging ก่อน deploy.
สำหรับ local chat runtime มันจะพิมพ์ `chatRuntimeProvider`, `chatLocalFallbackEnabled`, `chatForcedLocal`, และ `chatLocalModel` เพื่อแยกให้เห็นว่า QA ตอนนี้ใช้ `local/mock-roleplay` หรือ provider จริง.

```bash
bun run smoke:ready
```

`smoke:ready` ตรวจ backend root identity ก่อน แล้วจึงตรวจ `/ready` ดังนั้น deployed smoke จะ fail ตั้งแต่ต้นถ้า `SMOKE_API_BASE_URL` ชี้ผิด service หรือชี้ไป frontend/static proxy แทน `maprang-backend`.

```bash
bun run smoke:local
```

```bash
bun run smoke:chat
```

`smoke:chat` ตรวจเฉพาะเส้นทางระบบหลังบ้านไป OpenRouter จริง ทั้งแชทปกติและสตรีมแชท พร้อมยืนยันว่า wallet มีรายการ `CHAT_USAGE` แยกครบทั้งสองเส้นทาง และอาจล้มเมื่อการเชื่อมต่อออกไปผู้ให้บริการ, เครดิต API, หรือคีย์ผู้ให้บริการยังไม่พร้อม. มันตรวจ root identity ของระบบหลังบ้านและยอด token ของผู้ใช้ smoke ก่อนเรียกผู้ให้บริการ AI โดยค่าเริ่มต้นคือ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=1000`. JSON output มี `handoffEvidence` พร้อม field แชทที่ตรงกับ `RELEASE_HANDOFF.md`. GitHub Actions ยังรัน deploy checks, seeded local smoke test, และ Docker image builds เมื่อ push ไป `main` หรือเปิด pull request.

```bash
bun run smoke:image:live
```

`api:smoke:live` ใช้เป็น combined smoke ได้เหมือนกัน และ JSON summary `handoffEvidence` กับ output ของ `POST /creator/ai-draft` จะแสดง `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs` เพื่อคัดลง `RELEASE_HANDOFF.md` ได้ตรงกับ gate เดียวกัน.

`smoke:image:live` ตรวจ backend root identity ก่อนตรวจว่าผู้ให้บริการสร้างรูปที่ตั้งค่าไว้ generate รูปจริงได้. การมี key อย่างเดียวไม่พอ; billing และ model access ต้องพร้อมด้วย. หลังผ่านให้คัดค่า `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs` จาก JSON object `handoffEvidence` ลง `RELEASE_HANDOFF.md` เพื่อเป็นหลักฐานว่า live image path ใช้ provider จริง ไม่ใช่ภาพ fallback.
