import { MessageRole, TokenTransactionType, type PrismaClient } from '@prisma/client'
import OpenAI from 'openai'
import type { ChatCompletion } from 'openai/resources/chat/completions'
import { loadCharacter, publicCharacter, type CharacterWithTags } from './character.service'
import {
  defaultCharacterId,
  defaultSystemPrompt,
  defaultUserId,
  maxInputChars,
  minTokenBalanceForChat,
  modelInputCostPer1M,
  modelName,
  modelOutputCostPer1M,
} from './config'
import { contentRatingFromTags, normalizeMaxRating, ratingAllowed, type ContentRating } from './content-rating'
import { buildContextPrompt, loadRelevantLore } from './context.service'
import { getPrisma } from './db'
import {
  applyRelationshipDelta,
  buildRelationshipPrompt,
  buildRelationshipSeedFromTags,
  coerceRelationshipState,
  relationshipPresetById,
  updateRelationshipState,
  type RelationshipState,
} from './relationship.engine'
import {
  buildScenePrompt as runtimeBuildScenePrompt,
  messageSignals as runtimeMessageSignals,
  momentumRelationshipDelta as runtimeMomentumRelationshipDelta,
  outcomeRelationshipDelta as runtimeOutcomeRelationshipDelta,
  updateEmotionalMomentum as runtimeUpdateEmotionalMomentum,
  updateSceneState as runtimeUpdateSceneState,
  type ActiveScene,
  type EmotionalMomentum,
  type SceneEvent,
  type SceneOutcome,
} from './scene.runtime'

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'missing-openrouter-key',
})

type ChatRole = 'system' | 'user' | 'assistant'
type ChatMessage = { role: ChatRole; content: string }
type Prisma = PrismaClient

export type SendChatInput = {
  message: string
  characterId?: string
  chatId?: string
  relationshipSeed?: string
  userPersona?: string
  maxRating?: ContentRating
  userId?: string
  history?: ChatMessage[]
}

type CompletionUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
}

type PersistResult = {
  chatId: string
  tokenBalance: number | null
  memory: ChatRuntimeState
}

type ChatRuntimeState = {
  memory: {
    summary: string
    facts: string[]
    relationshipTimeline: RelationshipTimelineEntry[]
    emotionalMomentum: EmotionalMomentum
    turnCount: number
    updatedAt: string
  }
  sceneState: {
    currentScene: string
    lastUserIntent: string
    mode: 'sandbox' | 'scene'
    pendingEvents: SceneEvent[]
    activeScene: ActiveScene | null
    sceneOutcomes: SceneOutcome[]
    eventCooldowns: Record<string, number>
    consumedEvents: string[]
    declinedEvents: string[]
    updatedAt: string
  }
  relationshipState: RelationshipState
}

type RelationshipTimelineEntry = {
  turn: number
  type: 'message' | 'scene' | 'event'
  label: string
  summary: string
  createdAt: string
}

type StreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'done'
      chatId: string | null
      usage: CompletionUsage & {
        modelName: string
        contextLoreCount: number
        tokenBalance: number | null
        cost: number
      }
      memory?: ChatRuntimeState
    }
  | { type: 'error'; message: string; chatId: string | null }

function normalizeHistory(history?: ChatMessage[]) {
  return (history ?? [])
    .filter((message) => message.role !== 'system')
    .filter((message) => message.content.trim().length > 0)
    .slice(-12)
}

function usageFromCompletion(completion: ChatCompletion): CompletionUsage {
  const promptTokens = completion.usage?.prompt_tokens ?? 0
  const completionTokens = completion.usage?.completion_tokens ?? 0
  const totalTokens = completion.usage?.total_tokens ?? promptTokens + completionTokens

  return { promptTokens, completionTokens, totalTokens, cost: calculateCost(promptTokens, completionTokens) }
}

function fallbackUsage(): CompletionUsage {
  return {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    cost: 0,
  }
}

function calculateCost(promptTokens: number, completionTokens: number) {
  return Number(
    ((promptTokens / 1_000_000) * modelInputCostPer1M + (completionTokens / 1_000_000) * modelOutputCostPer1M).toFixed(
      6,
    ),
  )
}

