# Competitor Feature Audit For Maprang

Last updated: 2026-06-18

## Scope

This audit studies public product surfaces and documentation for:

- Nectar: `https://nectar.ai/`
- CrushOn: `https://crushon.ai/` and `https://chat.crushon.ai/`
- Candy AI: `https://candy.ai/`
- SpicyChat: `https://spicychat.ai/` and official docs at `https://docs.spicychat.ai/`
- JanitorAI: `https://janitorai.com/`
- Sakura: `https://www.sakura.fm/th`

Use this as product strategy input only. Do not copy private implementation, private prompts, user-generated media, payment flows, or explicit content into Maprang.

## Source Access Quality

| Product | Source confidence | Notes |
| --- | --- | --- |
| Nectar | Medium | Public site exposes product positioning, Discover/Create/Generate navigation, fantasy/memory/image concepts. |
| CrushOn | Medium | Main `crushon.ai` page is sparse, but `chat.crushon.ai` exposes current public feature claims and IA. |
| Candy AI | Medium | Public site exposes navigation, PWA notification prompt, character creation, memory, image/voice/video claims. |
| SpicyChat | High | Official documentation gives detailed product mechanics for character discovery, creation, group chat, personas, generation settings, lorebook, import. |
| JanitorAI | Low/Medium | Direct site failed through the text browser. Findings rely on public third-party/reddit sources and should be rechecked manually if product parity matters. |
| Sakura | Medium | Public Thai explore/create/chat routes are visible, but authenticated flows are gated. Some public UGC is noisy; use only structural patterns. |

## Highest-Value Ideas To Bring Into Maprang

### 1. Group Chat / Universe Mode With Speaker Control

SpicyChat documents group chats with 2-10 bots, group identity, cover image, shared scenario, member selection, visibility, draft save, manual next-speaker selection, and optional auto-response.

Maprang should adopt a staged version:

- Phase 1 local: Universe tab exists in `/chats` and uses a disabled/experimental state with clear reason.
- Phase 2: group draft object with cover, title, scenario, member ids, and visibility.
- Phase 3: manual responder selector in chat.
- Phase 4: auto-responder routing once context budgeting is reliable.

Why it matters: this directly matches the user's long-term plan for group/universe chats and gives a concrete UX contract.

### 2. Director Mode For Story Control

SpicyChat's Director Mode uses `/cmd` instructions to nudge story direction, correct repetition, or shape behavior without making the command part of normal dialogue.

Maprang version:

- Add a "กำกับฉาก" command mode in chat composer.
- In UI, show it as a small toggle or command chip, not raw `/cmd` only.
- Store director instructions separately in prompt inspector.
- Make it visible in Prompt Inspector diff so developers can debug why the model changed direction.

Why it matters: Maprang already has Scene Mode. Director Mode gives power users a controlled way to guide scenes without editing the whole prompt.

### 3. Lorebook / World Memory

SpicyChat's Lorebook concept stores world memory separately from character description, with keyword-triggered entries and token budget limits.

Maprang version:

- Add `World Memory` as a future creator/admin module.
- Keep it separate from:
  - character definition
  - user persona
  - relationship timeline
  - chat summary
- Use hybrid activation:
  - keyword triggers first
  - semantic retrieval later
- Show active memory entries in Prompt Inspector.

Why it matters: this is the cleanest path from current relationship timeline into multi-character universe memory.

### 4. Per-Chat Persona Selection

SpicyChat personas can be selected when starting a new chat and shown in previous conversations.

Maprang version:

- Keep global User Persona in `/profile`.
- Add "Persona for this chat" in Character Lobby before starting.
- Store selected persona id in chat/session.
- Show selected persona in `/chats` row and chat right panel.

Why it matters: users may want different identities per bot or story. This improves replayability without changing the character.

### 5. Token/Context Budget Visibility For Creators

SpicyChat docs recommend keeping character setup concise and show token usage under text boxes.

Maprang version:

- Creator Studio should show live token estimates under each large field:
  - description
  - greeting
  - scenario
  - personality
  - example dialogue
  - lore/memory
- Add warning bands:
  - Good: concise
  - Caution: may reduce chat memory
  - Too large: likely to weaken continuity
