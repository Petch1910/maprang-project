# เช็กลิสต์ Deployment QA

ใช้เช็กลิสต์นี้ก่อนส่งแอปให้ tester หรือ deploy environment ใหม่.

## ตรวจอัตโนมัติ

รัน repo-owned deterministic gate ก่อนเมื่อยังไม่มี backend runtime, Postgres, หรือ staging URL จริง:

```bash
bun run qa:repo
```

`frontend:components:test` also covers Events Inbox pending-scene selector/page contracts so `/events` keeps playable scene filtering, list/group/row hooks, `/chat/:chatId` row navigation, and readable empty-state exits aligned with `qa:repo`.

`qa:repo` ครอบคลุม secrets, memory/knowledge/eval, static/security/API/menu audits, helper tests, backend tests, frontend build, และ predeploy wiring โดยไม่เรียก runtime smoke ที่ต้องมี service เปิดอยู่.

`qa:repo` ยังรัน `tests:audit` และ `tests:audit:test` เพื่อกัน test orphan: ไฟล์ทดสอบใหม่ใน `scripts/` หรือ `apps/frontend/tests/` ต้องมี root script รันตรง, root `*:test` ต้องถูกเรียกจาก `qa:repo`, backend tests ต้องผ่าน `backend:check`, และ browser e2e specs ต้องอยู่หลัง `e2e:smoke`.

รัน full local gate เมื่อ Postgres, backend, และ frontend พร้อม:

```bash
bun run qa:local
```

`qa:local` ใช้ `qa:repo` เป็นฐานก่อน แล้วรัน `qa:seed` เพื่อเตรียม QA seed data จากนั้นค่อยเพิ่ม runtime smoke ที่ต้องมี backend/Postgres จริง ได้แก่ `smoke:doctor`, `smoke:local`, และ `api:smoke`. ตอนนี้ `smoke:local` ตรวจ local wallet/profile/moderation/creator/runtime ด้วย: ต้องอ่าน `GET /me/usage` ได้พร้อม `tokenBalance`, usage summary, กราฟ usage 7 วัน, และรายการกระเป๋า, ต้องอ่าน `GET /me/content-settings` กับ `GET /me/persona` ได้พร้อมเรตเนื้อหาและ persona limit, ต้องอ่าน `GET /admin/reports?limit=5` และ `GET /admin/audit-logs?limit=5` ได้พร้อม array shape เมื่อมี `SMOKE_ADMIN_API_KEY` หรือเมื่อ local loopback smoke อ่าน `ADMIN_API_KEY` จาก `apps/backend/.env` ได้, ต้องยิง `POST /creator/ai-draft` แบบ `imageOnly` + `skipImageProvider` แล้วได้ draft fallback พร้อมรูป placeholder, ต้องยิง `POST /creator/preview-chat` แบบ `skipProvider` แล้วได้คำตอบลองบท, `source=local`, `modelName=local/preview`, usage/prompt/warnings shape ครบ จากนั้นเมื่อ `/health` รายงานว่า active runtime เป็น local ต้องยิง `POST /chat` และ `POST /chat/stream` ได้, ได้ `chatId`, คำตอบยาวถึง `MODEL_MIN_ROLEPLAY_REPLY_CHARS` หรือขั้นต่ำ 420 ตัวอักษร, stream ต้องมี delta/done event, คืน model local ที่คาดไว้, ไม่คิดโทเคน provider, และต้องคืน runtime memory ที่มี `sceneState.mode`, pending scene event อย่างน้อย 1 รายการจาก seed `soulmate`, `relationshipState.status`, และ `relationshipState.events`. หลังสร้างแชท local ต้องอ่าน `GET /chats`, `GET /chats/:id/messages?limit=5`, และ `PATCH/GET /chats/:id/world-state` ได้พร้อมรายการแชท, `messageWindow`, และ world state ที่บันทึกกลับมา.

