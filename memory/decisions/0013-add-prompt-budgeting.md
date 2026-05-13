# 0013 - Add Prompt Budgeting

Date: 2026-05-14

## Context

Long roleplay sessions can silently grow prompt size through saved history, runtime memory, lore, persona, and scene state. Without a budget, costs and latency can rise before the team notices, and providers can fail once context exceeds model limits.

## Decision

Add Prompt Budgeting v1 to chat assembly:

- Keep configurable `PROMPT_BUDGET_TOKENS` and `PROMPT_HISTORY_MAX_MESSAGES`.
- Estimate prompt size before provider calls.
- Drop oldest chat history messages first until the assembled prompt fits the budget.
- Return prompt budget metadata in chat usage and persist it in message/transaction metadata.
- Expose the budget config through health and the chat right-rail model panel.

## Consequences

- No migration is required.
- Recent conversation, system policy, character context, persona, world state, relationship state, and scene state stay prioritized.
- If fixed context alone exceeds the budget, the metadata marks `overBudget` so Prompt Inspector and QA can guide further trimming.
- Production can tune budget values per model without code changes.
