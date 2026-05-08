# Staging Runbook

เป้าหมายคือปล่อย staging ให้เหมือน production จริงก่อนเปิด production เพื่อจับปัญหา env, DB, CORS, storage, image provider และ UI flow แบบ end-to-end

## 1. Supabase Staging

- สร้าง Supabase project สำหรับ staging แยกจาก production
- สร้าง Storage bucket ชื่อ `avatars`
- แนะนำให้ bucket เป็น private แล้วให้ backend สร้าง signed URL
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
- ตั้ง `MODEL_TEMPERATURE=0.85` และ `MODEL_MAX_OUTPUT_TOKENS=900` เพื่อให้แชท roleplay ไม่ตอบสั้นเกิน
- ตั้ง `IMAGE_GENERATION_API_KEY` หรือ provider จริง ถ้าต้องการให้ Creator Studio สร้างรูปจริง
- ตั้ง `ADMIN_API_KEY` เป็นค่ายาวสุ่มใหม่สำหรับ staging
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
- เปิด `/admin/health` แล้วเช็ค deploy checklist ต้องเขียวให้มากที่สุด

## 4. QA Seed และ Smoke

รันกับ staging หลัง migration:

```bash
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:doctor
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:ready
SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run production:check
E2E_BASE_URL=https://<frontend-staging-domain> E2E_API_BASE_URL=https://<backend-staging-domain> bun run e2e:smoke
```

ถ้า `smoke:doctor` ยังพิมพ์ `productionBlockers` เช่น local CORS หรือ storage ไม่ใช่ signed Supabase ให้แก้ env ของ staging ก่อนถือว่าผ่าน

หมายเหตุ: `qa:seed` ถูกออกแบบมาสำหรับ DB ที่ทีมควบคุมอยู่ ใช้กับ staging ได้ แต่ไม่ควรรันใส่ production จริงโดยไม่ตั้งใจ

## 5. Go/No-Go ก่อน Production

- `/ready` ผ่าน
- `/admin/health` แสดง DB connected
- `/admin/health` แสดง CIA / AAA Security Posture พร้อมครบ หรือมีเหตุผลชัดเจนถ้ายังไม่ครบ
- OpenRouter configured
- Image provider configured หรือยอมรับ fallback ชั่วคราวแบบรู้ตัว
- Supabase Auth configured ทั้ง backend/frontend
- avatar storage เป็น Supabase + signed URL
- CORS เป็น frontend domain จริง ไม่ใช่ localhost
- `production:check` ผ่านโดยไม่มี `productionBlockers`
- `e2e:smoke` ผ่าน desktop และ mobile
- Route/Menu Audit ไม่มีปุ่มหลักที่กดแล้วไม่เกิดผล
