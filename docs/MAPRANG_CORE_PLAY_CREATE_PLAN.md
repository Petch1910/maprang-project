# Maprang Core Play And Creator Plan

Last updated: 2026-06-17

เอกสารนี้คือแผนหลักสำหรับงานรอบถัดไปของ Maprang AI หลังจากสำรวจ MissAI แล้ว เป้าหมายคือโฟกัสระบบที่ทำให้ผู้ใช้ “เล่นได้จริง” และ “สร้างตัวละครได้จริง” ก่อน ส่วนระบบรองให้เป็น placeholder, disabled state, หรือ future module ที่ไม่หลอกผู้ใช้

## Source Of Truth

- Product direction: Maprang เป็น character chat roleplay ภาษาไทยที่คุ้นมือแบบ MissAI/Khuiai แต่ลึกกว่าด้วย relationship, scene, memory, creator preview, และ prompt/debug tooling
- UI reference: `D:\missai.me` และ `https://www.missai.day`
- Detailed reference docs:
  - `docs/MISSAI_TEMPLATE_AUDIT.md`
  - `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`
  - `docs/AI_CREATOR_COMPLETION_PLAN.md`
  - `memory/ui-ux/current-direction.md`
  - `docs/MAPRANG_TEST_PLAN.md`
- Current implementation source of truth:
  - Frontend: React 19, Vite, Redux Toolkit
  - Backend: Bun, Elysia, Prisma, PostgreSQL
  - API helper boundary: `apps/frontend/src/lib/api.ts`

## Current Implementation Checkpoint

- AI Creator frontend now has a dedicated helper module: `apps/frontend/src/lib/aiCreator.ts`
- The helper owns generated-item types, item builders, style presets, image templates, motion templates, gallery filters, local history persistence, filtering, pagination, upload validation, video duration math, and Generate blocked reasons
- `AICreatorPage.tsx` should keep moving toward UI-only orchestration; do not reintroduce localStorage parsing, file validation, generated-item object construction, motion-template lists, duration math, or generation block rules directly in the page
- My Library/history gallery rendering now lives in `apps/frontend/src/components/ai-creator/AiCreatorHistoryGallery.tsx`; keep state ownership in the page unless another route needs the same state
- Result/empty preview rendering now lives in `apps/frontend/src/components/ai-creator/AiCreatorResultPreview.tsx`; playback/copy/save state remains colocated in the page
- AI Creator input tabs/control panel now live in `apps/frontend/src/components/ai-creator/AiCreatorControlPanel.tsx`; keep form state and orchestration in the page, but keep template lists, upload labels, motion presets, and disabled-reason display in the component/helper boundary
- Upload preview metadata now uses `createAiCreatorUploadPreview` / `formatAiCreatorFileSize` from `apps/frontend/src/lib/aiCreator.ts`, so selected files display real file name, MIME type, and readable size instead of hard-coded placeholder copy
- Generate blocked reasons now support prompt/loading plus optional upload count, token/credit cost, provider readiness, user level, and content gate checks
- AI Creator now has a structured blocked-state helper plus visible QA matrix for missing prompt/upload, invalid input, insufficient credit, level gate, provider missing/unavailable/rate-limit, content gate, and duplicate running job
- Focused guard: `bun run frontend:storage:test` covers AI Creator history, filtering, pagination, item builders, upload validation, upload metadata, duration math, and blocked states
- Latest focused evidence for this slice: `bun run frontend:check`, `bun run frontend:storage:test`, and browser verification of `/ai-creator` passed with no console errors
- Backend generation foundation now has `GET /generation/templates` and `POST /generation/jobs`; job creation is local-safe, no-debit, and can persist a blocked `GenerationJob` when DB/migration are ready
- Backend owner library read path now has `GET /generation/jobs` and `GET /generation/jobs/:id`, and frontend reads through `fetchGenerationJobs` / `fetchGenerationJob` in the central API helper
- Backend owner output favorite/unfavorite path now has `POST /generation/outputs/:id/favorite` and `DELETE /generation/outputs/:id/favorite`; frontend helper boundary has `favoriteGenerationOutput` / `unfavoriteGenerationOutput`
- Backend owner output download path now has `GET /generation/outputs/:id/download`; frontend helper boundary has `fetchGenerationOutputDownload`
- Current AI Creator gap is no longer "draw the page"; it is completing retry/use-as-cover actions, richer signed URL expiry/refresh states, and public gallery opt-in/report/sanitized reuse

