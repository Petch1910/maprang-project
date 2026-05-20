# ตั้งค่า Production

ไฟล์นี้สรุปค่าที่ต้องมีแบบชัดเจนก่อน deploy Maprang ออกจาก local development.

## Admin Key

สร้าง `ADMIN_API_KEY` ที่ยาวและสุ่มจริงในเครื่อง แล้วนำไปใส่เฉพาะ hosting provider หรือ secret manager:

```bash
bun -e "const b=new Uint8Array(32);crypto.getRandomValues(b);console.log([...b].map(x=>x.toString(16).padStart(2,'0')).join(''))"
```

ห้าม commit ไฟล์ `.env` จริง ให้ใส่ค่าเหล่านี้โดยตรงใน hosting provider หรือ secret manager.

## Backend Env

เริ่มจาก `apps/backend/.env.production.example`.

ค่าที่จำเป็น:

- `NODE_ENV=production`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` ตั้งเฉพาะหลัง live chat smoke ผ่านจริง
- `MODEL_TEMPERATURE=0.85`
- `MODEL_MAX_OUTPUT_TOKENS=1600`
- `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`
- `CHAT_PROVIDER_RETRY_ATTEMPTS=2`
- `CHAT_PROVIDER_RETRY_DELAY_MS=350`
- `CREATOR_DRAFT_RETRY_ATTEMPTS=3`
- `CREATOR_DRAFT_RETRY_DELAY_MS=350`
- `CORS_ORIGINS`
- `ADMIN_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER=supabase`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS=signed`
- `SUPABASE_SIGNED_URL_EXPIRES_IN=3600`
- `IMAGE_GENERATION_API_KEY or OPENAI_API_KEY`

ค่าที่จำเป็นสำหรับการสร้างรูปจริงใน Creator Studio บน production:

- `IMAGE_GENERATION_API_KEY`
- `IMAGE_GENERATION_MODEL`
- `IMAGE_GENERATION_SIZE`
- `IMAGE_GENERATION_QUALITY`
- `IMAGE_GENERATION_OUTPUT_FORMAT`
- `IMAGE_GENERATION_OUTPUT_COMPRESSION`
- `IMAGE_GENERATION_LIVE_VERIFIED=1` ตั้งเฉพาะหลัง live image smoke ผ่านจริง

`DATABASE_URL` ต้องเป็น production Postgres URL จริงพร้อม `sslmode=require` ห้ามทิ้งค่าตัวอย่าง `USER:PASSWORD@HOST/DATABASE` ไว้ เพราะ `env:check` จะปฏิเสธค่า credential ตัวอย่าง, database แบบ localhost, และ URL production ที่ไม่มี `sslmode=require`.