Gate นี้ไม่เรียก live AI provider. มันตรวจ secrets ที่ commit แล้ว, regression ของเส้นทาง secret scan, coverage mapping ของ API route, architecture import cycles, helper tests ของ API smoke, memory/knowledge vault, output ของ local eval, error message ฝั่ง frontend API, bundle/static/route และ route/menu audits, smoke auth, provider guards, smoke doctor blockers, readiness summary, image fallback, validation ของการทดสอบแชทจริง, helper ของ local smoke, command plan ของ e2e smoke ฝั่งเบราว์เซอร์, predeploy wiring, DB-required backend check planning, Supabase signed-storage helpers, deploy status formatting, deploy env doctor helpers, deploy configuration, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, saved chat list/message window, chat world state, moderation report/audit snapshot เมื่อมี admin smoke key หรือ local loopback `ADMIN_API_KEY`, Creator Preview simulator, runtime flows ของ character/lore ชั่วคราว, avatar upload, และ local chat normal/stream runtime เมื่อ backend health รายงาน `chatRuntimeProvider=local`. Local API smoke ยังส่ง `skipImageProvider=true` สำหรับ creator draft checks จึงตรวจ endpoint shape ได้โดยไม่ใช้เครดิตสร้างรูป; การสร้างรูปจริงอยู่ใน `api:smoke:live`, `smoke:image:live`, และ `production:check`.
ใน local runtime, `api:smoke` จะเพิ่ม `POST /chat local QA` และ `POST /chat/stream local QA` เพื่อยืนยัน `local/mock-roleplay`, `totalTokens=0`, ไม่มี provider failure, มีคำตอบ roleplay ที่ยาวพอ, และมี streamed delta จริง ก่อนยังคงข้ามเฉพาะ live provider routes ที่ต้องรันกับ staging/production.
`smoke:doctor` และ `deploy:status --json` จะรายงาน local runtime fields คือ `chatRuntimeProvider`, `chatLocalFallbackEnabled`, `chatForcedLocal`, และ `chatLocalModel`; ถ้า `chatRuntimeProvider=local` หรือ `chatForcedLocal=true` ให้ถือว่า local QA ใช้งานได้ แต่ staging/production ยังต้องรัน live provider smoke แยก.
Real `.env` และ `.env.*` files ต้องไม่ถูก track. `secrets:check` จะ ignore local untracked env files เพื่อความสะดวกของ developer แต่จะ fail ถ้าไฟล์นั้นถูก commit หรือ tracked.

ถ้าต้องการตรวจ backend API coverage และ frontend API helper contract โดยไม่รัน full suite:

```bash
bun run api:audit
```

`api:audit` อ่าน backend route files และ `apps/frontend/src/lib/api.ts` แล้วจะ fail ถ้ามี backend route ที่ยังไม่มี documented automated/manual coverage path หรือมี frontend helper ที่เรียก `requestJson`/`fetch(API_BASE_URL...)` ไปยัง method/path ที่ backend ไม่ได้ประกาศไว้. มันตั้งใจแยกจาก `api:smoke`: audit ตอบคำถามว่า “ทุก endpoint ถูกนับใน coverage และ frontend เรียก route ที่มีอยู่จริงแล้วหรือยัง?” ส่วน smoke ตอบว่า “runtime paths สำคัญยังทำงานตอนนี้ไหม?” Coverage entry ต้องมีคุณภาพพอด้วย: admin route ต้องมี `admin-smoke`, live-provider route เช่น `POST /chat`, `POST /chat/stream`, และ `POST /creator/ai-draft` ต้องมี `live-smoke`, `manual-production` ห้ามเป็น coverage เดี่ยว, และ coverage note ต้องไม่ว่าง; failure จะแสดง weak coverage reason ต่อ route.

ถ้าไม่ได้ตั้ง `SMOKE_API_BASE_URL`, smoke/deploy CLIs จะอ่าน `PORT` จาก `apps/backend/.env` ให้อัตโนมัติสำหรับ local runtime เช่น `PORT=3001`; staging/production ยังต้องตั้ง `SMOKE_API_BASE_URL` เป็น deployed HTTPS backend origin เองเสมอ.

ถ้าต้องการตรวจ imports ของ app, QA script, seed, และ e2e source ว่ามี circular dependencies หรือไม่:

```bash
bun run import-cycle:audit
```

ถ้าต้องการตรวจ frontend static/control และ route wiring แยกจาก full gate:

```bash
bun run frontend:static:audit
bun run frontend:route:audit
```

Frontend state regression tests that workflow gates run directly:

```bash
bun run frontend:env:test
bun run frontend:storage:test
bun run frontend:clipboard:test
```

This set covers Supabase JWT/env parsing, localStorage persisted state, and clipboard helpers so deployed QA does not drift behind `qa:repo`.

alias สองตัวนี้รันจาก repo root ได้ตรง ๆ และถูกครอบใน `qa:repo`, CI, และ Production Smoke เพื่อให้ local gate กับ workflow ใช้ audit ชุดเดียวกัน.

`import-cycle:audit` scan relative TypeScript imports, re-exports, dynamic imports, TypeScript import-equals `require()`, และ CommonJS `require()` calls ใน backend, frontend, scripts, seed data, Playwright config, และ e2e smoke files. คำสั่งนี้อยู่ใน `qa:local`, CI, และ Production Smoke เพื่อกัน architecture cycles กลับมาแบบเงียบ ๆ.

ถ้าต้องการตรวจว่าเอกสารหลักและ GitHub Actions อ้าง `bun run ...` ตรงกับ package context จริง:

```bash
bun run docs:commands
```

