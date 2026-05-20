import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  applyPromptBudget,
  buildRoleplayContinuationInstruction,
  chatReplyMessages,
  classifyChatProviderError,
  isTransientChatProviderError,
  sendChat,
  shouldExtendShortRoleplayReply,
  streamChat,
  updateRuntimeState,
} from './chat.service'
import { contentRatingFromTags, ratingAllowed } from './content-rating'
import { buildWorldStatePrompt, coerceWorldState, mergeWorldState } from './world-state.service'

async function readStreamEvents(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let raw = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    raw += decoder.decode(value, { stream: true })
  }
  raw += decoder.decode()

  return raw
    .split('\n\n')
    .filter(Boolean)
    .map((event) => JSON.parse(event.replace(/^data:\s*/, '')))
}

describe('chat runtime state', () => {
  test('keeps route-level chat fallback reply Thai-first', () => {
    const routeSource = readFileSync(new URL('./chat.routes.ts', import.meta.url), 'utf8')

    expect(routeSource).toContain('บริการ AI ขัดข้องชั่วคราว')
    expect(routeSource).not.toContain('The AI service is temporarily unavailable')
  })

  test('drops oldest history messages to stay within prompt budget', () => {
    const history = Array.from({ length: 6 }, (_, index) => ({
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `history-${index} ${'x'.repeat(500)}`,
    }))

    const result = applyPromptBudget({
      systemPrompt: 'System prompt stays because it carries platform and character policy.',
      history,
      userMessage: 'current user turn',
      maxTokens: 420,
    })

    expect(result.promptBudget.historyMessagesDropped).toBeGreaterThan(0)
    expect(result.promptBudget.historyMessagesIncluded).toBeLessThan(history.length)
    expect(result.promptBudget.estimatedTokens).toBeLessThanOrEqual(420)
    expect(result.messages[0]).toMatchObject({ role: 'system' })
    expect(result.messages.at(-1)).toMatchObject({ role: 'user', content: 'current user turn' })
    expect(result.messages.some((message) => message.content.includes('history-0'))).toBe(false)
  })

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
    expect(runtime.memory.worldState).toMatchObject({
      location: '',
      sceneNotes: [],
    })
    expect(runtime.memory.relationshipTimeline.at(-1)?.label).toBe('vulnerability')
    expect(runtime.memory.relationshipTimeline.at(-1)?.summary).toContain('ผู้ใช้เปิดเผยความเปราะบาง')
    expect(runtime.memory.relationshipTimeline.at(-1)?.summary).not.toContain('User shared vulnerability')
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
    expect(runtime.memory.relationshipTimeline.at(-1)?.summary).toContain('จบด้วย outcome=accepted')
  })

  test('preserves explicit world state in runtime prompt context', () => {
    const worldState = mergeWorldState(null, {
      timeOfDay: 'after midnight',
      location: 'rainy rooftop',
      weather: 'light rain',
      mood: 'quiet tension',
      sceneNotes: ['The player has not entered the confession scene yet.'],
    })
    const runtime = updateRuntimeState({
      previousMemory: { worldState, turnCount: 4 },
      previousSceneState: null,
      previousRelationshipState: null,
      character: null,
      userMessage: 'Stay with the same place.',
      reply: 'I stay close to the railing.',
    })
    const prompt = buildWorldStatePrompt(runtime.memory.worldState)

    expect(coerceWorldState(runtime.memory.worldState).location).toBe('rainy rooftop')
    expect(prompt).toContain('World state')
    expect(prompt).toContain('rainy rooftop')
    expect(prompt).toContain('confession scene')
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

    expect(result.reply).toBe(chatReplyMessages.invalidUserId)
    expect(result.chatId).toBeNull()
  })

  test('streams validation errors without provider usage or raw failure metadata', async () => {
    const events = await readStreamEvents(
      streamChat({
        message: 'hello',
        characterId: "' OR 1=1 --",
        chatId: "' OR 1=1 --",
        userId: 'not-a-user-id',
      }),
    )
    const delta = events.find((event) => event.type === 'delta')
    const done = events.find((event) => event.type === 'done')

    expect(delta?.content).toBe(chatReplyMessages.invalidUserId)
    expect(done?.chatId).toBeNull()
    expect(done?.usage.totalTokens).toBe(0)
    expect(done?.usage.cost).toBe(0)
    expect(done?.usage.providerFailure).toBeUndefined()
  })
})

describe('roleplay reply quality guard', () => {
  test('extends only short roleplay replies when the user did not ask for brevity', () => {
    expect(
      shouldExtendShortRoleplayReply({
        character: { id: 'character' },
        userMessage: 'เล่าต่อจากตรงนี้',
        reply: 'เธอเงียบไปครู่หนึ่ง',
        minChars: 120,
      }),
    ).toBe(true)

    expect(
      shouldExtendShortRoleplayReply({
        character: { id: 'character' },
        userMessage: 'ตอบสั้นๆ',
        reply: 'ได้',
        minChars: 120,
      }),
    ).toBe(false)

    expect(
      shouldExtendShortRoleplayReply({
        character: null,
        userMessage: 'เล่าต่อ',
        reply: 'ได้',
        minChars: 120,
      }),
    ).toBe(false)
  })

  test('does not extend Thai-first operational replies', () => {
    for (const reply of [
      chatReplyMessages.invalidCharacterId,
      chatReplyMessages.characterNotFound,
      chatReplyMessages.characterUnavailable,
      chatReplyMessages.insufficientTokens,
      chatReplyMessages.emptyProviderReply,
      chatReplyMessages.ratingTooHigh('restricted_18'),
    ]) {
      expect(
        shouldExtendShortRoleplayReply({
          character: { id: 'character' },
          userMessage: 'เล่าต่อแบบละเอียด',
          reply,
          minChars: 1000,
        }),
      ).toBe(false)
    }
  })

  test('builds continuation instruction that avoids repeating the previous answer', () => {
    const instruction = buildRoleplayContinuationInstruction('เธอหลบตา', 420)

    expect(instruction).toContain('ห้ามเขียนซ้ำ')
    expect(instruction).toContain('3-5 ย่อหน้าสั้น')
    expect(instruction).toContain('ภาษาไทย')
  })
})

describe('chat provider retry guard', () => {
  test('retries transient provider failures but not credential failures', () => {
    expect(isTransientChatProviderError({ status: 429, message: 'rate limited' })).toBe(true)
    expect(isTransientChatProviderError({ status: 504, message: 'gateway timeout' })).toBe(true)
    expect(isTransientChatProviderError(new Error('The operation was aborted'))).toBe(true)
    expect(isTransientChatProviderError({ status: 401, message: 'invalid api key' })).toBe(false)
    expect(isTransientChatProviderError({ status: 400, message: 'billing hard limit reached' })).toBe(false)
  })

  test('classifies provider failures into safe user-facing states', () => {
    const credentialFailure = classifyChatProviderError({ status: 401, message: 'invalid api key sk-secret' })
    expect(credentialFailure.code).toBe('invalid_credentials')
    expect(credentialFailure.retryable).toBe(false)
    expect(credentialFailure.userMessage).not.toContain('sk-secret')

    const rateLimitFailure = classifyChatProviderError({ status: 429, message: 'too many requests' })
    expect(rateLimitFailure.code).toBe('rate_limited')
    expect(rateLimitFailure.retryable).toBe(true)

    const timeoutFailure = classifyChatProviderError(new Error('The operation was aborted after timeout'))
    expect(timeoutFailure.code).toBe('timeout')
    expect(timeoutFailure.retryable).toBe(true)

    const quotaFailure = classifyChatProviderError({ status: 402, message: 'insufficient_quota' })
    expect(quotaFailure.code).toBe('quota_exhausted')
    expect(quotaFailure.retryable).toBe(false)
  })
})
