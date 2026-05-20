# 0008 - เตรียม background และ observability tooling

วันที่: 2026-05-13

## สถานะ

Accepted

## บริบท

เครื่องมือภายนอกหลายตัวช่วยให้ Maprang ดีขึ้นได้ แต่การใส่ทุกอย่างเข้า runtime ทันทีจะเพิ่ม deploy risk ก่อนที่ core platform จะ production-ready โปรเจกต์จึงต้องมี staged adoption path ที่เพิ่มคุณภาพตอนนี้ และเตรียมระบบหนักไว้ใช้เมื่อถึงจังหวะเหมาะ

## Decision

รับ low-risk quality tooling ตอนนี้ และ stage runtime systems ที่หนักกว่าไว้ก่อน:

- ใช้ deterministic evals ทันทีสำหรับ prompt/context regression checks.
- เก็บ Promptfoo เป็น optional live-eval scaffolding สำหรับ model/provider comparisons.
- เพิ่ม Graphile Worker ภายหลังสำหรับ background jobs เช่น chat summaries, embedding refresh, image retries, cleanup, และ scheduled production smoke.
- เพิ่ม OpenTelemetry JS ภายหลังสำหรับ context-pipeline spans ที่ครอบ retrieve, assemble, generate, sanitize, และ persist.
- เพิ่ม Sentry ภายหลังสำหรับ frontend/backend error capture เมื่อ staging domains และ release identifiers เสถียรแล้ว.
- พิจารณา pgvector หลัง production Postgres environment แรกเสถียร.
- พิจารณา OpenFGA เฉพาะเมื่อ collaborative permissions, shared universes, หรือ creator teams ทำให้ role-based access ซับซ้อนเกิน local policy checks.
- พิจารณา LiteLLM หรือ One-API เฉพาะเมื่อ provider routing ต้องใช้ multi-key load balancing หรือ failover ที่เกิน OpenRouter.

## ผลลัพธ์

- Repo ได้ quality gates โดยไม่เพิ่ม runtime services ใหม่.
- Future architecture choices ถูกบันทึกก่อน implement.
- Production deploy โฟกัส real env, Supabase, provider verification, UI QA, และ API hardening ก่อนได้.
