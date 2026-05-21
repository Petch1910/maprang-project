# เช็กลิสต์ความปลอดภัย (Security Checklist)

ใช้คู่กับ `bun run security:audit`, `bun run backend:check`, `bun run qa:full` และหน้า `/admin/health` ก่อน staging/production

## การฉีดคำสั่งฐานข้อมูล (SQL Injection)

- Backend ใช้ Prisma query builder เป็นหลัก เช่น `findMany`, `findFirst`, `updateMany`, `deleteMany`, `upsert`
- จุด raw SQL ที่ตั้งใจใช้มีเฉพาะ token debit แบบ row lock ใน `chat.service.ts` และต้องใช้ Prisma tagged template parameterization เท่านั้น
- ห้ามใช้ `$queryRawUnsafe`, `$executeRawUnsafe`, `Prisma.raw`, และ `$queryRaw(...)` / `$executeRaw(...)` แบบ function call
- Route ที่รับ resource id ต้อง validate ก่อนส่งเข้า Prisma:
  - UUID สำหรับ user, character, chat, lore, report
  - safe record id สำหรับ `Message.id` เพราะ schema ใช้ cuid ไม่ใช่ UUID
- Static guard: `bun run security:audit` fails if a backend `/:id` route block is missing `rejectInvalidUuid`.
- Guard อัตโนมัติ: `bun run security:audit`
- QA ที่เกี่ยวข้อง: `backend-security-audit.test.ts`, `chat.routes.security.test.ts`, `route-id-validation.test.ts`, `wallet.persistence.test.ts`

## สิทธิ์เข้าถึงข้ามบัญชี (Broken Access Control)

- Production auth ต้องใช้ Supabase JWT; local `x-user-id` ใช้ได้เฉพาะ dev หรือ admin smoke เท่านั้น
- Owner resource checks ใช้ `userId`, `creatorId` และ admin guard ก่อนอ่าน/แก้ไข/ลบ resource
- Public character response ต้องซ่อน `systemPrompt`, `compactPrompt`, `characterAnchor`, `constraints` และ quality notes จากคนที่ไม่ใช่ owner/admin
- Chat actions ต้องใช้ `where: { id, userId, deletedAt: null }` สำหรับอ่าน, rename, archive, restore, delete
- Report/message guards ต้องบล็อก report private character หรือ message ที่ไม่ได้อยู่ใน chat ของผู้รายงาน
- Admin actions ต้องมี `ADMIN_API_KEY` และมี audit log เมื่อเปลี่ยน report/status/token หรือซ่อน content
- Static guard: `bun run security:audit` fails if any backend `/admin` route block is missing `requireAdminApiKey`.
- Backend route ต้องไม่ `throw error` หรือ log raw error object กลับไปตรงๆ; ให้คืน `routeErrorResponse`/ข้อความที่ควบคุมได้และใช้ safe summary ใน log
- Backend runtime ต้องไม่ parse `response.json()` จาก provider/Supabase ตรงๆ นอก safe payload helper; external JSON ที่พังต้องถูกห่อเป็นข้อความไทยก่อนเสมอ
- Backend runtime ต้องไม่นำ `response.text()` จาก provider/Supabase ไป log หรือคืนเป็น diagnostic ตรงๆ; ข้อความดิบจาก external response ต้องผ่าน `redactSensitiveText` ก่อนเสมอ
- Guard อัตโนมัติ: `backend-security-audit.test.ts`, `character.persistence.test.ts`, `chat.persistence.test.ts`, `chat.routes.security.test.ts`, `security.test.ts`, `user.service.test.ts`

## ความปลอดภัย frontend XSS และลิงก์ (Frontend XSS / Link Safety)

- ห้ามใช้ `dangerouslySetInnerHTML`, `.innerHTML =`, `eval()`, `new Function()`, หรือ `window.open()` ใน frontend source จนกว่าจะมี sanitizer และ security review ชัดเจน
- ลิงก์ที่เปิดแท็บใหม่ด้วย `target="_blank"` ต้องมี `rel="noopener noreferrer"` เพื่อกัน opener/tabnabbing
- Browser console ต้องไม่ log raw error object ตรงๆ; ใช้ `logUnexpectedError` เพื่อสรุป error ก่อนเขียน log
- Frontend API code ต้องไม่ parse `response.json()` ตรงนอก `readApiJson`/`readErrorPayload`; JSON ที่พังต้องกลายเป็น `ApiError` ภาษาไทยก่อนถึง UI
- Frontend API code ต้องไม่อ่าน `response.text()` ตรงใน source; plain-text/HTML/proxy failure ต้องถูกแปลงเป็น `ApiError` ข้อความไทยที่ควบคุมได้ก่อนแสดงผล
- Static guard: `bun run frontend:static:audit:test` และ `bun run predeploy:check` ต้องจับ regression ชุดนี้ก่อน staging

