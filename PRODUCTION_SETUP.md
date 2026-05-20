# ตั้งค่า Production

ไฟล์นี้สรุปค่าที่ต้องมีแบบชัดเจนก่อน deploy Maprang ออกจาก local development.

## คีย์ผู้ดูแล (Admin Key)

สร้าง `ADMIN_API_KEY` ที่ยาวและสุ่มจริงในเครื่อง แล้วนำไปใส่เฉพาะ hosting provider หรือ secret manager:

```bash
bun -e "const b=new Uint8Array(32);crypto.getRandomValues(b);console.log([...b].map(x=>x.toString(16).padStart(2,'0')).join(''))"
```

ห้าม commit ไฟล์ `.env` จริง ให้ใส่ค่าเหล่านี้โดยตรงใน hosting provider หรือ secret manager.

## ค่า env ฝั่ง backend (Backend Env)

เริ่มจาก `apps/backend/.env.production.example`.

ค่าที่จำเป็น:

- `NODE_ENV=production`
- `DATABASE_URL`
- `OPENROUTER_API_KEY`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` ตั้งเฉพาะหลังการทดสอบแชทจริงผ่าน
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
- `IMAGE_GENERATION_LIVE_VERIFIED=1` ตั้งเฉพาะหลังการทดสอบสร้างรูปจริงผ่าน

`DATABASE_URL` ต้องเป็น production Postgres URL จริงพร้อม `sslmode=require` ห้ามทิ้งค่าตัวอย่าง `USER:PASSWORD@HOST/DATABASE` ไว้ เพราะ `env:check` จะปฏิเสธค่า credential ตัวอย่าง, database แบบ localhost, และ URL production ที่ไม่มี `sslmode=require`.

`OPENROUTER_API_KEY` ใช้สำหรับร่างข้อความใน Creator Studio และตอบแชท ต้องเป็น key ของ OpenRouter ที่ขึ้นต้นด้วย `sk-or-` ไม่ใช่ OpenAI key แบบ `sk-proj-`. แค่ key หน้าตาถูกต้องยังไม่พอสำหรับ production readiness: ให้รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging ก่อน แล้วตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` เฉพาะหลัง backend คืนคำตอบจริงจากโมเดลพร้อมบัญชีการใช้โทเคน. การสร้าง avatar จริงเป็นคนละเส้นทางกับ image provider; ถ้าไม่ได้ตั้ง `IMAGE_GENERATION_API_KEY`, Creator Studio ยังร่างเนื้อหาตัวละครภาษาไทยได้ แต่จะระบุว่ารูปเป็นภาพตัวอย่างชั่วคราวของระบบ.

`MODEL_TEMPERATURE`, `MODEL_MAX_OUTPUT_TOKENS`, และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS` คุมจังหวะและความยาวแชท แนะนำให้ใช้ `MODEL_MAX_OUTPUT_TOKENS` ใกล้ `1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS` ใกล้ `420` สำหรับ roleplay เพื่อให้บอทมีพื้นที่ตอบ 4-6 ย่อหน้าสั้น แทนการตอบบรรทัดเดียว. `deploy:doctor` จะ fail production env ที่ต่ำกว่า baseline `MODEL_MAX_OUTPUT_TOKENS=1200` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320` เพราะค่าที่ต่ำกว่านั้นทำให้ live roleplay QA ผ่านง่ายเกินด้วยคำตอบบาง ๆ. ถ้าคำตอบตัวละครสั้นกว่า guard นี้และผู้เล่นไม่ได้ขอให้ตอบสั้น backend จะทำ continuation pass หนึ่งครั้งและคิด usage รวม.

`CHAT_PROVIDER_RETRY_*` และ `CREATOR_DRAFT_RETRY_*` ทำให้ provider failures ทนขึ้นตอน traffic spike หรือ JSON ตอบกลับถูกตัด ค่า default จะ retry แชท 2 ครั้งและ creator draft 3 ครั้งพร้อม delay สั้น ๆ แต่ยัง fail เร็วสำหรับ credential, billing, และ policy errors.