`docs:commands` ตรวจ root docs, app READMEs, release/deploy handoff, route/menu audit, staging/production runbooks, และ workflow เพื่อกันคำสั่งที่ไม่มีอยู่จริง เช่น command ของ root หลุดไปอยู่ใน README ของ app package, command ของ app ถูกเขียนเหมือนรันจาก repo root, หรือ CI job อ้าง script ผิด `working-directory`.

Test plan source-of-truth guard:

```bash
bun run test-plan:audit
```

`test-plan:audit` keeps `docs/MAPRANG_TEST_PLAN.md`, `START_HERE.md`, `RUN_NOW.md`, and `HOW_TO_RUN.md` aligned with the real React 19/Vite/Redux Toolkit + Elysia/Prisma/PostgreSQL baseline, the current route/product-surface split, local/mock-roleplay local QA, and explicit staging/production blockers.

ถ้าต้องการตรวจ production env files ก่อน deploy โดยไม่พิมพ์ secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

สำหรับ early staging เท่านั้น ให้เพิ่ม `--allow-unverified-image` จนกว่าการทดสอบสร้างรูปจริงจะผ่านและตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`.

ถ้าต้องการสรุป backend deploy readiness และ next steps ปัจจุบันโดยไม่ fail กับ staging/provider blockers ที่คาดไว้:

```bash
bun run deploy:status
```

สำหรับ CI logs หรือ dashboards ที่ต้องการ structured output:

```bash
bun scripts/deploy-status.ts --json
```

JSON response มี fields top-level `stagingReady`, `stagingBlockerCount`, `productionReady`, และ `productionBlockerCount` เพื่อให้ automation ไม่ต้อง parse nested readiness details. ถ้า root identity หรือ `/health` อ่านไม่ได้ JSON จะยังคืน `ok=false`, `failures`, `nextSteps`, และ `rootIdentity.ok=false` เพื่อให้ dashboard/CI อ่านสาเหตุได้โดยไม่ต้อง parse stderr.
เมื่อ backend ตอบ `/health` ได้ JSON จะมี `health.chatRuntimeProvider`, `health.chatLocalFallbackEnabled`, `health.chatForcedLocal`, และ `health.chatLocalModel` เพื่อให้ dashboard แยกโหมด local QA ออกจาก live provider verification.

readiness rules ด้านล่างมี deterministic self-test:

```bash
bun run deploy:readiness:test
```

ถ้าต้องการ seed browser QA data ที่ทำซ้ำได้ และรัน Playwright end-to-end smoke บนเดสก์ท็อป/มือถือ:

```bash
bun run qa:seed
bun run e2e:smoke
```

`e2e:smoke` เปิด home page, Character Lobby, Creator Studio, My Chats, Events, Profile, Wallet, Moderation,
`/admin/health`, `/admin/prompt-inspector`, `/admin/evals`, และ seeded chat ทั้งเดสก์ท็อป/มือถือ. มันยังตรวจ Character Lobby relationship contract, chat three-dot menu, report dialog, prompt inspector snapshot flow, local eval run flow เมื่อมี admin key,
route rendering, ข้อผิดพลาดในคอนโซล/หน้าเบราว์เซอร์, และการล้นแนวนอน. มันไม่ส่งข้อความแชทจริง จึงไม่ใช้เครดิตผู้ให้บริการตอน UI smoke testing.
ถ้ารันกับ staging ให้ตั้ง `E2E_BASE_URL` และ `E2E_API_BASE_URL` เป็น origin จริงเท่านั้น: staging/production ต้องเป็น `https`, ไม่มี credential/userinfo และไม่มี path/query/hash; local dev ใช้ `http://127.0.0.1` ได้.
เมื่อสองค่านี้เป็น deployed HTTPS origins แล้ว Playwright จะไม่ start local dev server; ถ้าเป็น loopback/local จึงค่อย start backend/frontend dev server ให้เอง.

สำหรับ full local predeploy gate พร้อมการตรวจเบราว์เซอร์:

```bash
bun run qa:full
```

`qa:full` ต้องจบด้วย `qa:seed` เสมอ เพราะ browser smoke ล้าง QA seed ตอนจบ การ seed กลับท้ายงานทำให้เครื่อง local ยังมีตัวละคร/แชทจำลองพร้อมตรวจต่อหลัง full gate ผ่าน

สำหรับ pre-production dry run ที่ครอบ repo-owned checks ทั้งหมด พร้อม real Supabase signed storage และ admin-only APIs:

```bash
bun run staging:check
```

`staging:check` มีประโยชน์ก่อน final domain/provider gate. มันรัน `qa:full`, ตรวจ bucket `avatars` จริงผ่าน signed URLs, และรัน API smoke ซ้ำโดยบังคับ admin checks. API smoke จะสร้าง private draft character และ lore entry, ตรวจ edit/view/favorite/duplicate/reset/delete, แล้ว cleanup. คำสั่งนี้ยังผ่านได้แม้ live chat/image provider checks จะถูกทิ้งไว้ให้ `production:check`.