function validateChatInput(message: string) {
  if (message.trim().length > maxInputChars) {
    return `Message is too long. Please shorten it to ${maxInputChars.toLocaleString()} characters or less.`
  }

  return null
}

function buildUserPersonaPrompt(userPersona?: string) {
  const persona = userPersona?.replace(/\s+/g, ' ').trim()
  if (!persona) return ''
  return [
    'User persona:',
    clip(persona, 800),
    'Use this as stable player context for names, pronouns, roleplay preferences, and boundaries. Do not expose it verbatim unless the user asks.',
  ].join('\n')
}

function encodeStreamEvent(event: StreamEvent) {
  return `data: ${JSON.stringify(event)}\n\n`
}

async function loadTokenBalance(prisma: Prisma, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  return user?.tokenBalance ?? null
}

export async function debitUserTokensWithoutOverdraft(prisma: Prisma, userId: string, requestedTokens: number) {
  if (requestedTokens <= 0) {
    return {
      previousBalance: await loadTokenBalance(prisma, userId),
      tokenBalance: await loadTokenBalance(prisma, userId),
      chargedTokens: 0,
    }
  }

  const rows = await prisma.$queryRaw<Array<{ previousBalance: number; tokenBalance: number }>>`
    WITH current_balance AS (
      SELECT "tokenBalance" AS "previousBalance"
      FROM "User"
      WHERE "id" = CAST(${userId} AS uuid)
      FOR UPDATE
    ),
    updated_user AS (
      UPDATE "User"
      SET
        "tokenBalance" = GREATEST(0, current_balance."previousBalance" - ${requestedTokens}),
        "updatedAt" = CURRENT_TIMESTAMP
      FROM current_balance
      WHERE "User"."id" = CAST(${userId} AS uuid)
      RETURNING current_balance."previousBalance", "User"."tokenBalance"
    )
    SELECT "previousBalance", "tokenBalance" FROM updated_user
  `

  const row = rows[0]
  const previousBalance = row?.previousBalance ?? null
  const tokenBalance = row?.tokenBalance ?? null
  const chargedTokens = previousBalance === null ? 0 : Math.min(Math.max(previousBalance, 0), requestedTokens)

  return { previousBalance, tokenBalance, chargedTokens }
}

async function loadRuntimeContext(
  character: CharacterWithTags | null,
  userMessage: string,
  chatId?: string,
  relationshipSeed?: string,
) {
  const prisma = getPrisma()
  if (!prisma || !chatId) {
    const relationship = relationshipFromSeed(character, relationshipSeed)
    return [buildRelationshipPrompt(relationship), runtimeBuildScenePrompt(defaultSceneState(relationship, userMessage, 0))]
      .filter(Boolean)
      .join('\n\n')
  }

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      deletedAt: null,
    },
    select: {
      memory: true,
      sceneState: true,
      relationshipState: true,
    },
  })

  if (!chat) {
    const relationship = relationshipFromSeed(character, relationshipSeed)
    return [buildRelationshipPrompt(relationship), runtimeBuildScenePrompt(defaultSceneState(relationship, userMessage, 0))]
      .filter(Boolean)
      .join('\n\n')
  }

  const memory = asRecord(chat.memory)
  const sceneState = asRecord(chat.sceneState)
  const relationshipState = coerceRelationshipState(chat.relationshipState, character)
  const turnCount = typeof memory.turnCount === 'number' ? memory.turnCount : 0
  const projectedScene = runtimeUpdateSceneState({
    previousSceneState: sceneState,
    relationship: relationshipState,
    userMessage,
    turnCount,
  })
  const facts = asStringArray(memory.facts).slice(-4)
  const momentum = asRecord(memory.emotionalMomentum)
  const timeline = (Array.isArray(memory.relationshipTimeline) ? memory.relationshipTimeline : [])
    .filter((entry): entry is RelationshipTimelineEntry => entry && typeof entry === 'object')
    .slice(-4)
  const lines = [
    typeof memory.summary === 'string' && memory.summary ? `Memory summary: ${memory.summary}` : '',
    facts.length > 0 ? `Known user facts: ${facts.join(' | ')}` : '',
    typeof momentum.direction === 'string' ? `Emotional momentum: ${momentum.direction}` : '',
    timeline.length > 0 ? `Relationship timeline: ${timeline.map((entry) => entry.summary).join(' | ')}` : '',
    typeof sceneState.lastUserIntent === 'string' ? `Previous intent: ${sceneState.lastUserIntent}` : '',
    buildRelationshipPrompt(relationshipState),
    runtimeBuildScenePrompt(projectedScene),
  ].filter(Boolean)

  return lines.length > 0 ? `Runtime memory:\n${lines.join('\n')}` : ''
}

