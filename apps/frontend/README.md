# Maprang Frontend

React + Vite frontend สำหรับ Maprang AI.

## ใช้ทำอะไร

- Explore, Character Lobby, Chat, Create, My Chats, Events, Profile/Persona, Wallet, Moderation และ admin utility pages.
- UI หลักต้องเป็นภาษาไทย, mobile-first, dark-mode พร้อมใช้งาน และทุกปุ่มที่กดได้ต้องมีผลลัพธ์จริงหรือ disabled reason ชัดเจน.
- Chat UI ใช้ Redux/Zustand-compatible state direction ตาม `agent.md` และต้องรักษา sandbox/scene, relationship status, world state, report/menu flows.

## คำสั่งหลัก

```bash
bun install
bun run dev --host 127.0.0.1
bun run build
bun run frontend:check
```

## Env

เริ่มจาก `.env.example` หรือ `.env.production.example`.

- `VITE_API_BASE_URL` ชี้ backend URL.
- `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY` ใช้กับ Supabase Auth ฝั่ง browser.
- ห้ามใส่ service role key หรือ backend-only secrets ใน frontend env.

ดู flow รวมและ deploy gates ที่ repo root `README.md`, `DEPLOYMENT_QA.md`, และ `PRODUCTION_SETUP.md`.