## Product Priority

ทำตามลำดับนี้ก่อนเสมอ:

1. Chat play loop
2. Creator Studio
3. Character Lobby
4. My Chats / continue play
5. Wallet usage state เฉพาะที่จำเป็นต่อ chat/generation
6. AI Creator image workflow
7. Admin/debug เฉพาะที่ใช้ตรวจระบบหลัก
8. Secondary pages เช่น announcements, support, creators, favorites, works
9. Payment/top-up จริง, video generation, community/social loop

## Out Of Scope For Now

- ระบบเติมเงินหรือ payment จริง
- การกดซื้อ credit จริง
- การ clone backend/private implementation ของ MissAI
- การคัดลอก UGC prompt/gallery content จาก MissAI ลง repo
- Video templates และ advanced video แบบเต็ม production
- Public gallery แบบ opt-out หรือเปิดผลงานผู้ใช้เป็นสาธารณะอัตโนมัติ

## Core Loop Target

ผู้ใช้ใหม่ควรทำ flow นี้ได้ครบใน local:

1. เปิด Explore
2. เลือก character หรือสร้างใหม่
3. ที่ Character Lobby เลือก Relationship Contract
4. เข้า Chat
5. ส่งข้อความและได้คำตอบที่ยาวพอสำหรับ roleplay
6. เห็น relationship/state เปลี่ยนหรือมี pending scene เมื่อถึงเงื่อนไข
7. กลับมาที่ My Chats แล้วเล่นต่อได้
8. สร้าง character ใหม่ด้วย Creator Studio
9. ใช้ AI draft/image เพื่อช่วยเติมรูปและเนื้อหา
10. Preview/test chat ก่อน publish

## Chat Requirements

Chat คือ priority สูงสุด

- มี composer ตัวเดียว ชัดเจน ไม่ซ้อน
- มี loading/streaming state ที่ disable send/regenerate ระหว่างรอคำตอบ
- บอทตอบยาวพอสำหรับ roleplay ไม่ใช่คำตอบสั้น
- รองรับ message actions:
  - copy
  - edit user message
  - delete
  - regenerate AI reply
  - report
- แสดง per-turn token/cost เมื่อมีข้อมูล
- มี relationship top bar
- มี scene notice และ pending event prompt
- มี world state/memory/timeline panel ที่ไม่รกบน mobile
- มี model/settings panel สำหรับ:
  - max response length
  - temperature
  - memory rounds
  - enhanced memory
  - stream on/off
- local mode ต้องเล่นได้ครบโดยไม่ใช้ live provider credit

## Creator Studio Requirements

Creator Studio คือ priority คู่กับ Chat

- เป็น workbench ไม่ใช่ฟอร์มยาวอย่างเดียว
- รูปตัวละครอยู่กลาง/เด่น
- link รูปตัวละครอยู่ด้านล่างตาม UX ที่เลือกไว้
- AI สร้างรูป + เนื้อหา ต้องมี state ครบ:
  - idle
  - loading
  - fallback/system draft
  - provider error
  - success/fill result
- form readiness ต้องอ่านง่ายและบอกว่าขาดอะไร
- Save draft ต้องใช้ได้แม้ยัง publish ไม่ได้
- Preview simulator ต้องลองบทก่อนเผยแพร่ได้โดยไม่สร้าง chat จริง
- Publish/Schedule ต้อง validate required fields ก่อนเสมอ
- Adult/tag warning ให้บอกว่าเนื้อหาเป็นการจำลองหรือสมมุติ และบล็อกเฉพาะ policy guard ที่จำเป็น

## Character Lobby Requirements

- แสดง avatar, bio, creator, tags, status badge
- Relationship Contract ต้องเด่น
- เลือก seed แล้ว mood/CTA/preview เปลี่ยนทันที
- Start chat ต้องส่ง `relationship_seed` ไป backend
- ถ้า character data หายหรือยังโหลดไม่ได้ ต้องมี retry/create/explore action ไม่ใช้ demo fallback

## My Chats Requirements

- เป็น list/grid ที่ scan ง่าย ไม่ใช่ event card ซ้ำ ๆ
- มี continue play ชัด
- แสดง relationship status ล่าสุด
- แสดง pending scene badge
- three-dot menu ต้องมี:
  - rename
  - pin/unpin
  - archive/restore
  - select
  - delete
- bulk actions ต้องทำงานจริงหรือ disabled reason ชัด

## Wallet Requirements For Core Loop

Wallet ตอนนี้ทำเฉพาะสิ่งที่จำเป็นกับการเล่นและ generation:

- balance
- usage ledger
- chat cost rows
- image/generation cost rows
- insufficient token state
- provider/BYOK mode summary
- top-up/payment จริงให้เป็น future state ที่ไม่เปิด side effect

## AI Creator Scope

MissAI มี 4 tab:

- text-to-image
- image-to-image templates
- video templates
- advanced video

Maprang MVP ทำเฉพาะ:

- text-to-image สำหรับสร้างรูปตัวละคร/ปก
- image-to-image character consistency เบื้องต้น
- AI draft + image fill ใน Creator Studio
- My Library สำหรับงานของตัวเอง
- private-by-default generated outputs

Planned but behind core loop:

- video templates
- advanced video
- public gallery publish/reuse เต็มระบบ
- monetized generation packs

กฎสำคัญ: ถ้า UI แสดง video templates, advanced video, หรือ Public Gallery ก่อน backend production พร้อม ต้องแสดงเป็น module ที่มี validation/disabled reason ชัด ไม่ใช่ปุ่มตันหรือข้อมูลหลอก

รายละเอียดงาน AI Creator ให้ยึด `docs/AI_CREATOR_COMPLETION_PLAN.md` เป็น contract หลัก โดยเฉพาะ upload preview/validation, Generate blocked states, My Library detail/actions, Creator Studio reuse, Public Gallery detail/reuse และ backend job/storage API เป้าหมายคือทำระบบที่ Maprang เป็นเจ้าของเอง ไม่ใช่รอ clone flow ของ MissAI เพิ่ม

## AI Creator Current Execution Order

ลำดับงาน AI Creator จากจุดนี้:

1. Storage and output actions
   - private signed URL
   - download/refresh URL - backend route/helper, My Library detail handler, and backend output-to-card mapping done
   - retry failed job
   - delete/archive - owner-only output delete route and UI action done
   - favorite/unfavorite - backend output mutation done, UI can connect when backend-backed outputs are attached
   - use as cover
2. Public Gallery contract
   - opt-in publish/unpublish
   - sanitized public DTO
   - report to moderation queue
   - reuse template/reference only when policy allows
3. Video and advanced video
   - keep as schema/disabled module until core image workflow, job API, storage, and QA gate are stable

## AI Generation Architecture

AI Creator ต้องเป็น job-based system ไม่ใช่แค่ปุ่มยิง API ตรง

Required data model concept:

- `GenerationTemplate`
  - `id`
  - `mode`: `text-to-image`, `image-to-image`, `image-to-video`, `advanced-video`
  - `label`
  - `description`
  - `creditCost`
  - `promptRequired`
  - `imageInputCount`
  - `videoInputCount`
  - `acceptedFileTypes`
  - `maxFileSizeMb`
  - `maxDurationSeconds`
  - `aspectRatios`
  - `adultOnly`
  - `providerRequired`
  - `enabled`
- `GenerationJob`
  - `id`
  - `ownerUserId`
  - `templateId`
  - `status`: `draft`, `queued`, `running`, `succeeded`, `failed`, `blocked`
  - `source`: `fallback`, `ai`, `upload`
  - `prompt`
  - `inputs`
  - `outputs`
  - `cost`
  - `failureReason`
  - `createdAt`
  - `updatedAt`
- `GenerationOutput`
  - `id`
  - `jobId`
  - `kind`: `image`, `video`
  - `storageKey`
  - `url`
  - `isFavorite`
  - `visibility`: `private`, `public`

## Upload Preview And Validation

ต้องพัฒนาเองใน Maprang:

- หลังเลือกไฟล์ต้องมี preview ทันที
- แสดงชื่อไฟล์, ขนาด, ชนิดไฟล์
- ลบ/เปลี่ยนไฟล์ได้
- validate ก่อนส่ง backend:
  - file type ไม่ถูก
  - file size เกิน
  - video duration เกิน
  - จำนวนไฟล์ไม่ครบ
  - prompt required แต่ว่าง
