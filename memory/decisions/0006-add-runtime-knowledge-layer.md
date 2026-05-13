# 0006 - Add Runtime Knowledge Layer

Date: 2026-05-13

Status: decided

## Context

The project needs persistent product rules that are more structured than session memory and more directly usable by backend prompts and rule engines.

## Decision

Use a mixed architecture:

- `memory/` stores project/session state, decisions, blockers, and QA status.
- `knowledge/raw/` stores source notes and reference material without secrets.
- `knowledge/wiki/` stores human-readable product knowledge.
- `knowledge/structured/` stores schema-versioned JSON packs for runtime use.

The backend loads structured packs for chat style, creator drafting, relationship rules, scene rules, and content policy. Health/readiness exposes structured knowledge validity.

## Consequences

- Product rules can compound across sessions without becoming loose chat history.
- Runtime prompts can reuse consistent guidance without hard-coding every rule in TypeScript.
- `bun run knowledge:audit` must pass before deploy.
