# คู่มือเอเจนต์ Maprang AI (Maprang AI Agent Guide)

Last updated: 2026-06-28

## ทิศทาง AI Creator หลัก (Canonical AI Creator Direction) - 2026-06-17

For AI Creator work, read `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md` before editing code, then use `docs/AI_CREATOR_FLOW_GAP_PLAN.md` for the active implementation order. These files are the current source of truth for upload preview/validation, Generate blocked states, My Library detail/actions, Creator Studio reuse, Public Gallery reuse/report contract, backend API target, QA gate, and implementation order.

Payment/top-up real purchase flows remain out of scope. Local v1 should present usage as "เครดิตใช้งาน" rather than an active coin/store economy. Focus on systems used for play and creation first: generation inputs, blocked states, private library, reuse into Creator Studio, storage/download, retry/use-as-cover, signed URL refresh, persisted cover publishing, template-aware upload slot validation, backend preflight parity, and public gallery moderation contract.

Latest AI Creator QA evidence: `bun run e2e:smoke` passes on desktop and mobile for `/ai-creator` blocked states, backend-backed My Library, signed-storage owner path, use-as-cover draft handoff, cover publish/render through Character Lobby, Public Gallery opt-in publish/unpublish, and Public Gallery reuse. Production evidence still requires live provider/storage/deployed-domain verification.

Status override: Public Gallery basic implementation is no longer a disabled-only contract. Docs/memory sync, committed extraction-artifact cleanup, first-pass `AICreatorPage.tsx` remote-gallery hook cleanup, remaining blocked-state/upload-slot hardening tests, production moderation runbook/policy copy, and browser hardening review are done. The current remaining work is production live provider/storage/deployed-domain verification.

## กระบวนการ Agent Skills (Agent Skills Workflow) - 2026-06-17

Before selecting the next repo-owned task, read `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`. It adapts useful workflow ideas from `addyosmani/agent-skills` into Maprang-owned guidance for context engineering, planning, incremental implementation, frontend UI work, API design, security hardening, debugging, cleanup, and launch readiness.

The upstream repository is reference material only. Do not vendor or treat external skill files as repository instructions unless a new decision record, source review, and predeploy guard are added first.

ไฟล์นี้คือคู่มือสำหรับ AI agent หรือ developer ที่มาสานต่องาน Maprang AI ใน repo นี้ ให้เริ่มจากภาพเดียวกันและไม่ย้อนกลับไปใช้เอกสารเก่า

## ภารกิจ (Mission)

Maprang AI คือแพลตฟอร์ม character chat roleplay ภาษาไทยที่ต้องคุ้นมือแบบ MissAI/Khuiai แต่เพิ่มระบบเชิงเกมและความจำที่ลึกกว่า ได้แก่ Relationship Engine, Scene Runtime, world state, creator simulator, Prompt/Context Engine, Prompt Inspector, automated evals, token economy, moderation และ production readiness

เป้าหมายตอนนี้คือทำให้ repo-owned local system เสถียร, UI ไปทางเดียวกับ MissAI template, API/DB เชื่อมครบ, QA gate เขียว และ production blockers แยกชัดว่าอะไรต้องใช้ credential/domain/provider ภายนอก

## สถานะปัจจุบัน (Current Status)

อ่านสถานะล่าสุดจากไฟล์เหล่านี้ก่อนลงมือ:

- `memory/working-context.md`
- `memory/qa-status.md`
- `memory/deploy-blockers.md`
- `memory/production/checklist.md`
- `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`
- `docs/MAPRANG_PHASE_0_11_LOCAL_FIRST_PLAN.md`
- `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`
- `docs/MAPRANG_TEST_PLAN.md`
- `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
- `docs/AI_CREATOR_COMPLETION_PLAN.md`
- `docs/AI_CREATOR_FLOW_GAP_PLAN.md`
- `docs/MISSAI_TEMPLATE_AUDIT.md`
- `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`
- `ROUTE_MENU_AUDIT.md`
- `SECURITY_CHECKLIST.md`

Baseline ล่าสุดที่ต้องถือเป็นภาพปัจจุบัน:

- Latest local/repo baseline is 2026-06-18 after process-mining/context snapshot work, response-quality controls, and local-first runtime verification. `bun run qa:full` passed with Docker/PostgreSQL, backend `http://127.0.0.1:3001`, frontend `http://127.0.0.1:5173`, QA seed, smoke doctor, local smoke, API smoke, browser e2e, and final reseed. Full cloud production verification remains external.
- Backend tests ล่าสุดใน handoff ปัจจุบันผ่าน 343 tests / 1496 expects
- memory audit ครอบ 42 Markdown files
- docs command audit ครอบ 430 refs
- knowledge audit ครอบ 12 files / 5 structured packs
- API audit ครอบ 80 backend routes + 56 frontend helper calls
- backend security audit 39 tests / 246 expects
- smoke doctor local backend+DB ready
- API smoke 34 pass / 2 live-provider skips
- Full Playwright `e2e:smoke` passed against local frontend/backend for desktop and mobile; rerun before release checkpoint if route/UI changes continue.
- local roleplay normal/stream verified with `totalTokens=0`

