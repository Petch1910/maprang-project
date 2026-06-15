# แม่แบบส่งมอบ release

ใช้แม่แบบนี้หลัง `production:check` ผ่าน และก่อนเปิดให้ผู้ใช้จริงเข้า release ห้ามวาง secrets,
tokens, private database URLs, service role keys, หรือข้อมูลผู้ใช้ดิบลงในไฟล์นี้.

ตรวจแม่แบบก่อน commit:

```bash
bun run release:handoff:check
```

หลังกรอกทุกช่องสำหรับ release จริง ให้รัน:

```bash
bun run release:handoff:check -- --filled
```

## ตัวตนของ release

- วันที่ release:
- Git commit:
- Branch:
- ผู้รับผิดชอบ:
- Environment: staging / production

หมายเหตุ: เมื่อกรอก release จริง `Environment` ต้องเป็น `staging` หรือ `production` ตรง ๆ เท่านั้น เพื่อให้ gate ฝั่ง staging/production ทำงานครบ

## หลักฐาน build/deploy artifact

หมายเหตุ: ให้ใส่ค่า artifact หรือ deploy id ที่ trace ได้จริงจาก hosting/build system เช่น Vercel deployment id, Render deploy id, Docker image digest, หรือ GitHub Actions artifact/run id ห้ามใช้ `latest`, `local build`, `manual`, placeholder, หรือค่าที่ไล่ย้อนกลับไม่ได้.

- Frontend build artifact:
- Backend deploy artifact:

## ลิงก์ที่ deploy แล้ว (Deployed URLs)

หมายเหตุ: `Frontend URL` และ `Backend URL` ต้องเป็น deployed origin ล้วน เช่น `https://app.example.com` และ `https://api.example.com`; `Health URL` กับ `Ready URL` ต้องชี้ backend origin เดียวกันพร้อม path `/health` และ `/ready` โดยไม่มี query/hash.

- Frontend URL:
- Backend URL:
- Health URL:
- Ready URL:
- Health check result:
- Ready check result:

## ฐานข้อมูลและ migrations

หมายเหตุ: `Database host/provider` ให้ใส่ชื่อ provider หรือ host สรุป เช่น Supabase Postgres, Neon, Render Postgres หรือ managed Postgres เท่านั้น ห้ามวาง raw `DATABASE_URL`, localhost, SQLite, Docker/dev/test database ลงใน handoff.

- Database host/provider:
- คำสั่ง migration:
- ผล migration:
- Prisma migration version:

## ระบบ auth/storage และ CORS (Auth, Storage และ CORS)

- โหมด auth:
- Supabase project ref:
- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร:
- รูปแบบการเข้าถึงรูปตัวละคร:
- อายุ signed URL:
- CORS origins:

## การยืนยันผู้ให้บริการ AI

หมายเหตุ: ใส่ชื่อโมเดลจริงที่ใช้ใน environment นี้ และใช้คำสั่ง live smoke ที่ยิงผู้ให้บริการจริงเท่านั้น: แชทใช้ `bun run smoke:chat` หรือ `bun run api:smoke:live`; รูปใช้ `bun run smoke:image:live` หรือ `bun run api:smoke:live`. ให้คัดค่าจาก JSON `handoffEvidence` ของ smoke ที่รันจริง; ถ้าใช้ `api:smoke:live` สามารถตรวจทวนจาก field หลักฐานที่พิมพ์ในผล smoke ได้ด้วย.

- โมเดลแชท: aws-lite/claude-sonnet-4-6
- คำสั่ง live smoke แชท: bun run smoke:chat
- ผล live smoke แชท: ผ่าน
- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 1
- หมายเหตุ combined summary: ถ้าใช้ `bun run api:smoke:live`, JSON `handoffEvidence` จะปรากฏเฉพาะเมื่อหลักฐานแชทปกติ แชทสตรีม และรูปครบทุกช่อง พร้อม token/elapsedMs มากกว่า 0; ถ้าไม่มี object นี้ให้ถือว่ายังห้ามคัดหลักฐานแบบรวมลง release handoff.
- Chat smoke normal chatId: 9723814b-82cd-4f7f-9cd6-ae6870e73b38
- Chat smoke normal tokens: 9865
- Chat smoke normal walletTransactionId: 8472ff4e-2993-490e-bcb5-faf57eed17d7
- Chat smoke stream chatId: 9723814b-82cd-4f7f-9cd6-ae6870e73b38
- Chat smoke stream tokens: 10300
- Chat smoke stream walletTransactionId: 99fd1a48-97cd-4985-aa74-51ccab97c545
- โมเดลสร้างรูป: gpt-image-2-ci
- คำสั่ง live smoke รูป: bun run smoke:image:live
- ผล live smoke รูป: ผ่าน
- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 1
- Image smoke provider: configured
- Image smoke source: fallback
- Image smoke urlKind: remote-or-upload-url
- Image smoke elapsedMs: 96083

## เกต QA (QA gates)

- `bun run qa:local`:
- `bun run e2e:smoke`:
- E2E_BASE_URL:
- E2E_API_BASE_URL:
- `bun run frontend:env:test`:
- `bun run frontend:storage:test`:
- `bun run frontend:clipboard:test`:
- `bun run staging:verify`:
- `bun run production:check`:
- GitHub Production Smoke run:
- GitHub Production Smoke URL:

## การตรวจฝั่งผู้ดูแล

- `/admin/health`:
- `/admin/prompt-inspector`:
- `/admin/evals`:
- รายงาน moderation:
- audit logs ของผู้ดูแล:

## ข้อจำกัดที่ยังรู้ก่อนปล่อย

- ตัวกั้นที่ยังเปิดอยู่:
- ความเสี่ยงโควตาผู้ให้บริการ:
- งาน follow-up ที่ต้องทำมือ:
- เงื่อนไข rollback:
- Rollback action:

## การตัดสินใจปล่อย

- Go / no-go:
- ผู้อนุมัติ:
- หมายเหตุ:

หมายเหตุ: `bun run release:handoff:check -- --filled` จะผ่านเฉพาะเมื่อ `Go / no-go` เป็น `go` หลัง QA และ smoke ผ่านครบแล้วเท่านั้น
