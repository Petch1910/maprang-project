# กล่องบันทึกชั่วคราว

ใช้ไฟล์นี้เก็บโน้ตชั่วคราวที่ต้องย้ายเข้าไฟล์ memory ถาวรภายหลัง

## โน้ตที่ยังเปิดอยู่

- หลังมี staging URLs จริงแล้ว ให้อัปเดต `deploy-blockers.md` ด้วยจำนวน blocker จริงจาก `bun run production:check`.
- หลังแก้ billing/โควตาของ image provider แล้ว ให้บันทึกผล live image smoke รอบแรกที่ผ่าน โดยไม่ใส่ secret.
- หลัง live chat provider smoke เสถียรแล้ว ให้บันทึก command ที่ใช้และระบุว่า staging ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` แล้วหรือยัง.
