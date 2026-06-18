# 0032 - Add context snapshot and process mining layer

Date: 2026-06-18

## งาน - Context

The latest companion-platform architecture report recommended treating competitor research as evidence-ranked inference and then building first-party telemetry inside Maprang. The useful part for the product is not guessing another site's private database. The useful part is recording Maprang's own user journeys, prompt/context composition, and model-route behavior so we can debug answer quality, cost, retention, and scene/relationship progression from real usage.

Maprang already had Prompt Inspector, evals, wallet usage rows, reports, relationship state, scene state, and model-route prompt guidance. The missing system layer was an append-only event log plus redacted context snapshots that connect a persisted chat turn to the prompt/context state that produced it.

## งาน - Decision

Add two repo-owned persistence models:

- `AnalyticsEvent`: append-only first-party product/runtime events such as `chat_start`, `chat_turn`, `first_reply`, and `context_snapshot_created`.
- `ContextSnapshot`: redacted prompt/context evidence for chat turns, storing prompt hash, token estimate, section stats, model route, reply profile, model name, prompt budget, and retrieved lore keywords without storing raw secrets.

Implement the first slice in:

- `apps/backend/src/analytics.service.ts`
- `apps/backend/prisma/migrations/20260618123000_add_analytics_context_snapshots/migration.sql`
- `/admin/process-mining`
- `fetchAdminProcessMining`
- chat runtime persistence in `apps/backend/src/chat.service.ts`

The local database `maprang_local` has had the migration applied on this machine with `prisma migrate deploy`.

## งาน - Consequences

- Future chat/debug work should attach `contextSnapshotId` to message, wallet, report, or eval evidence when possible.
- Analytics writes must stay best-effort for runtime flows: analytics failure must not break chat.
- Production/staging environments must apply the new migration before `/admin/process-mining` is considered ready.
- Prompt snapshots must remain redacted and bounded; full raw prompts should stay in Prompt Inspector's guarded request-time view, not long-term telemetry.
- Competitor-derived assumptions should be tracked separately from observed Maprang data. First-party analytics is the source of truth for Maprang product decisions.

## งาน - Follow-up tasks

1. Add an Admin Analytics UI page or panel that uses `fetchAdminProcessMining`.
2. Extend frontend event capture for marketplace impressions, lobby detail views, wallet views, reports, and creator draft generation.
3. Add context snapshot diffing by chat turn, reusing Prompt Inspector diff logic.
4. Add retention/funnel reporting once enough first-party local/staging data exists.
5. Add production migration evidence to release handoff after staging/production DB is available.
