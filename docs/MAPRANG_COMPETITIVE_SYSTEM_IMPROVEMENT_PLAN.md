# Maprang Competitive System Improvement Plan

Last updated: 2026-06-18

## เป้าหมาย

แผนนี้สรุปสิ่งที่ควรปรับปรุง Maprang จากข้อมูลที่เก็บจาก MissAI, Khuiai, Nectar, CrushOn, Candy AI, SpicyChat, JanitorAI, Sakura, CraveU, MyBabes, AI Haven และ Yollo โดยแปลง "จุดเด่นของตลาด" ให้เป็น task ที่ปิดช่องว่างของระบบ Maprang ได้จริง

เอกสารนี้ไม่ใช่การ copy prompt, implementation, รูป, paid flow หรือ UGC ของคู่แข่ง ใช้เป็น product/system roadmap เท่านั้น

## Source Documents

- `docs/MISSAI_TEMPLATE_AUDIT.md`
- `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`
- `docs/KHUIAI_REFERENCE_AUDIT.md`
- `docs/COMPETITOR_FEATURE_AUDIT.md`
- `docs/COMPETITOR_MODEL_PROMPT_AUDIT.md`
- `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`
- `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
- `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`
- `memory/working-context.md`
- `memory/qa-status.md`

## Current Maprang Gap Summary

Maprang มี foundation ที่ดีแล้ว:

- local server เล่นได้
- chat runtime มี relationship, scene, world state, memory summary
- Prompt Inspector, evals, Admin Health และ process-mining เริ่มมีแล้ว
- AI Creator มี My Library/Public Gallery/reuse/blocked state พื้นฐาน
- BYOK/server-side vault, wallet ledger, report/moderation, API audit มีแล้ว

ช่องว่างหลักที่ยังทำให้ product ยังไม่ "ลื่นและลึก" เท่า reference:

1. Chat ยังขาด control ที่ผู้ใช้เข้าใจง่ายสำหรับความยาว/ความลึก/สไตล์คำตอบ
2. Creator ยังไม่แสดง context/token budget ให้คนสร้างรู้ว่าทำไมบอทตอบตื้นหรือจำไม่ดี
3. Persona ยังเป็น global เป็นหลัก ยังไม่รองรับตัวตนเฉพาะแชท
4. Adult/content mode ยังควรเป็น taxonomy และ discovery gate ไม่ใช่ toggle เดียว
5. AI Creator ยังควรเชื่อมกลับ chat แบบ "สร้างภาพจากฉากนี้"
6. Lorebook/world memory และ Director Mode ยังไม่เป็น first-class UX
7. Universe/group chat ยังไม่มี data/UI contract ที่พร้อมต่อยอด
8. Analytics มี backend/admin panel แล้ว แต่ frontend event capture ยังไม่ครอบ marketplace/lobby/creator/wallet/report
9. UI บางหน้าไปทาง MissAI แล้ว แต่ core play/create ยังต้อง refine ต่อหลัง refactor

## Strategic Product Principles

1. Familiar first, depth second
   - หน้าแรก, แชท, สร้างตัวละคร ต้องคุ้นแบบ MissAI/Khuiai ก่อน
   - ระบบ Maprang เช่น relationship, scene, memory, prompt inspector ต้องเป็น layer เพิ่ม ไม่ทำให้ flow แรกยาก

2. Local-first is the current release target
   - ทุก feature ต้องมี local-safe behavior
   - live provider/storage/deployment เป็น external readiness ไม่ใช่ข้ออ้างให้ UI มีปุ่มตัน

3. Adult mode must be structured
   - Mature/adult discovery ต้องมี age/content gate
   - Public discovery เข้มกว่าห้องแชท private
   - ห้าม minor/ambiguous-age sexual content และ real-person intimate misuse

4. Prompt quality must be visible
   - ผู้ใช้บ่นว่าบอทตอบสั้น/ตื้น ต้องแก้ที่ reply control, prompt budget, memory visibility และ evals ไม่ใช่แค่เพิ่ม max token แบบมืด ๆ

5. Every visible control must have a result
   - ถ้าทำไม่ได้ใน local ให้ disabled พร้อมเหตุผล
   - ถ้ารอ provider จริง ให้บอกว่า dependency คืออะไร

## Competitive Feature To Gap Mapping

| Reference pattern | ช่องโหว่ของ Maprang | Maprang improvement |
| --- | --- | --- |
| MissAI image-led dark marketplace | บางหน้าดูเป็น dashboard มากกว่า marketplace | ปรับ Explore/My Chats/Lobby/Creator ให้ภาพและ CTA เป็นแกน |
| Khuiai Thai-first simple IA | UI บางส่วนลึกเกินก่อนผู้ใช้เข้าใจ | ใช้ label สั้น เช่น สำรวจ, แชท, สร้าง, อีเวนต์, โปรไฟล์ |
| SpicyChat generation settings | ผู้ใช้คุมความยาว/ความลึกคำตอบไม่ได้ชัด | Chat Reply Controls และ Model Route drawer |
| SpicyChat Lorebook/Semantic Memory | memory ยังไม่ใช่ creator-facing module | World Memory/Lorebook v1 พร้อม Prompt Inspector visibility |
| SpicyChat Director Mode | ผู้ใช้แก้ทิศทางฉากต้องพูดเป็นบทสนทนา | Director Mode แยกจาก dialogue |
| CrushOn/Yollo model choice | model route ยัง mostly backend/internal | model source/profile แสดงใน chat panel และ wallet usage |
| Candy/Nectar/MyBabes media loop | AI Creator ยังแยกจาก chat มากไป | Chat-to-Image handoff จาก scene/message |
| Khuiai chat tabs | My Chats ต้อง scan ง่ายกว่าเดิม | tabs: แชทส่วนตัว, จักรวาล, จัดเก็บ + three-dot actions |
| CraveU/Yollo adult filters | mature content mode ยังไม่เป็น discovery taxonomy | adult content axes + Explore filters + age gate |
| Creator docs/token advice | creator ไม่เห็น prompt/context cost | Creator Token/Context Budget Meter |
| JanitorAI/BYOK pattern | BYOK มีแล้วแต่ยังไม่เป็น product setting เต็ม | Provider mode surface + safe vault/session-only behavior |
| Adult platform compliance pages | safety ยังไม่เป็น user-facing product surface พอ | Safety & Content Rules page + moderation evidence |

## Roadmap Overview

### P0 - Source Of Truth And Measurement

ทำให้แผน, analytics, QA และ route/menu audit เป็นฐานก่อนเพิ่ม feature ใหญ่

### P1 - Core Play Quality

แก้ปัญหาบอทตอบสั้น/ตื้น, user คุมจังหวะไม่ได้, context ไม่โปร่งใส

### P2 - Creator Quality

ทำให้คนสร้างบอทเห็นคุณภาพ prompt, import ได้, preview ได้, และ publish อย่างมั่นใจ

### P3 - Content Mode And Discovery

ทำ mature/adult mode ให้เป็นระบบ discovery/content taxonomy ที่ควบคุมได้

### P4 - Media Loop

เชื่อม chat, scene และ AI Creator เป็น loop เดียว

### P5 - Memory, Director, Universe

เพิ่มระบบสำหรับ long-form roleplay และ multi-character world

### P6 - Observability And Product Analytics

เก็บ event จาก frontend ให้ process-mining ใช้ตัดสินใจต่อได้

### P7 - UI/UX Consolidation

refactor และ redesign หน้าหลักให้ไปทางเดียวกันแบบ MissAI/Khuiai โดยยังเป็น Maprang

### P8 - QA, Security, Release Gate

ล็อก behavior ด้วย test/e2e/security/docs ก่อนค่อยขยับ production

## Detailed Tasks

## P0 - Source Of Truth And Measurement

### `P0.1` Register This Plan In Agent Entry Points

Owner: docs

Tasks:

- เพิ่มเอกสารนี้ใน `AGENTS.md` quick start
- เพิ่มเอกสารนี้ใน `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md` source docs
- เพิ่ม memory note ว่าแผนนี้เป็น product/system improvement roadmap หลัง competitor research

Acceptance:

- future agent เห็นแผนนี้จาก entry point
- `docs:commands` และ `memory:audit` ผ่าน

QA:

- `bun run docs:commands`
- `bun run memory:audit`
- `git diff --check`

### `P0.2` Convert Open Ideas Into Trackable Backlog

Owner: docs/product

Tasks:

- แตก task ในแผนนี้เป็น issue/backlog format เมื่อจะเริ่ม implementation
- ทุก task ต้องมี route/module, API impact, DB impact, QA gate
- ห้ามเพิ่ม feature ใหม่โดยไม่มี acceptance และ disabled/fallback behavior

Acceptance:

- เริ่มงานได้ทีละ task โดยไม่ต้องอ่าน competitor docs ทั้งหมดซ้ำ

QA:

- `bun run remaining-plan:audit` ถ้ามีการผูกกับ remaining-plan

### `P0.3` Keep Competitor Research Boundaries Explicit

Owner: product/security

Tasks:

- ระบุใน docs ว่า competitor research ใช้เป็น feature strategy เท่านั้น
- ห้ามนำ prompt/text/media/payment/private implementation จากคู่แข่งมาใส่ repo
- ถ้าเพิ่ม adult feature ต้องผ่าน content taxonomy และ moderation plan

Acceptance:

- ไม่มีเอกสารหรือ seed data ที่ copy explicit competitor content
- `secrets:check` และ audit ไม่มีข้อมูลต้องห้าม

QA:

- `bun run secrets:check`
- manual docs review

## P1 - Core Play Quality

### `P1.1` Chat Reply Controls

Owner: frontend/backend/chat

Problem:

ผู้ใช้ไม่พอใจกับคำตอบที่สั้นหรือตื้น แต่ปัจจุบันการคุมความลึกยังเป็น env/backend policy มากกว่าปุ่มที่ผู้ใช้เข้าใจ

Tasks:

- เพิ่ม chat settings drawer ใน `/chat` และ `/chat/:chatId`
- เพิ่ม basic controls:
  - ความยาวคำตอบ: สั้น, สมดุล, ละเอียด, ฉากเข้มข้น
  - สไตล์: แชทเร็ว, โรลเพลย์, บรรยาย, cinematic scene
  - ความเข้มอารมณ์: เบา, ปกติ, เข้ม
- map controls ไป `replyProfile` และ `modelRoute`
- ส่งค่าใน `sendChat` และ `streamChat`
- persist ค่าใน chat metadata/world state หรือ settings table
- แสดงค่าปัจจุบันใน chat right panel
- Prompt Inspector ต้องเห็น reply profile/model route

Backend/API:

- เพิ่ม request schema field: `replyProfile`, `modelRoute`
- validate allowed profiles
- persist metadata in message/usage/context snapshot

DB:

- ถ้ายังไม่มี field ที่เหมาะสม ให้ใช้ chat metadata ก่อน
- migration แยกถ้าจะทำเป็น column จริง

Acceptance:

- ผู้ใช้เปลี่ยน profile แล้วคำตอบ local มีความยาว/สไตล์ต่างกันชัด
- provider/live route ใช้ profile เดียวกัน
- Prompt Inspector แสดง profile ที่ใช้
- disabled reason ชัดถ้าบาง model route ใช้ไม่ได้

QA:

- backend chat runtime tests
- frontend component test สำหรับ drawer
- `bun run api:audit`
- focused Playwright ส่งแชทด้วย profile อย่างน้อย 2 แบบ

### `P1.2` Model Source Surface

Owner: frontend/backend/wallet

Problem:

Maprang มี managed provider, BYOK, local mode แต่ผู้ใช้ยังไม่เห็นชัดว่ากำลังใช้ source ไหนและจะเสีย token/cost อย่างไร

Tasks:

- แสดง model source ใน chat panel:
  - ค่าเริ่มต้นระบบ
  - BYOK vault/session
  - local mode
- Wallet usage group by model route/provider source
- Admin Health แสดง readiness ราย route ไม่ใช่แค่ provider เดียว
- ถ้า BYOK เปิด ให้แสดง warning ว่า key/session/vault ใช้อย่างไร

Acceptance:

- ผู้ใช้รู้ว่าคำตอบนี้มาจาก local/BYOK/system
- usage/ledger metadata มี provider source

QA:

- wallet tests
- chat metadata tests
- `bun run frontend:check`
- `bun run backend:check`

### `P1.3` Director Mode

Owner: chat/prompt-inspector

Problem:

ผู้ใช้ต้องการกำกับฉาก แต่ถ้าพิมพ์เป็นบทสนทนาปกติ AI อาจตีความเป็นคำพูดของตัวละคร/ผู้เล่น

Tasks:

- เพิ่ม composer mode: `ข้อความ` / `กำกับฉาก`
- Director command ไม่ถูกบันทึกเป็น normal dialogue
- prompt stack เพิ่ม section `Director Command`
- Prompt Inspector diff แสดง director section
- UI แสดง badge ว่ารอบนี้เป็นคำสั่งกำกับ
- เพิ่ม clear/expire behavior หลังใช้ 1 turn หรือจนกว่าผู้ใช้ pin ไว้

Acceptance:

- director command ส่งผลต่อคำตอบ แต่ไม่ปรากฏเป็น bubble ปกติ
- Prompt Inspector บอกได้ว่าคำตอบเปลี่ยนเพราะ director command

QA:

- backend prompt section tests
- chat runtime tests
- Playwright composer mode smoke

### `P1.4` Scene Pacing And Skip/Save UX

Owner: chat/scene

Problem:

Maprang มี Scene Mode แล้ว แต่ต้องทำให้ event ready, enter, skip, save later, exit ดูเป็นธรรมชาติและไม่ขัดแชท

Tasks:

- ปรับ pending scene UI ให้เป็น compact notice
- เพิ่ม action:
  - เข้าฉาก
  - เก็บไว้ก่อน
  - ไม่สนใจฉากนี้
- เก็บ decision เป็น scene event outcome
- แสดง objective แบบสั้น ไม่เป็นกล่องใหญ่รบกวน
- exit scene แล้วมี summary/relationship delta ที่อ่านง่าย

Acceptance:

- ผู้ใช้เข้าใจว่าฉากพร้อมโดยไม่ถูกบังคับ
- scene outcome บันทึก timeline และ analytics event

QA:

- scene runtime tests
- e2e pending scene flow

## P2 - Creator Quality

### `P2.1` Creator Token/Context Budget Meter

Owner: creator/frontend/backend

Problem:

Creator ไม่เห็นว่าฟิลด์ยาวเกินทำให้ memory/chat quality แย่

Tasks:

- เพิ่ม live estimate ใต้ field:
  - คำอธิบาย
  - greeting
  - scenario
  - personality
  - example dialogue
  - lore/memory
- ใช้สี:
  - ดี
  - ระวัง
  - ใหญ่เกิน
- แสดง "พื้นที่ที่เหลือให้ chat memory"
- link ไป Prompt Inspector หรือ preview simulator

Acceptance:

- creator เห็นผลของ prompt size ก่อน publish
- readiness ไม่ block adult conflict โดยไม่จำเป็น แต่เตือนคุณภาพได้

QA:

- frontend component test
- creator readiness tests
- `frontend:static:audit`

### `P2.2` Creator Import JSON

Owner: creator/backend

Problem:

ผู้ใช้ roleplay หลายคนมี character เดิมจากที่อื่น การกรอกใหม่ทั้งหมดเพิ่ม friction

Tasks:

- เพิ่ม import action ใน `/create`
- รองรับ JSON schema v1 ของ Maprang
- map fields เข้าฟอร์ม
- run readiness/tag/content checks หลัง import
- แสดง diff ว่าเติมอะไรเข้ามาบ้าง
- ไม่ publish อัตโนมัติ

Acceptance:

- import JSON แล้วได้ draft ที่แก้ต่อได้
- invalid JSON มี error ไทยอ่านรู้เรื่อง

QA:

- parser tests
- frontend upload/import tests
- e2e import sample

### `P2.3` Creator Preview Simulator Upgrade

Owner: creator/chat-preview

Problem:

Preview simulator มีแนวทางแล้ว แต่ควรสะท้อน reply profile, persona, relationship seed และ token budget

Tasks:

- ให้ preview เลือก relationship seed
- ให้ preview เลือก reply profile
- preview 3-5 turns แบบ local-safe
- แสดง warnings:
  - prompt too long
  - weak greeting
  - missing relationship anchor
  - content mode mismatch

Acceptance:

- creator เห็น character behavior ก่อน publish โดยไม่ต้องสร้างจริง

QA:

- creator-preview service tests
- frontend component/e2e smoke

### `P2.4` Public Publish Readiness

Owner: creator/moderation

Problem:

Adult/UGC platform ต้องแยก private draft, unlisted, public discovery และ policy review ชัด

Tasks:

- เพิ่ม publish state:
  - draft
  - private
  - unlisted
  - public
  - public discovery blocked
  - review required
- public discovery stricter than private chat
- admin moderation action เปลี่ยน public discovery state ได้
- Creator Studio แสดงเหตุผลถ้า public discovery ไม่ผ่าน

Acceptance:

- creator publish private/unlisted ได้แม้ public discovery ยังไม่ผ่าน
- public grid ไม่โชว์ content ที่ถูก block

QA:

- character persistence tests
- moderation tests
- explore filter tests

## P3 - Content Mode And Discovery

### `P3.1` Adult Content Taxonomy

Owner: backend/frontend/moderation

Problem:

หนึ่ง toggle ไม่พอสำหรับ roleplay ผู้ใหญ่ ต้องรู้ intensity, relationship frame, consent frame, public discovery และ age gate

Tasks:

- เพิ่ม type:
  - content mode: safe, mature_suggestive, adult_explicit
  - intensity: romance, spicy, explicit
  - relationship frame: stranger, dating, partner, ex, affair, rival, toxic, authority, fantasy_taboo
  - power dynamic: none, soft, strong
  - consent frame: clear_consent, fictional_tension, blocked
  - public discovery: allowed, restricted, hidden
- map existing tags เข้าระบบใหม่แบบ backwards-compatible
- Admin Health แสดง content taxonomy readiness

Acceptance:

- backend validate content taxonomy ได้
- frontend cards/filter อ่านค่าพื้นฐานได้
- minor/ambiguous-age adult content hard block

QA:

- content rating tests
- relationship tag validation tests
- moderation tests

### `P3.2` Explore Mature Filters

Owner: frontend/explore

Tasks:

- เพิ่ม filters:
  - ทั่วไป
  - โรแมนซ์
  - เข้มข้น
  - ผู้ใหญ่เท่านั้น
- เพิ่ม compact badges บน character cards:
  - content mode
  - relationship readiness
  - scene-ready
  - memory depth
- ถ้า user ยังไม่ adult-confirmed ให้ซ่อน/blur adult-only cards พร้อม CTA ไป content settings

Acceptance:

- Explore ยัง scan เร็วแบบ marketplace
- adult-only ไม่โผล่ public โดยไม่ผ่าน gate

QA:

- frontend filter tests
- Playwright Explore desktop/mobile

### `P3.3` Safety And Content Rules Page

Owner: frontend/moderation/docs

Tasks:

- เพิ่ม/ปรับ `/support` หรือ route ใหม่ให้มี section กฎเนื้อหา
- อธิบาย:
  - fictional roleplay
  - adult-only modes
  - blocked content
  - reporting
  - creator responsibility
- link จาก Profile, Creator, Report dialog, Admin Health

Acceptance:

- user เข้าใจว่า content เป็น fiction/simulation
- มีทาง report ชัดเจน

QA:

- route/menu audit
- support page e2e

## P4 - Media Loop

### `P4.1` Chat-To-Image Handoff

Owner: chat/ai-creator/storage

Problem:

AI Creator แยกจาก chat มากไป คู่แข่งที่แข็งคือ chat -> image -> library -> reuse

Tasks:

- เพิ่ม message action: `สร้างภาพจากฉากนี้`
- ใช้ input:
  - character id/avatar/cover
  - selected message
  - recent summary
  - active scene objective
  - content mode
- สร้าง generation draft/job ใน AI Creator
- output เป็น private My Library item
- มี fallback/local blocked state ถ้า provider ไม่พร้อม

Acceptance:

- จากแชทสามารถส่ง context ไป AI Creator ได้
- ไม่ publish อัตโนมัติ
- Prompt/metadata redacted ไม่เก็บ secret

QA:

- API helper audit
- generation job tests
- e2e chat message action -> AI Creator draft

### `P4.2` Generated Media Moderation Contract

Owner: moderation/ai-creator

Tasks:

- เพิ่ม report reason สำหรับ generated image/video
- public gallery ต้อง sanitized
- owner-only actions แยกจาก public detail
- admin audit log ครอบ hide/unhide/generated output action

Acceptance:

- public gallery ไม่เปิด owner-only controls
- report/action trace ได้

QA:

- moderation tests
- AI Creator public detail e2e

### `P4.3` Video Template Contract

Owner: ai-creator

Tasks:

- เก็บ video/advanced video เป็น provider-contract state จนกว่าจะมี provider จริง
- แสดง required input, provider missing, level/content gate ชัด
- ห้าม fake generated video

Acceptance:

- ปุ่ม video ไม่ตันและไม่หลอกว่า generated จริง

QA:

- frontend storage tests
- e2e video blocked state

## P5 - Memory, Director, Universe

### `P5.1` Lorebook / World Memory v1

Owner: backend/creator/admin

Tasks:

- เพิ่ม world memory entry:
  - title
  - keywords
  - content
  - priority
  - visibility
  - character/world scope
- keyword trigger ก่อน semantic retrieval
- prompt budget cap สำหรับ lorebook
- Prompt Inspector แสดง active entries

Acceptance:

- chat ดึง memory เฉพาะที่เกี่ยวข้อง
- creator/admin debug ได้ว่า entry ไหนถูกใช้

QA:

- prompt assembly tests
- Prompt Inspector tests

### `P5.2` Per-Chat Persona

Owner: frontend/backend/chat/profile

Tasks:

- Profile ยังเก็บ global persona
- Character Lobby ให้เลือก persona สำหรับแชทนี้
- Chat side panel แสดง persona ที่ใช้
- My Chats row แสดง persona badge แบบ compact
- Prompt stack ใช้ per-chat persona ก่อน global fallback

Acceptance:

- ผู้ใช้เล่นคนละตัวตนกับแต่ละ character ได้
- persona ไม่ override platform policy

QA:

- user persona tests
- chat prompt tests
- e2e lobby -> chat persona

### `P5.3` Universe / Group Chat Draft

Owner: chat/universe

Tasks:

- เพิ่ม Universe tab ใน `/chats` เป็น experimental แต่มี real draft surface
- data model draft:
  - title
  - cover
  - scenario
  - member character ids
  - visibility
  - speaker mode: manual first
- ยังไม่ต้อง auto-response จน prompt budget stable
- manual speaker selector ใน chat

Acceptance:

- user สร้าง group draft ได้ local-safe
- ไม่มีปุ่ม group chat ที่ดูพร้อมแต่ทำอะไรไม่ได้

QA:

- route/menu audit
- backend model tests ถ้ามี DB
- e2e create universe draft

## P6 - Observability And Product Analytics

### `P6.1` Frontend Event Capture

Owner: frontend/analytics

Problem:

ตอนนี้ process-mining มี chat/runtime events แล้ว แต่ยังขาด event จาก marketplace/lobby/creator/wallet/report

Tasks:

- เพิ่ม `trackAnalyticsEvent` helper ผ่าน central API layer
- events:
  - character_impression
  - character_detail_view
  - relationship_seed_selected
  - chat_cta_clicked
  - creator_draft_started
  - creator_ai_draft_requested
  - creator_publish_attempted
  - wallet_viewed
  - report_opened
  - report_submitted
- batch/debounce impression events
- redact metadata
- local-safe no-op ถ้า backend route unavailable

Acceptance:

- Admin Analytics เห็น funnel จาก Explore -> Lobby -> Chat
- ไม่ส่ง raw prompt/message เป็น analytics metadata

QA:

- frontend API tests
- backend analytics tests
- focused browser flow then check `/admin/process-mining`

### `P6.2` Admin Analytics Drilldown

Owner: admin/frontend

Tasks:

- เพิ่ม filters ใน Admin Health analytics panel:
  - event name
  - source
  - route
  - days
- เพิ่ม "latest context snapshot detail" แบบ redacted modal
- link snapshot ไป Prompt Inspector ถ้าข้อมูลพอ

Acceptance:

- developer เห็นได้ว่าบอทตอบเพี้ยนเพราะ route/context ไหน

QA:

- frontend component tests
- admin route tests

### `P6.3` Cost/Quality Dashboard

Owner: wallet/admin/evals

Tasks:

- usage by:
  - model route
  - provider source
  - function
  - average reply length
  - fallback rate
- show eval pass rate next to model route readiness

Acceptance:

- ตัดสินใจได้ว่า route ไหนควรใช้ local/BYOK/live provider

QA:

- wallet summary tests
- admin health tests

## P7 - UI/UX Consolidation

### `P7.1` Explore Marketplace Density

Owner: frontend/explore

Tasks:

- card image เป็น primary signal
- ลด text บน card เหลือ name, 1-2 tags, stat, badges
- Continue Chatting อยู่บนสุดถ้ามี active chats
- categories/tabs เหมือน marketplace ไม่ใช่ dashboard

Acceptance:

- ผู้ใช้ scan ตัวละครได้เร็ว
- card click เข้า lobby ได้จริง

QA:

- Playwright Explore desktop/mobile
- route/menu audit

### `P7.2` My Chats Khuiai-Style Tabs

Owner: frontend/chats

Tasks:

- tabs:
  - แชทส่วนตัว
  - จักรวาล ทดลอง
  - จัดเก็บ
- search/filter
- three-dot menu:
  - rename
  - pin/unpin
  - archive/unarchive
  - select
  - delete
- bulk actions เฉพาะ selection mode

Acceptance:

- ไม่มี menu action ที่ตัน
- empty state มี next action ไป Explore

QA:

- e2e My Chats menu
- frontend component test

### `P7.3` Chat Layout Refactor

Owner: frontend/chat

Tasks:

- แยก WorkspacePage เป็น:
  - ChatShell
  - ChatSidebar
  - ChatStage
  - ChatComposer
  - ChatRightPanel
  - SceneNotice
  - ChatSettingsDrawer
- composer เดียว
- mobile drawer/bottom sheet แทน side panel ถาวร
- message action menu reusable

Acceptance:

- code อ่านง่ายขึ้น
- ไม่มี composer ซ้อน
- mobile ไม่ล้น

QA:

- frontend:check
- e2e chat desktop/mobile

### `P7.4` Creator Studio Refactor

Owner: frontend/creator

Tasks:

- แยก:
  - CharacterMediaPanel
  - CharacterCoreFields
  - CreatorReadinessPanel
  - CreatorPreviewSimulator
  - CreatorImportPanel
  - CreatorBudgetMeter
- avatar/cover/link image flow อยู่ที่เดียว
- AI draft/image state แสดง loading/fallback/error/fill result ครบ

Acceptance:

- form ไม่ยาวมั่ว
- import/AI draft/preview/publish อยู่ในลำดับที่เข้าใจง่าย

QA:

- frontend component tests
- e2e create draft/publish local

## P8 - QA, Security, Release Gate

### `P8.1` Add Evals For New Controls

Tasks:

- eval reply profile: quick vs balanced vs deep vs cinematic
- eval director mode
- eval content taxonomy block
- eval lorebook activation
- eval per-chat persona

Acceptance:

- เปลี่ยน prompt stack แล้ว regression ถูกจับก่อนหลุดถึง UI

QA:

- `bun run eval:local`
- backend focused tests

### `P8.2` Update Route/Menu Audit

Tasks:

- ทุก route ใหม่เพิ่มใน route/menu audit
- ทุก button มี action/disabled reason
- universe/video/live-provider/future features ต้องเป็น explicit contract state

Acceptance:

- `route-menu:audit` ผ่าน

QA:

- `bun run route-menu:audit`
- `bun run frontend:static:audit`

### `P8.3` Security And Abuse Review

Tasks:

- prompt injection tests สำหรับ:
  - character import
  - lorebook
  - director mode
  - per-chat persona
- broken access tests สำหรับ:
  - universe/group draft ownership
  - generated media
  - public/private character discovery
- content policy tests สำหรับ adult taxonomy

Acceptance:

- ไม่มี route ใหม่ bypass owner/content guard

QA:

- `bun run security:audit`
- backend focused tests

### `P8.4` Full Local Acceptance Gate

Tasks:

- run repo gate after each completed phase
- run browser smoke on desktop/mobile when UI changes
- reseed QA after e2e that mutates data
- update `memory/qa-status.md`

Acceptance:

- local server remains playable after every checkpoint

QA:

- `bun run qa:repo`
- `bun run qa:local`
- `bun run e2e:smoke`
- `bun run qa:seed`

## Recommended Implementation Order

### Immediate Next 5 Tasks

1. `P0.1` Register this plan in entry docs and memory
2. `P1.1` Chat Reply Controls
3. `P2.1` Creator Token/Context Budget Meter
4. `P6.1` Frontend Event Capture
5. `P7.3` Chat Layout Refactor

### Then

6. `P5.2` Per-Chat Persona
7. `P4.1` Chat-To-Image Handoff
8. `P3.1` Adult Content Taxonomy
9. `P2.2` Creator Import JSON
10. `P1.3` Director Mode

### Later

11. `P5.1` Lorebook / World Memory v1
12. `P5.3` Universe / Group Chat Draft
13. `P6.2` Admin Analytics Drilldown
14. `P6.3` Cost/Quality Dashboard
15. `P4.3` Video Template Contract with real provider

## Definition Of Done For This Improvement Roadmap

Local system is "improved enough for next handoff" when:

- Chat reply depth is user-controllable and visible in Prompt Inspector
- Creator can see token/context budget before publish
- Explore/My Chats/Chat/Create are visually consistent with MissAI/Khuiai references
- Adult/content discovery uses structured gate/taxonomy, not a single loose toggle
- Chat can hand off scene context to AI Creator privately
- Admin Analytics receives meaningful frontend + backend process events
- No visible button/menu is dead without a reason
- `frontend:check`, `backend:check`, `api:audit`, `route-menu:audit`, `memory:audit`, `docs:commands`, `secrets:check`, and relevant e2e smoke pass

Production remains a separate external gate:

- deployed HTTPS backend/frontend
- production CORS/domain
- production DB migration/smoke
- Supabase private signed storage verification
- live chat/image provider smoke
- release handoff evidence
