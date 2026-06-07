# 0007 - เพิ่ม deterministic roleplay evals

วันที่: 2026-05-13

## สถานะ

Accepted

## บริบท

คุณภาพแชทของ Maprang ขึ้นกับ context ที่ assemble แล้ว ไม่ได้ขึ้นกับโมเดลที่เลือกอย่างเดียว ตอนนี้โปรเจกต์มี runtime knowledge packs, lore injection, กฎคุมพรอมป์, relationship state, และ scene state การเปลี่ยน prompt เล็กน้อยอาจทำให้ roleplay depth ลดลง, hidden instructions หลุด, หรือ relationship continuity หายไปแบบเงียบๆ

## การตัดสินใจ (Decision)

เพิ่ม deterministic local eval suite ไว้ใต้ `evals/` และรันผ่าน `bun run eval:local`. ชุดนี้ตรวจ prompt assembly โดยไม่เรียก live model:

- นโยบายคุมพรอมป์อยู่เหนือข้อความที่ไม่น่าเชื่อถือ
- runtime knowledge text ยังอยู่ครบ
- lore entries ถูกวางใน section ที่คาดไว้
- relationship และ scene continuity inject ได้
- ไม่มี secret-shaped values
- งบ token ของ prompt แบบคร่าว ๆ ยังอยู่ในขอบเขต

เก็บ Promptfoo scaffolding ไว้เป็น optional สำหรับ live-model comparisons ภายหลัง แต่ยังไม่ใส่เป็น mandatory local gate จนกว่า staging จะมี provider keys และ budgets ที่เสถียร

## ผลลัพธ์

- `qa:local` และ CI จับ context regressions ได้เร็วขึ้น.
- Eval suite ยังถูกและ deterministic.
- Live quality scoring ยังเป็น future staging step ไม่ใช่ local developer blocker.
