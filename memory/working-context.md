# บริบทงานปัจจุบัน (Working Context)

Last updated: 2026-05-21

## บันทึกเพิ่ม 2026-05-21

- 2026-05-21: Predeploy check diagnostics เพิ่ม `formatPredeployCheckError` ให้ check failure ที่ throw error ถูก redact ด้วย `formatDiagnosticText` ก่อนพิมพ์ผล gate; `predeploy:check:test` และ `predeploy:check` ครอบ regression แล้ว.
- 2026-05-21: Deploy env doctor diagnostics เพิ่ม `formatDeployEnvDoctorError` ให้ env file read failure redact secret-shaped value ก่อนเข้า findings/output แล้ว; `deploy:doctor:test` ครอบ helper regression แล้ว.
- 2026-05-21: E2E smoke diagnostics ผูก `formatE2eSmokeError` กับ `formatDiagnosticText` แล้ว เพื่อ redact secret-shaped value จาก Playwright/restore failure ก่อนเขียน QA log; `e2e:smoke:test` ครอบ regression แล้ว.
- 2026-05-21: Smoke doctor diagnostics เพิ่ม `formatSmokeDoctorCaughtError` ให้ root identity/health failure path redact secret-shaped value ก่อนเขียน CLI error แล้ว; `smoke:doctor:test` ครอบ helper และ runner failure path แล้ว.
- 2026-05-21: Deploy status diagnostics เพิ่ม `formatDeployStatusCaughtError` ให้ root identity/health failure path ทั้ง text และ `--json` redact secret-shaped value ก่อนแสดงผลแล้ว; `deploy:status:test` ครอบ helper, text mode, และ JSON mode แล้ว.
- 2026-05-21: Readiness smoke runner diagnostics เพิ่ม `formatReadinessSmokeCaughtError` ให้ root identity/readiness reader failure path redact secret-shaped value ก่อนเขียน CLI error แล้ว; `smoke:ready:test` ครอบ helper และ runner failure path แล้ว.
- 2026-05-21: Local smoke diagnostics เพิ่ม `formatLocalSmokeCaughtError` ให้ runner failure path redact secret-shaped value ก่อนเขียน CLI error แล้ว; `smoke:local:test` ครอบ helper และ backend failure path แล้ว.
- 2026-05-21: Live chat smoke diagnostics เพิ่ม `formatLiveChatSmokeCaughtError` และ redact `providerFailure.userMessage` ก่อนประกอบ CLI guidance แล้ว เพื่อไม่ให้ provider/proxy error ที่มี secret-shaped value หลุดใน live chat smoke logs; `smoke:chat:test` ครอบ helper, providerFailure, และ runner failure path แล้ว.
- 2026-05-21: Image smoke catch diagnostics เพิ่ม `formatImageSmokeCaughtError` ให้ root/health preflight และ live creator draft failure redact secret-shaped value ก่อนเขียน CLI error; `smoke:image:test` ครอบ helper และ runner failure path แล้ว.
- 2026-05-21: API smoke catch diagnostics ตอนนี้ใช้ `formatApiSmokeCaughtError` ใน `check`, `warnable`, `runRequired`, และ `bestEffort` แล้ว เพื่อไม่ให้ error object/string ที่มี secret-shaped value ถูกบันทึกเป็นผล smoke หรือ warning ตรงๆ; `api:smoke:test` ครอบ redaction และ source guard แล้ว.
- 2026-05-21: API smoke diagnostics เพิ่ม `formatApiSmokeDiagnostic` ให้ error path ของ stream, `/ready`, และ expected-error JSON ใช้ redaction ก่อน clip raw response body แล้ว; regression test ครอบ secret-shaped Postgres URL และ source guard กัน `raw.slice(0, 500)` กลับมาแล้ว.
- 2026-05-21: Supabase Storage setup/check diagnostics ตอนนี้ใช้ `formatDiagnosticText` กับทั้ง non-OK response body และ fetch failure แล้ว ทำให้ `supabase:storage:check/setup` ไม่พ่น secret-shaped value จาก Supabase/proxy/network ลง log; `supabase:storage:test` ครอบ regression non-OK body และ network failure แล้ว.
- 2026-05-21: Readiness smoke ใช้ `formatDiagnosticText` กับ fetch failure, non-JSON `/ready`, non-JSON root identity, และ root identity non-OK body แล้ว เพื่อไม่ให้ secret-shaped value จาก staging/proxy/backend หลุดใน deploy readiness logs; `smoke:ready:test` ครอบ regression แล้ว.
- 2026-05-21: Shared smoke helper เพิ่ม `formatDiagnosticText` ที่ใช้ `redactSensitiveText` ก่อน clip diagnostics ทำให้ `readJson`, `formatPayload`, และ `formatFetchErrorReason` ไม่สะท้อน secret-shaped value จาก non-JSON response/proxy/fetch failure ลง smoke logs; `smoke:helpers:test` ครอบ regression แล้ว.
- 2026-05-21: Frontend static audit เพิ่ม guard กัน direct `fetch` นอก `apps/frontend/src/lib/api.ts` เพื่อให้ทุกหน้าใช้ API helper กลางสำหรับ auth/error/stream/diagnostics; regression test ครอบทั้งเคสจับผิดใน page และ allow ใน API helper แล้ว.
- 2026-05-21: Frontend static audit เพิ่ม guard กัน `response.text()` ตรงใน frontend source เพื่อบังคับให้ plain-text/proxy/API failure ถูกแปลงเป็น `ApiError` ข้อความไทยที่ควบคุมได้ก่อนถึง UI; regression test ครอบทั้ง `response.text()` และ `response.clone().text()` แล้ว.
- 2026-05-21: Backend security audit เพิ่ม guard กัน runtime backend อ่าน `response.text()` จาก provider/Supabase แล้วนำไปใช้เป็น diagnostic โดยไม่ผ่าน `redactSensitiveText`; regression test ครอบทั้งเคสจับผิด, เคส redacted inline, และเคส redacted หลายบรรทัดแล้ว.
- 2026-05-21: Security checklist ระบุ policy ใหม่ให้ backend/frontend ห้าม parse `response.json()` ตรงนอก safe JSON helper เพื่อให้ provider/Supabase/API JSON ที่พังถูกห่อเป็นข้อความไทยก่อนถึง log หรือ UI.
- 2026-05-21: Deploy blockers current summary refresh ปรับ `memory/deploy-blockers.md` ส่วนที่ไม่ใช่ blocker ให้ตรงกับ gate ล่าสุดหลัง response JSON parsing guards โดยยังคง production blockers จริงเป็น staging/live-provider/environment เหมือนเดิม.
- 2026-05-21: Agent handoff refresh ปรับ `agent.md` current status ให้ตรงกับ gate ล่าสุดหลังเพิ่ม frontend/backend response JSON parsing guards โดยระบุ backend 161 tests / 519 expects และ `qa:repo` รอบล่าสุดที่ผ่านแล้ว.
- 2026-05-21: Frontend static audit เพิ่ม guard กัน `response.json()` ตรงใน frontend source นอก `readApiJson`/`readErrorPayload` เพื่อบังคับให้ API JSON ที่พังถูกห่อเป็น `ApiError` ข้อความไทยก่อนแสดงผล; `frontend-static-audit.test` ครอบเคสจับผิดและ allow helper แล้ว.
- 2026-05-21: Backend security audit เพิ่ม guard กัน runtime backend parse `response.json()` ตรงนอก safe `read...Payload` helper เพื่อบังคับให้ external JSON ที่พังถูกห่อเป็นข้อความไทยก่อนเสมอ; `security:audit:test` ครอบทั้งเคสจับผิดและ allow helper แล้ว.
- 2026-05-21: Backend Supabase auth JSON hardening เพิ่ม `readSupabaseJwksPayload` และ `readSupabaseUserPayload` ให้ JWKS/auth user response ที่ HTTP 200 แต่ JSON พังถูกห่อเป็นข้อความไทย `Supabase JWKS ตอบกลับ JSON ไม่ถูกต้อง` หรือ `Supabase auth user ตอบกลับ JSON ไม่ถูกต้อง` แทน raw parser error; backend security tests ครอบเคส malformed payload แล้ว.
- 2026-05-21: Backend avatar signed URL hardening เพิ่ม `readSupabaseSignedUrlPayload` ให้ runtime avatar redirect path ห่อ Supabase signed URL JSON ที่พังเป็นข้อความไทย `Supabase ส่งข้อมูล signed URL ของรูปตัวละครไม่ถูกต้อง`; backend storage tests ครอบเคส malformed payload แล้ว.
- 2026-05-21: Supabase Storage setup hardening เพิ่ม `readStorageJson` ให้ live storage helper ของ `supabase:storage:check/setup` รายงาน `อ่าน bucket คืน JSON ไม่ถูกต้อง` หรือ `สร้าง signed URL คืน JSON ไม่ถูกต้อง` เมื่อ Supabase คืน success status แต่ JSON พัง แทน raw parser error.
- 2026-05-21: Frontend env JWT guard เพิ่ม `supabaseJwtRole` ที่ decode base64url แบบเติม padding ได้ถูกต้อง เพื่อให้หน้า frontend readiness จับ `VITE_SUPABASE_ANON_KEY` ที่เป็น service role หรือ role ผิดได้แม้ JWT payload ไม่มี `=` padding; เพิ่ม `frontend:env:test` และผูกเข้า `qa:repo` แล้ว.
- 2026-05-21: Image provider JSON hardening เพิ่ม `readImageProviderJson` ใน Creator Draft เพื่อให้ผู้ให้บริการสร้างรูปที่คืน HTTP 200 แต่ JSON พัง fallback เป็นภาพตัวอย่างพร้อม warning ภาษาไทย "ผู้ให้บริการสร้างรูปตอบกลับ JSON ไม่ถูกต้อง" แทน raw parser text.
- 2026-05-21: Frontend API JSON hardening เพิ่ม `readApiJson`/`readErrorPayload` ให้ success response ที่ body ไม่ใช่ JSON ถูกห่อเป็น `ApiError` ภาษาไทย "API ตอบกลับไม่สมบูรณ์ กรุณาลองใหม่" แทน raw `SyntaxError`; ใช้ร่วมกับ `requestJson`, avatar upload, และ stream error payload แล้ว.
- 2026-05-21: Creator Draft JSON hardening เปลี่ยน parser ของ AI draft ให้ห่อ JSON ที่โมเดลคืนมาพังเป็น `SyntaxError` ข้อความไทยที่ควบคุมได้ "โมเดลคืน JSON สำหรับดราฟต์ตัวละครไม่ถูกต้องหรือไม่สมบูรณ์" โดยยัง retry ได้เหมือนเดิม และ warning จะไม่หลุด raw `Unexpected...`/`SyntaxError` ไปถึงครีเอเตอร์.
- 2026-05-21: API smoke stream parser เพิ่ม `parseApiSmokeStreamEvents` เพื่อให้ `/chat/stream` smoke แปลง malformed SSE `data:` event เป็น diagnostic ภาษาไทยที่บอก path/บรรทัด แทนการปล่อย `SyntaxError` จาก `JSON.parse` ดิบ; `api:smoke:test` และ `predeploy:check` ล็อก regression นี้ไว้แล้ว.
- 2026-05-21: Frontend clipboard hardening เพิ่ม `safeClipboard` wrapper ให้ share character และ Prompt Inspector copy prompt ไม่ throw เมื่อ browser/insecure context ไม่อนุญาต clipboard; UI จะ fallback เป็นข้อความให้คัดลอกเอง และ `frontend:clipboard:test` scan กัน direct `navigator.clipboard`/`clipboard.writeText` กลับมาใน source.
- 2026-05-21: Frontend storage hardening เก็บครบทุก callsite ที่เคยใช้ `localStorage.getItem/setItem/removeItem` ตรงใน `apps/frontend/src` แล้ว ทั้ง theme, admin key, persona saved-at, workspace admin check, wallet, Prompt Inspector, evals, moderation, และ dev user id; `frontend:storage:test` เพิ่ม source scan กัน direct localStorage call กลับมาในอนาคต.
- 2026-05-21: Frontend persistence เพิ่ม `safeStorage` wrapper สำหรับ `localStorage` เพื่อกัน browser privacy/quota/storage-blocked error ทำให้ API auth, Redux persistence, Creator Draft auto-save, และ pinned chat ids ไม่ทำให้ UI crash เมื่อ storage อ่าน/เขียนไม่ได้; เพิ่ม `loadPinnedChatIdsFromRaw`/`serializePinnedChatIds` ให้ทดสอบ parser ได้ตรงและผูก `frontend:storage:test` เข้า `qa:repo` พร้อม predeploy guard แล้ว.
- 2026-05-21: Frontend chat stream parser เพิ่ม `parseChatStreamEvent` และ safe stream-read wrapper เพื่อห่อ malformed SSE/JSON event หรือ stream interruption เป็น `ApiError` ภาษาไทย "สตรีมแชทขัดข้อง กรุณาลองใหม่" แทนการปล่อย `SyntaxError`/reader error ดิบขึ้น UI; regression test ครอบคลุม parser ตรง, event พังจาก network, และ reader ล้มกลางทางแล้ว.
- 2026-05-21: Frontend `ApiError` เพิ่ม `safeApiUserMessage` เพื่อแสดงเฉพาะ backend `message` ที่เป็นข้อความไทยและไม่เข้าลักษณะ raw technical error; ถ้าเจอ `Cannot read`, `PrismaClient...`, `ECONNREFUSED`, `TypeError`, env/secret key names หรือข้อความ technical ที่ไม่มีภาษาไทย จะ fallback เป็นข้อความไทยกลางแทน และ predeploy guard ล็อก helper/test นี้ไว้แล้ว.
- 2026-05-21: API smoke เพิ่ม helper ตรวจ `error` response ให้เป็น machine-readable snake_case ก่อน assert รายละเอียด error แล้ว เพื่อให้ smoke validation/admin checks จับ raw message, ข้อความไทย, hyphen/camelCase, หรือ exception text ที่หลุดมาใน field `error` ได้ทันที; `predeploy:check` ล็อก regression test และการเรียก helper ไว้แล้ว และ `bun run qa:repo` ผ่านเต็มหลังเปลี่ยนชุดนี้.
- 2026-05-21: backend security audit ปิด false negative ของ route catch ที่มี `AuthError` branch แล้วตามด้วย generic `message: error.message`; ตอนนี้ตรวจทีละตำแหน่งใน catch block แทน regex ก้อนเดียว และ `predeploy:check` ล็อก helper/test ใหม่ไว้แล้ว.
- 2026-05-21: backend security audit ขยาย raw route catch message guard ให้จับ `message: String(error)` และ ternary `error instanceof Error ? error.message : String(error)` ด้วย เพื่อไม่ให้ generic catch ส่งรายละเอียด error ดิบกลับผู้ใช้.
- 2026-05-21: `bun run qa:repo` ผ่านเต็มหลัง route catch message hardening ชุดล่าสุด จึงยืนยัน static/unit/build/audit/eval ฝั่ง repo-owned ยังเขียวทั้งหมด; runtime smoke ยังขึ้นกับ Docker/backend/staging ตาม blocker เดิม.
- 2026-05-21: backend security audit เพิ่ม guard ให้ route catch ห้ามใส่ raw `error.message` หรือ `String(error)` ลง field `error` แม้ response จะมี `message` แล้ว เพื่อบังคับให้ `error` เป็น machine-readable code ที่ควบคุมได้.
- 2026-05-21: `routeErrorResponse` normalize unknown code เป็น `unknown_error` ทั้ง field `error` และ `message` แล้ว เพื่อไม่ให้ dynamic validation หรือ code ที่ไม่อยู่ใน `routeErrorMessages` หลุดกลับ API response.
- 2026-05-21: `bun run qa:repo` ผ่านเต็มหลัง route error response normalization; backend tests ล่าสุดยัง 157 tests แต่ expect calls เพิ่มเป็น 507, security audit 22 tests / 35 expects, API route audit 48 routes, route/menu audit 14 surfaces, docs command audit 289 references, import-cycle 125 files / 279 edges, และ frontend bundle budget ยังผ่าน.

