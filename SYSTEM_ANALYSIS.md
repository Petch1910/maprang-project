# เอกสารวิเคราะห์ระบบ: Maprang AI (System Analysis)
*อัปเดตล่าสุด: 15 มิถุนายน 2026*

เอกสารนี้รวบรวมข้อมูลทางเทคนิค โครงสร้างสถาปัตยกรรม ฐานข้อมูล ระบบตรวจสอบคุณภาพ (QA) และขั้นตอนการทำงานปัจจุบันของโครงการ **Maprang AI** เพื่อใช้สื่อสารและพัฒนาต่อยอดร่วมกับทีมงานและ AI เอเจนต์ตัวอื่น ๆ

---

## 1. ผลิตภัณฑ์และเป้าหมาย (Product Goal & Overview)

**Maprang AI** คือแพลตฟอร์มสวมบทบาทตัวละคร (Roleplay AI) ภาษาไทยที่ยึดโครงสร้าง UX แบบห้องแชทแชทตัวละครเดี่ยว (Character Chat UX) แต่มีความลึกในด้านกลไกเกม (Game Layer) มากกว่าแอปแชททั่วไป ผ่านระบบหลักดังนี้:
*   **ระบบความสัมพันธ์ (Relationship System)**: มีสถานะความสัมพันธ์ เช่น `soulmate`, `friend`, `enemy` พร้อมระบบการคำนวณและอัปเดตสถานะแบบ Real-time
*   **ระบบฉากและเหตุการณ์ (Scene & Event System)**: การตรวจจับและสร้างเหตุการณ์เฉพาะหน้าระหว่างการแชท ส่งไปยัง **Events Inbox** เพื่อแจ้งเตือนและชวนให้ผู้เล่นตอบโต้
*   **ระบบความต่อเนื่องของโลก (World State / Continuity)**: บันทึกข้อมูลตำแหน่ง (Location), อารมณ์ (Mood) และบันทึกเหตุการณ์ (Scene Notes) เพื่อให้ตัวละครไม่ลืมบริบทที่คุยค้างไว้
*   **Creator Studio**: เครื่องมือสำหรับสร้างตัวละครที่มีระบบคำนวณคะแนนความพร้อม (Readiness Score) ตรวจจับ Tag คำเตือน และการทำ AI draft/ร่างรูปจำลอง (System Draft Image)

---

## 2. เทคโนโลยีที่ใช้งาน (Technology Stack)

*   **Frontend**:
    *   **React 19** & **Vite** (ใช้ `@tailwindcss/vite` และ **Tailwind CSS v4.2.4** สำหรับ Styling)
    *   **Redux Toolkit** สำหรับการจัดการ State ภายในห้องแชทและระบบ
    *   ดีไซน์เป็นแบบ **Dark-first (ธีมมืดเป็นหลัก)** โดยหน้าหลัก (Explore) และหน้าแชท (Chat Room) จะมี UI แบบไม่มีกรอบกลางครอบทับ (Immersive Shell) และไม่มีการเปลี่ยนเป็นโหมดสว่าง (Light-mode is unsupported)
*   **Backend**:
    *   **Bun Runtime** และ **Elysia.js** (API Framework ประสิทธิภาพสูงบน Bun)
    *   **Prisma ORM** เชื่อมต่อกับฐานข้อมูล **PostgreSQL**
    *   **Rate Limiting** และ **CORS** ป้องกันสิทธิ์แบบเข้มงวด
*   **การเชื่อมต่อภายนอก (Integrations)**:
    *   **OpenAI SDK / OpenRouter** สำหรับประมวลผลโมเดล AI ในการตอบแชท
    *   **Supabase Auth & Storage** ใช้สำหรับตรวจสอบสิทธิ์ผู้ใช้ และเก็บไฟล์รูปภาพตัวละคร (Storage Bucket ชื่อ `avatars` ด้วย Signed URLs)
    *   **ระบบ Local / Mock Roleplay**: ใช้โมเดลจำลอง `local/mock-roleplay` ในโหมดนักพัฒนาเพื่อทดสอบในเครื่องได้ฟรีโดยไม่ต้องใช้เครดิตของ Live Provider

---

## 3. โครงสร้างโฟลเดอร์โครงการ (Repository Structure)

โครงการนี้ใช้สถาปัตยกรรมแบบ Monorepo โดยมีโครงสร้างหลักดังนี้:

*   📂 `apps/backend/` — API Server (Elysia), Prisma config/migrations, และส่วนประมวลผลเกม/บอท
    *   📂 `prisma/` — Prisma Schema, migrations และสคริปต์สำหรับการ Seed ข้อมูล QA
