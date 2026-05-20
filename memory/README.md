# ความจำโปรเจกต์ Maprang

โฟลเดอร์นี้คือ memory vault ขนาดเบาของโปรเจกต์ สำหรับงานพัฒนาแบบต่อเนื่องร่วมกับ AI.
แนวคิดมาจาก atomic Markdown memory แบบ Obsidian แต่ตั้งใจให้เล็กและดูแลง่าย

## เป้าหมาย

- เก็บบริบทโปรเจกต์ข้าม Codex sessions.
- บันทึก decision สำคัญ, blocker ปัจจุบัน, สถานะ QA, และ production readiness notes.
- เก็บ working memory ไว้ใกล้ codebase โดยไม่ทำให้กลายเป็น runtime app code.
- ชี้ไปที่ runtime knowledge layer ใน `knowledge/` เมื่อโน้ตควรถูกยกระดับเป็น product rules ที่ใช้ซ้ำได้.
- ให้ SocratiCode และเครื่องมือ codebase ในอนาคตมี project context ที่ index ได้ดี.

## กฎความปลอดภัย

- ห้ามเก็บ secrets, tokens, passwords, private keys, service role keys, database passwords, หรือ real user credentials.
- อ้างถึง environment variables ด้วยชื่อเท่านั้น เช่น `OPENROUTER_API_KEY` หรือ `DATABASE_URL`.
- ห้ามวาง production URLs จริงถ้าเป็น private หรือไม่ควรถูกแชร์.
- เขียนโน้ตให้สั้น มีวันที่ และเฉพาะเจาะจง.
- ใช้ข้อเท็จจริงก่อนการคาดเดา และติดป้ายรายการที่ยังไม่แน่ใจว่า `needs verification`.

## ขั้นตอนอัปเดต

อัปเดต memory หลังมีการเปลี่ยนแปลงสำคัญในเรื่องเหล่านี้:

- production readiness
- API contracts
- database schema หรือ migrations
- UI/UX direction
- security posture
- QA results
- provider status
- deployment decisions

ใช้รูปแบบนี้สำหรับโน้ตใหม่:

```md
## วันที่ YYYY-MM-DD - ชื่อสั้น (Short Title)

Status: decided | done | blocked | needs verification

What changed:
- ...

Why it matters:
- ...

Next:
- ...
```

## จุดเริ่มอ่าน

- [บริบทงานปัจจุบัน](./working-context.md)
- [แผนที่โปรเจกต์](./project-maprang.md)
- [ตัวกั้นก่อน deploy](./deploy-blockers.md)
- [สถานะ QA](./qa-status.md)
- [บันทึก decision](./decisions/index.md)
- [ทิศทาง UI/UX](./ui-ux/current-direction.md)
- [ทิศทาง API/Backend](./api-backend/current-direction.md)
- [เช็กลิสต์ production](./production/checklist.md)
- [กล่องบันทึกชั่วคราว](./inbox.md)
