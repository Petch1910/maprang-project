# 0010 - เพิ่ม admin automated evals

วันที่: 2026-05-13

## สถานะ

Accepted

## บริบท

การเปลี่ยน prompt และ context อาจทำให้ roleplay depth, prompt-control ordering, lore placement, หรือ relationship/scene continuity พังแบบเงียบๆ โปรเจกต์มี `bun run eval:local` แล้ว แต่ถ้าต้องพึ่ง terminal อย่างเดียว admin QA จะตรวจ regression ยาก

## Decision

- แยก deterministic golden roleplay eval logic เป็น backend service ที่ CLI และ API ใช้ร่วมกัน.
- เปิด `GET /admin/evals/local` หลัง `ADMIN_API_KEY`.
- เพิ่ม `/admin/evals` เป็น guarded admin UI ที่แสดง suite status, scenario results, per-check pass/fail details, token budget, และ failure summaries.
- รวม route นี้ใน route/menu audit, API smoke, และ browser e2e smoke.

## ผลลัพธ์

- Admins ตรวจ prompt/context regression จากเว็บได้โดยไม่ใช้ live model tokens.
- CLI, API, และ UI ใช้ eval logic ชุดเดียวกัน ลด drift.
- อนาคตเพิ่ม saved eval history, prompt/provider comparisons, และ live Promptfoo runs ได้หลัง staging เสถียร.
