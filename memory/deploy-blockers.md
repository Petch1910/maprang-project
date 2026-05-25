# ตัวกั้นก่อน deploy

อัปเดตล่าสุด: 2026-05-25

## ตัวกั้นที่ยังเปิดอยู่

### URL ของระบบหลังบ้านและหน้าบ้าน

สถานะ: ยังติดอยู่จนกว่าจะมี hosting สำหรับสเตจจิง/โปรดักชันจริง

ปัญหาปัจจุบัน:
- smoke environment ยังชี้ไปที่ URL local ของ backend/frontend.
- ตรวจ runtime ล่าสุด 2026-05-21: `docker ps` ติดต่อ Docker Desktop ไม่ได้ และ `bun run deploy:status` ล้มที่ backend root preflight เพราะ `http://127.0.0.1:3000` ยังไม่ตอบ.
- smoke doctor รอบ local ล่าสุดรายงานตัวกั้น staging 2 ข้อ: backend URL ยังเป็น local และ `CORS_ORIGINS` ว่าง, เป็น local, หรือไม่ใช่ HTTPS พร้อมคำแนะนำขั้นถัดไปแบบ Thai-first ใน CLI.
- เมื่อ backend local หรือ staging ตอบได้ `bun run deploy:status` จะแสดงตัวกั้นชุดเดียวกันพร้อมลำดับขั้นถัดไป; ถ้า backend ยังไม่รัน คำสั่งจะ fail ที่ root identity preflight ก่อนอ่าน readiness และ `--json` จะคืน `ok=false`, `failures`, `nextSteps`, และ `rootIdentity.ok=false` เพื่อให้ automation อ่านต่อได้

สิ่งที่ต้องทำ:
- ตั้ง URL backend ที่ deploy แล้วให้ `SMOKE_API_BASE_URL`.
- ตั้ง URL backend ที่ deploy แล้วให้ frontend `VITE_API_BASE_URL`.
- ตั้ง domain frontend จริงแบบ HTTPS ใน backend `CORS_ORIGINS`.
- หลังมี staging domains แล้ว ให้รัน `bun run staging:verify` พร้อม `SMOKE_API_BASE_URL` และ `SMOKE_ADMIN_API_KEY`.

guard ใน repo:
- `DEPLOY_RENDER.md` ระบุ placeholder ของ Render backend/frontend แบบ HTTPS-only และห้ามใช้ localhost/loopback, `http://`, wildcard origins, credential/userinfo, path/query/hash, หรือ backend URL ใน `CORS_ORIGINS`; `bun run predeploy:check` คุม wording ชุดนี้ไว้แล้ว
- GitHub Production Smoke และ `smoke-doctor --strict-*` ใช้ guard เดียวกันให้ `SMOKE_API_BASE_URL` ต้องเป็น backend origin ที่ deploy แล้วแบบ `https` เท่านั้น และปฏิเสธ localhost/loopback, credential/userinfo, path/query/hash ก่อนถึง provider-credit smoke
- `deploy:status` จะหยุดก่อน root identity preflight เมื่อ `SMOKE_API_BASE_URL` ที่ไม่ใช่ local มีรูปแบบไม่ปลอดภัย และจะ redact credential/userinfo ใน failure JSON
- `smoke:ready` redacts credential/userinfo ใน diagnostics ของ `/ready` และ root identity fetch failures เพื่อไม่ให้ URL ที่ตั้งผิดรั่วใน log
- `api:smoke` แบบเรียกตรงจะใช้ smoke target guard เดียวกันก่อน network/provider work และคืน summary ที่ redact credential/userinfo แล้ว
- `e2e:smoke` validates `E2E_BASE_URL` และ `E2E_API_BASE_URL` ก่อน Playwright เริ่มทำงาน: local dev ใช้ loopback `http://127.0.0.1` ได้ แต่ staging/production ต้องเป็น HTTPS origin และห้ามมี credential/userinfo หรือ path/query/hash
- Playwright e2e config จะ start backend/frontend dev server เฉพาะ target ที่เป็น local loopback เท่านั้น; ถ้า `E2E_BASE_URL`/`E2E_API_BASE_URL` เป็น deployed HTTPS origins จะใช้ staging ที่ deploy แล้วโดยตรง
- `runE2eSmoke` ส่ง env ชุดเดียวกับที่ validate แล้วเข้า seed/Playwright/restore runner steps เพื่อให้ automation ที่ import runner ไม่ตรวจ URL ชุดหนึ่งแต่รันอีกชุดหนึ่ง
- `RELEASE_HANDOFF.md` ต้องบันทึก `E2E_BASE_URL`/`E2E_API_BASE_URL` ที่ใช้รัน browser smoke; production filled handoff จะ fail ถ้าค่าเหล่านี้ไม่ใช่ deployed origins เดียวกับ Frontend/Backend URL
- `RELEASE_HANDOFF.md` filled mode จะ fail ถ้า `Frontend URL`/`Backend URL` ไม่ใช่ deployed origins ล้วน หรือถ้า `Health URL`/`Ready URL` ไม่ชี้ backend origin เดียวกันที่ `/health` และ `/ready` โดยไม่มี query/hash

### การยืนยัน live chat provider

สถานะ: ยังต้องยืนยันกับ staging

ปัญหาปัจจุบัน:
- การทดสอบแชทจริงเคยได้คำตอบจริงจากโมเดล พร้อมข้อมูลโทเคนที่ใช้และ wallet debit แล้วหนึ่งรอบ
- การทดสอบแชทจริงรอบถัดมาวิ่งเข้าทาง provider failure
- provider failure ถูกจัดประเภทเป็น `usage.providerFailure` แล้ว แต่เส้นทาง live provider ยังต้องผ่าน staging smoke แบบสะอาดก่อน production
- smoke doctor รอบ local ล่าสุดยังรายงาน `chatStatus=needs_live_smoke` และ `chatLiveVerified=false`

สิ่งที่ต้องทำ:
- รัน `bun run smoke:chat` หรือ `bun run api:smoke:live` กับ staging.
- ยืนยันว่ามีคำตอบจริงจากโมเดล, `chatId`, ข้อมูลโทเคนที่ใช้, และรายการ wallet ชนิด `CHAT_USAGE` ที่ตรงกัน
- ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` เฉพาะ environment นั้นหลัง smoke ผ่านจริงเท่านั้น

### การยืนยัน live image provider

สถานะ: ติดบัญชี/โควตาของ provider

ปัญหาปัจจุบัน:
- `bun run smoke:image:live` ถอยกลับเป็นภาพตัวอย่าง เพราะผู้ให้บริการสร้างรูปรายงาน billing hard limit
- smoke doctor รอบ local ล่าสุดยังรายงาน `imageStatus=needs_live_smoke` และ `imageLiveVerified=false`

สิ่งที่ต้องทำ:
- เพิ่มหรือรีเซ็ตวงเงิน/โควตาของผู้ให้บริการสร้างรูป.
- รัน `bun run smoke:image:live` หรือ `bun run api:smoke:live` อีกครั้ง.
- ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` เฉพาะหลังผู้ให้บริการสร้างรูปคืนค่า `configured`.

## สิ่งที่ไม่ใช่ตัวกั้นตอนนี้

- Repo-owned static/unit/build gate ล่าสุดผ่าน `bun run qa:repo` วันที่ 2026-05-25 หลัง API/deploy status/smoke target URL guards, readiness smoke URL redaction, release/deploy credential URL guards, production/staging CORS origin credential/path/query/hash guards, frontend env/Admin Health URL guard, diagnostic wording hardening, และ full deterministic QA refresh; blocker ที่เหลือยังเป็น environment/staging/live-provider จริง.
- backend test suite ฝั่ง local ผ่านแล้ว: 177 pass, 0 fail, 609 expect calls.
- Local API smoke ผ่านแล้ว
- Frontend build และ bundle budget ผ่านแล้ว
- Desktop/mobile e2e smoke ผ่านแล้ว
- Supabase signed URL สำหรับพื้นที่เก็บรูปตัวละคร implement แล้ว และถูกตรวจโดย production gate
- Relationship contract presets แยกจาก creator presets แล้ว และมี API smoke ครอบไว้