`OPENROUTER_API_KEY` ใช้สำหรับร่างข้อความใน Creator Studio และตอบแชท ต้องเป็น key ของ OpenRouter ที่ขึ้นต้นด้วย `sk-or-` ไม่ใช่ OpenAI key แบบ `sk-proj-`. แค่ key หน้าตาถูกต้องยังไม่พอสำหรับ production readiness: ให้รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging ก่อน แล้วตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` เฉพาะหลัง backend คืนคำตอบจริงจากโมเดลพร้อม usage accounting. การสร้าง avatar จริงเป็นคนละเส้นทางกับ image provider; ถ้าไม่ได้ตั้ง `IMAGE_GENERATION_API_KEY`, Creator Studio ยังร่างเนื้อหาตัวละครภาษาไทยได้ แต่จะระบุว่ารูปเป็น placeholder ชั่วคราวของระบบ.

`MODEL_TEMPERATURE`, `MODEL_MAX_OUTPUT_TOKENS`, และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS` คุมจังหวะและความยาวแชท แนะนำให้ใช้ `MODEL_MAX_OUTPUT_TOKENS` ใกล้ `1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS` ใกล้ `420` สำหรับ roleplay เพื่อให้บอทมีพื้นที่ตอบ 4-6 ย่อหน้าสั้น แทนการตอบบรรทัดเดียว. `deploy:doctor` จะ fail production env ที่ต่ำกว่า baseline `MODEL_MAX_OUTPUT_TOKENS=1200` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320` เพราะค่าที่ต่ำกว่านั้นทำให้ live roleplay QA ผ่านง่ายเกินด้วยคำตอบบาง ๆ. ถ้าคำตอบตัวละครสั้นกว่า guard นี้และผู้เล่นไม่ได้ขอให้ตอบสั้น backend จะทำ continuation pass หนึ่งครั้งและคิด usage รวม.

`CHAT_PROVIDER_RETRY_*` และ `CREATOR_DRAFT_RETRY_*` ทำให้ provider failures ทนขึ้นตอน traffic spike หรือ JSON ตอบกลับถูกตัด ค่า default จะ retry แชท 2 ครั้งและ creator draft 3 ครั้งพร้อม delay สั้น ๆ แต่ยัง fail เร็วสำหรับ credential, billing, และ policy errors.

สำหรับ production ให้ตั้งค่า OpenAI image key จริงก่อนเปิด Creator Studio ให้ผู้ใช้ทั่วไป backend จะเรียก OpenAI Images endpoint แล้วอัปโหลด avatar ที่สร้างผ่าน pipeline เก็บรูปชุดเดียวกับระบบ avatar.
การมี image key อย่างเดียวไม่พอสำหรับ production readiness เพราะ billing หรือ quota ของผู้ให้บริการยัง fail ได้ ให้รัน `bun run smoke:image:live` หรือ `bun run api:smoke:live` กับ staging หรือ production ก่อน `api:smoke:live` อาจเตือนว่า `/ready` ยังรอ chat/image live verification ซึ่งเป็นเรื่องปกติของรอบตรวจแรกก่อนตั้ง flag ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` หลัง live image call ผ่านเท่านั้น แล้ว rerun production gate สุดท้าย.
ถ้า live image smoke รายงาน `billing_hard_limit_reached`, `billing hard limit`, หรือ `insufficient_quota` จุดแก้อยู่ที่บัญชีผู้ให้บริการสร้างรูป: เพิ่มหรือรีเซ็ตวงเงิน/โควตา แล้ว rerun live smoke เดิม ให้คง `IMAGE_GENERATION_LIVE_VERIFIED=0` จนกว่ารอบ rerun จะคืนรูปที่สร้างจริงแบบ configured แทน placeholder.

หลังเพิ่ม backend env แล้ว ให้ตรวจค่าด้วย:

```bash
cd apps/backend
bun run env:check
```

ถ้าต้องการตรวจ backend และ frontend env พร้อมกันโดยไม่พิมพ์ secret values ให้รันจาก repo root:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

`deploy:doctor` จับ production mistakes ที่พบบ่อยก่อน deploy เช่น Supabase dashboard URLs, anon key ไม่ตรงกัน, service role key หลุดไปอยู่ frontend env, local/non-https CORS origins, สลับ OpenAI/OpenRouter key, ขาด `sslmode=require`, และ image generation ที่ยังไม่ได้ live-verified. ช่วง early staging สามารถเพิ่ม `--allow-unverified-image` ได้เฉพาะตอนที่ยังรอรัน `smoke:image:live`.

## Frontend Env

เริ่มจาก `apps/frontend/.env.production.example`.

ค่าที่จำเป็น:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

ค่า `VITE_*` ทั้งหมดจะถูก compile เข้า frontend bundle ตอน build.

## Supabase Setup

1. สร้าง Supabase project.
2. คัดลอก project URL ไปใส่ `SUPABASE_URL` และ `VITE_SUPABASE_URL`.
3. ตั้ง `SUPABASE_JWT_ISSUER` เป็น `<SUPABASE_URL>/auth/v1`.
4. คัดลอก anon public key ไปใส่ `VITE_SUPABASE_ANON_KEY` และ backend `SUPABASE_ANON_KEY`.
5. คัดลอก service role key ไปใส่เฉพาะ backend-only `SUPABASE_SERVICE_ROLE_KEY`.
6. สร้าง storage bucket ชื่อ `avatars`.
7. ตั้ง `SUPABASE_STORAGE_BUCKET=avatars`.
8. เลือกรูปแบบ storage access:
   - Production: bucket private พร้อม `SUPABASE_STORAGE_ACCESS=signed`.
   - Development only: code รองรับ public buckets ได้ แต่ production readiness จะ fail จนกว่าจะใช้ signed URLs.

