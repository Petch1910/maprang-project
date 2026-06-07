# 0015 - ให้ Route/Menu disabled reasons เป็น UI contract

วันที่: 2026-05-25

## การตัดสินใจ (Decision)

ทุกปุ่มหรือเมนูที่ถูกปิดในหน้าหลักของ Maprang ต้องมีเหตุผลที่ผู้ใช้อ่านรู้เรื่อง และ Route/Menu Audit ต้องบันทึกเหตุผลนั้นเป็น contract ของพฤติกรรม UI.

## บริบท

ผู้ใช้ย้ำหลายครั้งว่าเว็บดูเหมือนมีเมนูให้กดแต่บางจุดทำต่อไม่ได้ หรือดูไม่สมบูรณ์. หลังเพิ่ม static audit สำหรับ disabled controls แล้ว เรายังต้องกันอีกชั้นในระดับ route handoff เพื่อให้ dev เห็นว่าแต่ละหน้า "ปิดปุ่มเพราะอะไร" ไม่ใช่แค่รู้ว่ามี `title` อยู่ใน source.

## ทิศทาง implementation

- `apps/frontend/src/lib/routeMenuAudit.ts` ต้องอธิบาย disabled/guard behavior ด้วยข้อความเฉพาะของหน้านั้น.
- `ROUTE_MENU_AUDIT.md` ต้องสะท้อนข้อความเดียวกันสำหรับคนตรวจหน้า `/admin/health`.
- `scripts/route-menu-doc-check.ts` ต้องล็อก snippet สำคัญของ flow ที่เคยมีปัญหา เช่น loading refresh, skeleton rails, selection toolbar, My Chats bulk actions, และ Profile autosave.
- `frontend:check`, `route-menu:audit`, และ `route-menu:audit:test` เป็น gate หลักเมื่อต้องแตะพฤติกรรมนี้.

## ผลลัพธ์

- เมนูที่เห็นในเว็บไม่ควรเป็นปุ่มหลอก หรือถ้าถูกปิดต้องบอกสาเหตุและขั้นต่อไป.
- Route/Menu Audit กลายเป็นแผนที่ QA ที่ตรวจได้จริงทั้งจาก UI และ source.
- ลดโอกาสที่งาน polish รอบต่อไปจะย้อนกลับไปใช้คำกว้างๆ เช่น "ถูกปิดระหว่างโหลด" โดยไม่บอก flow ที่เกี่ยวข้อง.
