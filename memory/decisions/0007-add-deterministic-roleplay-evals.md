# 0007 - Add Deterministic Roleplay Evals

Date: 2026-05-13

## Status

Accepted

## Context

Maprang's chat quality depends on assembled context, not only on the selected model. The project now has runtime knowledge
packs, lore injection, prompt-control rules, relationship state, and scene state. A small prompt change can silently reduce
roleplay depth, leak hidden instructions, or drop relationship continuity.

## Decision

Add a deterministic local eval suite under `evals/` and run it through `bun run eval:local`. The suite checks prompt
assembly without calling a live model:

- prompt-control policy stays above untrusted text
- runtime knowledge text remains present
- lore entries are included in the expected section
- relationship and scene continuity can be injected
- secret-shaped values are not present
- rough prompt token budget stays bounded

Keep optional Promptfoo scaffolding for later live-model comparisons, but do not make it part of the mandatory local gate
until staging has stable provider keys and budgets.

## Consequences

- `qa:local` and CI catch context regressions earlier.
- The eval suite stays cheap and deterministic.
- Live quality scoring remains a future staging step rather than a local developer blocker.
