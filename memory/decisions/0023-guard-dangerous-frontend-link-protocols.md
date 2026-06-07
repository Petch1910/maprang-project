# 0023 - ปิด protocol link อันตรายใน frontend static audit

วันที่: 2026-05-26

## การตัดสินใจ (Decision)

Frontend static audit ต้องปฏิเสธลิงก์ที่ใช้ protocol เสี่ยงใน `href` หรือ `to` ของ frontend source ได้แก่ `javascript:`, `vbscript:`, และ `data:text/html` ทั้งรูปแบบ string ปกติและ JSX expression/template form.

## บริบท

Maprang มีเมนูและลิงก์หลายจุดที่ผู้ใช้คาดหวังว่ากดแล้วต้องได้ผลจริง การปล่อย protocol ที่รันโค้ดหรือฝัง HTML ตรงในลิงก์ทำให้เกิด XSS หรือ behavior ที่ bypass route/menu audit ได้ แม้โค้ดจะดูเหมือนเป็นแค่ anchor หรือ React Router link ธรรมดา.

## ทิศทาง implementation

- เพิ่ม pattern ใน frontend static audit เพื่อจับ `href` และ `to` ที่เริ่มด้วย protocol เสี่ยง.
- regression test ต้องครอบทั้ง `<a href="javascript:...">` และ `<Link to={'data:text/html,...'}>`.
- predeploy ต้องล็อก checker/test snippets เพื่อกันการลบ guard โดยไม่ตั้งใจ.
- memory และ agent handoff ต้องพูดถึง dangerous link protocol guard คู่กับ placeholder-link guard และ no-op handler guard.

## ผลลัพธ์

- UI surface ที่เป็นลิงก์ไม่สามารถซ่อน code-executing protocol ไว้ใน source ได้ง่าย.
- Static QA ครอบคลุมทั้งปุ่มตัน ลิงก์ placeholder และลิงก์ protocol อันตรายในชุดเดียวกัน.
- ก่อน staging รอบถัดไป คนสานต่อจะเห็นชัดว่า guard นี้เป็น baseline ไม่ใช่งานทดลองชั่วคราว.
