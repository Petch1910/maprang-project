# Khuiai Reference Audit For Maprang

Last updated: 2026-06-18

## Scope

This file records UI and flow observations from `https://www.khuiai.com/th` and related Thai routes for Maprang design work.

Use this as product reference only:

- Do not copy Khuiai private implementation, private data, prompts, or user-generated media into Maprang.
- Do not inspect or document payment/top-up execution flows.
- Do not treat auth-gated assumptions as facts. If a flow was blocked by login, it is marked as blocked.

## Browser Access Status

The controlled browser session could open Khuiai pages, but important authenticated actions were still auth-gated:

- `/th/chats` opened and showed the chats surface, but there were no conversations.
- `/th/explore?tab=characters` opened and showed public character marketplace data.
- Clicking a character image/CTA did not open a usable character lobby; it surfaced login UI.
- Direct `/th/create` returned 404, so the create flow likely depends on an in-app route/action after authentication.
- `/th/feed?visibility=global` opened public social feed data.
- `/th/daily-check-in` redirected to the public login/landing state.

Therefore, this audit is reliable for public marketplace/chats/social/auth-gate patterns, but not complete for post-login create, publish, chat-send, model settings, or character detail flows.

## Observed Routes And UI

| Route | Observed state | Useful Maprang reference |
| --- | --- | --- |
| `/th` | Public landing/login. Thai title, Google login, email login, register. | Keep Thai-first onboarding copy short. |
| `/th/chats` | Chat hub with tabs `แชทส่วนตัว`, `จักรวาล (ทดลอง)`, `แชทที่จัดเก็บ`; search placeholder `ค้นหาแชท`; empty state says no conversations and suggests starting a new chat. | My Chats should be tabbed, searchable, and have a clear empty-state CTA. |
| `/th/explore?tab=characters` | Public character grid with hero banner, `คุยเลย` CTA, character cards, images, two short tags, and compact stats. | Explore should prioritize image-first cards, short tags, compact stats, and fast entry to lobby/chat. |
| `/th/feed?visibility=global` | Social feed with heading `โซเชียล (ทดลอง)`, `โพสต์ตัวละคร`, public visibility labels, and comment count buttons. | Maprang social/community can stay secondary, but cards should have real actions or disabled reasons. |
| character click from Explore | Auth-gated login modal with Google/email login, forgot password, register, close. | Maprang should keep auth gates explicit and recoverable; never leave CTA dead. |

## Khuiai Patterns To Borrow

### 1. Explore Is A Fast Character Market

Khuiai puts the character image first and keeps card text dense:

- Large vertical image thumbnail.
- Character name directly under/over image.
- Two short tags such as role/archetype.
- Compact popularity/chat stats.
- Minimal explanation copy.
- CTA wording stays simple: `คุยเลย`.

Maprang application:

- `/` should keep character cards image-led.
- Show only the strongest metadata on the card: name, creator or universe, 1-2 tags, chat count, relationship readiness, pending scene badge.
- Move longer lore, Relationship Contract, and content settings to `/characters/:id`.

### 2. Chats Need Tabs Before Features

Khuiai chat hub starts with simple mental buckets:

- Private chats.
- Universe/group mode as an experimental tab.
- Archived chats.
- One search field.
- Empty state with a clear next action.

Maprang application:

- `/chats` should keep the same simple buckets:
  - `แชทส่วนตัว`
  - `จักรวาล`
  - `จัดเก็บ`
- Pin/archive/delete/rename should stay inside the three-dot menu on each row.
- Empty states should provide one action, such as `ไปเลือกตัวละคร`.
- Relationship status and pending scene badges should be extra metadata, not the main layout.

### 3. Experimental Features Are Labeled

Khuiai marks social/universe as experimental (`ทดลอง`).

Maprang application:

- Mark Maprang-exclusive features that are not fully production-grade as `ทดลอง`, for example:
  - Universe/group chat.
  - Scene inbox.
  - Prompt inspector for creators/admin.
- Do not hide unfinished features behind normal-looking active buttons.

### 4. Auth Gates Are Modal And Recoverable

When public users try to go deeper, Khuiai shows login actions in-place.

Maprang application:

- For local server/dev, use a dev identity state.
- For production, protected actions should open a clear auth dialog instead of failing silently.
- Dialogs must always have close/cancel and a next action.

### 5. Social Feed Is Secondary

The feed is simple: character post, visibility label, comment count.

Maprang application:

- Keep `/works`, `/creators`, `/favorites`, `/support`, and social-like pages secondary.
- Do not spend UI complexity there until the main loops are stable:
  - Explore -> Lobby -> Chat.
  - Create -> Preview -> Publish.
  - AI Creator -> My Library -> Use in Creator Studio.

## Maprang Design Decisions From This Audit

1. Keep MissAI as the stronger shell/dark-marketplace reference, but borrow Khuiai's simpler Thai IA:
   - `สำรวจ`
   - `แชท`
   - `สร้าง`
   - `อีเวนต์`
   - `โปรไฟล์`
2. Make Explore more Khuiai-like:
   - Card image density should increase.
   - Card text should shrink.
   - Relationship/scene badges should be compact chips.
3. Make My Chats more Khuiai-like:
   - Tabs first.
   - Search second.
   - Chat rows/cards third.
   - Bulk actions hidden until selection mode.
4. Make experimental Maprang features explicit:
   - Universe/group chat can exist as a tab, but mark as experimental until backend group semantics are finished.
   - Scene/event systems should be visible as badges and inbox, not blocking the normal chat loop.
5. Preserve Maprang-exclusive depth:
   - Relationship Contract remains in Character Lobby.
   - Scene Mode remains in Chat.
   - Creator Preview Simulator remains in Creator Studio.
   - Prompt Inspector/Evals remain admin/developer tools.

## Gaps To Re-Inspect With A Controllable Logged-In Session

These were not verified through the controlled browser session:

- Character lobby after selecting a character.
- Actual chat room after entering a character.
- Message send, regenerate, edit, delete, rewind, and report menus.
- Create character flow: draft, save, preview, publish, validation failure, image upload.
- Post-login mobile layout.
- Universe/group chat behavior.
- Account/profile/settings pages.
- Error/loading/limit states after actual API calls.

## Next Maprang Implementation Tasks

Use this audit to drive UI cleanup in this order:

1. `/chats`: simplify around Khuiai-style tabs/search/empty state, keep three-dot actions for rename, pin/unpin, archive, select, delete.
2. `/`: tighten character card density and make images the primary signal.
3. `/characters/:id`: ensure Relationship Contract is the first Maprang-only layer after the familiar Khuiai-style character profile.
4. `/chat` and `/chat/:chatId`: keep the normal chat loop visually simple before scene/relationship overlays appear.
5. `/create`: keep Khuiai-like creator basics first, then Maprang additions below: tag conflict/readiness, preview simulator, AI draft/image handoff.

## Acceptance Criteria For Applying This Audit

- No visible menu item opens a dead route.
- No visible button does nothing without a disabled reason.
- `/chats` can be understood without knowing Maprang-specific mechanics.
- `/` looks like a character marketplace first, not a dashboard.
- Maprang systems add depth after the familiar flow, not before it.
