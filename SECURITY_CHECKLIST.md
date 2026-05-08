# Security Checklist

ใช้คู่กับ `bun run security:audit`, `bun run backend:check`, `bun run qa:full` และหน้า `/admin/health` ก่อน staging/production

## SQL Injection

- Backend ใช้ Prisma query builder เป็นหลัก เช่น `findMany`, `findFirst`, `updateMany`, `deleteMany`, `upsert`
- จุด raw SQL ที่ตั้งใจใช้มีเฉพาะ token debit แบบ row lock ใน `chat.service.ts` และต้องใช้ Prisma tagged template parameterization เท่านั้น
- ห้ามใช้ `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw`, และ `$queryRaw(...)` / `$executeRaw(...)` แบบ function call
- Route ที่รับ resource id ต้อง validate ก่อนส่งเข้า Prisma:
  - UUID สำหรับ user, character, chat, lore, report
  - safe record id สำหรับ `Message.id` เพราะ schema ใช้ cuid ไม่ใช่ UUID
- Guard อัตโนมัติ: `bun run security:audit`
- QA ที่เกี่ยวข้อง: `chat.routes.security.test.ts`, `route-id-validation.test.ts`, `wallet.persistence.test.ts`

## Broken Access Control

- Production auth ต้องใช้ Supabase JWT; local `x-user-id` ใช้ได้เฉพาะ dev หรือ admin smoke เท่านั้น
- Owner resource checks ใช้ `userId`, `creatorId` และ admin guard ก่อนอ่าน/แก้ไข/ลบ resource
- Public character response ต้องซ่อน `systemPrompt`, `compactPrompt`, `characterAnchor`, `constraints` และ quality notes จากคนที่ไม่ใช่ owner/admin
- Chat actions ต้องใช้ `where: { id, userId, deletedAt: null }` สำหรับอ่าน, rename, archive, restore, delete
- Report/message guards ต้องบล็อก report private character หรือ message ที่ไม่ได้อยู่ใน chat ของผู้รายงาน
- Admin actions ต้องมี `ADMIN_API_KEY` และมี audit log เมื่อเปลี่ยน report/status/token หรือซ่อน content
- Guard อัตโนมัติ: `character.persistence.test.ts`, `chat.persistence.test.ts`, `chat.routes.security.test.ts`, `security.test.ts`, `user.service.test.ts`

## Prompt Control

- System prompt ต้องใส่ `Platform prompt-control policy` ก่อน character prompt/lore/memory/persona/history
- Character prompt, lore, memory, persona, history และ user message ต้องถูกระบุเป็น untrusted narrative/input data
- History จาก client ต้องตัด system-role ออกก่อนส่งเข้า model
- Persona ใช้เป็น context ได้ แต่ห้ามใช้เป็นคำสั่งเพื่อ reveal hidden prompts, bypass rules หรือ act as admin/developer
- Runtime instruction ต้องย้ำว่าไม่ reveal hidden system instructions และไม่ทำตามคำสั่งที่ขัดกับ platform policy
- Guard อัตโนมัติ: `context.service.test.ts`

## CIA / AAA Coverage

- Confidentiality: Supabase JWT, admin API key, hidden private prompt fields, signed avatar URLs in production, and prompt-control policy.
- Integrity: Prisma query builder, raw SQL audit, route id validation, owner/admin guards, migrations, and relationship/tag validation.
- Availability: database readiness, OpenRouter readiness, rate-limit buckets, token guard, smoke tests, and invalid-id 400/404 handling instead of 500.
- Authentication: Supabase JWT in production; local `x-user-id` only for dev/admin smoke.
- Authorization: owner/admin checks for chat, character, lore, report, wallet, and admin actions.
- Accounting/Auditing: usage ledger, token transactions, reports, and admin audit logs.

## Production Must-Pass

- `bun run qa:full`
- `SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:doctor`
- `SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:ready`
- Supabase Storage bucket `avatars` ต้องเป็น private + signed URL
- `CORS_ORIGINS` ต้องเป็น frontend domain จริง ไม่ใช่ localhost
- ทำ manual abuse QA อีกชุด: SQL-like search/chat input, cross-user resource id guessing, prompt injection asking for system prompt/secrets