หลังมี staging domains แล้ว ให้รัน strict deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` พิมพ์ `bun run deploy:status` ก่อน และ deploy status จะตรวจ backend root identity ก่อน health. จากนั้นรัน `smoke-doctor --strict-staging`, Supabase signed-storage check, `/ready`, และ admin-required API smoke กับ deployed backend. คำสั่งนี้ fail เมื่อเจอ localhost/loopback URLs, local/non-https CORS, CORS origin ที่มี credential/userinfo หรือ path/query/hash, signed storage ที่ขาด, readiness พัง, หรือ admin smoke auth ที่ขาด แต่ยังไม่บังคับ `CHAT_PROVIDER_LIVE_VERIFIED=1` หรือ `IMAGE_GENERATION_LIVE_VERIFIED=1`.

หลัง strict staging gate ให้เปิด `/admin/health` และยืนยันว่า section `ลำดับงานก่อนปล่อยจริง` ยังขึ้นครบ 3 ด่าน: `bun run staging:verify + bun run e2e:smoke`, `bun run api:smoke:live`, และ `bun run production:check`. ถ้าหน้าเว็บไม่แสดงลำดับนี้ ให้ถือว่า handoff UI drift แม้ CLI จะยังรันได้.

รัน full local หรือ staging provider gate เฉพาะเมื่อ backend ติดต่อ OpenRouter ได้:

```bash
bun run qa:live
```

`qa:live` รัน local QA gate แล้วตามด้วย `api:smoke:live` หนึ่งรอบ. รอบ live นี้ตรวจทั้ง chat, stream chat, wallet `CHAT_USAGE` ของทั้งสองเส้นทาง, และ image generation แล้ว จึงไม่ควร chain `smoke:chat` หรือ `smoke:image:live` ต่อ ยกเว้นกำลัง retry เฉพาะเส้นทางผู้ให้บริการที่ fail.
เมื่อ staging กำลัง verify providers ครั้งแรก ให้รัน `api:smoke:live` หรือ live smoke commands ที่แคบกว่า ก่อน mark verification flags. หลังการเรียกแชทจริงสำเร็จ ให้ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`. หลังการสร้างรูปจริงสำเร็จ ให้ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`, แล้ว rerun final production gate.

สำหรับ deployed backend ให้ใช้ smoke-only live gate พร้อม `SMOKE_API_BASE_URL` และ smoke auth variables ตอน retry provider connectivity. ห้ามชี้ `backend:check`, `qa:local`, หรือ `qa:live` ไปที่ production data เว้นแต่ตั้งใจให้ automated persistence tests สร้างและ archive test records ที่นั่นจริง ๆ.

```bash
bun run smoke:live
```

หรือรันแต่ละขั้นแยกกัน:

```bash
bun run secrets:check
```

```bash
bun run secrets:patterns:test
```

```bash
bun run memory:audit
```

`memory:audit` ตรวจโครงสร้างคลังความจำของโปรเจกต์, ลิงก์ Markdown ภายใน repo, บันทึกตัวกั้น production, และค่าที่มีรูปทรงคล้าย secret ที่พบบ่อย คำสั่งนี้อยู่ใน `qa:local` เพื่อให้บริบทของโปรเจกต์ปลอดภัยและครบถ้วนตลอด session ยาว ๆ.

```bash
bun run knowledge:audit
```

`knowledge:audit` ตรวจชั้นความรู้ runtime ใต้ `knowledge/` ทั้ง JSON packs แบบมีโครงสร้าง, ลิงก์ wiki ภายใน repo, และค่าที่มีรูปทรงคล้าย secret คำสั่งนี้อยู่ใน `qa:local` เพื่อกันกฎพรอมป์ของ chat/creator drift แบบเงียบ ๆ.

```bash
bun run eval:local
```

`eval:local` รัน deterministic prompt assembly checks เทียบกับ `evals/golden-roleplay.json`. ชุดเดียวกันเปิดให้ admin ใช้ผ่าน `/admin/evals` และ `GET /admin/evals/local`. มันตรวจลำดับการคุมพรอมป์, การฉีด runtime knowledge, ตำแหน่ง lore, ความต่อเนื่องของ relationship/scene, งบ token แบบคร่าว ๆ, และการตัดค่าที่มีรูปทรงคล้าย secret โดยไม่เรียก live model. คำสั่งนี้อยู่ใน `qa:local` และ CI เพื่อให้ context change fail ก่อนถึง staging.

Admin prompt inspection และ deterministic evals ถูกครอบด้วย `/admin/prompt-inspector`, `/admin/evals`, `POST /admin/prompt-inspector`, `GET /admin/evals/local`, local `api:smoke`, และ browser e2e เมื่อมี admin key. ใช้ชุดนี้ก่อนสรุปว่า provider มีปัญหา เพราะมันแสดง final prompt แบบ redacted, token estimate ราย section, lore ที่ดึงมา, และ diff ระหว่าง prompt shape รอบปัจจุบันกับรอบก่อนหน้าโดยไม่เรียก live model.

```bash
cd apps/backend
bun run env:check
bun run deploy:check
```

เมื่อ Postgres พร้อมใช้งานและต้องบังคับให้ DB-backed persistence tests ไม่ถูก skip ให้รัน gate ข้ามแพลตฟอร์มที่เข้มขึ้นจาก repo root:

```bash
bun run backend:check:db
```

```bash
cd apps/frontend
bun run deploy:check
```

เมื่อ local backend และ frontend กำลังรันอยู่ ให้รัน:

```bash
bun run smoke:doctor
```

`smoke:doctor` ผ่านได้สำหรับ local development แต่ยังพิมพ์ `productionReady`, `productionBlockerCount`, `productionBlockers`, และ `nextSteps` ตามลำดับไว้ให้ดูเสมอ ให้ถือ blocker เหล่านั้นเป็นงานของสเตจจิง/โปรดักชัน แล้วค่อยยืนยันด้วย `smoke:ready` กับ backend URL จริง.
มันยังพิมพ์ `chatRuntimeProvider`, `chatLocalFallbackEnabled`, `chatForcedLocal`, และ `chatLocalModel` เมื่อ backend health ส่งค่าเหล่านี้กลับมา เพื่อให้รู้ว่า runtime ตอนนี้เป็น `local/mock-roleplay` หรือ provider จริง.
มันยังพิมพ์ `securityPosture` เพื่อให้เห็นเร็วว่า CIA/AAA checks ตอนนี้พร้อมกี่ข้อ.
ถ้า `/health` รายงาน production env ไม่ถูกต้อง `smoke:doctor` จะพิมพ์ `env จำเป็นที่ขาด` และ `env ไม่ถูกต้อง` ด้วย เพื่อให้เห็นทางแก้ก่อน `/ready` ล้ม.

ถ้าต้องการตรวจ traffic-readiness แบบเข้มขึ้น ให้รัน:

```bash
bun run smoke:ready
```

```bash
bun run smoke:local
```

ตรวจเส้นทางผู้ให้บริการแชทจริงเมื่อ backend ออกไปหา OpenRouter ได้แล้วเท่านั้น:

```bash
bun run smoke:chat
```

`smoke:chat` และ `api:smoke:live` จะเช็ก `/me/usage` ก่อนเรียกผู้ให้บริการ AI จริง ผู้ใช้ smoke ต้องมี token อย่างน้อย `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ค่าเริ่มต้น `1000` เพื่อให้การทดสอบหยุดก่อนใช้เครดิตผู้ให้บริการถ้าบัญชียังเติมไม่พอ `smoke:chat` เหมาะสำหรับ retry/debug เฉพาะทางของแชทปกติและสตรีมแชท และต้องเห็นรายการ wallet แบบ `CHAT_USAGE` แยกครบทั้งสองเส้นทาง ส่วน gate สุดท้ายให้ใช้ `production:check`

