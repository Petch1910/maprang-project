# 0020 - ให้ predeploy ค้น decision markdown สำหรับ heading audit เอง

วันที่: 2026-05-26

## การตัดสินใจ (Decision)

`predeploy:check` ต้องค้นไฟล์ `memory/decisions/*.md` สำหรับ Markdown Thai-first heading audit แบบอัตโนมัติ แทนการ hardcode รายชื่อ decision file ทีละไฟล์

## บริบท

หลังเพิ่ม decision log ต่อเนื่อง รายการ hardcode ใน `scripts/predeploy-check.ts` กลายเป็นงานซ้ำ: ทุกครั้งที่เพิ่ม decision ใหม่ต้องเพิ่มทั้ง index, memory, และ predeploy heading list ด้วยมือ ทั้งที่ `docs:commands` และ `memory:audit` เริ่มใช้การค้นไฟล์อัตโนมัติแล้ว

## ทิศทาง implementation

- แยก `markdownHeadingBaseFiles` สำหรับไฟล์เอกสารหลักที่ไม่ใช่ decision log.
- เพิ่ม `collectDecisionMarkdownFiles` เพื่ออ่าน `memory/decisions` และเลือกเฉพาะไฟล์ `.md`.
- เพิ่ม `collectMarkdownHeadingFiles` เพื่อรวมไฟล์หลักกับ decision files ที่ค้นพบ.
- regression test ของ predeploy ต้องล็อก helper ชุดนี้แทนการคาดหวังรายชื่อ decision file ทุกไฟล์.

## ผลลัพธ์

- เพิ่ม decision ใหม่แล้วไม่ต้องแก้รายการ Markdown heading audit ด้วยมือ.
- predeploy ยังจับหัวข้อ Markdown ที่ไม่ Thai-first ใน decision ใหม่ได้ทันที.
- ลดโอกาสที่ future agent จะเพิ่ม decision แล้วลืมปรับ guard.
