# เช็กลิสต์ production

อัปเดตล่าสุด: 2026-05-26

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
- ถ้าต้องส่งผลเข้า CI/dashboard ให้ใช้ `bun scripts/deploy-status.ts --json`; กรณี root identity หรือ `/health` อ่านไม่ได้ ต้องเห็น `ok=false`, `failures`, `nextSteps`, และ `rootIdentity.ok=false`.
- รัน `bun run staging:check`.
- หลังมี staging domains แล้ว ให้รัน `bun run staging:verify` พร้อม `SMOKE_API_BASE_URL` และ `SMOKE_ADMIN_API_KEY`.
- รัน smoke ผู้ให้บริการจริงตามลำดับ.
- ตั้งค่า live verification flags ของผู้ให้บริการหลัง smoke ผ่านจริงเท่านั้น.
- รัน `bun run production:check`.
- กรอก `RELEASE_HANDOFF.md` หลัง `production:check` ผ่าน โดยไม่ใส่ secrets หรือ private database URLs และต้องใส่ `Frontend build artifact`/`Backend deploy artifact` ที่ trace ได้จริง พร้อม `Health check result`/`Ready check result` ที่ผ่านจริง และ `Rollback action` ที่ทำตามได้จริง.
- รัน `bun run release:handoff:check -- --filled` ก่อนแชร์ handoff.
- ใช้ `/admin/health` ไล่ทำ next action ของแต่ละ blocker ก่อนรัน final gate ซ้ำ.
- ยืนยัน repo-owned gate ล่าสุดด้วย `bun run qa:repo` ก่อนเริ่ม staging/live-provider รอบถัดไป; รอบล่าสุดวันที่ 2026-05-26 ผ่านหลัง decision command audit และ predeploy Markdown heading audit hardening พร้อม docs command audit 334 refs, backend tests 177 pass / 609 expects, API audit 48 backend routes + 34 frontend helper calls, frontend build และ bundle budget.

## คำสั่ง (Commands)

เช็คความมั่นใจฝั่ง local:

```bash
bun run qa:local
```

ตรวจไฟล์ environment:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env.production --frontend-env apps/frontend/.env.production
bun run deploy:status
bun scripts/deploy-status.ts --json
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

หลัง live smoke ผ่าน ให้คัด JSON `handoffEvidence` ลง `RELEASE_HANDOFF.md` โดยเก็บ `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, `Chat smoke stream walletTransactionId`, `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs`. ถ้าใช้ `api:smoke:live` แล้ว summary ยังไม่มี `handoffEvidence` ให้ถือว่าหลักฐานรวมยังไม่ครบ.

## ห้ามทำ

- ห้ามตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จาก local smoke ที่ถูก skip.
- ห้ามตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ขณะที่ image generation ยังถอยกลับเป็นภาพตัวอย่าง.
- ห้าม deploy ด้วย CORS ที่เป็น local หรือไม่ใช่ HTTPS.
- ห้ามวาง secrets ลงในไฟล์ memory.
- ห้ามวาง URL ที่มี credential/userinfo เช่น `https://user:pass@host` ลงใน release handoff หรือ memory.
- อย่าชี้ `qa:local` หรือ backend tests ที่ใช้ DB ไปยัง production data ยกเว้นตั้งใจสร้าง test record จริง.
