# แผนที่โปรเจกต์: Maprang AI

อัปเดตล่าสุด: 2026-05-25

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
- Chat generation, streaming, การใช้โทเคน, wallet debit
- Creator AI draft และ optional image generation
- Supabase auth และพื้นที่เก็บรูปตัวละครแบบ signed URL
- User content settings และ persona
- Moderation reports และ admin audit logs
- Health/readiness/deploy checks
- Security/static audits guard raw route error detail/message regressions, abuse QA handoff coverage, and route/menu disabled-state regressions before deploy.

## พื้นที่ frontend

- app shell แบบ dark-first พร้อม navigation ภาษาไทย
- Redux state สำหรับ chat ที่สเกลไป group/universe chat ในอนาคต
- Chat room ที่มี relationship top bar, scene mode, pending events, message tools
- Creator Studio ที่มี AI draft, image flow, tag warnings, simulator, draft autosave
- Route/Menu Audit ที่บังคับว่าทุกปุ่มมีผลจริง หรือมีเหตุผล disabled ภาษาไทย
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