*   📂 `apps/frontend/` — โค้ดของ React Client และส่วนติดต่อผู้ใช้งาน (UI)
    *   📂 `tests/` — Component และ Route Contract Tests
*   📂 `scripts/` — สคริปต์ตรวจความพร้อมของระบบ, การทำความสะอาดข้อมูล, และการทำ Security/Static Audit
*   📂 `tests/e2e/` — สคริปต์รัน Playwright Smoke tests (รองรับทั้งหน้าจอเดสก์ท็อปและโมบายล์)
*   📂 `memory/` — บันทึกความจำของโปรเจกต์ (เช่น Blocker ล่าสุด, QA Status, และ Checklist สำหรับ Deploy)
*   📂 `knowledge/` — ข้อมูลเชิงทฤษฎีและกติกาที่ใช้สำหรับ RAG context ป้อนให้ AI ตัวละคร
*   📄 `render.yaml` — Render Blueprint สำหรับการขึ้นระบบ Backend, Frontend และ Managed Postgres บน Render

---

## 4. โครงสร้างฐานข้อมูล (Database Schema - Prisma)

ฐานข้อมูลของโครงการนี้ถูกออกแบบอย่างเป็นระบบผ่านโมเดลสำคัญดังนี้:

*   **User**: เก็บข้อมูลผู้ใช้งาน สิทธิ์การเข้าถึง (`role` - `USER`/`ADMIN`), โทเคนคงเหลือ (`tokenBalance`), การตั้งค่าจำกัดเรทติ้งเนื้อหา (`contentMaxRating`) และ Persona ประจำตัวผู้เล่น
*   **Character**: ข้อมูลตัวละครทั้งหมด (ชื่อ, ภาพอวาตาร์, แท็กไลน์, ชีวประวัติ, System Prompt, และ Quality Score) เชื่อมกับแท็ก (`CharacterTag`) และ Lorebook (`LoreEntry`)
*   **Chat**: ห้องสวมบทบาทระหว่าง User และ Character โดยมีคอลัมน์สำคัญที่บันทึกข้อมูลเป็น JSON:
    *   `memory` — ความจำในแชท
    *   `sceneState` — สถานะฉากปัจจุบัน
    *   `relationshipState` — สถานะระดับความสัมพันธ์
*   **Message**: บันทึกข้อความแชททั้งหมด มีการคำนวณการใช้โทเคนค่ายใช้จ่าย และมี Index พิเศษ: `Message_chatId_deletedAt_createdAt_id_idx` เพื่อเพิ่มความเร็วในการดึงข้อมูลล่าสุดเป็นชุด (Bounded Message Window)
*   **LoreEntry**:Lorebook ของตัวละครที่รองรับโครงสร้างแบบเป็นลำดับขั้น (Hierarchy) เพื่อช่วยให้ AI นำข้อมูลบริบทเฉพาะมาเสริมระหว่างคุยแชท
*   **TokenTransaction**: ประวัติการรับส่ง/หักใช้โทเคนของผู้ใช้งาน (เช่น `CHAT_USAGE`, `ADMIN_ADJUSTMENT`, `DAILY_LOGIN`, `EXPIRY`)
*   **Report & AdminAuditLog**: ระบบ Moderation สำหรับผู้ดูแลระบบ รายงานคำเตือน/รายงานความเหมาะสมของเนื้อหาที่ Survival หลังการลบตัวละคร (ด้วย `onDelete: SetNull`)

---

## 5. ระบบตรวจสอบคุณภาพและความปลอดภัยแบบอัตโนมัติ (QA Gates & Audits)

ระบบของ Maprang AI มีประตูตรวจสอบ (Gates) ที่เข้มงวดมากเพื่อไม่ให้โค้ดเกิดบั๊กหรือเกิดการหลุดรอดของสิทธิ์ความปลอดภัย:

### 5.1 ประตูตรวจสอบที่ต้องผ่านก่อน Commit / Deploy
*   `bun run qa:repo` — ตรวจสอบคุณภาพโค้ดทั้งหมด (Static audit) โดยไม่ใช้ฐานข้อมูล
*   `bun run qa:local` — ตรวจสอบระบบด้วยฐานข้อมูลในเครื่อง (Seed QA -> Doctor -> Local Smoke -> API Smoke)
*   `bun run qa:full` — รัน `qa:local` และ Playwright E2E จากนั้นทำการ Re-seed ข้อมูลเริ่มต้นใหม่

