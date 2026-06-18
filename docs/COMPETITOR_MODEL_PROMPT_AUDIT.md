# Competitor Model And Prompt Architecture Audit

Last updated: 2026-06-18

## Scope

This document turns the competitor research into a Maprang-owned model/prompt strategy.

It intentionally separates:

- `Observed`: public product pages, official docs, or previously captured logged-in UI behavior.
- `Inferred`: architecture that is likely from the visible feature set, but not confirmed.
- `Maprang action`: what we should build or keep.

Do not copy competitor private prompts, private implementation, user-generated media, or adult story content into Maprang. Treat competitor prompt systems as black boxes unless the product officially documents the mechanism.

## Source Confidence

| Product | Model disclosure | Prompt/system disclosure | Confidence | Maprang use |
| --- | --- | --- | --- | --- |
| MissAI | Not publicly verified from text browser | Logged-in UI shows model/tool surfaces, AI Creator tabs, library/gallery states | Medium from manual UI audit | UI/flow reference, not model fact |
| Khuiai | Not publicly disclosed | Public/local observation shows familiar Thai roleplay marketplace/chat patterns | Low/Medium | Thai UX reference, not model fact |
| Nectar | Says it uses fine-tuned AI models; no public model names | Describes backstory/personality, memory, fantasy/story scenes | Medium | Companion memory + fantasy scene loop |
| CrushOn | Public page claims Claude, GPT, Gemini, DeepSeek, GLM, and proprietary CrushOn models with switching | Describes long-form memory/context and character creator | Medium | Model switching, long context, group chat, voice/media roadmap |
| Candy AI | No model names found | Describes adaptive companion behavior, memory retention, multimodal chat/images/video/voice | Medium | Companion personalization + media loop |
| SpicyChat | Official docs list multiple concrete models and context sizes | Official docs disclose generation settings, persona, lorebook, semantic memory, Director Mode | High | Best reference for prompt stack and power-user controls |
| JanitorAI | Official source weak; third-party and competitor comparison describe BYOK/external provider model | Character definitions, prompt-level customization, API settings are visible in third-party docs | Low/Medium | BYOK and prompt customization reference |
| Sakura | No model names found | Public cards expose character/scenario text shape | Medium | Marketplace card/prompt density reference; watch age-risk UGC |
| CraveU | No model names found | Hotlist/filter/story-beta surfaces visible | Low/Medium | Adult discovery/filter reference only |
| MyBabes | No model names found | Adult age gate, custom personalities, memory, image/video integration visible | Medium | Age gate + chat/media integration |
| AI Haven | Directory, not a model provider | Aggregates feature claims for tools | Low/Medium | Feature matrix sanity check only |
| Yollo | Says 10+ AI models, no concrete names found | Persona, long-term memory, image/video templates visible | Medium | Model selector + persona + memory + templates |

## What Competitors Likely Use

### MissAI

Observed:

- Logged-in UI exposes AI Creator tabs, template-like creation flows, model/tool surfaces, cost/level/provider states, gallery/library actions, and chat-side tools.

Likely architecture:

- A provider router behind the app rather than a single fixed model.
- A prompt stack split between character/persona, generation template, memory/context, and image/video prompt modifiers.
- Permission and credit gates before generation jobs.

Maprang action:

- Keep MissAI as UI/flow reference only.
- Do not assume its internal model names or prompts.
- Maprang should own an explicit job-based generation pipeline and admin-visible prompt/debug state.

### Khuiai

Observed:

- Thai-first marketplace/chat behavior is the main useful reference.
- Public text browser did not expose model names.

Likely architecture:

- Character-card-first prompt assembly with Thai UX copy and simple chat controls.
- Possibly a fixed provider or hidden multi-provider setup.

Maprang action:

- Keep Khuiai familiarity in UI labels and navigation.
- Maprang should differentiate with relationship/scene state, prompt inspector, memory, and creator simulator.

### Nectar

Observed:

- Public site says Nectar has fine-tuned AI models, recalls past interactions, evolves with use, supports backstory/personality, multiple companions in one storyline, and images from scenes.

Likely architecture:

- Companion profile block.
- User preference/memory summary block.
- Scene/fantasy block.
- Media prompt bridge from chat context to image/video.

Maprang action:

- Add chat-to-image from active scene.
- Keep relationship timeline and world state as first-class context.
- Add "scene media" handoff into AI Creator My Library.

### CrushOn

Observed:

- Public page claims multiple model options, model switching mid-chat, long-context memory up to 24K, group chat, voice presets, and long-form roleplay positioning.

Likely architecture:

- Tiered model router by plan/credit.
- Per-chat model setting.
- Long-context window plus summary/memory compaction.
- Group chat orchestration that chooses speakers and packs multi-character context.

Maprang action:

- Add model route profiles, not a single hard-coded model.
- Keep per-chat model/source display in Chat right panel.
- Plan Universe/Group Chat after one-on-one prompt budget and memory are stable.

### Candy AI

Observed:

- Public page emphasizes companion creation, emotional adaptation, memory retention, image generation, video, voice, PWA install/notifications, and privacy.

Likely architecture:

- Companion profile + user preference memory.
- Multimodal media job layer.
- Notification/re-engagement layer.

Maprang action:

- Keep PWA/notifications future, not core.
- Build media jobs through private-by-default AI Creator library.
- Do not hide model/cost behavior from users.

### SpicyChat

Observed:

- Official docs expose the most relevant mechanics:
  - Inference model selection.
  - Temperature, top-p, top-k, and max response token controls.
  - AI model list with model size/context memory.
  - User Personas.
  - Lorebook with keyword-triggered entries and context budget limits.
  - Semantic Memory that summarizes important details and retrieves relevant memories.
  - Director Mode using `/cmd` instructions that influence the LLM but are not normal dialogue.

Likely architecture:

- Prompt stack:
  1. platform/system rules
  2. selected model profile
  3. character card
  4. user persona
  5. lorebook entries
  6. semantic memories
  7. recent messages
  8. director command
  9. generation settings/output limits

Maprang action:

- Use SpicyChat as the strongest functional reference for model controls, lorebook, memory manager, director mode, and prompt budget UI.
- Implement power controls behind a drawer, not on the main chat surface.

### JanitorAI

Observed:

- Direct official source is weak in text browser.
- Public third-party/competitor references describe JanitorAI as flexible character chat with BYOK/external model provider setup and prompt-level customization.

Likely architecture:

- Frontend/app assembles character prompt and sends it to selected external provider.
- User controls model/provider/context/tuning outside a fully managed platform.

Maprang action:

- Keep BYOK but never store raw keys in localStorage.
- Offer session-only raw key mode plus server-side encrypted vault only when production auth/storage is ready.
- Prompt customization should be sandboxed and visible in Prompt Inspector.

### Sakura

Observed:

- Public Thai pages show image-led character cards, tags, stats, and large character/scenario prompt blocks.
- Public UGC can include age-ambiguous or risky scenario framing.

Likely architecture:

- Character definition carries a large portion of roleplay behavior.
- Marketplace relies on prompt density and creator-written scenario text.

Maprang action:

- Add creator prompt/token meters.
- Add content mode + age gate + public discovery restrictions.
- Treat public discovery stricter than private adult-only chat.

### CraveU, MyBabes, AI Haven, Yollo

Observed:

- CraveU: discovery/filter/hotlist/story-beta surfaces.
- MyBabes: adult age gate, custom personalities, memory/adaptive responses, image/video generator, chat integration.
- AI Haven: directory highlighting common adult roleplay feature set: character chat, personas, memory, models, images, custom characters.
- Yollo: persona, long-term memory, 10+ model choice, image/video templates, no-signup/free positioning.

Likely architecture:

- Adult content gate before discovery.
- Model selector or hidden router.
- Media template registry.
- Persona/memory prompt blocks.

Maprang action:

- Adult mode must be explicit and adult-confirmed.
- Use structured content taxonomy rather than one flat NSFW toggle.
- Keep image/video templates as job templates with blocked reasons when provider/level/input is missing.

## Maprang Model Strategy

Maprang should not optimize around a single model. Use a `ModelRoute` layer that maps user intent and chat mode to the right provider/model profile.

Recommended routes:

| Route | Use case | Default behavior |
| --- | --- | --- |
| `chat.roleplay.standard` | normal one-on-one roleplay | OpenRouter default or BYOK, Thai-first, balanced length |
| `chat.roleplay.deep` | long emotional scene or relationship turning point | higher output budget, lower risk of short replies |
| `chat.scene.cinematic` | active Scene Mode | stronger world/scene/objective injection |
| `chat.quick` | short utility reply or low token mode | cheaper/faster model or local mock |
| `chat.group.universe` | future group chat | model with larger context and stronger speaker control |
| `chat.summary` | memory summarization | cheap/local model when available |
| `chat.guard` | prompt/control/content classification | deterministic local check first, optional model fallback |
| `creator.draft` | character profile generation | structured JSON output, retries and redaction |
| `image.prompt` | image prompt rewrite | image-provider-specific prompt profile |
| `eval.local` | deterministic local QA | no live provider required |

Implementation direction:

- Keep current OpenRouter default as the managed cloud bridge.
- Keep BYOK as a user-owned route, but route it through the same prompt assembler and audit logic.
- Move provider/model defaults out of ad hoc functions into a typed model route registry.
- Admin Health should show route readiness, not only one model string.
- Wallet should group cost by model route and provider source.

## Maprang Prompt Stack v2

Current Maprang already has platform rules, character prompt blocks, user persona, lore retrieval, relationship state, scene state, world state, prompt budgeting, Prompt Inspector, and deterministic evals.

The next prompt stack should be formalized in this order:

1. Platform control policy
   - Highest priority.
   - Guards secrets, hidden prompts, admin data, prompt injection, prohibited content, and age/content policy.

2. Content and account mode
   - Safe/mature/adult mode.
   - Adult mode requires adult-confirmed session/account.
   - Minor or ambiguous-age signals block adult generation.

3. Model route profile
   - Route id, provider source, reply depth, output budget, temperature range, and known limitations.

4. Character identity
   - systemPrompt, compactPrompt, characterAnchor, constraints, tagline, description, biography, scenario.

5. Relationship contract/state
   - selected relationship seed, current status, affinity/trust, tone, recent deltas.

6. Scene/world state
   - mode: sandbox/scene.
   - active scene objective.
   - time/place/weather/current situation.

7. User persona for this chat
   - selected persona id and short trusted summary.
   - Never allow persona text to override platform rules.

8. Lorebook/world memory
   - keyword-triggered entries first.
   - later semantic retrieval.
   - cap lore to a fixed portion of prompt budget.

9. Memory summary and relationship timeline
   - compact facts, prior scene outcomes, emotional momentum, important promises/conflicts.

10. Recent messages
   - newest useful window after fixed blocks are budgeted.
   - drop old raw messages before dropping structured memory.

11. Director command
   - optional user instruction for story direction.
   - not normal dialogue.
   - stored separately and visible in Prompt Inspector diff.

12. Current user message
   - treated as untrusted story input.

13. Output contract
   - Thai-first by default.
   - roleplay depth target based on reply profile.
   - do not narrate the user's actions as confirmed facts.
   - maintain in-character voice.
   - include enough scene/action/subtext for the selected profile.

## Reply Profiles

Maprang should expose friendly controls instead of raw model knobs by default.

| Profile | Product label | Output policy |
| --- | --- | --- |
| `quick` | สั้น กระชับ | 1-3 short paragraphs, no forced continuation |
| `balanced` | สมดุล | 3-5 short paragraphs, clear action/reaction |
| `deep_roleplay` | ละเอียด | 4-7 short paragraphs, richer sensory/action/subtext |
| `cinematic_scene` | ฉากเข้มข้น | scene objective, actions, dialogue beats, emotional momentum |

Advanced users can still access temperature/top-p/max output/model source through a power drawer.

## Adult Mode Prompt Rules

Maprang can support adult roleplay only as adult-confirmed fictional simulation. The prompt stack must keep these hard rules above character and user text:

- No sexual content involving minors or ambiguous-age characters.
- No sexualized real-person image/video generation without verified consent.
- No coercive real-world instructions, blackmail, doxxing, stalking, or extortion.
- Public discovery is stricter than private adult-only chat.
- Relationship/taboo tags can be warnings in adult mode, but age/consent/legal blockers remain hard blocks.
- Generated images/videos stay private by default and require opt-in publication plus moderation/report paths.

## Prompt Inspector Requirements

Prompt Inspector should show:

- Final redacted prompt.
- Section order.
- Token estimate per section.
- Active model route and reply profile.
- Retrieved lore/memory entries.
- Director command block if present.
- Before/after diff for current vs previous prompt.
- Warnings for over-budget blocks, missing platform policy, injection signals, and adult gate mismatch.

