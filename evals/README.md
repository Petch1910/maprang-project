# Maprang Evals

This folder holds deterministic and provider-backed evaluation fixtures for Maprang AI.

## Current Scope

- `golden-roleplay.json`: local prompt assembly and roleplay guard scenarios.
- `promptfoo.roleplay.yaml`: optional Promptfoo config using the `echo` provider, so it can run without spending model credits.

## Golden Dataset

The golden dataset is intentionally small and deterministic. Add scenarios when a context bug is fixed, a relationship or
scene rule changes, or a prompt-control regression needs a permanent guard.

## Commands

```bash
bun run eval:local
```

`eval:local` is deterministic and safe for CI. It validates the golden scenario corpus, prompt section order, knowledge pack inclusion, prompt-control policy, lore injection, and rough token budget.
The same shared backend eval service is exposed to admins through `GET /admin/evals/local` and the `/admin/evals` UI.

```bash
bun run eval:promptfoo
```

`eval:promptfoo` is optional. It uses `bunx promptfoo@latest` and may download Promptfoo if it is not cached locally. Keep this outside the strict local gate until the team decides to pin Promptfoo as a dev dependency.

## Rules

- No secrets in eval fixtures.
- Never store real user chats, secrets, API keys, access tokens, service role keys, or private production URLs in eval fixtures.
- Keep live-provider evals separate from deterministic evals.
- Prefer small, high-signal scenarios that catch regressions in context assembly and roleplay behavior.