### 5.2 การตรวจจับความปลอดภัยและ Syntax (AST Hardening)
1.  **ห้ามใช้ `as any` ในโค้ด Backend**: ระบบตรวจความปลอดภัย (`backend-security-audit`) จะสแกนโค้ดและปฏิเสธหากพบการหลบเลี่ยง TypeScript Type ด้วย `as any` เพื่อรักษาความปลอดภัยของ Types
2.  **การดึงประวัติแชทแบบจำกัด (Bounded Message Window)**: มี AST Guard สแกนโค้ดป้องกันไม่ให้ใช้ Prisma `include` หรือ `select` ไปที่ `messages` ตรง ๆ โดยไม่มีคำสั่งจำกัดจำนวน (`take`) เพื่อป้องกันปัญหาหน่วยความจำล้น (Memory Out of Memory)
3.  **ห้ามใช้ `fetch` ดิบใน Frontend**: ทุกการเชื่อมต่อ API บนหน้าบ้านจะต้องทำผ่าน Central Helper ที่ `apps/frontend/src/lib/api.ts` เท่านั้น ป้องกัน API contract แตกต่างจากฝั่งหลังบ้าน
4.  **ห้ามใส่คำว่า "เดโม" (Demo) หรือข้อมูลจำลองในฟรอนต์เอนด์**: ใช้คำที่หันหน้าเข้าหาผู้ใช้จริง เช่น "ภาพร่างระบบ" (System draft image) แทนข้อมูลตัวอย่าง

---

## 6. สิ่งกีดขวางภายนอกก่อนขึ้นระบบจริง (Staging & Production Blockers)

โครงการพร้อมสำหรับการรันแบบ Local 100% แต่การที่จะปล่อยจริง (Deploy) จำเป็นต้องเคลียร์ **6 ข้อจำกัดภายนอก (External Blockers)** ต่อไปนี้ เนื่องจากสคริปต์ตรวจสอบความพร้อม (`production:check`) จะปฏิเสธการผ่านหากตรวจไม่พบ:

1.  **Backend HTTPS URL**: ต้องติดตั้งหลังบ้านให้เป็น HTTPS และตั้งค่า `SMOKE_API_BASE_URL`
2.  **Frontend HTTPS Domain**: ต้องมีโดเมนหน้าบ้าน HTTPS และตั้งค่า `VITE_API_BASE_URL` บน Client
3.  **CORS Setup**: ต้องตั้งค่า `CORS_ORIGINS` ของ Backend ให้ชี้เฉพาะไปที่ HTTPS Domain ของหน้าบ้านจริงเท่านั้น
4.  **Supabase signed URLs**: ต้องสร้าง Supabase Storage Bucket ชื่อ `avatars` และตั้งค่าการอ่านรูปแบบ Private signed URL
5.  **Live Image Provider**: ตั้งค่า API Key ระบบสร้างรูปจริง (เช่น OpenAI/Replicate) และผ่านการทดสอบ `bun run smoke:image:live`
6.  **Live Chat Provider**: ตั้งค่า API Key ระบบแชทจริง (เช่น OpenRouter/OpenAI) และผ่านการทดสอบ `bun run smoke:chat`

---

## 7. วิธีการเริ่มต้นและรันพัฒนาระบบในเครื่อง (Local Quickstart)

หากต้องการดึงโค้ดไปรันและพัฒนาต่อบนเครื่องของคุณ ให้ทำตามลำดับขั้นดังนี้:

### Step 1: เปิดฐานข้อมูล PostgreSQL
รัน Docker Compose ในเครื่องเพื่อตั้งค่าดาต้าเบส:
```powershell
docker compose up -d
```

### Step 2: จัดทำฐานข้อมูลและโครงสร้างตาราง
```powershell
cd apps/backend
bunx prisma generate
bunx prisma migrate deploy
bun prisma/seed.ts
```

### Step 3: สตาร์ทระบบ API (Backend)
```powershell
# รันภายใต้พอร์ตเริ่มต้น 3000 หรือพอร์ตที่กำหนดใน .env
bun run dev
```

### Step 4: สตาร์ทหน้าบ้าน (Frontend)
```powershell
cd ../frontend
# ตรวจสอบว่า VITE_API_BASE_URL ตรงกับพอร์ตของ Backend
bun run dev
```

### Step 5: ทดสอบระบบทั้งหมดผ่าน QA Gate
```powershell
# ตรวจสอบคุณภาพโค้ดและความปลอดภัย
bun run qa:repo

# ทดสอบรันและเล่นจำลองผ่าน Mock Roleplay ในเครื่อง
bun run qa:full
```
