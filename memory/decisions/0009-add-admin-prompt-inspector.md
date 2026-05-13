# 0009 - Add Admin Prompt Inspector

Date: 2026-05-13

## Status

Accepted

## Context

Maprang roleplay quality depends on prompt assembly, lore retrieval, persona injection, runtime memory, and relationship
state. When a bot reply becomes too short or drifts from character, guessing at the model provider is slow and expensive.

## Decision

Add an admin-only prompt inspector endpoint and UI:

- `POST /admin/prompt-inspector` builds a redacted prompt snapshot without making a live model call.
- `/admin/prompt-inspector` lets admins select a character, compare messages, add runtime/persona context, and inspect the
  redacted prompt from the browser.
- The response includes section-level character counts, estimated tokens, retrieved lore previews, warnings, and optional
  previous/current prompt diff.
- The inspector output always redacts secret-shaped values before returning text.
- Local API smoke and backend tests cover the endpoint and service behavior.

## Consequences

- Developers can debug prompt shape, missing lore, runtime memory, and prompt bloat before spending provider tokens.
- The endpoint must remain admin-only because it reveals private character prompt structure.
- Future prompt work can add saved snapshots, side-by-side prompt diff visualization, and links from Chat/Creator Studio
  directly into the inspector.