- Link to Prompt Inspector estimate for advanced users.

Why it matters: user complaints about shallow or short replies often come from context pressure and weak prompt structure. This makes quality visible.

### 6. Character Import / Card Import

SpicyChat supports importing character data from JSON/PNG character cards, then still asks users to fill tags, visibility, and advanced options.

Maprang version:

- Add "นำเข้าตัวละคร" in Creator Studio.
- Support JSON first.
- Later support PNG character card metadata if schema is clear.
- After import, run:
  - tag conflict/readiness check
  - relationship seed compatibility
  - safety/content mode check
  - preview simulator

Why it matters: it reduces creator friction and makes Maprang easier to adopt for users with existing roleplay characters.

### 7. Conversation Images From Chat Context

SpicyChat describes conversation images generated from avatar, character description, and last message. Nectar and Candy also position images/video as part of the companion loop.

Maprang version:

- Add "สร้างภาพจากฉากนี้" in chat message actions.
- Use active scene, character image, selected message, and last 3-5 turns as input.
- Output goes to AI Creator My Library and can be used as character cover/image.
- For local mode, show fallback/mock clearly.

Why it matters: Maprang already has AI Creator and scene mode; this bridges chat and generation into one loop.

### 8. Model / Generation Settings From Chat Menu

SpicyChat exposes generation settings through the chat three-dot menu, including model and inference controls.

Maprang version:

- Add "ตั้งค่าการตอบ" in chat menu.
- Basic controls:
  - reply length: สั้น / สมดุล / ยาว / ละเอียด
  - style: โรลเพลย์ / บรรยาย / สนทนาเร็ว
  - model source: system default / BYOK / local mock
- Advanced controls hidden behind developer/power-user section:
  - temperature
  - top-p
  - max output tokens

Why it matters: the user specifically noted dissatisfaction with shallow replies. A visible reply-depth control is a direct product fix.

### 9. `/search`-Style Live Context Command

SpicyChat documents `/search` as a way to inject short live search summaries into context.

Maprang version:

- Add local-safe command parser first:
  - `/ค้นหา ...` disabled locally with readable reason unless web provider is configured.
  - In production, route through backend tool-gated retrieval.
- Keep retrieved snippets in Prompt Inspector.
- Do not allow arbitrary browser/data access from character prompts.

Why it matters: it enables modern/current settings without bloating base prompts.

### 10. PWA / Mobile Install Prompt

Candy exposes an app install prompt focused on notifications for new messages/features.

Maprang version:

- Add optional PWA install prompt for local/mobile users.
- Do not show immediately; trigger after meaningful action:
  - created first character
  - sent first chat
  - got pending scene event
- Notifications are future/local opt-in only.

Why it matters: target users are mobile-heavy. This creates app-like retention without requiring native apps.

### 11. Content Mode Controls In Discovery

SpicyChat documents NSFW/SFW browsing filters and profile-level explicit-content enablement. Sakura exposes clear Thai nav and theme toggle.

Maprang version:

- Keep content mode in Profile.
- Reflect it in Explore filters:
  - `ทั่วไป`
  - `เข้มข้น`
  - `ผู้ใหญ่เท่านั้น`
- Use account/profile gate before showing mature discovery results.
- Keep Thai labels simple and consistent.

Why it matters: it aligns product reality with safer platform operations.

### 12. Drafts That Are Honest About Local Storage

SpicyChat group docs mention locally saved drafts can be lost if browser cache is cleared.

Maprang version:

- Creator Studio drafts should show where they are saved:
  - `บันทึกในเครื่อง`
  - `บันทึกในบัญชี` when backend account storage exists
- Warn before clearing/resetting.

Why it matters: it prevents users from losing long creator work and makes local-server behavior clear.

## Recommended Priority For Maprang

### Build Next

1. Chat reply-depth settings in chat menu.
2. Creator token/context budget meter.
3. Per-chat persona selector.
4. Conversation image from chat context.
5. Character import JSON.

### Design Next, Build After Core Stable

6. Universe/group chat with manual responder selector.
7. Director Mode as "กำกับฉาก".
8. World Memory/Lorebook.
9. `/ค้นหา` live context command.

### Later / Optional

10. PWA install prompt.
11. Voice/video modules.
12. Public social/community feed.

