# MissAI Logged-In Flow Audit For Maprang

## Current Maprang Decision - 2026-06-17

The latest Maprang AI Creator implementation plan now lives in `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`, with task-level gap closure in `docs/AI_CREATOR_FLOW_GAP_PLAN.md`.

Use this audit as reference evidence only. Do not clone payment/top-up flows, do not copy explicit UGC prompt/media content, and do not block Maprang implementation while waiting for exact MissAI behavior. For missing or partially observed MissAI flows such as upload validation, generated-library detail actions, public-gallery reuse, provider blocked states, and advanced video states, implement the Maprang-owned contract from `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md` and the active checklist in `docs/AI_CREATOR_FLOW_GAP_PLAN.md`.

Latest gap ownership: Upload preview/validation, Generate blocked states, My Library detail/actions, and Public Gallery detail/actions/reuse are no longer research blockers. They are Maprang-owned implementation work. Treat MissAI as a layout/interaction reference only, and implement the safer Maprang contract from the two canonical AI Creator documents.

วันที่สำรวจ: 2026-06-16  
แหล่งอ้างอิง: `https://www.missai.day` ผ่าน Chrome extension session ที่ล็อกอินแล้ว  
ขอบเขต: ศึกษา route, menu, feature, state, validation, loading, permission, empty state และ interaction flow เพื่อนำไปใช้กับ Maprang  
ข้อจำกัด: ไม่ทดสอบซื้อ/เติมเงินจริง, ไม่กดลบข้อมูล, ไม่ logout/delete account, ไม่บันทึกข้อมูลส่วนตัวลงเอกสาร

## Executive Summary

MissAI ใช้ dark marketplace shell ที่หนาแน่นและคุ้นมือสำหรับ character chat platform:

- Sidebar ถาวรบน desktop พร้อม account block ด้านล่าง
- หน้า marketplace ใช้ rail/grid/card density สูง, search, filter, ranking tabs
- Creator Studio เป็น workbench มี Save, Preview, Publish, Schedule และ validation ชัด
- Chat/profile เป็น play surface เดียวกัน มี model selector, chat history, timeline, memory, custom prompt, creative library, comments และ per-message actions
- Wallet/points/task/settings/favorites/works อยู่ใน account shell เดียวกัน

ทิศทาง Maprang:

- ควรยึดความคุ้นมือแบบ MissAI/Khuiai แต่เพิ่มระบบของ Maprang เช่น Relationship Contract, Scene Mode, relationship timeline, memory/context inspector และ creator preview simulator
- ทุกปุ่มใน UI ต้องมีผลจริง หรือ disabled/empty state ที่บอกเหตุผลชัด
- อย่าสร้าง fake marketplace/payment ถ้า backend หรือ payment ยังไม่พร้อม

## Logged-In Navigation Map

| MissAI label | MissAI route | Maprang target | Notes |
| --- | --- | --- | --- |
| Explore | `/home` | `/` | character marketplace |
| Top Up | `/points/recharge` | `/wallet` | ห้ามเปิดเงินจริงจนกว่าจะมี payment provider |
| Creation | `/creation` | `/create` | creator workbench |
| Creative Plaza | `/creative-plaza` | `/creative-plaza` หรือ future preset marketplace | prompt/style/module marketplace |
| AI Drawing | `/ai-creator` | `/ai-creator` | AI image generation/library |
| Announcements | `/announcements` | `/announcements` | system/news/changelog |
| Top Authors | `/creators` | `/creators` | creator ranking |
| Download App | `/download` | future/disabled | PWA/app promo |
| Support | `/support` | `/support` | FAQ/support/feedback |
| Messages | `/notifications` | `/events` หรือ `/notifications` | event inbox/notice |
| Task Center | `/points/invitation` | `/wallet` หรือ future `/tasks` | rewards/invite/tasks |
| Favorites | `/favorites` | `/favorites` | favorite characters |
| Play History | `/history` | `/chats` | chat history |
| My Works | `/works` | `/works` | creator inventory |
| Points Center | `/points` | `/wallet` | balance/ledger/rewards |
| Settings | `/settings` | `/profile` | profile/persona/settings |

