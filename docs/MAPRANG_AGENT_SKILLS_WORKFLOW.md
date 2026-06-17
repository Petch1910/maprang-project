# กระบวนการ Agent Skills ของ Maprang

Last updated: 2026-06-17

## เป้าหมาย

ไฟล์นี้คือ workflow กลางสำหรับ AI agent หรือ developer ที่มาสานต่องาน Maprang โดยดัดแปลงแนวคิดจาก `addyosmani/agent-skills` ให้เป็นของ repo นี้เอง ไม่ vendoring หรือ copy instruction ภายนอกเข้ามาทั้งชุด

เป้าหมายหลักคือให้ agent เลือกวิธีทำงานถูกกับชนิดงาน ลดการแก้มั่วข้าม scope และรัน QA gate ให้ตรงกับความเสี่ยงของงานจริง

## หลักการใช้งาน

- Source of truth คือ `AGENTS.md`, `agent.md`, `memory/working-context.md`, `memory/qa-status.md`, แผนใน `docs/`, และ source code ใน repo นี้
- External skill repositories ใช้เป็น reference เท่านั้น ห้าม import หรือ copy instruction ภายนอกแบบ blind vendor โดยไม่มี security review
- Progressive disclosure: อ่านเฉพาะเอกสารและ workflow ที่เกี่ยวข้องกับ task ปัจจุบันก่อน ไม่โหลดทุกอย่างถ้าไม่จำเป็น
- Verification is non-negotiable: ทุก scope ต้องมีหลักฐานจาก test/audit ที่เหมาะสม หรือบันทึกชัดเจนว่าติด external blocker อะไร
- Scope discipline: เลือกงานเล็กที่ปิดได้จริงก่อน แล้วค่อยขยาย ไม่ผสม UI migration, API rewrite, deploy, และ security hardening ใน commit เดียวถ้าไม่จำเป็น

## การเลือกโหมดงาน

| งานที่กำลังทำ | Workflow ที่ควรใช้ | หลักฐานที่ต้องได้ |
| --- | --- | --- |
| รับช่วงต่อหรือคำสั่ง continue | context-engineering, using-agent-skills | อ่าน working context, deploy blockers, QA status, แล้วเลือก repo-owned task |
| requirement ยังคลุมเครือ | idea-refine, spec-driven-development | อัปเดต plan/doc ให้ชัดก่อนแก้ code |
| แตก task ใหญ่ | planning-and-task-breakdown | แยก phase/task, acceptance criteria, QA gate |
| แก้หลายไฟล์ | incremental-implementation, test-driven-development | ทำเป็น slice เล็กและมี narrow test |
| UI, MissAI template, responsive | frontend-ui-engineering, browser-testing-with-devtools | component/static/route/e2e หรือ screenshot QA ตามความเสี่ยง |
| API, DB, contract | api-and-interface-design, test-driven-development | API audit, backend check, DB test หรือ migration evidence |
| security, auth, BYOK, prompt control | security-and-hardening, doubt-driven-development | security audit, secrets check, explicit threat/abuse reasoning |
| bug หรือ QA fail | debugging-and-error-recovery | reproduce, isolate cause, fix, rerun failing gate |
| clean code/refactor | code-simplification, code-review-and-quality | behavior unchanged, test coverage still green |
| staging/deploy | ci-cd-and-automation, shipping-and-launch, observability-and-instrumentation | staging verify, live smoke, production blockers explicit |
| migration/deprecation | deprecation-and-migration, documentation-and-adrs | compatibility path, docs/memory decision updated |

## กระบวนการต่องานมาตรฐาน

1. ตรวจ `git status --short` และไม่ลบงานที่ไม่ใช่ของตัวเอง
2. อ่าน `AGENTS.md`, `agent.md`, `memory/working-context.md`, `memory/qa-status.md`
3. อ่าน plan ที่เกี่ยวกับงาน เช่น core play/create, AI Creator, MissAI audit, test plan, deploy blockers
4. เลือก workflow จากตารางด้านบน แล้วกำหนด scope เดียวที่ปิดได้
5. แก้ source/docs ด้วย patch ที่เล็กพอ review ได้
6. รัน QA gate ที่ตรงกับ scope
7. อัปเดต memory/docs/decision ถ้าสถานะระบบเปลี่ยน