## Feature Mapping Table

| Competitor pattern | Maprang route/module | Priority |
| --- | --- | --- |
| Fast image-led marketplace | `/` Explore | High |
| Chat tabs/archives | `/chats` | High |
| Per-chat persona | `/characters/:id`, `/chat/:id`, `/profile` | High |
| Reply-depth/model settings | `/chat/:id` three-dot menu | High |
| Token/context meter | `/create`, `/admin/prompt-inspector` | High |
| Conversation images | `/chat/:id`, `/ai-creator` | High |
| Character import | `/create` | Medium |
| Director Mode | `/chat/:id`, Prompt Inspector | Medium |
| Lorebook/world memory | Creator/Admin memory module | Medium |
| Group chat/universe | `/chats`, `/chat/:id` | Medium |
| PWA prompt | app shell | Low |
| Public social feed | `/works`, `/creators`, future community | Low |

## Design Guardrails

- Keep Maprang's main loop simple before exposing power tools.
- Do not put advanced generation settings in the default chat surface.
- Do not use fake public gallery/social data as if it is live.
- Do not copy competitor adult content, prompts, or images.
- For mature content, keep age/content mode gates and report/moderation surfaces.
- For BYOK, never store raw keys in localStorage.
- For local server mode, label mock/fallback states clearly.

## Source Links

- Nectar: `https://nectar.ai/`
- Nectar Create: `https://nectar.ai/create`
- Nectar Discover: `https://nectar.ai/discover`
- CrushOn: `https://crushon.ai/`
- CrushOn public feature page: `https://chat.crushon.ai/`
- Candy AI: `https://candy.ai/`
- SpicyChat official docs: `https://docs.spicychat.ai/`
- SpicyChat Characters: `https://docs.spicychat.ai/product-guides/characters`
- SpicyChat Creating Chatbots: `https://docs.spicychat.ai/product-guides/creating-chatbots`
- SpicyChat Group Chat: `https://docs.spicychat.ai/product-guides/group-chat`
- SpicyChat Director Mode: `https://docs.spicychat.ai/product-guides/director-mode`
- SpicyChat Lorebook: `https://docs.spicychat.ai/product-guides/lorebook`
- SpicyChat User Personas: `https://docs.spicychat.ai/product-guides/premium-features/user-personas`
- SpicyChat Generation Settings: `https://docs.spicychat.ai/advanced/generation-settings`
- SpicyChat Importing Characters: `https://docs.spicychat.ai/advanced/importing-characters`
- JanitorAI: `https://janitorai.com/`
- Sakura Thai: `https://www.sakura.fm/th`

## 2026-06-18 Addendum: Adult Roleplay Market Study

Additional sources studied:

- MissAI: `https://www.missai.day/`
- Khuiai: `https://www.khuiai.com/th`
- Nectar: `https://nectar.ai/`
- CrushOn: `https://crushon.ai/` / `https://chat.crushon.ai/`
- Candy AI: `https://candy.ai/`
- SpicyChat: `https://spicychat.ai/` / `https://docs.spicychat.ai/`
- JanitorAI: `https://janitorai.com/`
- Sakura: `https://www.sakura.fm/th`
- CraveU: `https://craveu.ai/`
- MyBabes: `https://landing.mybabes.ai/free-nsfw-ai-chat`
- AI Haven NSFW Roleplay directory: `https://aihaven.com/s/nsfw-roleplay/`
- Yollo: `https://www.yollo.ai/th`

### Research Boundary

This addendum covers adult-platform product mechanics and content taxonomy at a system level. It intentionally does not copy competitor prompts, explicit story text, user media, paid flows, or private implementation details.

Maprang must remain adult-only for mature modes and must not support:

- underage sexual content
- real-person non-consensual intimate imagery
- sexualized depictions of anyone who appears under 18
- deepfake/identity misuse
- public discovery of prohibited or ambiguous age content
- harassment, doxxing, extortion, blackmail, or coercive abuse as actionable real-world behavior

### Adult Content Taxonomy Observed

Adult roleplay platforms tend to organize content around these axes:

1. Intensity
   - general romance
   - spicy/flirty
   - explicit/adult-only
   - extreme/fantasy-only