## Home / Explore

Observed:

- Sidebar + account block.
- Search input, filter button, guide banner.
- Character rails/sections: recommended, showcase, hot, AI gallery, ranking tabs.
- Card contains image, score/percent, title, author/bio, metrics, tags, hover/start-chat action.
- AI Gallery has hide/refresh controls.
- Ranking tabs include latest/time-window/category-like filters.

Maprang requirements:

- `/` should feel like a marketplace, not a dashboard.
- Continue Chatting should be a rail/card section near top, styled consistently with other rails.
- Search/filter/tabs must filter real data or show clear empty states.
- Character cards should link to `/characters/:id` and expose status badges such as relationship-ready/scene-ready.

## Creator Studio Flow

Observed route: `/creation`

Header actions:

- Back, Back to Home
- Prompts, World Book, CG Images
- Creation Guide, Advanced Guide, Author Incentives
- Import, Export
- Save, Preview, Publish, Schedule

Main sections:

- Cover upload
- Work name
- Summary
- Creator note
- Category/orientation/tag modal
- Detailed description
- Greeting
- Quick commands
- Prompt settings
- Reply style/UI skin
- Built-in CSS settings

Category modal:

- Required orientation
- Required work type/category
- Optional tags with limit
- Optional personality/source fields
- Reset, Cancel, Confirm

Real interaction audit:

- Filled a safe QA draft and selected valid category values.
- Clicking Save created or opened a draft URL with id `char-a72c07d7-6c73-4c87-843a-a8443be19a57`, but still showed validation: `Please upload a cover image!`
- Preview stayed disabled while requirements were incomplete.
- Publish showed the same missing-cover validation and did not publish.
- Schedule opened a date picker/modal with date chips and Confirm Schedule, but final schedule should still validate cover/required fields.

Maprang requirements:

- Save/Preview/Publish/Schedule must have readiness checks and readable disabled reasons.
- Missing image/greeting/category should show inline validation and toast.
- Schedule may open date picker, but final schedule must validate all requirements.
- AI draft/image fill should clearly show loading, fallback, provider error, and completed fill state.
- Adult-mode tag conflicts should warn that the content is simulated/fictional; block only when policy requires it.

## AI Creator Flow

Observed route: `/ai-creator`

Main UI:

- Credit balance visible.
- Tabs: image generation, image-to-image templates, video templates, advanced video.
- Prompt textarea with max length.
- Aspect ratios: 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 5:8.
- AI prompt optimization option.
- Generate button shows cost before click.
- Public Gallery and My Library links.

Real interaction audit:

- Entered safe image prompt.
- Generate button became enabled and showed cost around 600 credits.
- Clicked Generate.
- Generation was blocked by permission/level gate: image generation requires user level 2 or above.
- Balance did not decrease after blocked generation.

Maprang requirements:

- Show cost before generation.
- Permission/level/provider failure must not spend tokens.
- Error should be actionable: insufficient token, provider missing, provider failed, or permission level missing.
- Separate live provider result from fallback/placeholder result.

### AI Creator Detailed Tab Audit

สำรวจเพิ่มเติม: 2026-06-16 ผ่าน Chrome extension session ที่ล็อกอินแล้ว

ตรวจซ้ำล่าสุด: 2026-06-17 ผ่าน in-app browser แต่ session ไม่ติดล็อกอิน จึงเห็นเฉพาะ public/locked state ของ `/ai-creator`:

- sidebar ยังเป็น shell เดียวกับ marketplace
- main page แสดง `AI Art Studio`, prompt textarea, และ Public Gallery link
- Generate disabled เพราะไม่มี template ให้เลือก และ copy ระบุให้เลือก template ก่อน
- เมนู Creation / AI Drawing / Top Up บางรายการ redirect ไป login ใน public state
- ใช้ข้อมูลนี้ยืนยัน locked/guest behavior ได้เท่านั้น ไม่ใช้แทน logged-in template/action audit ด้านล่าง

