# 0031 - Adopt model route and prompt stack contract

Date: 2026-06-18

## บริบท Context

Competitor research shows that roleplay quality is not determined by a single model name. The strongest products combine model choice, reply controls, personas, memory, lore/world knowledge, content gates, and prompt debugging. SpicyChat documents the clearest version of this with model selection, generation settings, personas, lorebook, semantic memory, and director mode. CrushOn and Yollo position model switching and long-term memory as product differentiators. Nectar, Candy, MyBabes, and similar adult companion products emphasize adaptive memory plus chat/media generation loops.

Maprang already has several of these parts: OpenRouter/BYOK/local fallback, prompt budget, relationship state, scene runtime, world state, user persona, lore retrieval, Prompt Inspector, evals, and usage metadata. The first repo-owned implementation is `apps/backend/src/model-route.service.ts`, which formalizes route/profile choices and injects the default route block into the context prompt. The remaining gap is exposing those controls at request/UI level and persisting them in usage metadata.

## การตัดสินใจ Decision

Use `docs/COMPETITOR_MODEL_PROMPT_AUDIT.md` as the source of truth for competitor model/prompt analysis.

Adopt a Maprang-owned architecture:

- A typed model route registry such as `chat.roleplay.standard`, `chat.roleplay.deep`, `chat.scene.cinematic`, `chat.summary`, `chat.guard`, `creator.draft`, and `image.prompt`.
- A formal prompt stack order: platform policy, content/account mode, model route profile, character identity, relationship state, scene/world state, user persona, lore/world memory, compact memory/timeline, recent messages, director command, current user message, output contract.
- Reply profiles (`quick`, `balanced`, `deep_roleplay`, `cinematic_scene`) as user-facing controls, with raw generation knobs available only in an advanced drawer.
- Prompt Inspector must continue to expose redacted section-level prompt snapshots and diffs, and should add model route/reply profile/director command visibility when those fields are implemented.

## ผลกระทบ Consequences

- Future chat code should not add provider/model special cases directly in components or ad hoc branches.
- BYOK, local mock, managed OpenRouter, and future providers must all use the same prompt assembler and redaction/audit path.
- Roleplay reply depth should be controlled by route/profile plus evals, not by undocumented prompt edits.
- Adult mode remains a structured account/content gate, not a blanket "uncensored" prompt.
- Competitor model names or prompt behavior are not treated as facts unless sourced from official/public documentation.

## งานต่อ Follow-up tasks

1. Done 2026-06-18: add `ModelRoute` registry and route-aware model resolver in `apps/backend/src/model-route.service.ts`.
2. Add request-level `replyProfile` and `modelRoute` fields.
3. Extract prompt assembly into a section-based service shared by Chat and Prompt Inspector.
4. Add Director Command section and eval coverage.
5. Add Lorebook/World Memory after one-on-one chat remains stable.