ถ้า `smoke:chat` รายงาน `usage.providerFailure` แปลว่าแอป ฐานข้อมูล และเส้นทางแชทติดต่อได้แล้ว แต่ backend ยังเรียกผู้ให้บริการภายนอกไม่สำเร็จ ให้ตรวจการเชื่อมต่อออกไป `https://openrouter.ai`, `OPENROUTER_API_KEY`, เครดิตกับโควตา, สิทธิ์โมเดลที่เลือก, และ log ระบบหลังบ้าน.
อย่าตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จนกว่าการทดสอบแชทจริงจะได้คำตอบจริงจากโมเดล, `chatId`, ข้อมูลโทเคนที่ใช้, และรายการ wallet แบบ `CHAT_USAGE` ที่ตรงกัน. ใน release handoff ต้องบันทึกหลักฐานทั้ง normal chat และ stream chat ด้วย field `Chat smoke normal chatId`, `Chat smoke normal tokens`, `Chat smoke normal walletTransactionId`, `Chat smoke stream chatId`, `Chat smoke stream tokens`, และ `Chat smoke stream walletTransactionId`. เมื่อใช้ `api:smoke:live` ค่าเหล่านี้จะอยู่ใน JSON summary `handoffEvidence` และตรวจทวนได้จากผล `POST /chat/stream live`; เมื่อใช้ `smoke:chat` ค่าเดียวกันจะอยู่ใน JSON object `handoffEvidence`. Combined `api:smoke:live` summary จะแสดง `handoffEvidence` เฉพาะเมื่อหลักฐานแชทปกติ แชทสตรีม และรูปครบทุกช่องพร้อม token/elapsedMs มากกว่า 0.

