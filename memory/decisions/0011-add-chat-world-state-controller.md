# 0011 - เพิ่ม chat world state controller

วันที่: 2026-05-14

## สถานะ

Accepted

## บริบท

แชท roleplay ยาวๆ ต้องการมากกว่า raw message history, lore, relationship state, และ scene state เพราะโมเดลอาจ drift เรื่องเวลาปัจจุบัน, สถานที่, อากาศ, หรืออารมณ์ของฉากหลังผ่านไปหลายเทิร์น โดยเฉพาะเมื่อผู้ใช้กลับมาเล่น saved chat หรือเข้า/ออก Scene Mode

## การตัดสินใจ (Decision)

- เก็บ `worldState` ไว้ใน `Chat.memory` JSON เดิม แทนการเพิ่ม table ใหม่สำหรับ v1.
- เปิด owner-scoped `GET /chats/:id/world-state` และ `PATCH /chats/:id/world-state`.
- Inject world state ที่มีความหมายเข้า runtime prompt assembly ก่อน relationship/scene instructions.
- เพิ่ม Chat right-rail panel สำหรับ time, location, weather, mood, และ scene notes.
- ใส่ world state ใน Prompt Inspector runtime memory เมื่อส่ง `chatId`.

## ผลลัพธ์

- Feature ship ได้โดยไม่มี migration risk และสามารถยกระดับเป็น relational table ภายหลังได้ถ้าต้องการ history/versioning.
- QA seed chats มี world state ที่นิ่ง ทำให้ browser และ prompt tests อ่านง่ายขึ้น.
- อนาคตเพิ่ม automatic world-state extraction, conflict diffs, และ per-scene snapshots ได้.
