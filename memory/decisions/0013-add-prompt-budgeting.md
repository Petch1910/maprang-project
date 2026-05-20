# 0013 - เพิ่ม prompt budgeting

วันที่: 2026-05-14

## บริบท

roleplay sessions ที่ยาวขึ้นทำให้ prompt size โตแบบเงียบๆ จาก saved history, runtime memory, lore, persona, และ scene state ถ้าไม่มี budget ค่าใช้จ่ายและ latency จะเพิ่มก่อนทีมรู้ตัว และ provider อาจ fail เมื่อ context เกิน model limits

## การตัดสินใจ (Decision)

เพิ่ม Prompt Budgeting v1 ใน chat assembly:

- เก็บ `PROMPT_BUDGET_TOKENS` และ `PROMPT_HISTORY_MAX_MESSAGES` ให้ configurable.
- Estimate prompt size ก่อน provider calls.
- ตัด chat history messages ที่เก่าที่สุดก่อน จน assembled prompt อยู่ใน budget.
- คืน prompt budget metadata ใน chat usage และ persist ลง message/transaction metadata.
- แสดง budget config ผ่าน health และ chat right-rail model panel.

## ผลลัพธ์

- ไม่ต้องมี migration.
- Recent conversation, system policy, character context, persona, world state, relationship state, และ scene state ยังถูกจัด priority สูงกว่า.
- ถ้า fixed context อย่างเดียวเกิน budget แล้ว metadata จะ mark `overBudget` เพื่อให้ Prompt Inspector และ QA ช่วยชี้ว่าควร trim อะไรต่อ.
- Production ปรับ budget values ราย model ได้โดยไม่ต้องแก้โค้ด.
