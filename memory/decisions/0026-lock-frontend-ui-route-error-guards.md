# 0026 - ล็อกชุด guard ความปลอดภัย UI และ route error

## สถานะ

ยอมรับแล้วในวันที่ 2026-05-31

## บริบท

หลังจากปิด guard เรื่องลิงก์แชร์ตัวละครและ cross-window messaging แล้ว ยังมีช่องว่างที่ทำให้หน้าเว็บดูพร้อมใช้งานทั้งที่ action ยังไม่สมบูรณ์ หรือทำให้ error ดิบหลุดไปถึงผู้ใช้และ response สาธารณะได้ง่าย เช่น form submit ที่ไม่ทำอะไร, browser dialog ดิบ, listener ที่ไม่ cleanup, component/page ที่ rethrow raw error, และ route catch ที่คืน raw error object

ช่องว่างเหล่านี้สำคัญกับ Maprang เพราะผู้ใช้จะอยู่ใน flow แชทและสร้างตัวละครยาวๆ ถ้า UI ดูกดได้แต่ไม่เกิดผล หรือ error โผล่แบบเทคนิค ระบบจะเสียความน่าเชื่อถือก่อนถึง staging จริง

## การตัดสินใจ

- Frontend static audit ต้องบล็อก no-op submit handler ทั้งแบบว่าง, async ว่าง, และคืน `undefined`
- Frontend static audit ต้องบล็อก native browser dialog เช่น `window.alert`, `window.confirm`, และ `globalThis.prompt`
- Frontend static audit ต้องบังคับ browser event listener ให้มี cleanup คู่กันในไฟล์เดียวกัน
- Frontend component/page ต้องไม่ rethrow raw `error`; ให้แปลงเป็นผลลัพธ์หรือข้อความที่คุมได้ก่อนถึง UI
- Backend route catch ต้องไม่ `return error` หรือ `return (error)` ตรงๆ; ให้ผ่าน route error response helper ที่คุมรูปแบบ public response
- Memory, agent guide, production checklist, และ predeploy lock ต้องบันทึก guard ชุดนี้เป็น baseline ก่อน staging รอบถัดไป

## ผลกระทบ

- ลดโอกาสมีปุ่มหรือฟอร์มที่ดูเหมือนทำงานแต่ไม่มีผลจริง
- ลด error ดิบที่อาจหลุดสู่หน้าจอผู้ใช้, console, หรือ public API response
- ทำให้ future UI surface ต้องออกแบบ modal/toast/result state อย่างตั้งใจแทนการใช้ browser primitive ตรงๆ
- ทำให้ route error response คงรูปแบบ Thai-first และไม่ expose raw object โดยไม่ได้ตั้งใจ

## งานตามมา

ถ้ามี UI/API surface ใหม่ที่ต้องเปิด dialog, listener, submit, หรือ route catch ให้ใช้ helper/flow กลางที่มีผลลัพธ์จริงและทดสอบได้ก่อนเพิ่มเมนูหรือปุ่มให้ผู้ใช้กด