ข้อจำกัดการสำรวจ:

- ไม่แตะระบบเติมเงินหรือซื้อเงินจริง
- ไม่กด Generate เมื่อปุ่มพร้อมหักเครดิต
- ไม่อัปโหลดไฟล์ส่วนตัว
- ไม่บันทึก prompt/gallery content ที่เป็น explicit user-generated content ลงเอกสารนี้

Shared shell:

- Sidebar เหมือน marketplace หลัก มี Explore, Top Up, Creation, Creative Plaza, AI Drawing, Announcements, Top Authors, Download App, Support
- Account section มี Messages, Task Center, Favorites, Play History, My Works, Points Center
- Header/side account block แสดง level, email, credit balance, experience balance
- Main page แสดง `Credits Balance`
- มี `Public Gallery` และ `My Library` เป็น link คงที่ท้ายหน้า

Tab: `图片生成` / text-to-image

- มี template cards หลายกลุ่ม คิดราคาโดยทั่วไป 600 credits
- กลุ่มที่พบ:
  - general text-to-image
  - anime text-to-image
  - single-character consistency
  - dual-character consistency
  - face-swap / reference-based edit
  - adult-oriented edit templates
- Field หลัก:
  - prompt textarea, placeholder `Describe the image you want to generate...`
  - character/reference uploads เฉพาะบาง template
  - aspect ratio: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `5:8`
  - AI Prompt Optimization toggle
- Generate state:
  - prompt ว่างหรือ input ไม่ครบ: disabled
  - prompt text-to-image ครบ: enabled และยังแสดง `Costs about 600 credits`
- Template input behavior:
  - pure text-to-image: 0 file input + 1 prompt
  - single-character consistency: 1 file input + 1 prompt
  - dual-character consistency: 2 file inputs + 1 prompt
  - face/reference edit: 1 file input + 1 prompt, aspect ratio บางรายการไม่มี `5:8`

Tab: `图生图模板` / image-to-image templates

- เป็น template-driven image-to-image/edit surface
- ราคาโดยทั่วไป 600 credits
- template cards เยอะและแบ่งได้เป็น:
  - anime dual-character templates
  - anime single/dual consistency templates
  - realistic dual-character templates
  - realistic single-character templates
  - adult-oriented pose/edit templates
