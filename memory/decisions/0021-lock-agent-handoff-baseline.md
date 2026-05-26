# 0021 - ล็อก baseline handoff ของ agent guide

วันที่: 2026-05-26

## การตัดสินใจ (Decision)

`predeploy:check` ต้องล็อกข้อความ baseline ปัจจุบันใน `agent.md` ที่บอก QA ล่าสุด, decision/predeploy lock ล่าสุด, dynamic decision markdown audit, และ Markdown Thai-first heading audit

## บริบท

หลัง decision command audit และ Markdown heading audit ถูกปรับให้ค้นไฟล์ decision อัตโนมัติแล้ว `memory/working-context.md` และ `memory/qa-status.md` ชี้ baseline ล่าสุดถูกต้อง แต่ `agent.md` เคยยังมีสรุป 2026-05-25 ปนอยู่ในหัวข้อ Current Status ซึ่งเสี่ยงให้ agent รอบถัดไปเริ่มจากภาพเก่า

## ทิศทาง implementation

- ให้ `agent.md` ระบุ baseline ล่าสุดของ `qa:repo` และจำนวน coverage สำคัญไว้ใน Current Status.
- ให้ `agent.md` ระบุ decision/predeploy handoff lock ล่าสุดถึง decision นี้.
- ให้ `predeploy:check` ตรวจ snippet สำคัญใน `agent.md` เพื่อกันการถอยกลับไปใช้ summary เก่า.
- ให้ regression test ของ predeploy ล็อก snippet ชุดนี้ไว้ด้วย.

## ผลลัพธ์

- Future agent เห็น baseline ล่าสุดจาก entry guide ก่อนเปิด memory ยาว.
- Handoff summary ถอยกลับเป็นวันที่หรือ decision lock เก่าไม่ได้โดยไม่ทำให้ predeploy ล้ม.
- Decision log บันทึกว่า agent handoff baseline เป็น quality contract ไม่ใช่ข้อความประกอบที่แก้ทิ้งได้โดยไม่ตั้งใจ.
