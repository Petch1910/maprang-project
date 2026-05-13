# Maprang Project Memory

This folder is a lightweight project memory vault for long-running AI-assisted development.
It is inspired by Obsidian-style atomic Markdown memory, but kept deliberately small so it stays easy to maintain.

## Purpose

- Preserve project context across Codex sessions.
- Record durable decisions, current blockers, QA status, and production readiness notes.
- Keep working memory close to the codebase without turning it into runtime app code.
- Point to the runtime knowledge layer in `knowledge/` when a note should become reusable product rules.
- Give SocratiCode and future codebase tools useful project context to index.

## Safety Rules

- Never store secrets, tokens, passwords, private keys, service role keys, database passwords, or real user credentials.
- Refer to environment variables by name only, for example `OPENROUTER_API_KEY` or `DATABASE_URL`.
- Do not paste real production URLs if they are private or not meant to be shared.
- Keep notes short, dated, and specific.
- Prefer facts over guesses. Mark uncertain items as `needs verification`.

## Update Protocol

Update memory after any meaningful change to:

- production readiness
- API contracts
- database schema or migrations
- UI/UX direction
- security posture
- QA results
- provider status
- deployment decisions

Use this shape for new notes:

```md
## YYYY-MM-DD - Short Title

Status: decided | done | blocked | needs verification

What changed:
- ...

Why it matters:
- ...

Next:
- ...
```

## Entry Points

- [Working Context](./working-context.md)
- [Project Map](./project-maprang.md)
- [Deploy Blockers](./deploy-blockers.md)
- [QA Status](./qa-status.md)
- [Decision Log](./decisions/index.md)
- [UI/UX Direction](./ui-ux/current-direction.md)
- [API/Backend Direction](./api-backend/current-direction.md)
- [Production Checklist](./production/checklist.md)
- [Inbox](./inbox.md)
