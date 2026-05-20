# 0009 - เพิ่ม admin prompt inspector

วันที่: 2026-05-13

## สถานะ

Accepted

## บริบท

คุณภาพ roleplay ของ Maprang ขึ้นกับ prompt assembly, lore retrieval, persona injection, runtime memory, และ relationship state เมื่อ bot reply สั้นเกินไปหรือหลุด character การเดาว่าเป็นปัญหาจาก model provider อย่างเดียวทั้งช้าและเปลือง

## Decision

เพิ่ม prompt inspector endpoint และ UI สำหรับ admin เท่านั้น:

- `POST /admin/prompt-inspector` สร้าง redacted prompt snapshot โดยไม่เรียก live model.
- `/admin/prompt-inspector` ให้ admins เลือก character, compare messages, เพิ่ม runtime/persona context, และดู redacted prompt จาก browser.
- Response มี section-level character counts, estimated tokens, retrieved lore previews, warnings, และ optional previous/current prompt diff.
- Inspector output ต้อง redact secret-shaped values ก่อนคืน text เสมอ.
- Local API smoke และ backend tests ครอบ endpoint/service behavior.

## ผลลัพธ์

- Developers debug prompt shape, missing lore, runtime memory, และ prompt bloat ได้ก่อนใช้ provider tokens.
- Endpoint ต้องเป็น admin-only เพราะเปิดโครงสร้าง private character prompt.
- งาน prompt ในอนาคตต่อยอดเป็น saved snapshots, side-by-side prompt diff visualization, และ links จาก Chat/Creator Studio เข้า inspector ได้.
