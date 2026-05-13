# Route/Menu Audit

ใช้คู่กับหน้า `/admin/health` และ `bun run e2e:smoke` เพื่อตรวจว่าเมนูหลักในเว็บมีผลลัพธ์จริง ไม่ใช่ปุ่มหลอกก่อน deploy

| พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | Disabled/Guard | Empty state |
| --- | --- | --- | --- | --- | --- |
| Explore / Home | `/` | ค้นหา, หมวดหมู่, การ์ดตัวละคร, Continue Chatting, สร้างตัวละคร, mobile bottom nav | เปิด Lobby, เปิดแชทเดิม, ไป Creator Studio ได้จริง และมือถือมี nav ไปหน้าหลักครบ | disabled เฉพาะตอนโหลดข้อมูล | มีข้อความโหลดผิดพลาดและ demo card กันหน้าว่าง |
| Character Lobby | `/characters/:characterId` | Relationship Contract, เริ่มแชท, คัดลอกลิงก์, รายงาน | ส่ง `relationship_seed` ไปหน้าแชทและเปิด report dialog | รายงาน disabled ระหว่างส่ง | มีข้อความบอกเมื่อโหลดตัวละครไม่ได้ |
| Chat Room | `/chat`, `/chat/:chatId` | composer, tool tray, pending scene, โหมดอ่าน, รายงาน, โปรไฟล์ | ส่งข้อความ, เปิด scene prompt, โหมดอ่านเปลี่ยนพื้นที่อ่านข้อความจริง, report, wallet/profile navigation | ส่ง disabled เมื่อข้อความว่าง, streaming, หรือ token ไม่พอ | ห้องใหม่มี intro/greeting |
| Chat Sidebar | `/chat` | เมนูสามจุด: แก้ไขแชท, ปักหมุด/ถอนหมุด, จัดเก็บ, เลือก, ลบ | ทุกคำสั่งมีผลจริง ลบต้อง confirm และเมนูท้ายแถบเปิดขึ้นด้านบนเพื่อไม่ให้โดนตัด | ไม่มี disabled ถาวร | ถ้าไม่มีแชทจะแจ้งว่ายังไม่มีแชท |
| Creator Studio | `/create` | AI สร้างรูป+เนื้อหา, อัปโหลด, ลิงก์รูป, tag resolver, preview, submit | สร้าง draft ได้จริง มี fallback ภาพตัวอย่างถ้ายังไม่มี image provider | submit disabled เมื่อข้อมูลหลักไม่ครบ, แท็ก danger, หรือกำลังบันทึก | readiness panel บอกช่องที่ยังขาด |
| My Chats | `/chats` | ค้นหา, filter, เปิดแชท, pending scene badge, เมนูสามจุด, เลือกหลายแชท, กู้คืนแชท | เปิดกลับไป `/chat/:chatId` ได้ เมนูแก้ชื่อ/ปักหมุด/จัดเก็บ/ลบมีผลจริง bulk archive/restore/delete ถูก smoke บน desktop/mobile แล้ว | disabled เฉพาะตอนกำลังบันทึกหรือยังไม่ได้เลือกแชท | แต่ละ filter มี empty state ของตัวเอง เช่น ยังไม่มีแชทปักหมุด/จัดเก็บ |
| Events Inbox | `/events` | pending scene แบบจัดกลุ่มตามฉาก พร้อมแชทย่อยแต่ละห้อง | กดแชทย่อยในกลุ่ม event แล้วเปิดกลับเข้าห้องที่มีฉากรออยู่ | event หมดอายุไม่แสดง action หลัก | บอกว่ายังไม่มีฉากสำคัญ |
| Profile / Persona | `/profile` | persona, content setting, created/favorite characters | เซฟตัวตนผู้เล่นลงบัญชีและ local draft พร้อมใช้เป็นบริบทใน chat prompt ส่วน content mode บันทึกผ่าน backend | disabled ตอนกำลังบันทึก | บอกให้เริ่มสร้าง/สำรวจเมื่อยังไม่มีข้อมูล |
| Wallet | `/wallet` | รีเฟรช, admin key, เพิ่ม/หัก token, usage, transaction | โหลด token/ธุรกรรมจาก backend และมี QA seed data | เพิ่ม/หัก disabled ถ้าไม่มี admin key, ไม่มี user summary, จำนวนไม่ถูกต้อง, หรือกำลังส่ง | บอกว่ายังไม่มี usage/transaction |
| Moderation | `/moderation` | admin key, filter, search, เปิดต้นทาง, action, audit log | ตรวจ report queue และ audit log ได้ | guard ด้วย `ADMIN_API_KEY` | บอกวิธีทดสอบ report flow |
| Admin Health | `/admin/health` | health refresh, production blocker summary, deploy checklist, route/menu audit, ลิงก์ตรวจพรอมป์ | เห็น DB, AI, Supabase, storage, CORS, production blocker count, route audit และคำสั่ง final gate ในหน้าเดียว พร้อมไป Prompt Inspector ได้ | ไม่มี disabled ถาวร รีเฟรช disabled ได้เฉพาะตอนเรียกข้อมูล | backend ล่มจะแสดงสิ่งที่ต้องแก้ |
| Prompt Inspector | `/admin/prompt-inspector` | admin key, เลือกตัวละคร, ข้อความปัจจุบัน, ข้อความก่อนหน้า, runtime note, persona override, ตรวจพรอมป์, คัดลอก redacted prompt | เรียก admin API เพื่อตรวจ redacted prompt snapshot, section token budget, lore retrieval, warnings และ prompt diff โดยไม่ยิงโมเดลจริง | guard ด้วย `ADMIN_API_KEY`; ปุ่มตรวจ disabled เมื่อยังไม่พร้อมหรือกำลังตรวจ | แสดงสถานะยังไม่ได้ตรวจพรอมป์และบอกให้เลือกตัวละคร/ข้อความก่อนตรวจ |
| Staging Gate | external staging | Supabase จริง, Render/Railway, frontend domain, CORS, e2e smoke | ต้องผ่าน staging ก่อน production | ต้องใช้บัญชีและ domain จริง | ใช้ `STAGING_RUNBOOK.md` |