- Field หลัก:
  - บาง template ไม่มี prompt เลย ใช้ reference images เท่านั้น
  - single-character templates: 1 file input
  - dual-character templates: 2 file inputs
  - consistency templates: 1-2 file inputs + prompt
  - aspect ratio ชุดเดียวกับ image generation: `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `9:16`, `16:9`, `5:8`
- Generate disabled จนกว่าจะมีไฟล์ required ครบ

Tab: `视频模板` / video templates

- เป็น image-to-video template surface
- ราคาโดยทั่วไป 6000 credits
- ไม่มี aspect ratio selector ที่เห็นใน template mode นี้
- Field หลัก:
  - ส่วนใหญ่ต้องอัปโหลด 1 image input
  - บาง template มี prompt textarea เพิ่ม
  - บาง template เป็น one-click style จากรูปเดียว
  - บาง template เป็น audio/video style จากรูปพร้อม prompt
- Generate disabled จนกว่า upload/prompt required จะครบ

Tab: `高级视频` / advanced video

- เป็น advanced video tool surface
- template/tool ที่พบ:
  - video edit tool ราคา 12000 credits
  - action transfer / imitation ราคา 12000 credits
  - video face swap ราคา 6000 credits
  - image-to-video ราคา 6000 credits
  - text-to-video ราคา 6000 credits
- Field behavior:
  - video edit: 1 video file input + prompt
  - action transfer: 1 image input + 1 video input + prompt
  - video face swap: 1 face image input + 1 video input, no prompt
  - image-to-video: 1 image input + prompt
  - text-to-video: prompt only + aspect ratio selector
- Video upload copy states support MP4/WebM/MOV and mention max 50MB or max 30 seconds depending on tool.
- Text-to-video aspect ratios observed: `9:16`, `16:9`, `1:1`, `2:3`, `3:2`
- Generate disabled until required input is complete.

Gallery / Library:

- `Public Gallery` route `/ai-gallery`
  - tabs/buttons: `Latest`, `Most Viewed`, `Load More`
  - card grid shows generated media, media type, aspect ratio, prompt/title text, author, metrics
  - must be treated as UGC and should not be copied verbatim into Maprang docs
- `My Library` route `/ai-history`
  - tabs/buttons: `All`, `Favorites`
  - empty state observed: `No images yet`
  - links back to `Create` and `Public Gallery`

Still not fully observed and must be treated as product requirements rather than cloned behavior:

- Upload preview after selecting files: preview metadata, replace/remove, slot-level errors
- Upload validation failure after wrong MIME/size/duration/count
- Generate blocked states for credit not enough, provider missing/failing, low level, content gate, duplicate running job, and missing input in every template family
- My Library detail modal/page actions after an item exists: reuse template/prompt, use as character image, use as cover, favorite, retry, delete, download, signed URL refresh
- Public Gallery detail/actions/reuse flow: open detail, report, reuse template, use as reference, sanitized prompt visibility
- Mobile responsive behavior for logged-in AI Creator tabs and library/gallery detail views

Maprang rule for these gaps: implement repo-owned behavior from `docs/AI_CREATOR_COMPLETION_PLAN.md`; do not wait for exact MissAI cloning and do not invent production data.

Maprang implementation implications:

- Build AI Creator as a job-based tool, not a single prompt form.
- Required schema per template:
  - `mode`: text-to-image, image-to-image, image-to-video, advanced-video
  - `templateId`
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
- UI must compute Generate disabled reason from missing prompt/files, insufficient credits, permission level, provider unavailable, and policy/content mode.
- Do not debit credits until backend accepts a generation job.
- Generation should create a job record with statuses: queued, running, succeeded, failed, blocked.
- `My Library` should read generated job outputs by owner and support filter all/favorites.
- `Public Gallery` should be opt-in only for Maprang; default generated outputs stay private.
- For Maprang MVP, implement:
  - text-to-image
  - image-to-image character consistency
  - creator-cover generation
  - library/history
- Defer video templates and advanced video until the core chat/creator loop is stable.

### AI Creator Repo-Owned Completion Plan

สิ่งต่อไปนี้ไม่ควรรอ clone flow ของ MissAI เพิ่ม เพราะเป็นระบบที่ Maprang ต้องออกแบบเองให้ปลอดภัยและต่อยอดได้:

Canonical Maprang plan: `docs/AI_CREATOR_COMPLETION_PLAN.md`

- Upload preview/validation:
  - preview ทันทีหลังเลือกไฟล์
  - แสดงชื่อไฟล์, ขนาด, ชนิดไฟล์, จำนวน input ที่ครบ/ขาด
  - validate type/size/duration/count ฝั่ง frontend เพื่อ UX และ validate ซ้ำฝั่ง backend เพื่อ security
  - error copy ต้องเป็นข้อความอ่านรู้เรื่อง ไม่ใช่ raw provider/runtime error
  - slot validation ต้องแยกตาม template: text-to-image, image-to-image, video template, advanced video
- Generate blocked states:
  - blocked จาก prompt ว่าง, upload ไม่ครบ, credit ไม่พอ, level/permission ไม่ถึง, provider ยังไม่ configured, provider/rate-limit fail, content mode ไม่ตรง, age/content gate ไม่ผ่าน, หรือ job กำลังรันอยู่
  - ไม่ debit credit/token จนกว่า backend รับ job และ validation ขั้นต้นผ่าน
  - ถ้าใช้ fallback/system draft ต้อง label ชัดว่าไม่ใช่ live provider output
  - blocked state ต้องเป็น product copy ที่อ่านรู้เรื่องและควรมี next action เช่น เติม input, เปลี่ยน template, เปิด content mode, หรือลองใหม่ภายหลัง
- My Library detail/actions:
  - local MVP ใน `/ai-creator` มี history, filter, pagination, select/reuse, delete, clear history แล้ว
  - next step คือ detail drawer, favorite/unfavorite, retry failed job, use as character image, use as creator cover, download เฉพาะไฟล์ที่พร้อม
  - detail ต้องแสดง source/fallback/live, status, template, cost/debit state, failure reason และ action ที่ทำได้จริง
- Public Gallery detail/actions/reuse:
  - default generated outputs ต้อง private
  - publish public ต้อง opt-in
  - detail ต้องมี report, reuse template, use as reference เฉพาะ policy อนุญาต
  - reuse prompt ต้องไม่เปิด private prompt หรือ private storage key
  - ถ้ายังไม่มี moderation/public backend ให้เป็น future/empty state ไม่ใช้ gallery ปลอม
- Job status:
  - `draft`, `queued`, `running`, `succeeded`, `failed`, `blocked`
  - success/failed detail ต้องมี status, template, cost, created time, failure reason, retry/delete action

Maprang ไม่ต้องรอเก็บ MissAI ให้ครบก่อนพัฒนา เพราะระบบเหล่านี้ควรเป็น repo-owned design:

- upload preview/validation ให้สร้างเองตาม `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
- Generate blocked states ให้คำนวณจาก template schema, token state, provider state, content mode, และ required inputs
- My Library ให้ private-by-default และแสดงเฉพาะงานของ user
- Public Gallery ให้เป็น opt-in เท่านั้น พร้อม report/moderation guard
- ระบบเงิน/เติมจริงยังอยู่นอก scope
- รายละเอียด implementation target ล่าสุดอยู่ที่ `docs/AI_CREATOR_COMPLETION_PLAN.md`

