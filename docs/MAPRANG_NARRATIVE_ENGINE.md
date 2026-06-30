# Maprang Narrative Engine

Last updated: 2026-06-30

## Purpose

Maprang uses `voocel/ainovel-cli` as an architecture reference, not as vendored code. The useful pattern is the long-form creative pipeline:

- Coordinator: choose the runtime route and checkpoint type.
- Architect: decide the scene focus, tension, and continuity constraints.
- Writer: produce roleplay beats with action, subtext, and a playable hook.
- Editor: check the reply before it reaches the player.

This is adapted into Maprang through `apps/backend/src/narrative-engine.service.ts`.

## Current Implementation

The first local implementation is intentionally small and repo-owned:

- `buildNarrativePlan(...)` creates a deterministic plan from user message, character, relationship status, scene mode, active scene, pending events, timeline summaries, reply profile, and response depth.
- `buildNarrativePromptBlock(...)` injects the Coordinator -> Architect -> Writer -> Editor workflow into the chat runtime prompt.
- `analyzeNarrativeQuality(...)` scores replies across seven dimensions: continuity, character voice, scene progression, relationship awareness, emotional depth, sensory grounding, and player agency.
- `chat.service.ts` now attaches `responseQuality.narrativeQuality` for local, normal, and streamed chat paths.
- `buildPromptInspectorSnapshot(...)` includes the same Narrative Engine prompt block so `/admin/prompt-inspector` mirrors the chat runtime.
- `apps/frontend/src/lib/api.ts` knows both chat `narrativeQuality` metadata and Prompt Inspector narrative-plan metadata.
- `/admin/prompt-inspector` renders a narrative planning panel with intent, checkpoint, context strategy, minimum paragraphs, revision triggers, and the exact workflow block.

## Why This Helps Maprang

This layer targets the main roleplay quality gaps:

- replies that are too shallow
- scenes that do not move forward
- relationship state that is ignored
- weak long-chat continuity
- answers that explain instead of roleplaying
- replies that decide the player action or emotion

The new engine does not replace Relationship Engine, Scene Runtime, Context Snapshot, Prompt Inspector, or Response Quality. It coordinates them.

## Local-First Scope

For v1 local server:

- No external provider is required.
- No Go CLI code is imported.
- No new database migration is required.
- The implementation runs inside the existing Bun/Elysia backend.
- Local/mock-roleplay remains playable.
- Prompt Inspector visibility is implemented. Admin Health can later show a high-level "Narrative Engine active" status if useful, but that is product polish, not a local blocker.

## QA Evidence

Latest focused checks:

- `bun test apps/backend/src/narrative-engine.service.test.ts`
- `bun test apps/backend/src/prompt-inspector.service.test.ts`
- `bun test apps/frontend/tests/frontend-component-contract.test.tsx`
- `bun test apps/backend/src/response-quality.service.test.ts apps/backend/src/chat.runtime.test.ts`
- `bun run backend:check`
- `bun run frontend:check`

Expected behavior:

- Planner emits an `ainovel-inspired` plan.
- Prompt block includes the Coordinator -> Architect -> Writer -> Editor workflow.
- Rich scene-aware replies score higher than flat replies.
- Chat responses keep existing `responseQuality` fields and add optional `narrativeQuality`.
- Prompt Inspector exposes the deterministic narrative plan and prompt block without adding a new route.
