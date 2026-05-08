# Route/Menu Audit

ใช้คู่กับหน้า `/admin/health` และ `bun run e2e:smoke` เพื่อเช็คว่าปุ่มหลักในเว็บมีผลลัพธ์จริง ไม่ใช่เมนูหลอกก่อน deploy

| พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | Disabled/Guard | Empty state |
| --- | --- | --- | --- | --- | --- |
| Explore / Home | `/` | ค้นหา, หมวดหมู่, การ์ดตัวละคร, Continue Chatting, สร้างตัวละคร | เปิด Lobby, เปิดแชทเดิม, หรือไป Creator Studio ได้จริง | disabled เฉพาะโหลดข้อมูล | มีข้อความโหลดผิดพลาดและ demo card กันหน้าว่าง |
| Character Lobby | `/characters/:characterId` | Relationship Contract, เริ่มแชท, คัดลอกลิงก์, รายงาน | ส่ง `relationship_seed` ไปหน้าแชทและเปิด report dialog | รายงาน disabled ระหว่างส่ง | มี note เมื่อโหลดตัวละครไม่ได้ |
| Chat Room | `/chat`, `/chat/:chatId` | composer, tool tray, pending scene, รายงาน, โปรไฟล์ | ส่งข้อความ, เปิด scene prompt, report, wallet/profile navigation | ส่ง disabled เมื่อว่าง, streaming, หรือ token ไม่พอ | ห้องใหม่มี intro/greeting |
| Chat Sidebar | `/chat` | เมนูสามจุด: แก้ไขแชท, ปักหมุดแชท/เอาออกจากปักหมุดแชท, จัดเก็บแชท, เลือก, ลบแชท | ทุกคำสั่งมีผลจริง ลบต้อง confirm และเมนูรายการท้ายแถบเปิดขึ้นด้านบนเพื่อไม่ให้โดนตัด | ไม่มี disabled ถาวร | ถ้าไม่มีแชทจะแจ้งว่ายังไม่มีแชท |
| Creator Studio | `/create` | AI สร้างรูป+เนื้อหา, อัปโหลด, ลิงก์รูป, tag resolver, preview, submit | สร้าง draft ได้จริง มี fallback ภาพตัวอย่างถ้ายังไม่มี image provider | submit disabled เมื่อข้อมูลหลักไม่ครบ/แท็ก danger/gำลังบันทึก | readiness panel บอกช่องที่ยังขาด |
| My Chats | `/chats` | ค้นหา, filter, เปิดแชท, pending scene badge, เมนูสามจุด, เลือกหลายแชท, กู้คืนแชท | เปิดกลับไป `/chat/:chatId` ได้ เมนูแก้ชื่อ/ปักหมุด/จัดเก็บ/ลบมีผลจริง และแชทที่จัดเก็บกู้คืนได้ | disabled เฉพาะตอนกำลังบันทึกหรือยังไม่ได้เลือกแชท | แต่ละ filter มี empty state ของตัวเอง เช่น ยังไม่มีแชทปักหมุด/จัดเก็บ |
| Events Inbox | `/events` | pending scene list | เปิดกลับเข้าห้องที่มีฉากรออยู่ | event หมดอายุไม่แสดง action หลัก | บอกว่ายังไม่มีฉากสำคัญ |
| Profile / Persona | `/profile` | persona, content setting, created/favorite characters | เซฟตัวตนผู้เล่นและ content mode | disabled ตอนกำลังบันทึก | บอกให้เริ่มสร้าง/สำรวจเมื่อยังไม่มีข้อมูล |
| Wallet | `/wallet` | รีเฟรช, admin key, เพิ่ม/หัก token, usage, transaction | โหลด token/ธุรกรรมจาก backend และมี QA seed data | เพิ่ม/หัก disabled ถ้าไม่มี admin key หรือจำนวนไม่ถูกต้อง | บอกว่ายังไม่มี usage/transaction |
| Moderation | `/moderation` | admin key, filter, search, เปิดต้นทาง, action, audit log | ตรวจ report queue และ audit log ได้ | guard ด้วย `ADMIN_API_KEY` | บอกวิธีทดสอบ report flow |
| Admin Health | `/admin/health` | health refresh, deploy checklist, route/menu audit | เห็น DB, AI, Supabase, storage, CORS, route audit ในหน้าเดียว | ไม่มี disabled ถาวร | backend ล่มจะแสดงสิ่งที่ต้องแก้ |
| Staging Gate | external staging | Supabase จริง, Render/Railway, frontend domain, CORS, e2e smoke | ต้องผ่าน staging ก่อน production | ต้องใช้บัญชี/domain จริง | ใช้ `STAGING_RUNBOOK.md` |

Automated route smoke ล่าสุดเช็คทุก route หลักบน desktop/mobile, ดัก browser console/page error, และเช็ค horizontal overflow เพื่อจับปัญหาปุ่มล้นหรือหน้า admin ยิง API ทั้งที่ยังไม่มีสิทธิ์

คำสั่ง smoke:

```bash
bun run qa:seed
bun run e2e:smoke
bun run qa:full
```

Automated guard ล่าสุด:

- `scripts/frontend-static-audit.ts` ตรวจปุ่ม `<button>` ที่ไม่มี `type`, ปุ่มไอคอนที่ไม่มี `aria-label`/`title`, ลิงก์ placeholder `href="#"`/`to="#"`, handler ว่าง, และข้อความ placeholder ที่ไม่ควรหลุดขึ้น production
- `scripts/frontend-route-audit.ts` ตรวจลิงก์/เมนู static ที่ชี้ไป route จริงใน `App.tsx` เพื่อกันเมนูที่กดแล้วตัน
- `scripts/check-frontend-bundles.ts` ล็อก bundle budget โดยเฉพาะ main bundle และหน้า Chat ที่ถูก lazy load