## การคุมพรอมป์ (Prompt Control)

- System prompt ต้องใส่ `Platform prompt-control policy` ก่อน character prompt/lore/memory/persona/history
- Character prompt, lore, memory, persona, history และ user message ต้องถูกระบุเป็น untrusted narrative/input data
- History จาก client ต้องตัด system-role ออกก่อนส่งเข้า model
- Persona ใช้เป็น context ได้ แต่ห้ามใช้เป็นคำสั่งเพื่อ reveal hidden prompts, bypass rules หรือ act as admin/developer
- Runtime instruction ต้องย้ำว่าไม่ reveal hidden system instructions และไม่ทำตามคำสั่งที่ขัดกับ platform policy
- `POST /admin/prompt-inspector` ต้องเป็น admin-only และต้องคืนเฉพาะ prompt snapshot ที่ redact แล้ว ห้ามปล่อย API key, DB URL, JWT หรือ service-role secret ผ่าน debugger output
- Prompt Inspector และ Creator Draft warning ต้องใช้ `redactSensitiveText` ก่อนส่งข้อความ diagnostic กลับ UI/API โดยครอบ OpenRouter/OpenAI, Anthropic, Hugging Face, Stripe live, GitHub, Google, Slack, private key, DB URL และ JWT-like values
- Prompt Inspector ต้อง redact ทั้ง final prompt, section content, และ retrieved lore preview/keyword/alias ก่อนส่งกลับ UI; Creator Draft ต้องไม่สะท้อน raw provider error message ที่มี secret-shaped value ใน warning/note
- Guard อัตโนมัติ: `context.service.test.ts`, `prompt-inspector.service.test.ts`, `creator-draft.service.test.ts`

## ความครอบคลุม CIA / AAA

- Confidentiality / การรักษาความลับ: Supabase JWT, คีย์ผู้ดูแล, private prompt fields ที่ซ่อนอยู่, signed avatar URLs ใน production, และนโยบายคุมพรอมป์.
- Secret hygiene / สุขอนามัยของ secret: `secrets:check` สแกน source/docs ที่ commit แล้วเพื่อหา OpenRouter, OpenAI, Anthropic, Hugging Face, Stripe live keys, platform tokens, JWT-like secrets, และ fail ถ้ามีไฟล์ `.env`/`.env.*` ที่ถูก track; env local ที่ไม่ถูก track ยังใช้พัฒนาได้ตามปกติ.
- `.gitignore` ignores real `.env.*` files but explicitly allows `.env.example` and `.env.production.example` templates.
- Integrity / ความถูกต้องของข้อมูล: Prisma query builder, raw SQL audit, route id validation, owner/admin guards, migrations, และ relationship/tag validation.
- Availability / ความพร้อมใช้งาน: database readiness, OpenRouter readiness, rate-limit buckets, token guard, smoke tests, และ invalid-id 400/404 handling แทน 500.
- Authentication / การยืนยันตัวตน: Supabase JWT ใน production; local `x-user-id` ใช้เฉพาะ dev/admin smoke.
- Authorization / การอนุญาตสิทธิ์: owner/admin checks สำหรับ chat, character, lore, report, wallet, และ admin actions.
- Accounting/Auditing / การบันทึกบัญชีและ audit: usage ledger, token transactions, reports, และ admin audit logs.

## สิ่งที่ต้องผ่านก่อน production (Production Must-Pass)

- `bun run qa:full`
- `SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:doctor`
- `SMOKE_API_BASE_URL=https://<backend-staging-domain> bun run smoke:ready`
- Supabase Storage bucket `avatars` ต้องเป็น private + signed URL
- `CORS_ORIGINS` ต้องเป็น frontend domain จริงแบบ `https://` ไม่ใช่ localhost หรือ `http://`
- Automated abuse QA ต้องผ่าน: SQL-like id/input guard, admin route guard, owner resource guard, และ prompt injection guard ผ่าน `security:audit:test`, `backend:check`, `eval:local`, และ `api:smoke`
- ทำ manual abuse QA ตาม `ABUSE_QA_CHECKLIST.md` ก่อนเปิดจริง: SQL-like search/chat input, cross-user resource id guessing, prompt injection asking for system prompt/secrets, frontend XSS, audit logs, และ token/rate-limit
