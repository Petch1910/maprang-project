# 0003 - แยก live provider verification

วันที่: 2026-05-13

สถานะ: done

## Decision

ติดตาม live readiness ของ chat provider แยกจาก live readiness ของ image provider.

## เหตุผล

การมี provider key ที่ตั้งค่าแล้วไม่พอสำหรับ production เพราะ billing, quota, model access, networking, และ rate limits ยังทำให้ fail ได้หลัง env validation ผ่านแล้ว

## สิ่งที่ทำแล้ว

- Chat readiness ใช้ `CHAT_PROVIDER_LIVE_VERIFIED`.
- Image readiness ใช้ `IMAGE_GENERATION_LIVE_VERIFIED`.
- Admin Health และ smoke doctor แสดงสถานะและ production blockers แยกกัน.
- Production gate fail จนกว่า live verification จะผ่านจริง.

## ถัดไป

ตั้งแต่ละ flag เฉพาะหลัง live smoke path ของ flag นั้นผ่านใน target environment แล้วเท่านั้น.