- backend ต้อง validate ซ้ำ ห้ามเชื่อ frontend
- error ต้องอ่านรู้เรื่อง ไม่โชว์ raw stack/error
- mobile upload area ต้องกดง่ายและไม่ล้นจอ
- route ที่มี upload preview ต้องใช้ helper กลางจาก `apps/frontend/src/lib/aiCreator.ts` หรือ generation helper ใหม่ ไม่กระจาย validation ซ้ำใน component

## Generate Blocked States

Generate ต้อง disabled หรือ blocked พร้อมเหตุผลในกรณี:

- ยังไม่ได้เลือก template
- prompt required แต่ว่าง
- upload required ยังไม่ครบ
- file type/size/duration ไม่ผ่าน
- token/credit ไม่พอ
- provider ยังไม่ configured
- provider ล่มหรือคืน error
- user level/permission ไม่ถึง
- content mode ไม่ตรงกับ template
- adult template แต่ user/session ไม่ผ่าน age/content gate
- job กำลังรันอยู่แล้วและระบบไม่อนุญาตให้กดซ้ำ

กฎสำคัญ:

- ห้ามหัก token/credit จนกว่า backend รับ job และผ่าน validation ขั้นต้น
- ถ้า provider fail หลังรับ job ต้องบันทึก `failed` พร้อม failure reason และ ledger ต้องไม่ผิด
- ถ้า fallback/system draft ถูกใช้ ต้อง label ชัดว่าไม่ใช่ live provider output
- blocked reason ต้องคำนวณจาก template schema, upload state, prompt state, wallet/token state, provider readiness, user permission, content mode และ running job state

## My Library Requirements

My Library คือพื้นที่งาน generation ของผู้ใช้

- route target: local MVP ผูกเข้า `/ai-creator`; production อาจแยกเป็น `/ai-history` เมื่อมี job API และ owner library จริง
- มี filter:
  - all
  - favorites
  - images
  - videos เมื่อ video module พร้อม
- empty state ต้องมี action กลับไป Create
- card actions:
  - open detail
  - use as character image
  - use as creator cover
  - favorite/unfavorite
  - download เมื่อไฟล์พร้อมและปลอดภัย
  - delete
  - retry failed job
  - copy/reuse prompt เฉพาะ prompt ของผู้ใช้เอง
- detail drawer/modal:
  - output preview
  - status
  - template
  - cost
  - created time
  - failure reason ถ้ามี
- local-safe implementation ที่มีตอนนี้: filter, pagination, open detail, detail drawer, reuse, favorite/unfavorite, delete, clear history, empty state, และ `ใช้รูปนี้` ที่เขียนเข้าร่าง Creator Studio ได้ใน `/ai-creator`
- local-safe implementation status: route/menu audit rows สำหรับ My Library/Public Gallery เสร็จแล้ว, upload validation edge-case tests เสร็จแล้ว, backend generation preflight skeleton เสร็จแล้วเฉพาะ `GET /generation/templates` / `POST /generation/jobs`, Prisma model/migration สำหรับ `GenerationJob` / `GenerationOutput` พร้อมแล้ว, และ `POST /generation/jobs` บันทึก blocked/no-debit job ได้เมื่อ DB/migration พร้อม
- next implementation target: blocked-state QA matrix, storage/download/retry, billing idempotency, และ UI QA matrix ที่แสดง blocked states ให้เช็คได้จากหน้าเว็บโดยตรง
- My Library ต้องเป็น private owner library เสมอ ถ้ายังไม่มี backend job API ให้ใช้ local-safe history พร้อม label ชัด ไม่ใช้ data production ปลอม

## Public Gallery Requirements

Public Gallery ยังไม่ใช่ MVP core แต่ต้องวางสัญญาไว้

- generated outputs ต้อง private by default
- publish to public ต้องเป็น opt-in action เท่านั้น
- gallery card ต้องมี report action
- reuse prompt ต้องไม่ expose private prompt โดยไม่ตั้งใจ
- ถ้าเปิด public gallery ใน local ต้องใช้ QA seed หรือ empty state ไม่ใช่ data ปลอมที่ดูเหมือน production
- interactions ที่ต้องมีเมื่อทำจริง:
  - Latest / Most Viewed
  - Load More
  - detail view
  - favorite/like
  - report
  - reuse template
  - use as reference เฉพาะเมื่อ policy อนุญาต
