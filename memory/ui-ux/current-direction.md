# UI/UX Direction

Last updated: 2026-05-19

## Product Direction

Maprang should feel familiar to Thai character-chat users while adding deeper relationship and scene systems.

## Main Principles

- Mobile-first.
- Dark-first interface with consistent visual language.
- Thai navigation labels.
- Menus should be complete and actionable, not decorative.
- Empty states should explain what to do next.
- Chat should feel natural and familiar before advanced systems appear.
- Relationship and scene features should feel like game-layer feedback, not clutter.

## Key Surfaces

- Explore: discovery, continue chatting, character rows.
- Character Lobby: relationship seed contract before chat.
- Chat Room: normal chat first, scene mode only when relevant.
- Creator Studio: Khuiai-like creation flow plus personality clarity, tag warnings, image/content AI draft, preview simulator.
- My Chats: real chat management with rename, pin/unpin, archive, delete, report paths.
- Wallet: token balance, usage, admin adjustment guard.
- Admin Health: deploy blockers in plain language.
- Prompt Inspector: admin-only prompt snapshot/diff tool for debugging reply depth, lore retrieval, and context drift.
- Automated Evals: admin-only deterministic quality checks for prompt/context regression before staging.

## Current Known UX Concern

The user has repeatedly flagged that UI must feel complete and natural. Any visible menu item should either work, be clearly guarded, or not be shown yet.

## Latest Frontend Pass

- Explore now keeps mobile users in the same primary navigation model with a bottom nav for Explore, Chats, Create, Events, and Profile.
- Chat read mode is no longer decorative: the top bar and right-rail control both toggle the reading layout, show a visible reading-state notice, and narrow the message area for long scenes.
- E2E smoke now verifies mobile Explore navigation and Chat read mode on desktop/mobile.
- Prompt Inspector now has a guarded admin UI at `/admin/prompt-inspector` with character selection, section budget, diff, lore retrieval, warnings, and redacted prompt copy.
- Automated Evals now has a guarded admin UI at `/admin/evals` with suite summary, scenario accordion, per-check status, and failure summary.
- Route/Menu Audit and Admin Health now use Thai-first labels and make every primary route/menu state explicit: ready, guarded by admin key, or waiting for real staging.
- My Chats and the Chat sidebar both have real three-dot menu flows for rename, pin/unpin, archive/restore, delete, selection mode, and bulk actions, with desktop/mobile e2e coverage.
- Wallet shows token balance, model cost breakdown, seven-day trend, transactions, and admin adjustment guards using backend data from QA seed.
- Latest browser e2e smoke passed on desktop and mobile for core flows plus all primary routes without console errors or horizontal overflow.
