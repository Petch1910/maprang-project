import { describe, expect, test } from 'bun:test'
import { sendChat, updateRuntimeState } from './chat.service'
import { contentRatingFromTags, ratingAllowed } from './content-rating'

describe('chat runtime state', () => {
  test('persists emotional momentum and relationship timeline from user pressure', () => {
    const runtime = updateRuntimeState({
      previousMemory: null,
      previousSceneState: null,
      previousRelationshipState: null,
      character: null,
      userMessage: 'I trust you with this secret',
      reply: 'I will hold that carefully.',
    })

    expect(runtime.memory.turnCount).toBe(1)
    expect(runtime.memory.emotionalMomentum.direction).toBe('warming')
    expect(runtime.memory.relationshipTimeline.at(-1)?.label).toBe('vulnerability')
    expect(runtime.relationshipState.affinity).toBeGreaterThan(0)
    expect(runtime.relationshipState.trust).toBeGreaterThan(0)
  })

  test('starts new chat runtime from selected relationship seed', () => {
    const runtime = updateRuntimeState({
      previousMemory: null,
      previousSceneState: null,
      previousRelationshipState: null,
      character: null,
      userMessage: 'I did not expect to see you here.',
      reply: 'I was not exactly hoping to see you either.',
      relationshipSeed: 'rival',
    })

    expect(runtime.relationshipState.status).toBe('RIVAL')
    expect(runtime.relationshipState.flags).toContain('competitive')
    expect(runtime.relationshipState.respect).toBeGreaterThan(0)
  })

  test('applies scene outcome delta when an active scene resolves', () => {
    const runtime = updateRuntimeState({
      previousMemory: { turnCount: 1 },
      previousSceneState: {
        mode: 'scene',
        activeScene: {
          code: 'soft_confession_available',
          title: 'Soft confession',
          objective: 'Open up carefully.',
          startedAtTurn: 1,
          exitAfterTurns: 4,
        },
        pendingEvents: [],
        sceneOutcomes: [],
        eventCooldowns: {},
        consumedEvents: [],
        declinedEvents: [],
      },
      previousRelationshipState: {
        affinity: 60,
        trust: 60,
        intimacy: 30,
        dominance: 0,
        fear: 0,
        respect: 20,
        status: 'close',
        tier: 'warm',
        tone: 'gentle',
        arcStage: 'opening',
        events: [],
        constraints: [],
        multipliers: {},
        timeline: [],
      },
      character: null,
      userMessage: '/scene accept soft_confession_available',
      reply: 'I am glad you stayed with me in that moment.',
    })

    expect(runtime.sceneState.mode).toBe('sandbox')
    expect(runtime.sceneState.sceneOutcomes.at(-1)?.outcome).toBe('accepted')
    expect(runtime.relationshipState.affinity).toBeGreaterThan(60)
    expect(runtime.relationshipState.trust).toBeGreaterThan(60)
    expect(runtime.memory.relationshipTimeline.at(-1)?.type).toBe('scene')
  })
})

describe('chat content rating guard', () => {
  test('blocks chat when character rating exceeds selected max rating', () => {
    const rating = contentRatingFromTags(['nc'])

    expect(rating).toBe('restricted_18')
    expect(ratingAllowed(rating, 'teen_romance')).toBe(false)
  })
})

describe('chat id validation guard', () => {
  test('rejects injection-shaped ids before model or database work', async () => {
    const result = await sendChat({
      message: 'hello',
      characterId: "' OR 1=1 --",
      chatId: "' OR 1=1 --",
      userId: 'not-a-user-id',
    })

    expect(result.reply).toBe('Invalid user id.')
    expect(result.chatId).toBeNull()
  })
})
