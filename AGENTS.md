# Maprang Agent Entry Point

Read [`agent.md`](./agent.md) before making changes in this repository.

`agent.md` is the canonical operating guide for future agents and developers. It explains the current mission, work loop, QA gates, production blockers, relationship/scene/prompt systems, and safety rules.

## Scope

These instructions apply to the whole repository unless a more specific `AGENTS.md` exists in a child directory.

Quick start:

1. Check `git status --short`.
2. Read `memory/working-context.md` and `memory/qa-status.md`.
3. Pick one small scope that can be fully closed.
4. Run the relevant QA gate before committing.
5. Update memory, knowledge, or docs when system status changes.

## Continue Requests

When the user asks to continue, start from `memory/working-context.md`, then `memory/deploy-blockers.md`, then pick the highest-priority local task that can be completed without real staging credentials. If a blocker requires external services, make the blocker explicit and close the next repo-owned task instead.

## Minimum Checks

For documentation or handoff-only changes, run:

```bash
bun run predeploy:check
bun run secrets:check
git diff --check
```

For code, API, or UI changes, also run the narrow test for the touched area. Use `bun run qa:local` or `bun run e2e:smoke` when behavior or route coverage changes.

## Commit And Push

When a coherent task is complete, commit it with a focused message, push the current branch, and leave `git status --short` clean.

Do not commit secrets, bypass production blockers, or leave clickable UI controls without a real result or a clear disabled reason.
