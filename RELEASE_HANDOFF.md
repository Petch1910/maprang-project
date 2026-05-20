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

## URLs ที่ deploy แล้ว

- Frontend URL:
- Backend URL:
- Health URL:
- Ready URL:

## ฐานข้อมูลและ migrations

- Database host/provider:
- คำสั่ง migration:
- ผล migration:
- Prisma migration version:

## Auth, Storage และ CORS

- โหมด auth:
- Supabase project ref:
- ผู้ให้บริการ avatar storage:
- รูปแบบการเข้าถึง avatar storage:
- อายุ signed URL:
- CORS origins:

## การยืนยันผู้ให้บริการ AI

- โมเดลแชท:
- คำสั่ง live smoke แชท:
- ผล live smoke แชท:
- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`:
- โมเดลสร้างรูป:
- คำสั่ง live smoke รูป:
- ผล live smoke รูป:
- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`:

## QA gates

- `bun run qa:local`:
- `bun run e2e:smoke`:
- `bun run staging:verify`:
- `bun run production:check`:
- GitHub Production Smoke run:

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

## การตัดสินใจปล่อย

- Go / no-go:
- ผู้อนุมัติ:
- หมายเหตุ:
