# 0024 - ล็อกต้นทางลิงก์แชร์ตัวละครใน frontend static audit

วันที่: 2026-05-31

## การตัดสินใจ (Decision)

Frontend source ต้องไม่อ่าน `window.location.origin` หรือ `globalThis.location.origin` ตรงจาก component/page สำหรับสร้างลิงก์แชร์ตัวละครอีกต่อไป ให้ใช้ helper กลาง `characterShareUrl` ใน `apps/frontend/src/lib/shareUrl.ts` เท่านั้น และให้ frontend static audit ปฏิเสธการอ่าน origin ตรงนอก helper นี้

## บริบท

ลิงก์แชร์ตัวละครเป็นพื้นผิวที่ผู้ใช้คาดหวังว่ากดแล้วได้ URL ที่แน่นอน ใช้ต่อใน lobby, chat, copy/share UI, และ smoke test ได้เหมือนกัน ถ้าทุก component ต่อ string เองจาก browser origin จะเกิดปัญหาง่าย เช่น path encode ไม่ครบ, test คุม origin ยาก, SSR/test runtime ไม่มี `window`, หรือในอนาคตต้องเปลี่ยน source ของ public frontend origin แล้วแก้หลายจุด

การย้าย logic เข้า helper กลางทำให้ URL generation เป็นจุดเดียว ทดสอบได้ และทำให้ static audit จับ regression ได้ก่อนมี UI ที่แชร์ URL ผิด origin หลุดไปถึง staging

## ทิศทาง implementation

- ใช้ `characterShareUrl(characterId, origin?)` สำหรับลิงก์แชร์ตัวละครทุกจุด
- helper ต้อง encode character id และ trim trailing slash ของ origin ก่อนสร้าง URL
- `apps/frontend/src/lib/shareUrl.ts` เป็นไฟล์เดียวที่อ่าน `window.location.origin` ได้
- frontend static audit ต้องจับทั้ง `window.location.origin` และ spaced `globalThis . location . origin` นอก allowlist
- predeploy และ memory audit ต้องล็อก checker/test snippets เพื่อไม่ให้ guard หายจาก handoff

## ผลลัพธ์

- Component ไม่ต้องประกอบลิงก์แชร์เองซ้ำๆ และลดโอกาส URL เพี้ยนเมื่อ origin เปลี่ยน
- Static QA ปิดการ bypass ด้วยการอ่าน browser origin ตรง
- งาน staging/production รอบถัดไปมีหลักฐานชัดว่าการแชร์ตัวละครใช้ helper กลาง ไม่ใช่ string ต่อเองใน UI
