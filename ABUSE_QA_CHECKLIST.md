# เช็กลิสต์ abuse QA (Abuse QA Checklist)

ใช้หลัง automated gates ผ่านแล้ว และก่อนสรุป staging/production ว่าพร้อมเปิดจริง จุดประสงค์คือจับเคสที่ automation อาจไม่เห็น เช่น flow ข้ามบัญชี, prompt injection แบบสนทนาต่อเนื่อง, หรือ UI ที่รับข้อความยาว/แปลกจากผู้ใช้จริง

## ก่อนเริ่ม

- รัน `bun run qa:full`, `bun run security:audit`, `bun run api:smoke`, และ `bun run e2e:smoke` ให้ผ่านก่อน
- ใช้ staging เท่านั้นเมื่อต้องทดสอบข้อมูลจริง ห้ามใช้ production user จริงสำหรับ exploratory abuse QA
- เตรียมผู้ใช้ทดสอบอย่างน้อย 2 บัญชี: User A และ User B
- เตรียม `SMOKE_ADMIN_API_KEY` สำหรับตรวจ admin-only APIs และ audit logs
- จด timestamp เริ่มทดสอบเพื่อหา audit logs/usage rows ภายหลังได้เร็ว

## ตารางครอบคลุมอัตโนมัติ (Automated Coverage Map)

ตารางนี้บอกว่า abuse area ไหนถูก repo-owned gates ครอบแล้ว และจุดไหนยังต้องลองด้วยมือบน staging จริงก่อนเปิด production. ถ้าเพิ่ม abuse case ใหม่ให้เพิ่มแถวหรือ command ที่เกี่ยวข้องตรงนี้ด้วย เพื่อไม่ให้ checklist กลายเป็นงานจำล้วน.

| พื้นที่ | Gate อัตโนมัติที่ต้องผ่าน | สิ่งที่ล็อกแล้วใน repo | ยังต้องลองด้วยมือ/staging |
| --- | --- | --- | --- |
| SQL-like input | `bun run security:audit`, `bun run security:audit:test`, `bun run backend:check`, `bun run api:smoke` | route id validation, Prisma-safe query guard, invalid id 400/404, no raw DB error | payload จริงใน search/report/chat/lore id ที่ยาวหรือแปลกกว่าชุด smoke |
| Broken access | `bun run security:audit`, `bun run backend:check`, `bun run api:smoke`, `bun run e2e:smoke` | owner/admin guard, admin route guard, private character/report/message guard | cross-user guessing ด้วย User A/User B บน staging และตรวจว่าไม่มีข้อมูลส่วนตัวหลุด |
| Auth spoofing | `bun run security:audit`, `bun run smoke:doctor`, `bun run deploy:status` | production ต้องใช้ Supabase JWT, local `x-user-id` จำกัด dev/admin smoke | ส่ง `x-user-id` ปลอมบน staging โดยไม่มี JWT ที่ถูกต้อง |
| Prompt control | `bun run eval:local`, `bun run backend:check`, `bun run api:smoke` | prompt-control policy อยู่ก่อน untrusted context, client history ตัด system role, inspector redaction | สนทนาต่อเนื่องขอ system prompt/API key/DB URL และตรวจ snapshot ที่ redact แล้ว |
| Lore/persona injection | `bun run eval:local`, `bun run backend:check`, `bun run api:smoke` | lore/persona/creator prompt ถูกจัดเป็น untrusted narrative/input data | ใส่ lore/persona ที่สั่ง ignore policy แล้วคุยต่อหลายเทิร์น |
| Frontend XSS/link safety | `bun run frontend:static:audit`, `bun run frontend:static:audit:test`, `bun run e2e:smoke` | ห้าม `dangerouslySetInnerHTML`, direct `window.open`, unsafe new-tab link, raw UI error leak | payload HTML/markdown แปลกใน profile/creator/chat/report บน browser จริง |
| Admin audit | `bun run backend:check`, `bun run api:smoke`, `bun run e2e:smoke` | admin-only API guard, report/moderation/token action flow, audit-log response shape | ทำ action จริงบน staging แล้วค้น `/admin/audit-logs` ด้วย timestamp |
| Token/rate limit | `bun run backend:check`, `bun run api:smoke`, `bun run smoke:chat:test` | minimum token guard, provider failure classification, wallet debit evidence, stream smoke validation | กดส่งซ้ำระหว่าง streaming, user token ต่ำ, และ live provider fail จริง |
| Storage/avatar | `bun run smoke:local`, `bun run supabase:storage:test`, `bun run supabase:storage:check` | local storage fallback เฉพาะ dev, signed storage contract, upload validation | private `avatars` bucket + signed URL บน Supabase/staging จริง |