สำหรับ production ให้ตั้งค่า OpenAI image key จริงก่อนเปิด Creator Studio ให้ผู้ใช้ทั่วไป backend จะเรียก OpenAI Images endpoint แล้วอัปโหลด avatar ที่สร้างผ่าน pipeline เก็บรูปชุดเดียวกับระบบ avatar.
การมี image key อย่างเดียวไม่พอสำหรับ production readiness เพราะ billing หรือ quota ของผู้ให้บริการยัง fail ได้ ให้รัน `bun run smoke:image:live` หรือ `bun run api:smoke:live` กับ staging หรือ production ก่อน `api:smoke:live` อาจเตือนว่า `/ready` ยังรอ chat/image live verification ซึ่งเป็นเรื่องปกติของรอบตรวจแรกก่อนตั้ง flag ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` หลัง live image call ผ่านเท่านั้น แล้ว rerun production gate สุดท้าย.
ถ้าการทดสอบสร้างรูปจริงรายงาน `billing_hard_limit_reached`, `billing hard limit`, หรือ `insufficient_quota` จุดแก้อยู่ที่บัญชีผู้ให้บริการสร้างรูป: เพิ่มหรือรีเซ็ตวงเงิน/โควตา แล้ว rerun live smoke เดิม ให้คง `IMAGE_GENERATION_LIVE_VERIFIED=0` จนกว่ารอบ rerun จะคืนรูปที่สร้างจริงแบบ configured แทนภาพตัวอย่างระบบ.

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

## ค่า env ฝั่ง frontend (Frontend Env)

เริ่มจาก `apps/frontend/.env.production.example`.

ค่าที่จำเป็น:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

ค่า `VITE_*` ทั้งหมดจะถูก compile เข้า frontend bundle ตอน build.

## ตั้งค่า Supabase (Supabase Setup)

1. สร้าง Supabase project.
2. คัดลอก project URL ไปใส่ `SUPABASE_URL` และ `VITE_SUPABASE_URL`.
3. ตั้ง `SUPABASE_JWT_ISSUER` เป็น `<SUPABASE_URL>/auth/v1`.
4. คัดลอก anon public key ไปใส่ `VITE_SUPABASE_ANON_KEY` และ backend `SUPABASE_ANON_KEY`.
5. คัดลอก service role key ไปใส่เฉพาะฝั่ง backend-only `SUPABASE_SERVICE_ROLE_KEY`.
6. สร้าง storage bucket ชื่อ `avatars`.
7. ตั้ง `SUPABASE_STORAGE_BUCKET=avatars`.
8. เลือกรูปแบบ storage access:
   - Production: bucket private พร้อม `SUPABASE_STORAGE_ACCESS=signed`.
   - เฉพาะ development: code รองรับ public buckets ได้ แต่ production readiness จะล้มจนกว่าจะใช้ signed URLs.

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

## ลำดับ deploy

เส้นทาง hosting แรกที่แนะนำ: ทำตาม `DEPLOY_RENDER.md`.

0. รัน static deployment readiness checks ในเครื่อง:

```bash
bun run secrets:check
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
bun run predeploy:check
bun run backend:check
bun run frontend:check
```

`backend:check` ต้องมี database ที่เชื่อมต่อได้สำหรับ persistence tests ถ้า local Docker ไม่ได้รันอยู่ ให้เปิด Docker/Postgres ก่อน หรือรัน check กับ staging database.

1. เตรียม production Postgres.
2. ใส่ backend env values.
3. รัน database migrations:

```bash
cd apps/backend
bunx prisma migrate deploy
```

4. Deploy backend.
5. ตรวจ backend health:

```bash
curl https://api.example.com/health
```

6. ตรวจ backend traffic readiness:

```bash
curl https://api.example.com/ready
```

`/health` เป็น basic liveness และ database check. `/ready` เข้มกว่าและควรเขียวก่อนส่งผู้ใช้จริงเข้า backend; ต้องมี database connectivity, OpenRouter configuration, production auth/storage hardening, `CHAT_PROVIDER_LIVE_VERIFIED=1` หลังทดสอบแชทจริงผ่าน, และ `IMAGE_GENERATION_LIVE_VERIFIED=1` หลังทดสอบสร้างรูปจริงผ่าน.
response ของ `/health` และหน้า `/admin/health` ยังแสดง CIA/AAA security posture: confidentiality, integrity, availability, authentication, authorization, และ accounting/audit.

7. Build frontend ด้วย production API URL:

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

8. Deploy frontend.
9. รัน smoke กับ production backend:

```bash
SMOKE_API_BASE_URL=https://api.example.com bun run production:check
```

ถ้าต้อง debug เฉพาะจุดหลัง gate ล้ม ให้รันเฉพาะ path ที่ต้องใช้:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

`production:check` คือ gate สุดท้ายแบบเข้ม. คำสั่งนี้จะพิมพ์ `bun run deploy:status` ก่อน เพื่อให้เห็น blocker summary และ next steps ก่อน strict smoke gates จะล้ม. Gate นี้จะล้มถ้า backend URL ยังเป็น local, auth ไม่ใช่ Supabase JWT, avatar storage ไม่ใช่ Supabase signed URL, bucket `avatars` จริง upload/fetch ผ่าน signed URLs ไม่ได้, CORS เป็น local หรือไม่ใช่ HTTPS, OpenRouter ยังไม่มี, image generation provider ยังไม่มี, หรือ live chat/image provider calls ล้ม.

ก่อนถึง final gate ให้ใช้ `staging:verify` กับ staging backend ที่ deploy แล้ว:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

คำสั่งนี้จะพิมพ์ deploy status summary ก่อน แล้วจับ local URLs, local/non-https CORS, signed-storage mistakes, `/ready` failures, และ admin smoke coverage ที่ขาด โดยยังยอมให้ chat/image live verification flags ค้างเป็น pending จนกว่า dedicated provider smoke จะผ่าน.

GitHub workflow `Production Smoke` ต้องมี repository secrets `SUPABASE_URL` และ `SUPABASE_SERVICE_ROLE_KEY` ด้วย เพื่อให้ตรวจ bucket `avatars` แบบ private ได้จริงแทนการเชื่อ backend health flags อย่างเดียว.
Workflow นี้ยังต้องมี `SMOKE_ADMIN_API_KEY` เพื่อให้ smoke run ตรวจ admin summary, moderation reports, และ audit logs แทนการข้าม admin-only APIs เงียบ ๆ.

`smoke:chat` และ provider gate รวมอย่าง `api:smoke:live` จะเช็ก wallet ของผู้ใช้ smoke ก่อนเรียก OpenRouter ให้คงยอดผู้ใช้ smoke ไว้สูงกว่า `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ค่าเริ่มต้น `1000` หรือปรับ threshold ถ้า prompt ทดสอบหนักกว่าเดิม ถ้า backend คืน `usage.providerFailure` แปลว่า route ติดต่อได้แล้ว แต่ live provider path ยังถูกบล็อกอยู่ ให้ตรวจเครดิต/โควตา OpenRouter, สิทธิ์โมเดล, ความถูกต้องของ key, การเชื่อมต่อออกไป OpenRouter, และ log ระบบหลังบ้านก่อน deploy.

`smoke:image` ตรวจ image provider configuration โดยค่าเริ่มต้นจะไม่ใช้เครดิตสร้างรูป. ถ้าต้องการสร้าง avatar จริง 1 รูปบน staging/production ให้รัน `bun run smoke:image:live` หรือ `SMOKE_IMAGE_LIVE=1 bun run smoke:image`; คำสั่งนี้จะเรียก `/creator/ai-draft` และล้มถ้า Creator Studio fallback ไปใช้ภาพตัวอย่างระบบ.

สำหรับ production ให้ใช้ `SMOKE_ACCESS_TOKEN` จริงสำหรับ user flows และตั้ง `SMOKE_ADMIN_API_KEY` เสมอสำหรับ admin smoke checks. ถ้าใช้ `SMOKE_USER_ID` แทน access token ต้องตั้ง `SMOKE_ADMIN_API_KEY` ด้วย เพื่อให้ backend มอง header-based user id เป็น admin-only smoke path ไม่ใช่ public authentication.

สำหรับ hard production gate ให้รัน `bun run production:check` โดยตั้ง `SMOKE_API_BASE_URL`, smoke auth, Supabase storage, และ admin smoke variables ชุดเดียวกัน. ใช้ `smoke:live`, `smoke:chat`, หรือ `smoke:image:live` เฉพาะตอน retry provider path ที่ fail แบบแคบลง. ในการ verify staging รอบแรก ให้รัน `api:smoke:live` หรือ live smoke command ที่แคบกว่า, ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` หลัง live chat สำเร็จ, ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` หลัง live image สำเร็จ, แล้วค่อย rerun `production:check`.

