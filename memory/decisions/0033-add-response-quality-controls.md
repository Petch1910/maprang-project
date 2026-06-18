# 0033 - Add response quality controls

Date: 2026-06-18

## งาน - Status

Accepted

## งาน - Context

ผู้ใช้เก็บข้อมูลจากแพลตฟอร์ม roleplay หลายเว็บและพบ pain point สำคัญ: บอทตอบสั้นหรือตื้นเกินไปจากข้อจำกัด provider/prompt/runtime บางแบบ

การแก้ด้วยการเพิ่ม max token หรือแทรก OOC ในข้อความผู้ใช้ไม่พอ เพราะ:

- ผู้ใช้ต้องเห็นและคุมระดับคำตอบได้เอง
- backend ต้องมี contract กลางที่ prompt/runtime/test ตรวจได้
- Prompt Inspector, analytics, wallet, และ evals ต้องอ่าน metadata คุณภาพคำตอบได้
- local mode ต้องให้พฤติกรรมใกล้เคียง production โดยไม่ต้องใช้ provider จริง

## งาน - Decision

เพิ่ม Response Quality Controller เป็นชั้นกลางของ chat runtime:

- Backend service `apps/backend/src/response-quality.service.ts`
- Frontend settings contract `apps/frontend/src/lib/chatReplySettings.ts`
- Chat request fields: `modelRoute`, `replyProfile`, `responseDepth`
- UI presets ใน `/chat`: เร็ว, สมดุล, ละเอียด, ฉากเข้มข้น
- Usage metadata มี `responseQuality` เพื่อดู score, char count, depth และ notes ของรอบล่าสุด

## งาน - Consequences

- Chat quality ไม่ถูกซ่อนไว้ใน prompt ลับอย่างเดียว
- ผู้ใช้เลือกจังหวะตอบได้ก่อนส่งข้อความ
- Tests สามารถล็อกว่า reply สั้นเกินไปถูก flag และ reply ที่มี action/emotion/context/hook ได้คะแนนสูงกว่า
- งานต่อไปควรต่อยอดเป็น per-chat persisted settings, Prompt Inspector diff ที่เห็น setting change, และ browser smoke สำหรับการสลับ preset แล้วส่งข้อความจริง

## งาน - Evidence

- `bun test apps/backend/src/response-quality.service.test.ts`: 3 pass / 14 expects
- `bun run backend:check`: 343 pass / 1496 expects
- `bun run frontend:check`: pass
- `bun run frontend:static:audit`: pass
- `bun run frontend:route:audit`: 20 routes pass
- `bun run api:audit`: 80 backend routes / 56 frontend helper calls pass
