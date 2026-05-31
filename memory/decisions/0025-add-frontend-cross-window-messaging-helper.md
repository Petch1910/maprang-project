# 0025 - เพิ่ม helper กลางสำหรับ cross-window messaging

วันที่: 2026-05-31

## การตัดสินใจ (Decision)

Frontend ต้องใช้ `apps/frontend/src/lib/crossWindowMessaging.ts` เป็นจุดกลางสำหรับ `postMessage` และ `message` event listener แทนการเรียก browser API ตรงจาก component/page โดย helper ต้องตรวจ origin เป็น HTTPS origin ล้วน และปฏิเสธ wildcard, credential/userinfo, path, query, และ hash

## บริบท

ระบบหน้าเว็บมีหลายพื้นที่ที่อาจต้องคุยข้าม window/frame ในอนาคต เช่น preview, share, embed, admin tooling หรือ payment/provider handoff ถ้าปล่อยให้แต่ละ component เรียก `postMessage` หรือ `addEventListener('message')` เอง จะเกิดช่องโหว่ได้ง่ายจาก targetOrigin `"*"` หรือ listener ที่ไม่ตรวจ `event.origin`

ก่อน decision นี้ static audit บล็อก direct message listener ไว้แล้ว แต่ยังไม่มี helper กลางให้ future UI ใช้ได้อย่างปลอดภัย งานนี้จึงเติม helper ที่ทดสอบได้ และปรับ audit allowlist ให้รับ listener เฉพาะใน helper ดังกล่าว

## ทิศทาง implementation

- `normalizeTrustedMessageOrigin` ต้องรับเฉพาะ `https` origin ล้วน ไม่มี credential, path, query หรือ hash
- `isTrustedMessageOrigin` ต้องเทียบ origin หลัง normalize เท่านั้น
- `postMessageToTrustedOrigin` ต้องไม่ส่งข้อความถ้า target window หรือ target origin ไม่ผ่าน guard
- `addTrustedMessageListener` ต้องตรวจ `event.origin` ก่อนเรียก handler และคืน cleanup function ที่ remove listener คู่กัน
- frontend static audit ต้องยังบล็อก `postMessage(..., "*")` ทุกไฟล์ และบล็อก direct `message` listener นอก helper

## ผลลัพธ์

- Future UI มีทางใช้ cross-window messaging ที่ปลอดภัยและทดสอบได้
- Component/page ไม่ต้องถือ logic ตรวจ origin เอง
- Static QA ป้องกัน regression ทั้ง wildcard postMessage และ direct message listener ที่ไม่ผ่าน helper
