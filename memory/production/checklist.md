# เช็กลิสต์ production

อัปเดตล่าสุด: 2026-05-20

## ก่อนขึ้น production

- Deploy backend staging.
- Deploy frontend staging.
- ตั้ง backend URL จริงให้ frontend.
- ตั้ง domain frontend จริงแบบ HTTPS ใน backend CORS.
- รัน migrations กับ staging database.
- ตรวจการตั้งค่า Supabase Auth.
- ตรวจ bucket `avatars` แบบ private signed URL.
- รัน `bun run deploy:doctor -- --backend-env <backend-env> --frontend-env <frontend-env>` ก่อนชี้ smoke ไป staging.
- รัน `bun run deploy:status` เพื่อยืนยันว่า blocker และ next steps แสดงชัด.
- รัน `bun run staging:check`.
- หลังมี staging domains แล้ว ให้รัน `bun run staging:verify` พร้อม `SMOKE_API_BASE_URL` และ `SMOKE_ADMIN_API_KEY`.
- รัน smoke ผู้ให้บริการจริงตามลำดับ.
- ตั้งค่า live verification flags ของผู้ให้บริการหลัง smoke ผ่านจริงเท่านั้น.
- รัน `bun run production:check`.
- กรอก `RELEASE_HANDOFF.md` หลัง `production:check` ผ่าน โดยไม่ใส่ secrets หรือ private database URLs.
- รัน `bun run release:handoff:check -- --filled` ก่อนแชร์ handoff.
- ใช้ `/admin/health` ไล่ทำ next action ของแต่ละ blocker ก่อนรัน final gate ซ้ำ.

## Commands

เช็คความมั่นใจฝั่ง local:

```bash
bun run qa:local
```

ตรวจไฟล์ environment:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env.production --frontend-env apps/frontend/.env.production
bun run deploy:status
```

เช็คความมั่นใจฝั่ง staging:

```bash
bun run staging:check
SMOKE_API_BASE_URL=https://<backend-staging-domain> SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

ด่านสุดท้ายก่อน production:

```bash
bun run production:check
```

ตรวจผู้ให้บริการจริงแบบเจาะจุด:

```bash
bun run api:smoke:live
bun run smoke:chat
bun run smoke:image:live
```

## ห้ามทำ

- ห้ามตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จาก local smoke ที่ถูก skip.
- ห้ามตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ขณะที่ image generation ยัง fallback เป็น placeholder.
- ห้าม deploy ด้วย CORS ที่เป็น local หรือไม่ใช่ HTTPS.
- ห้ามวาง secrets ลงในไฟล์ memory.
- อย่าชี้ `qa:local` หรือ backend tests ที่ใช้ DB ไปยัง production data ยกเว้นตั้งใจสร้าง test record จริง.
