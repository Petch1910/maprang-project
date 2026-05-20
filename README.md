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

Prompt และ context regression checks อยู่ที่ [`evals/README.md`](./evals/README.md). deterministic local eval อ่าน
[`evals/golden-roleplay.json`](./evals/golden-roleplay.json), ประกอบ Maprang chat context ผ่าน backend context
service, แล้วตรวจ section order, prompt-control text, relationship/scene continuity, lore injection, token budget, และ secret-shaped exclusions โดยไม่เรียก live model.

```bash
bun run eval:local
```

`eval:local` รันใน `qa:local` และ CI. Admins รัน deterministic suite ชุดเดียวกันจาก `/admin/evals` หรือ
`GET /admin/evals/local` ได้โดยไม่ใช้ live model tokens. มี optional Promptfoo scaffolding สำหรับ future live model quality comparisons:

```bash
bun run eval:promptfoo
```

## Prompt Inspector

Admin-only prompt debugging is available through `/admin/prompt-inspector` and `POST /admin/prompt-inspector`. It
assembles the same base context blocks used by chat, adds optional persona/runtime memory/user message context, returns only
redacted prompt text, estimates token usage by section, and can diff the current message against a previous message. Use it
when a character reply becomes too short, loses lore, or drifts from relationship/scene continuity.

Local API smoke covers this endpoint and `/admin/evals/local` when `ADMIN_API_KEY` or `SMOKE_ADMIN_API_KEY` is available.

## Production Checklist

- Follow `PRODUCTION_SETUP.md` for the full production env and Supabase setup.
- Use `DEPLOY_RENDER.md` for the recommended first hosting path.
- Fill `RELEASE_HANDOFF.md` after `bun run production:check` passes and before sending real users to the release. Run `bun run release:handoff:check -- --filled` after filling it.
- Set backend env from `apps/backend/.env.production.example`.
- Set frontend env from `apps/frontend/.env.production.example`.
- Keep `MODEL_MAX_OUTPUT_TOKENS=1600` and `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420` for richer roleplay replies; short character turns get one backend continuation pass unless the player asks for brevity.
- Keep the default provider retry env values unless staging shows repeated transient 5xx/timeout errors.
- Run live chat smoke before production and set `CHAT_PROVIDER_LIVE_VERIFIED=1` only after the backend returns a real model reply with token usage.
- ตั้ง `IMAGE_GENERATION_API_KEY` ถ้า Creator Studio ต้องสร้าง avatar จริงแทน placeholder ก่อน production ให้รัน live image smoke และตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` เฉพาะหลังบัญชีผู้ให้บริการผ่าน billing และ quota แล้ว.
- Set `VITE_API_BASE_URL` to the deployed backend URL.
- Set `NODE_ENV=production`.
- Set `CORS_ORIGINS` to deployed frontend origins only.
- Set a long random `ADMIN_API_KEY`.
- Set `SUPABASE_URL` or `SUPABASE_JWT_ISSUER` for JWT verification.
- Set backend `SUPABASE_ANON_KEY` so HS256/shared-secret Supabase access tokens can be verified through the Auth server when needed.
- Set `STORAGE_PROVIDER=supabase`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, and `SUPABASE_STORAGE_ACCESS=signed`.
- Create the Supabase Storage bucket before multi-instance deploy.
- Run the verification commands below before deploying.

## Docker Build

```bash
docker build -f apps/backend/Dockerfile -t maprang-backend .
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

Frontend `VITE_*` values are compiled into the static bundle at build time. The Supabase anon key is intended to be public, but service role keys must stay backend-only.

Run database migrations before starting the production backend:

```bash
cd apps/backend
bunx prisma migrate deploy
```

## Current Verification

```bash
bun run qa:local
```

Use this as the normal local readiness gate. It checks secrets, secret-pattern regression tests, memory and knowledge audits, deterministic prompt/context evals, API route coverage mapping, import-cycle architecture audit, deploy/predeploy wiring, backend tests, frontend build, backend root identity, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, and avatar upload. Local API smoke skips the external image provider for creator draft checks so routine QA is deterministic; live avatar generation is verified only by `api:smoke:live`, `smoke:image:live`, or `production:check`.
The final local smoke steps expect Docker Desktop/Postgres to be running and the backend to answer at `http://127.0.0.1:3000`; if Docker is stopped or the backend is not started, `smoke:doctor` fails before the API smoke can run.
It also audits the project memory vault and runtime knowledge packs so long-running context cannot silently lose required files or pick up secret-shaped values.
The secrets gate ignores untracked local env files for normal development, but it rejects tracked `.env` or `.env.*` files before commit/CI.

To check only backend API route coverage:

```bash
bun run api:audit
```

This verifies that every route declared in `apps/backend/src/*.routes.ts` is accounted for by smoke, browser e2e, backend tests, live-provider smoke, admin smoke, or a manual production gate.

To check import cycles across app and QA source:

```bash
bun run import-cycle:audit
```

This verifies backend, frontend, scripts, seed data, Playwright config, and e2e smoke files stay free of circular relative imports.

To check production env files before deploy without printing secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

Use `--allow-unverified-image` only for early staging before `smoke:image:live` passes.

Run the full local or staging provider gate only when the backend can reach OpenRouter:

```bash
bun run qa:live
```

`qa:live` และ `api:smoke:live` เรียกผู้ให้บริการจริง จึงอาจ fail ได้แม้ key มีอยู่แล้ว ถ้า billing, quota, สิทธิ์โมเดล, provider rate limit, หรือ outbound networking ยังไม่พร้อม กรณี chat จะรายงานเป็น `usage.providerFailure` เพื่อชี้ failure class ที่ถูกต้อง ให้ถือว่าเป็น staging blocker ก่อน production. `api:smoke:live` ตรวจ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ก่อน live chat call และครอบคลุม live chat หนึ่งครั้งพร้อม live image-generation หนึ่งครั้ง ดังนั้นใช้ `smoke:chat` หรือ `smoke:image:live` เฉพาะตอนต้อง retry provider path เดี่ยว อย่ารัน live smoke หลายคำสั่งพร้อมกันบนบัญชีที่ quota จำกัด ให้ใช้ `api:smoke:live` เป็น ordered pass ครั้งเดียว หลัง live chat verification สำเร็จครั้งแรกให้ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`; หลัง live image verification สำเร็จครั้งแรกให้ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`; แล้ว rerun production gate สุดท้าย.

For an already deployed backend, use the smoke-only live gate with `SMOKE_API_BASE_URL` and smoke auth variables when you only want to retry provider connectivity without running persistence tests against production data:

```bash
bun run smoke:live
```

สำหรับ production และ staging go/no-go ให้ใช้:

```bash
bun run production:check
```

คำสั่งนี้จะรัน strict production health gate, Supabase signed-avatar storage smoke, และ live API smoke รวมถึง real chat กับ real image-generation checks ถ้า bucket `avatars` ออก signed URL ไม่ได้ หรือ image generation ถอยกลับเป็น placeholder เพราะ billing หรือ quota ของผู้ให้บริการยังไม่พร้อม คำสั่งจะ fail.
The script prints `bun run deploy:status` first, so the blocker summary and next steps appear before the strict gate fails.

When you want to verify all repo-owned surfaces before the final live provider/domain gate, run:

```bash
bun run staging:check
```

This runs the full local QA suite, desktop/mobile Playwright smoke, real Supabase signed-storage verification, and admin-required API smoke. It does not mark production ready by itself; `production:check` remains the final gate after real domains, CORS, and live image/chat provider paths are available.

After staging backend/frontend domains exist, run the deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` prints `bun run deploy:status` first. Deploy status checks backend root identity before health, then rejects localhost backend URLs, local/non-https CORS, missing Supabase signed storage, failed `/ready`, and missing admin smoke coverage. It intentionally allows chat/image live verification flags to stay pending so you can run live provider smoke next, then use `production:check` as the final go/no-go.

Or run each check separately:

```bash
bun run backend:check
```

Use this stricter backend gate when Postgres is running and you want persistence tests to be mandatory:

```bash
bun run backend:check:db
```

```bash
bun run frontend:check
```

```bash
bun run smoke:doctor
```

`smoke:doctor` verifies the backend root identity, then reports local health plus `productionReady`, `productionBlockerCount`, `productionBlockers`, and ordered `nextSteps`; clear those blockers on staging before deploy.

```bash
bun run smoke:ready
```

`smoke:ready` checks the backend root identity first, then `/ready`, so deployed smoke fails early if `SMOKE_API_BASE_URL` points at the wrong service or a frontend/static proxy instead of `maprang-backend`.

```bash
bun run smoke:local
```

```bash
bun run smoke:chat
```

`smoke:chat` verifies only the real backend-to-OpenRouter path and can fail when outbound provider networking, API credits, or the provider key are not ready. It checks backend root identity and the smoke user's token balance before calling the AI provider, and defaults to `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=1000`. GitHub Actions also runs deploy checks, a seeded local smoke test, and Docker image builds on pushes to `main` and on pull requests.

```bash
bun run smoke:image:live
```

`smoke:image:live` verifies backend root identity before checking that the configured image provider can actually generate a real image. A configured key is not enough; billing and model access must also be ready.
