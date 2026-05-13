# API and Backend Direction

Last updated: 2026-05-14

## Core Direction

Backend should favor explicit guards, typed validation, auditability, and deterministic local smoke over optimistic assumptions.

## Current Strengths

- Route ID validation protects against injection-shaped IDs before persistence.
- Prompt-control context wraps untrusted character text.
- Admin actions have audit log coverage.
- Token wallet debits chat usage without overdraft.
- Local smoke skips live provider spending but still checks endpoint shape.
- Live provider paths are separate gates.
- Structured knowledge packs feed chat/creator prompt guidance and are surfaced through health/readiness.
- Deterministic prompt/context evals guard roleplay depth, prompt-control ordering, lore injection, and relationship/scene continuity.
- Admin Prompt Inspector gives redacted prompt snapshots, section token estimates, retrieved lore, and previous/current prompt diffs without spending live model tokens.
- Admin Automated Evals exposes the deterministic golden roleplay suite through a guarded API/UI so prompt regressions are visible without terminal access.
- Chat World State Controller stores owner-scoped scene constants in chat memory, injects them into runtime prompts, and exposes them through the chat UI plus Prompt Inspector runtime memory.
- Usage and cost intelligence is derived from the existing usage ledger, exposing total cost, model breakdown, daily trend, and remaining-request estimates through `/me/usage`.
- Prompt budgeting trims oldest chat history before provider calls, records budget metadata, and exposes budget configuration through health/readiness surfaces.
- Chat provider failures are classified into safe retry/admin states, returned with zero token usage, and exposed as `providerFailure` metadata in normal and streamed chat responses.

## Production-Critical API Areas

- `/health`
- `/ready`
- `/chat`
- `/chat/stream`
- `/creator/ai-draft`
- `/me/usage`
- `/me/persona`
- `/characters`
- `/chats/:id/world-state`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/prompt-inspector`
- `/admin/evals/local`

## Provider Policy

- Chat provider readiness requires real reply, `chatId`, token usage, and wallet transaction.
- Image provider readiness requires configured generated image, not placeholder fallback.
- Do not mark live verification flags from local deterministic smoke.
- Keep `knowledge/structured/*.json` deterministic, schema-versioned, and verified by `bun run knowledge:audit`.
- Keep `evals/golden-roleplay.json` deterministic and verified by `bun run eval:local` before changing context assembly.
- Do not expose raw provider errors or secrets to users; classify provider failures and keep failed provider attempts uncharged.
