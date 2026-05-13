# 0003 - Separate Live Provider Verification

Date: 2026-05-13

Status: done

## Decision

Track chat provider live readiness separately from image provider live readiness.

## Rationale

Having a configured provider key is not enough for production. Billing, quota, model access, networking, and rate limits can still fail after env validation passes.

## Implementation

- Chat readiness uses `CHAT_PROVIDER_LIVE_VERIFIED`.
- Image readiness uses `IMAGE_GENERATION_LIVE_VERIFIED`.
- Admin Health and smoke doctor show separate statuses and production blockers.
- Production gate fails until live verification is complete.

## Next

Set each flag only after its live smoke path succeeds in the target environment.
