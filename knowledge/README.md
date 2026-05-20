# ชั้นความรู้ของ Maprang

โฟลเดอร์นี้แยก product knowledge ระยะยาวออกจาก runtime user data.

## ชั้นข้อมูล

- `raw/`: เอกสารต้นทาง เช่น TOR notes, UX references, provider docs, และ policy notes.
- `wiki/`: Markdown สำหรับมนุษย์อ่านที่สรุปจาก raw sources.
- `structured/`: JSON knowledge packs ที่ backend load, validate, และนำไปใช้ใน prompts หรือ rule engines ได้.

เริ่มอ่าน product context จาก [ดัชนี Wiki](./wiki/INDEX.md).

## ชุดข้อมูล structured

runtime packs ชุดแรกครอบคลุม chat style, creator guidance, relationship rules, scene rules, และ content policy.

## กฎ

- ห้ามเก็บ secrets, access tokens, private keys, database passwords, หรือ service role keys.
- เก็บเฉพาะชื่อ env variable ไม่เก็บค่าจริง.
- ทำให้ structured files deterministic และมี schema version.
- รัน `bun run knowledge:audit` หลังแก้โฟลเดอร์นี้.

## การใช้งาน runtime

backend โหลด `knowledge/structured/*.json` ผ่าน `knowledge.service.ts`.
การใช้งาน runtime ช่วงแรกตั้งใจให้ conservative:

- Chat system prompts ได้ style และ policy guide แบบกระชับ.
- Creator AI draft prompts ได้ character creation guidance.
- Health/readiness แสดง structured knowledge status.

อนาคตสามารถขยายเป็น relationship rules, scene rules, recommendation rules, และ admin-managed knowledge packs ที่แก้ไขได้.
