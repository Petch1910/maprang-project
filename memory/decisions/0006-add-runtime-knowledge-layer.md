# 0006 - เพิ่ม runtime knowledge layer

วันที่: 2026-05-13

สถานะ: decided

## บริบท

โปรเจกต์ต้องมี product rules ที่ persist ได้ เป็นโครงสร้างมากกว่า session memory และ backend prompts/rule engines นำไปใช้ได้ตรงกว่า

## Decision

ใช้สถาปัตยกรรมแบบผสม:

- `memory/` เก็บ project/session state, decisions, blockers, และ QA status.
- `knowledge/raw/` เก็บ source notes และ reference material โดยไม่มี secrets.
- `knowledge/wiki/` เก็บ product knowledge แบบมนุษย์อ่านได้.
- `knowledge/structured/` เก็บ JSON packs แบบ schema-versioned สำหรับ runtime.

Backend โหลด structured packs สำหรับ chat style, creator drafting, relationship rules, scene rules, และ content policy. Health/readiness แสดง structured knowledge validity.

## ผลลัพธ์

- Product rules สะสมข้าม session ได้โดยไม่กลายเป็น chat history หลวมๆ.
- Runtime prompts ใช้ guidance ชุดเดียวกันได้ โดยไม่ต้อง hard-code ทุก rule ใน TypeScript.
- `bun run knowledge:audit` ต้องผ่านก่อน deploy.
