# แผนที่โปรเจกต์: Maprang AI

อัปเดตล่าสุด: 2026-05-20

## รูปทรงผลิตภัณฑ์

Maprang AI คือแพลตฟอร์ม roleplay ตัวละครภาษาไทยที่ยึด UX แบบ character chat ที่ผู้ใช้คุ้นมือ แต่เพิ่มระบบความสัมพันธ์และฉากแบบ game layer ให้ลึกกว่าแอปแชททั่วไป

พื้นผิวหลัก:
- Explore/Home
- Character Lobby
- Chat Room
- Creator Studio
- My Chats
- Events Inbox
- Profile/Persona
- Wallet
- Admin Moderation
- Admin Health

## พื้นที่ backend

- Character CRUD และ quality validation
- Relationship presets, validation, preview, runtime state
- Scene runtime และ pending event handling
- Chat generation, streaming, token usage, wallet debit
- Creator AI draft และ optional image generation
- Supabase auth และ avatar storage
- User content settings และ persona
- Moderation reports และ admin audit logs
- Health/readiness/deploy checks

## พื้นที่ frontend

- app shell แบบ dark-first พร้อม navigation ภาษาไทย
- Redux state สำหรับ chat ที่สเกลไป group/universe chat ในอนาคต
- Chat room ที่มี relationship top bar, scene mode, pending events, message tools
- Creator Studio ที่มี AI draft, image flow, tag warnings, simulator, draft autosave
- Admin Health page ที่แสดง deployment gate status

## เครื่องมือ

- Bun
- Vite/React
- Elysia backend
- Prisma/Postgres
- Supabase Auth/Storage
- Playwright e2e smoke
- SocratiCode MCP เป็น local codebase intelligence
- Markdown memory vault ใน `memory/`
- Runtime knowledge layer ใน `knowledge/` สำหรับ chat, creator, relationship, scene, และ content-policy packs
- Deterministic roleplay evals ใน `evals/` พร้อม Promptfoo live-eval scaffolding แบบ optional
