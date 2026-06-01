# เช็กลิสต์ production

อัปเดตล่าสุด: 2026-06-01

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
- ยืนยัน repo-owned gate ล่าสุดด้วย `bun run qa:repo`; รอบ 2026-05-31 ผ่านหลัง Promise executor raw reject guard ทั้งแบบ arrow/function/optional-call/call-apply-bind/Reflect.apply/globalThis-window-Reflect.apply/bracket-Reflect-apply/parenthesized-Reflect-apply/Reflect-apply-alias/destructured-Reflect-apply-alias/reject-callback-alias/reject-callback-alias-forwarding/typed-alias-declaration, global/window Promise reject guard, reflected `Reflect.apply(Promise.reject, ..., [error])` guard, retrieved `Reflect.get(Promise, "reject")` / descriptor value guard รวม namespace/computed Reflect/Object access, method-forwarded Promise reject guard, Promise reject typed-alias guard, Promise reject typed-destructured guard, typed console alias guard, typed-destructured console alias guard, optional-chained/bracket-notation Promise reject guard, Reflect.apply retrieved-target guard, frontend raw UI Promise rejection guard, และ backend raw route Promise rejection guard โดย docs command audit อยู่ที่ 349 refs, backend tests ยังอยู่ที่ 178 pass / 611 expects และ frontend build/bundle budget ผ่าน.
- 2026-06-01: Frontend/backend raw error log guards now reject parenthesized Reflect.get/Object.getOwnPropertyDescriptor retrieval for console error/warn and Promise.reject targets. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- 2026-06-01: Frontend/backend raw error log guards now reject namespace, computed, and parenthesized Reflect/Object forwarding for console error/warn retrieval targets, including globalThis/window Reflect get/apply and Object descriptor-value forms. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- 2026-06-01: Frontend/backend raw error log and Promise rejection guards now reject `.call`/`.apply`/`.bind` forwarding of Reflect.get/Object.getOwnPropertyDescriptor retrieval for console error/warn and Promise.reject targets. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- 2026-06-01: Frontend/backend static/security audits now reject aliases of Reflect.get/Object.getOwnPropertyDescriptor themselves, including typed, assigned, and destructured alias forms. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- 2026-06-01: Frontend/backend static/security audits now reject aliases of Reflect.apply itself, including typed, assigned, and destructured alias forms. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- 2026-06-01: Frontend UI and backend route audits now reject aliases of the Promise object itself before raw rejection paths, including typed and assigned alias forms. Full repo QA passed with backend tests 178 pass / 611 expects, docs command audit 350 refs, frontend build, and bundle budget green; external deploy blockers unchanged.
- ยืนยัน focused backend route guard ล่าสุดด้วย `bun run security:audit:test` และ `bun run security:audit`; รอบ 2026-05-31 ปิด `Promise.reject(error)` / `Promise.reject(cause)` / `Promise.reject(error as Error)` / `globalThis.Promise.reject(error)` / `Promise.reject.call/apply/bind` รวมถึง optional-chained, bracket-notation, alias Promise reject แบบ typed declaration/typed destructuring, และ Promise executor raw reject ทั้งแบบ arrow/function/optional-call/call-apply-bind/Reflect.apply/globalThis.Reflect.apply/bracket-Reflect-apply/parenthesized-Reflect-apply/Reflect-apply-alias/destructured-Reflect-apply-alias/reject-callback-alias/reject-callback-alias-forwarding/typed-alias-declaration ใน route files แล้ว.
- ยืนยัน focused frontend UI guard ล่าสุดด้วย `bun run frontend:static:audit:test` และ `bun run predeploy:check:test`; รอบ 2026-05-31 ปิด `Promise.reject(error)` / `Promise.reject(problem)` / `globalThis.Promise.reject(...)` / `window.Promise.reject(...)` / `Promise.reject.call/apply/bind` รวมถึง optional-chained, bracket-notation, alias Promise reject แบบ typed declaration/typed destructuring, และ Promise executor raw reject ทั้งแบบ arrow/function/optional-call/call-apply-bind/Reflect.apply/globalThis-window-Reflect.apply/bracket-Reflect-apply/parenthesized-Reflect-apply/Reflect-apply-alias/destructured-Reflect-apply-alias/reject-callback-alias/reject-callback-alias-forwarding/typed-alias-declaration ใน component/page surfaces แล้ว.
- ยืนยัน focused static/security guard ล่าสุดด้วย `bun run frontend:static:audit:test` และ `bun run security:audit:test`; รอบ 2026-05-31 ปิด `Reflect.apply(Reflect.get(...), ..., [error])` และ `Reflect.apply(Object.getOwnPropertyDescriptor(...).value, ..., [error])` แล้ว.
- Confirm the latest focused static/security guard with `bun run frontend:static:audit:test`, `bun run security:audit:test`, `bun run predeploy:check:test`, `bun run frontend:static:audit`, `bun run security:audit`, and `bun run predeploy:check`; the 2026-06-01 pass closes namespace/computed `Reflect.apply` forwarding of direct/retrieved `Promise.reject` targets in frontend UI surfaces and backend route files.
- Confirm parenthesized `Reflect.apply` Promise reject forwarding stays guarded in frontend UI surfaces and backend route files before staging smoke.
- ยืนยัน repo-owned gate ล่าสุดด้วย `bun run qa:repo`; รอบ 2026-06-01 ผ่านหลัง namespace/computed และ parenthesized `Reflect.apply` Promise reject guards โดย backend tests ยังอยู่ที่ 178 pass / 611 expects, docs command audit อยู่ที่ 350 refs และ frontend static/route/build/bundle budget ผ่าน.
- ยืนยัน focused alias guard ล่าสุดด้วย `bun run frontend:static:audit:test`, `bun run security:audit:test`, `bun run frontend:static:audit`, `bun run security:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; รอบ 2026-05-31 ปิด alias จาก `Reflect.get(..., 'error'|'warn')` แล้ว.
- ยืนยัน focused alias guard ล่าสุดด้วย `bun run frontend:static:audit:test`, `bun run security:audit:test`, `bun run frontend:static:audit`, `bun run security:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; รอบ 2026-05-31 ปิด descriptor value alias จาก `Object.getOwnPropertyDescriptor(...).value` แล้ว.
- ยืนยัน focused static/security guard ล่าสุดอีกชุดด้วย `bun run frontend:static:audit:test`, `bun run security:audit:test`, `bun run frontend:static:audit`, `bun run security:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; รอบ 2026-05-31 ปิด `Object.getOwnPropertyDescriptor(...).value` raw error log forwarding แล้ว.
- ยืนยัน focused static/security guard ล่าสุดด้วย `bun run frontend:static:audit:test`, `bun run security:audit:test`, `bun run frontend:static:audit`, `bun run security:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; รอบ 2026-05-31 ปิด `Reflect.get(...).call/apply/bind` raw error log forwarding แล้ว.
- ยืนยัน repo-owned gate ล่าสุดด้วย `bun run qa:repo` ก่อนเริ่ม staging/live-provider รอบถัดไป; รอบล่าสุดวันที่ 2026-05-31 ผ่านหลัง Promise executor `Reflect.apply(reject, ..., [error])` guard, frontend/backend optional-chained/bracket-notation/call/apply/bind/Reflect.apply/Reflect.get/global-console/alias raw error log guard, decision `0023` dangerous link protocol contract, decision `0024` share URL origin contract, decision `0025` cross-window messaging helper contract, decision `0026` frontend UI/route guard contract, frontend typed catch-binding raw UI error guard, frontend raw UI error throw guard, type-asserted raw log guard, type-asserted raw classifier guard, raw frontend classifier/UI message guard, backend type-asserted route catch guard, cross-window messaging helper/guard, frontend no-op submit guard, native dialog guard, event listener cleanup guard, share URL origin guard, AuthError response helper guard, frontend aria-disabled reason guard, placeholder-link guard, no-op handler guard, no-op submit guard, native dialog guard, event listener cleanup guard, share URL origin guard, dangerous link protocol guard, raw classifier/UI error spacing guards, iframe `srcDoc` guard, backend raw error log guards, backend raw route return guard, และ spaced assignment hardening พร้อม memory audit 36 Markdown files, docs command audit 349 refs, test coverage audit 60 files / 33 root test scripts, eval 3 scenarios, import-cycle audit 125 files / 295 edges, backend tests 178 pass / 611 expects, API audit 48 backend routes + 34 frontend helper calls, route/menu audit 14 surfaces, frontend static audit allowlist guard, aria-disabled reason guard, placeholder-link guard, no-op handler guard, no-op submit guard, native dialog guard, event listener cleanup guard, share URL origin guard, dangerous link protocol guard, raw UI error throw guard, cross-window messaging helper/guard, backend raw route return guard, frontend build และ bundle budget.
- `bun run qa:repo` ล่าสุดผ่านหลัง Promise executor `Reflect.apply(reject, ..., [error])` guard, frontend/backend optional-chained/bracket-notation/call/apply/bind/Reflect.apply/Reflect.get/global-console/alias raw error log guard, frontend typed catch-binding raw UI error guard, frontend raw UI error throw guard, type-asserted raw log guard, type-asserted raw classifier guard, raw frontend classifier/UI message guard, backend type-asserted route catch guard, cross-window messaging helper/guard, frontend no-op submit guard, native dialog guard, event listener cleanup guard, share URL origin guard, และ backend raw route return guard แล้ว พร้อม memory audit 36 Markdown files, docs command audit 349 refs, backend tests 178 pass / 611 expects, import-cycle audit 125 files / 295 edges, frontend static/route audit, frontend build/bundle budget, API audit, route/menu audit, docs/memory/knowledge gates; DB persistence suites ยัง skip เฉพาะเพราะ local Postgres ไม่ได้รัน.
- ยืนยัน focused frontend dangerous link protocol guard ล่าสุดด้วย `bun run frontend:static:audit:test`, `bun run frontend:static:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; guard นี้ต้องยังปิด `javascript:`, `vbscript:`, และ `data:text/html` ใน `href`/`to`.

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
