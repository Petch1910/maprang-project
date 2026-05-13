# Staging Runbook

เป้าหมายคือปล่อย staging ให้เหมือน production จริงก่อนเปิด production เพื่อจับปัญหา env, DB, CORS, storage, image provider และ UI flow แบบ end-to-end

## 1. Supabase Staging

- สร้าง Supabase project สำหรับ staging แยกจาก production
- สร้าง Storage bucket ชื่อ `avatars`
- แนะนำให้ bucket เป็น private แล้วให้ backend สร้าง signed URL
- หลังใส่ค่า Supabase backend env แล้ว รัน `bun run supabase:storage:setup` เพื่อให้ repo สร้าง/ตรวจ bucket, อัปโหลดไฟล์ smoke, สร้าง signed URL และลบไฟล์ทดสอบ
- ตั้ง backend env:
  - `SUPABASE_URL=https://<project-ref>.supabase.co`
  - `SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1`
  - `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`
  - `SUPABASE_ANON_KEY=<anon-key>`
  - `STORAGE_PROVIDER=supabase`
  - `SUPABASE_STORAGE_BUCKET=avatars`
  - `SUPABASE_STORAGE_ACCESS=signed`
  - `SUPABASE_SIGNED_URL_EXPIRES_IN=3600`
- ตั้ง frontend env:
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon-key>`

## 2. Backend Staging

- Deploy backend บน Render หรือ Railway
- ตั้ง `DATABASE_URL` เป็น Postgres staging จริง พร้อม `sslmode=require`
- ตั้ง `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, token cost และ rate-limit env
- ตั้ง `MODEL_TEMPERATURE=0.85`, `MODEL_MAX_OUTPUT_TOKENS=1200`, `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320` และใช้ค่า retry default เพื่อให้แชท roleplay ไม่ตอบสั้นเกินและทน provider timeout ชั่วคราวได้ดีขึ้น
- ตั้ง `IMAGE_GENERATION_API_KEY` หรือ provider จริง ถ้าต้องการให้ Creator Studio สร้างรูปจริง
- รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging ให้ผ่านก่อน แล้วค่อยตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`
- รัน `bun run smoke:image:live` หรือ `bun run api:smoke:live` กับ staging ให้ผ่านก่อน แล้วค่อยตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`
- ตั้ง `ADMIN_API_KEY` เป็นค่าสุ่มยาวใหม่สำหรับ staging
- ตั้ง `CORS_ORIGINS=https://<frontend-staging-domain>`
- ตั้ง health check path เป็น `/ready`
- รัน migration:

```bash
bunx prisma migrate deploy
```

## 3. Frontend Staging

- Deploy frontend บน domain ทดลอง
- ตั้ง:
  - `VITE_API_BASE_URL=https://<backend-staging-domain>`
  - `VITE_SUPABASE_URL=https://<project-ref>.supabase.co`
  - `VITE_SUPABASE_ANON_KEY=<anon-key>`
- เปิด `/admin/health` แล้วเช็ก deploy checklist ให้เขียวมากที่สุด

## 4. QA Seed และ Smoke

รันกับ staging หลัง migration:

ก่อน deploy ให้ตรวจ env ทั้งสองฝั่งแบบไม่เปิดเผย secret:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env --allow-unverified-image
```

ตัด `--allow-unverified-image` ออกหลัง `smoke:image:live` หรือ `api:smoke:live` ผ่านและตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` แล้ว และอย่าตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จนกว่า `smoke:chat` หรือ chat path ใน `api:smoke:live` จะคืนคำตอบจริงพร้อม usage

ก่อนรัน `production:check` ให้เครื่องหรือ CI ที่รัน smoke มี `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET=avatars`, `SUPABASE_STORAGE_ACCESS=signed`, และ `SUPABASE_SIGNED_URL_EXPIRES_IN=3600` เพื่อให้ตรวจ bucket จริงได้

```bash
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:doctor
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:ready
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run production:check
E2E_BASE_URL=https://<frontend-staging-domain> E2E_API_BASE_URL=https://<backend-staging-domain> bun run e2e:smoke
```

ก่อนถึง live provider gate สามารถรัน pre-production dry run จากเครื่อง dev/CI ที่มี Supabase storage env และ admin smoke key:

```bash
bun run staging:check
```

คำสั่งนี้เช็กโค้ด, backend tests, frontend build, Playwright desktop/mobile, signed storage จริง, และ admin API smoke โดยไม่ถือว่า domain/live provider พร้อม production แทน `production:check`

ถ้า `smoke:doctor` ยังพิมพ์ `productionBlockers` เช่น local CORS หรือ storage ไม่ใช่ signed Supabase ให้แก้ env ของ staging ก่อนถือว่าผ่าน

หมายเหตุ: `qa:seed` ถูกออกแบบมาสำหรับ DB ที่ทีมควบคุมอยู่ ใช้กับ staging ได้ แต่ไม่ควรรันใส่ production จริงโดยไม่ตั้งใจ

## 5. Go/No-Go ก่อน Production

- `/ready` ผ่าน
- `/admin/health` แสดง DB connected
- `/admin/health` แสดง CIA/AAA Security Posture พร้อมครบ หรือมีเหตุผลชัดเจนถ้ายังไม่ครบ
- OpenRouter configured
- OpenRouter chat provider ต้องผ่าน live smoke และตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`
- Image provider configured และต้องผ่าน live smoke พร้อมตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ถ้าจะเปิดฟีเจอร์สร้างรูปจริงใน production
- Supabase Auth configured ทั้ง backend/frontend
- avatar storage เป็น Supabase + signed URL
- CORS เป็น frontend domain จริง ไม่ใช่ localhost
- `production:check` ผ่านโดยไม่มี `productionBlockers`
- `api:smoke:live` หรือ `smoke:chat` ต้องผ่านสำหรับแชท ถ้า OpenRouter คืน `usage.providerFailure` ยังห้ามถือว่าพร้อม production
- `api:smoke:live` หรือ `smoke:image:live` ต้องผ่านสำหรับรูป ถ้า image provider ติด billing/quota ยังห้ามถือว่าพร้อม production
- `e2e:smoke` ผ่าน desktop และ mobile
- Route/Menu Audit ไม่มีปุ่มหลักที่กดแล้วไม่เกิดผล