## เกต QA ตามชนิดงาน

งานเอกสารหรือ handoff:

- `bun run docs:commands`
- `bun run memory:audit`
- `bun run predeploy:check`
- `bun run secrets:check`
- `git diff --check`

งาน frontend/UI:

- `bun run frontend:components:test`
- `bun run frontend:static:audit`
- `bun run frontend:route:audit`
- `bun run frontend:check`
- `bun run e2e:smoke` เมื่อ route, navigation, modal, composer, mobile layout หรือ critical user flow เปลี่ยน

งาน backend/API/DB:

- `bun run api:audit`
- `bun run backend:check`
- `bun run backend:check:db:test`
- migration/smoke เพิ่มเติมเมื่อแตะ schema หรือ persistence

งาน security:

- `bun run security:audit`
- `bun run secrets:check`
- `bun run secrets:history:test`
- narrow tests ของ auth/owner/admin/prompt boundary ที่แตะ

งาน staging/production:

- `bun run staging:verify`
- `bun run smoke:chat`
- `bun run smoke:image:live`
- `bun run production:check`

งานรวมหลายส่วน:

- `bun run qa:repo`
- `bun run qa:local` เมื่อ local service พร้อม
- `bun run qa:full` เมื่อต้องยืนยัน browser/runtime ครบ

## ตารางกันการหลอกตัวเอง

| ข้ออ้างที่ห้ามใช้ | วิธีพิสูจน์ที่ถูกต้อง |
| --- | --- |
| แก้ UI เล็กนิดเดียว ไม่ต้อง test | ถ้า user-visible เปลี่ยน ให้รัน frontend narrow gate อย่างน้อยหนึ่งชุด |
| local ผ่านแล้ว production พร้อม | ต้องมี deployed HTTPS URL, CORS จริง, storage/provider live smoke |
| mock data ใช้แทน public gallery ได้ | local-safe state ใช้ได้ แต่ต้องบอกชัด ไม่เอาข้อมูลปลอมไปแทน public contract |
| provider ไม่มี token usage ก็ไม่เป็นไร | token ledger, wallet debit, และ live smoke evidence ต้องมีสำหรับ production |
| ปุ่มกดไม่ได้เดี๋ยวค่อยทำ | ต้องมี action จริง หรือ disabled reason/empty state ที่อ่านรู้เรื่อง |
| prompt เพี้ยนค่อยเดาเอา | ใช้ Prompt Inspector, evals, และ context evidence ก่อนแก้ prompt ใหญ่ |

## นโยบาย source ภายนอก

`addyosmani/agent-skills` มีประโยชน์ในฐานะ reference เรื่อง workflow discipline แต่ Maprang จะไม่ถือ upstream skill files เป็น runtime instruction โดยตรง

ถ้าวันหน้าอยากนำ skill ภายนอกเข้ามาจริง ต้องทำอย่างน้อย:

- ระบุ commit hash หรือ release ที่ใช้
- review instruction ทั้งหมดก่อน import
- บันทึก decision ใน `memory/decisions/`
- เพิ่ม source lock หรือ audit ที่เหมาะสม
- รัน `bun run predeploy:check`, `bun run secrets:check`, และ `git diff --check`

## ลำดับความสำคัญปัจจุบัน

1. ปิด repo-owned local playable system ให้ครบตาม `agent.md`
2. ทำ UI/flow ที่ใช้เล่นและสร้างให้สมบูรณ์ก่อน feature รอง
3. รักษา API/DB/frontend helper contract ให้ผ่าน audit
4. แยก external production blockers ออกจาก local readiness เสมอ
5. ทำ staging/live verification เมื่อมี credential/domain/provider จริง