2. Relationship frame
   - stranger
   - crush/dating
   - partner/spouse
   - ex/affair/jealousy
   - toxic relationship
   - boss/teacher/mentor power dynamic
   - family-coded or step-family-coded fantasy

3. Character archetype
   - girlfriend/boyfriend
   - anime waifu/husbando
   - dominant/submissive/switch
   - yandere/tsundere
   - bully/rival/enemy
   - roommate/classmate/coworker
   - fantasy creature, monster, non-human, furry
   - femboy/futa/non-binary

4. Story structure
   - quick chat
   - long-form slow burn
   - scenario-first roleplay
   - multi-character scene
   - relationship progression
   - unlockable intimacy through trust/relationship state

5. Media loop
   - chat only
   - generated selfies/images
   - chat-context images
   - short reels/video
   - voice messages or voice calls

### Maprang Content Model Recommendation

Maprang should not use one flat NSFW toggle. Use a structured content model:

```ts
type ContentMode = "safe" | "mature_suggestive" | "adult_explicit";

type AdultContentAxes = {
  intensity: "romance" | "spicy" | "explicit";
  relationshipFrame:
    | "stranger"
    | "dating"
    | "partner"
    | "ex"
    | "affair"
    | "rival"
    | "toxic"
    | "authority"
    | "fantasy_taboo";
  powerDynamic: "none" | "soft" | "strong";
  consentFrame: "clear_consent" | "fictional_tension" | "blocked";
  ageGate: "all_ages_safe" | "adult_only";
  publicDiscovery: "allowed" | "restricted" | "hidden";
};
```

Rules:

- `adult_explicit` requires adult-only account/session state.
- `fantasy_taboo` must be adult-only, hidden by default, and policy-reviewed.
- Any minor/ambiguous age signal must force `blocked`.
- Any real-person intimate image generation must force `blocked` unless there is a verified consent system.
- Public discovery should be stricter than private chat.

### Competitor Features Worth Adopting

#### 1. Age Gate Before Adult Discovery

MyBabes shows an adults-only gate and references 18+ entry plus compliance language. Maprang should have a real age/content gate before mature discovery, not only a profile toggle.

Implementation:

- Add account/session-level `ageConfirmedAt`.
- Add route guard for adult Explore filters and adult AI Creator templates.
- Add admin health blocker if adult mode is enabled without age gate configured.

#### 2. Adult Discovery Filter Layer

CraveU exposes gender/filter/hotlist and rich tags such as POV, dominance, spicy, scenario, non-human, and token size. Yollo exposes gender tabs and public bot cards. Candy exposes category tabs such as girls/anime/guys.

Implementation:

- Explore filters:
  - gender/presentation
  - content intensity
  - relationship frame
  - tone/archetype
  - media capability
  - token length / prompt complexity
- Character cards:
  - image
  - title
  - 2-4 compact tags
  - chat count
  - prompt/token size indicator
  - content mode badge

#### 3. Long-Form Memory As A Selling Point

CrushOn sells long-form memory, long-context models, and continuity over many messages. Yollo also highlights long-term memory and persona. SpicyChat docs formalize Lorebook and context budgeting.

Implementation:

- Add user-facing "memory depth" indicator in chat.
- Store:
  - chat summary
  - relationship timeline
  - scene outcomes
  - user persona selected for that chat
  - lorebook/world memory entries
- Show what was injected in Prompt Inspector.

#### 4. Model Choice And Reply Style

CrushOn and Yollo both position model choice as a differentiator. SpicyChat exposes generation settings through the chat menu.

Implementation:

- Basic user control:
  - reply length
  - narrative density
  - emotional intensity
  - dialogue/action balance
- Advanced control:
  - model/provider
  - temperature/top-p/max tokens
  - BYOK provider source
- Keep all advanced controls behind a "power user" drawer.

#### 5. Relationship Progression Unlocks

AI Haven listings describe relationship progression unlocking explicit content in some products. This aligns strongly with Maprang's relationship engine.

Implementation:

- Mature content should not appear as a raw toggle only.
- Scene/Event engine can unlock adult scene suggestions when:
  - user is adult-confirmed
  - character allows adult mode
  - relationship trust/affinity threshold passes
  - no cooldown or safety block applies