### AI Creator Maprang Sync - 2026-06-17

อัปเดตจาก repo ปัจจุบัน:

- `/ai-creator` มี local-safe My Library แล้ว โดยรองรับ filter, pagination, open detail, reuse, favorite/unfavorite, delete, clear history และ empty state
- detail drawer แสดง preview, source/status/type/cost, prompt, brief, draft fields, system prompt และ action ที่ทำได้จริง
- `ใช้รูปนี้` จาก My Library เขียน selected output เข้า Creator Studio draft contract ได้โดยไม่ต้อง copy URL เอง
- Public Gallery ใน Maprang ยังไม่เปิดเป็น gallery จริง แต่มี contract panel แบบ private-by-default, no fake public data, และ disabled actions พร้อมเหตุผล
- backend generation foundation มี `GET /generation/templates`, `POST /generation/jobs`, Prisma model/migration `GenerationJob` / `GenerationOutput`, และ blocked/no-debit persistence เมื่อ DB/migration พร้อม
- owner library read routes (`GET /generation/jobs`, `GET /generation/jobs/:id`) และ frontend helper/read path ผ่าน API boundary พร้อมแล้ว
- งานต่อที่ควรทำจากจุดนี้คือ blocked-state QA matrix, storage/download/retry/delete/favorite/use-as-cover, แล้วค่อย Public Gallery opt-in/sanitized/report/moderation/audit

ข้อห้ามสำหรับงานต่อ:

- อย่าใส่ public gallery seed ที่ดูเหมือน production ถ้ายังไม่มี moderation/visibility backend
- อย่าใช้ prompt หรือ media explicit จากเว็บอ้างอิงเป็นตัวอย่างใน repo
- อย่าทำ reuse prompt จาก public gallery โดยไม่ผ่าน sanitized public prompt contract
- อย่านับ fallback image เป็นหลักฐานว่า live image provider พร้อม production

