import { describe, expect, test } from 'bun:test'
import { buildRelationshipSeedFromTags, applyRelationshipDelta } from './relationship.engine'
import { buildScenePrompt, outcomeRelationshipDelta, updateEmotionalMomentum, updateSceneState } from './scene.runtime'

describe('scene runtime', () => {
  test('creates a pending scene notification from relationship hooks', () => {
    const relationship = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])
    const scene = updateSceneState({
      previousSceneState: null,
      relationship,
      userMessage: 'hello',
      turnCount: 1,
    })

    expect(scene.mode).toBe('sandbox')
    expect(scene.pendingEvents).toContainEqual(
      expect.objectContaining({
        code: 'soft_confession_available',
        repeatable: false,
      }),
    )
  })

  test('enters a pending scene and starts cooldown', () => {
    const relationship = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])
    const pending = updateSceneState({
      previousSceneState: null,
      relationship,
      userMessage: 'hello',
      turnCount: 1,
    })
    const scene = updateSceneState({
      previousSceneState: pending,
      relationship,
      userMessage: '/scene enter soft_confession_available',
      turnCount: 2,
    })

    expect(scene.mode).toBe('scene')
    expect(scene.activeScene?.code).toBe('soft_confession_available')
    expect(scene.eventCooldowns.soft_confession_available).toBe(10)
  })

  test('builds Thai-first scene prompt context', () => {
    const relationship = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])
    const scene = updateSceneState({
      previousSceneState: null,
      relationship,
      userMessage: 'hello',
      turnCount: 1,
    })
    const prompt = buildScenePrompt(scene)

    expect(prompt).toContain('สถานะ Scene Engine')
    expect(prompt).toContain('โหมดฉาก')
    expect(prompt).toContain('มีแจ้งเตือนฉากที่รอให้ผู้ใช้เลือก')
    expect(prompt).not.toContain('Scene engine state')
    expect(prompt).not.toContain('Pending scene notifications')
  })

  test('records accepted scene outcome and consumes one-shot event', () => {
    const relationship = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])
    const pending = updateSceneState({ previousSceneState: null, relationship, userMessage: 'hello', turnCount: 1 })
    const active = updateSceneState({
      previousSceneState: pending,
      relationship,
      userMessage: '/scene enter soft_confession_available',
      turnCount: 2,
    })
    const resolved = updateSceneState({
      previousSceneState: active,
      relationship,
      userMessage: '/scene accept',
      turnCount: 3,
    })

    expect(resolved.mode).toBe('sandbox')
    expect(resolved.sceneOutcomes).toContainEqual(
      expect.objectContaining({
        code: 'soft_confession_available',
        outcome: 'accepted',
      }),
    )
    expect(resolved.consumedEvents).toContain('soft_confession_available')
  })

  test('does not recreate one-shot consumed event', () => {
    const relationship = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])
    const previous = {
      consumedEvents: ['soft_confession_available'],
      pendingEvents: [],
      declinedEvents: [],
      eventCooldowns: {},
      sceneOutcomes: [],
    }
    const scene = updateSceneState({
      previousSceneState: previous,
      relationship,
      userMessage: 'hello again',
      turnCount: 20,
    })

    expect(scene.pendingEvents.some((event) => event.code === 'soft_confession_available')).toBe(false)
  })

  test('repeatable crisis event returns after cooldown', () => {
    const seed = buildRelationshipSeedFromTags(['enemy'])
    const relationship = applyRelationshipDelta(seed, { affinity: -90, trust: -90 }, 'test_break')
    const previous = {
      consumedEvents: ['relationship_break'],
      declinedEvents: [],
      pendingEvents: [],
      eventCooldowns: { relationship_break: 5 },
      sceneOutcomes: [],
    }
    const scene = updateSceneState({
      previousSceneState: previous,
      relationship,
      userMessage: 'still angry',
      turnCount: 8,
    })

    expect(scene.pendingEvents).toContainEqual(expect.objectContaining({ code: 'relationship_break' }))
  })
})

describe('scene outcome and momentum deltas', () => {
  test('confession accepted has stronger positive delta than abandoned', () => {
    const accepted = outcomeRelationshipDelta({
      code: 'soft_confession_available',
      title: 'confession',
      outcome: 'accepted',
      turn: 1,
      createdAt: 'now',
    })
    const abandoned = outcomeRelationshipDelta({
      code: 'soft_confession_available',
      title: 'confession',
      outcome: 'abandoned',
      turn: 1,
      createdAt: 'now',
    })

    expect(accepted.affinity).toBeGreaterThan(0)
    expect(accepted.trust).toBeGreaterThan(Math.abs(abandoned.trust ?? 0))
  })

  test('momentum warms, cools, and becomes volatile', () => {
    const now = '2026-05-05T00:00:00.000Z'
    const warming = updateEmotionalMomentum(null, 'thank you, I trust you', now)
    const cooling = updateEmotionalMomentum(null, 'I hate this', now)
    const volatile = updateEmotionalMomentum({ positive: 1, negative: 1, threatening: 1 }, 'I will hurt you', now)

    expect(warming.direction).toBe('warming')
    expect(cooling.direction).toBe('cooling')
    expect(volatile.direction).toBe('volatile')
  })
})