- UI should show "scene ready" and let users enter/skip, preserving consent and pacing.

#### 6. Chat-Integrated Image/Video Loop

Nectar, MyBabes, Candy, and Yollo all combine chat with image/video generation. The strongest pattern is not a separate generator alone; it is chat -> media -> library -> reuse.

Implementation:

- Chat action: "Generate image from this scene."
- Inputs:
  - active character image
  - selected message
  - active scene objective
  - recent summary
  - content mode
- Output:
  - private AI Creator library item
  - use as cover/image
  - optional publish only after moderation checks

#### 7. Creator Economy / Creator Reward Surface

CraveU advertises creator rewards. Candy exposes affiliate/community surfaces. Adult platforms rely on creator supply.

Implementation:

- Do not build payment now.
- Build the data structure now:
  - creator profile
  - character metrics
  - favorites
  - reports
  - public/private/unlisted visibility
  - quality score/readiness
- Later add monetization without rewriting creator entities.

#### 8. Safety/Compliance Must Be A Product Feature

Adult competitors often advertise freedom, but legal and platform risk is real. Nectar links content removal, complaints, and anti-trafficking policies; MyBabes uses an adult gate and compliance statement; Candy links trust/safety.

Implementation:

- Add a visible "Safety & Content Rules" page.
- Add report target types:
  - character
  - message
  - generated image/video
  - creator profile
- Add admin moderation states:
  - hidden
  - age-restricted
  - public-discovery blocked
  - deleted/removed
- Add audit log for every admin moderation action.

### Adult Content Feature Matrix For Maprang

| Feature | Maprang priority | Notes |
| --- | --- | --- |
| Adult age gate | P0 | Required before mature public discovery. |
| Mature content mode | P0 | Already partly conceptualized; needs structured taxonomy. |
| Adult discovery filters | P1 | Hide adult results unless gate passes. |
| Reply depth controls | P1 | Directly solves shallow reply complaint. |
| Per-chat persona | P1 | Important for adult roleplay identity and continuity. |
| Relationship-gated scenes | P1 | Maprang differentiator. |
| Lorebook/world memory | P1 | Needed for long-form arcs and universe mode. |
| Chat-to-image generation | P1 | Bridges chat and AI Creator. |
| Group/universe chat | P2 | Build after one-on-one chat and memory are stable. |
| Voice/video | P3 | High cost/provider complexity; defer. |
| Creator monetization | P3 | Data model now, payment later. |

### UI Direction From Adult Competitors

Use these patterns:

- Dark-first interface.
- Image-led cards.
- Filters before long explanations.
- Short, direct CTA copy.
- Adult content badges visible but compact.
- "Free/local/fallback/live" provider status is explicit.
- Creator forms show token/prompt size.
- Chat settings are reachable from the three-dot menu.
- Mature mode state is visible in Profile and Explore.

Avoid these patterns:

- Publicly listing ambiguous age/family-coded content without strict gating.
- Treating "uncensored" as a substitute for product rules.
- Showing adult media before age confirmation.
- Mixing payment CTA into every core flow.
- Hiding generation cost/model behavior from users.

### Revised Build Order

1. Add Adult Content Taxonomy and gate state to frontend/backend types.
2. Add Explore mature filter badges and blocked/hidden state.
3. Add Chat Reply Controls: length, style, emotional intensity, scene detail.
4. Add Per-Chat Persona selector in Character Lobby.
5. Add Creator token/context meter.
6. Add Chat-to-Image handoff into AI Creator.
7. Add Director Mode.
8. Add Lorebook/World Memory v1.
9. Add Universe group draft and manual responder selection.
10. Add public Safety & Content Rules page and moderation evidence routes.

### New Source Links

- CraveU: `https://craveu.ai/`
- MyBabes adult chat landing: `https://landing.mybabes.ai/free-nsfw-ai-chat`
- AI Haven NSFW roleplay directory: `https://aihaven.com/s/nsfw-roleplay/`
- Yollo Thai: `https://www.yollo.ai/th`
- Candy AI: `https://candy.ai/`
- CrushOn public feature page: `https://chat.crushon.ai/`
- Nectar: `https://nectar.ai/`
- Sakura Thai: `https://www.sakura.fm/th`
