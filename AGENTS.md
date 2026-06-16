# จุดเริ่มต้นเอเจนต์ Maprang (Maprang Agent Entry Point)

Read [`agent.md`](./agent.md) before making changes in this repository.

`agent.md` is the canonical operating guide for future agents and developers. It explains the current mission, work loop, QA gates, production blockers, relationship/scene/prompt systems, and safety rules.

## ขอบเขต (Scope)

These instructions apply to the whole repository unless a more specific `AGENTS.md` exists in a child directory.

Quick start:

1. Check `git status --short`.
2. Read `memory/working-context.md` and `memory/qa-status.md`.
3. Read `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`, `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`, `docs/AI_CREATOR_FLOW_GAP_PLAN.md`, `docs/AI_CREATOR_COMPLETION_PLAN.md`, `docs/MAPRANG_TEST_PLAN.md`, `docs/MISSAI_TEMPLATE_AUDIT.md`, and `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md` when UI/product direction matters.
4. For AI Creator work, start from `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`, then use `docs/AI_CREATOR_FLOW_GAP_PLAN.md` for the active task order. Preserve the local-safe contract: no fake public gallery data, all blocked/disabled states need readable reasons, generated outputs stay private by default, and payment/top-up is out of scope until provider/policy is ready. Retry failed generation job, use-as-cover draft bridge, signed URL expiry/refresh UI state, backend `coverUrl` publish contract, backend signed-output guard, frontend template-aware upload slot validation, backend preflight parity for slot MIME/size/duration metadata, `/ai-creator` e2e smoke contract coverage, and backend-backed My Library/use-as-cover browser smoke are done. Current AI Creator priorities are signed-storage output browser smoke, Creator Studio `coverUrl` publish/edit/render smoke, then Public Gallery opt-in/sanitized/report/moderation/audit.
5. Pick one small scope that can be fully closed.
6. Run the relevant QA gate before committing.
7. Update memory, knowledge, or docs when system status changes.

## การสานต่องาน (Continue Requests)

When the user asks to continue, start from:

1. `memory/working-context.md`
2. `memory/deploy-blockers.md`
3. `docs/MAPRANG_TEST_PLAN.md`
4. `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
5. `memory/ui-ux/current-direction.md`

Then pick the highest-priority repo-owned task that can be completed without real staging credentials. If a blocker requires external services, make the blocker explicit and close the next repo-owned task instead.

## เช็คขั้นต่ำ (Minimum Checks)

For documentation or handoff-only changes, run:

```bash
bun run predeploy:check
bun run secrets:check
git diff --check
```

For code, API, or UI changes, also run the narrow test for the touched area. Use `bun run qa:repo` for deterministic repo-owned checks that do not need a running backend/Postgres, and use `bun run qa:local` or `bun run e2e:smoke` when behavior or route coverage changes and runtime services are available.

## การ commit และ push (Commit And Push)

When a coherent task is complete, commit it with a focused message, push the current branch, and leave `git status --short` clean.

Do not commit secrets, bypass production blockers, or leave clickable UI controls without a real result or a clear disabled reason.
