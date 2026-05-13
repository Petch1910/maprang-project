# 0012 - Add Usage and Cost Intelligence

Date: 2026-05-14

## Context

Maprang needs token economy visibility before staging and production. A raw wallet transaction list is not enough for production decisions because it does not show which model costs the most, how usage moves over time, or how many chat turns the current token balance can likely support.

## Decision

Extend the existing `/me/usage` endpoint instead of adding a new table or route. Derive cost intelligence from the existing `Usage` and `TokenTransaction` ledgers:

- Total tokens, request count, and total model cost.
- Usage grouped by model.
- Seven-day daily usage trend.
- Average tokens/cost per request and estimated remaining chat requests from the current token balance.

Surface the same data on `/wallet` with Thai UI labels and keep route/menu audit plus smoke coverage tied to the new fields.

## Consequences

- No migration is required.
- The wallet page becomes useful as a cost dashboard, not only a token ledger.
- Production/staging can still replace the calculation later with a richer analytics table if volume grows.
- Local QA can verify the shape deterministically through seed data and API smoke.
