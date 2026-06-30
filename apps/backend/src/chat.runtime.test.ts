import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import {
  applyPromptBudget,
  buildLocalRoleplayReply,
  buildRoleplayImprovementInstruction,
  buildRoleplayContinuationInstruction,
  chatReplyMessages,
  classifyChatProviderError,
  ensureBillableChatUsage,
  estimateBillableChatUsage,
  isTransientChatProviderError,
  localChatProviderEnabled,
  preferLocalChatProvider,
  sendChat,
  shouldExtendShortRoleplayReply,
  shouldImproveRoleplayReply,
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
    expect(prompt).toContain('สถานะโลกปัจจุบัน')
    expect(prompt).toContain('สถานที่: rainy rooftop')
    expect(prompt).toContain('ถือว่านี่คือสถานะโลกปัจจุบัน')
    expect(prompt).not.toContain('World state')
    expect(prompt).not.toContain('Location:')
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

  test('source keeps content rating guard before provider execution', () => {
    const source = readFileSync(new URL('./chat.service.ts', import.meta.url), 'utf8')
    const sendChatIndex = source.indexOf('export async function sendChat')
    const ratingGuardIndex = source.indexOf('const ratingError = chatRatingError(character, effectiveMaxRating)', sendChatIndex)
    const providerCallIndex = source.indexOf('const completion = await generateChatCompletion', sendChatIndex)

    expect(source).toContain('function chatRatingError(character: CharacterWithTags | null, maxRating?: ContentRating)')
    expect(source).toContain('const allowed = normalizeMaxRating(maxRating)')
    expect(source).toContain('if (ratingAllowed(rating, allowed)) return null')
    expect(source).toContain('return chatReplyMessages.ratingTooHigh(rating)')
    expect(source).toContain('await effectiveMaxRatingForUser(activeUserId, input.maxRating)')
    expect(sendChatIndex).toBeGreaterThan(-1)
    expect(ratingGuardIndex).toBeGreaterThan(-1)
    expect(providerCallIndex).toBeGreaterThan(-1)
    expect(ratingGuardIndex).toBeLessThan(providerCallIndex)
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
  test('estimates billable usage when a provider reply has no usage metadata', () => {
    const messages = [
      { role: 'system', content: 'Stay in character and answer in Thai.' },
      { role: 'user', content: 'เล่าต่อจากฉากเดิมแบบละเอียด' },
    ]
    const reply = 'เธอหยุดมองออกไปนอกหน้าต่าง ก่อนจะค่อย ๆ ตอบด้วยน้ำเสียงที่เบาลงกว่าเดิม'
    const usage = estimateBillableChatUsage(messages, reply)

    expect(usage.promptTokens).toBeGreaterThan(0)
    expect(usage.completionTokens).toBeGreaterThan(0)
    expect(usage.totalTokens).toBe(usage.promptTokens + usage.completionTokens)
    expect(usage.cost).toBeGreaterThanOrEqual(0)
  })

  test('keeps provider usage when present and fills it only when missing', () => {
    const providerUsage = { promptTokens: 11, completionTokens: 7, totalTokens: 18, cost: 0.00001 }
    const messages = [{ role: 'user', content: 'hello' }]

    expect(ensureBillableChatUsage(providerUsage, messages, 'reply')).toBe(providerUsage)

    const estimated = ensureBillableChatUsage(
      { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      messages,
      'reply',
    )

    expect(estimated.totalTokens).toBeGreaterThan(0)
  })

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

  test('improves narratively weak roleplay replies even when they are not short', () => {
    const flatReply = Array.from({ length: 16 }, () => 'Okay. I understand. Tell me more.').join(' ')

    expect(
      shouldImproveRoleplayReply({
        character: { id: 'character' },
        userMessage: 'I miss you but I am not ready to explain why.',
        reply: flatReply,
        minChars: 120,
        responseDepth: 'deep',
      }),
    ).toBe(true)
  })

  test('does not improve rich roleplay replies that already meet the narrative guard', () => {
    const richReply = [
      '*She remembers the last conversation and lowers her voice beside the window.*',
      'The rain keeps tapping against the glass while she lets the silence stay for a moment, not rushing your answer and not deciding what you feel.',
      'Her hand stops near the cup between you, close enough to show hesitation but far enough to leave the choice with you.',
      '"I missed you too," she says, carrying the old argument in her voice instead of pretending it disappeared. "Do you want to start from what hurt, or from what we can still save?"',
    ].join(' ')

    expect(
      shouldImproveRoleplayReply({
        character: { id: 'character' },
        userMessage: 'I miss you but I am not ready to explain why.',
        reply: richReply,
        minChars: 120,
        responseDepth: 'deep',
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
  test('builds improvement instruction for weak non-short replies', () => {
    const instruction = buildRoleplayImprovementInstruction({
      userMessage: 'I miss you but I am not ready to explain why.',
      reply: 'Okay. I understand. Tell me more.',
      responseDepth: 'deep',
    })

    expect(instruction).toContain('Improve the previous Maprang roleplay answer')
    expect(instruction).toContain('Narrative quality score:')
    expect(instruction).toContain('Do not narrate the player feelings')
  })
})

describe('chat provider retry guard', () => {
  test('keeps local chat provider enabled only for safe local play', () => {
    expect(localChatProviderEnabled({ NODE_ENV: 'development', LOCAL_CHAT_PROVIDER: '1' })).toBe(true)
    expect(preferLocalChatProvider({ NODE_ENV: 'development', LOCAL_CHAT_PROVIDER: '1' })).toBe(true)
    expect(preferLocalChatProvider({ NODE_ENV: 'development', LOCAL_CHAT_PROVIDER: '1', CHAT_PROVIDER: 'local', OPENROUTER_API_KEY: 'set' })).toBe(true)
    expect(localChatProviderEnabled({ NODE_ENV: 'development', LOCAL_CHAT_PROVIDER: '0' })).toBe(false)
    expect(localChatProviderEnabled({ NODE_ENV: 'production', LOCAL_CHAT_PROVIDER: '1' })).toBe(false)
    expect(localChatProviderEnabled({ NODE_ENV: 'development', CHAT_PROVIDER: 'remote' })).toBe(false)
  })

  test('local chat runtime bypasses token gate before provider execution', () => {
    const source = readFileSync(new URL('./chat.service.ts', import.meta.url), 'utf8')

    expect(source).toContain('const usesLocalRuntime = preferLocalChatProvider()')
    expect(source.match(/!hasUserApiKey && !usesLocalRuntime && tokenBalance !== null && tokenBalance < minTokenBalanceForChat/g)?.length).toBeGreaterThanOrEqual(2)
  })

  test('builds a playable local roleplay reply instead of provider setup copy', () => {
    const reply = buildLocalRoleplayReply({
      character: {
        name: 'มิกะ | MIKA',
        tagline: 'คนสนิทที่ยังไม่กล้าพูดตรง ๆ',
        description: 'นักศึกษาที่คุยเหมือนไม่สนใจ แต่จำรายละเอียดของผู้เล่นได้ดี',
        scenario: 'ทั้งสองยืนอยู่หน้าร้านสะดวกซื้อหลังฝนหยุดใหม่ ๆ',
        greeting: 'มาช้ากว่าที่คิดนะ',
        compactPrompt: 'มิกะพูดน้อย แต่สังเกตเก่งและไม่ยอมเปิดใจเร็ว',
        characterAnchor: 'เธอไม่ชอบคำสัญญาลอย ๆ แต่ให้ค่ากับการกระทำที่สม่ำเสมอ',
        tags: [{ tag: { name: 'friend-crush' } }],
      } as any,
      userMessage: 'ฉันไม่ได้ตั้งใจให้เธอต้องรอนาน',
      relationshipSeed: 'friend-crush',
    })

    expect(reply.length).toBeGreaterThan(420)
    expect(reply).toContain('มิกะ | MIKA')
    expect(reply).toContain('ฉันไม่ได้ตั้งใจให้เธอต้องรอนาน')
    expect(reply).toContain('ทั้งสองยืนอยู่หน้าร้านสะดวกซื้อ')
    expect(reply).not.toContain('OPENROUTER_API_KEY')
    expect(reply).not.toContain('บริการ AI ยังไม่พร้อม')
  })

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

  test('redacts secret-shaped provider details before classification output', () => {
    const fakeOpenRouterKey = ['sk', 'or-v1', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')
    const fakeProjectKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz123456'].join('-')
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const cases = [
      {
        input: { status: 401, message: `invalid api key ${fakeOpenRouterKey}` },
        code: 'invalid_credentials',
        retryable: false,
      },
      {
        input: { status: 402, message: `quota exhausted DATABASE_URL=${fakeDatabaseUrl}` },
        code: 'quota_exhausted',
        retryable: false,
      },
      {
        input: { status: 429, message: `rate limit ${fakeProjectKey}` },
        code: 'rate_limited',
        retryable: true,
      },
      {
        input: new Error(`fetch failed ${fakeDatabaseUrl}`),
        code: 'provider_unavailable',
        retryable: true,
      },
      {
        input: `unexpected provider failure ${fakeOpenRouterKey} ${fakeDatabaseUrl}`,
        code: 'unknown',
        retryable: false,
      },
    ] as const

    for (const item of cases) {
      const failure = classifyChatProviderError(item.input)

      expect(failure.code).toBe(item.code)
      expect(failure.retryable).toBe(item.retryable)
      expect(failure.userMessage).not.toContain(fakeOpenRouterKey)
      expect(failure.userMessage).not.toContain(fakeProjectKey)
      expect(failure.userMessage).not.toContain(fakeDatabaseUrl)
      expect(failure.userMessage).not.toContain('super-secret')
    }
  })

  test('classifies object-shaped provider failures without stringifying raw objects', () => {
    const failure = classifyChatProviderError({
      toString() {
        throw new Error('ไม่ควร stringify raw object')
      },
    })

    expect(failure.code).toBe('unknown')
    expect(failure.userMessage).not.toContain('[object Object]')
  })

  test('does not log raw stream provider errors after classification', () => {
    const source = readFileSync(new URL('./chat.service.ts', import.meta.url), 'utf8')

    expect(source).toContain("console.error('สตรีมแชทไม่สำเร็จ:', providerFailure)")
    expect(source).not.toMatch(/console\.error\s*\([\s\S]*?providerFailure[\s\S]*?,\s*error\b[\s\S]*?\)/)
  })
})