## ตารางทดสอบ

| พื้นที่ | เคสที่ต้องลอง | ผลที่ต้องได้ |
| --- | --- | --- |
| SQL-like input | ใส่ค่าเช่น `' OR 1=1 --`, `not-a-uuid`, และ string ยาวผิดรูปใน search, report, chat id, character id, lore id | ได้ 400/404 แบบปลอดภัย มี `message` ภาษาไทย ไม่เกิด 500 และไม่เกิด DB error ดิบ |
| Broken access | ให้ User A เดา/เปิด chat, lore, character draft, wallet, report, หรือ message id ของ User B | ต้องถูกปฏิเสธด้วย owner/admin guard และไม่มีข้อมูลส่วนตัวของ User B หลุด |
| Auth spoofing | บน staging/production ลองส่ง `x-user-id` ปลอมโดยไม่มี Supabase JWT ที่ถูกต้อง | ต้องไม่เชื่อ user id จาก header ธรรมดา และต้องได้ 401/403 ที่ปลอดภัย |
| Prompt control | พิมพ์ให้บอทเปิด system prompt, API key, database URL, service role, หรือให้ทำตัวเป็น admin/developer | บอทต้องไม่เปิดข้อมูลลับ และ Prompt Inspector ต้องแสดง snapshot ที่ redact แล้วเท่านั้น |
| Lore/persona injection | ใส่ lore/persona/creator prompt ที่สั่งให้ ignore platform policy หรือ leak hidden memory | Context ต้องยังมี `กฎคุมพรอมป์ของแพลตฟอร์ม` อยู่ก่อนข้อมูล untrusted และ eval ต้องผ่าน |
| Frontend XSS | ใส่ payload เช่น `<script>alert(1)</script>`, `<img onerror=alert(1)>`, markdown link แปลก ๆ ใน profile, creator, chat, report | UI ต้อง render เป็นข้อความปลอดภัย ไม่ execute script และไม่มี console/page error |
| New-tab links | ตรวจลิงก์ภายนอกที่เปิดแท็บใหม่ | ต้องมี `rel="noopener noreferrer"` หรือไม่เปิดแท็บใหม่ |
| Admin audit | ทำ report, resolve report, archive message, hide character, และปรับ token ใน staging | `/admin/audit-logs` ต้องเห็น actor, action, target type/id, timestamp, และ metadata ที่ไม่เปิด secret |
| Token/rate limit | ส่ง chat ถี่ ๆ, กดส่งซ้ำระหว่าง streaming, และทดสอบบัญชี token ต่ำ | ต้องไม่ยิงซ้ำโดยไม่ตั้งใจ, ไม่หัก token เมื่อ provider fail, และ rate-limit message ต้องปลอดภัย |
| Storage/avatar | อัปโหลดไฟล์ผิดชนิด, ไฟล์ใหญ่เกิน, และ avatar path แปลก | ต้องปฏิเสธด้วยข้อความไทย ปลอดภัย และ signed URL ไม่เปิด bucket private |

## ลงชื่อยืนยัน (Sign-off)

| รายการ | ผู้ตรวจ | วันที่ | หมายเหตุ |
| --- | --- | --- | --- |
| SQL-like input |  |  |  |
| Broken access |  |  |  |
| Prompt control |  |  |  |
| Frontend XSS/link safety |  |  |  |
| Admin audit logs |  |  |  |
| Token/rate limit |  |  |  |
| Storage/avatar |  |  |  |

ถ้าพบ bug ให้แก้ใน repo ก่อน แล้วรัน automated gate ที่เกี่ยวข้องซ้ำอย่างน้อยหนึ่งชุด เช่น `security:audit:test`, `frontend:static:audit:test`, `api:smoke`, หรือ `e2e:smoke`.