## อัปเดตงานใน repo (Repo-owned update) 2026-05-21

- 2026-05-21: `/admin/evals/local` ไม่ส่ง raw `error.message` กลับใน `detail` แล้ว โดยเปลี่ยนเป็น `safeRouteErrorSummary(error)` และเพิ่ม backend security audit rule กันการคืน `detail: error.message`, `detail: String(error)`, หรือ ternary raw error message กลับมาอีก.
- 2026-05-21: backend security audit เสริม rule กัน route `catch (error)` คืน `message: error.message` ตรงๆ ใน generic error path แล้ว แต่ยังอนุญาต `AuthError` เพราะข้อความถูกควบคุมโดยระบบ auth.
- 2026-05-21: `bun run qa:repo` ผ่านเต็มหลัง route-error hardening ครอบคลุม security audit, backend/frontend checks, API route audit, route/menu audit, command-doc audit, evals, import-cycle, smoke helper tests, predeploy, และ bundle budget.
- 2026-05-21: `docs:commands` ขยายจากเอกสาร Markdown ไปตรวจ GitHub Actions workflow ด้วย โดยเข้าใจ `working-directory`, job boundary, และ `cd apps/...` ใน run block เพื่อกัน CI/Production Smoke อ้าง `bun run ...` ผิด package.
- 2026-05-21: `predeploy:check` ผ่านหลังเปลี่ยนชื่อ gate เป็น `คำสั่งในเอกสารและ workflow ต้องตรงกับ package scripts`; docs command audit ล่าสุดตรวจ 289 จุดอ้างอิง.
- เพิ่ม `docs:commands` และ `docs:commands:test` เพื่อตรวจว่าเอกสารหลักอ้าง `bun run ...` ตรงกับ package context จริง ทั้ง root docs, app READMEs, release/deploy handoff, route/menu audit, และ staging/production runbooks.
- `qa:repo`, CI predeploy/secrets layer, และ Production Smoke ถูกผูกให้รัน command-doc audit แล้ว เพื่อกัน README หรือ deploy docs แนะนำ script ที่ไม่มีอยู่จริงในตำแหน่งที่ผู้ใช้รัน.
- `predeploy:check` เรียก command-doc audit โดยตรงแล้ว ดังนั้น `production:check` จะจับเอกสารที่อ้าง script ผิด context ได้แม้ไม่ได้รัน `qa:repo` ก่อน.
- README ของ backend/frontend package เปลี่ยนคำสั่ง app-local check เป็น `bun run deploy:check` และแยกบอกชัดว่าถ้ารันจาก repo root ให้ใช้ `bun run backend:check` / `bun run frontend:check`.
- `evals/golden-roleplay.json` ใช้คำอธิบาย สถานการณ์ lore และ runtime memory แบบ Thai-first แล้ว เพื่อให้ชุด deterministic prompt eval สอดคล้องกับ runtime prompt ที่แปลเป็นไทยก่อนหน้านี้.
- สถานการณ์ prompt injection ยังตั้งใจคง `userMessage` ภาษาอังกฤษไว้ เพื่อทดสอบการโจมตีข้ามภาษาและยืนยันว่า prompt-control policy อยู่เหนือข้อความผู้ใช้ที่ไม่น่าเชื่อถือ.
- Root README และ `evals/README.md` ใช้หัวข้อไทย-first สำหรับชั้นความรู้, ชั้นประเมินผล, ตัวตรวจพรอมป์, ชุดทดสอบหลัก, และคำสั่ง โดยยังคงคำอังกฤษสำคัญไว้ในวงเล็บเพื่อให้ค้นหาและ guard อัตโนมัติได้.
- Root README หัวข้อเครื่องมืออ่านโค้ด, ความจำโปรเจกต์, การส่งต่องาน, สถานะ deploy, และ Docker build เป็น Thai-first แล้วเพื่อให้ entrypoint เอกสารสอดคล้องกับ UI/QA language direction.
- `AGENTS.md` และ `agent.md` ใช้หัวข้อ Thai-first สำหรับขอบเขต การสานต่องาน QA gates product direction safety/core systems production blockers และ definition of done แล้ว โดยยังคงคำอังกฤษในวงเล็บเพื่อค้นหาได้.
- Deployment QA, Production Setup, Release Handoff, Security Checklist, production checklist memory, และ knowledge wiki ใช้ heading Thai-first สำหรับ production env, storage, mobile/manual QA, release notes, env setup, QA gates, security, commands, runtime knowledge, gates, และ compile flow แล้ว.
- QA runner polish ล่าสุดทำให้ eval/readiness/smoke doctor/deploy status/release handoff/API smoke/local smoke/e2e smoke diagnostics เป็น Thai-first มากขึ้น โดยยังคง command/env/route/provider keys ที่ต้องใช้ debug ไว้.
- Full deterministic `bun run qa:repo` ผ่านล่าสุดหลัง route error normalization ครอบคลุม backend tests 157 pass / 507 expect calls, import-cycle audit 125 source files / 279 import edges, frontend build/bundle, audits, evals, smoke helper tests และ predeploy guards; DB persistence suites skip เฉพาะเพราะไม่มี Postgres local ในรอบนี้.