ตรวจว่าตั้งค่าผู้ให้บริการสร้างรูปไว้แล้วโดยยังไม่ใช้เครดิตสร้างรูป:

```bash
bun run smoke:image
```

ถ้าต้องการสร้าง avatar จริงหนึ่งรูปบนสเตจจิง/โปรดักชันผ่านผู้ให้บริการที่ตั้งค่าไว้ ให้ opt in ชัดเจน:

```bash
bun run smoke:image:live
```

`api:smoke:live` ใช้เป็น combined live smoke ได้เช่นกัน โดย JSON summary `handoffEvidence` และผลของ `POST /creator/ai-draft` จะพิมพ์ `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs` และใช้ validation เดียวกับ `smoke:image:live` สำหรับ fallback/placeholder/missing URL.

ค่าเริ่มต้นของ `smoke:image` จะตรวจแค่ `/health` ถ้าใช้ `bun run smoke:image:live` หรือ `SMOKE_IMAGE_LIVE=1` ระบบจะเรียก `/creator/ai-draft`, คาดหวัง `image.provider="configured"`, และ fail ถ้า Creator Studio ถอยกลับไปใช้ภาพตัวอย่างในเครื่อง โหมด live นี้อาจใช้ทั้งเครดิตข้อความและเครดิตสร้างรูป.
ถ้า live run รายงาน `billing_hard_limit_reached`, `billing hard limit`, หรือ `insufficient_quota` อย่าเพิ่งตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ให้เพิ่มหรือรีเซ็ตวงเงิน/โควตาของผู้ให้บริการสร้างรูป, rerun `bun run smoke:image:live`, และ mark live verification เฉพาะหลังเส้นทางสร้างรูปจริงคืนค่า `image.provider="configured"`. ใน release handoff ให้บันทึก `Image smoke provider`, `Image smoke source`, `Image smoke urlKind`, และ `Image smoke elapsedMs` จาก payload ของ live smoke เพื่อยืนยันว่าไม่ได้ใช้ fallback/placeholder; เมื่อใช้ `smoke:image:live` หรือ `api:smoke:live` ค่าเหล่านี้อยู่ใน JSON object `handoffEvidence`.

สำหรับ backend ที่ deploy แล้ว ให้ชี้ smoke tests ไปที่ backend URL จริง และควรใช้ Supabase user token:

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

```bash
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:local
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:image
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:image:live
SMOKE_API_BASE_URL=https://api.example.com SMOKE_USER_ID=<uuid-user-id> SMOKE_ADMIN_API_KEY=<admin-api-key> bun run smoke:chat
```

ถ้า smoke model ที่เลือกใช้ prompt ใหญ่ขึ้น ให้เพิ่ม preflight guard:

```bash
SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=3000 SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

ผลที่คาดหวัง:

- Backend Prisma schema validate ผ่าน.
- ไม่พบ secret ที่เห็นชัดใน commit.
- Backend TypeScript ผ่าน.
- Backend tests ผ่าน.
- Frontend TypeScript และ Vite build ผ่าน.
- Smoke doctor ยืนยัน backend root identity, backend health, และ database connectivity.
- Readiness smoke ยืนยัน backend root identity ก่อน `/ready` แล้วตรวจ traffic readiness รวมถึง OpenRouter configuration, production hardening, และ live chat/image verification เมื่อ `NODE_ENV=production`.
- Local smoke ยืนยัน backend root identity, health, seeded Maprang data, relationship preview, และ avatar upload.
- API smoke ยืนยัน backend root identity ก่อน route checks ที่ลึกกว่า.
- API smoke ยืนยัน temporary character create/edit/view/favorite/duplicate/reset/delete และ temporary lore create/edit/delete.
- API smoke ยืนยันว่า `/relationship/presets` คืน preset ครบชุด, `/relationship/presets?surface=contract` คืนเฉพาะ relationship contracts สำหรับผู้เล่น, และ `/relationship/presets?surface=creator` ยังมี creator-only presets สำหรับ Creator Studio.
- API smoke ยืนยัน chat menu mutations ด้วยการ rename seeded chat หนึ่งรายการ, archive, ตรวจ archived list, แล้ว restore กลับมาเป็น active chats.
- API smoke ยืนยัน admin prompt inspection คืน redacted prompt snapshots, section accounting, และ prompt diffs.
- Import-cycle audit ยืนยัน app และ QA source imports ไม่เกิด cycle.
- Image smoke ยืนยัน backend root identity, Creator Studio image generation config, และ avatar ที่ generate แบบ live opt-in ไม่ถอยกลับเป็นภาพตัวอย่าง.
- Live chat smoke ยืนยัน backend root identity ก่อนใช้เครดิตผู้ให้บริการ แล้วตรวจ backend-to-OpenRouter chat, chat persistence, และบัญชีการใช้งาน.

Deploy checks ชุดเดียวกันยังรันใน GitHub Actions ผ่าน `.github/workflows/ci.yml`.
CI ยังรัน seeded local backend smoke test และ build Docker images ของ backend/frontend โดยไม่ push images.

สำหรับ deployed environments ให้ใช้ manual GitHub Actions workflow `Production Smoke`.
ตั้ง repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, และเลือกอย่างใดอย่างหนึ่งระหว่าง `SMOKE_ACCESS_TOKEN` หรือ `SMOKE_USER_ID`.
Workflow จะปฏิเสธ backend URL ที่เป็น local, ไม่ใช่ https, มี credential/userinfo, หรือมี path/query/hash และต้องมี signed Supabase storage smoke secrets ก่อนถึงขั้นที่ใช้เครดิต provider.
มันยังรัน `bun run predeploy:check`, `bun run predeploy:check:test`, secrets/secret-pattern/memory/knowledge/eval/security/API/menu audits พร้อม audit regression tests, `bun run release:handoff:check`, และ `bun run release:handoff:test` ก่อนตรวจ smoke configuration เพื่อจับ repository drift ก่อน storage/provider checks.
Workflow พิมพ์ `bun run deploy:status` ก่อน strict production doctor เพื่อให้ log มี blocker details และ next steps อยู่ในที่เดียว.
ทุก workflow run จะตรวจ admin summary, non-mutating wallet token validation, moderation report creation validation, moderation reports, non-mutating admin report validation, และ audit logs ผ่าน `SMOKE_ADMIN_API_KEY`. input เสริม `run_chat` จะตรวจ live AI provider path และใช้เครดิตผู้ให้บริการด้วย. input `min_token_balance_for_chat` map ไปที่ `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` และค่าเริ่มต้นคือ `1000`.
input เสริม `run_image` จะตรวจ live image provider path และใช้เครดิตผู้ให้บริการสร้างรูป.
เมื่อเปิดทั้ง `run_chat` และ `run_image` workflow จะใช้ `api:smoke:live` เพียงรอบเดียว เพื่อเช็ก chat, stream chat, wallet debit ของทั้งสองเส้นทาง, และ image พร้อมกันโดยไม่ยิง provider ซ้ำหลายคำสั่ง.

## ค่า environment production ที่ต้องมี (Production Environment)

ใช้ `PRODUCTION_SETUP.md` เป็น source of truth สำหรับ production env values และ Supabase setup.

Backend:

- `NODE_ENV=production`
- `DATABASE_URL` เป็น Postgres production จริงพร้อม `sslmode=require`
- `OPENROUTER_API_KEY` เป็น OpenRouter key ที่ขึ้นต้นด้วย `sk-or-`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` หลังการทดสอบแชทจริงผ่าน
- `CORS_ORIGINS`
- `ADMIN_API_KEY`

Backend ที่แนะนำ:

- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS`
- `SUPABASE_SIGNED_URL_EXPIRES_IN`
- `IMAGE_GENERATION_API_KEY` หรือ `OPENAI_API_KEY`
- `MODEL_INPUT_COST_PER_1M`
- `MODEL_OUTPUT_COST_PER_1M`
- `MODEL_MIN_ROLEPLAY_REPLY_CHARS`
- `CHAT_PROVIDER_RETRY_ATTEMPTS`
- `CHAT_PROVIDER_RETRY_DELAY_MS`
- `CREATOR_DRAFT_RETRY_ATTEMPTS`
- `CREATOR_DRAFT_RETRY_DELAY_MS`

Frontend:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

สำหรับ Docker frontend builds ให้ส่งค่า Vite เป็น build args. Docker build arg ของ Supabase anon ใช้ชื่อ `VITE_SUPABASE_ANON_PUBLIC` เพื่อลด warning จากชื่อที่เหมือน secret และ Dockerfile จะ map เป็น `VITE_SUPABASE_ANON_KEY` เฉพาะตอน Vite build เท่านั้น.

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

`VITE_SUPABASE_ANON_KEY` เป็น frontend public anon key แต่ยังถูก bake เข้า static build เหมือนค่า `VITE_*` อื่น ๆ.

## พื้นที่จัดเก็บของ Supabase (Supabase Storage)

- สร้าง bucket ให้ชื่อตรงกับ `SUPABASE_STORAGE_BUCKET`.
- ใช้ service role key เฉพาะฝั่ง backend.
- แนะนำให้ bucket เป็น private และตั้ง `SUPABASE_STORAGE_ACCESS=signed`.
- Public read รองรับเฉพาะ development หรือ temporary staging; production readiness คาดหวัง signed URLs.
- ยืนยันว่า avatar uploads คืน backend URL ที่คงที่ และเมื่อเปิด URL นั้นแล้ว redirect หรือ serve รูปได้จริง.
- เมื่อมี backend Supabase env ใน local ให้รัน `bun run supabase:storage:setup` เพื่อสร้าง/ตรวจ private `avatars` bucket, upload smoke image ขนาดเล็ก, fetch ผ่าน signed URL, และ cleanup. ใช้ `bun run supabase:storage:check` เมื่อต้องการตรวจ bucket ที่มีอยู่แล้วเท่านั้น. final `production:check` gate จะรัน storage check นี้ด้วย ดังนั้น smoke environment ต้องมี `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, และ signed-storage env.
- GitHub `Production Smoke` workflow จะ fail ตั้งแต่ต้นถ้า repository secrets `SUPABASE_URL` หรือ `SUPABASE_SERVICE_ROLE_KEY` ขาด เพราะ production storage ต้องตรวจชน bucket จริง.
- มันจะ fail ตั้งแต่ต้นเช่นกันถ้าไม่มี `SMOKE_ADMIN_API_KEY` เพราะ final production smoke ต้อง exercise admin reports และ audit logs แทนการ skip admin-only APIs.