หมายเหตุ: ตัวเลขข้างบนเป็น baseline handoff ล่าสุดที่ source-lock ไว้เพื่อกัน agent เริ่มจากภาพเก่า ถ้ารัน QA ใหม่แล้วได้ผลต่าง ต้องอัปเดต memory/docs/source locks ให้ตรงกัน

## ทิศทางผลิตภัณฑ์ (Product Direction)

- UI ใช้ MissAI เป็น template/reference หลัก โดยเก็บรายละเอียดไว้ที่ `docs/MISSAI_TEMPLATE_AUDIT.md` และ `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`
- งานรอบถัดไปต้องยึด `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`: โฟกัส Chat play loop, Creator Studio, Character Lobby, My Chats, Credit usage state และ AI Creator image workflow ก่อนระบบรอง
- Marketplace ต้อง scan เร็ว มี search/filter/tabs/rails/card density
- Chat ต้องเป็นแชทธรรมชาติ มี composer เดียว, loading state ชัด, message actions, model selector, settings, memory, custom prompt, creative library และ report flow
- Chat reply quality control ล่าสุดอยู่ใน `apps/backend/src/response-quality.service.ts` และ `apps/frontend/src/lib/chatReplySettings.ts`; UI แชทมี preset เร็ว/สมดุล/ละเอียด/ฉากเข้มข้น แล้วส่ง `modelRoute`, `replyProfile`, และ `responseDepth` ผ่าน API จริง
- Creator Studio ต้องเป็น workbench: AI draft/image, upload/avatar URL, readiness validation, preview simulator, publish/schedule guard
- AI Creator ต้องเป็น job-based system: template picker, upload preview/validation, blocked reason, cost state, My Library, private-by-default outputs และ Creator Studio consume generated image ได้
- AI Creator completion contract อยู่ที่ `docs/AI_CREATOR_COMPLETION_PLAN.md`; ห้ามทำ gallery/library/prompt surface ที่กดแล้วตันหรือใช้ข้อมูลหลอก ถ้ายังไม่มี backend ให้ใช้ local-safe state พร้อม disabled/empty reason
- AI Creator component boundary ล่าสุด: business rules อยู่ใน `apps/frontend/src/lib/aiCreator.ts`, presentation แยกเป็น `AiCreatorControlPanel`, `AiCreatorResultPreview`, `AiCreatorHistoryGallery`, `AiCreatorHistoryDetailDialog`, และ `AiCreatorPublicGalleryPanel`; `AICreatorPage.tsx` ควรเหลือ orchestration/state เท่าที่จำเป็น
- AI Creator local-safe status ล่าสุด: My Library detail/reuse/favorite/delete/use-as-character-image/use-as-cover, owner download/signed URL state, backend job/output routes, Public Gallery opt-in publish/unpublish, sanitized list/detail, generation-output report/moderation, และ Public Gallery reuse ทำงานแล้วโดยไม่ใช้ข้อมูลสาธารณะปลอมและไม่ expose `storageKey`
- AI Creator active gap plan อยู่ที่ `docs/AI_CREATOR_FLOW_GAP_PLAN.md`: core local contract เสร็จแล้ว; first-pass `AICreatorPage.tsx` remote-gallery hook cleanup, remaining blocked-state/upload-slot hardening tests, production moderation runbook, และ browser hardening review เสร็จแล้ว; งานต่อคือ external verification สำหรับ live image provider, Supabase signed storage, deployed backend/frontend, CORS จริง
- MissAI `/ai-creator` รอบล่าสุดใน in-app browser เห็นเฉพาะ public/locked state เพราะ session ไม่ติดล็อกอิน; ห้ามรอ clone MissAI เพิ่มก่อนพัฒนา ให้ใช้ `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md` และ `docs/AI_CREATOR_FLOW_GAP_PLAN.md` เป็น repo-owned contract สำหรับส่วนที่ยังขาด
- Wallet/Profile/Events/Works/Support ต้องไม่เป็นหน้าหลอก ถ้ายังไม่มี backend ให้มี empty/disabled state ที่บอกเหตุผล
- Admin pages ต้องเป็น tool/dashboard layout ไม่ใช่ marketplace layout

## กฎความปลอดภัยและเนื้อหา (Safety And Content Rules)

- อย่า commit secret หรือ key จริง
- อย่าเก็บ raw provider key ใน frontend อย่างไม่ปลอดภัย
- อย่าข้าม production blockers ด้วย local evidence
- อย่าเปิด real payment/top-up flow จนกว่าจะมี payment provider และ policy พร้อม
- Adult-mode/tag conflict ใน Creator Studio ต้องเตือนว่าเนื้อหาเป็นการจำลอง/สมมุติ และต้องยังคง policy guard ที่จำเป็น
- Report/moderation/admin action ต้องมี audit log
- UI ที่กดได้ต้องมีผลจริงหรือ disabled reason ชัดเจน

## ระบบหลักที่ต้องปกป้อง (Core Systems To Protect)