## เป้าหมายปัจจุบัน

ทำให้ Maprang AI พร้อมสำหรับ production ก่อน deploy โดยระบบ local ต้องเสถียร และ production-only blockers ต้องชัดจนพลาดยาก.

## สถานะ local ปัจจุบัน

สถานะ: static/unit/build QA พร้อมแล้ว; final local smoke ยังต้องมี Docker/Postgres และ backend ที่รันอยู่

Verified:
- Latest full `qa:repo` after route error normalization passes; backend tests pass 157 tests with 507 expects, docs command audit checks 289 จุดอ้างอิง after workflow coverage, frontend bundle budget remains under limits, and DB persistence suites still skip when local Postgres is unavailable.
- Latest full `qa:local` attempt reached final runtime smoke and then failed because Docker Desktop/Postgres plus backend `http://127.0.0.1:3000` were not running in this desktop session.
- Latest direct `deploy:status` also fails at backend root preflight for the same reason: `http://127.0.0.1:3000` is not running.
- Backend tests pass: 157 pass, 0 fail, 507 expects.
- Frontend deploy check passes.
- Local API smoke passes: 32 pass, 0 fail, 1 live chat skip.
- Playwright e2e smoke passes on desktop and mobile: 4 pass, 0 fail.
- Local Postgres is reachable through Docker and migrations are applied.
- Frontend UI pass added mobile Explore bottom nav and real Chat read-mode behavior.
- Frontend Thai localization pass now covers admin utility pages, prompt/usage labels, route/menu audit table headings, chat prompt budget, System Status model budget labels, and Character Lobby/Profile/Create helper copy.
- Frontend Thai localization pass now also covers Prompt Inspector persona wording, Lore Manager placeholders/actions, Chat role-panel lore usage labels, Workspace lore save/error notes, and Route/Menu prompt-inspector coverage text; the static audit blocks stale `Lorebook`, `lore ที่ดึงมาใช้`, `Persona ชั่วคราว`, `keyword`, `aliases`, `priority`, `visual cue`, and `persona expression` strings from returning.
- Creator Studio tag helper copy now avoids the visible English placeholder `roleplay, thai`; the form defaults to Thai tags, normalizes known Thai aliases before submit, and frontend/backend relationship tag guards block drift.
- Sidebar brand tagline now uses Thai-first `บทบาทสมมุติภาษาไทย`, and frontend static/predeploy guards block the old `AI roleplay ภาษาไทย` wording from returning.
- Structured knowledge packs and prompt-builder headings now use Thai-first runtime policy, creator guidance, chat style, relationship rules, and scene rules; knowledge audit blocks the old English snippets from returning, and local evals expect the Thai knowledge headings.
- Predeploy now verifies the frontend static audit keeps the Lore/Persona Thai-first regression test and source patterns wired.
- Route/menu audit runtime data and `ROUTE_MENU_AUDIT.md` now use Thai-first surface names and control descriptions while keeping the Route/Menu Audit marker for automated docs checks.
- Route/menu audit handoff copy now avoids stale mixed English smoke/debug wording such as `Automated route smoke`, `desktop/mobile`, `browser console`, `horizontal overflow`, `handler ว่าง`, `ข้อความ placeholder`, `text encoding`, and `mojibake`; route/menu doc check and predeploy guard these strings.
- Route/menu staging row now describes staging as a checklist rather than a fake in-app button, and frontend static audit blocks the old ambiguous copy from returning.
- Route/menu doc check now fails directly on stale mixed-language audit copy such as `รัน eval`, `prompt-control`, `token budget`, `accordion`, or ` disabled `, instead of relying only on predeploy.
- Route/menu document check diagnostics now use Thai-first output for missing navigation, missing audit/preload rows, weak status labels, stale mixed-language copy, and pass/fail summaries.
- Frontend static audit now guards a focused set of English UI label regressions for Thai-first pages, including Admin Health, Prompt Inspector, Automated Evals, Relationship Contract, Chat budget, Supabase/Auth labels, and route/menu surface names.
- Frontend static audit diagnostics now report Thai-first failure messages for button accessibility, placeholder controls, raw error exposure, ApiError fallback, mixed UI copy, mojibake, and stale Vite starter files.
- Frontend static audit now also guards XSS/opener regressions such as `dangerouslySetInnerHTML`, `.innerHTML =`, `eval()`, `new Function()`, `window.open()`, and `target="_blank"` links without `rel="noopener noreferrer"`.
- `ABUSE_QA_CHECKLIST.md` now gives a manual pre-release checklist for SQL-like input, broken access, auth spoofing, prompt control, frontend XSS/link safety, admin audit logs, token/rate limit, and storage/avatar abuse cases.
- Secret pattern scanning now also catches Anthropic keys, Hugging Face tokens, and Stripe live secret keys in committed source/docs in addition to existing OpenRouter/OpenAI/JWT/platform token shapes.
- Backend redaction is now shared through `redaction.ts`; Prompt Inspector and Creator Draft warnings/notes redact provider tokens, private keys, DB URLs, env secret values, and JWT-like values before returning diagnostic text to UI/API.
- `SECURITY_CHECKLIST.md` headings and CIA/AAA bullets are now Thai-first while preserving English security keywords for search, and predeploy guards the Thai heading snippets.
- `memory/ui-ux/current-direction.md` now describes product principles, surfaces, and latest frontend pass in Thai-first wording for future agents.
- `memory/api-backend/current-direction.md` now describes API/backend direction in Thai-first wording while preserving exact route/env/provider terms.
- `qa:repo` is now available as a deterministic repo-owned gate that runs audits, helper tests, backend checks, frontend checks, and predeploy wiring without runtime smoke that needs a running backend/Postgres/browser.
- `qa:local` now reuses `qa:repo` and only appends runtime smoke (`smoke:doctor`, `smoke:local`, `api:smoke`), reducing duplicated QA script wiring while preserving local readiness coverage.
- CI secrets/predeploy jobs now install root dependencies before running repo-owned gates, and predeploy guards that both root install steps remain wired.
- GitHub Production Smoke input descriptions and validation messages for missing smoke/storage secrets are now Thai-first while preserving exact env names for debugging.
- GitHub Actions visible step names for CI and Production Smoke are Thai-first, with predeploy guarding the key workflow labels.
- Provider smoke guard regression tests now align with the current Thai-first retry wording for rate-limit provider failures.
- Frontend unexpected-error console labels across Workspace, Wallet, Admin Moderation, Prompt Inspector, Admin Evals, Character Lobby, and Relationship preset picker now use Thai-first diagnostics instead of `Load ... error` labels.
- Frontend route audit and bundle budget CLI output now report Thai-first pass/fail guidance while keeping exact file, route, and chunk names for debugging.
- Predeploy, API smoke, bundle budget, audit, eval, memory, knowledge, release handoff, route/menu, and deploy doctor self-test CLI summaries now use Thai-first pass/fail prefixes instead of `ok -` or `fail -`, with focused regression tests on the changed runners.
- Predeploy now verifies the Relationship Contract Thai-first regression guard remains wired into the frontend static audit source and tests.
- Frontend Thai polish now removes mixed English debug wording such as prompt-control, token budget, relationship state, scene state, system relationship, anchor, hook, fallback, disabled, and eval from user-facing admin/chat surfaces plus route/menu docs; static audit and predeploy guard those phrases from returning.
- Frontend Redux fallback errors for failed character/chat loading are now Thai-first, and the static audit blocks the old `Could not load...` copy from returning.
- Frontend auth and Redux load failures no longer surface raw provider/browser English error messages directly; they now map to Thai-first user-facing notes, and frontend static/predeploy guards block the old raw-error patterns from returning.
- Frontend AuthPanel and chat workspace auth refresh now catch Supabase/session failures, log only safe summaries through `logUnexpectedError`, and show Thai retry notes instead of leaving unhandled promise rejections.
- Predeploy now checks AuthPanel and workspace auth failure wiring so the safe Supabase/session fallback behavior stays repo-owned.
- Frontend API fallback errors now use Thai-first `ApiError` messages when a backend response has no JSON error string, and the static audit blocks stale `failed with status` wording from returning.
- Frontend `ApiError` now prefers backend `message` fields before machine-readable `error` codes, falls back to Thai-first retry copy when `message` is missing, and keeps raw backend codes in `payload` only; `frontend:api:test` plus the static audit block raw `payload.error` display regressions.
- Backend chat validation/access/token/rating/empty-provider fallback replies now use centralized Thai-first copy, and short-reply continuation skips those operational replies instead of trying to extend them as roleplay.
- Backend `/chat` route-level fallback reply now uses Thai-first temporary-service-failure copy instead of the old English AI-service message, with focused runtime regression coverage.
- Backend runtime console error labels for chat, chat streaming, avatar upload, and avatar resolving now use Thai-first wording.
- Backend runtime console warning/error labels now avoid stale `Roleplay continuation failed` and `avatar` wording in chat continuation and upload routes.
- Backend rate-limit responses now keep the machine-readable `rate_limited` code while returning a Thai-first user message.
- Backend avatar storage failures now return Thai-first messages for Supabase configuration, upload, signed URL, and route-level storage-unavailable cases.
- Backend avatar upload validation now returns Thai-first messages for missing files, unsupported file types, oversized files, and avatar-not-found responses.
- Backend invalid UUID route guard now returns Thai-first messages for character, chat, lore, report, user, and parent-lore ids while keeping machine-readable error codes.
- Backend chat route persistence and not-found errors now return Thai-first `message` fields while preserving machine-readable `database_not_configured` and `chat_not_found` codes for frontend handling.
- Backend character route persistence, unauthorized, create-failed, not-found, and forbidden errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend lore route persistence, not-found, forbidden, and create-failed errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend report route validation, access, persistence, not-found, and admin-action errors now return Thai-first `message` fields while preserving machine-readable codes for frontend handling.
- Backend admin summary/token/audit/eval/prompt-inspector routes now return Thai-first `message` fields for access, persistence, unavailable, and token-adjustment errors while preserving machine-readable codes.
- Backend user usage/content-settings/persona routes now share centralized Thai-first `message` fields for persistence and user-not-found errors.
- Backend route error fallback now returns a generic Thai retry message for unmapped codes instead of mislabeling non-ID failures as invalid IDs; explicit ID guards still use `invalid_id`.
- Backend production auth failures now return Thai-first 401 messages for missing login and invalid/expired Supabase tokens.
- Backend Supabase JWKS fetch failure logs now use Thai-first wording while preserving the HTTP status for debugging.
- Frontend content rating labels shown in Explore/Character Lobby are now Thai-first, and the static audit blocks stale `Teen romance`, `Mature 18+`, and `Restricted 18+` labels from returning.
- Chat selection accessibility labels in the sidebar and My Chats are now Thai-first, and the static audit blocks stale `Select chat` labels from returning.
- Admin summary top-character rows now show Thai-first character status labels and Thai dashboard/lore wording instead of raw enum/mixed labels.
- Chat role panel now shows Thai-first character publication and visibility labels instead of raw `DRAFT`/`PRIVATE` enum values.
- Character publication and visibility labels are now centralized in `characterLabels.ts` so Admin Summary, Chat role panel, Character List, and Character Manager share the same Thai display names.
- Creator Studio and chat/admin status copy now avoid mixed English operational wording such as `image provider`, `production`, `backend`, `Lobby`, and raw `prompt` in user-facing Thai copy, with frontend static/predeploy guards for those stale phrases.
- Admin Health copy now maps visible operational wording to Thai-first terms for backend/frontend/provider/environment/checklist/final-gate guidance while preserving exact env names and commands.
- Admin Health live chat/image guidance now avoids raw `usage.providerFailure`, `billing/quota limit`, `local/dev`, and reversed `production/staging` wording in visible helper copy, with frontend static audit coverage.
- Backend Creator Draft image status and warning messages now return Thai-first user-facing copy for missing/configured/failed image provider paths while preserving actionable smoke/env guidance.
- Backend Creator Draft provider failure fallbacks now use Thai-first `ไม่ทราบสาเหตุ` for non-Error failures instead of leaking `unknown error`, with focused service coverage.
- Creator Draft non-Error provider failure test now casts the fetch mock through `unknown` so current TypeScript/Bun fetch types pass `backend:check`.
- Backend relationship tag validation messages now return Thai-first creator warnings for adult-mode conflicts, no-romance/romance conflicts, progression-speed conflicts, safety-tone conflicts, and too-many-engine-tag guidance.
- Backend character quality review notes now return Thai-first creator guidance for missing name/tagline/description/biography/scenario/system prompt/compact prompt/greeting/tags.
- Backend runtime env validation, health readiness failures, security posture details, deploy readiness blockers, deploy status output, and smoke doctor blocker output now use Thai-first copy while preserving exact env names, commands, and provider names.
- Deploy env doctor image-key diagnostics now use Thai-first wording for missing, valid, short, misrouted OpenRouter, and unknown provider key shapes while preserving exact env names.
- Runtime env validation and deploy env doctor now describe placeholder database credentials as leftover example values instead of mixed English `placeholder credentials` wording.
- Deploy readiness and backend readiness failures now use Thai-first provider labels for live chat verification, live image verification, and missing image-generation setup.
- Deploy readiness next-step fixes now avoid mixed `backend host secrets`, `placeholder value`, and `backend production environment` wording while preserving exact env names.
- Staging/production docs now describe live chat/image provider blockers with Thai-first billing, quota, providerFailure, and placeholder guidance while preserving exact commands and verification flags.
- Production setup docs now use Thai-first admin-key, backend/frontend env, OpenRouter, roleplay budget, retry, and Supabase signed-storage setup guidance while preserving exact env names and commands.
- Production setup docs now use Thai-first deployment-order, production check, staging verify, GitHub Production Smoke, smoke auth, production data safety, and readiness-note guidance while preserving exact env names, workflow inputs, and commands.
- Production setup Supabase storage and final-gate guidance now avoids stale English phrases such as `Development only`, `hard final gate`, and `gate fail` while preserving exact env names and blocker semantics.
- README, Deployment QA, Production Setup, and deploy blockers now use Thai-first live provider handoff wording for smoke wallet checks, `usage.providerFailure`, image billing/quota, and DB example-value rejection while preserving exact env names and commands.
- README, Deployment QA, and Production Setup live provider troubleshooting now describe outbound/network/log failures with Thai-first wording such as `การเชื่อมต่อออกไป OpenRouter` and `log ระบบหลังบ้าน`.
- README and API/backend handoff notes now avoid stale `backend root identity`, `smoke user`, `target environment`, and raw `wallet transaction` wording in live smoke guidance.
- Smoke doctor, deploy status, and readiness smoke failure guidance now use Thai-first local/staging/deploy fix wording while preserving exact commands, env names, and service identifiers.
- Smoke doctor and deploy status root/health failure hints now avoid mixed `วิธีแก้ local`, `วิธีแก้ deploy`, `backend root`, `deployed backend`, and `frontend/static proxy` wording while keeping `SMOKE_API_BASE_URL` and identity payload guidance exact.
- Deploy status runtime error prefixes now use Thai-first `ตรวจสถานะ deploy ไม่ผ่าน` wording while keeping JSON payload keys stable.
- Deploy readiness health rows now use Thai-first ready/default/unknown labels such as `พร้อม`, `ยังไม่พร้อม`, `ไม่ทราบ`, and `ค่าเริ่มต้น` while preserving exact row keys for CLI/dashboard parsing.
- Deploy blocker handoff memory now uses Thai-first headings, status, current-issue, required-action, and not-blocker wording while preserving exact env names, commands, and provider flags.
- Memory inbox and production checklist now use Thai-first handoff wording while preserving exact smoke/deploy commands, env names, and production-data safety warnings.
- Memory and knowledge README entry points now use Thai-first safety, update, layer, and runtime usage wording, with vault audits and predeploy guarding the Thai snippets.
- Root README entrypoint now uses Thai-first local setup, SocratiCode, memory, agent handoff, deploy status, knowledge layer, and eval layer wording while preserving exact commands, env names, and URLs.
- Root README production checklist and current verification sections now use Thai-first release handoff, env, smoke, local readiness, route/import/deploy checks, and staging gate guidance while preserving exact commands/env names.
- Deploy readiness and Production Setup release-handoff steps now avoid stale `deployed URLs`, `known limitations`, and related English handoff wording while preserving `RELEASE_HANDOFF.md` and go/no-go semantics.
- Root README evaluation, Prompt Inspector, local readiness, live smoke, production check, and staging verify guidance now avoids stale mixed-English handoff wording while preserving exact commands, routes, env names, and workflow semantics.
- Predeploy now checks the Thai-first README snippets for secret-pattern regression coverage and staging verify deploy-status guidance instead of the older English wording.
- Deployment QA handoff now uses Thai-first eval, smoke, GitHub Production Smoke, required production env, Supabase storage, mobile QA, and manual QA guidance while preserving exact commands, env names, route names, and workflow inputs.
- Staging runbook now uses Thai-first headings and staging CORS/provider/auth checklist wording while preserving exact deploy commands, env names, and `local/non-https CORS` guard phrase.
- Predeploy route/menu staging guard now tracks the Thai-first `Supabase สำหรับ Staging` heading.
- Backend and frontend app-level READMEs now describe Maprang-specific responsibilities, commands, env boundaries, and deployment references instead of stale Bun/Vite starter template text.
- Project map, UI/UX direction, and API/backend direction handoff docs now use Thai-first guidance while preserving route names, commands, and technical identifiers.
- API/backend, UI/UX, and deterministic eval decision notes now use Thai-first wording for prompt-control, token-budget, inspector, and eval concepts while preserving exact routes and command names.
- Knowledge wiki core pages now use Thai-first product, creator, relationship, and production deploy guidance while preserving structured knowledge paths and gate command names.
- Raw knowledge inbox and decision index now use Thai-first entry-point wording while preserving decision links and safety boundaries.
- Deploy status and smoke doctor text output now use Thai-first headers, no-blocker labels, fix sections, gate guidance, and next-step labels while keeping JSON/readiness keys stable.
- Decision records 0001-0005 now use Thai-first rationale and implementation notes for SocratiCode, memory vault, live provider verification, adult-mode warnings, and memory audit setup.
- Decision records 0006-0010 now use Thai-first rationale for runtime knowledge, deterministic evals, staged observability, Prompt Inspector, and Admin Automated Evals.
- Decision records 0011-0014 now use Thai-first rationale for world state, usage/cost intelligence, prompt budgeting, and provider failure classification.
- Live chat and live image smoke failure output now uses Thai-first wording for provider failures, missing reply/id/usage, short replies, wallet debit mismatch, image placeholder fallback, missing image URLs, and SVG placeholder results.
- Live chat smoke provider-failure guidance now avoids stale `unknown`, `outbound network`, and `backend logs` wording while preserving exact provider/env identifiers such as OpenRouter and `CHAT_PROVIDER_LIVE_VERIFIED`.
- Live chat smoke token-balance, health, missing-character, short-reply, wallet-debit, and next-step messages now use Thai-first wording while preserving exact smoke/env identifiers.
- Smoke doctor now warns about missing image-generation configuration with Thai-first Creator Studio placeholder guidance.
- Smoke doctor roleplay reply-budget recommendation warnings now use Thai-first wording while preserving exact budget values and env names.
- Live chat smoke, image smoke, provider smoke guard hints, and API smoke image issue text now use Thai-first failure/fix wording while preserving exact verification flags, env names, commands, and provider terms.
- Live image/API smoke helper messages now avoid mixed English fix copy for missing image providers, billing, quota, invalid image keys, placeholder fallback, missing image URLs, and local SVG placeholders while preserving exact env names and commands.
- Local smoke helper failures for backend health, avatar upload shape/access, missing seed character, and relationship preview now use Thai-first CLI output, with `smoke:local:test` guarding the messages.
- Backend Prisma seed and QA seed CLI errors/status lines now use Thai-first output for missing `DATABASE_URL`, seed start, success, and failure messages.
- Backend DB-required check CLI now uses Thai-first failure/local/deploy guidance, with regression coverage in `backend:check:db:test`.
- Backend DB-required check CLI now avoids mixed `Database check`, `วิธีแก้ local`, `วิธีแก้ deploy`, `network access`, and `backend service` wording; `backend:check:db:test` guards the Thai-first text.
- Backend DB test gate skip/forced-failure guidance now uses Thai-first output for optional persistence suites, with focused regression coverage in `db.test-gate.test.ts`.
- Prompt tooling UI copy now uses Thai-first labels for system prompt reset, redacted prompt snapshots, runtime/persona inputs, section budget, and route/menu audit descriptions.
- Profile content settings, tag conflict helper warnings, Prompt Inspector helper labels, and route/menu staging rows now avoid mixed `backend`, `prompt`, `runtime`, `persona`, and staging/deploy wording in user-facing Thai copy; frontend static audit and predeploy guard those stale phrases.
- Predeploy now has its own regression test and is wired into local QA, CI, and Production Smoke so critical predeploy/e2e wording guards cannot drift silently.
- Browser smoke assertions now use Thai-first admin UI labels for Admin Health, Prompt Inspector, and Automated Evals, and the frontend static audit also blocks English admin checklist labels from returning.
- Backend Prompt Inspector now exposes an admin-only redacted prompt snapshot/diff endpoint for context debugging.
- Prompt Inspector now redacts secret-shaped values in retrieved lore keyword/alias/preview as well as final prompt and section content.
- Prompt Inspector warning messages returned to the admin UI are now Thai-first for redaction, oversized prompt, missing policy/runtime sections, and prompt-injection review hints.
- Frontend Prompt Inspector page is available at `/admin/prompt-inspector` and is included in route/menu audit.
- Automated Evals are available through `/admin/evals` and `GET /admin/evals/local` using the same deterministic suite as `bun run eval:local`.
- Admin Health page renders production blockers and has no browser console errors.
- Admin Health deploy cards now show the next action for each blocker so staging setup can be followed directly from the UI.
- `staging:verify` is now the strict deployed-staging gate for real backend URL, CORS, signed storage, `/ready`, and admin smoke before provider verification.
- Route/menu audit exists and is wired into QA.
- Security audit, route audit, deploy env doctor self-test, and predeploy check pass.
- Project memory, runtime knowledge, and deterministic prompt/context evals are part of the local QA gate.
- Memory and knowledge vault audits now use Thai-first diagnostics for missing required files/snippets, secret-shaped content, local link escapes/breaks, structured knowledge errors, and pass/fail summaries.
- Backend health/readiness now reports structured knowledge pack status.
- Backend structured knowledge validation errors now use Thai-first messages for schemaVersion, required fields, item counts, and sandbox mode while keeping exact JSON field paths for debugging.
- Chat provider failures are typed as `providerFailure`, returned with zero usage/cost, surfaced in Chat UI, and read directly by live smoke scripts.
- Roleplay reply depth defaults now favor longer Thai roleplay turns: `MODEL_MAX_OUTPUT_TOKENS=1600`, `MODEL_MIN_ROLEPLAY_REPLY_CHARS=420`, stronger default system prompt guidance, and a larger continuation budget when the first reply is too short.
- Runtime prompt assembly และ structured chat style guide ตอนนี้ใช้เป้าหมายคำตอบโรลเพลย์ยาวขึ้นแบบเดียวกัน: 4-6 ย่อหน้าสั้น, อย่างน้อย 5 ประโยคสมบูรณ์, และโดยมากราว 8-14 ประโยค เว้นแต่ผู้เล่นขอให้สั้น.
- Deploy env doctor now fails production/staging envs with roleplay reply budget below the production baseline `MODEL_MAX_OUTPUT_TOKENS=1200` or `MODEL_MIN_ROLEPLAY_REPLY_CHARS=320`.
- Runtime production env validation now applies the same reply-budget baseline, so `/health`, `deploy:status`, and `production:check` surface thin-reply model settings even if `deploy:doctor` was not run first.
- Deploy readiness regression coverage now proves `/health` invalid env entries for thin roleplay reply budgets become staging and production blockers with concrete next-step output.
- Deploy env doctor now warns when production env uses the baseline 1200/320 roleplay reply budget instead of the richer recommended 1600/420, while still failing values below baseline.
- Deploy env doctor roleplay reply budget failures and recommendations now use Thai-first output, with predeploy guarding the Thai wording.
- `smoke:doctor` now warns only when roleplay reply budget passes the 1200/320 production baseline but remains below the richer 1600/420 recommendation, leaving below-baseline values to the readiness blocker output.
- `deploy:status` regression coverage now verifies invalid roleplay reply budget env from `/health` appears in both JSON and text readiness output and blocks staging/production readiness.
- Admin Health now distinguishes the minimum reply-budget baseline from the recommended richer roleplay target, so environments at 1200/320 still get a next action to move toward 1600/420.
- Relationship ladder now supports the expanded Thai seed set from hostile to committed routes: enemy, disliked, rival, bickering rival, acquaintance, friend, close friend, ride-or-die, crush, friend-crush, dating trial, talking stage, partner, toxic partner, lover, life partner, spouse, toxic spouse, and soulmate.
- Frontend relationship status labels are centralized so Explore, Chat, My Chats, Events, Relationship preview, and debug panels use the same Thai display names.
- Frontend Redux slice selectors now import shared store types from `store/types.ts` instead of importing `store.ts`, removing the six frontend circular dependency chains that SocratiCode reported for store -> slice -> store.
- Backend character relationship types now live in `character.types.ts`, and avatar upload root resolution no longer trips the static import graph; SocratiCode reports no circular dependencies.
- Import-cycle architecture audit is now repo-owned through `bun run import-cycle:audit` and `bun run import-cycle:audit:test`, wired into local QA, CI, Production Smoke, and predeploy guard checks; it now catches static imports, re-exports, dynamic imports, TypeScript import-equals `require()`, and CommonJS `require()` calls, with predeploy guarding the audit logic, regression test, and deployment QA docs.
- Relationship presets now expose API surfaces: `contract` for Character Lobby relationship contracts and `creator` for Creator Studio tag presets. Character Lobby loads `contract` from the backend and falls back to local copy only if the API is unavailable. Backend tests and API smoke verify that contract excludes creator-only presets while Creator Studio keeps them available.
- Agent handoff docs are now available through `AGENTS.md` and canonical `agent.md`, and `predeploy:check` verifies the guide exists with required scope, continuation, minimum-check, commit/push, and operating sections.
- Deploy readiness logic is shared by `smoke:doctor` and `deploy:status`, and covered by `deploy:readiness:test`, so current staging/production blockers and next steps can be printed without duplicating blocker rules.
- `smoke:doctor` now validates backend root identity before `/health`, and its importable runner can be tested without calling a live backend.
- Deploy readiness blocks CORS that is empty, local, or non-https; staging and production must use the real HTTPS frontend domain.
- Deploy readiness next-step text now describes backend/frontend URLs and production domains Thai-first while preserving exact env names and commands.
- Render deploy documentation now uses HTTPS-only frontend/backend placeholders and predeploy verifies the Render CORS warning cannot drift back to localhost/http/wildcard examples.
- Render deploy documentation now uses Thai-first setup, migration, Supabase storage, and smoke-test guidance while predeploy still guards `/ready`, signed storage, image provider, and HTTPS-only CORS wording.
- Render deploy guide now uses Thai-first backend/frontend env labels and CORS update wording while preserving exact Render field names and command/env snippets.
- Staging and production setup docs now use the same local/non-https CORS language that deploy readiness enforces.
- Canonical agent guide production blockers now require deployed HTTPS backend and frontend CORS origins, and predeploy checks the wording.
- `smoke:doctor` now prints the same ordered deploy next steps as `deploy:status`.
- `deploy:status --json` now exposes top-level staging/production ready flags and blocker counts for CI/dashboard automation.
- CI runs deploy readiness self-test, and the manual Production Smoke workflow prints `deploy:status` before strict production checks.
- Local `staging:verify` and `production:check` now print `deploy:status` before strict smoke gates, so failed staging/production runs include blocker details and next steps in the same CLI log.
- README and predeploy guard now document and enforce the same deploy-status-first behavior for CLI staging/production gates.
- Deployment QA automated-checks section now uses Thai-first local/staging/live gate guidance while preserving exact commands, env names, and smoke responsibilities.
- `RELEASE_HANDOFF.md` is available as the no-secrets final release handoff template, and predeploy checks verify it stays documented.
- `release:handoff:check` verifies the release handoff template and can require all handoff fields with `--filled` before sharing a real release note.
- `release:handoff:test` covers filled handoff validation, blank-field detection, secret-shaped value detection, and the importable release handoff runner.
- Secret audits share `scripts/secret-patterns.ts` and catch private key blocks, GitHub tokens, Google API keys, and Slack tokens across repo, memory, knowledge, and release handoff checks.
- Secret scan and release handoff checks now use Thai-first diagnostics for tracked env files, detected secret-shaped values, missing handoff sections, blank filled-mode fields, and pass/fail summaries.
- Release handoff template now uses Thai-first section names and field labels, and the release handoff checker/predeploy guard now require those Thai-first sections while still preserving exact command/env names.
- `secrets:check` now fails on tracked `.env`/`.env.*` files while still ignoring untracked local env files used for development, and exports an importable runner for CI/dashboard reuse.
- `.gitignore` ignores real `.env.*` files while allowing `.env.example` and `.env.production.example` templates; predeploy verifies this rule.
- `secrets:patterns:test` now locks the split between strict repo secret scanning and stricter memory/release handoff scanning, and it runs inside `qa:local`, CI, and Production Smoke.
- `predeploy:check` verifies the shared secret pattern source, regression test, and QA documentation so secret-audit wiring cannot drift silently.
- `predeploy:check` verifies backend security audit keeps the route error response and routeErrorResponse mapping guards wired.
- CI predeploy now runs the release handoff check, self-test, and secret pattern regression test directly, not only through `qa:local`.
- CI predeploy now runs security, API route, and route/menu static audits directly before deploy checks.
- API route audit now auto-discovers `apps/backend/index.ts` plus backend `*.routes.ts` files and covers `GET /`, while API smoke, local smoke, and browser e2e smoke verify the backend root identity response before deeper checks, so new route files and the backend root endpoint cannot drift outside the coverage map; route audit regression tests lock this behavior.
- API route audit Creator AI draft coverage note now uses Thai-first image live-smoke wording for real provider readiness.
- API route audit CLI output now reports discovered route counts, missing coverage, stale coverage, weak coverage, and pass status in Thai-first wording.
- Security audit now scans the backend entrypoint as well as backend source/prisma files, so route/security logic added to `apps/backend/index.ts` is covered before deploy.
- Security audit now also checks that every backend `/admin` route block contains `requireAdminApiKey`, catching missing admin guards before deploy.
- Security audit now also checks that backend `/:id` route blocks contain `rejectInvalidUuid` before resource access.
- Security audit now also blocks backend route files from returning raw error objects, including literal or dynamic `{ error: ... }` responses, without a Thai-first `message` or `routeErrorResponse` helper.
- Security audit now verifies every literal `routeErrorResponse('code')` call is backed by an explicit `routeErrorMessages` entry, preventing new codes from falling back to a generic invalid-id message.
- Backend security audit and import-cycle audit CLI output now use Thai-first pass/fail guidance while preserving exact helper, route, file, and graph names for debugging.
- Security audit regression tests now cover unsafe raw SQL helpers, tagged raw SQL allowance, missing admin guards, missing UUID guards, and the importable backend security audit runner, and run in local QA, CI, and Production Smoke.
- Manual Production Smoke now runs predeploy and release handoff guards before validating deployed smoke secrets or spending provider credits.
- Manual Production Smoke also runs secrets, secret pattern tests, memory, knowledge, eval, security, API route, and route/menu audits before deployed smoke validation.
- Manual Production Smoke now also runs deploy readiness, deploy status, and deploy env doctor regression/self-tests before validating deployed smoke secrets or spending provider credits.
- API smoke with admin auth now covers non-mutating admin report PATCH/action validation so moderation admin routes are exercised without resolving or hiding real production records.
- API smoke with admin auth now covers non-mutating wallet token route validation so the admin wallet route is exercised without changing balances.
- API smoke now covers non-mutating report creation validation with SQL-like character ids before persistence.
- API smoke now covers the uncharged `POST /chat` validation path before the live-provider-only chat smoke.
- API smoke validation-path provider-failure errors now use Thai-first diagnostics for both normal chat and stream validation checks.
- API smoke now covers non-mutating delete-chat validation so the delete route is exercised without removing real chats.
- API smoke invalid-id checks now require Thai-first `message` fields as well as machine-readable error codes for chat delete, report creation, admin wallet, and admin report validation paths.
- API route audit regression tests now cover route discovery, missing/stale/empty coverage entries, and the importable route audit runner, and run in local QA, CI, and Production Smoke.
- Frontend bundle budget regression tests now cover main/chat chunk detection, split-route missing failures, oversized chunk reporting, human-readable KB formatting, and the importable bundle budget runner.
- Frontend static audit regression tests now cover button type/accessible-name rules plus placeholder links, empty handlers, not-implemented errors, line-number reporting, and the importable static audit runner.
- Frontend static audit now has explicit regression coverage for Thai coming-soon placeholder copy, replacement characters, C1 control characters, and common Thai UTF-8 mojibake sequences before they can reach frontend source.
- Admin Health/System Status UI copy now removes leftover English operational labels such as Knowledge pack, Production gates, Local readiness, and staging/future gate, with frontend static audit coverage guarding those Thai-first labels.
- Frontend route audit regression tests now cover declared React Router paths, dynamic route matching, static link normalization, missing route detection for `to`, `href`, and `navigate`, and the importable route audit runner.
- Route/menu doc-check regression tests now cover Markdown table parsing, route/menu/app/preload alignment, missing navigation coverage, empty field detection, status label guards, and the importable route/menu doc-check runner.
- Smoke helper regression tests now cover local target defaults, deployed target auth behavior, explicit smoke user/token/admin headers, and JSON payload formatting.
- Smoke helper regression tests now also centralize backend root identity validation used by API smoke and local smoke.
- Provider smoke guard regression tests now cover live chat minimum token thresholds, provider failure messaging, live image opt-in detection, and image provider failure hints before any verification flag can be set.
- Deploy status now validates backend root identity before `/health`, and regression tests cover JSON readiness counts, text blocker output, health failure reporting, root preflight, and the importable deploy status runner without calling a live backend.
- Deploy status helpers no longer default the root identity to `maprang-backend` unless the runner/test supplies an actual root preflight result, so helper-only output cannot imply the backend root was verified.
- Readiness smoke now validates backend root identity before `/ready`; regression tests cover the root preflight, `/ready` summary output, failure visibility, readiness status fallback, and the importable readiness smoke runner without calling a live backend.
- Shared smoke helper failures for backend root identity, backend reachability, non-OK responses, and non-JSON responses now use Thai-first diagnostics across local/API/live smoke scripts.
- Shared smoke helper and readiness smoke diagnostics now avoid mixed `backend`, `network`, `status`, and `empty response` wording in common connection/root-identity failures while keeping exact routes and env names.
- Shared smoke helper fetch failures now translate common connection refused/timeout reasons to Thai-first diagnostics before smoke doctor/local/API smoke output.
- Memory/knowledge vault audits now share Markdown link/include helpers, and both memory and knowledge audits export importable runners covered by regression tests for required snippets, local link collection, vault-boundary checks, full memory audit output, and full knowledge audit output.
- Backend DB check planning is covered by `backend:check:db:test`, ensuring DB availability is checked before backend tests run with `REQUIRE_DB_TESTS=true`, and the DB check command plan has an importable runner for CI/dashboard reuse.
- Supabase signed-storage setup now exports testable helpers and an importable setup runner for env loading, config validation, bucket privacy checks, smoke object upload/sign/cleanup flow, signed URL normalization, and object path encoding; `supabase:storage:test` covers them with fake operations without hitting Supabase.
- Supabase signed-storage setup failures now use Thai-first guidance for missing env, signed-access requirements, bucket privacy, signed URL, upload, fetch, and cleanup errors.
- Supabase signed-storage setup runtime errors now avoid stale `status`, `smoke avatar`, `project`, `setup`, and `update` wording while preserving exact bucket and signed URL terms.
- Local smoke now exports testable helpers and an importable smoke runner for smoke character selection, avatar upload validation, cleanup, and QA summary formatting; `smoke:local:test` covers them without hitting the backend.
- Browser e2e smoke now exports a testable command plan, and `e2e:smoke:test` guards seed reset, Playwright execution, and seed restore ordering without launching the browser.
- E2E smoke command labels and failure text now use Thai-first wording while preserving the QA seed and Playwright identifiers.
- Secret scanning now exports path-rule helpers, and `secrets:check:test` guards tracked `.env` rejection plus source/docs/config scan selection.
- Local eval CLI now exports output formatting helpers, and `eval:local:test` guards pass/fail summary output without rerunning the deterministic prompt suite.
- Local eval CLI pass/fail summaries and prompt token estimates now use Thai-first output while preserving scenario ids for debugging.
- Smoke doctor now exports a report builder, and `smoke:doctor:test` guards staging blocker next steps, strict staging failure, and backend health failure output without calling a live backend.
- Image smoke now exports fallback/live payload helpers and an importable smoke runner, and `smoke:image:test` guards skipped live-image output plus placeholder/no-URL/SVG failure handling without spending provider credits.
- Image smoke placeholder fallback without provider warning/note now reports Thai-first missing-detail copy instead of `no warnings`, with `smoke:image:test` coverage.
- Live chat smoke now exports validation/payload helpers and an importable smoke runner, and `smoke:chat:test` guards provider-failure precedence, token threshold checks, wallet debit matching, and success payload formatting without spending provider credits.
- Deploy env doctor now keeps core parsing/env/JWT helpers import-safe, exports a callable `runDeployEnvDoctor` runner for dashboard/admin reuse, and `deploy:doctor:test` guards both helpers and full-run output without reading real production env files.
- Deploy env doctor self-test now exports `runDeployEnvDoctorSelfTest`, keeping the file import-safe while preserving the CLI self-test used by `qa:local` and Production Smoke.
- Smoke doctor success output and deploy env doctor self-test diagnostics now use Thai-first pass/fail wording while preserving exact command and env names.
- Deploy env doctor text output now uses Thai-first heading, env file labels, and area labels while keeping JSON keys such as `backendEnv` and `frontendEnv` stable for automation.
- API smoke now reuses the shared live chat/image provider helpers so live chat provider failures are reported before empty-reply checks and image failure hints stay aligned across smoke scripts.
- Live chat and live image smoke now validate backend root identity before health/provider checks, preventing provider credits from being spent against the wrong deployed target.
- API smoke readiness/image helper logic now lives in `scripts/api-smoke-helpers.ts`, and the main smoke flow exports importable `runApiSmoke` plus `buildApiSmokeSummary` helpers so CI/dashboard code can import and summarize smoke output without executing network checks; `api:smoke:test` guards live-verification-only readiness, image provider hints, safe JSON parsing, summary counts, and runner import safety without hitting a backend.
- API smoke endpoint assertion diagnostics now use Thai-first wording for health/readiness, wallet usage, persona, relationship presets, character/lore CRUD, chat/menu/world-state validation, admin checks, SSE parsing, and expected-error validation while preserving exact endpoint names and machine-readable codes.
- API smoke readiness and Creator Draft image-detail output now use Thai-first wording for live-provider continuation, draft source, image provider state, and local image-provider skips, with `api:smoke:test` guarding the old mixed wording from returning.
- API smoke readiness and expected-error fallbacks now avoid `status`, `empty response`, `unknown`, and `missing` wording in visible failure messages.
- API smoke result rows now format statuses as Thai labels (`ผ่าน`, `เตือน`, `ไม่ผ่าน`, `ข้าม`) instead of `PASS/WARN/FAIL/SKIP`, with `api:smoke:test` guarding the mapping.
- Production checklist memory now includes deploy doctor/status review, live API smoke, and production-data safety guidance, and predeploy guards those handoff notes from drifting.
- Production deploy knowledge wiki now documents reply-budget baselines/recommendations and the deploy-status-first staging gate order.
- Production deploy knowledge wiki now uses Thai-first deploy gate wording for real backend/frontend URLs, production CORS, signed avatar storage, live chat/image provider smoke, and staging verification while preserving exact command/env names.
- API route coverage notes now use Thai-first descriptions for root identity, health/ready checks, wallet/profile, relationship, chat, storage, moderation, Prompt Inspector, and eval routes while preserving exact command names and route identifiers.
- API route audit CLI heading, failure headings, and pass summary now use Thai-first output while keeping route keys and owner names stable for debugging.

