# คู่มือเอเจนต์ Maprang AI (Maprang AI Agent Guide)

Last updated: 2026-05-25

ไฟล์นี้คือคู่มือสำหรับ AI agent หรือ developer ที่มาสานต่องาน Maprang AI ใน repo นี้ ให้เริ่มจากภาพรวมเดียวกันและไม่ทำงานหลุดทิศทาง

## ภารกิจ (Mission)

Maprang AI คือแพลตฟอร์ม chat roleplay ที่หน้าตาและ flow ต้องคุ้นมือกับผู้ใช้แนว Khuiai แต่เพิ่มระบบเชิงเกมและความจำที่ลึกกว่า ได้แก่ relationship contract, scene mode, world state, creator simulator, prompt inspector, automated evals, token economy, moderation และ production readiness

เป้าหมายหลักตอนนี้คือทำให้ระบบเสถียรพอสำหรับ staging ก่อน production โดย local QA ต้องเขียวตลอด และ production blockers ต้องชัดเจนจนพลาดยาก

## สถานะปัจจุบัน (Current Status)

อ่านสถานะล่าสุดจากไฟล์เหล่านี้ก่อนลงมือทุกครั้ง:

- `memory/working-context.md`
- `memory/qa-status.md`
- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
- `DEPLOYMENT_QA.md`
- `STAGING_RUNBOOK.md`
- `PRODUCTION_SETUP.md`
- `ROUTE_MENU_AUDIT.md`
- `SECURITY_CHECKLIST.md`

สถานะล่าสุดที่ต้องจำ:

- Local QA พร้อมใช้งาน
- Backend tests ล่าสุดผ่าน 177 tests / 609 expects และ `qa:repo` ล่าสุดผ่านวันที่ 2026-05-25 หลัง API/deploy status/smoke/E2E target URL guards, readiness smoke URL redaction, release/deploy credential URL guards, production/staging CORS origin credential/path/query/hash guards, frontend env/Admin Health URL guard, frontend build, และ bundle budget
- API smoke ล่าสุดผ่าน 32 pass, 1 skip สำหรับ live chat local mode
- E2E smoke ล่าสุดผ่าน 4 tests บน desktop และ mobile
- โปรดักชันยังถูกกั้น เพราะต้องมีโดเมนสเตจจิง/ระบบหลังบ้าน/หน้าบ้านจริง, CORS จริง, การทดสอบแชทจริง และการทดสอบสร้างรูปจริง

## ทิศทางผลิตภัณฑ์ (Product Direction)

ทำ UI/UX โดยยึดหลัก:

- ผู้ใช้ต้องคุ้นมือแบบ Khuiai: Explore, Character Lobby, Chat, Create, My Chats, Profile/Persona, Wallet, Events, Moderation/Admin
- ภาษา UI หลักเป็นภาษาไทย
- Mobile-first เสมอ เพราะผู้ใช้ส่วนใหญ่เล่นบนมือถือ
- Dark mode ต้องเป็น first-class ไม่ใช่แค่สีพื้นหลังดำ
- ทุกเมนูที่กดได้ต้องมีผลลัพธ์จริง หรือ disabled พร้อมเหตุผลที่อ่านรู้เรื่อง
- Chat room ต้องลื่นที่สุด: composer ชัด, เมนูสามจุดครบ, report/edit/pin/archive/delete ใช้งานได้จริง
- Creator Studio ต้องช่วยคนสร้าง: AI draft, image draft, tag conflict warning, relationship preset, preview simulator, auto-save/draft
- Relationship และ Scene ต้องเป็นจุดขาย: เริ่มจาก sandbox, แจ้งเตือนก่อนเข้า scene, scene objective ชัด, outcome กลับมาอัปเดต timeline และ relationship state

## กฎความปลอดภัยและเนื้อหา (Safety And Content Rules)

ระบบนี้เป็น roleplay สำหรับผู้ใหญ่ได้ แต่ต้องออกแบบแบบ production-safe:

- ห้ามออกแบบ explicit sexual content สำหรับผู้ใช้ต่ำกว่า 18 ปี
- ใช้ age/content gate และ content rating ให้ชัดเจน
- เนื้อหา roleplay ต้องถูกอธิบายว่าเป็นเรื่องสมมุติหรือการจำลอง
- UGC ต้องมี report, moderation และ audit log
- ห้าม hardcode หรือ commit secret จริง เช่น API key, service role key, database password, access token
- ถ้าเจอ secret ในไฟล์ ให้หยุดแก้แบบระวังและย้ายเป็นค่าตัวอย่างหรือ env ทันที

## แผนผังสถาปัตยกรรม (Architecture Map)

Backend:

- Path: `apps/backend`
- Runtime: Bun + Elysia
- ORM/DB: Prisma + Postgres
- Auth: Supabase JWT ใน production, local fallback เฉพาะ dev/test
- Storage: Supabase Storage signed URL สำหรับ production avatar
- AI chat: OpenRouter-compatible provider
- Image generation: ผู้ให้บริการรูปภาพที่ตั้งค่าไว้ หรือภาพตัวอย่างสำรองเฉพาะ local/dev

Frontend:

- Path: `apps/frontend`
- Runtime: React + Vite + TypeScript
- Styling: existing app styles/components; รักษาธีมเดียวกันทั้งเว็บ
- E2E: Playwright via `bun run e2e:smoke`

Knowledge and memory:

- `memory/` เก็บสถานะงาน, decisions, QA, blockers
- `knowledge/` เก็บ structured rules/wiki สำหรับ runtime context
- `evals/` เก็บ deterministic prompt/context evals

## ระบบหลักที่ต้องปกป้อง (Core Systems To Protect)

Relationship Engine:

- Expanded ladder: enemy, disliked, rival, bickering-rival, acquaintance, friend, close-friend, ride-or-die, crush, friend-crush, dating-trial, talking-stage, partner, toxic-partner, lover, life-partner, spouse, toxic-spouse, soulmate
- `contract` surface ใช้กับ Character Lobby relationship contract
- `creator` surface ใช้กับ Creator Studio tag presets
- Creator-only presets เช่น `safe-family-bond` ห้ามหลุดไปใน lobby contract แต่ต้องยังอยู่ใน Creator Studio

Scene Runtime:

- Default mode คือ sandbox
- Event ต้องแจ้งก่อนเข้า scene
- Scene ต้องมี objective และ exit/outcome
- Outcome ต้องกระทบ relationship timeline, momentum, cooldown

Prompt/Context Engine:

- Prompt assembler ต้องแยก section ชัดเจน
- Prompt Inspector ต้องแสดง final prompt แบบ redacted, token estimate, lore/context และ diff
- Evals ต้องจับ regression ของ prompt ordering, relationship continuity, scene continuity และ prompt injection guard
- ห้ามทำให้ model เห็น secret หรือ raw hidden control ที่ไม่ควรเห็น

Security:

- ป้องกัน SQL injection ด้วย Prisma/validated IDs
- Broken access control ต้องถูกทดสอบทุก route สำคัญ
- Production auth ต้องไม่เชื่อ spoofed user id
- Admin action ต้องมี audit log
- Rate limit ต้องแยก read navigation กับ expensive chat generation

## วงจรทำงาน (Work Loop)

ทุกครั้งที่เริ่มงาน:

1. รัน `git status --short`
2. อ่าน `memory/working-context.md` และ `memory/qa-status.md`
3. หา scope ที่เล็กพอจะปิดได้จริง
4. แก้แบบไม่ย้อนงานของคนอื่น
5. รัน test/gate ที่ตรงกับงาน
6. อัปเดต memory/knowledge/docs ถ้าสถานะเปลี่ยน
7. commit และ push เมื่อเป็นก้อนงานที่สมบูรณ์

ห้ามทำ:

