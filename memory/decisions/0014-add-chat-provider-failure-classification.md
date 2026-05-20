# 0014 - เพิ่ม chat provider failure classification

วันที่: 2026-05-14

## Decision

Chat provider failures ต้องถูก classify เป็น typed, user-safe states ก่อนถึง UI.

## บริบท

Maprang พึ่ง live LLM providers สำหรับทั้ง normal chat และ streamed chat แล้ว provider failures อาจเกิดจาก rate limits, exhausted quota, bad credentials, timeouts, หรือ temporary outages. Raw provider errors รกเกินไปสำหรับผู้ใช้, อาจเปิด implementation details, และไม่ควรทำให้เกิด token charges.

## ทิศทาง implementation

- Classify chat provider errors เป็น `rate_limited`, `quota_exhausted`, `invalid_credentials`, `timeout`, `provider_unavailable`, หรือ `unknown`.
- คืน Thai user-facing messages ที่บอกว่าผู้ใช้ retry เองได้หรือ admin ต้องแก้ configuration.
- ให้ failed provider attempts มี zero token usage และ zero cost.
- ส่ง `providerFailure` metadata ใน normal/streamed chat responses เพื่อให้ UI และ QA เห็น failure mode.
- ให้ roleplay continuation failures degrade gracefully โดยเก็บ primary provider reply ไว้ แทนการ fail ทั้งเทิร์น.
- ให้ live chat smoke fail บน `usage.providerFailure` โดยตรง เพื่อให้ staging diagnostics ชี้ไปที่ provider failure class จริง.

## ผลลัพธ์

- Chat UX เปราะน้อยลงเมื่อ OpenRouter หรือโมเดลที่เลือกมีปัญหาชั่วคราว.
- Local QA ตรวจ provider failure handling ได้โดยไม่ใช้ live model tokens.
- งาน model-router/fallback ในอนาคต reuse typed failure contract ชุดเดียวกันได้.
