# ตัวกั้นก่อน deploy

อัปเดตล่าสุด: 2026-05-26

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
- `RELEASE_HANDOFF.md` ต้องบันทึก `E2E_BASE_URL`/`E2E_API_BASE_URL` ที่ใช้รัน browser smoke; staging/production filled handoff จะ fail ถ้าค่าเหล่านี้ไม่ใช่ deployed origins เดียวกับ Frontend/Backend URL
- `RELEASE_HANDOFF.md` filled mode จะ fail ถ้า `Frontend URL`/`Backend URL` ไม่ใช่ deployed origins ล้วน หรือถ้า `Health URL`/`Ready URL` ไม่ชี้ backend origin เดียวกันที่ `/health` และ `/ready` โดยไม่มี query/hash
- `RELEASE_HANDOFF.md` ต้องเก็บแถวหลักของ QA evidence ไว้ครบ: `qa:local`, `e2e:smoke`, `staging:verify`, `production:check`, GitHub Production Smoke run, และ GitHub Production Smoke URL
- `RELEASE_HANDOFF.md` ต้องเก็บ field สำคัญไว้ครบ เช่น `Environment`, deployed URL fields, `CORS origins`, และ `Go / no-go` เพื่อไม่ให้ลบแถวแล้วหลบ validation ได้

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

