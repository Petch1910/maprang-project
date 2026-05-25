# ทิศทาง API และระบบหลังบ้าน

อัปเดตล่าสุด: 2026-05-25

## แนวทางหลัก

ระบบหลังบ้านควรให้ความสำคัญกับ guard ที่ชัดเจน, validation แบบมีชนิดข้อมูล, การตรวจสอบย้อนหลังได้, และ local smoke ที่ผลซ้ำได้ มากกว่าการเดาว่าทุกอย่างพร้อม

## จุดแข็งปัจจุบัน

- Route ID validation กัน ID ที่หน้าตาเหมือน injection ก่อนเข้า persistence.
- Context สำหรับคุมพรอมป์ครอบข้อความตัวละครที่ไม่น่าเชื่อถือ.
- Admin actions มี audit log coverage.
- Token wallet debit ค่า chat usage โดยไม่ให้ overdraft.
- Smoke ในเครื่องข้ามการใช้เครดิตผู้ให้บริการจริง แต่ยังตรวจรูปร่าง endpoint.
- เส้นทางผู้ให้บริการจริงถูกแยกเป็น gate ของตัวเอง.
- ชุดความรู้แบบ structured ป้อนแนวทางพรอมป์สำหรับแชท/ครีเอเตอร์ และแสดงผ่าน health/readiness.
- ชุด eval พรอมป์/บริบทแบบผลซ้ำได้คุมความลึกของ roleplay, ลำดับกฎคุมพรอมป์, การป้องกัน lore injection, และความต่อเนื่องของ relationship/scene.
- Admin Prompt Inspector แสดงภาพรวมพรอมป์ที่ปิดข้อมูลลับแล้ว, ประมาณโทเคนราย section, คลังความรู้ที่ดึงมา, และส่วนต่างของพรอมป์ก่อนหน้า/ปัจจุบัน โดยไม่ใช้ live model tokens.
- Admin Automated Evals เปิดชุดทดสอบ roleplay มาตรฐานแบบผลซ้ำได้ผ่าน API/UI ที่มี guard ทำให้ prompt regressions เห็นได้โดยไม่ต้องใช้ terminal.
- Chat World State Controller เก็บค่าคงที่ของฉากแบบ owner-scoped ในความจำแชท, inject เข้า runtime prompts, และแสดงผ่าน chat UI รวมถึง Prompt Inspector runtime memory.
- Usage and cost intelligence คำนวณจาก usage ledger เดิม เพื่อแสดงต้นทุนรวม, การใช้แยกตามโมเดล, แนวโน้มรายวัน, และจำนวนคำขอโดยประมาณที่ยังพอใช้ได้ผ่าน `/me/usage`.
- Prompt budgeting ตัด chat history เก่าสุดก่อนเรียก provider, บันทึก budget metadata, และแสดง budget configuration ผ่าน health/readiness surfaces.
- Chat provider failures ถูกจัดประเภทเป็นสถานะ retry/admin ที่ปลอดภัย, คืนการใช้โทเคนเป็นศูนย์, และแสดงเป็น `providerFailure` metadata ใน normal/streamed chat responses.
- Runtime env validation, deploy env doctor, smoke doctor, deploy readiness, และ deploy status แสดงความเสี่ยงของ roleplay reply budget ร่วมกัน ค่าใต้ 1200 output tokens หรือ 320 roleplay reply characters จะ block production; ค่า baseline ที่ยังต่ำกว่า 1600/420 จะแสดงคำแนะนำใน CLI/UI เพื่อคำตอบ roleplay ที่แน่นขึ้น.
- Deploy readiness ใช้ logic ร่วมกันระหว่าง smoke doctor และ deploy status ทำให้ staging/production blockers กับ next steps ตรงกันทั้ง CLI, CI, และ Admin Health handoff.
- Local API smoke ครอบเส้นทาง validation ที่ไม่แก้ข้อมูลจริงสำหรับ admin reports, admin wallet, report creation, chat deletion, รูปแบบสตรีมแชท, prompt inspector, และ automated evals โดยไม่ใช้เครดิตผู้ให้บริการจริง.
- Predeploy guard บังคับ `ABUSE_QA_CHECKLIST.md` ให้ครอบ SQL-like input, broken access, auth spoofing, prompt control, lore/persona injection, frontend XSS, new-tab links, admin audit, token/rate limit, และ storage/avatar ก่อนส่งต่อ production.

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

## นโยบายผู้ให้บริการ

- ความพร้อมของผู้ให้บริการแชทต้องมีคำตอบจริง, `chatId`, การใช้โทเคน, และรายการ wallet.
- ความพร้อมของผู้ให้บริการสร้างรูปต้องได้รูปที่สร้างจริงแบบ `configured` ไม่ใช่ภาพตัวอย่างสำรอง.
- Production `/ready` ต้องยังไม่ผ่านจนกว่า environment เป้าหมายจะตั้งทั้ง chat และ image live verification flags.
- ห้ามตั้ง live verification flags จาก local deterministic smoke.
- รักษา `knowledge/structured/*.json` ให้ deterministic, schema-versioned, และตรวจด้วย `bun run knowledge:audit`.
- รักษา `evals/golden-roleplay.json` ให้ deterministic และตรวจด้วย `bun run eval:local` ก่อนเปลี่ยน context assembly.
- ห้ามเปิด raw provider errors หรือ secrets ให้ผู้ใช้เห็น ให้ classify provider failures และไม่คิด token/cost สำหรับ provider attempts ที่ fail.
- คุม `/chat/stream` ใน local smoke และ backend runtime test ผ่านเส้นทาง validation ที่ไม่ถูกคิดโทเคน แล้วค่อย verify live streaming กับ staging ก่อน production.
