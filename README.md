# Maprang Project

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

Creator Studio ร่างเนื้อหาตัวละครภาษาไทยผ่าน OpenRouter ได้. การสร้าง AI avatar จริงเป็น optional และต้องมี `IMAGE_GENERATION_API_KEY`; ถ้าไม่มี key ระบบจะใช้ placeholder image ชั่วคราวที่ระบุชัด แต่ยังเติม character fields ให้ได้.

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

## Local Codebase Intelligence

Workspace นี้เตรียมไว้ให้ใช้ SocratiCode เป็น local MCP codebase intelligence tool. การตั้งค่าอยู่ที่
`C:\Users\Phet\.codex\config.toml` และใช้ `.socraticodeignore` ของโปรเจกต์เพื่อข้าม dependencies, build output, local
runtime files, binary assets, และ env secrets.

หลัง restart Codex ให้สั่ง assistant index codebase นี้. ใช้ SocratiCode เป็น local development tool เท่านั้น; อย่าเพิ่มเป็น Maprang runtime dependency จนกว่าจะ review licensing แยกต่างหาก.

## Project Memory

บริบทโปรเจกต์ระยะยาวอยู่ที่ [`memory/README.md`](./memory/README.md). ให้เริ่มตรงนั้นเมื่อต้อง resume งานข้าม session. Memory vault เก็บ current blockers, QA status, deploy readiness, UI/API direction, และ decision logs.
ห้ามใส่ secrets หรือ credentials จริงลงใน memory.

## Agent Handoff

agents และ developers ที่มาสานต่อควรเริ่มจาก [`AGENTS.md`](./AGENTS.md), ซึ่งชี้ไปที่ operating guide หลัก
[`agent.md`](./agent.md). คู่มือนี้สรุป mission, product direction, QA gates, production blockers, และ relationship/scene/prompt systems ที่ต้องรักษาให้เสถียร.

```bash
bun run memory:audit
```

`memory:audit` ตรวจ required memory files, local Markdown links, provider verification notes, และ common secret-shaped values. คำสั่งนี้รันอยู่ใน `qa:local` ด้วย.

## Deploy Status

ใช้คำสั่งนี้ก่อน staging handoff เมื่อต้องการดู current blockers และ next actions ในที่เดียว:

```bash
bun run deploy:status
```

ใช้ JSON mode สำหรับ CI logs หรือ dashboards:

```bash
bun scripts/deploy-status.ts --json
```

JSON output มี field top-level `stagingReady`, `stagingBlockerCount`, `productionReady`, และ `productionBlockerCount` สำหรับ automation พร้อมรายละเอียด `readiness` และ `nextSteps` ตามลำดับ.

## Knowledge Layer

Runtime product knowledge อยู่ที่ [`knowledge/README.md`](./knowledge/README.md). ส่วนนี้แยกจาก session memory:
`memory/` อธิบายสิ่งที่เกิดขึ้นในโปรเจกต์ ส่วน `knowledge/` เก็บ product rules และ structured packs ที่ backend โหลดไปใช้กับ chat style, creator drafts, relationship rules, scene rules, และ content policy.

```bash
bun run knowledge:audit
```

`knowledge:audit` ตรวจ structured JSON packs, local wiki links, และ secret-shaped values. Backend แสดง structured knowledge status ใน `/health` และ `/ready`; `qa:local` จะรัน audit นี้ก่อน smoke tests.

## Evaluation Layer

ชุดตรวจ regression ของพรอมป์และบริบทอยู่ที่ [`evals/README.md`](./evals/README.md). deterministic local eval อ่าน
[`evals/golden-roleplay.json`](./evals/golden-roleplay.json), ประกอบ Maprang chat context ผ่าน backend context
service, แล้วตรวจลำดับ section, ข้อความคุมพรอมป์, relationship/scene continuity, lore injection, งบ token, และ secret-shaped exclusions โดยไม่เรียก live model.

```bash
bun run eval:local
```

`eval:local` รันใน `qa:local` และ CI. Admins รัน deterministic suite ชุดเดียวกันจาก `/admin/evals` หรือ
`GET /admin/evals/local` ได้โดยไม่ใช้ live model tokens. มี Promptfoo scaffold แบบเลือกใช้เองสำหรับเทียบคุณภาพ live model ในอนาคต:

```bash
bun run eval:promptfoo
```

## Prompt Inspector

หน้าตรวจพรอมป์สำหรับ admin เปิดใช้ผ่าน `/admin/prompt-inspector` และ `POST /admin/prompt-inspector`. มัน
ประกอบ base context blocks ชุดเดียวกับที่ chat ใช้, เพิ่ม persona/runtime memory/user message context แบบเลือกใช้ได้, คืนเฉพาะ
redacted prompt text, ประมาณ token usage ตาม section, และ diff ข้อความปัจจุบันกับข้อความก่อนหน้าได้. ใช้หน้านี้เมื่อ character reply สั้นเกินไป, lore หาย, หรือ relationship/scene continuity drift.

