# ระบบหลังบ้าน Maprang (Maprang Backend)

Bun + Elysia backend สำหรับ Maprang AI.

## ใช้ทำอะไร

- API สำหรับ chat, character, creator draft, avatar upload, wallet/usage, reports, moderation, prompt inspector, automated evals และ health/readiness.
- Production auth ใช้ Supabase JWT; local dev อนุญาต fallback ตาม guard ใน `security.ts`.
- Storage production ใช้ Supabase `avatars` bucket แบบ signed URL.
- AI chat ใช้ OpenRouter-compatible provider; image generation ใช้ provider ที่ตั้งค่าไว้หรือ fallback เฉพาะ local/dev.

## คำสั่งหลัก

```bash
bun install
bunx prisma generate
bunx prisma migrate deploy
bun run start
bun run backend:check
```

## ค่า env (Env)

เริ่มจาก `.env.example` หรือ `.env.production.example`.

- `DATABASE_URL` ต้องเป็น Postgres URL ที่ถูกต้อง; production ต้องมี `sslmode=require`.
- `OPENROUTER_API_KEY` ต้องเป็น OpenRouter key สำหรับ chat/creator text drafting.
- `ADMIN_API_KEY` ต้องเป็นค่าสุ่มยาวและอยู่ backend-only.
- `SUPABASE_SERVICE_ROLE_KEY` ห้ามหลุดไป frontend.
- `IMAGE_GENERATION_API_KEY` หรือ `OPENAI_API_KEY` ใช้เมื่อจะเปิดการสร้างรูปจริง.

ดู deployment gate, smoke commands, และ production blockers ที่ repo root `README.md`, `DEPLOYMENT_QA.md`, และ `PRODUCTION_SETUP.md`.
