# 0018 - ให้ test coverage audit เป็น QA contract

วันที่: 2026-05-25

## การตัดสินใจ (Decision)

ไฟล์ทดสอบของ repo ต้องถูกค้นหาและผูกเข้า QA gate แบบอัตโนมัติ ไม่ใช่อาศัยการจำ path ด้วยมือเท่านั้น. `tests:audit` ต้องค้นหาไฟล์ `.test.ts`, `.test.tsx`, `.spec.ts`, และ `.spec.tsx` ที่เป็นของ repo โดยข้าม `node_modules` และ directory output แล้ว fail เมื่อพบกรณีต่อไปนี้:

- ไฟล์ test ใน `scripts/` ไม่มี root package script ที่รันไฟล์นั้นโดยตรง.
- root package script ที่ลงท้าย `:test` และใช้ `bun test` ไม่ถูกเรียกจาก `qa:repo`.
- root package script อ้างไฟล์ test ที่ไม่มีอยู่จริง.
- backend test suite ไม่ถูกครอบด้วย `backend:check` และ `apps/backend` `deploy:check`.
- browser e2e specs ไม่ถูกครอบด้วย `e2e:smoke` และ `playwright.config.ts`.

## บริบท

repo มี test หลายชั้น: backend unit/persistence/security tests, script regression tests, frontend helper audits, smoke-helper tests, และ Playwright e2e specs. ก่อน decision นี้มี guard จำนวนมากใน `predeploy:check` แต่ถ้าเพิ่มไฟล์ test ใหม่แล้วลืมเพิ่ม package script หรือ `qa:repo` ยังมีโอกาสที่ test นั้นจะไม่ถูกรันโดย CI/Production Smoke.

## ทิศทาง implementation

- เพิ่ม `scripts/test-coverage-audit.ts` เป็น importable runner และ CLI.
- เพิ่ม `scripts/test-coverage-audit.test.ts` เพื่อจำลอง orphan test, stale test path, missing `qa:repo` script, backend suite wiring, และ e2e suite wiring.
- เพิ่ม `tests:audit` และ `tests:audit:test` ใน root `package.json`.
- ให้ `qa:repo`, CI, Production Smoke, และ `predeploy:check` รันหรือเรียก audit นี้.
- บันทึกสถานะใน README, DEPLOYMENT_QA, memory, และ decision index.

## ผลลัพธ์

- เพิ่ม test ใหม่แล้วลืมผูกเข้า QA จะ fail ตั้งแต่ local predeploy/CI.
- ลดโอกาสที่ regression test สำคัญถูกเพิ่มแต่ไม่มีใครรัน.
- Future agent เห็นชัดว่า test wiring เป็น quality contract ไม่ใช่สคริปต์ช่วยเหลือชั่วคราว.
