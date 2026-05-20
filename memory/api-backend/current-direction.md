# ทิศทาง API และ backend

อัปเดตล่าสุด: 2026-05-20

## แนวทางหลัก

Backend ควรให้ความสำคัญกับ explicit guards, typed validation, auditability, และ deterministic local smoke มากกว่าการเดาว่าทุกอย่างพร้อม

## จุดแข็งปัจจุบัน

- Route ID validation กัน ID ที่หน้าตาเหมือน injection ก่อนเข้า persistence.
- Prompt-control context ครอบ untrusted character text.
- Admin actions มี audit log coverage.
- Token wallet debit ค่า chat usage โดยไม่ให้ overdraft.
- Local smoke ข้ามการใช้เงิน live provider แต่ยังตรวจ endpoint shape.
- Live provider paths ถูกแยกเป็น gates ของตัวเอง.
- Structured knowledge packs ป้อน chat/creator prompt guidance และแสดงผ่าน health/readiness.
- Deterministic prompt/context evals คุม roleplay depth, prompt-control ordering, lore injection, และ relationship/scene continuity.
- Admin Prompt Inspector แสดง redacted prompt snapshots, section token estimates, retrieved lore, และ previous/current prompt diffs โดยไม่ใช้ live model tokens.
- Admin Automated Evals เปิด deterministic golden roleplay suite ผ่าน API/UI ที่มี guard ทำให้ prompt regressions เห็นได้โดยไม่ต้องใช้ terminal.
- Chat World State Controller เก็บ owner-scoped scene constants ใน chat memory, inject เข้า runtime prompts, และแสดงผ่าน chat UI รวมถึง Prompt Inspector runtime memory.
- Usage and cost intelligence คำนวณจาก usage ledger เดิม เพื่อแสดง total cost, model breakdown, daily trend, และ remaining-request estimates ผ่าน `/me/usage`.
- Prompt budgeting ตัด chat history เก่าสุดก่อนเรียก provider, บันทึก budget metadata, และแสดง budget configuration ผ่าน health/readiness surfaces.
- Chat provider failures ถูกจัดประเภทเป็น safe retry/admin states, คืน zero token usage, และแสดงเป็น `providerFailure` metadata ใน normal/streamed chat responses.
- Runtime env validation, deploy env doctor, smoke doctor, deploy readiness, และ deploy status แสดง roleplay reply budget risk ร่วมกัน ค่าใต้ 1200 output tokens หรือ 320 roleplay reply characters จะ block production; ค่า baseline ที่ยังต่ำกว่า 1600/420 จะแสดง CLI/UI recommendations เพื่อคำตอบ roleplay ที่แน่นขึ้น.
- Deploy readiness ใช้ logic ร่วมกันระหว่าง smoke doctor และ deploy status ทำให้ staging/production blockers กับ next steps ตรงกันทั้ง CLI, CI, และ Admin Health handoff.
- Local API smoke ครอบ non-mutating validation paths สำหรับ admin reports, admin wallet, report creation, chat deletion, chat streaming shape, prompt inspector, และ automated evals โดยไม่ใช้ live provider credits.

## API สำคัญก่อน production

- `/health`
- `/ready`
- `/chat`
- `/chat/stream`
- `/creator/ai-draft`
- `/me/usage`
- `/me/persona`
- `/characters`
- `/chats/:id/world-state`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/prompt-inspector`
- `/admin/evals/local`
- deploy/smoke scripts ที่อ่าน `/health` และ `/ready`

## Provider policy

- Chat provider readiness ต้องมีคำตอบจริง, `chatId`, token usage, และ wallet transaction.
- Image provider readiness ต้องได้ generated image แบบ `configured` ไม่ใช่ placeholder fallback.
- Production `/ready` ต้อง fail จนกว่า target environment จะตั้งทั้ง chat และ image live verification flags.
- ห้ามตั้ง live verification flags จาก local deterministic smoke.
- รักษา `knowledge/structured/*.json` ให้ deterministic, schema-versioned, และตรวจด้วย `bun run knowledge:audit`.
- รักษา `evals/golden-roleplay.json` ให้ deterministic และตรวจด้วย `bun run eval:local` ก่อนเปลี่ยน context assembly.
- ห้ามเปิด raw provider errors หรือ secrets ให้ผู้ใช้เห็น ให้ classify provider failures และไม่คิด token/cost สำหรับ provider attempts ที่ fail.
- คุม `/chat/stream` ใน local smoke ผ่าน uncharged validation paths แล้วค่อย verify live streaming แบบ manual หรือกับ staging ก่อน production.