Local API smoke ครอบ endpoint นี้และ `/admin/evals/local` เมื่อมี `ADMIN_API_KEY` หรือ `SMOKE_ADMIN_API_KEY`.

## เช็กลิสต์ production

- ทำตาม `PRODUCTION_SETUP.md` สำหรับ production env และ Supabase setup แบบครบ.
- ใช้ `DEPLOY_RENDER.md` เป็น recommended first hosting path.
- กรอก `RELEASE_HANDOFF.md` หลัง `bun run production:check` ผ่าน และก่อนเปิดให้ผู้ใช้จริงเข้า release. หลังกรอกแล้วให้รัน `bun run release:handoff:check -- --filled`.
- ตั้ง backend env จาก `apps/backend/.env.production.example`.
- ตั้ง frontend env จาก `apps/frontend/.env.production.example`.
- คง `MODEL_MAX_OUTPUT_TOKENS=1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420` เพื่อให้ roleplay replies มีเนื้อขึ้น; character turns ที่สั้นจะได้ backend continuation pass หนึ่งครั้ง ยกเว้นผู้เล่นขอให้ตอบสั้น.
- คงค่า default provider retry env values เว้นแต่ staging แสดง transient 5xx/timeout errors ซ้ำ ๆ.
- รัน live chat smoke ก่อน production และตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` เฉพาะหลัง backend คืน real model reply พร้อม token usage.
- ตั้ง `IMAGE_GENERATION_API_KEY` ถ้า Creator Studio ต้องสร้าง avatar จริงแทน placeholder ก่อน production ให้รัน live image smoke และตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` เฉพาะหลังบัญชีผู้ให้บริการผ่าน billing และ quota แล้ว.
- ตั้ง `VITE_API_BASE_URL` เป็น deployed backend URL.
- ตั้ง `NODE_ENV=production`.
- ตั้ง `CORS_ORIGINS` เป็น deployed frontend origins เท่านั้น.
- ตั้ง `ADMIN_API_KEY` เป็นค่าสุ่มยาว.
- ตั้ง `SUPABASE_URL` หรือ `SUPABASE_JWT_ISSUER` สำหรับ JWT verification.
- ตั้ง backend `SUPABASE_ANON_KEY` เพื่อให้ HS256/shared-secret Supabase access tokens verify ผ่าน Auth server ได้เมื่อจำเป็น.
- ตั้ง `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, และ `SUPABASE_STORAGE_ACCESS=signed`.
- สร้าง Supabase Storage bucket ก่อน multi-instance deploy.
- รันคำสั่ง verification ด้านล่างก่อน deploy.

## Docker Build

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

ใช้คำสั่งนี้เป็น local readiness gate ปกติ. มันตรวจ secrets, regression tests สำหรับ secret-pattern, memory/knowledge audits, deterministic prompt/context evals, API route coverage mapping, import-cycle architecture audit, deploy/predeploy wiring, backend tests, frontend build, backend root identity, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, และ avatar upload. Local API smoke จะข้าม external image provider สำหรับ creator draft checks เพื่อให้ routine QA deterministic; live avatar generation จะตรวจเฉพาะใน `api:smoke:live`, `smoke:image:live`, หรือ `production:check`.
ขั้น local smoke ท้าย ๆ ต้องมี Docker Desktop/Postgres ที่รันอยู่ และ backend ต้องตอบที่ `http://127.0.0.1:3000`; ถ้า Docker หยุดหรือ backend ยังไม่ได้ start, `smoke:doctor` จะ fail ก่อน API smoke จะรัน.
มันยัง audit project memory vault และ runtime knowledge packs เพื่อไม่ให้ long-running context เสีย required files หรือมี secret-shaped values หลุดเข้าไปเงียบ ๆ.
ด่านตรวจ secrets จะละเว้น untracked local env files สำหรับ development ปกติ แต่จะ reject tracked `.env` หรือ `.env.*` files ก่อน commit/CI.

ถ้าต้องการตรวจเฉพาะ backend API route coverage:

```bash
bun run api:audit
```

คำสั่งนี้ยืนยันว่า route ทุกตัวใน `apps/backend/src/*.routes.ts` ถูกนับใน smoke, browser e2e, backend tests, live-provider smoke, admin smoke, หรือ manual production gate แล้ว.

ถ้าต้องการตรวจ import cycles ใน app และ QA source:

```bash
bun run import-cycle:audit
```

คำสั่งนี้ยืนยันว่า backend, frontend, scripts, seed data, Playwright config, และ e2e smoke files ไม่มี circular relative imports.

