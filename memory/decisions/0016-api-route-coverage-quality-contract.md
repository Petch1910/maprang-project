# 0016 - ให้ API route coverage เป็น quality contract

วันที่: 2026-05-25

## การตัดสินใจ (Decision)

`api:audit` ต้องตรวจมากกว่า "route นี้มีชื่ออยู่ในตาราง coverage หรือไม่" และต้องถือว่า coverage table เป็น quality contract ของระบบหลังบ้านกับหน้าบ้าน.

Route ที่เกี่ยวกับผู้ดูแลต้องมี `admin-smoke`, route ที่แตะ live provider ต้องมี `live-smoke`, `manual-production` ห้ามเป็น coverage เดี่ยว, และ coverage note ต้องไม่ว่าง. เมื่อ fail ต้องบอก reason ต่อ route เพื่อให้แก้ได้ตรงจุด.

## บริบท

ผู้ใช้ถามซ้ำเรื่อง API ต่าง ๆ ยังไม่ผ่านและระบบยังดูไม่สมบูรณ์. ก่อนหน้านี้ audit ตรวจ missing/stale route ได้แล้ว แต่ยังมีช่องว่างที่ route อาจมี entry แบบอ่อนเกินไป เช่นใส่ manual production เฉย ๆ หรือ route แอดมินไม่มี admin smoke.

## ทิศทาง implementation

- `scripts/api-route-audit.ts` ต้องคง `admin-smoke`, `live-smoke`, `manual-production`, และ weak coverage reason checks ไว้.
- `scripts/api-route-audit.test.ts` ต้องมี regression สำหรับ admin, live provider, manual-only, empty-note, และ per-route reasons.
- `predeploy:check` ต้องล็อก snippet สำคัญของ guard และ docs ที่อธิบาย guard นี้.
- `memory:audit` ต้องรักษาบันทึกสถานะของ guard นี้ใน working context, deploy blockers, และ QA status.

## ผลลัพธ์

- เพิ่ม route ใหม่แล้วลืม smoke เฉพาะทางจะ fail ก่อน deploy.
- คนดูแลเห็นสาเหตุใน CLI โดยไม่ต้องไล่เปิด coverage table เอง.
- Frontend API helper contract, backend route coverage, และ staging handoff ใช้ภาษาเดียวกันเรื่องความพร้อมของ API.
