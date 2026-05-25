# 0017 - ให้ future surface ไม่อ้าง route จริงก่อนพร้อมตรวจ

วันที่: 2026-05-25

## การตัดสินใจ (Decision)

Route/Menu Audit ต้องแยกของที่พร้อมกดออกจากของที่เป็นแผนอนาคตอย่างชัดเจน. แถวสถานะ `future` ต้องอธิบายว่าเป็นงานเผื่ออนาคต และต้องไม่อ้าง route แบบ `/path` จนกว่าหน้านั้นจะมี route, preload, navigation, empty state, disabled reason, และ QA ที่ตรวจได้จริง.

แถวที่ยังต้องใช้ staging จริงให้ใช้สถานะ `needs-staging` และต้องชี้คนทำงานไปที่ `STAGING_RUNBOOK.md` กับ `/admin/health` แทนการทำให้ดูเหมือนเป็นเมนู production-ready.

## บริบท

ผู้ใช้ย้ำหลายครั้งว่าเว็บมีเมนูให้กดแต่บางอย่างยังทำต่อไม่ได้. ก่อนหน้านี้ Route/Menu Audit บังคับ disabled reason และ staging/future wording แล้ว แต่ยังมีช่องให้คนใส่ route แบบ `/world` ในแถว `future` จนดูเหมือนมีเมนูหรือหน้าที่พร้อมทดสอบ ทั้งที่ยังเป็นแผนอนาคต.

## ทิศทาง implementation

- `scripts/route-menu-doc-check.ts` ต้อง reject `future` row ที่มี route token ขึ้นต้น `/`.
- `scripts/route-menu-doc-check.test.ts` ต้องมี regression ที่ใส่ `future` route เช่น `/world` แล้ว fail ด้วยข้อความที่อ่านรู้เรื่อง.
- `ROUTE_MENU_AUDIT.md` ต้องบอกกฎนี้ในหมายเหตุสถานะ เพื่อให้คนทำ UI/QA ไม่เพิ่มเมนูหลอก.
- `memory:audit` และ `predeploy:check` ต้องล็อก note นี้ไว้ใน memory/docs ก่อน handoff.

## ผลลัพธ์

- Future-only surfaces จะไม่ดูเหมือนเมนูพร้อมกดก่อนมีระบบจริง.
- ถ้าจะเปิด route ใหม่ ต้องยกระดับเป็น `ready` หรือ `guarded` พร้อม route/preload/navigation QA ก่อน.
- Admin Health และ Route/Menu Audit จะสื่อสารงานค้างได้ตรงขึ้นโดยไม่ปนกับ production menu surface.
