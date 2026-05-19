# Relationship Engine

The relationship engine turns tags, seeds, user behavior, and scene outcomes into state.

## Concepts

- Seed: starting relationship contract chosen before chat.
- Stats: affinity, trust, intimacy, dominance, fear, respect.
- Momentum: short-term warming, cooling, volatile, or steady direction.
- Timeline: compact history of emotionally meaningful turns.
- Scene event: optional moment unlocked by relationship conditions.
- Expanded ladder: ศัตรู, ไม่ถูกกัน, คู่ปรับ, คู่กัด, คนรู้จัก, เพื่อน, เพื่อนสนิท, เพื่อนตาย, แอบชอบ, เพื่อนสนิทคิดไม่ซื่อ, ลองคุย, คนคุย, แฟน, แฟน Toxic, คนรัก, คู่ชีวิต, คู่ครอง, คู่ครอง Toxic, คู่แท้.
- Preset surfaces: `contract` is for player-facing Character Lobby relationship contracts; `creator` is for Creator Studio tag presets. Creator-only presets must not appear in the lobby contract list, but they stay available in Creator Studio.

## Runtime Direction

- Keep sandbox mode as the default.
- Notify before entering a scene.
- Make scene objectives explicit.
- Let outcomes update relationship state.
- Use cooldowns to avoid repeating major events too often.

Structured rules live in:

- `knowledge/structured/relationship-rules.json`
- `knowledge/structured/scene-rules.json`
