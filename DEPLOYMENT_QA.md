# เช็กลิสต์ Deployment QA

ใช้เช็กลิสต์นี้ก่อนส่งแอปให้ tester หรือ deploy environment ใหม่.

## ตรวจอัตโนมัติ

รัน full local gate เมื่อ Postgres, backend, และ frontend พร้อม:

```bash
bun run qa:local
```

Gate นี้ไม่เรียก live AI provider. มันตรวจ committed secrets, committed-secret scan path regressions, API route coverage mapping, import-cycle architecture regressions, API smoke helper regressions, memory/knowledge vault helper regressions, local eval output regressions, frontend API error-message regressions, frontend bundle/static/route และ route/menu audit regressions, smoke auth helper regressions, provider smoke guard regressions, smoke doctor blocker regressions, readiness smoke summary regressions, image smoke fallback regressions, live chat smoke validation regressions, local smoke helper regressions, browser e2e smoke command-plan regressions, predeploy guard wiring regressions, DB-required backend check planning, Supabase signed-storage helper regressions, deploy status formatting, deploy env doctor helper regressions, deploy configuration, backend tests, frontend build, backend health, database connectivity, seeded data, relationship preview, temporary character/lore runtime flows, และ avatar upload. Local API smoke ยังส่ง `skipImageProvider=true` สำหรับ creator draft checks จึงตรวจ endpoint shape ได้โดยไม่ใช้ image credits; live image generation อยู่ใน `api:smoke:live`, `smoke:image:live`, และ `production:check`.
Real `.env` และ `.env.*` files ต้องไม่ถูก track. `secrets:check` จะ ignore local untracked env files เพื่อความสะดวกของ developer แต่จะ fail ถ้าไฟล์นั้นถูก commit หรือ tracked.

ถ้าต้องการตรวจ backend API coverage โดยไม่รัน full suite:

```bash
bun run api:audit
```

`api:audit` อ่าน backend route files และจะ fail ถ้ามี route ที่ยังไม่มี documented automated/manual coverage path. มันตั้งใจแยกจาก `api:smoke`: audit ตอบคำถามว่า “ทุก endpoint ถูกนับใน coverage แล้วหรือยัง?” ส่วน smoke ตอบว่า “runtime paths สำคัญยังทำงานตอนนี้ไหม?”

ถ้าต้องการตรวจ imports ของ app, QA script, seed, และ e2e source ว่ามี circular dependencies หรือไม่:

```bash
bun run import-cycle:audit
```

`import-cycle:audit` scan relative TypeScript imports, re-exports, dynamic imports, TypeScript import-equals `require()`, และ CommonJS `require()` calls ใน backend, frontend, scripts, seed data, Playwright config, และ e2e smoke files. คำสั่งนี้อยู่ใน `qa:local`, CI, และ Production Smoke เพื่อกัน architecture cycles กลับมาแบบเงียบ ๆ.

ถ้าต้องการตรวจ production env files ก่อน deploy โดยไม่พิมพ์ secret values:

```bash
bun run deploy:doctor -- --backend-env apps/backend/.env --frontend-env apps/frontend/.env
```

สำหรับ early staging เท่านั้น ให้เพิ่ม `--allow-unverified-image` จนกว่า live image smoke จะผ่านและตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`.

ถ้าต้องการสรุป backend deploy readiness และ next steps ปัจจุบันโดยไม่ fail กับ staging/provider blockers ที่คาดไว้:

```bash
bun run deploy:status
```

สำหรับ CI logs หรือ dashboards ที่ต้องการ structured output:

```bash
bun scripts/deploy-status.ts --json
```

JSON response มี fields top-level `stagingReady`, `stagingBlockerCount`, `productionReady`, และ `productionBlockerCount` เพื่อให้ automation ไม่ต้อง parse nested readiness details.

readiness rules ด้านล่างมี deterministic self-test:

```bash
bun run deploy:readiness:test
```

ถ้าต้องการ seed browser QA data ที่ทำซ้ำได้ และรัน Playwright end-to-end smoke บน desktop/mobile viewports:

```bash
bun run qa:seed
bun run e2e:smoke
```

`e2e:smoke` เปิด home page, Character Lobby, Creator Studio, My Chats, Events, Profile, Wallet, Moderation,
`/admin/health`, `/admin/prompt-inspector`, `/admin/evals`, และ seeded chat ทั้ง desktop/mobile viewports. มันยังตรวจ Character Lobby relationship contract, chat three-dot menu, report dialog, prompt inspector snapshot flow, local eval run flow เมื่อมี admin key,
route rendering, browser console errors, และ horizontal overflow. มันไม่ส่ง live chat message จึงไม่ใช้ provider credits ตอน UI smoke testing.

สำหรับ full local predeploy gate พร้อม browser smoke:

```bash
bun run qa:full
```

สำหรับ pre-production dry run ที่ครอบ repo-owned checks ทั้งหมด พร้อม real Supabase signed storage และ admin-only APIs:

```bash
bun run staging:check
```

`staging:check` มีประโยชน์ก่อน final domain/provider gate. มันรัน `qa:full`, ตรวจ bucket `avatars` จริงผ่าน signed URLs, และรัน API smoke ซ้ำโดยบังคับ admin checks. API smoke จะสร้าง private draft character และ lore entry, ตรวจ edit/view/favorite/duplicate/reset/delete, แล้ว cleanup. คำสั่งนี้ยังผ่านได้แม้ live chat/image provider checks จะถูกทิ้งไว้ให้ `production:check`.

หลังมี staging domains แล้ว ให้รัน strict deployed staging gate:

```bash
SMOKE_API_BASE_URL=https://api-staging.example.com SMOKE_ADMIN_API_KEY=<admin-key> bun run staging:verify
```

`staging:verify` พิมพ์ `bun run deploy:status` ก่อน และ deploy status จะตรวจ backend root identity ก่อน health. จากนั้นรัน `smoke-doctor --strict-staging`, Supabase signed-storage check, `/ready`, และ admin-required API smoke กับ deployed backend. คำสั่งนี้ fail เมื่อเจอ localhost URLs, local/non-https CORS, signed storage ที่ขาด, readiness พัง, หรือ admin smoke auth ที่ขาด แต่ยังไม่บังคับ `CHAT_PROVIDER_LIVE_VERIFIED=1` หรือ `IMAGE_GENERATION_LIVE_VERIFIED=1`.

รัน full local หรือ staging provider gate เฉพาะเมื่อ backend ติดต่อ OpenRouter ได้:

```bash
bun run qa:live
```

`qa:live` รัน local QA gate แล้วตามด้วย `api:smoke:live` หนึ่งรอบ. Live pass นี้ตรวจทั้ง chat และ image generation แล้ว จึงไม่ควร chain `smoke:chat` หรือ `smoke:image:live` ต่อ ยกเว้นกำลัง retry provider path เดี่ยวที่ fail.
เมื่อ staging กำลัง verify providers ครั้งแรก ให้รัน `api:smoke:live` หรือ live smoke commands ที่แคบกว่า ก่อน mark verification flags. หลัง live chat call สำเร็จ ให้ตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1`. หลัง live image call สำเร็จ ให้ตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1`, แล้ว rerun final production gate.

สำหรับ deployed backend ให้ใช้ smoke-only live gate พร้อม `SMOKE_API_BASE_URL` และ smoke auth variables ตอน retry provider connectivity. ห้ามชี้ `backend:check`, `qa:local`, หรือ `qa:live` ไปที่ production data เว้นแต่ตั้งใจให้ automated persistence tests สร้างและ archive test records ที่นั่นจริง ๆ.

```bash
bun run smoke:live
```

Or run each step separately:

```bash
bun run secrets:check
```

```bash
bun run secrets:patterns:test
```

```bash
bun run memory:audit
```

`memory:audit` verifies the project memory vault structure, local Markdown links, production blocker notes, and common secret-shaped values. It is included in `qa:local` so project context stays safe and complete across long-running sessions.

```bash
bun run knowledge:audit
```

`knowledge:audit` verifies the runtime knowledge layer under `knowledge/`, including structured JSON packs, local wiki links, and secret-shaped values. It is included in `qa:local` so chat/creator prompt rules cannot drift silently.

```bash
bun run eval:local
```

`eval:local` runs deterministic prompt assembly checks against `evals/golden-roleplay.json`. The same suite is exposed to
admins through `/admin/evals` and `GET /admin/evals/local`. It verifies prompt-control ordering, runtime knowledge
injection, lore placement, relationship/scene continuity, rough token budget, and secret-shaped exclusions without calling
a live model. It is included in `qa:local` and CI so context changes fail before they reach staging.

Admin prompt inspection and deterministic evals are covered by `/admin/prompt-inspector`, `/admin/evals`,
`POST /admin/prompt-inspector`, `GET /admin/evals/local`, local `api:smoke`, and browser e2e when an admin key is available.
Use it before blaming the model provider: it shows the redacted final prompt, section token estimates, retrieved lore, and
the diff between the current and previous prompt shape without making a live model call.

```bash
cd apps/backend
bun run env:check
bun run deploy:check
```

When Postgres is available and DB-backed persistence tests must not be skipped, run this stricter cross-platform gate from the repo root:

```bash
bun run backend:check:db
```

```bash
cd apps/frontend
bun run deploy:check
```

With local backend and frontend running, run:

```bash
bun run smoke:doctor
```

`smoke:doctor` can pass for local development while still printing `productionReady`, `productionBlockerCount`, `productionBlockers`, and ordered `nextSteps`.
Treat those blockers as staging/production tasks, then confirm with `smoke:ready` against the real backend URL.
It also prints `securityPosture` so you can quickly see how many CIA/AAA checks are currently ready.
If `/health` reports invalid production env, `smoke:doctor` also prints `missingRequired` and `invalidEnv` so the fix is visible before `/ready` fails.

For a stricter traffic-readiness check, run:

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

`smoke:chat` และ `api:smoke:live` จะเช็ก `/me/usage` ก่อนเรียกผู้ให้บริการ AI จริง ผู้ใช้ smoke ต้องมี token อย่างน้อย `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` ค่าเริ่มต้น `1000` เพื่อให้การทดสอบหยุดก่อนใช้เครดิตผู้ให้บริการถ้าบัญชียังเติมไม่พอ `smoke:chat` เหมาะสำหรับ retry/debug เฉพาะทาง ส่วน gate สุดท้ายให้ใช้ `production:check`

ถ้า `smoke:chat` รายงาน `usage.providerFailure` แปลว่าแอป ฐานข้อมูล และเส้นทางแชทติดต่อได้แล้ว แต่ backend ยังเรียกผู้ให้บริการภายนอกไม่สำเร็จ ให้ตรวจ network ออกไปที่ `https://openrouter.ai`, `OPENROUTER_API_KEY`, เครดิตกับโควตา, สิทธิ์โมเดลที่เลือก, และ backend logs.
อย่าตั้ง `CHAT_PROVIDER_LIVE_VERIFIED=1` จนกว่า live chat smoke จะได้คำตอบจริงจากโมเดล, `chatId`, token usage, และรายการ wallet แบบ `CHAT_USAGE` ที่ตรงกัน.

ตรวจว่าตั้งค่าผู้ให้บริการสร้างรูปไว้แล้วโดยยังไม่ใช้เครดิตสร้างรูป:

```bash
bun run smoke:image
```

ถ้าต้องการสร้าง avatar จริงหนึ่งรูปบน staging/production ผ่านผู้ให้บริการที่ตั้งค่าไว้ ให้ opt in ชัดเจน:

```bash
bun run smoke:image:live
```

ค่าเริ่มต้นของ `smoke:image` จะตรวจแค่ `/health` ถ้าใช้ `bun run smoke:image:live` หรือ `SMOKE_IMAGE_LIVE=1` ระบบจะเรียก `/creator/ai-draft`, คาดหวัง `image.provider="configured"`, และ fail ถ้า Creator Studio ถอยกลับไปใช้ภาพ placeholder ในเครื่อง โหมด live นี้อาจใช้ทั้งเครดิตข้อความและเครดิตสร้างรูป.
ถ้า live run รายงาน `billing_hard_limit_reached`, `billing hard limit`, หรือ `insufficient_quota` อย่าเพิ่งตั้ง `IMAGE_GENERATION_LIVE_VERIFIED=1` ให้เพิ่มหรือรีเซ็ตวงเงิน/โควตาของผู้ให้บริการสร้างรูป, rerun `bun run smoke:image:live`, และ mark live verification เฉพาะหลังเส้นทางสร้างรูปจริงคืนค่า `image.provider="configured"`.

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

