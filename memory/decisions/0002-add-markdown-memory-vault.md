# 0002 - เพิ่ม Markdown memory vault

วันที่: 2026-05-13

สถานะ: done

## การตัดสินใจ (Decision)

เพิ่ม project memory vault แบบเบาไว้ใต้ `memory/`.

## เหตุผล

งานนี้ลากยาวหลาย session และมี product decisions, deployment blockers, provider verification, UI direction, backend contracts, และ QA gates จำนวนมาก การเก็บโน้ตเป็น Markdown ลดการค้นซ้ำ และทำให้ session ถัดไปสานต่อง่ายขึ้น

## กฎ

- ห้ามใส่ secrets.
- ห้ามใส่ real credentials.
- เขียนโน้ตให้มีวันที่และเฉพาะเจาะจง.
- อัปเดตหลังมี major QA, deploy, API, schema, UI, หรือ provider changes.

## ถัดไป

ใช้ memory vault เป็นจุดเริ่มต้นแรกเมื่อกลับมาสานต่องานระยะยาว.
