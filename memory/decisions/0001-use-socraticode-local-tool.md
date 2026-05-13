# 0001 - Use SocratiCode as Local Codebase Intelligence

Date: 2026-05-13

Status: done

## Decision

Use SocratiCode as a local MCP development tool, not as a Maprang runtime dependency.

## Rationale

Maprang now has enough backend, frontend, QA, deploy, and provider wiring that codebase intelligence can save time when tracing route-to-service-to-database flows and assessing impact before edits.

## Implementation

- Added a SocratiCode MCP server to the local Codex config.
- Added `.socraticodeignore` to avoid indexing dependencies, build output, local runtime files, binaries, and env secrets.
- Documented the workflow in the project README.

## Risk

SocratiCode is AGPL licensed on npm, so it should remain a local development tool unless licensing is reviewed separately.
