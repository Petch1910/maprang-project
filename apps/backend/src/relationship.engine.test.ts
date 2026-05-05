import { describe, expect, test } from 'bun:test'
import {
  RELATIONSHIP_PRESETS,
  applyRelationshipDelta,
  buildRelationshipSeedFromTags,
  simulateRelationshipPreview,
  validateRelationshipTags,
} from './relationship.engine'

describe('relationship tag validation', () => {
  test('blocks family with romantic or NC tags', () => {
    const issues = validateRelationshipTags(['family', 'lover', 'nc'])

    expect(issues.some((issue) => issue.code === 'family_romance_conflict')).toBe(true)
    expect(issues.some((issue) => issue.level === 'danger')).toBe(true)
  })

  test('warns when progression tags conflict', () => {
    const issues = validateRelationshipTags(['hard-to-get', 'golden'])

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'mixed_progression_speed',
        level: 'warning',
      }),
    )
  })
})

describe('relationship seed', () => {
  test('creates a safety-locked family route', () => {
    const seed = buildRelationshipSeedFromTags(['family', 'no-romance', 'slice-of-life'])

    expect(seed.status).toBe('FAMILY')
    expect(seed.constraints).toContain('no_romance')
    expect(seed.constraints).toContain('no_intimacy')
    expect(seed.intimacy).toBe(0)
  })

  test('creates a warm lover arc with one-shot confession hook', () => {
    const seed = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])

    expect(seed.route).toBe('romance')
    expect(seed.arcStage).toBe('commitment-test')
    expect(seed.status).toBe('LOVER')
    expect(seed.events).toContainEqual(
      expect.objectContaining({
        code: 'soft_confession_available',
        repeatable: false,
        cooldownTurns: 8,
      }),
    )
  })

  test('creates repeatable crisis events for hostile states', () => {
    const seed = buildRelationshipSeedFromTags(['enemy'])
    const broken = applyRelationshipDelta(seed, { affinity: -90, trust: -90 }, 'test_break')

    expect(broken.events).toContainEqual(
      expect.objectContaining({
        code: 'relationship_break',
        repeatable: true,
      }),
    )
  })
})

describe('relationship preview simulator', () => {
  test('simulates turns without calling external services', () => {
    const preview = simulateRelationshipPreview({
      tags: ['enemy', 'crush', 'hard-to-get'],
      messages: ['hello', 'thank you, I trust you'],
    })

    expect(preview.seed.status).toBe('RIVAL')
    expect(preview.turns).toHaveLength(2)
    expect(preview.finalState.trust).toBeGreaterThan(preview.seed.trust)
  })

  test('keeps exported presets valid enough for preview', () => {
    for (const preset of RELATIONSHIP_PRESETS) {
      const preview = simulateRelationshipPreview({ tags: preset.tags })

      expect(preview.seed.tagProfile.engine.length + preview.seed.tagProfile.safety.length).toBeGreaterThan(0)
      expect(preview.turns.length).toBeGreaterThan(0)
    }
  })
})
