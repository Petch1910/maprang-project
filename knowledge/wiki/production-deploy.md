# การ deploy production

production readiness ต้องมี infrastructure จริงและ live provider verification จริง ไม่ใช่แค่ตั้งค่า env ครบ

## ปรัชญาของ gate

ค่าที่ถูกใส่ใน env ยังไม่พอ เพราะ key ของผู้ให้บริการอาจยังล้มจากโควตา, rate limit, billing, สิทธิ์ model, หรือ network restrictions ได้

## Gates ที่ต้องผ่าน

- URL backend จริง.
- URL frontend จริง.
- CORS ของ production.
- Supabase JWT auth.
- bucket `avatars` แบบ private signed URL.
- งบคำตอบ roleplay สำหรับ production อย่างน้อย `MODEL_MAX_OUTPUT_TOKENS=1200` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`.
- งบคำตอบ roleplay ที่แนะนำควรใกล้ `MODEL_MAX_OUTPUT_TOKENS=1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`.
- smoke ผู้ให้บริการแชทจริง.
- smoke ผู้ให้บริการสร้างรูปจริง.
- ตรวจ `deploy:status` output ว่า blocker counts และ next steps ชัดเจน.
- `staging:verify` ผ่านกับ backend staging ที่ deploy แล้ว.
- `production:check` ผ่าน.

## ลำดับ gate

1. รัน local `qa:local`.
2. ตรวจ env files ด้วย `deploy:doctor`.
3. ตรวจ shared readiness output ด้วย `deploy:status`.
4. รัน `staging:verify` กับ real staging backend URL.
5. รัน smoke ผู้ให้บริการจริงหลัง staging infra, CORS, auth, storage, และ wallet พร้อมแล้วเท่านั้น.
6. ตั้ง live verification flags เฉพาะ environment เป้าหมายหลัง live smoke ผ่านจริง.
7. รัน `production:check` และกรอก `RELEASE_HANDOFF.md`.

memory ที่เกี่ยวข้อง:

- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