If the selected smoke model uses larger prompts, raise the preflight guard:

```bash
SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=3000 SMOKE_API_BASE_URL=https://api.example.com SMOKE_ACCESS_TOKEN=<supabase-access-token> bun run smoke:chat
```

Expected result:

- Backend Prisma schema validates.
- No obvious committed secrets are present.
- Backend TypeScript passes.
- Backend tests pass.
- Frontend TypeScript and Vite build pass.
- Smoke doctor confirms the backend root identity, backend health, and database connectivity.
- Readiness smoke confirms the backend root identity before `/ready`, then verifies traffic readiness including OpenRouter configuration, production hardening, and live chat/image verification when `NODE_ENV=production`.
- Local smoke confirms backend root identity, health, seeded Maprang data, relationship preview, and avatar upload.
- API smoke confirms backend root identity before deeper route checks.
- API smoke confirms temporary character creation/edit/view/favorite/duplicate/reset/delete and temporary lore create/edit/delete.
- API smoke confirms `/relationship/presets` returns the full preset set, `/relationship/presets?surface=contract` returns only player-facing relationship contracts, and `/relationship/presets?surface=creator` keeps creator-only presets available for Creator Studio.
- API smoke confirms chat menu mutations by renaming one seeded chat, archiving it, verifying the archived list, and restoring it back to active chats.
- API smoke confirms admin prompt inspection returns redacted prompt snapshots, section accounting, and prompt diffs.
- Import-cycle audit confirms app and QA source imports remain acyclic.
- Image smoke confirms backend root identity, Creator Studio image generation config, and live opt-in generated avatars do not fall back to placeholders.
- Live chat smoke confirms backend root identity before spending provider credits, then verifies backend-to-OpenRouter chat, chat persistence, and usage accounting.

The same deploy checks also run in GitHub Actions through `.github/workflows/ci.yml`.
CI also runs a seeded local backend smoke test and builds the backend and frontend Docker images without pushing them.

For deployed environments, use the manual GitHub Actions workflow `Production Smoke`.
Set repository secrets `SMOKE_API_BASE_URL`, `SMOKE_ADMIN_API_KEY`, and either `SMOKE_ACCESS_TOKEN` or `SMOKE_USER_ID`.
The workflow rejects local or non-https backend URLs and requires signed Supabase storage smoke secrets before it reaches provider-spending steps.
It also runs `bun run predeploy:check`, `bun run predeploy:check:test`, secrets/secret-pattern/memory/knowledge/eval/security/API/menu audits plus audit regression tests, `bun run release:handoff:check`, and `bun run release:handoff:test` before validating smoke configuration, so repository drift is caught before provider or storage checks.
It prints `bun run deploy:status` before the strict production doctor so the workflow log shows blocker details and next steps in one place.
Admin summary, non-mutating wallet token validation, moderation report creation validation, moderation reports, non-mutating admin report validation, and audit logs are verified on every workflow run through `SMOKE_ADMIN_API_KEY`. The optional `run_chat` input also verifies the live AI provider path and uses provider credits. The workflow input `min_token_balance_for_chat` maps to `SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT` and defaults to `1000`.
The optional `run_image` input verifies the live image provider path and uses image provider credits.
When `run_chat` and `run_image` are both enabled, the workflow uses one combined `api:smoke:live` pass so chat and image are checked together without duplicate provider calls.

## Required Production Environment

Use `PRODUCTION_SETUP.md` as the source of truth for production env values and Supabase setup.

Backend:

- `NODE_ENV=production`
- `DATABASE_URL` เป็น Postgres production จริงพร้อม `sslmode=require`
- `OPENROUTER_API_KEY` เป็น OpenRouter key ที่ขึ้นต้นด้วย `sk-or-`
- `CHAT_PROVIDER_LIVE_VERIFIED=1` หลัง live chat smoke ผ่านจริง
- `CORS_ORIGINS`
- `ADMIN_API_KEY`

Recommended backend:

- `SUPABASE_URL`
- `SUPABASE_JWT_ISSUER`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STORAGE_PROVIDER`
- `SUPABASE_STORAGE_BUCKET`
- `SUPABASE_STORAGE_ACCESS`
- `SUPABASE_SIGNED_URL_EXPIRES_IN`
- `IMAGE_GENERATION_API_KEY` or `OPENAI_API_KEY`
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

For Docker frontend builds, pass Vite values as build args. The Docker build arg for the Supabase anon value is named `VITE_SUPABASE_ANON_PUBLIC` to avoid noisy secret-name warnings, and the Dockerfile maps it to `VITE_SUPABASE_ANON_KEY` only for the Vite build step.

```bash
docker build -f apps/frontend/Dockerfile -t maprang-frontend \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_SUPABASE_URL=https://project-ref.supabase.co \
  --build-arg VITE_SUPABASE_ANON_PUBLIC=<supabase-anon-key> .
```

`VITE_SUPABASE_ANON_KEY` is a frontend public anon key, but it is still baked into the static build like every other `VITE_*` value.

## Supabase Storage

- Create a bucket matching `SUPABASE_STORAGE_BUCKET`.
- Use the service role key only on the backend.
- Recommended: keep the bucket private and set `SUPABASE_STORAGE_ACCESS=signed`.
- Public read is supported only for development or temporary staging; production readiness expects signed URLs.
- Confirm avatar uploads return a stable backend URL and that opening it redirects or serves the image.
- With backend Supabase env available locally, run `bun run supabase:storage:setup` to create/verify the private `avatars` bucket, upload a tiny smoke image, fetch it through a signed URL, and clean it up. Use `bun run supabase:storage:check` when you only want to verify an existing bucket. The final `production:check` gate now runs this storage check as well, so keep `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, and signed-storage env available in the smoke environment.
- The GitHub `Production Smoke` workflow fails early if `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` repository secrets are missing, because production storage must be checked against the real bucket.
- It also fails early without `SMOKE_ADMIN_API_KEY`, because the final production smoke must exercise admin reports and audit logs rather than skipping admin-only APIs.

## Mobile QA

Run one pass at 390x844 and one pass at 430x932, or the closest real devices available.

- Chat: sidebar/drawer opens and closes, composer stays pinned above the bottom edge, `+` suggestions do not cover the send button, report/delete/edit menus are reachable, and scene notifications fit without horizontal scroll.
- Create: image panel stays centered, generated image preview and crop modal fit, all accordions are tappable, AI draft fills content after image generation, and publish buttons remain visible.
- Wallet: balance card, usage rows, and token history cards wrap without clipping long Thai text.
- Moderation: queue filters, action buttons, report dialogs, and admin audit details are usable without desktop hover.

## Manual QA

- Open `/health` and confirm `ok=true`, `databaseConnected=true`, and the expected `avatarStorage`.
- Open `/relationship/presets?surface=contract` and confirm it returns player-facing relationship contracts only. It should include `soulmate` and exclude creator-only presets such as `safe-family-bond`.
- Open `/relationship/presets?surface=creator` and confirm it still includes creator-only presets such as `safe-family-bond` for Creator Studio.
- Create a character as the owner.
- Edit the character and confirm validation notes update.
- Upload a PNG/WebP avatar and confirm it renders after refresh.
- Add, edit, and delete lore.
- Open Character Lobby and confirm relationship contracts load from the backend, selecting a contract changes the active state, and the start button includes `relationship_seed=<selected-id>`.
- Open Creator Studio and confirm relationship preset picker still applies creator tags without changing the Character Lobby contract list.
- Start a new chat and confirm the first AI response streams.
- Trigger a relationship event and confirm the sandbox notification appears before entering a scene.
- Enter a scene, accept or resolve an outcome, then confirm the timeline records it.
- Confirm per-event cooldown prevents immediate repeat events.
- Confirm a different user cannot edit another user's character without admin access.
- Confirm admin summary loads only when admin access is configured.
- Open Wallet and confirm token transaction history shows chat debits and admin adjustments.
- Select adult/general content mode and confirm `/me/content-settings` persists the server-side rating cap.

## Release Notes Template

- Commit or build id:
- Backend URL:
- Frontend URL:
- Database migration applied:
- Storage provider:
- Known limitations:
