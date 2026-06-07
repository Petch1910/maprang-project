# 0022 - ตรวจ allowlist ของ frontend static audit

วันที่: 2026-05-26

## การตัดสินใจ (Decision)

Frontend static audit ต้องตรวจ allowlist ของ component และ page ที่ยังไม่ถูก mount ด้วยตัวเอง โดย allowlist entry ต้องชี้ไฟล์ source ที่มีอยู่จริง ตรงชนิดที่ audit กำลังตรวจ และต้องมีเหตุผลชัดเจน

## บริบท

Static audit มีหน้าที่กัน UI ที่กดไม่ได้จริง, component เก่า, หรือ page เก่าค้างใน repo หลัง cleanup แต่ allowlist เองอาจกลายเป็นรูรั่วได้ ถ้าไฟล์ใน allowlist ถูกลบหรือเหตุผลว่าง แล้ว audit ยังคงปล่อยผ่านโดยไม่มีสัญญาณเตือน

## ทิศทาง implementation

- ให้ `auditReferencedFrontendModules` ตรวจรายการ allowlist ก่อนตรวจว่า target ถูกใช้งานหรือไม่.
- รายการ allowlist ที่ไม่ตรง target pattern หรือไม่มีไฟล์จริงต้อง fail.
- รายการ allowlist ที่ไม่มีเหตุผลอ่านรู้เรื่องต้อง fail.
- regression test ต้องครอบทั้ง stale allowlist และ unexplained allowlist.
- predeploy ต้องล็อกชื่อ test และข้อความ diagnostic สำคัญไว้.

## ผลลัพธ์

- ข้อยกเว้น frontend static audit ต้องมีเจ้าของเหตุผลเสมอ.
- ไฟล์ UI ที่ถูกลบแล้วจะไม่เหลือ allowlist หลอกให้ audit ดูเหมือนผ่าน.
- ลดโอกาสที่ dead UI surface หรือ component เก่าจะค้างก่อน deploy.
