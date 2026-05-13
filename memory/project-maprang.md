# Project Map: Maprang AI

Last updated: 2026-05-13

## Product Shape

Maprang AI is a Thai AI character roleplay platform inspired by familiar character-chat UX, with deeper game-like relationship and scene systems.

Primary surfaces:
- Explore/Home
- Character Lobby
- Chat Room
- Creator Studio
- My Chats
- Events Inbox
- Profile/Persona
- Wallet
- Admin Moderation
- Admin Health

## Backend Areas

- Character CRUD and quality validation
- Relationship presets, validation, preview, runtime state
- Scene runtime and pending event handling
- Chat generation, streaming, token usage, wallet debit
- Creator AI draft and optional image generation
- Supabase auth and avatar storage
- User content settings and persona
- Moderation reports and admin audit logs
- Health/readiness/deploy checks

## Frontend Areas

- Dark-first app shell with Thai navigation
- Redux state for scalable chat and future group/universe chat
- Chat room with relationship top bar, scene mode, pending events, message tools
- Creator Studio with AI draft, image flow, tag warnings, simulator, draft autosave
- Admin Health page with deployment gate status

## Tooling

- Bun
- Vite/React
- Elysia backend
- Prisma/Postgres
- Supabase Auth/Storage
- Playwright e2e smoke
- SocratiCode MCP as local codebase intelligence
- Markdown memory vault in `memory/`
- Runtime knowledge layer in `knowledge/` for chat, creator, relationship, scene, and content-policy packs
- Deterministic roleplay evals in `evals/`, with optional Promptfoo live-eval scaffolding
