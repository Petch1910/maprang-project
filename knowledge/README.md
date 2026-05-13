# Maprang Knowledge Layer

This folder separates long-running product knowledge from runtime user data.

## Layers

- `raw/`: source material such as TOR notes, UX references, provider docs, and policy notes.
- `wiki/`: human-readable Markdown compiled from raw sources.
- `structured/`: JSON knowledge packs that backend code can load, validate, and use in prompts or rule engines.

Start from the [Wiki Index](./wiki/INDEX.md) for product context.

## Structured Packs

The first runtime packs are chat style, creator guidance, relationship rules, scene rules, and content policy.

## Rules

- Never store secrets, access tokens, private keys, database passwords, or service role keys.
- Store env variable names only, not their real values.
- Keep structured files deterministic and schema-versioned.
- Run `bun run knowledge:audit` after editing this folder.

## Runtime Usage

The backend loads `knowledge/structured/*.json` through `knowledge.service.ts`.
The first runtime use is conservative:

- Chat system prompts get a compact style and policy guide.
- Creator AI draft prompts get character creation guidance.
- Health/readiness exposes structured knowledge status.

Future use can expand this into editable relationship rules, scene rules, recommendation rules, and admin-managed knowledge packs.
