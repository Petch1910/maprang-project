# 0014 - Add Chat Provider Failure Classification

Date: 2026-05-14

## Decision

Chat provider failures should be classified into typed, user-safe states before they reach the UI.

## Context

Maprang now depends on live LLM providers for both normal chat and streamed chat. Failures from providers can be caused by rate limits, exhausted quota, bad credentials, timeouts, or temporary outages. Raw provider errors are too noisy for users, may expose implementation details, and should not result in token charges.

## Implementation Direction

- Classify chat provider errors as `rate_limited`, `quota_exhausted`, `invalid_credentials`, `timeout`, `provider_unavailable`, or `unknown`.
- Return Thai user-facing messages that explain whether the user can retry or whether an admin needs to fix configuration.
- Keep failed provider attempts at zero token usage and zero cost.
- Send `providerFailure` metadata in normal and streamed chat responses so the UI and QA can observe the failure mode.
- Let roleplay continuation failures degrade gracefully by keeping the primary provider reply instead of failing the whole turn.
- Make live chat smoke fail on `usage.providerFailure` directly so staging diagnostics point to the actual provider failure class.

## Consequences

- Chat UX is less brittle when OpenRouter or the selected model has a temporary issue.
- Local QA can verify provider failure handling without spending live model tokens.
- Future model-router/fallback work can reuse the same typed failure contract.