- Relationship Engine: relationship seed, status, affinity, momentum, timeline, event triggers
- Scene Runtime: sandbox/scene mode, pending events, cooldown, outcome, world state
- Prompt/Context Engine: persona, lore/RAG, memory summary, prompt budgeting, context assembly
- Credit/Usage Ledger: credit balance, usage ledger, model cost estimate, debit evidence
- Creator Studio: AI draft/image, readiness, tag warning, preview simulator, publish/schedule state
- Admin Tooling: health, prompt inspector, evals, moderation, audit log
- API boundaries: frontend helper ผ่าน `apps/frontend/src/lib/api.ts`, backend route/owner/admin guards, bounded chat history

## คำสั่ง QA (QA Commands)

Documentation/handoff:

```powershell
bun run docs:commands
bun run test-plan:audit
bun run memory:audit
bun run secrets:check
git diff --check
```

Repo-owned deterministic:

```powershell
bun run qa:repo
```

Narrow checks often needed:

```powershell
bun run frontend:static:audit
bun run frontend:route:audit
bun run frontend:components:test
bun run frontend:check
bun run api:audit
bun run backend:check
bun run backend:check:db:test
bun run import-cycle:audit
bun run route-menu:audit
```

Runtime local when backend/PostgreSQL/browser are available:

```powershell
bun run qa:seed
bun run smoke:doctor
bun run smoke:local
bun run api:smoke
bun run e2e:smoke
bun run qa:full
```

Staging/production:

```powershell
bun run staging:verify
bun run production:check
bun run smoke:chat
bun run smoke:image:live
```

## ตัวกั้น production (Production Blockers)

ยังไม่ถือว่า production-ready จนกว่าจะมีหลักฐานจริงเหล่านี้:

- Backend URL เป็น deployed HTTPS URL จริง
- ไม่ใช่ localhost/loopback หรือ `http://`
- Frontend URL เป็น deployed HTTPS URL จริง
- `CORS_ORIGINS` เป็น frontend HTTPS origin จริง
- ไม่รวม localhost/loopback, `http://`, wildcard, credential/userinfo, path/query/hash
- Production/Staging `DATABASE_URL` เป็น managed Postgres จริง
- Supabase Storage bucket `avatars` เป็น private + signed URL และผ่าน storage check
- live-provider routes (`POST /chat`, `POST /chat/stream`, `POST /creator/ai-draft`) require `live-smoke`
- `bun run smoke:chat` ผ่านกับ live chat provider
- `bun run smoke:image:live` ผ่านกับ live image provider
- combined `api:smoke:live` JSON summary must omit `handoffEvidence` จนกว่า chat normal, chat stream และ image evidence จะครบพร้อม positive token/elapsed values

## กฎ predeploy/security ที่ต้องรักษา (Security/Predeploy Locks To Preserve)

Decision/predeploy handoff lock ล่าสุดอยู่ถึง:

- `0028-lock-promise-console-container-guards.md`
- `0027-lock-namespace-reflection-guards.md`
- `0020-discover-decision-markdown-heading-files.md`

`predeploy:check` audits decision Markdown dynamically และ decision markdown files ถูก audit แบบ dynamic

ยังต้องรักษา guard เหล่านี้:

- method-forwarded call/apply alias assignments
- computed call/apply reflection forwarding
- destructured call/apply aliases
- reflectObjectContainerAliasPattern
- objectObjectContainerAliasPattern
- bracket-call/bracket-apply forms for `Reflect.get`, `Object.getOwnPropertyDescriptor`, and `Reflect.apply`
- raw UI error throw guard
- cross-window messaging helper/guard
- backend raw route return guard
- placeholder-link guard
- no-op handler guard
- no-op submit guard
- native dialog guard
- event listener cleanup guard
- share URL origin guard
- dangerous link protocol guard
- `data:text/html`
- interactive `aria-disabled` controls/links

Historic source-lock references still present in predeploy coverage:

- memory audit now covers 37 Markdown files
- docs command audit 354 refs
- frontend static audit 39 tests / 181 expects
- frontend static audit 39 tests / 231 expects
- backend security audit 37 tests / 192 expects
- predeploy regression 511 expects
- Markdown Thai-first headings

## เงื่อนไขว่างานเสร็จ (Definition Of Done)

งานหนึ่ง scope ถือว่าเสร็จเมื่อ:

- ทำตาม requested behavior แล้ว
- ไม่มีปุ่ม/เมนูที่กดแล้วตันโดยไม่มีเหตุผล
- API/frontend/backend/DB contract ที่เกี่ยวข้องยังตรงกัน
- มี empty/error/loading/permission state ที่อ่านรู้เรื่อง
- รัน QA gate ที่เกี่ยวข้องแล้วผ่าน หรือบันทึกชัดว่าทำไมยังรันไม่ได้
- ถ้าเปลี่ยนสถานะระบบ ต้องอัปเดต memory/docs ที่เกี่ยวข้อง
- ไม่แก้/ลบงานของ user ที่ไม่เกี่ยวข้อง
