# API and Backend Direction

Last updated: 2026-05-19

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
- Runtime env validation, deploy env doctor, smoke doctor, deploy readiness, and deploy status now all surface roleplay reply budget risk. Values below 1200 output tokens or 320 roleplay reply characters block production; values at baseline but below 1600/420 emit CLI/UI recommendations for richer roleplay.
- Deploy readiness is shared by smoke doctor and deploy status, so staging and production blockers plus next steps stay consistent across CLI, CI, and Admin Health handoff.
- Local API smoke covers non-mutating validation paths for admin reports, admin wallet, report creation, chat deletion, chat streaming shape, prompt inspector, and automated evals without spending live provider credits.

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
- deploy/smoke scripts that read `/health` and `/ready`

## Provider Policy

- Chat provider readiness requires real reply, `chatId`, token usage, and wallet transaction.
- Image provider readiness requires configured generated image, not placeholder fallback.
- Production `/ready` must fail until both chat and image live verification flags are set in that target environment.
- Do not mark live verification flags from local deterministic smoke.
- Keep `knowledge/structured/*.json` deterministic, schema-versioned, and verified by `bun run knowledge:audit`.
- Keep `evals/golden-roleplay.json` deterministic and verified by `bun run eval:local` before changing context assembly.
- Do not expose raw provider errors or secrets to users; classify provider failures and keep failed provider attempts uncharged.
- Keep `/chat/stream` covered in local smoke through uncharged validation paths, then verify live streaming manually or against staging before production.
