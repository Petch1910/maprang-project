# จุดเริ่มต้นเอเจนต์ Maprang (Maprang Agent Entry Point)

Read [`agent.md`](./agent.md) before making changes in this repository.

`agent.md` is the canonical operating guide for future agents and developers. It explains the current mission, work loop, QA gates, production blockers, relationship/scene/prompt systems, and safety rules.

For temporary local HTTPS staging with Ngrok, use [`docs/NGROK_STAGING_RUNBOOK.md`](./docs/NGROK_STAGING_RUNBOOK.md). The supported path is a single-origin proxy via `bun run ngrok:proxy`; do not open separate backend/frontend Ngrok tunnels unless the account has distinct reserved endpoints and CORS is updated accordingly.

## ขอบเขต (Scope)

These instructions apply to the whole repository unless a more specific `AGENTS.md` exists in a child directory.

Quick start:

1. Check `git status --short`.
2. Read `memory/working-context.md` and `memory/qa-status.md`.
3. Read `docs/MAPRANG_DEVELOPMENT_PROCESS_SUMMARY.md` for the current system/process summary before diving into detailed plans.
4. Read `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md` to pick the right workflow, scope, and QA gate for the current task. This repo uses `addyosmani/agent-skills` as a reference only; do not vendor external skill files blindly.
5. Read `docs/MAPRANG_PHASE_0_11_LOCAL_FIRST_PLAN.md` for the active local-first execution plan, then read `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`, `docs/MAPRANG_COMPETITIVE_SYSTEM_IMPROVEMENT_PLAN.md`, `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`, `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`, `docs/AI_CREATOR_FLOW_GAP_PLAN.md`, `docs/AI_CREATOR_PRODUCTION_MODERATION_RUNBOOK.md`, `docs/AI_CREATOR_COMPLETION_PLAN.md`, `docs/MAPRANG_TEST_PLAN.md`, `docs/MISSAI_TEMPLATE_AUDIT.md`, `docs/MISSAI_LOGGED_IN_FLOW_AUDIT.md`, `docs/KHUIAI_REFERENCE_AUDIT.md`, `docs/COMPETITOR_FEATURE_AUDIT.md`, and `docs/COMPETITOR_MODEL_PROMPT_AUDIT.md` when UI/product/model/prompt direction matters.
6. For AI Creator work, start from `docs/MAPRANG_AI_CREATOR_SYSTEM_PLAN.md`, then use `docs/AI_CREATOR_FLOW_GAP_PLAN.md` for the active task order. Preserve the local-safe contract: no fake public gallery data, all blocked/disabled states need readable reasons, generated outputs stay private by default, and payment/top-up is out of scope until provider/policy is ready. Retry failed generation job, use-as-cover draft bridge, signed URL expiry/refresh UI state, backend `coverUrl` publish contract, backend signed-output guard, frontend template-aware upload slot validation, backend preflight parity, signed-storage owner-path smoke, cover publish/render smoke, Public Gallery opt-in publish/unpublish, sanitized list/detail, generation-output report/moderation, reuse smoke, docs sync, temp artifact cleanup, remote-gallery hook cleanup, upload/generation/download/library-action hook cleanup, reference-to-Creator bridge hook cleanup, remaining blocked-state/upload-slot hardening tests, production moderation runbook/policy copy, and browser hardening review are done. Current AI Creator priority is external production verification plus optional further page-size cleanup.
7. Pick one small scope that can be fully closed.
8. Run the relevant QA gate before committing.
9. Update memory, knowledge, or docs when system status changes.

## การสานต่องาน (Continue Requests)

When the user asks to continue, start from:

1. `memory/working-context.md`
2. `docs/MAPRANG_DEVELOPMENT_PROCESS_SUMMARY.md`
3. `docs/MAPRANG_AGENT_SKILLS_WORKFLOW.md`
4. `docs/MAPRANG_PHASE_0_11_LOCAL_FIRST_PLAN.md`
5. `docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md`
6. `memory/deploy-blockers.md`
7. `docs/MAPRANG_TEST_PLAN.md`
8. `docs/MAPRANG_CORE_PLAY_CREATE_PLAN.md`
9. `memory/ui-ux/current-direction.md`

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