ห้ามชี้ `backend:check`, `qa:local`, หรือ `qa:live` ไปที่ production data เว้นแต่ตั้งใจให้ automated persistence tests สร้างและ archive test records ที่นั่นจริง ๆ ให้ใช้ gates เหล่านี้กับ local หรือ staging databases.

10. ทำ manual QA จาก `DEPLOYMENT_QA.md` ให้ครบ แล้วกรอก `RELEASE_HANDOFF.md` ด้วย URL หน้าบ้าน/ระบบหลังบ้านที่ deploy แล้ว, ผล migration, สถานะ storage/auth/CORS, ผล live smoke, ข้อจำกัดที่ยังรู้, และบันทึก go/no-go. รัน `bun run release:handoff:check -- --filled` ก่อนแชร์ handoff.

หลังแต่ละ deploy สามารถรัน manual GitHub Actions workflow `Production Smoke` ได้ด้วย.
ตั้ง repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, และเลือกอย่างใดอย่างหนึ่งระหว่าง `SMOKE_ACCESS_TOKEN` หรือ `SMOKE_USER_ID`.
`SMOKE_API_BASE_URL` ต้องเป็น backend URL ที่ deploy แล้วแบบ `https://`. Workflow จะปฏิเสธ `http://`, localhost, และ signed-storage secrets ที่ขาด ก่อนมีโอกาสใช้เครดิตผู้ให้บริการ.
Workflow จะตรวจ admin summary, moderation reports, และ audit logs ผ่าน `SMOKE_ADMIN_API_KEY` ทุกครั้งโดยไม่ใช้เครดิตผู้ให้บริการ.
เปิด `run_chat` เฉพาะตอนต้องการใช้ provider credit เล็กน้อยเพื่อยืนยัน live AI path. คง `min_token_balance_for_chat` ไว้ที่ `1000` เว้นแต่ smoke model หรือ prompt ต้องการ buffer มากกว่าเดิม.
เปิดทั้ง `run_chat` และ `run_image` เมื่อต้องการให้ workflow รัน provider gate รวม `api:smoke:live` หลัง strict production readiness checks.

## หมายเหตุ Production Readiness

- migrations ล่าสุดมี reports, admin audit logs, wallet token transactions, และ user content settings แล้ว ให้รัน `bunx prisma migrate deploy` ก่อนเปิด backend เสมอ.
- Production auth ปฏิเสธการ impersonate ด้วย plain `x-user-id`. ใช้ Supabase access tokens สำหรับ users และเก็บ `SMOKE_USER_ID` ไว้ใช้เฉพาะ admin-key smoke tests.
- Admin actions เขียน audit logs สำหรับ report status changes, hidden characters, archived messages, และ manual token adjustments.
- Payment ยังไม่ได้เชื่อมต่อ ใช้ Wallet admin token adjustment เฉพาะ beta/manual grants จนกว่าจะเพิ่ม payment provider.
- Production smoke tests ต้องใช้ Supabase access token จริงหรือ UUID user id ที่ authorize ด้วย admin key และการทดสอบแชทจริงต้องเติม wallet ของผู้ใช้นั้นก่อน.
- Live image smoke เป็น opt-in ผ่าน `bun run smoke:image:live` หรือ `SMOKE_IMAGE_LIVE=1` สำหรับ `smoke:image` ส่วน `production:check`, `qa:live`, และ `api:smoke:live` ตั้งใจบังคับใช้ real image provider call.