## Eval Requirements

Add or keep deterministic evals for:

- Roleplay depth not becoming one-line replies.
- Platform policy outranking character/lore/persona/user text.
- Relationship seed affects tone without breaking character.
- Scene Mode injects objective and exits cleanly.
- Lore retrieval stays under budget.
- Director command influences behavior but is not stored as normal dialogue.
- Adult mode blocks minor/ambiguous-age content while allowing adult-confirmed fictional mature mode.
- BYOK route uses the same prompt stack and redaction as managed route.

## Implementation Tasks

### P0 - Documentation and contract

- Keep this document as the source of truth for model/prompt competitor analysis.
- Link this file from `AGENTS.md` and `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`.
- Add a decision record for adopting Maprang-owned model route and prompt stack contracts.
- Done locally 2026-06-18: `memory/decisions/0031-adopt-model-route-prompt-stack-contract.md` records the decision and links this audit.

### P1 - Backend architecture

- Done locally 2026-06-18: add typed `ModelRoute` and `ReplyProfile` registry in `apps/backend/src/model-route.service.ts`.
- Done locally 2026-06-18: inject the default model route/profile block into `buildContextPromptBlocks` so Chat and Prompt Inspector inherit the contract.
- Replace ad hoc `getModelForProvider` with route-aware resolver.
- Add request-level `replyProfile` and `modelRoute` fields.
- Persist model route, provider source, prompt budget, and reply profile in usage metadata.

### P1 - Prompt assembler

- Extract prompt assembly into a dedicated service that returns section objects before joining text.
- Make Chat and Prompt Inspector use the same section builder.
- Add Director Command as a separate section.
- Add section-level budgets for lore/history/memory.

### P1 - Frontend

- Add chat settings drawer:
  - reply profile
  - model source
  - advanced controls behind power-user section
- Show active model route/reply profile in chat side panel.
- Add creator token/context meter.

### P2 - Memory and universe

- Add Lorebook/World Memory module.
- Add semantic memory retrieval after keyword memory is stable.
- Add group/universe draft and manual speaker routing after one-on-one Chat QA remains stable.

## Current Maprang Fit

Already present:

- OpenRouter/OpenAI-compatible provider path.
- Anthropic-format path for default provider when configured.
- BYOK input path for OpenAI/Gemini/OpenRouter-compatible calls.
- Local/mock roleplay fallback.
- Prompt budget and history trimming.
- Context/lore prompt blocks.
- User persona prompt block.
- Relationship engine.
- Scene runtime.
- World state controller.
- Prompt Inspector with section/token/diff support.
- Deterministic local evals.
- Usage/cost metadata.

Main gap:

- Model routing is still too thin and mostly provider-based.
- Prompt assembly and inspector are close but should share a formal section contract.
- Reply profile is implicit through env vars, not a per-chat/product control.
- Director Mode and Lorebook/World Memory UI are planned but not first-class.

## Source Links

- MissAI: `https://www.missai.day/`
- Khuiai: `https://www.khuiai.com/th`
- Nectar: `https://nectar.ai/`
- CrushOn public feature page: `https://chat.crushon.ai/`
- Candy AI: `https://candy.ai/`
- SpicyChat AI Models: `https://docs.spicychat.ai/product-guides/premium-features/ai-models`
- SpicyChat Generation Settings: `https://docs.spicychat.ai/advanced/generation-settings`
- SpicyChat Director Mode: `https://docs.spicychat.ai/product-guides/director-mode`
- SpicyChat Lorebook: `https://docs.spicychat.ai/product-guides/lorebook`
- SpicyChat Semantic Memory: `https://docs.spicychat.ai/product-guides/premium-features/semantic-memory-2.0`
- SpicyChat User Personas: `https://docs.spicychat.ai/product-guides/premium-features/user-personas`
- JanitorAI: `https://janitorai.com/`
- Sakura Thai: `https://www.sakura.fm/th`
- CraveU: `https://craveu.ai/`
- MyBabes adult chat landing: `https://landing.mybabes.ai/free-nsfw-ai-chat`
- AI Haven NSFW roleplay directory: `https://aihaven.com/s/nsfw-roleplay/`
- Yollo Thai: `https://www.yollo.ai/th`
