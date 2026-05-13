# 0011 - Add Chat World State Controller

Date: 2026-05-14

## Status

Accepted

## Context

Long roleplay chats need more than raw message history, lore, relationship state, and scene state. The model can drift on current time, place, weather, or scene mood after several turns, especially when the user resumes a saved chat or enters/exits Scene Mode.

## Decision

- Store `worldState` inside existing `Chat.memory` JSON instead of adding a new table for v1.
- Expose owner-scoped `GET /chats/:id/world-state` and `PATCH /chats/:id/world-state`.
- Inject meaningful world state into runtime prompt assembly before relationship/scene instructions.
- Add a Chat right-rail panel for time, location, weather, mood, and scene notes.
- Include world state in Prompt Inspector runtime memory when a `chatId` is supplied.

## Consequences

- The feature ships without migration risk and can be promoted to a relational table later if we need history/versioning.
- QA seed chats now carry stable world state, making browser and prompt tests easier to inspect.
- Future work can add automatic world-state extraction, conflict diffs, and per-scene snapshots.
