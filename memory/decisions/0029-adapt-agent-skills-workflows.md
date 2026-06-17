# 0029 - ดัดแปลง Agent Skills เป็น workflow ของ Maprang

วันที่: 2026-06-17

สถานะ: accepted

## บริบท

ผู้ใช้ถามว่า `addyosmani/agent-skills` จะช่วยงาน Maprang ได้มากน้อยแค่ไหน และให้เลือกสิ่งที่ควรเอามาใช้เอง

repo นี้มี `AGENTS.md`, `agent.md`, memory vault, QA gates, predeploy locks, MissAI migration plan, AI Creator plan, และ production blocker docs อยู่แล้ว การนำ external skill repository เข้ามาทั้งชุดจะเพิ่มความเสี่ยงเรื่อง instruction supply chain และอาจทำให้ source of truth แตกออกจากเอกสารของ Maprang

## การตัดสินใจ

ใช้ `addyosmani/agent-skills` เป็น reference ด้าน workflow เท่านั้น แล้วสร้างเอกสาร repo-owned ที่ `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`

workflow ที่รับมาใช้ใน Maprang ได้แก่:

- context-engineering และ using-agent-skills สำหรับงาน continue/handoff
- idea-refine และ spec-driven-development สำหรับ requirement ที่ยังไม่ชัด
- planning-and-task-breakdown สำหรับแยก phase/task
- incremental-implementation และ test-driven-development สำหรับงาน code หลายไฟล์
- frontend-ui-engineering และ browser-testing-with-devtools สำหรับ UI/MissAI/responsive work
- api-and-interface-design สำหรับ API/DB/frontend helper contract
- security-and-hardening และ doubt-driven-development สำหรับ auth, BYOK, prompt control, และ abuse cases
- debugging-and-error-recovery สำหรับ QA fail หรือ bug
- code-simplification และ code-review-and-quality สำหรับ cleanup/refactor
- ci-cd-and-automation, shipping-and-launch, observability-and-instrumentation สำหรับ staging/deploy
- deprecation-and-migration และ documentation-and-adrs สำหรับ migration/source-of-truth changes

## ผลกระทบ

- agent ใหม่ต้องใช้ `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md` เพื่อเลือก workflow และ QA gate ก่อนทำ next repo-owned task
- upstream external skill files ไม่ถือเป็น instruction ของ repo นี้ และห้าม copy/import แบบ blind vendor
- ถ้าจะนำ external skill เข้ามาจริงในอนาคต ต้องมี commit hash/review/decision/source lock ก่อน
- `predeploy:check` ต้องรู้จักเอกสาร workflow นี้เพื่อกันหายจาก handoff

## งานติดตาม

- อัปเดต workflow เมื่อ product scope หรือ QA gates เปลี่ยน
- ถ้าเริ่มใช้ skill ภายนอกแบบ vendored ให้เพิ่ม audit เฉพาะสำหรับ external instruction source
- ใช้ workflow นี้เป็นตัวช่วยจัดลำดับงาน UI/API/security/deploy ต่อจากนี้
