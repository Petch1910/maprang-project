# API and Backend Direction

Last updated: 2026-05-13

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

## Production-Critical API Areas

- `/health`
- `/ready`
- `/chat`
- `/chat/stream`
- `/creator/ai-draft`
- `/me/usage`
- `/me/persona`
- `/characters`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/prompt-inspector`

## Provider Policy

- Chat provider readiness requires real reply, `chatId`, token usage, and wallet transaction.
- Image provider readiness requires configured generated image, not placeholder fallback.
- Do not mark live verification flags from local deterministic smoke.
- Keep `knowledge/structured/*.json` deterministic, schema-versioned, and verified by `bun run knowledge:audit`.
- Keep `evals/golden-roleplay.json` deterministic and verified by `bun run eval:local` before changing context assembly.
