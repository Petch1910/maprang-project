# คู่มือ Maprang Local Server Runbook

เป้าหมายของเอกสารนี้คือทำให้ Maprang ใช้งานแบบ local server ได้จริงก่อน โดยไม่บังคับ deploy cloud เป็นเป้าหมายแรก

## เป้าหมาย

Local server หมายถึง:

- backend รันบนเครื่องนี้ เช่น `http://127.0.0.1:3001`
- frontend รันบนเครื่องนี้ เช่น `http://127.0.0.1:5173`
- PostgreSQL รันในเครื่องหรือ Docker
- provider จริง เช่น OpenRouter/image provider ใช้ได้จาก backend local
- Supabase Auth/Storage ใช้ได้ถ้าตั้งค่าไว้ แต่ local upload/storage ยังใช้โหมด local ได้เมื่อต้องการ QA deterministic
- Ngrok ใช้เฉพาะเมื่ออยากให้เครื่องอื่นหรือคนอื่นเข้ามาลองผ่าน HTTPS ชั่วคราว

## สถานะล่าสุด

วันที่ 2026-06-17 `bun run qa:full` ผ่านแล้ว จึงถือว่า local server baseline เล่นได้ครบตามระบบปัจจุบัน:

- repo QA/static/security/API/docs/memory ผ่าน
- QA seed พร้อมหลังจบ smoke
- local smoke ผ่าน
- API smoke ผ่าน
- desktop/mobile browser e2e ผ่าน
- backend tests ผ่าน 329 tests / 1430 expects
- frontend route audit ผ่าน 20 routes
- API audit ผ่าน 75 backend routes / 51 frontend helpers

## ลำดับ Startup Order

เส้นทางสั้นสำหรับเปิดใช้งานในเครื่องเดียว:

```powershell
bun run local:up
```

คำสั่งนี้จะทำตามลำดับ `docker compose up -d postgres`, `bunx prisma migrate deploy`, `bun run qa:seed`, เปิด backend ที่ `http://127.0.0.1:3001`, และเปิด frontend ที่ `http://127.0.0.1:5173`

ถ้า PostgreSQL/migration/seed พร้อมอยู่แล้วและต้องการเปิดเฉพาะ backend/frontend:

```powershell
bun run local:up -- --skip-docker --skip-migrate --skip-seed
```

ถ้าต้องเปลี่ยน port:

```powershell
bun run local:up -- --backend-port 3010 --frontend-port 5174
```

ขั้นตอนแบบแยกคำสั่งยังใช้ได้ตามนี้:

1. เปิด PostgreSQL

```powershell
docker compose up -d postgres
```

2. รัน migration ถ้าฐานข้อมูลยังไม่ล่าสุด

```powershell
cd apps/backend
bunx prisma migrate deploy
```

3. รัน backend

```powershell
cd apps/backend
bun run start
```

ค่า backend default ที่ smoke ใช้คือ `http://127.0.0.1:3001` ถ้าเปลี่ยน `PORT` ให้ตั้ง `VITE_API_BASE_URL`, `SMOKE_API_BASE_URL`, และ `E2E_API_BASE_URL` ให้ตรงกัน

4. รัน frontend

```powershell
cd apps/frontend
bun run dev -- --host 127.0.0.1
```

5. เตรียม QA seed เมื่อต้องการข้อมูลพร้อมเล่น

```powershell
bun run qa:seed
```

## เกต Local Acceptance Gate

เช็ค wiring ของ repo ก่อนรันชุดยาว:

```powershell
bun run local:doctor
```

ใช้คำสั่งนี้เป็น gate หลักของ local server:

```powershell
bun run qa:full
```

คำสั่งนี้จะรัน:

- `qa:repo`
- `qa:seed`
- `smoke:doctor`
- `smoke:local`
- `api:smoke`
- `e2e:smoke`
- `qa:seed` อีกรอบหลัง browser smoke ล้างข้อมูล

ถ้า `qa:full` ผ่าน แปลว่า local server พร้อมใช้งานตาม baseline ปัจจุบัน

## สำรองและกู้คืนฐานข้อมูล Local

ก่อนให้คนอื่นใช้เครื่องนี้เล่นจริง หรือก่อนแก้ migration/seed ชุดใหญ่ ให้สำรองฐานข้อมูล local ก่อน:

```powershell
bun run local:db:backup
```

ค่าเริ่มต้นจะสร้างไฟล์ dump ไว้ใน `/backups/` เช่น `backups/maprang-local-20260617T123456Z.dump` โดยใช้ Docker service `postgres`, user `admin`, database `maprang_local`, และ format แบบ custom dump ของ PostgreSQL (`*.dump`)

ถ้าต้องกำหนดชื่อไฟล์เอง:

```powershell
bun run local:db:backup -- --file backups/before-large-change.dump
```

การกู้คืนจะล้าง object ที่มีอยู่และเขียนทับฐานข้อมูล local ดังนั้นต้องใส่ `--confirm-restore` ทุกครั้ง:

```powershell
bun run local:db:restore -- --file backups/before-large-change.dump --confirm-restore
```

ถ้าใช้ database/user/service ไม่ตรงกับ `docker-compose.yml`:

```powershell
bun run local:db:backup -- --database maprang_local --user admin --service postgres
```

ไฟล์ใน `/backups/`, `*.dump`, และ `*.backup` ถูกกันไว้ใน `.gitignore` แล้ว ห้าม commit dump เข้า repo

## พรีวิวสาธารณะ Public Preview With Ngrok

ถ้าต้องการให้คนอื่นลองจากนอกเครื่อง ใช้ Ngrok ตาม `docs/NGROK_STAGING_RUNBOOK.md`

หลักการ:

- เปิด frontend/backend local ตามปกติ
- รัน `bun run ngrok:proxy`
- เปิด Ngrok ไปที่ proxy port `8787`
- ตั้ง `CORS_ORIGINS`, `VITE_API_BASE_URL`, `SMOKE_API_BASE_URL`, `E2E_BASE_URL`, และ `E2E_API_BASE_URL` เป็น Ngrok HTTPS origin เดียวกัน

Ngrok ใช้ได้สำหรับ public preview และ staging smoke ชั่วคราว แต่ไม่ใช่ production release ถาวร

## สถานะงาน Local Server Tasks

งาน local server ที่ปิดแล้ว:

1. คำสั่ง startup รวมศูนย์: `bun run local:up`
2. Health dashboard แยกขั้นตอน `Local server`, `Ngrok preview / staging`, `Live provider smoke`, และ `Cloud production` บน `/admin/health`
3. Backup/restore ฐานข้อมูล local: `bun run local:db:backup` และ `bun run local:db:restore -- --file <dump> --confirm-restore`
4. Runtime artifact policy: `/runtime/`, `/backups/`, `*.dump`, และ `*.backup` ไม่เข้า source

Operator checklist ก่อนเปิด local server ให้คนอื่นลอง:

1. รัน `bun run local:db:backup` ก่อนเปิดรอบทดสอบจริง
2. เปิดด้วย `bun run local:up` หรือระบุพอร์ตเองด้วย `--backend-port` และ `--frontend-port`
3. เปิด firewall เฉพาะพอร์ตที่ใช้จริง และอย่า expose Postgres ตรง ๆ
4. ตรวจ `/admin/health` และรัน `bun run qa:full` เมื่อมีการเปลี่ยนโค้ดหรือข้อมูล seed สำคัญ
5. ถ้าใช้ provider จริง ให้ตรวจ quota/key ก่อน และใช้ `smoke:chat` หรือ `smoke:image:live` เฉพาะตอนต้องการยืนยัน live provider

งานที่ยังเป็น future/external:

1. ถ้าจะให้คนอื่นใช้จริงผ่านเครื่องนี้ระยะยาว ให้เพิ่ม reverse proxy/domain/HTTPS ถาวร แทน Ngrok ฟรี
2. ถ้าเปลี่ยนเป้าหมายเป็น cloud production ให้กลับไปใช้ `production:check` และ `RELEASE_HANDOFF.md`

## สิ่งที่ยังไม่ใช่ Local Blocker

รายการเหล่านี้ไม่บล็อก local server:

- deployed backend HTTPS URL ถาวร
- deployed frontend HTTPS domain ถาวร
- managed production database
- cloud release handoff
- payment/top-up จริง

รายการเหล่านี้จะกลับมาเป็น blocker เมื่อเปลี่ยนเป้าหมายจาก local server เป็น production cloud release