- reuse flow ต้องแยกให้ชัด:
  - reuse template = ใช้ template/schema เดิม
  - reuse prompt = ใช้เฉพาะ prompt ที่เจ้าของเปิดเผยหรือระบบ sanitize แล้ว
  - use as reference = ใช้ media เป็น reference ได้เฉพาะเมื่อ visibility/policy อนุญาต
- ห้าม expose private prompt, private source file, หรือ storage key ใน Public Gallery response
- ถ้ายังไม่พร้อม backend/moderation ให้ Public Gallery เป็น empty/future state พร้อมอธิบายว่า output ส่วนตัวอยู่ใน My Library
- local-safe implementation ที่มีตอนนี้: `/ai-creator` แสดง Public Gallery contract panel แบบ private-by-default, empty state, และ disabled actions พร้อมเหตุผล โดยไม่ใช้ข้อมูลสาธารณะปลอม
- next implementation target: public DTO, opt-in publish/unpublish, report moderation queue, sanitized reuse template/reference flow, และ admin audit log

## API Plan

Target backend routes เมื่อขยายจาก local-safe history ไปเป็น job system จริง:

- `GET /generation/templates` - เสร็จแล้วในฐานะ template registry/preflight route
- `POST /generation/jobs` - เสร็จแล้วในฐานะ local-safe blocked preflight route, ยังไม่ debit, ยังไม่เรียก provider, ยังไม่เขียน storage
- `GET /generation/jobs` - เสร็จแล้วสำหรับ owner read path
- `GET /generation/jobs/:id` - เสร็จแล้วสำหรับ owner detail read path
- `POST /generation/outputs/:id/favorite` - เสร็จแล้วสำหรับ owner-only output favorite
- `DELETE /generation/outputs/:id/favorite` - เสร็จแล้วสำหรับ owner-only output unfavorite
- `POST /generation/jobs/:id/cancel`
- `POST /generation/jobs/:id/retry`
- `DELETE /generation/jobs/:id`
- `POST /generation/outputs/:id/favorite`
- `DELETE /generation/outputs/:id/favorite`
- `POST /generation/outputs/:id/use-as-character-image`
- `GET /generation/gallery`
- `POST /generation/gallery/:outputId/publish`
- `DELETE /generation/gallery/:outputId`
- `POST /generation/gallery/:outputId/report`

Rules:

- all owner resources require auth/owner guard
- public gallery uses separate visibility guard
- admin/moderation actions produce audit logs
- file upload uses storage abstraction and production signed URL path
- local fallback remains available for local QA
- frontend ต้องเรียกผ่าน `apps/frontend/src/lib/api.ts` หรือ helper API กลางเท่านั้น ห้าม component เรียก `fetch` ตรง

## Frontend Plan

Core components:

- `GenerationTemplatePicker`
- `GenerationInputPanel`
- `GenerationUploadSlot`
- `GenerationCostSummary`
- `GenerationBlockedReason`
- `GenerationJobCard`
- `GenerationJobDetail`
- `GenerationLibrary`
- `GenerationGallery`
- `UseGeneratedImageAction`

State management:

- Redux slice for generation templates/jobs/library
- local draft state for prompt/uploads
- optimistic favorite/delete only with rollback
- no raw provider key in frontend

## QA Plan

Required checks for this scope:

```powershell
bun run frontend:components:test
bun run frontend:static:audit
bun run frontend:route:audit
bun run api:audit
bun run backend:check
bun run e2e:smoke
```

Add focused tests:

- upload slot validates type/size/count
- generate disabled reason for missing prompt/files
- insufficient token does not create debit
- provider missing returns fallback/blocked state with readable copy
- job success appears in My Library
- failed job displays retry/delete
- use generated image fills Creator Studio image
- public gallery publish requires explicit opt-in

## Acceptance Criteria

This work is complete locally when:

- Chat + Creator + Character Lobby + My Chats core loop works without demo fallback
- `/ai-creator` supports text-to-image and basic image-to-image states
- Creator Studio can consume generated image output
- Generate button never acts without clear validation and cost state
- My Library shows real user-owned jobs or a clear empty state
- Public Gallery is disabled/future or opt-in with report/moderation guard
- all routes/buttons have action or disabled reason
- relevant QA gates pass
