# 0008 - Stage Background and Observability Tooling

Date: 2026-05-13

## Status

Accepted

## Context

Several external tools can improve Maprang, but adding all of them directly to runtime would increase deploy risk before
the core platform is production-ready. The project needs a staged adoption path that improves quality now and keeps heavier
systems ready for the right moment.

## Decision

Adopt low-risk quality tooling now, and stage heavier runtime systems:

- Use deterministic evals immediately for prompt/context regression checks.
- Keep Promptfoo as optional live-eval scaffolding for model/provider comparisons.
- Add Graphile Worker later for background jobs such as chat summaries, embedding refresh, image retries, cleanup, and
  scheduled production smoke.
- Add OpenTelemetry JS later for context-pipeline spans covering retrieve, assemble, generate, sanitize, and persist.
- Add Sentry later for frontend/backend error capture once staging domains and release identifiers are stable.
- Consider pgvector after the first production Postgres environment is stable.
- Consider OpenFGA only when collaborative permissions, shared universes, or creator teams make role-based access too
  complex for local policy checks.
- Consider LiteLLM or One-API only when provider routing needs multi-key load balancing or failover beyond OpenRouter.

## Consequences

- The repo gains quality gates without adding new runtime services.
- Future architecture choices are documented before they are implemented.
- Production deploy can focus on real env, Supabase, provider verification, UI QA, and API hardening first.
