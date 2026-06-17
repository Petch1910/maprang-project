# 0030 - เพิ่มแผนงานที่เหลือแบบรวมศูนย์

วันที่: 2026-06-17

สถานะ: accepted

## บริบท

งาน Maprang มีเอกสารหลายชุดที่เกิดจากหลายรอบพัฒนา ได้แก่ Core Play, AI Creator, MissAI audit, Test Plan, production blockers, memory status, และ agent workflow เอกสารเหล่านี้ยังมีประโยชน์ แต่การสานต่องานเริ่มต้องไล่อ่านหลายไฟล์เพื่อหาว่า task ถัดไปคืออะไร

ผู้ใช้ขอให้เขียน plan ที่เหลืออย่างละเอียดและทำ task ที่เหลือเพื่อนำไปพัฒนาระบบตามที่ออกแบบไว้ จึงต้องมี roadmap รวมที่จัดลำดับงานตามระบบจริง ไม่ใช่กระจายอยู่ใน note หลายไฟล์

## การตัดสินใจ

เพิ่ม `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md` เป็นแผนรวมของงานที่เหลือ โดยแบ่งเป็น phase/task/acceptance/QA gate:

- repo checkpoint
- chat play loop
- creator studio
- My Chats
- marketplace และ character lobby
- AI Creator และ library
- wallet, BYOK, usage
- moderation, safety, admin
- prompt, memory, debug tooling
- responsive และ visual QA
- staging และ production readiness

`AGENTS.md` และ `agent.md` ต้องชี้ agent รอบต่อไปให้อ่านไฟล์นี้ก่อนเริ่มงานต่อ และ `predeploy:check` ต้องรู้จักไฟล์นี้เพื่อกันแผนหายหรือ drift

## ผลกระทบ

- งาน continue รอบต่อไปมี roadmap เดียวที่อ่านก่อนลงมือ
- external production blockers ถูกแยกออกจาก repo-owned local tasks ชัดขึ้น
- AI agent สามารถเลือกงานตาม phase และรัน QA gate ที่ตรง scope ได้
- เอกสารเฉพาะด้านยังคงเป็นรายละเอียดสนับสนุน ไม่ใช่ roadmap หลักเพียงอย่างเดียว

## งานติดตาม

- ใช้ตารางลำดับลงมือทันทีในแผนนี้เพื่อเลือก task ถัดไป
- หลังปิดแต่ละ phase ให้อัปเดต plan, memory, และ QA status
- เมื่อมี deployed/staging credential จริง ให้ย้ายงานระยะ production จาก blocker เป็น verification task