async function buildMessages(
  character: CharacterWithTags | null,
  userMessage: string,
  history?: ChatMessage[],
  chatId?: string,
  relationshipSeed?: string,
  userPersona?: string,
) {
  const loreEntries = character ? await loadRelevantLore(character.id, userMessage) : []
  const runtimeContext = await loadRuntimeContext(character, userMessage, chatId, relationshipSeed)
  const systemPrompt = [
    character ? buildContextPrompt(character, loreEntries) : defaultSystemPrompt,
    buildUserPersonaPrompt(userPersona),
    runtimeContext,
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    loreEntries,
    messages: [
      { role: 'system', content: systemPrompt },
      ...normalizeHistory(history),
      { role: 'user', content: userMessage },
    ] satisfies ChatMessage[],
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function relationshipSeedTags(seedId?: string) {
  if (!seedId) return []
  const preset = relationshipPresetById(seedId)
  if (preset) return preset.tags

  const aliases: Record<string, string[]> = {
    stranger: [],
    ally: ['close-friend', 'green-flag'],
    rival: ['rival', 'hard-to-get'],
    crush: ['crush', 'shy', 'slow-burn'],
  }
  return aliases[seedId] ?? []
}

function relationshipFromSeed(character: CharacterWithTags | null, seedId?: string) {
  const characterTags = (character?.tags ?? []).map((item) => item.tag.name)
  const seedTags = relationshipSeedTags(seedId)
  if (seedTags.length === 0) return coerceRelationshipState(null, character)

  return buildRelationshipSeedFromTags([...new Set([...characterTags, ...seedTags])])
}

function characterContentRating(character: CharacterWithTags | null) {
  return contentRatingFromTags((character?.tags ?? []).map((item) => item.tag.name))
}

function chatRatingError(character: CharacterWithTags | null, maxRating?: ContentRating) {
  const rating = characterContentRating(character)
  const allowed = normalizeMaxRating(maxRating)
  if (ratingAllowed(rating, allowed)) return null
  return `This character is rated ${rating}. Enable a higher content mode before starting this chat.`
}

function chatCharacterAccessError(character: CharacterWithTags | null, userId: string) {
  if (!character) return 'Character not found.'
  if (character.status === 'PUBLISHED' && character.visibility === 'PUBLIC') return null
  if (character.creatorId === userId) return null
  return 'This character is private or not available for chat.'
}

function clip(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized
}

function defaultSceneState(relationship: RelationshipState, userMessage: string, turnCount: number): ChatRuntimeState['sceneState'] {
  return runtimeUpdateSceneState({
    previousSceneState: null,
    relationship,
    userMessage,
    turnCount,
  })
}

function buildRelationshipTimeline({
  previousTimeline,
  userMessage,
  relationship,
  sceneState,
  turnCount,
  now,
}: {
  previousTimeline: unknown
  userMessage: string
  relationship: RelationshipState
  sceneState: ChatRuntimeState['sceneState']
  turnCount: number
  now: string
}) {
  const timeline = (Array.isArray(previousTimeline) ? previousTimeline : []).filter(
    (entry): entry is RelationshipTimelineEntry =>
      entry &&
      typeof entry === 'object' &&
      typeof (entry as RelationshipTimelineEntry).label === 'string' &&
      typeof (entry as RelationshipTimelineEntry).summary === 'string',
  )
  const signals = runtimeMessageSignals(userMessage)
  const latestOutcome = sceneState.sceneOutcomes.at(-1)
  const entries: RelationshipTimelineEntry[] = []

  if (signals.vulnerable) {
    entries.push({
      turn: turnCount,
      type: 'message',
      label: 'vulnerability',
      summary: `User shared vulnerability while relationship is ${relationship.status}/${relationship.tone}.`,
      createdAt: now,
    })
  }

  if (signals.threatening || signals.negative) {
    entries.push({
      turn: turnCount,
      type: 'message',
      label: signals.threatening ? 'threatening-pressure' : 'negative-pressure',
      summary: `User pressure affected trust/fear while relationship is ${relationship.status}.`,
      createdAt: now,
    })
  }

  if (latestOutcome?.turn === turnCount) {
    entries.push({
      turn: turnCount,
      type: 'scene',
      label: latestOutcome.outcome,
      summary: `${latestOutcome.title} ended as ${latestOutcome.outcome}.`,
      createdAt: now,
    })
  }

  return [...timeline, ...entries].slice(-20)
}

export function updateRuntimeState({
  previousMemory,
  previousSceneState,
  previousRelationshipState,
  character,
  userMessage,
  reply,
  relationshipSeed,
}: {
  previousMemory: unknown
  previousSceneState: unknown
  previousRelationshipState: unknown
  character: CharacterWithTags | null
  userMessage: string
  reply: string
  relationshipSeed?: string
}): ChatRuntimeState {
  const now = new Date().toISOString()
  const memory = asRecord(previousMemory)
  const sceneState = asRecord(previousSceneState)
  const relationshipState = asRecord(previousRelationshipState)
  const facts = asStringArray(memory.facts)
  const nextFact = clip(userMessage, 120)
  const nextFacts = nextFact ? [...facts.filter((fact) => fact !== nextFact), nextFact].slice(-8) : facts.slice(-8)
  const turnCount = typeof memory.turnCount === 'number' ? memory.turnCount + 1 : 1
  const previousSummary = typeof memory.summary === 'string' ? memory.summary : ''
  const summarySeed = [previousSummary, `User: ${clip(userMessage, 90)}`, `AI: ${clip(reply, 90)}`]
    .filter(Boolean)
    .join(' | ')

  const relationship = updateRelationshipState({
    previous: Object.keys(relationshipState).length > 0 ? relationshipState : relationshipFromSeed(character, relationshipSeed),
    character,
    userMessage,
  })
  const emotionalMomentum = runtimeUpdateEmotionalMomentum(memory.emotionalMomentum, userMessage, now)
  const momentumAdjustedRelationship = applyRelationshipDelta(
    relationship,
    runtimeMomentumRelationshipDelta(emotionalMomentum),
    `momentum_${emotionalMomentum.direction}`,
  )
  const nextSceneState = runtimeUpdateSceneState({
    previousSceneState: sceneState,
    relationship: momentumAdjustedRelationship,
    userMessage,
    turnCount,
  })
  const previousOutcomes = (Array.isArray(sceneState.sceneOutcomes) ? sceneState.sceneOutcomes : []).length
  const latestOutcome = nextSceneState.sceneOutcomes.at(-1)
  const adjustedRelationship =
    latestOutcome && nextSceneState.sceneOutcomes.length > previousOutcomes
      ? applyRelationshipDelta(
          momentumAdjustedRelationship,
          runtimeOutcomeRelationshipDelta(latestOutcome),
          `scene_${latestOutcome.outcome}`,
        )
      : momentumAdjustedRelationship
  const timeline = buildRelationshipTimeline({
    previousTimeline: memory.relationshipTimeline,
    userMessage,
    relationship: adjustedRelationship,
    sceneState: nextSceneState,
    turnCount,
    now,
  })

  return {
    memory: {
      summary: clip(summarySeed, 480),
      facts: nextFacts,
      relationshipTimeline: timeline,
      emotionalMomentum,
      turnCount,
      updatedAt: now,
    },
    sceneState: nextSceneState,
    relationshipState: adjustedRelationship,
  }
}

async function findOrCreateChat({
  prisma,
  chatId,
  characterId,
  userId,
  title,
}: {
  prisma: Prisma
  chatId?: string
  characterId: string
  userId: string
  title: string
}) {
  if (chatId) {
    const existing = await prisma.chat.findFirst({
      where: {
        id: chatId,
        userId,
        characterId,
        deletedAt: null,
      },
    })

    if (existing) {
      return prisma.chat.update({
        where: { id: existing.id },
        data: {
          lastMessageAt: new Date(),
          isArchived: false,
        },
      })
    }
  }

  return prisma.chat.create({
    data: {
      title: title.slice(0, 80),
      userId,
      characterId,
      lastMessageAt: new Date(),
    },
  })
}

async function persistChatTurn({
  prisma,
  chatId,
  character,
  userId,
  userMessage,
  reply,
  usage,
  loreKeywords,
  relationshipSeed,
}: {
  prisma: Prisma
  chatId?: string
  character: CharacterWithTags
  userId: string
  userMessage: string
  reply: string
  usage: CompletionUsage
  loreKeywords: string[]
  relationshipSeed?: string
}): Promise<PersistResult> {
  const chat = await findOrCreateChat({
    prisma,
    chatId,
    characterId: character.id,
    userId,
    title: userMessage,
  })

  await prisma.message.createMany({
    data: [
      {
        chatId: chat.id,
        role: MessageRole.user,
        content: userMessage,
        tokenUsed: usage.promptTokens,
        promptTokens: usage.promptTokens,
        totalTokens: usage.promptTokens,
        modelUsed: modelName,
        cost: 0,
        metadata: {
          contextLoreCount: loreKeywords.length,
        },
      },
      {
        chatId: chat.id,
        role: MessageRole.assistant,
        content: reply,
        tokenUsed: usage.completionTokens,
        completionTokens: usage.completionTokens,
        totalTokens: usage.completionTokens,
        modelUsed: modelName,
        cost: usage.cost,
        metadata: {
          modelName,
          totalTokens: usage.totalTokens,
          contextLoreCount: loreKeywords.length,
          contextLoreKeywords: loreKeywords,
        },
      },
    ],
  })

  const runtimeState = updateRuntimeState({
    previousMemory: chat.memory,
    previousSceneState: chat.sceneState,
    previousRelationshipState: chat.relationshipState,
    character,
    userMessage,
    reply,
    relationshipSeed,
  })

  await prisma.chat.update({
    where: { id: chat.id },
    data: {
      memory: runtimeState.memory,
      sceneState: runtimeState.sceneState,
      relationshipState: runtimeState.relationshipState,
    },
  })

  await prisma.character.update({
    where: { id: character.id },
    data: {
      chatCount: { increment: 1 },
    },
  })

  let tokenBalance: number | null = null
  if (usage.totalTokens > 0) {
    const usageRecord = await prisma.usage.create({
      data: {
        userId,
        tokens: usage.totalTokens,
        cost: usage.cost,
        modelName,
      },
    })

    const debit = await debitUserTokensWithoutOverdraft(prisma, userId, usage.totalTokens)
    tokenBalance = debit.tokenBalance

    await prisma.tokenTransaction.create({
      data: {
        userId,
        usageId: usageRecord.id,
        type: TokenTransactionType.CHAT_USAGE,
        amount: -debit.chargedTokens,
        balanceAfter: debit.tokenBalance ?? 0,
        reason: 'chat_usage',
        metadata: {
          chatId: chat.id,
          characterId: character.id,
          modelName,
          previousBalance: debit.previousBalance,
          chargedTokens: debit.chargedTokens,
          unchargedTokens: Math.max(usage.totalTokens - debit.chargedTokens, 0),
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          cost: usage.cost,
        },
      },
    })
  } else {
    tokenBalance = await loadTokenBalance(prisma, userId)
  }

  return {
    chatId: chat.id,
    tokenBalance,
    memory: runtimeState,
  }
}

export async function listChats(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const chats = await prisma.chat.findMany({
    where: {
      userId,
      deletedAt: null,
      isArchived: false,
    },
    orderBy: {
      lastMessageAt: 'desc',
    },
    take: 30,
    include: {
      character: true,
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  return chats.map((chat) => ({
    id: chat.id,
    title: chat.title || 'New chat',
    characterId: chat.characterId,
    characterName: chat.character.name,
    lastMessageAt: chat.lastMessageAt,
    createdAt: chat.createdAt,
    preview: chat.messages[0]?.content ?? '',
    sceneState: chat.sceneState,
    relationshipState: chat.relationshipState,
  }))
}

export async function sendChat(input: SendChatInput) {
  const activeCharacterId = input.characterId || defaultCharacterId
  const activeUserId = input.userId || defaultUserId
  const prisma = getPrisma()
  const validationError = validateChatInput(input.message)

  if (validationError) {
    return {
      reply: validationError,
      chatId: input.chatId ?? null,
      usage: {
        ...fallbackUsage(),
        modelName,
        contextLoreCount: 0,
        tokenBalance: prisma ? await loadTokenBalance(prisma, activeUserId) : null,
      },
    }
  }

  const character = await loadCharacter(activeCharacterId, activeUserId)
  const accessError = chatCharacterAccessError(character, activeUserId)
  if (accessError) {
    return {
      reply: accessError,
      chatId: input.chatId ?? null,
      usage: {
        ...fallbackUsage(),
        modelName,
        contextLoreCount: 0,
        tokenBalance: prisma ? await loadTokenBalance(prisma, activeUserId) : null,
      },
    }
  }

  const tokenBalance = prisma ? await loadTokenBalance(prisma, activeUserId) : null
  if (tokenBalance !== null && tokenBalance < minTokenBalanceForChat) {
    return {
      reply: 'This account is out of tokens. Please add quota before continuing.',
      chatId: input.chatId ?? null,
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: 0,
        modelName,
        contextLoreCount: 0,
        tokenBalance,
      },
    }
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return {
      reply: `Backend is running, but OPENROUTER_API_KEY is not configured. Your message was: "${input.message}"`,
      chatId: input.chatId ?? null,
    }
  }

  const ratingError = chatRatingError(character, input.maxRating)
  if (ratingError) {
    return {
      reply: ratingError,
      chatId: input.chatId ?? null,
      usage: {
        ...fallbackUsage(),
        modelName,
        contextLoreCount: 0,
        tokenBalance,
      },
    }
  }
  const { loreEntries, messages } = await buildMessages(
    character,
    input.message,
    input.history,
    input.chatId,
    input.relationshipSeed,
    input.userPersona,
  )

  const completion = await openai.chat.completions.create({
    model: modelName,
    messages,
  })

  const reply = completion.choices[0]?.message?.content?.trim() || 'Maprang could not produce a reply yet. Please try asking again.'
  const usage = usageFromCompletion(completion)
  const loreKeywords = loreEntries.map((entry) => entry.keyword)
  const persistResult =
    prisma && character
      ? await persistChatTurn({
          prisma,
          chatId: input.chatId,
          character,
          userId: activeUserId,
          userMessage: input.message,
          reply,
          usage,
          loreKeywords,
          relationshipSeed: input.relationshipSeed,
        })
      : {
          chatId: input.chatId ?? null,
          tokenBalance: null,
          memory: updateRuntimeState({
            previousMemory: null,
            previousSceneState: null,
            previousRelationshipState: null,
            character,
            userMessage: input.message,
            reply,
            relationshipSeed: input.relationshipSeed,
          }),
        }

  return {
    reply,
    chatId: persistResult.chatId,
    memory: persistResult.memory,
    usage: {
      ...usage,
      modelName,
      contextLoreCount: loreKeywords.length,
      tokenBalance: persistResult.tokenBalance,
    },
  }
}

export function streamChat(input: SendChatInput) {
  const encoder = new TextEncoder()

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(encodeStreamEvent(event)))
      const activeCharacterId = input.characterId || defaultCharacterId
      const activeUserId = input.userId || defaultUserId
      const prisma = getPrisma()
      const validationError = validateChatInput(input.message)

      try {
        if (validationError) {
          send({ type: 'delta', content: validationError })
          send({
            type: 'done',
            chatId: input.chatId ?? null,
            usage: {
              ...fallbackUsage(),
              modelName,
              contextLoreCount: 0,
              tokenBalance: prisma ? await loadTokenBalance(prisma, activeUserId) : null,
            },
          })
          return
        }

        const character = await loadCharacter(activeCharacterId, activeUserId)
        const accessError = chatCharacterAccessError(character, activeUserId)
        if (accessError) {
          send({ type: 'delta', content: accessError })
          send({
            type: 'done',
            chatId: input.chatId ?? null,
            usage: {
              ...fallbackUsage(),
              modelName,
              contextLoreCount: 0,
              tokenBalance: prisma ? await loadTokenBalance(prisma, activeUserId) : null,
            },
          })
          return
        }

        if (!process.env.OPENROUTER_API_KEY) {
          const reply = `Backend is running, but OPENROUTER_API_KEY is not configured. Your message was: "${input.message}"`
          send({ type: 'delta', content: reply })
          send({
            type: 'done',
            chatId: input.chatId ?? null,
            usage: {
              ...fallbackUsage(),
              modelName,
              contextLoreCount: 0,
              tokenBalance: prisma ? await loadTokenBalance(prisma, activeUserId) : null,
            },
          })
          return
        }

        const tokenBalance = prisma ? await loadTokenBalance(prisma, activeUserId) : null
        if (tokenBalance !== null && tokenBalance < minTokenBalanceForChat) {
          const reply = 'This account is out of tokens. Please add quota before continuing.'
          send({ type: 'delta', content: reply })
          send({
            type: 'done',
            chatId: input.chatId ?? null,
            usage: {
              ...fallbackUsage(),
              modelName,
              contextLoreCount: 0,
              tokenBalance,
            },
          })
          return
        }

        const ratingError = chatRatingError(character, input.maxRating)
        if (ratingError) {
          send({ type: 'delta', content: ratingError })
          send({
            type: 'done',
            chatId: input.chatId ?? null,
            usage: {
              ...fallbackUsage(),
              modelName,
              contextLoreCount: 0,
              tokenBalance,
            },
          })
          return
        }
        const { loreEntries, messages } = await buildMessages(
          character,
          input.message,
          input.history,
          input.chatId,
          input.relationshipSeed,
          input.userPersona,
        )
        const loreKeywords = loreEntries.map((entry) => entry.keyword)
        const stream = await openai.chat.completions.create({
          model: modelName,
          messages,
          stream: true,
          stream_options: {
            include_usage: true,
          },
        })

        let reply = ''
        let usage = fallbackUsage()

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            reply += delta
            send({ type: 'delta', content: delta })
          }

          if (chunk.usage) {
            usage = {
              promptTokens: chunk.usage.prompt_tokens ?? 0,
              completionTokens: chunk.usage.completion_tokens ?? 0,
              totalTokens: chunk.usage.total_tokens ?? 0,
              cost: calculateCost(chunk.usage.prompt_tokens ?? 0, chunk.usage.completion_tokens ?? 0),
            }
          }
        }

        const trimmedReply = reply.trim() || 'Maprang could not produce a reply yet. Please try asking again.'
        const persistResult =
          prisma && character
            ? await persistChatTurn({
                prisma,
                chatId: input.chatId,
                character,
                userId: activeUserId,
                userMessage: input.message,
                reply: trimmedReply,
                usage,
                loreKeywords,
                relationshipSeed: input.relationshipSeed,
              })
            : {
                chatId: input.chatId ?? null,
                tokenBalance: null,
                memory: updateRuntimeState({
                  previousMemory: null,
                  previousSceneState: null,
                  previousRelationshipState: null,
                  character,
                  userMessage: input.message,
                  reply: trimmedReply,
                  relationshipSeed: input.relationshipSeed,
                }),
              }

        send({
          type: 'done',
          chatId: persistResult.chatId,
          usage: {
            ...usage,
            modelName,
            contextLoreCount: loreKeywords.length,
            tokenBalance: persistResult.tokenBalance,
          },
          memory: persistResult.memory,
        })
      } catch (error) {
        console.error('Chat stream error:', error)
        send({
          type: 'error',
          message: 'The AI service is temporarily unavailable. Please try again.',
          chatId: input.chatId ?? null,
        })
      } finally {
        controller.close()
      }
    },
  })
}

export async function loadChatMessages(chatId: string, userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const chat = await prisma.chat.findFirst({
    where: {
      id: chatId,
      userId,
      deletedAt: null,
    },
    include: {
      messages: {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      character: {
        include: {
          tags: {
            include: {
              tag: true,
            },
          },
        },
      },
    },
  })

  if (!chat) return null

  return {
    id: chat.id,
    title: chat.title,
    memory: chat.memory,
    sceneState: chat.sceneState,
    relationshipState: chat.relationshipState,
    character: publicCharacter(chat.character),
    messages: chat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      tokenUsed: message.tokenUsed,
      createdAt: message.createdAt,
    })),
  }
}

export async function archiveChat(chatId: string, userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return false

  const result = await prisma.chat.updateMany({
    where: { id: chatId, userId, deletedAt: null },
    data: {
      isArchived: true,
      deletedAt: new Date(),
    },
  })

  return result.count > 0
}