## Chat Flow After Real Send

Observed route: `/profile?id=...` as combined profile/chat surface.

Real interaction audit:

- Sent one safe QA message.
- While AI generated: composer placeholder changed to waiting state, send/regenerate disabled.
- User message showed actions: Copy, Edit, Delete.
- After reply completed: composer returned to normal, regenerate enabled.
- AI reply showed actions: Play, Delete, Edit, Regenerate.
- Reply displayed model name and point cost.
- Balance decreased from 2120 to 1969, so one reply cost 151 points in this test.
- Suggested replies appeared as a numbered reply-choice block.

Chat controls observed:

- New Chat
- Parallel Timeline
- Chat History
- Model selector
- Favorite
- Share
- Chat Settings
- Stream/Non-stream toggle
- Comments
- Custom
- Memory
- Creative library
- Quick commands

Maprang requirements:

- Chat must have one clear composer.
- During streaming/generation: disable send/regenerate and show waiting state.
- Show per-turn token/point cost when available.
- Suggested replies can be adapted into Maprang scene/relationship next-action suggestions.
- Per-message actions should be scoped and predictable: copy, edit, delete, report, regenerate, play/TTS if supported.

## Model Selector

Observed:

- Opens as right drawer.
- Shows current model.
- Groups include Favorites, Featured, Gemini, Grok, Claude, OpenAI, DeepSeek, Qwen.
- Each model shows provider/rate/price information.
- Some models show daily limit/rate-limit warnings.

Maprang requirements:

- Model selector should be tied to backend model router.
- Show model cost, capability, provider state, and unavailable/limited state.
- BYOK mode should be clearly separated from platform-credit mode.

## Chat Settings

Observed settings:

- Font size
- Line height
- Show thinking
- List mode
- Base memory rounds
- Enhanced memory
- Model parameters:
  - temperature
  - top_p
  - presence penalty
  - frequency penalty
  - max response length
- Each parameter includes plain-language guidance.

Maprang requirements:

- User-facing advanced settings should not be hidden if they affect reply depth.
- Defaults should be sane; advanced controls can live behind an expandable panel.
- Max reply length is directly relevant to the user's complaint that bots answer too short.

## Memory Panel

Observed:

- Opens as memory timeline.
- Shows round number, timestamp, send/original state.
- Shows generated round summary.
- Shows whether original text is sent directly to AI or summarized.
- Has edit/delete memory item controls.

Maprang requirements:

- Relationship Timeline and Memory should be visible and editable in a controlled way.
- Store round summaries, scene outcomes, relationship changes, and important facts separately.
- Prompt Inspector should show which memory items were injected into final prompt.

## Custom Prompt Panel

Observed:

- Custom Settings panel with Export/Import.
- Sections:
  - before main prompt / author worldview
  - after main prompt / author main prompt
  - after user reply / highest attention
- Add Setting action per section.

Maprang requirements:

- Maprang can adapt this into creator/user prompt modules:
  - character identity
  - world/lore
  - relationship contract
  - user persona
  - scene objective
  - custom per-chat instruction
- Import/export should be available only when the format is validated.

## Comments

Observed:

- Opens comment panel.
- Shows comment count and rating.
- Sort by time/likes.
- Comment input suggests commenting after deeper play-through.

Maprang requirements:

- Character comments/reviews can be future scope.
- If exposed early, keep it read-only or require actual backend moderation/reporting.

## Share

Observed:

- Share opens a modal for app/download/invite share with QR/link/invite code.
- This is not a chat snippet share.

Maprang requirements:

- Separate Share Character, Share App/Invite, and Share Chat Snippet.
- Do not mix invite links with chat export UI.

## Creative Library

Observed:

- Opens full-screen overlay.
- Tabs: Plaza, Purchased, Mine.
- Empty state: user's library is empty.
- CTA: Browse plaza.

