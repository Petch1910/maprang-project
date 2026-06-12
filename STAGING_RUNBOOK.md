# คู่มือรัน Staging

เป้าหมายคือปล่อย staging ให้เหมือน production จริงก่อนเปิด production เพื่อจับปัญหา env, DB, CORS, storage, ผู้ให้บริการสร้างรูป และ UI flow แบบ end-to-end

## ขั้นที่ 1 ตั้งค่า Supabase สำหรับ Staging

- สร้าง Supabase project สำหรับ staging แยกจาก production
- สร้าง Storage bucket ชื่อ `avatars`
- แนะนำให้ bucket เป็น private แล้วให้ backend สร้าง signed URL
- หลังใส่ค่า Supabase backend env แล้ว รัน `bun run supabase:storage:setup` เพื่อให้ repo สร้าง/ตรวจ bucket, อัปโหลดไฟล์ smoke, สร้าง signed URL และลบไฟล์ทดสอบ
- ตั้ง env ฝั่ง backend:
  - `SUPABASE_URL=https://<project-ref>.supabase.co`
  - `SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1`
  - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
  - `SUPABASE_ANON_KEY=<anon-key>`
  - `STORAGE_PROVIDER=supabase`
  - `SUPABASE_STORAGE_BUCKET=avatars`
  - `SUPABASE_STORAGE_ACCESS=signed`
  - `SUPABASE_SIGNED_URL_EXPIRES_IN=3600`
- ตั้ง env ฝั่ง frontend:
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon-key>`

## ขั้นที่ 2 ตั้งค่า backend สำหรับ Staging

- Deploy backend บน Render หรือ Railway
- ตั้ง `DATABASE_URL` เป็น Postgres staging จริง พร้อม `sslmode=require`
- ตั้ง `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, token cost และ rate-limit env
- ตั้ง `MODEL_TEMPERATURE=0.85`, `MODEL_MAX_OUTPUT_TOKENS=1600`, `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420` และใช้ค่า retry default เพื่อให้แชท roleplay ไม่ตอบสั้นเกินและทน provider timeout ชั่วคราวได้ดีขึ้น
- ตั้ง `IMAGE_GENERATION_API_KEY` หรือผู้ให้บริการจริง ถ้าต้องการให้ Creator Studio สร้างรูปจริง
- รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging ให้ผ่านก่อน แล้วค่อยตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`
- รัน `bun run smoke:image:live` หรือ `bun run api:smoke:live` กับ staging ให้ผ่านก่อน แล้วค่อยตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`
- หลัง live smoke ผ่าน ให้คัด JSON `handoffEvidence` ลง `RELEASE_HANDOFF.md` โดยเก็บ `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, `Chat smoke stream walletTransactionId`, `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs`; ถ้าใช้ `api:smoke:live` แล้ว summary ยังไม่มี `handoffEvidence` ให้ถือว่าหลักฐานรวมยังไม่ครบ
- ตั้ง `ADMIN_API_KEY` เป็นค่าสุ่มยาวใหม่สำหรับ staging
- ตั้ง `CORS_ORIGINS=https://<frontend-staging-domain>`
- `CORS_ORIGINS` ต้องเป็น frontend HTTPS origin จริงเท่านั้น และต้องไม่ใช้ localhost, `127.0.0.1`, `0.0.0.0`, `::1`, `http://`, wildcard, credential/userinfo, path/query/hash, หรือ backend URL
- ตั้ง health check path เป็น `/ready`
- รัน migration:

```bash
bunx prisma migrate deploy
```

## ขั้นที่ 3 ตั้งค่า frontend สำหรับ Staging

- Deploy frontend บน domain ทดลอง
- ตั้ง:
  - `VITE_API_BASE_URL=https://<backend-staging-domain>`
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon-key>`
- เปิด `/admin/health` แล้วเช็ก deploy checklist ให้เขียวมากที่สุด
- ใน `/admin/health` ต้องเห็น section `ลำดับงานก่อนปล่อยจริง` พร้อมคำสั่ง `bun run staging:verify + bun run e2e:smoke`, `bun run api:smoke:live`, และ `bun run production:check` เพื่อใช้เป็น handoff UI สำหรับคนกด deploy รอบสุดท้าย

## ขั้นที่ 4 เตรียม QA seed และ smoke

รันกับ staging หลัง migration:

ก่อน deploy ให้ตรวจ env ทั้งสองฝั่งแบบไม่เปิดเผย secret:

ก่อนยิง smoke staging ให้ตรวจ UI/static control และ route wiring จาก repo root เพื่อจับปุ่มตัน ลิงก์หลุด route และเอกสารเมนูที่ drift โดยไม่ต้องรอ backend staging:

```bash
bun run frontend:static:audit
bun run frontend:route:audit
bun run route-menu:audit
```

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env --allow-unverified-image
```

ตัด `--allow-unverified-image` ออกหลัง `smoke:image:live` หรือ `api:smoke:live` ผ่านและตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` แล้ว และอย่าตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จนกว่า `smoke:chat` หรือ chat path ใน `api:smoke:live` จะคืนคำตอบจริงพร้อม usage

ก่อนรัน `production:check` ให้เครื่องหรือ CI ที่รัน smoke มี `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, `SUPABASE_STORAGE_ACCESS=signed`, และ `SUPABASE_SIGNED_URL_EXPIRES_IN=3600` เพื่อให้ตรวจ bucket จริงได้

```bash
bun run deploy:status
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:doctor
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:ready
SMOKE_API_BASE_URL=https://<backend-staging-domain> SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run production:check
E2E_BASE_URL=https://<frontend-staging-domain> E2E_API_BASE_URL=https://<backend-staging-domain> bun run e2e:smoke
```

`E2E_BASE_URL` และ `E2E_API_BASE_URL` ต้องเป็น origin จริงเท่านั้น: local dev ใช้ `http://127.0.0.1` ได้ แต่ staging/production ต้องเป็น `https`, ไม่มี credential/userinfo และไม่มี path/query/hash.
เมื่อสองค่านี้เป็น deployed HTTPS origins แล้ว Playwright จะใช้ staging ที่ deploy แล้วโดยไม่ start local dev server; local loopback เท่านั้นที่จะ start backend/frontend dev server ให้อัตโนมัติ.

ถ้าต้องให้ CI/dashboard อ่านผลโดยไม่ parse stderr ให้รัน `bun scripts/deploy-status.ts --json`. ผลลัพธ์ JSON มี `stagingBlockers`, `stagingFixes`, `productionBlockers`, และ `productionFixes` เป็น top-level fields สำหรับ dashboard/automation โดยตรง. เมื่อ root identity หรือ `/health` อ่านไม่ได้ ผลลัพธ์ JSON จะยังคืน `ok=false`, `failures`, `nextSteps`, และ `rootIdentity.ok=false` เพื่อบอกสาเหตุและขั้นถัดไปอย่างเป็นโครงสร้าง.

ก่อนถึง live provider gate สามารถรัน pre-production dry run จากเครื่อง dev/CI ที่มี Supabase storage env และ admin smoke key:

```bash
bun run staging:check
```

Staging CORS ต้องผ่านกฎ `local/non-https CORS` ชุดเดียวกับ production ก่อนใช้ผล live provider smoke เป็นหลักฐานสำหรับ release.

คำสั่งนี้เช็กโค้ด, backend tests, frontend build, Playwright บนเดสก์ท็อป/มือถือ, signed storage จริง, และ admin API smoke โดยไม่ถือว่า domain/live provider พร้อม production แทน `production:check`

หลัง backend/frontend staging มี URL จริงแล้ว ให้ใช้ `bun run staging:verify` พร้อม `SMOKE_API_BASE_URL` และ `SMOKE_ADMIN_API_KEY` เพื่อตรวจว่า staging ไม่ได้ชี้ localhost/loopback, CORS ไม่ใช่ local/non-https, Supabase signed storage ใช้งานได้, `/ready` ตอบถูก และ admin smoke ผ่าน โดยยังไม่บังคับตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` / `IMAGE_GENERATION_LIVE_VERIFIED=1` จนกว่าจะผ่าน live provider smoke

ถ้า `smoke:doctor` ยังพิมพ์ `productionBlockers` เช่น local/non-https CORS หรือ storage ไม่ใช่ signed Supabase ให้แก้ env ของ staging ก่อนถือว่าผ่าน

หมายเหตุ: `qa:seed` ถูกออกแบบมาสำหรับ DB ที่ทีมควบคุมอยู่ ใช้กับ staging ได้ แต่ไม่ควรรันใส่ production จริงโดยไม่ตั้งใจ

## ขั้นที่ 5 ตัดสินใจ Go/No-Go ก่อน Production

- `/ready` ผ่าน
- `/admin/health` แสดง DB connected
- `/admin/health` แสดง CIA/AAA Security Posture พร้อมครบ หรือมีเหตุผลชัดเจนถ้ายังไม่ครบ
- OpenRouter ตั้งค่าพร้อม
- OpenRouter chat provider ต้องผ่าน live smoke และตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`
- ผู้ให้บริการสร้างรูปต้องตั้งค่าพร้อมและผ่าน live smoke พร้อมตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ถ้าจะเปิดฟีเจอร์สร้างรูปจริงใน production
- Supabase Auth ตั้งค่าพร้อมทั้ง backend/frontend
- พื้นที่เก็บรูปตัวละครเป็น Supabase + signed URL
- CORS เป็น frontend HTTPS origin จริงเท่านั้น ไม่ใช่ localhost/loopback, `http://`, wildcard, credential/userinfo, path/query/hash, หรือ backend URL
- `production:check` ผ่านโดยไม่มี `productionBlockers`
- `api:smoke:live` หรือ `smoke:chat` ต้องผ่านสำหรับแชท ถ้าระบบคืนรหัส `providerFailure` จาก OpenRouter ยังห้ามถือว่าพร้อม production
- `api:smoke:live` หรือ `smoke:image:live` ต้องผ่านสำหรับรูป ถ้าผู้ให้บริการสร้างรูปติดวงเงินหรือโควตา ยังห้ามถือว่าพร้อม production
- `e2e:smoke` ผ่าน desktop และ mobile
- Route/Menu Audit ไม่มีปุ่มหลักที่กดแล้วไม่เกิดผล