## สถานะ production ปัจจุบัน

สถานะ: ยังถูกกั้นด้วย environment จริงและการยืนยันผู้ให้บริการจริง

ตัวกั้นที่รู้แล้ว:
- Backend URL ใน smoke environment ปัจจุบันยังเป็น local.
- Frontend backend URL ใน smoke environment ปัจจุบันยังเป็น local.
- `CORS_ORIGINS` ใน smoke environment ปัจจุบันยังเป็น local/non-production.
- ผู้ให้บริการแชทต้องผ่าน live smoke แบบเสถียรก่อนตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`.
- live smoke ของผู้ให้บริการสร้างรูปยังติด billing hard limit ให้คง `IMAGE_GENERATION_LIVE_VERIFIED=0`.
- Structured knowledge ต้องยังผ่าน `bun run knowledge:audit` ก่อน deploy.
- Prompt/context assembly ต้องยังผ่าน `bun run eval:local` ก่อน deploy.

## ขั้นตอนสำคัญถัดไป

1. Deploy backend และ frontend staging.
2. ตั้ง staging URLs จริงและ CORS แบบ HTTPS-only ให้เหมือน production.
3. รัน `staging:verify` กับ backend staging ที่ deploy แล้ว.
4. รัน smoke ผู้ให้บริการจริงกับ staging ตามลำดับ โดยแนะนำ `api:smoke:live`.
5. ตั้ง verification flags หลัง live smoke ผ่านจริงเท่านั้น.
6. รัน `production:check` ซ้ำ.

## บันทึกเดิมก่อนรอบ 2026-05-21

- Signed-storage handoff wording, release handoff stale-label guard, stream chat validation guard, และ API smoke stream diagnostics ถูกปิดแล้ว; `qa:repo` ล่าสุดผ่านเต็มด้วย backend tests 153 pass และ frontend build/bundle ผ่าน.
- Runtime context, Prompt Inspector, local eval fixture, และ promptfoo roleplay template ใช้หัวข้อพรอมป์แบบ Thai-first แล้ว: `กฎคุมพรอมป์ของแพลตฟอร์ม`, `คลังความรู้ที่เกี่ยวข้อง`, `คำสั่งขณะรัน`, `ความจำขณะรัน`, และ `ข้อความผู้ใช้`.
- `predeploy:check` เพิ่ม guard เพื่อบังคับหัวข้อพรอมป์ไทย-first ใน `context.service.ts` และ `prompt-inspector.service.ts` พร้อมกัน old English headings เช่น `Platform prompt-control policy`, `Runtime instructions`, `Runtime memory`, และ `User message` ไม่ให้กลับมาใน runtime source.
- Backend runtime prompt copy สำหรับ default assistant, continuation instruction, Creator Draft, Scene Engine, และ local eval fixture ถูกปรับเป็น Thai-first แล้ว โดยยังคง schema keys, env names, และ command names เป็นอังกฤษเท่าที่จำเป็นต่อระบบ.
- Relationship Engine hidden prompt guidance ตอนนี้ใช้ Thai-first สำหรับ prompt profile และ relationship state block แล้ว โดยยังคง machine values เช่น `status`, `tone`, `affinity`, และ hook codes ไว้เพื่อให้ระบบ parse/debug ได้เสถียร.
- Relationship timeline summaries ที่ถูกบันทึกกลับเข้า runtime memory ตอนนี้เป็น Thai-first สำหรับ vulnerability, pressure, และ scene outcome summaries แล้ว.
- Local eval fixture และ evaluator diagnostics ใน `eval.service.ts` เป็น Thai-first แล้ว ทั้งตัวละครทดสอบ, required/forbidden/lore checks, section order, และ token budget details.
- `evals/README.md` และ metadata ของ `evals/promptfoo.roleplay.yaml` ใช้คำอธิบาย Thai-first แล้ว โดยยังคงชื่อเครื่องมือ `Promptfoo`, commands, และชื่อไฟล์เดิมเพื่อให้ค้นหา/รันได้เหมือนเดิม.
