# 0034 - Local Server Forces Local Chat Runtime

Date: 2026-06-18

## งาน - Decision

Maprang local server startup must force the chat runtime to `local/mock-roleplay`, and local chat must bypass the token gate. Live provider mode still uses token balance checks and live smoke gates.

## งาน - Rationale

The project goal is local-first playability before cloud production. Browser smoke found that a restarted backend could follow `.env` provider settings and route chat through the live provider, then the UI could block sending when token balance reached 0. That contradicts the local server acceptance requirement.

## งาน - Implementation

- `scripts/local-server-up.ts` sets `LOCAL_CHAT_PROVIDER=1`, `CHAT_PROVIDER=local`, and `LOCAL_CHAT_MODEL_NAME=local/mock-roleplay` for the backend service.
- `apps/backend/src/chat.service.ts` bypasses minimum token checks only when `preferLocalChatProvider()` is true.
- `apps/frontend/src/pages/WorkspacePage.tsx` stores health status and passes `isLocalChatRuntime` into ChatPanel.
- `apps/frontend/src/components/ChatPanel.tsx` disables token gating only when `isLocalChatRuntime` is true.

## งาน - Evidence

- Direct `/chat/stream` local smoke returned `local/mock-roleplay` with `responseQuality.score=100`, `charCount=1002`, and `tokenBalance=0`.
- Browser smoke on `/chat` sent a message with token balance 0, received `local/mock-roleplay`, and showed `คะแนนคุณภาพล่าสุด100/100 · 1,106 ตัวอักษร`.
- `bun run backend:check`: 343 pass / 1496 expects.
- `bun run frontend:check`: pass.
- `bun test scripts/local-server-up.test.ts`: 3 pass / 11 expects.
- `bun run api:audit`: pass, 80 backend routes / 56 frontend helper calls.
