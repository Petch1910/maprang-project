# Run Now

ใช้ชุดคำสั่งนี้เมื่ออยากเปิด Maprang ในเครื่องแบบเร็ว โดยยึด PostgreSQL + Prisma + Bun เท่านั้น

## 1. Start database

```powershell
cd C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project
docker compose up -d
```

## 2. Prepare backend database

```powershell
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun prisma/seed.ts
```

## 3. Start backend

```powershell
cd apps/backend
bun run dev
```

Backend local URL: `http://127.0.0.1:3000`

ถ้า `apps/backend/.env` ตั้ง `PORT` เป็นค่าอื่น เช่น `3001` ให้ใช้ URL นั้นแทนทุกจุด และตั้ง smoke/frontend ให้ตรงกัน:

```powershell
$env:SMOKE_API_BASE_URL="http://127.0.0.1:3001"
```

`bun run e2e:smoke` จะอ่าน `PORT` จาก `apps/backend/.env` ให้อัตโนมัติเมื่อยังไม่ได้ตั้ง `E2E_API_BASE_URL`; ถ้ารันกับ staging/deployed URL ให้ตั้ง `E2E_API_BASE_URL` เองเสมอ.

## 4. Start frontend

```powershell
cd apps/frontend
bun run dev
```

Frontend local URL: `http://127.0.0.1:5173`

ถ้า backend ไม่ได้อยู่ที่พอร์ต `3000` ให้ตั้ง `VITE_API_BASE_URL` ใน `apps/frontend/.env` เป็น backend URL เดียวกัน แล้ว restart frontend

## 5. Verify

```powershell
cd C:\Users\Phet\Documents\Codex\2026-05-04\use-github-to-debug-my-project\maprang-project
bun run qa:seed
bun run smoke:doctor
bun run smoke:local
bun run e2e:smoke
```

ถ้าต้องการตรวจแบบเต็มในเครื่อง:

```powershell
bun run qa:full
```

หมายเหตุ: local/dev ใช้ `local/mock-roleplay` ได้ แต่ staging/production ต้องรัน live provider smoke แยกเสมอ