Maprang requirements:

- Start as curated prompt/style/lore preset library.
- Do not show purchase states until marketplace/economy backend exists.
- Creator Studio should be able to import presets from this library.

## Parallel Timeline

Observed:

- Opens full-screen marketplace/community timeline surface.
- Tabs include Hot, Latest, Top Rated, plus My Shares.
- Timeline cards show creator, rounds, unlocks, new labels, title/summary.

Maprang requirements:

- Separate "my branches/timelines" from "community timelines".
- For Maprang v1, this can map to scene replay / alternate route / universe branch.
- Avoid showing community marketplace until moderation and sharing backend are ready.

## Wallet / Points / Task Center

Observed:

- Points balance.
- Coupon/redeem.
- Transaction history.
- Level/experience.
- Monthly card/package cards.
- Task center/invite/reward sections.

Maprang requirements:

- `/wallet` should show balance, usage ledger, model cost breakdown, admin adjustments if admin, and future top-up placeholders.
- Real purchase UI must remain disabled/future until payment provider is ready.
- BYOK/developer API mode belongs in profile/settings, with wallet showing current billing mode.

## Settings / Profile

Observed:

- Account summary and points.
- Username/nickname/gender.
- Email verification reward.
- Invite code copy.
- Language settings.
- Content preferences.
- Gallery visibility.
- Daily check-in.
- Logout/delete account.

Maprang requirements:

- `/profile` should include persona, content mode/age gate, language/theme, account state, wallet summary, BYOK settings.
- Never store raw provider keys insecurely on frontend in production.

## Notifications / Events

Observed:

- Tabs: All, Unread, Read.
- Empty states for comments/replies/notifications.

Maprang requirements:

- `/events` should include pending scenes, relationship events, moderation/account notices, unread/read filter, and jump-to-chat action.

## Works / Favorites / Creators / Announcements / Support

Observed:

- Favorites: empty state with discover CTA.
- Works: My Works, My Parallel Timelines, My Creatives, status filter, search, create CTA.
- Creators: creator rankings.
- Announcements: category tabs and selected-detail view.
- Support: support contacts, FAQ tabs, feedback form.

Maprang requirements:

- These pages should not be fake. If backend is missing, use clear local/future state and useful CTA.
- Works should become creator inventory: drafts, published, archived, simulator-ready, AI draft waiting review.
- Support feedback form should either post to backend or say exactly why it is unavailable.

## Mobile Responsive Status

Logged-in MissAI mobile viewport was not fully testable through the current Chrome extension session because viewport override is available only on the in-app browser, not on the logged-in Chrome extension browser.

Follow-up options:

- Log in to MissAI inside the in-app browser and rerun mobile viewport checks.
- Or capture real mobile screenshots manually for `/home`, `/creation`, `/ai-creator`, `/profile`, `/points`, `/settings`, `/creative-plaza`.

## Maprang Implementation Checklist

Immediate:

- Align `/`, `/chats`, `/chat`, `/create`, `/ai-creator`, `/wallet`, `/profile`, `/events` with this audit.
- Add visible disabled reasons for every unsupported action.
- Add max reply length and model cost controls to chat settings.
- Add memory/timeline visibility to chat.
- Make creator save/preview/publish/schedule readiness explicit.

Near-term:

- Add creative library as curated prompt/style/lore presets.
- Add community timeline only after sharing/moderation backend is ready.
- Add comment/review after report/moderation flow is solid.

Blocked by external systems:

- Real payment/top-up.
- Live image provider production verification.
- Production/staging domain and CORS.
- Full logged-in mobile MissAI comparison.

## Audit Side Effects

- One safe QA chat message was sent to observe real chat behavior.
- That message consumed 151 points in the observed account.
- One safe creator draft id was opened/created while testing Save validation: `char-a72c07d7-6c73-4c87-843a-a8443be19a57`.
- No purchase/top-up flow was executed.
- No destructive account/delete/logout action was executed.
