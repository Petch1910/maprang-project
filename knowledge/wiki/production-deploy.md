# Production Deploy

production readiness ต้องมี infrastructure จริงและ live provider verification จริง ไม่ใช่แค่ตั้งค่า env ครบ

## ปรัชญาของ gate

ค่าที่ถูกใส่ใน env ยังไม่พอ เพราะ provider keys อาจยัง fail จาก quota, rate limits, billing, model access, หรือ network restrictions ได้

## Gates ที่ต้องผ่าน

- Real backend URL.
- Real frontend URL.
- Production CORS.
- Supabase JWT auth.
- Private signed `avatars` bucket.
- Production roleplay reply budget อย่างน้อย `MODEL_MAX_OUTPUT_TOKENS=1200` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`.
- Recommended roleplay reply budget ใกล้ `MODEL_MAX_OUTPUT_TOKENS=1600` และ `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`.
- Live chat provider smoke.
- Live image provider smoke.
- ตรวจ `deploy:status` output ว่า blocker counts และ next steps ชัดเจน.
- `staging:verify` ผ่านกับ deployed staging backend.
- `production:check` ผ่าน.

## ลำดับ gate

1. รัน local `qa:local`.
2. ตรวจ env files ด้วย `deploy:doctor`.
3. ตรวจ shared readiness output ด้วย `deploy:status`.
4. รัน `staging:verify` กับ real staging backend URL.
5. รัน live provider smoke หลัง staging infra, CORS, auth, storage, และ wallet พร้อมแล้วเท่านั้น.
6. ตั้ง live verification flags เฉพาะ target environment หลัง live smoke ผ่านจริง.
7. รัน `production:check` และกรอก `RELEASE_HANDOFF.md`.

memory ที่เกี่ยวข้อง:

- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