- Repo-owned static/unit/build gate ล่าสุดผ่าน `bun run qa:repo` วันที่ 2026-05-26 หลัง decision `0023` dangerous link protocol contract, frontend aria-disabled reason guard, placeholder-link guard, no-op handler guard, dangerous link protocol guard, raw classifier/UI error spacing guards, iframe `srcDoc` guard, backend raw error log guards, และ spaced assignment hardening; memory audit ครอบ 33 Markdown files, docs command audit ครอบ 335 refs, test coverage audit ครอบ 60 files / 33 root test scripts, eval 3 scenarios, import-cycle audit 123 files / 293 edges, backend tests 177 pass / 609 expects, API audit ครอบ 48 backend routes + 34 frontend helper calls, route/menu audit 14 surfaces, frontend static audit allowlist guard, aria-disabled reason guard, placeholder-link guard, no-op handler guard, dangerous link protocol guard, frontend build และ bundle budget ผ่าน; blocker ที่เหลือยังเป็น environment/staging/live-provider จริง.
- Focused frontend dangerous link protocol guard ล่าสุดผ่าน `bun run frontend:static:audit:test`, `bun run frontend:static:audit`, `bun run predeploy:check:test`, และ `bun run predeploy:check`; guard นี้ปิด `javascript:`, `vbscript:`, และ `data:text/html` ใน `href`/`to` โดยไม่เปลี่ยน production blocker ภายนอก.
- Full deterministic `bun run qa:repo` ล่าสุดผ่านหลัง frontend raw classifier/UI error spacing guards, iframe `srcDoc` guard, และ backend first-argument raw error log guard แล้ว: memory audit 33 Markdown files, docs command audit 335 refs, test coverage audit 60 files / 33 root test scripts, eval 3 scenarios, import-cycle audit 123 files / 293 edges, API audit 48 backend routes + 34 frontend helper calls, route/menu audit 14 surfaces, backend tests 177 pass / 609 expects, frontend static/route audit, frontend build และ bundle budget ผ่าน; blocker ที่เหลือยังเป็น environment/staging/live-provider จริง.
- backend test suite ฝั่ง local ผ่านแล้ว: 177 pass, 0 fail, 609 expect calls.
- Local API smoke ผ่านแล้ว
- API route audit now rejects weak coverage quality before deploy: admin routes need `admin-smoke`, live-provider routes including `POST /chat/stream` need `live-smoke`, manual-production-only coverage is too weak, and coverage notes must be filled.
- `api:smoke:live` now includes normal live chat, live stream chat, and live image generation, so the remaining live-provider blocker requires one clean staging run before setting verification flags.
- `api:smoke:live` now prints the live image handoff evidence rows (`Image smoke provider`, source, URL kind, elapsed milliseconds), includes proven live provider values in the final JSON summary `handoffEvidence` only when chat normal/stream and image evidence are all complete with positive token/elapsed values, and uses the same fallback/placeholder/missing URL/SVG validation as `smoke:image:live`, so the remaining image blocker is a real provider/staging run, not missing repo-owned evidence wiring.
- `api:smoke:live` now continues the normal live chat through the stream route and requires separate `CHAT_USAGE` wallet debits for normal chat and stream chat.
- `smoke:chat` now also verifies live stream chat, so using the narrow chat retry command still covers the stream provider path before setting `CHAT_PROVIDER_LIVE_VERIFIED=1`.
- `smoke:chat` now requires separate `CHAT_USAGE` wallet debits for normal chat and stream chat, so a clean chat-provider verification also proves both billing paths are recorded.
- `smoke:chat`, `smoke:image:live`, and complete combined `api:smoke:live` now return JSON `handoffEvidence` objects with release-field labels such as `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, `Chat smoke stream walletTransactionId`, `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, and `Image smoke elapsedMs`, so provider verification runs are copy-ready for `RELEASE_HANDOFF.md`.
- Release handoff now requires normal chat and stream chat smoke evidence rows for chatId, token count, and wallet transaction id; filled staging/production handoffs reject placeholder/pass-only ids and non-positive token counts.
- Release handoff now requires live image smoke evidence rows for provider, source, URL kind, and elapsed milliseconds; filled staging/production handoffs reject placeholder image evidence before `IMAGE_GENERATION_LIVE_VERIFIED=1` is trusted.
- API route audit weak coverage output now includes exact reasons per route so deploy operators can fix the missing smoke or note without rereading the coverage table.
- README and Deployment QA now explain the API route coverage quality guard, so operators know weak coverage means missing smoke, manual-production-only coverage, or an empty note before deploy.
- Frontend build และ bundle budget ผ่านแล้ว
- Desktop/mobile e2e smoke ผ่านแล้ว
- Supabase signed URL สำหรับพื้นที่เก็บรูปตัวละคร implement แล้ว และถูกตรวจโดย production gate
- Relationship contract presets แยกจาก creator presets แล้ว และมี API smoke ครอบไว้
- Release handoff guard addendum 2026-05-25: filled staging handoffs fail when `qa:local`, `e2e:smoke`, or `staging:verify` are recorded as anything other than pass/ผ่าน, so staging cannot be promoted with failed QA evidence.
- Release handoff guard addendum 2026-05-25: filled production handoffs require `GitHub Production Smoke URL` to be a concrete GitHub Actions run URL shaped like `https://github.com/<owner>/<repo>/actions/runs/<id>`, so a plain `pass` row is not enough to trace production smoke evidence.
- Release handoff guard addendum 2026-05-25: QA gate evidence must stay as actual `- label:` rows; mentioning command names in notes no longer satisfies the required handoff evidence.
- Release handoff guard addendum 2026-05-25: production live-provider verification flags must be real handoff field rows set to `1`, not notes that merely mention `CHAT_PROVIDER_LIVE_VERIFIED` or `IMAGE_GENERATION_LIVE_VERIFIED`.
- Release handoff guard addendum 2026-05-25: critical fields such as `Environment`, deployed URLs, `CORS origins`, and `Go / no-go` must remain actual `- label:` rows in the handoff.
- Release handoff guard addendum 2026-05-25: filled handoffs must use exact `Environment: staging` or `Environment: production`, and final release evidence must record `Go / no-go: go`; ambiguous environment text or no-go decisions remain blocked.
- Release handoff guard addendum 2026-05-25: release decision evidence must keep `ผู้อนุมัติ` and `หมายเหตุ` as real fields; filled handoffs reject placeholder approver names and placeholder notes such as `tbd`.
- Release handoff guard addendum 2026-05-25: staging/production release handoffs must keep `Frontend build artifact` and `Backend deploy artifact` rows with traceable build/deploy ids; placeholder, latest, manual, or local build values are rejected before `go`.
- Release handoff guard addendum 2026-05-25: staging/production release handoffs must keep `Health check result` and `Ready check result` rows, and both must be pass/ผ่าน before handoff evidence is accepted.
- Release handoff guard addendum 2026-05-25: filled production handoffs must record `ผล live smoke แชท` and `ผล live smoke รูป` as pass/ผ่าน; `CHAT_PROVIDER_LIVE_VERIFIED=1` and `IMAGE_GENERATION_LIVE_VERIFIED=1` do not override failed or warning live-smoke result rows.
- Release handoff guard addendum 2026-05-25: AI-provider model, live-smoke command/result, and provider verification flag rows must stay as real fields; filled staging/production handoffs reject placeholder/fallback/mock provider values and non-live smoke commands, and staging handoffs must also record live-smoke results as pass/ผ่าน before `go`.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must keep admin verification rows for `/admin/health`, `/admin/prompt-inspector`, `/admin/evals`, `รายงาน moderation`, and `audit logs ของผู้ดูแล`, and every row must be pass/ผ่าน before handoff evidence is accepted.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must keep migration evidence rows, run `bunx prisma migrate deploy`, record `ผล migration` as pass/ผ่าน, and provide a concrete `Prisma migration version` folder name.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs now reject local/sqlite/dev/test database wording and raw `DATABASE_URL`/`postgresql://` values in `Database host/provider`; release evidence must describe a deployed managed Postgres provider or host summary.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must record production-safe auth/storage evidence: `supabase-jwt`, a Supabase project ref value, Supabase avatar storage, signed avatar URLs, and signed URL age `3600`.
- Release handoff guard addendum 2026-05-25: release identity rows (`วันที่ release`, `Git commit`, `Branch`, `ผู้รับผิดชอบ`) must stay as real fields, and filled handoffs must use concrete date/hash/branch/owner values.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must record no open blockers/manual follow-ups before `go`, clear provider quota-risk text, and an actionable rollback condition.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must record a concrete `Rollback action` that operators can execute; decide-later/latest/manual-later rollback notes are rejected.
- Release handoff guard addendum 2026-05-25: release handoff scanning now rejects credential-bearing URLs anywhere in the file, including notes and rollback evidence, before commit/release evidence is accepted.
- Release handoff guard addendum 2026-05-25: filled staging/production handoffs must also record frontend state QA gates (`frontend:env:test`, `frontend:storage:test`, `frontend:clipboard:test`) as pass/ผ่าน, not fail or warning text.
- Route/Menu Audit guard addendum 2026-05-25: `needs-staging` rows must point to `STAGING_RUNBOOK.md` and `/admin/health`, while `future` rows must clearly describe future-only work so unfinished staging/future items cannot look like clickable production menus.
- Route/Menu Audit guard addendum 2026-05-25: `future` rows must not point to real `/path` route tokens; promote the surface to `ready`/`guarded` only after route/preload/navigation QA exists.
- Route/Menu Audit guard addendum 2026-05-26: `route-menu:audit` now rejects stale documented rows and stale route tokens that exist in `ROUTE_MENU_AUDIT.md` but no longer exist in `routeMenuAuditRows`; `predeploy:check` locks this checker/test snippet before deploy.
- Predeploy guard addendum 2026-05-25: `predeploy:check` now requires the Route/Menu Audit status-evidence snippets and regression fixture, so staging/future menu evidence cannot drift without failing the deploy gate.
- Memory audit addendum 2026-05-25: `memory:audit` now also requires those Route/Menu Audit status-evidence notes in memory, so the blocker history cannot silently drop staging/future menu context.
- Memory audit addendum 2026-05-25: `memory:audit` now also requires API route coverage quality and weak-coverage reason notes, so API smoke/admin/live-provider coverage status cannot silently disappear from handoff memory.