ถ้าต้องการตรวจ production env files ก่อน deploy โดยไม่พิมพ์ secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

ใช้ `--allow-unverified-image` เฉพาะ early staging ก่อน `smoke:image:live` ผ่าน.

รัน full local หรือ staging provider gate เฉพาะเมื่อ backend ติดต่อ OpenRouter ได้:

```bash
bun run qa:live
```

`qa:live` และ `api:smoke:live` เรียกผู้ให้บริการจริง จึงอาจ fail ได้แม้ key มีอยู่แล้ว ถ้า billing, quota, สิทธิ์โมเดล, ข้อจำกัดอัตราการเรียกของผู้ให้บริการ, หรือการเชื่อมต่อออกนอกระบบยังไม่พร้อม กรณี chat จะรายงานเป็น `usage.providerFailure` เพื่อชี้ failure class ที่ถูกต้อง ให้ถือว่าเป็น staging blocker ก่อน production. `api:smoke:live` ตรวจ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ก่อน live chat call และครอบคลุม live chat หนึ่งครั้งพร้อม live image-generation หนึ่งครั้ง ดังนั้นใช้ `smoke:chat` หรือ `smoke:image:live` เฉพาะตอนต้อง retry provider path เดี่ยว อย่ารัน live smoke หลายคำสั่งพร้อมกันบนบัญชีที่ quota จำกัด ให้ใช้ `api:smoke:live` เป็น ordered pass ครั้งเดียว หลัง live chat verification สำเร็จครั้งแรกให้ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`; หลัง live image verification สำเร็จครั้งแรกให้ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`; แล้ว rerun production gate สุดท้าย.

สำหรับ backend ที่ deploy แล้ว ให้ใช้ smoke-only live gate พร้อม `SMOKE_API_BASE_URL` และ smoke auth variables เมื่อต้องการ retry provider connectivity โดยไม่รัน persistence tests กับ production data:

```bash
bun run smoke:live
```

สำหรับ production และ staging go/no-go ให้ใช้:

```bash
bun run production:check
```

คำสั่งนี้จะรัน production health gate แบบเข้ม, Supabase signed-avatar storage smoke, และ live API smoke รวมถึง real chat กับ real image-generation checks ถ้า bucket `avatars` ออก signed URL ไม่ได้ หรือ image generation ถอยกลับเป็น placeholder เพราะ billing หรือ quota ของผู้ให้บริการยังไม่พร้อม คำสั่งจะล้ม.
script จะพิมพ์ `bun run deploy:status` ก่อน เพื่อให้สรุป blocker และ next steps แสดงก่อน gate เข้ม fail.

ถ้าต้องการตรวจ repo-owned surfaces ทั้งหมดก่อน final live provider/domain gate ให้รัน:

```bash
bun run staging:check
```

คำสั่งนี้รัน full local QA suite, desktop/mobile Playwright smoke, real Supabase signed-storage verification, และ admin-required API smoke. มันไม่ได้ประกาศว่า production พร้อมด้วยตัวเอง; `production:check` ยังเป็น gate สุดท้ายหลัง real domains, CORS, และ live image/chat provider paths พร้อมแล้ว.

หลังมี staging backend/frontend domains แล้ว ให้รัน deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` จะพิมพ์ `bun run deploy:status` ก่อน. Deploy status ตรวจ backend root identity ก่อน health จากนั้นปฏิเสธ localhost backend URLs, local/non-https CORS, Supabase signed storage ที่ขาด, `/ready` ที่ไม่ผ่าน, และ admin smoke coverage ที่ขาด. มันตั้งใจปล่อยให้ chat/image live verification flags ยัง pending ได้ เพื่อให้คุณรัน live provider smoke ต่อ แล้วค่อยใช้ `production:check` เป็น go/no-go สุดท้าย.

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

`smoke:chat` ตรวจเฉพาะเส้นทางระบบหลังบ้านไป OpenRouter จริง และอาจล้มเมื่อการเชื่อมต่อออกไปผู้ให้บริการ, เครดิต API, หรือคีย์ผู้ให้บริการยังไม่พร้อม. มันตรวจ root identity ของระบบหลังบ้านและยอด token ของผู้ใช้ smoke ก่อนเรียกผู้ให้บริการ AI โดยค่าเริ่มต้นคือ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=1000`. GitHub Actions ยังรัน deploy checks, seeded local smoke test, และ Docker image builds เมื่อ push ไป `main` หรือเปิด pull request.

```bash
bun run smoke:image:live
```

`smoke:image:live` ตรวจ backend root identity ก่อนตรวจว่าผู้ให้บริการสร้างรูปที่ตั้งค่าไว้ generate รูปจริงได้. การมี key อย่างเดียวไม่พอ; billing และ model access ต้องพร้อมด้วย.
