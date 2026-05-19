# Maprang Agent Entry Point

Read [`agent.md`](./agent.md) before making changes in this repository.

`agent.md` is the canonical operating guide for future agents and developers. It explains the current mission, work loop, QA gates, production blockers, relationship/scene/prompt systems, and safety rules.

Quick start:

1. Check `git status --short`.
2. Read `memory/working-context.md` and `memory/qa-status.md`.
3. Pick one small scope that can be fully closed.
4. Run the relevant QA gate before committing.
5. Update memory, knowledge, or docs when system status changes.

Do not commit secrets, bypass production blockers, or leave clickable UI controls without a real result or a clear disabled reason.
