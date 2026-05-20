# Deploy บน Render

เส้นทางนี้เหมาะเป็นเส้นทาง production แรก เพราะ Render โฮสต์ backend แบบ Docker service, frontend static site, และ managed Postgres ได้ในที่เดียว.

## ขั้นที่ 1 สร้าง Postgres

สร้าง Render Postgres database แล้วคัดลอก external connection string.

นำค่านี้ไปใช้เป็น backend `DATABASE_URL`.

ก่อนปล่อย traffic สาธารณะ ให้รัน readiness checks ของ repo ในเครื่องก่อน:

```bash
bun run secrets:check
bun run predeploy:check
bun run backend:check
bun run frontend:check
```

ถ้าเครื่อง local ไม่มี Docker/Postgres ให้รัน `backend:check` กับ staging database ก่อนขึ้น production.

## ขั้นที่ 2 Deploy backend (Deploy Backend)

สร้าง Render Web Service ใหม่จาก repo นี้.

การตั้งค่า:

- Environment: Docker
- Dockerfile path: `apps/backend/Dockerfile`
- Docker context: repository root
- Health check path: `/ready`

env ฝั่ง backend:

```bash
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=<render-postgres-external-url>
OPENROUTER_API_KEY=<openrouter-key>
OPENROUTER_MODEL=google/gemini-2.0-flash-001
MODEL_INPUT_COST_PER_1M=0.1
MODEL_OUTPUT_COST_PER_1M=0.4
MAX_INPUT_CHARS=4000
MIN_TOKEN_BALANCE_FOR_CHAT=1
IMAGE_GENERATION_API_KEY=<openai-image-key>
IMAGE_GENERATION_MODEL=gpt-image-1.5
IMAGE_GENERATION_SIZE=1024x1536
IMAGE_GENERATION_QUALITY=medium
IMAGE_GENERATION_OUTPUT_FORMAT=webp
IMAGE_GENERATION_OUTPUT_COMPRESSION=85
CORS_ORIGINS=https://<frontend-domain>
ADMIN_API_KEY=<long-random-admin-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=avatars
SUPABASE_STORAGE_ACCESS=signed
SUPABASE_SIGNED_URL_EXPIRES_IN=3600
```

อย่าตั้ง `PORT` เอง เว้นแต่ Render ขอให้ตั้ง เพราะ Render inject `PORT` ให้แล้ว.

`CORS_ORIGINS` ต้องเป็น frontend HTTPS origin ที่ deploy แล้วเท่านั้น ห้ามใส่ localhost, origin แบบ `http://`, wildcard origins, หรือ backend URL ใน staging หรือ production.

หลัง backend deploy แล้ว ให้รัน migrations จาก terminal ที่โหลด production env แล้ว หรือจาก Render shell:

```bash
cd apps/backend
bunx prisma migrate deploy
```

migration set ปัจจุบันมี moderation reports และ admin audit logs แล้ว ห้ามข้ามขั้นตอนนี้.

## ขั้นที่ 3 Deploy frontend (Deploy Frontend)

สร้าง Render Static Site จาก repo นี้.

การตั้งค่า:

- Root directory: `apps/frontend`
- Build command: `bun install --frozen-lockfile && bun run build`
- Publish directory: `dist`

env ฝั่ง frontend:

```bash
VITE_API_BASE_URL=https://<backend-domain>
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
```

หลังรู้ frontend URL แล้ว ให้อัปเดต backend `CORS_ORIGINS` ให้ตรงกับ HTTPS origin นั้นแบบ exact match.

## ขั้นที่ 4 ตั้งค่า Supabase Storage

สร้าง bucket:

- Name: `avatars`
- แนะนำ access: private

Backend จะคืน stable URLs ใต้ `/uploads/avatars/<filename>` แล้ว redirect ไปยัง signed Supabase URLs.

## ขั้นที่ 5 ทดสอบ production smoke (Smoke Test Production)

ใช้ Supabase access token จริง หรือ UUID user id ที่รู้แน่นอน:

```bash
SMOKE_API_BASE_URL=https://<backend-domain> SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://<backend-domain> SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

ก่อน `smoke:chat` เรียก OpenRouter ระบบจะตรวจว่าผู้ใช้ smoke มี token อย่างน้อย `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ค่าเริ่มต้น `1000` ให้เติม token ผู้ใช้นี้ผ่าน admin wallet flow ก่อนรัน live production smoke ถ้าใช้ `SMOKE_USER_ID` แทน Supabase token จริง ต้องตั้ง `SMOKE_ADMIN_API_KEY` ด้วย.

ผลที่คาดหวัง:

- `/health` คืนค่า `ok=true`.
- `/ready` คืนค่า `ok=true` ก่อนส่ง traffic จริงเข้า service.
- `/health` รายงาน `imageGenerationConfigured=true` สำหรับการสร้างรูปจริงใน Creator Studio.
- avatar upload คืนค่า `provider=supabase` และ `access=signed`.
- live chat คืนคำตอบ, `chatId`, และ token usage.