## การทดสอบมือถือ (Mobile QA)

รันหนึ่งรอบที่ 390x844 และอีกหนึ่งรอบที่ 430x932 หรือใช้เครื่องจริงที่ใกล้ที่สุด.

- Chat: sidebar/drawer เปิดปิดได้, composer ตรึงเหนือขอบล่าง, suggestions จากปุ่ม `+` ไม่ทับปุ่มส่ง, report/delete/edit menus เข้าถึงได้, และ scene notifications ไม่ทำให้เกิด horizontal scroll.
- Create: image panel อยู่กึ่งกลาง, generated image preview และ crop modal พอดีกับหน้าจอ, accordions แตะได้ทุกอัน, AI draft เติมเนื้อหาหลัง image generation, และ publish buttons ยังมองเห็น.
- Wallet: balance card, usage rows, และ token history cards ตัดบรรทัดโดยไม่ clip ข้อความไทยยาว ๆ.
- Moderation: queue filters, action buttons, report dialogs, และ admin audit details ใช้ได้โดยไม่พึ่ง desktop hover.

## การทดสอบด้วยมือ (Manual QA)

- ใช้ `ABUSE_QA_CHECKLIST.md` เป็นรอบ exploratory security เพิ่มเติมหลัง automated gates ผ่าน โดยเฉพาะ SQL-like input, broken access, prompt injection, frontend XSS/link safety, admin audit logs, และ token/rate-limit.
- เปิด `/health` และยืนยัน `ok=true`, `databaseConnected=true`, และ `avatarStorage` เป็นค่าที่คาดหวัง.
- เปิด `/relationship/presets?surface=contract` และยืนยันว่าคืนเฉพาะ relationship contracts สำหรับผู้เล่น ต้องมี `stranger` และ `soulmate` และไม่รวม creator-only presets เช่น `safe-family-bond`.
- เปิด `/relationship/presets?surface=creator` และยืนยันว่ายังมี creator-only presets เช่น `safe-family-bond` สำหรับ Creator Studio.
- สร้าง character ในฐานะ owner.
- แก้ไข character และยืนยันว่า validation notes อัปเดต.
- Upload avatar แบบ PNG/WebP และยืนยันว่ารูปแสดงหลัง refresh.
- เพิ่ม แก้ไข และลบ lore.
- เปิด Character Lobby และยืนยันว่า relationship contracts โหลดจาก backend, การเลือก contract เปลี่ยน active state, และ start button ใส่ `relationship_seed=<selected-id>`.
- เปิด Creator Studio และยืนยันว่า relationship preset picker ยัง apply creator tags โดยไม่เปลี่ยน Character Lobby contract list.
- เริ่ม chat ใหม่และยืนยันว่า AI response แรก stream ได้.
- Trigger relationship event และยืนยันว่า sandbox notification แสดงก่อนเข้า scene.
- เข้า scene, accept หรือ resolve outcome แล้วตรวจว่า timeline บันทึกไว้.
- ยืนยันว่า per-event cooldown กัน event ซ้ำทันทีได้.
- ยืนยันว่า user คนอื่นแก้ character ของคนอื่นไม่ได้ถ้าไม่มี admin access.
- ยืนยันว่า admin summary โหลดเฉพาะเมื่อ admin access ถูกตั้งค่า.
- เปิด Wallet และยืนยันว่า token transaction history แสดง chat debits และ admin adjustments.
- เลือก adult/general content mode และยืนยันว่า `/me/content-settings` persist server-side rating cap.

## แม่แบบ release notes (Release Notes Template)

- Commit or build id:
- Backend URL:
- Frontend URL:
- Database migration applied:
- Storage provider:
- Known limitations:
