# 0012 - เพิ่ม usage และ cost intelligence

วันที่: 2026-05-14

## บริบท

Maprang ต้องมองเห็น token economy ก่อน staging และ production รายการ wallet transactions แบบดิบอย่างเดียวไม่พอสำหรับการตัดสินใจ production เพราะไม่บอกว่าโมเดลไหนแพงที่สุด, usage เคลื่อนตามเวลาอย่างไร, หรือ token balance ปัจจุบันน่าจะรองรับ chat turns ได้อีกกี่รอบ

## Decision

ขยาย `/me/usage` endpoint เดิม แทนการเพิ่ม table หรือ route ใหม่ โดย derive cost intelligence จาก `Usage` และ `TokenTransaction` ledgers เดิม:

- Total tokens, request count, และ total model cost.
- Usage แยกตาม model.
- Seven-day daily usage trend.
- Average tokens/cost per request และ estimated remaining chat requests จาก token balance ปัจจุบัน.

แสดงข้อมูลชุดเดียวกันบน `/wallet` ด้วย Thai UI labels และผูก route/menu audit กับ smoke coverage เข้ากับ fields ใหม่

## ผลลัพธ์

- ไม่ต้องมี migration.
- Wallet page มีประโยชน์เป็น cost dashboard ไม่ใช่แค่ token ledger.
- Production/staging ยังสามารถเปลี่ยน calculation เป็น analytics table ที่ละเอียดกว่าได้ถ้า volume โตขึ้น.
- Local QA ตรวจ shape ได้แบบ deterministic ผ่าน seed data และ API smoke.
