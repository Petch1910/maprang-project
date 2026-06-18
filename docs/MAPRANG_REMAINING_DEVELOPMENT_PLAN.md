# แผนงานที่เหลือของ Maprang AI

Last updated: 2026-06-18

## Latest 2026-06-18 Repo-Owned Remaining Work

สถานะล่าสุดหลัง MissAI account/admin rewrite:

- Closed locally: `/events`, `/support`, `/wallet`, `/profile`, `/moderation`, `/admin/health` ถูกปรับเป็นธีมเดียวกันมากขึ้น, มี state/action ชัดเจน, และผ่าน `frontend:check`, `api:audit`, `route-menu:audit`.
- Closed locally: `/admin/health` ไม่พึ่ง `SystemStatus.tsx` แล้ว และแยก local readiness ออกจาก external production blockers ชัดเจน.
- Still open locally: browser click-through แบบกดจริงบนหน้าใหม่ทั้งหมด และบันทึก observation ว่าปุ่ม/ฟอร์ม/การส่งข้อมูลทำงานตาม flow หรือไม่.
- Still open locally: clean code/refactor หน้าหนักที่ยังรวม orchestration เยอะ ได้แก่ `AICreatorPage.tsx`, `CreatorStudioPage`/`CharacterCreateForm`, และ `WorkspacePage`.
- Still open locally: ตรวจ `/chat`, `/create`, `/ai-creator` อีกหนึ่งรอบหลัง account/admin rewrite เพื่อให้ shell, spacing, composer, upload/generate state, และ empty/disabled reason ไปทาง MissAI เดียวกัน.
- Future/external only: deploy HTTPS backend/frontend, production CORS/domain, Supabase signed storage บน environment จริง, live provider smoke, และ release handoff evidence.

ลำดับทำต่อที่เหมาะสม:

1. รัน backend/frontend gate ซ้ำให้แน่ใจก่อน browser QA.
2. ใช้ browser click-through สร้าง ticket/support, ปรับ persona/BYOK, refresh wallet, เปิด moderation/admin health, เข้า events, ส่ง chat จริง.
3. บันทึกผลใน `memory/qa-status.md` และถ้ามี bug ให้แก้ก่อน commit.
4. Refactor หน้าหนักทีละหน้า โดยต้องรักษา `frontend:check`, `api:audit`, และ `e2e:smoke` ให้ผ่าน.
5. Commit/checkpoint ชุด UI/docs/test ที่ผ่าน gate แล้ว.

Latest local gate: 2026-06-17 `bun run qa:full` ผ่านครบแล้วหลัง phase 6-10 local closure. Gate นี้รวม `qa:repo`, `qa:seed`, `smoke:doctor`, `smoke:local`, `api:smoke`, `e2e:smoke`, และ reseed หลัง browser smoke จึงยืนยันว่า local runtime ใช้งานได้ครบตาม baseline ปัจจุบัน. เป้าหมายหลักปัจจุบันคือ local server ก่อนตาม `docs/LOCAL_SERVER_RUNBOOK.md`; Ngrok ใช้เป็น public preview/staging ชั่วคราวเท่านั้น. สิ่งที่ยังไม่จบเฉพาะเมื่อจะทำ cloud production คือ phase 10 external deployment: backend/frontend HTTPS origins ถาวร, CORS จริง, production/staging database URL จริง, Supabase signed storage verification บน environment นั้น, live smoke บน deployed URL, และ release handoff evidence จริงก่อนถือว่า production-ready.

## เป้าหมาย

ไฟล์นี้คือแผนรวมสำหรับงานที่เหลือหลังจากระบบ local-ready หลายส่วนผ่าน QA แล้ว เป้าหมายคือทำให้ Maprang ไปถึงสถานะที่เล่นได้จริงในเครื่อง, ตรวจได้, deploy ได้, และพัฒนาต่อได้โดยไม่ต้องตีความเอกสารเก่าหลายชุดซ้ำ

ใช้ไฟล์นี้ร่วมกับ:

- `AGENTS.md`
- `agent.md`
- `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`
- `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
- `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`
- `docs/MAPRANG_TEST_PLAN.md`
- `docs/LOCAL_SERVER_RUNBOOK.md`
- `memory/working-context.md`
- `memory/qa-status.md`
- `memory/deploy-blockers.md`

ถ้าเอกสารอื่นขัดกัน ให้ยึดลำดับนี้:

1. source code และ test ที่รันผ่านจริง
2. `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`
3. `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`
4. แผนเฉพาะด้าน เช่น AI Creator, Core Play, Test Plan
5. audit/reference เก่า เช่น MissAI flow audit

## สถานะระบบล่าสุด

เส้นทาง frontend หลักมีอยู่แล้ว 20 เส้นทาง:

- `/`
- `/chats`
- `/chat`
- `/chat/:chatId`
- `/create`
- `/profile`
- `/wallet`
- `/events`
- `/ai-creator`
- `/characters/:id`
- `/moderation`
- `/admin/health`
- `/admin/prompt-inspector`
- `/admin/evals`
- `/announcements`
- `/creators`
- `/favorites`
- `/works`
- `/support`
- `*`

API audit ล่าสุดใน repo gate รายงาน 75 backend routes และ 51 frontend helper calls ผ่าน contract แล้ว

สถานะ local ล่าสุด:

- `bun run qa:repo` ผ่าน
- backend tests ผ่าน 326 tests / 1400 expects
- frontend route audit ผ่าน 20 routes
- frontend build และ bundle budget ผ่าน
- docs/memory/predeploy/source locks ผ่าน

ข้อจำกัดสำคัญ:

- production ยังต้องใช้ external credentials และ deployed domains จริง
- Ngrok path เป็น temporary staging proof เท่านั้น ไม่ใช่ production replacement
- live image/chat smoke ใช้เป็น evidence ได้เฉพาะเมื่อรันกับ provider/domain จริง
- payment/top-up จริงยังอยู่นอก scope จนกว่าจะมี provider/policy พร้อม

## ระยะที่ 0 จัด repo checkpoint

เป้าหมาย: ทำให้สถานะ repo พร้อม commit/push เป็นชุดงานที่ review ได้

งาน:

- `R0.1` ตรวจไฟล์ที่แก้ ลบ และเพิ่มทั้งหมดจาก `git status --short` — done locally on 2026-06-17. Dirty tree ถูกแยกเห็นชัดระหว่าง source changes, docs/memory, new scripts, และ intentional temp/scratch deletion.
- `R0.2` แยกไฟล์ temp/scratch ที่ตั้งใจลบออกจาก source จริง — done locally on 2026-06-17. `.agents/scratch`, `tmp/`, `tmp-ref-shots`, `tmp-server.mjs`, และ `tmp-shoot.mjs` ถูกถอดออกจาก source และ `.gitignore` กัน runtime/dump artifacts เพิ่ม.
- `R0.3` ตรวจไฟล์ใหม่ที่ยัง untracked ว่าเป็นงานจริงหรือ artifact — done locally on 2026-06-17. ไฟล์ใหม่ที่เหลือเป็น docs/runbook, local/ngrok scripts, migration, hooks, และ memory decisions ที่ผูกกับ QA/predeploy แล้ว.
- `R0.4` จัดกลุ่ม commit อย่างน้อยเป็นชุดเอกสาร/workflow, AI Creator, Ngrok staging, และ code changes — done as handoff guidance on 2026-06-17. Working tree ยังไม่ได้ commit เพราะผู้ใช้ให้ทำงานต่อ แต่กลุ่มไฟล์แยกตาม docs/workflow, AI Creator, local/ngrok, backend, frontend, และ tests ได้ชัด.
- `R0.5` รัน `bun run qa:repo` ก่อน checkpoint ใหญ่ — done locally on 2026-06-17. Repo-owned gate ผ่านหลังเพิ่ม local server doctor และ predeploy locks.

Acceptance:

- ไม่มีไฟล์ทดลองที่ไม่ถูกอ้างอิงค้างใน source
- dirty tree ถูกแยกเป็นกลุ่ม commit ที่อธิบายได้
- ไม่มี secret หรือ generated artifact ขนาดใหญ่

QA gate:

- `bun run secrets:check`
- `bun run docs:commands`
- `bun run memory:audit`
- `bun run predeploy:check`
- `git diff --check`
- `bun run qa:repo`

## ระยะที่ 1 แชทเล่นจริง

เป้าหมาย: ทำให้ Chat เป็น core gameplay ที่เสถียร ใช้ใน local ได้ครบ และพร้อมต่อ live provider

งาน:

- `C1.1` ตรวจ composer ให้เหลือตัวเดียวต่อ viewport ไม่มี input ซ้อนหรือ footer ซ้อน — done locally on 2026-06-17. `WorkspacePage` ใช้ immersive chat shell และ Playwright ตรวจว่าไม่มี global shell/mobile nav ซ้อนบน `/chat`.
- `C1.2` ตรวจ send/regenerate/edit/delete/report/copy message action ทุกตัว — done locally on 2026-06-17. Message menu มี copy/report ทำงานจริง และ edit/regenerate/delete แสดง disabled reason เพราะ API ปัจจุบันยังไม่มี per-message mutation endpoint.
- `C1.3` ยืนยัน loading/streaming disable ปุ่มส่งและกันการยิงซ้ำ — done locally on 2026-06-17. `Composer` มี `submitLockRef`, disabled reason, และ component contract test กัน duplicate submit.
- `C1.4` ตรวจ reply length guard ให้ local/live roleplay ไม่ตอบสั้นเกิน baseline — done locally on 2026-06-17. Local chat runtime, evals, และ smoke gates ตรวจ reply length/token evidence; live provider gate แยกไว้สำหรับ deployed/provider จริง.
- `C1.5` ตรวจ relationship top bar, pending scene notice, scene entry, scene outcome, cooldown — done locally on 2026-06-17. Relationship/scene state อยู่ใน chat summary, Events Inbox, Workspace, prompt inspector, และ backend scene state tests.
- `C1.6` ตรวจ world state, timeline, memory panel ว่า mobile ใช้ drawer/bottom sheet ไม่ล้นจอ — done locally on 2026-06-17. Browser smoke ตรวจ world state panel บน desktop และ mobile route smoke ตรวจ drawer/composer/overflow.
- `C1.7` ตรวจ report message flow เข้า moderation queue จริง — done locally on 2026-06-17. Browser smoke เปิด report dialog จาก message/character และ backend report routes รองรับ `MESSAGE`.
- `C1.8` เพิ่ม browser smoke เฉพาะ chat actions ถ้ายังไม่มี coverage ครบ — done locally on 2026-06-17. `tests/e2e/maprang-smoke.spec.ts` ครอบคลุม chat sidebar menu, pin/unpin, rename, archive, delete, select, read mode, report, copy, และ world state.

Acceptance:

- ผู้ใช้เข้า `/chat` หรือ `/chat/:chatId` ส่งข้อความและได้คำตอบยาวพอ
- ไม่มี duplicate request จากการกดรัว
- scene/relationship state เปลี่ยนและแสดงผลได้
- message report ไปถึง moderation
- mobile composer ไม่บัง content และไม่ล้นจอ

QA gate:

- `bun run frontend:components:test`
- `bun run frontend:static:audit`
- `bun run api:audit`
- `bun run backend:check`
- `bun run frontend:check`
- `bun run e2e:smoke`
- `bun run smoke:local` เมื่อ backend พร้อม

## ระยะที่ 2 สร้างตัวละคร

เป้าหมาย: Creator Studio ต้องสร้างตัวละครได้จริง ใช้ AI draft/image ได้ และ publish แล้วเข้า Lobby/Explore/Chat ได้

งาน:

- `CR2.1` ตรวจ form readiness ว่าบอก field ที่ขาดแบบอ่านรู้เรื่อง — done locally on 2026-06-17. `CreatorReadinessPanel` และ component contracts ตรวจ score, missing fields, tag groups, และ disabled submit reason.
- `CR2.2` ตรวจ save draft, publish, schedule/future state ว่ากดแล้วไม่ตัน — done locally on 2026-06-17. Browser smoke ตรวจ auto-save/reload, publish แล้ว route ไป lobby, และ future/schedule state แสดงเป็น guarded state ไม่ใช่ปุ่มตัน.
- `CR2.3` ตรวจ AI สร้างรูป + เนื้อหา: idle/loading/success/fallback/error/fill result — done locally on 2026-06-17. Creator Studio และ AI Creator มี loading/fallback/error/fill states พร้อม product-facing fallback เมื่อ image provider ยังไม่พร้อม.
- `CR2.4` ตรวจ avatar URL/upload/AI-generated image ใช้ source เดียวกันและไม่ duplicate UI — done locally on 2026-06-17. Avatar URL/upload/AI draft ถูกผูกเข้าฟอร์มเดียว และ e2e ตรวจ image style/avatar source/publish path.
- `CR2.5` ตรวจ cover image draft จาก AI Creator ไป publish เป็น `coverUrl` — done locally on 2026-06-17. Browser smoke ใช้ output จาก AI Creator เป็น cover draft แล้ว publish character พร้อมตรวจ Explore cover และ Chat backdrop.
- `CR2.6` ตรวจ preview simulator 5 turns ไม่สร้าง chat จริงและไม่ debit ผิด — done locally on 2026-06-17. Preview simulator เป็น guarded/local test flow และ wallet ledger แยก chat/image usage โดยไม่ debit ใน simulator.
- `CR2.7` ตรวจ tag conflict/adult warning เป็น warning ตาม policy และ block เฉพาะ policy guard ที่จำเป็น — done locally on 2026-06-17. Tag analysis, adult warning, content rating, และ age gate ถูกผูกกับ Explore/Lobby/Chat guard แล้ว.
- `CR2.8` ตรวจ publish แล้ว Character Lobby, Explore card, Chat backdrop แสดงภาพถูกต้อง — done locally on 2026-06-17. E2E cover flow ตรวจ publish -> lobby/explore/chat image handoff และ route smoke ตรวจหน้า character/chat.

Acceptance:

- สร้างตัวละครใหม่จาก local ได้ครบ flow
- AI draft/image เติมข้อมูลลง form ได้จริงหรือ fallback พร้อม label ชัด
- publish แล้วเปิด `/characters/:id` และเริ่มแชทได้
- ไม่มีปุ่มสร้าง/บันทึกที่กดแล้วเงียบ

QA gate:

- `bun run frontend:storage:test`
- `bun run frontend:components:test`
- `bun run frontend:static:audit`
- `bun run api:audit`
- `bun run backend:check`
- `bun run frontend:check`
- `bun run e2e:smoke`

## ระยะที่ 3 คลังแชทและเล่นต่อ

เป้าหมาย: `/chats` ต้องเป็นพื้นที่จัดการแชทจริง ไม่ใช่ event card แปลกหรือข้อมูลซ้ำ

งาน:

- `M3.1` ตรวจ list/grid ให้ scan ง่าย มี search/filter/sort ชัดเจน — done locally on 2026-06-17. `/chats` มี search, all/pinned/pending/archived filters, pinned sorting, และ refresh.
- `M3.2` ตรวจ three-dot menu: rename, pin/unpin, archive/restore, select, delete — done locally on 2026-06-17. E2E ครอบคลุมเมนูสามจุดทั้ง `/chats` และ chat sidebar พร้อม rename/pin/unpin/archive/restore/select/delete.
- `M3.3` ตรวจ bulk actions สำหรับ selected chats — done locally on 2026-06-17. E2E ตรวจ select mode, bulk archive, bulk restore, bulk delete dialog/confirm.
- `M3.4` ตรวจ pinned/recent/archived states ไม่ซ้ำผิด — done locally on 2026-06-17. `filterAndSortChats`, pinned localStorage, archived fetch/restore และ e2e state transitions ผ่าน.
- `M3.5` ตรวจ pending scene badge และ relationship status ล่าสุด — done locally on 2026-06-17. My Chats แสดง pending scene badge, relationship status/tier, active scene badge และ Events Inbox selector นับเฉพาะ playable pending scenes.
- `M3.6` ตรวจ empty state พร้อม action กลับไป Explore/Create — done locally on 2026-06-17. Empty states มีข้อความ product-facing และลิงก์กลับ `/` กับ `/create`.
- `M3.7` ตรวจ owner guard ฝั่ง backend สำหรับอ่าน/แก้/ลบแชท — done locally on 2026-06-17. Backend chat actions ผ่าน route guards/owner-scoped tests และ API audit map ครบ.

Acceptance:

- ผู้ใช้จัดการแชทได้ครบโดยไม่ต้องเข้า backend
- ลบ/archive/restore/rename ไม่กระทบแชทคนอื่น
- pending scene จากแชทกลับเข้าเล่นต่อได้จริง

QA gate:

- `bun run frontend:components:test`
- `bun run frontend:static:audit`
- `bun run route-menu:audit`
- `bun run backend:check`
- `bun run frontend:check`
- `bun run e2e:smoke`

## ระยะที่ 4 Marketplace และ Character Lobby

เป้าหมาย: Explore และ Lobby ต้องเป็น flow เข้าสู่การเล่นที่เข้าใจง่ายแบบ MissAI/Khuiai แต่มี Maprang relationship contract

งาน:

- `E4.1` ตรวจ Explore search/tabs/category/rails/card click เข้า Lobby ได้จริง — done locally on 2026-06-17. Route/menu audit และ e2e ตรวจ search/category/card/lobby navigation.
- `E4.2` ตรวจ Continue Chatting อยู่ตำแหน่งเด่นและเปิดแชทเดิมได้ — done locally on 2026-06-17. Explore ใช้ playable chat summaries และ route smoke ตรวจ continue/chat links.
- `E4.3` ตรวจ card badges: relationship ready, scene event, slow burn, content rating — done locally on 2026-06-17. Character card/display helpers แสดง badges และ content rating ตาม state จริง.
- `E4.4` ตรวจ Character Lobby data loading/error/empty ไม่มี demo fallback หลอก — done locally on 2026-06-17. Lobby ไม่ใช้ QA fallback character และแสดง product-facing unavailable/loading/error state.
- `E4.5` ตรวจ Relationship Contract seed ladder ครบตามรายการปัจจุบัน — done locally on 2026-06-17. Relationship preset/seed ladder ถูก source-lock และ e2e ตรวจไม่มี duplicate seed buttons.
- `E4.6` ตรวจ seed เปลี่ยน mood/preview/CTA และส่ง `relationship_seed` เข้า chat — done locally on 2026-06-17. E2E เลือก `rival`, ตรวจ CTA href มี `relationship_seed=rival`, และ Workspace แสดง seed label ภาษาไทย.
- `E4.7` ตรวจ favorite/view/share/report character actions — done locally on 2026-06-17. Character Lobby มี share/report/favorite affordances, report dialog, และ route/menu audit ระบุ disabled/loading reasons.

Acceptance:

- ผู้ใช้เริ่มจากหน้าแรกแล้วเข้าแชทได้ในไม่กี่คลิก
- relationship seed มีผลจริงกับ backend/runtime
- lobby ไม่มีปุ่ม share/report/favorite ที่ตัน

QA gate:

- `bun run frontend:components:test`
- `bun run frontend:route:audit`
- `bun run route-menu:audit`
- `bun run api:audit`
- `bun run frontend:check`
- `bun run e2e:smoke`

## ระยะที่ 5 AI Creator และคลังผลงาน

เป้าหมาย: AI Creator ต้องเป็น job/library workflow ที่ชัดเจน ไม่ใช่ปุ่มยิง API ตรง

งาน:

- `A5.1` เพิ่ม browser smoke สำหรับ cover edit flow, Explore cover, Chat backdrop เมื่อ product surface final — done locally on 2026-06-17. E2E ตรวจ AI Creator detail -> use cover -> Creator Studio cover draft -> publish -> Explore cover/Chat backdrop.
- `A5.2` เพิ่ม backend routes/UI wiring ที่ยังเหลือถ้าจำเป็น: cancel, use-as-character-image, use-as-cover — done locally on 2026-06-17. Backend-backed Creator Studio handoff now requests owner-safe reference URLs before writing drafts, with dev-only local-safe preview fallback for local QA. Remaining work is production provider/storage verification.
- `A5.3` เพิ่ม richer Public Gallery detail UX โดยยังไม่ expose private prompt/storage — done locally on 2026-06-17. Public detail now shows a sanitized public-output notice and hides owner-only actions such as publish/unpublish, delete, retry, cancel, download, and system-prompt copy.
- `A5.4` ตรวจ retry/delete/favorite/download/signed refresh ใช้ owner guard ครบ — done locally on 2026-06-17. Persistence tests now cover other-owner retry denial, favorite denial, delete denial, direct/signed download denial, and signed creator-reference denial without resolving or exposing `storageKey`.
- `A5.5` แยก video/advanced-video เป็น disabled/contract state จน provider execution พร้อม — done locally on 2026-06-17. `/ai-creator` now keeps video generation disabled behind a visible provider-contract notice and browser smoke verifies the notice on desktop/mobile. Full provider execution remains an external follow-up until a real video provider contract exists.
- `A5.6` รัน live image provider smoke เมื่อมี key/domain/storage จริง — future/external. Local/fallback image flow ผ่านแล้ว; live smoke ต้องใช้ provider billing/quota/domain/storage จริงก่อนตั้ง verification flag.

Acceptance:

- My Library ใช้ผลงานตัวเองกับ Creator Studio ได้
- Public Gallery ใช้เฉพาะ sanitized public outputs
- signed URL ไม่รั่ว `storageKey`
- video/advanced-video ไม่หลอกผู้ใช้ว่าพร้อมถ้ายังไม่พร้อม

QA gate:

- `bun run frontend:storage:test`
- `bun run frontend:components:test`
- `bun run api:audit`
- `bun run backend:check`
- `bun run frontend:check`
- `bun run e2e:smoke`
- `bun run smoke:image:live` เมื่อมี live provider

## ระยะที่ 6 Wallet, BYOK, และ usage

เป้าหมาย: ผู้ใช้เห็นต้นทุนและเลือกโหมดใช้งานได้ โดยไม่เก็บ key อย่างไม่ปลอดภัยใน production

งาน:

- `W6.1` ตรวจ wallet balance, usage ledger, chat/image rows — done locally on 2026-06-17. Wallet summary already reads backend usage/transactions, `TokenTransactionType` now includes `IMAGE_GENERATION`, frontend wallet labels image generation rows, and backend/frontend checks pass. Actual image-generation debit remains gated until provider execution/debit policy is enabled.
- `W6.2` ตรวจ insufficient token state ใน chat/generation — done locally on 2026-06-17. Chat and stream chat block non-BYOK users before provider calls when `tokenBalance < MIN_TOKEN_BALANCE_FOR_CHAT`, return zero-token usage with the current balance, and keep the composer disabled with a visible wallet warning when the frontend balance is empty. AI Creator generation has explicit non-debit block states for running jobs, missing/unavailable/rate-limited providers, insufficient credit, invalid input, level gates, content gates, and missing uploads.
- `W6.3` ออกแบบ BYOK เป็น developer/local mode ก่อน ไม่ใช่ production secret storage — done locally on 2026-06-17. Profile/API helper now keep raw user API keys session-only via `sessionStorage`, clear the old `localStorage` key, and source-lock that raw BYOK keys are not persisted to `localStorage`.
- `W6.4` ถ้าจะทำ BYOK production ต้องมี server-side encrypted vault, owner guard, redaction, audit log — done locally on 2026-06-17. Backend now stores user provider keys in `UserProviderKey` as AES-GCM ciphertext with metadata-only responses, writes `UserSecurityAuditLog` rows for upsert/use/delete, resolves saved vault keys for chat/creator routes when `x-user-api-vault: 1`, and Profile can save/delete provider keys without keeping raw keys in `localStorage`.
- `W6.5` แยก payment/top-up จริงเป็น future disabled state จน provider/policy พร้อม — done as future product state on 2026-06-17. Wallet แสดง top-up/payment เป็น placeholder พร้อม disabled reason และไม่ผูก provider จ่ายเงินจริง.
- `W6.6` ตรวจ admin token adjustment มี audit log และไม่ทำให้ balance ติดลบ — done locally on 2026-06-17. `adjustUserTokenBalance` rejects non-integer/zero/oversized adjustments, blocks negative resulting balances before transaction writes, records `ADMIN_ADJUSTMENT` wallet ledger rows, and writes `AdminAuditAction.TOKEN_ADJUSTMENT` audit logs with actor, user target, previous/next balance, amount, and reason.

Acceptance:

- ผู้ใช้เห็นว่า token หมดหรือใช้ไปเท่าไร
- chat/generation ไม่ debit ผิด
- BYOK ไม่ทำให้ raw key หลุด frontend/source/log

QA gate:

- `bun run security:audit`
- `bun run secrets:check`
- `bun run frontend:components:test`
- `bun run backend:check`
- `bun run frontend:check`

## ระยะที่ 7 Moderation, Safety, และ Admin

เป้าหมาย: UGC/report/admin action ต้องตรวจสอบย้อนหลังได้ก่อน production

งาน:

- `S7.1` ตรวจ character/message/generation-output report flow — done locally on 2026-06-17. `POST /reports` validates required target ids, safe id shapes, owner/public visibility for reportable targets, and supports `CHARACTER`, `MESSAGE`, and `GENERATION_OUTPUT`.
- `S7.2` ตรวจ admin actions: hide character, archive message, hide generation output, token adjust — done locally on 2026-06-17. Report admin actions mutate the target, resolve the report, and token adjustment has non-negative ledger/audit coverage.
- `S7.3` ตรวจ admin audit log บันทึก actor/action/target/time/metadata — done locally on 2026-06-17. Report status/action and token adjustment paths write admin audit logs with actor, target type/id, and metadata; audit service validates/sanitizes targets and exposes `/admin/audit-logs`.
- `S7.4` ตรวจ moderation search/filter/detail/action ทำงานจริง — done locally on 2026-06-17. `/moderation` loads reports and audit logs through the API helper, filters by status/target/search, and refreshes audit logs after status/action changes.
- `S7.5` ตรวจ content age gate และ adult-mode warning ไม่เปิดเนื้อหาผิดกลุ่ม — done locally on 2026-06-17. AgeGate/Profile save content settings, Explore/Lobby filter by `maxRating`, Lobby blocks chat start for hidden ratings until adult mode is enabled, Workspace sends `maxRating` to chat, and backend rating guard stops chat before provider execution when the character rating exceeds the effective user setting.
- `S7.6` ตรวจ prompt injection/broken access/sql injection guards ผ่าน security audit — done locally on 2026-06-17. Focused `security:audit` passed after the report/admin/content-rating source-lock updates.

Acceptance:

- ทุก report มี target ถูกต้องและ action trace ได้
- admin route ต้องมี admin guard
- owner/private resource ไม่รั่วไป user อื่น

QA gate:

- `bun run security:audit`
- `bun run api:audit`
- `bun run backend:check`
- `bun run frontend:components:test`
- `bun run frontend:check`

## ระยะที่ 8 Prompt, Memory, และ Debug Tooling

เป้าหมาย: บอทตอบนิ่ง ลึก และ debug ได้เมื่อเพี้ยน

งาน:

- `P8.1` ตรวจ Prompt Inspector แสดง final prompt, section, token estimate, retrieved lore — done locally on 2026-06-17. Backend snapshots return redacted final prompt sections, totals, and retrieval metadata; `/admin/prompt-inspector` UI renders section bars, token estimates, retrieved lore, warnings, and redacted prompt output.
- `P8.2` เพิ่ม prompt diff view ระหว่างข้อความก่อนหน้าและปัจจุบันถ้ายังไม่ครบ — done locally on 2026-06-17. Backend returns `diffPromptSnapshots` output and the admin UI renders changed sections, character/token deltas, and before/after token totals.
- `P8.3` ตรวจ evals สำหรับ roleplay depth, prompt injection, scene continuity — done locally on 2026-06-17. `evals/golden-roleplay.json`, `runLocalEvalSuite`, `/admin/evals/local`, `AdminEvalsPage`, `eval:local:test`, and `eval:local` cover the three deterministic local scenarios.
- `P8.4` ตรวจ relationship timeline, world state, memory summary เข้า prompt ตามลำดับถูกต้อง — done locally on 2026-06-17. Prompt Inspector route builds runtime memory from chat summary, memory facts, world state, emotional momentum, relationship timeline, scene mode, active scene, pending events, relationship status/trust/affinity, and last message time before assembling the prompt snapshot.
- `P8.5` ตรวจ local/mock-roleplay และ live provider ใช้ budget/reply length policy เดียวกันเท่าที่เหมาะสม — done locally on 2026-06-17. Local evals use the same rough token estimator as Prompt Inspector, local chat runtime has reply-length tests, and live/local smoke gates assert token/reply-length evidence separately.
- `P8.6` เพิ่ม observability สำหรับ model/provider/error/fallback/source/cost — done locally on 2026-06-17 for local/repo gates. Chat usage returns model name, token balance, prompt budget, context lore count, provider failure status, and cost; Wallet usage summarizes model/function cost and ledger rows; health/admin pages expose provider/storage/readiness blockers. Production observability beyond this remains part of deploy monitoring, not local repo completion.

Acceptance:

- เมื่อบอทตอบสั้นหรือเพี้ยน มีหน้าตรวจ prompt/context ที่ใช้อธิบายได้
- evals กัน regression ของ relationship/scene/prompt injection
- usage/cost แยกตาม function/model ได้

QA gate:

- `bun run eval:local`
- `bun run eval:local:test`
- `bun run backend:check`
- `bun run frontend:components:test`
- `bun run frontend:check`

## ระยะที่ 9 Responsive และ Visual QA

เป้าหมาย: UI ทั้งหมดไปทางเดียวกับ MissAI template และใช้งานมือถือได้จริง

งาน:

- `V9.1` ตรวจ desktop 1440 และ 1920 สำหรับ Explore, Chat, Create, AI Creator, Wallet, Moderation, Admin Health — done locally on 2026-06-17 through the primary-route Playwright smoke and MissAI template/static audits. The route suite covers desktop primary routes without console errors or horizontal overflow.
- `V9.2` ตรวจ mobile 390 และ 430 สำหรับ bottom nav, drawer, composer, modal, upload area — done locally on 2026-06-17 through mobile Playwright smoke for core route/menu behavior and all primary routes without horizontal overflow.
- `V9.3` ตรวจ spacing/card/input/button ใช้ `.missai-*` utility หรือ token กลาง — done locally on 2026-06-17 through `missai:template:audit`, `frontend:static:audit`, and frontend build/bundle checks.
- `V9.4` ลบ UI ที่เป็น demo/card ซ้ำ/สีหลุดธีม — done locally on 2026-06-17. Static/template audits pass and the remaining local-safe/future states are labeled as product states rather than demo placeholders.
- `V9.5` ตรวจข้อความไทย user-facing ไม่ mojibake — done locally on 2026-06-17 through `frontend:static:audit`; PowerShell may display Thai as mojibake, but Bun/static audits read the source as UTF-8 and pass.
- `V9.6` เพิ่ม browser screenshot smoke เมื่อแก้ visual major surface — done locally on 2026-06-17. `e2e:smoke` ran real Chromium desktop/mobile routes and cleaned QA seed data afterward.

Acceptance:

- ไม่มี horizontal overflow
- ไม่มีปุ่ม/ข้อความซ้อน
- mobile ใช้ flow หลักได้ครบ
- UI ไม่ดูเป็นคนละเว็บระหว่างหน้า

QA gate:

- `bun run missai:template:audit`
- `bun run frontend:static:audit`
- `bun run frontend:route:audit`
- `bun run frontend:check`
- `bun run e2e:smoke`

## ระยะที่ 10 Local Server, Ngrok Preview, และ Production

เป้าหมาย: ยึด local server เป็น release target แรก แยก Ngrok preview ออกจาก cloud production ให้ชัดเจน

งาน:

- `L10.1` ใช้ `docs/LOCAL_SERVER_RUNBOOK.md` เป็นแผนหลักสำหรับเปิดระบบบนเครื่องนี้ — done locally on 2026-06-17. `bun run qa:full` ผ่านและ reseed หลัง browser smoke แล้ว
- `L10.2` เพิ่มหรือดูแล operator checklist สำหรับ start backend/frontend/PostgreSQL/provider keys — done. `docs/LOCAL_SERVER_RUNBOOK.md` มี startup order, `bun run local:up` สำหรับเปิด local stack สั้น ๆ, และ `bun run local:doctor` เป็น preflight
- `L10.3` เพิ่ม backup/restore policy สำหรับ local PostgreSQL ก่อนให้คนอื่นใช้งานจริง — done locally on 2026-06-17. `bun run local:db:backup` และ `bun run local:db:restore -- --file <dump> --confirm-restore` พร้อมใช้งาน, `docs/LOCAL_SERVER_RUNBOOK.md` ระบุขั้นตอน, และ `.gitignore` กัน dump artifacts
- `L10.4` แยก runtime logs/uploads/dumps ออกจาก source และกันไม่ให้ commit — done. `.gitignore` กัน `/runtime/`, `/backups/`, `*.dump`, และ `*.backup`
- `L10.5` ใช้ Ngrok เฉพาะ public preview/staging smoke ตาม `docs/NGROK_STAGING_RUNBOOK.md` — done. `bun run ngrok:proxy` อยู่ใน package scripts และ `/admin/health` แยก Ngrok preview ออกจาก cloud production
- `D10.1` ถ้าจะย้ายไป cloud ภายหลัง ค่อย deploy backend ให้มี HTTPS URL จริง — future/external.
- `D10.2` ถ้าจะย้ายไป cloud ภายหลัง ค่อย deploy frontend ให้มี HTTPS domain จริง — future/external.
- `D10.3` ถ้าจะย้ายไป cloud ภายหลัง ค่อยตั้ง `CORS_ORIGINS` เป็น frontend origin จริงเท่านั้น — future/external.
- `D10.4` ถ้าจะย้ายไป cloud ภายหลัง ค่อยตั้ง production/staging `DATABASE_URL` เป็น managed PostgreSQL — future/external.
- `D10.5` ถ้าจะย้ายไป cloud ภายหลัง ค่อยยืนยัน Supabase bucket `avatars` private + signed URL บน environment นั้น — future/external.
- `D10.6` ถ้าจะย้ายไป cloud ภายหลัง ค่อยรัน live chat/image smoke และ `production:check` บน deployed URL — future/external.

สถานะล่าสุด 2026-06-17: local server baseline ผ่าน `bun run qa:full` แล้ว ดังนั้นงาน deploy cloud ไม่ใช่ blocker ของเป้าหมายปัจจุบัน ถ้าใช้ Ngrok ให้ถือเป็น preview ชั่วคราว ไม่ใช่ production ถาวร. `production:check` ยัง fail ตามต้องการเมื่อ target เป็น local loopback เพราะคำสั่งนั้นออกแบบไว้ตรวจ cloud/staging/production environment ไม่ใช่ local server release.

Acceptance:

- local server เปิดแล้ว `bun run qa:full` ผ่าน
- `/admin/health` แสดง local readiness ชัด และแยก external/cloud blocker ออกจาก local server blocker
- live smoke มี token/elapsed/provider evidence
- Ngrok preview ถ้าใช้ ต้องผ่าน smoke/e2e บน Ngrok origin เดียว
- cloud production ถ้าจะทำ ต้องไม่มี localhost/wildcard/http ใน production CORS และ storage signed URL ต้องผ่านบน environment นั้น

QA gate:

- `bun run qa:full`
- `bun run staging:verify`
- `bun run smoke:chat`
- `bun run smoke:image:live`
- `bun run production:check`
- `bun run e2e:smoke` ชี้ deployed URLs

## ตารางลำดับลงมือทันที

| ลำดับ | Task | เหตุผล | ทำได้โดยไม่ใช้ external credential |
| --- | --- | --- | --- |
| 1 | `R0.1` ถึง `R0.5` | repo ต้อง checkpoint ก่อนขยายงาน | ได้ |
| 2 | `C1.1` ถึง `C1.4` | chat คือ core gameplay และ user เคยติเรื่อง UI/คำตอบสั้น | ได้ |
| 3 | `CR2.1` ถึง `CR2.4` | creator คือ core creation flow | ได้ |
| 4 | `M3.1` ถึง `M3.4` | My Chats ต้องจัดการแชทได้จริง | ได้ |
| 5 | `E4.1` ถึง `E4.6` | marketplace/lobby เป็น flow เริ่มเล่น | ได้ |
| 6 | `A5.1` ถึง `A5.4` | AI Creator local contract ใกล้ครบ ต้องปิด smoke เพิ่ม | ได้ |
| 7 | `W6.1` ถึง `W6.4` | wallet/BYOK ต้องไม่เสี่ยง secret | ได้ |
| 8 | `S7.1` ถึง `S7.6` | moderation/security ต้องพร้อมก่อนเปิด UGC | ได้ |
| 9 | `V9.1` ถึง `V9.6` | visual QA ต้องทำหลัง flow หลักนิ่ง | ได้ |
| 10 | `L10.1` ถึง `L10.5` | local server คือ release target ปัจจุบัน | ได้ |
| 11 | `D10.1` ถึง `D10.6` | cloud production ถาวรเป็นงานภายหลัง | ต้องใช้ข้อมูลภายนอก |

## เกณฑ์ Definition Of Done รวม

ระบบถือว่าพร้อมก่อน deploy เมื่อ:

- core local flow เล่นได้ครบ: Explore, Lobby, Chat, My Chats, Create, AI Creator, Wallet, Events, Moderation, Admin Health
- ทุก frontend route มี action หรือ disabled reason ที่ชัดเจน
- API audit และ frontend helper boundary ผ่าน
- DB migration/index/owner guard ผ่าน backend checks
- report/admin audit ครอบคลุม UGC สำคัญ
- prompt/memory/eval/debug tooling ใช้งานได้
- desktop/mobile smoke ผ่าน
- production blockers ถูกแยกชัดว่าอะไรต้องใช้ external credential/domain/provider

ระบบถือว่า production-ready เมื่อ:

- deployed backend/frontend HTTPS URLs พร้อม
- production CORS ถูกต้อง
- production PostgreSQL migration/smoke ผ่าน
- Supabase private bucket + signed URL ผ่าน
- live chat provider smoke ผ่าน
- live image provider smoke ผ่าน
- `bun run production:check` ผ่าน
