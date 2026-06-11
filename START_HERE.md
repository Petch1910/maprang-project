# Maprang AI - Start Here

เอกสารนี้เป็นเส้นทางรันระบบหลักของ repo ปัจจุบัน ให้ยึดไฟล์นี้แทนโน้ตเก่าที่พูดถึง SQLite หรือ stack ที่ไม่ตรงกับโปรเจกต์แล้ว

## Stack ปัจจุบัน

- Frontend: React 19, Vite, Redux Toolkit, Tailwind, Playwright smoke
- Backend: Bun, Elysia, Prisma, PostgreSQL
- Local chat runtime: `local/mock-roleplay` ใช้เล่นและ QA ในเครื่องได้โดยไม่ใช้เครดิต provider
- Production chat/image runtime: ต้องมี live provider และรัน live smoke ก่อนปล่อยจริง
- Auth/storage production: Supabase JWT และ Supabase Storage bucket `avatars` แบบ signed URL

## รันแบบ local

รันจาก repo root:

```powershell
cd C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project
```

1. เปิด PostgreSQL ด้วย Docker

```powershell
docker compose up -d
```

2. เตรียมฐานข้อมูล backend

```powershell
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun prisma/seed.ts
```

3. รัน backend

```powershell
cd apps/backend
bun run dev
```

ค่าเริ่มต้นของ backend คือ `http://127.0.0.1:3000`

ถ้า `apps/backend/.env` override `PORT` เช่น `PORT=3001` ให้ถือ URL นั้นเป็น backend local URL ของเครื่องนั้น และตั้ง smoke/frontend ให้ตรงกัน:

```powershell
$env:SMOKE_API_BASE_URL="http://127.0.0.1:3001"
```

`bun run smoke:doctor`, `bun run api:smoke`, `bun run deploy:status`, และ `bun run e2e:smoke` จะอ่าน `PORT` จาก `apps/backend/.env` ให้อัตโนมัติเมื่อยังไม่ได้ตั้ง smoke/e2e backend URL; ถ้าตรวจ staging/deployed URL ให้ตั้ง `SMOKE_API_BASE_URL` หรือ `E2E_API_BASE_URL` เป็น backend origin จริงเสมอ.

4. รัน frontend

```powershell
cd apps/frontend
bun run dev
```

ค่าเริ่มต้นของ frontend คือ `http://127.0.0.1:5173`

ถ้า backend ใช้พอร์ตอื่น ให้ตั้ง `VITE_API_BASE_URL` ใน `apps/frontend/.env` เป็น backend URL เดียวกัน แล้ว restart frontend ก่อนตรวจ browser smoke

## ตรวจระบบเร็ว

รันจาก repo root:

```powershell
bun run secrets:check
bun run frontend:static:audit
bun run frontend:route:audit
bun run api:audit
bun run tests:audit
```

ถ้ามี backend และ database รันอยู่ ให้ตรวจ local playable flow:

```powershell
bun run qa:seed
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```

## Full local QA gate

ใช้ก่อน commit หรือก่อนบอกว่าระบบ local พร้อม:

```powershell
bun run qa:repo
bun run qa:full
```

`qa:full` จะครอบ repo-owned checks และ browser smoke แล้ว seed QA data กลับท้ายงานอีกครั้งเพื่อให้ local app ยังพร้อมเล่นหลัง e2e; มันยังไม่แทน staging/production live smoke

## ก่อน staging และ production

ต้องมีของจริงเหล่านี้ก่อน:

- Backend HTTPS URL จริง
- Frontend HTTPS URL จริง
- `CORS_ORIGINS` เป็น frontend origin จริงเท่านั้น
- Production/Staging `DATABASE_URL`
- Supabase project จริง
- Supabase Storage bucket `avatars` แบบ private + signed URL
- Live chat provider verified ด้วย `bun run smoke:chat`
- Live image provider verified ด้วย `bun run smoke:image:live`

ตรวจ staging:

```powershell
bun run staging:verify
```

ตรวจ production:

```powershell
bun run production:check
```

## Source of truth

- แผนทดสอบหลัก: `docs/MAPRANG_TEST_PLAN.md`
- ตาราง route/menu: `ROUTE_MENU_AUDIT.md`
- เช็กลิสต์ production: `memory/production/checklist.md`
- ตัวกั้น deploy ล่าสุด: `memory/deploy-blockers.md`
- วิธีให้ agent ทำงานต่อ: `AGENTS.md` และ `agent.md`