Automated route smoke ล่าสุดเช็คทุก route หลักบน desktop/mobile, ดัก browser console/page error, และเช็ค horizontal overflow เพื่อจับปัญหาปุ่มล้นหรือหน้า admin ยิง API ทั้งที่ยังไม่มีสิทธิ์
เมนูแชทถูกเช็คทั้งสองพื้นผิวคือ sidebar ในห้องแชทและหน้า `/chats` รวมถึง pin/unpin, rename, archive, restore, delete, selection mode และ bulk archive/restore/delete

คำสั่ง smoke:

```bash
bun run route-menu:audit
bun run qa:seed
bun run e2e:smoke
bun run qa:full
```

Automated guard ล่าสุด:

- `scripts/route-menu-doc-check.ts` ตรวจให้ `ROUTE_MENU_AUDIT.md` มีทุก route/menu ที่แสดงใน `/admin/health`, route จริงใน `App.tsx`, nav path, และ route preload ครบตรงกัน ถ้าตารางหรือเมนู drift ออกจาก source จริงจะ fail ทันที
- `scripts/frontend-static-audit.ts` ตรวจปุ่ม `<button>` ที่ไม่มี `type`, ปุ่มไอคอนที่ไม่มี `aria-label`/`title`, ลิงก์ placeholder `href="#"`/`to="#"`, handler ว่าง, ข้อความ placeholder ที่ไม่ควรหลุดขึ้น production, และ text encoding ที่เพี้ยนเป็น mojibake
- `scripts/frontend-route-audit.ts` ตรวจลิงก์/เมนู static ที่ชี้ไป route จริงใน `App.tsx` เพื่อกันเมนูที่กดแล้วตัน
- `scripts/check-frontend-bundles.ts` ล็อก bundle budget โดยเฉพาะ main bundle และหน้า Chat ที่ถูก lazy load