หลัง Supabase project พร้อมและ backend Supabase env ใช้ได้ในเครื่อง ให้ repo ตรวจหรือสร้าง bucket ได้ด้วย:

```bash
bun run supabase:storage:setup
```

คำสั่งนี้จะคง bucket เป็น private, อัปโหลด smoke image ขนาดเล็ก, สร้าง signed URL, fetch URL นั้น, แล้วลบ object ทิ้ง ถ้าต้องการตรวจแบบไม่แก้ข้อมูล ให้รัน:

```bash
bun run supabase:storage:check
```

implementation ปัจจุบันเก็บ stable backend avatar URLs เช่น `/uploads/avatars/<filename>`. Backend จะ serve local files ใน development และ redirect ไป Supabase public หรือ signed URLs ใน production.

เปิด RLS ไว้บน public app tables. Supabase Advisor อาจแสดง `RLS Enabled No Policy` เป็น INFO notice ซึ่งเป็นเรื่องปกติเมื่อ frontend ใช้ backend API แทนการเข้าตาราง Supabase โดยตรง. เพิ่ม explicit RLS policies เฉพาะกรณีตั้งใจ expose app table ให้ `anon` หรือ `authenticated` ผ่าน Supabase Data API.

## Deployment Order

Recommended first hosting path: follow `DEPLOY_RENDER.md`.

0. Run local static deployment readiness checks:

```bash
bun run secrets:check
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
bun run predeploy:check
bun run backend:check
bun run frontend:check
```

`backend:check` requires a reachable database for persistence tests. If local Docker is not running, start Docker/Postgres first or run the check against a staging database.

1. Provision production Postgres.
2. Add backend env values.
3. Run database migrations:

```bash
cd apps/backend
bunx prisma migrate deploy
```

4. Deploy backend.
5. Check backend health:

```bash
curl https://api.example.com/health
```

6. Check backend traffic readiness:

```bash
curl https://api.example.com/ready
```

`/health` is the basic liveness and database check. `/ready` is stricter and should be green before sending real users to the backend; it requires database connectivity, OpenRouter configuration, production auth/storage hardening, `CHAT_PROVIDER_LIVE_VERIFIED=1` after live chat smoke passes, and `IMAGE_GENERATION_LIVE_VERIFIED=1` after live image smoke passes.
The `/health` response and `/admin/health` page also show CIA/AAA security posture: confidentiality, integrity, availability, authentication, authorization, and accounting/audit.

7. Build frontend with production API URL:

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

8. Deploy frontend.
9. Run smoke against production backend:

```bash
SMOKE_API_BASE_URL=https://api.example.com bun run production:check
```

For targeted debugging after a failed gate, run only the path you need:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

`production:check` is the hard final gate. It prints `bun run deploy:status` first so the blocker summary and next steps are visible before the strict smoke gates fail. It fails if the backend URL is still local, auth is not Supabase JWT, avatar storage is not Supabase signed URL, the real `avatars` bucket cannot upload/fetch through signed URLs, CORS is local or non-https, OpenRouter is missing, the image generation provider is missing, or live chat/image provider calls fail.

Before that final gate, use `staging:verify` against the deployed staging backend:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

This prints the deploy status summary first, then catches local URLs, local/non-https CORS, signed-storage mistakes, `/ready` failures, and missing admin smoke coverage while still allowing chat/image live verification flags to remain pending until the dedicated provider smoke passes.