- ห้าม `git reset --hard` หรือ revert งานคนอื่นถ้าไม่ได้รับคำสั่งชัดเจน
- ห้ามเขียนไฟล์ด้วยวิธี shell redirect ถ้าเป็น manual edit ให้ใช้ patch
- ห้ามเพิ่ม abstraction ใหญ่ถ้ายังไม่มีเหตุจำเป็น
- ห้ามปล่อยปุ่ม/เมนูหลอกที่กดแล้วไม่มีผล
- ห้ามทำ UI แยกธีมคนละทางกับหน้าที่มีอยู่

## คำสั่ง QA (QA Commands)

ใช้ตามระดับความเสี่ยง:

```bash
bun run backend:check
bun run frontend:check
bun run api:smoke
bun run e2e:smoke
bun run qa:repo
bun run qa:local
bun run qa:full
bun run predeploy:check
bun run memory:audit
bun run knowledge:audit
bun run eval:local
bun run security:audit
bun run import-cycle:audit
git diff --check
```

`qa:repo` คือ deterministic repo-owned gate ที่ไม่ต้องมี runtime service; `qa:local` เรียก `qa:repo` ก่อน แล้วค่อยต่อ smoke runtime ที่ต้องมี backend/Postgres จริง.

ก่อน production/staging:

```bash
bun run staging:check
SMOKE_API_BASE_URL=https://<backend-staging-domain> SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
bun run production:check
```

Live provider smoke ใช้เมื่อพร้อมใช้เงินจริง/เครดิตจริงเท่านั้น:

```bash
bun run api:smoke:live
bun run smoke:chat
bun run smoke:image:live
```

## ตัวกั้น production (Production Blockers)

อย่า mark production ready จนกว่าสิ่งเหล่านี้ผ่านจริง:

- `DATABASE_URL` เป็น production/staging Postgres จริง พร้อม `sslmode=require`
- Backend URL เป็น deployed HTTPS URL จริง ไม่ใช่ localhost/loopback หรือ `http://`
- Frontend `VITE_API_BASE_URL` ชี้ backend จริง
- `CORS_ORIGINS` เป็น frontend HTTPS origin จริง ไม่รวม localhost/loopback, `http://`, wildcard, credential/userinfo, path/query/hash, หรือ backend URL ใน staging/production
- Supabase project จริงพร้อม bucket `avatars` แบบ private + signed URL
- `SUPABASE_STORAGE_ACCESS=signed`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` หลังการทดสอบแชทจริงผ่าน
- `IMAGE_GENERATION_LIVE_VERIFIED=1` หลังการทดสอบสร้างรูปจริงผ่าน
- Admin API smoke และ audit log ผ่าน

## เงื่อนไขว่างานเสร็จ (Definition Of Done)

งานหนึ่งก้อนถือว่าเสร็จเมื่อ:

- ฟีเจอร์ทำงานจริงทั้ง UI/API หรือมี guard/disabled reason ชัดเจน
- ไม่มี console error หรือ route พังใน flow ที่เกี่ยวข้อง
- API มี validation และ access control ที่เหมาะสม
- มี automated test/smoke เท่ากับความเสี่ยงของงาน
- เอกสาร/memory/knowledge อัปเดตถ้างานเปลี่ยนสถานะระบบ
- `git status --short` สะอาดหลัง commit ถ้าผู้ใช้ต้องการ push หรือเป็นงานจบก้อน

## จุดเริ่มต้นเอเจนต์ถัดไป (Next Agent Starting Point)

ถ้าผู้ใช้บอกว่า "ทำต่อ" ให้เริ่มจาก:

1. ดู `memory/working-context.md`
2. ดู `memory/deploy-blockers.md`
3. รัน gate ที่เร็วที่สุดเพื่อยืนยันฐาน เช่น `bun run predeploy:check`
4. เลือกหนึ่ง blocker หรือหนึ่ง UX/API gap ที่ปิดได้จริง
5. ทำจนผ่าน test แล้วสรุปเป็นภาษาไทยสั้นๆ
