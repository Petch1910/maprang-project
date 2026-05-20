# 0005 - ตรวจ memory ใน local QA

วันที่: 2026-05-13

สถานะ: done

## การตัดสินใจ (Decision)

เพิ่ม `memory:audit` และรันอยู่ใน `qa:local`.

## เหตุผล

memory vault เป็นส่วนหนึ่งของ workflow การพัฒนาแล้ว จึงควรถูกตรวจเหมือน artifact อื่นในโปรเจกต์ เพื่อไม่ให้ required context files, local links, และ secret-safety rules drift โดยไม่รู้ตัว

## สิ่งที่ทำแล้ว

- เพิ่ม `scripts/memory-audit.ts`.
- เพิ่ม `bun run memory:audit`.
- เพิ่ม `memory:audit` เข้า `qa:local`.
- เพิ่ม memory checks เข้า `predeploy:check`.

## ถัดไป

รักษา memory ให้กระชับ และอัปเดตหลัง major QA, deploy, API, schema, UI, หรือ provider changes.