The GitHub `Production Smoke` workflow also requires repository secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` so it can verify the private `avatars` bucket instead of only trusting backend health flags.
It also requires `SMOKE_ADMIN_API_KEY` so the smoke run verifies admin summary, moderation reports, and audit logs instead of silently skipping admin-only APIs.

`smoke:chat` และ provider gate รวมอย่าง `api:smoke:live` จะเช็ก wallet ของผู้ใช้ smoke ก่อนเรียก OpenRouter ให้คงยอดผู้ใช้ smoke ไว้สูงกว่า `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ค่าเริ่มต้น `1000` หรือปรับ threshold ถ้า prompt ทดสอบหนักกว่าเดิม ถ้า backend คืน `usage.providerFailure` แปลว่า route ติดต่อได้แล้ว แต่ live provider path ยังถูกบล็อกอยู่ ให้ตรวจเครดิต/โควตา OpenRouter, สิทธิ์โมเดล, ความถูกต้องของ key, outbound networking, และ backend logs ก่อน deploy.

`smoke:image` checks the image provider configuration without spending image credits by default. To generate one real staging/production avatar, run `bun run smoke:image:live` or `SMOKE_IMAGE_LIVE=1 bun run smoke:image`; this calls `/creator/ai-draft` and fails if Creator Studio falls back to the placeholder image.

For production, prefer a real `SMOKE_ACCESS_TOKEN` for user flows, and always set `SMOKE_ADMIN_API_KEY` for admin smoke checks. If you use `SMOKE_USER_ID` instead of an access token, `SMOKE_ADMIN_API_KEY` is also required so the backend treats header-based user id as an admin-only smoke path, not public authentication.

For the hard production gate, run `bun run production:check` with the same `SMOKE_API_BASE_URL`, smoke auth, Supabase storage, and admin smoke variables set. Use `smoke:live`, `smoke:chat`, or `smoke:image:live` only when retrying a narrower failed provider path. On the first staging verification, run `api:smoke:live` or the narrower live smoke command, set `CHAT_PROVIDER_LIVE_VERIFIED=1` after live chat succeeds, set `IMAGE_GENERATION_LIVE_VERIFIED=1` after live image succeeds, then rerun `production:check`.

Do not point `backend:check`, `qa:local`, or `qa:live` at production data unless you intentionally want the automated persistence tests to create and archive test records there. Use those gates with local or staging databases.

10. Complete manual QA from `DEPLOYMENT_QA.md`, then fill `RELEASE_HANDOFF.md` with the deployed frontend/backend URLs, migration result, storage/auth/CORS posture, live smoke results, known limitations, and go/no-go decision. Run `bun run release:handoff:check -- --filled` before sharing the handoff.

You can also run the manual GitHub Actions workflow `Production Smoke` after each deploy.
Configure repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, and either `SMOKE_ACCESS_TOKEN` or `SMOKE_USER_ID`.
`SMOKE_API_BASE_URL` must be a deployed `https://` backend URL. The workflow rejects `http://`, localhost, and missing signed-storage secrets before it can spend provider credits.
The workflow always verifies admin summary, moderation reports, and audit logs through `SMOKE_ADMIN_API_KEY` without spending provider credits.
Turn on `run_chat` only when you want to spend a small amount of provider credit to verify the live AI path. Leave `min_token_balance_for_chat` at `1000` unless the smoke model or prompt needs a larger buffer.
Turn on both `run_chat` and `run_image` when you want the workflow to run the combined `api:smoke:live` provider gate after the strict production readiness checks.

## Production Readiness Notes

- Latest migrations include reports, admin audit logs, wallet token transactions, and user content settings. Always run `bunx prisma migrate deploy` before exposing the backend.
- Production auth rejects plain `x-user-id` impersonation. Use Supabase access tokens for users; reserve `SMOKE_USER_ID` for admin-key smoke tests only.
- Admin actions now write audit logs for report status changes, hidden characters, archived messages, and manual token adjustments.
- Payment is not connected yet. Use Wallet admin token adjustment only for beta/manual grants until a payment provider is added.
- Production smoke tests require either a real Supabase access token or an admin-key-authorized UUID user id, and live chat smoke requires that user's wallet to be topped up.
- Live image smoke is opt-in through `bun run smoke:image:live` or `SMOKE_IMAGE_LIVE=1` for `smoke:image`, while `production:check`, `qa:live`, and `api:smoke:live` intentionally require a real image provider call.
