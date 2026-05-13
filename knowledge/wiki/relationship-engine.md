# Relationship Engine

The relationship engine turns tags, seeds, user behavior, and scene outcomes into state.

## Concepts

- Seed: starting relationship contract chosen before chat.
- Stats: affinity, trust, intimacy, dominance, fear, respect.
- Momentum: short-term warming, cooling, volatile, or steady direction.
- Timeline: compact history of emotionally meaningful turns.
- Scene event: optional moment unlocked by relationship conditions.

## Runtime Direction

- Keep sandbox mode as the default.
- Notify before entering a scene.
- Make scene objectives explicit.
- Let outcomes update relationship state.
- Use cooldowns to avoid repeating major events too often.

Structured rules live in:

- `knowledge/structured/relationship-rules.json`
- `knowledge/structured/scene-rules.json`
