# แม่แบบส่งมอบ release

ใช้ไฟล์นี้เป็นหลักฐานส่งมอบก่อนปล่อย staging/production จริง ห้ามวาง secrets, tokens, raw
database URLs, service role keys, หรือข้อมูลผู้ใช้ดิบลงในไฟล์นี้.

ตรวจแม่แบบ:

```bash
bun run release:handoff:check
```

ตรวจแบบกรอกครบสำหรับ release จริง:

```bash
bun run release:handoff:check -- --filled
```

## ตัวตนของ release

- วันที่ release: 2026-06-17
- Git commit: pending-local-worktree
- Branch: main
- ผู้รับผิดชอบ: Codex
- Environment: staging

## หลักฐาน build/deploy artifact

- Frontend build artifact: local-vite-preview-20260617-ngrok
- Backend deploy artifact: local-backend-3001-ngrok-proxy-20260617

หมายเหตุ: artifact ด้านบนเป็นหลักฐาน temporary Ngrok staging เท่านั้น ยังไม่ใช่ deploy id จาก
Render/Railway/Fly/Vercel หรือ production hosting จริง.

## ลิงก์ที่ deploy แล้ว (Deployed URLs)

หมายเหตุสำหรับ release จริง: `Frontend URL` และ `Backend URL` ต้องเป็น deployed origin ล้วน เช่น `https://app.example.com` และ `https://api.example.com`; `Health URL` กับ `Ready URL` ต้องชี้ backend origin เดียวกันพร้อม path `/health` และ `/ready` โดยไม่มี query/hash.

- Frontend URL: https://subplot-unworthy-exorcist.ngrok-free.dev
- Backend URL: https://subplot-unworthy-exorcist.ngrok-free.dev
- Health URL: https://subplot-unworthy-exorcist.ngrok-free.dev/health
- Ready URL: https://subplot-unworthy-exorcist.ngrok-free.dev/ready
- Health check result: pass
- Ready check result: pass

หมายเหตุ: ตอนนี้ใช้ single-origin Ngrok proxy ไปยัง frontend preview และ backend local server
ไม่ใช่ permanent HTTPS domain.

## ฐานข้อมูลและ migrations

- Database host/provider: local PostgreSQL behind Ngrok staging smoke
- คำสั่ง migration: bunx prisma migrate deploy
- ผล migration: not-run-on-managed-production
- Prisma migration version: 20260617212000_add_user_provider_key_vault

## ระบบ auth/storage และ CORS (Auth, Storage และ CORS)

- โหมด auth: supabase-jwt
- Supabase project ref: configured-env-redacted
- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร: supabase
- รูปแบบการเข้าถึงรูปตัวละคร: signed
- อายุ signed URL: 3600
- CORS origins: https://subplot-unworthy-exorcist.ngrok-free.dev

## การยืนยันผู้ให้บริการ AI

หมายเหตุ combined summary: ถ้าใช้ `bun run api:smoke:live`, JSON `handoffEvidence` จะปรากฏเฉพาะเมื่อหลักฐานแชทปกติ แชทสตรีม และรูปครบทุกช่อง พร้อม token/elapsedMs มากกว่า 0; ถ้าไม่มี object นี้ให้ถือว่ายังห้ามคัดหลักฐานแบบรวมลง release handoff.

- โมเดลแชท: aws-lite/claude-sonnet-4-6
- คำสั่ง live smoke แชท: bun run smoke:chat / bun run production:check
- ผล live smoke แชท: pass
- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 1
- Chat smoke normal chatId: 4e85b8c6-1a3f-4826-ba19-56e6afcca19a
- Chat smoke normal tokens: 18349
- Chat smoke normal walletTransactionId: 1a8ec390-c3e7-4779-a3c9-04927eb23da2
- Chat smoke stream chatId: 4e85b8c6-1a3f-4826-ba19-56e6afcca19a
- Chat smoke stream tokens: 9369
- Chat smoke stream walletTransactionId: b7a90e24-a6ea-4fd6-98b0-3322a3efde3c
- โมเดลสร้างรูป: gpt-image-2-ci
- คำสั่ง live smoke รูป: bun run smoke:image:live / bun run production:check
- ผล live smoke รูป: fail
- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 0
- Image smoke provider: configured
- Image smoke source: fallback
- Image smoke urlKind: remote-or-upload-url
- Image smoke elapsedMs: 103206

หมายเหตุ: `smoke:image:live` เคยผ่านแบบมี warning จาก text draft fallback แต่
`production:check` ล่าสุดยัง fail เพราะ `/creator/ai-draft` ได้ provider timeout/524 และ
`--require-live-image` ไม่ยอมรับ fallback เป็นหลักฐาน release.

## เกต QA (QA gates)

- `bun run qa:local`: pass
- `bun run e2e:smoke`: pass
- E2E_BASE_URL: https://subplot-unworthy-exorcist.ngrok-free.dev
- E2E_API_BASE_URL: https://subplot-unworthy-exorcist.ngrok-free.dev
- `bun run frontend:env:test`: pass
- `bun run frontend:storage:test`: pass
- `bun run frontend:clipboard:test`: pass
- `bun run staging:verify`: pass
- `bun run production:check`: fail
- GitHub Production Smoke run: not-run
- GitHub Production Smoke URL: not-run

## การตรวจฝั่งผู้ดูแล

- `/admin/health`: pass
- `/admin/prompt-inspector`: pass
- `/admin/evals`: pass
- รายงาน moderation: pass
- audit logs ของผู้ดูแล: pass

## ข้อจำกัดที่ยังรู้ก่อนปล่อย

- ตัวกั้นที่ยังเปิดอยู่: live image provider ยังไม่ผ่าน combined production gate; permanent cloud deploy ยังไม่มี traceable deploy id/domain
- ความเสี่ยงโควตาผู้ให้บริการ: กลางถึงสูง เพราะ image provider ตอบ 524 และ text model ตอบ 503 timeout ในรอบล่าสุด
- งาน follow-up ที่ต้องทำมือ: deploy backend/frontend ไปยัง hosting จริง, ตั้ง CORS origin จริง, rerun production smoke, แล้วกรอก traceable artifact/deploy ids
- เงื่อนไข rollback: หาก provider live smoke fail หรือ endpoint staging/prod ตอบไม่ครบ health/ready/API smoke ให้ no-go และคง local/Ngrok staging เท่านั้น
- Rollback action: ปิด promotion, กลับไปใช้ local/mock-roleplay สำหรับ local server, และ rerun `bun run qa:full` ก่อนลอง deploy ใหม่

## การตัดสินใจปล่อย

- Go / no-go: no-go
- ผู้อนุมัติ: pending
- หมายเหตุ: Ngrok staging ผ่านหลาย gate แล้ว แต่ production ยังไม่ผ่านเพราะ live image provider และยังไม่มี permanent deployed domains/artifacts
