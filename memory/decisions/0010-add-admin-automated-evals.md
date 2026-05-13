# 0010 - Add Admin Automated Evals

Date: 2026-05-13

## Status

Accepted

## Context

Prompt and context changes can silently break roleplay depth, prompt-control ordering, lore placement, or relationship/scene continuity. The project already has `bun run eval:local`, but relying only on terminal access makes quality regression harder to inspect during admin QA.

## Decision

- Extract the deterministic golden roleplay eval logic into a backend service shared by CLI and API.
- Expose `GET /admin/evals/local` behind `ADMIN_API_KEY`.
- Add `/admin/evals` as a guarded admin UI showing suite status, scenario results, per-check pass/fail details, token budget, and failure summaries.
- Include the route in route/menu audit, API smoke, and browser e2e smoke.

## Consequences

- Admins can verify prompt/context regression from the web without spending live model tokens.
- CLI, API, and UI now use the same eval logic, reducing drift.
- Future work can add saved eval history, prompt/provider comparisons, and live Promptfoo runs after staging is stable.
