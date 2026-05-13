# 0005 - Audit Memory in Local QA

Date: 2026-05-13

Status: done

## Decision

Add `memory:audit` and run it inside `qa:local`.

## Rationale

The memory vault is now part of the development workflow. It should be checked like any other project artifact so required context files, local links, and secret-safety rules do not silently drift.

## Implementation

- Added `scripts/memory-audit.ts`.
- Added `bun run memory:audit`.
- Added `memory:audit` to `qa:local`.
- Added memory checks to `predeploy:check`.

## Next

Keep memory concise and update it after major QA, deploy, API, schema, UI, or provider changes.
