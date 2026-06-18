import { createHash } from 'node:crypto'
import type { Prisma, PrismaClient } from '@prisma/client'
import { getPrisma } from './db'
import { estimatePromptTokens } from './prompt-inspector.service'
import { redactSensitiveText, redactUnknownDiagnosticText } from './redaction'

type PrismaDb = PrismaClient

export type AnalyticsEventName =
  | 'character_impression'
  | 'character_detail_view'
  | 'chat_start'
  | 'chat_turn'
  | 'first_reply'
  | 'context_snapshot_created'
  | 'report_created'
  | 'report_opened'
  | 'wallet_view'
  | 'marketplace_view'
  | 'creator_draft_generated'
  | 'creator_opened'
  | 'creator_publish'
  | 'ai_creator_opened'
  | 'ai_creator_generate_started'

export type AnalyticsEventInput = {
  userId?: string | null
  chatId?: string | null
  characterId?: string | null
  eventName: AnalyticsEventName | string
  source?: string
  route?: string | null
  entityType?: string | null
  entityId?: string | null
  metadata?: unknown
}

export type ContextSnapshotInput = {
  requestId?: string | null
  userId?: string | null
  chatId?: string | null
  characterId?: string | null
  modelRoute: string
  replyProfile: string
  modelName?: string | null
  prompt: string
  promptBudget?: unknown
  retrievedLore?: string[]
  metadata?: unknown
}

export type ProcessMiningSummary = {
  generatedAt: string
  days: number
  windowStart: string
  eventCounts: Array<{ eventName: string; count: number }>
  funnel: {
    characterImpressions: number
    characterDetailViews: number
    chatStarts: number
    chatTurns: number
    firstReplies: number
    reports: number
    uniqueChats: number
    uniqueCharacters: number
  }
  contextSnapshots: {
    count: number
    latest: Array<{
      id: string
      chatId: string | null
      characterId: string | null
      modelRoute: string
      replyProfile: string
      modelName: string | null
      promptHash: string
      promptTokensEstimate: number
      loreCount: number
      createdAt: string
    }>
  }
  recentEvents: Array<{
    id: string
    eventName: string
    source: string
    route: string | null
    entityType: string | null
    entityId: string | null
    chatId: string | null
    characterId: string | null
    createdAt: string
  }>
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function safeString(value: string, maxLength = 500) {
  return redactSensitiveText(value).text.slice(0, maxLength)
}

function safeJsonValue(value: unknown, depth = 0): Prisma.InputJsonValue {
  if (value === null || value === undefined) return '[NULL]'
  if (typeof value === 'string') return safeString(value, depth === 0 ? 1000 : 500)
  if (typeof value === 'number') return Number.isFinite(value) ? value : '[NON_FINITE_NUMBER]'
  if (typeof value === 'boolean') return value
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => safeJsonValue(item, depth + 1))
  if (typeof value === 'object') {
    if (depth >= 4) return '[TRUNCATED_OBJECT]'
    const record: Record<string, Prisma.InputJsonValue> = {}
    for (const [key, entry] of Object.entries(value).slice(0, 80)) {
      record[safeString(key, 80)] = safeJsonValue(entry, depth + 1)
    }
    return record
  }
  return safeString(String(value), 300)
}

function optionalJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined
  return safeJsonValue(value)
}

export function hashPrompt(prompt: string) {
  return createHash('sha256').update(prompt).digest('hex')
}

export function buildContextSectionStats(prompt: string) {
  return prompt
    .split(/\n{2,}/)
    .map((section, index) => {
      const trimmed = section.trim()
      if (!trimmed) return null
      const firstLine = trimmed.split('\n')[0]?.trim() || `section-${index + 1}`
      return {
        index,
        title: safeString(firstLine.replace(/:$/, ''), 120),
        chars: trimmed.length,
        estimatedTokens: estimatePromptTokens(trimmed),
      }
    })
    .filter((section): section is { index: number; title: string; chars: number; estimatedTokens: number } => Boolean(section))
}

export function buildContextSnapshotData(input: ContextSnapshotInput) {
  const redactedPrompt = redactSensitiveText(input.prompt).text
  const sectionStats = buildContextSectionStats(redactedPrompt)

  return {
    requestId: input.requestId || undefined,
    userId: input.userId || undefined,
    chatId: input.chatId || undefined,
    characterId: input.characterId || undefined,
    modelRoute: input.modelRoute,
    replyProfile: input.replyProfile,
    modelName: input.modelName || undefined,
    promptHash: hashPrompt(redactedPrompt),
    promptTokensEstimate: estimatePromptTokens(redactedPrompt),
    promptBudget: optionalJson(input.promptBudget),
    loreCount: input.retrievedLore?.length ?? 0,
    retrievedLore: optionalJson(input.retrievedLore ?? []),
    sectionStats: optionalJson(sectionStats),
    redactedPromptPreview: redactedPrompt.slice(0, 1400),
    metadata: optionalJson(input.metadata),
  } satisfies Prisma.ContextSnapshotUncheckedCreateInput
}

export async function createContextSnapshot(input: ContextSnapshotInput, prisma: PrismaDb | null = getPrisma()) {
  if (!prisma) return null
  const data = buildContextSnapshotData(input)

  return prisma.contextSnapshot.create({ data })
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput, prisma: PrismaDb | null = getPrisma()) {
  if (!prisma) return null

  return prisma.analyticsEvent.create({
    data: {
      userId: input.userId || undefined,
      chatId: input.chatId || undefined,
      characterId: input.characterId || undefined,
      eventName: input.eventName,
      source: input.source || 'server',
      route: input.route || undefined,
      entityType: input.entityType || undefined,
      entityId: input.entityId || undefined,
      metadata: optionalJson(input.metadata),
    },
  })
}

export async function recordAnalyticsEventSafe(input: AnalyticsEventInput, prisma: PrismaDb | null = getPrisma()) {
  try {
    return await recordAnalyticsEvent(input, prisma)
  } catch (error) {
    console.warn('analytics_event_write_failed', redactUnknownDiagnosticText(error, 300))
    return null
  }
}

export async function createContextSnapshotSafe(input: ContextSnapshotInput, prisma: PrismaDb | null = getPrisma()) {
  try {
    return await createContextSnapshot(input, prisma)
  } catch (error) {
    console.warn('context_snapshot_write_failed', redactUnknownDiagnosticText(error, 300))
    return null
  }
}

export async function loadProcessMiningSummary(options: { days?: number; prisma?: PrismaDb | null } = {}) {
  const prisma = options.prisma ?? getPrisma()
  if (!prisma) return null

  const days = clamp(Math.trunc(options.days ?? 7), 1, 90)
  const windowStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const [events, contextSnapshotCount, latestSnapshots] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        id: true,
        eventName: true,
        source: true,
        route: true,
        entityType: true,
        entityId: true,
        chatId: true,
        characterId: true,
        createdAt: true,
      },
    }),
    prisma.contextSnapshot.count({ where: { createdAt: { gte: windowStart } } }),
    prisma.contextSnapshot.findMany({
      where: { createdAt: { gte: windowStart } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        chatId: true,
        characterId: true,
        modelRoute: true,
        replyProfile: true,
        modelName: true,
        promptHash: true,
        promptTokensEstimate: true,
        loreCount: true,
        createdAt: true,
      },
    }),
  ])

  const counts = new Map<string, number>()
  const uniqueChats = new Set<string>()
  const uniqueCharacters = new Set<string>()
  for (const event of events) {
    counts.set(event.eventName, (counts.get(event.eventName) ?? 0) + 1)
    if (event.chatId) uniqueChats.add(event.chatId)
    if (event.characterId) uniqueCharacters.add(event.characterId)
  }

  return {
    generatedAt: new Date().toISOString(),
    days,
    windowStart: windowStart.toISOString(),
    eventCounts: [...counts.entries()]
      .map(([eventName, count]) => ({ eventName, count }))
      .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName)),
    funnel: {
      characterImpressions: counts.get('character_impression') ?? 0,
      characterDetailViews: counts.get('character_detail_view') ?? 0,
      chatStarts: counts.get('chat_start') ?? 0,
      chatTurns: counts.get('chat_turn') ?? 0,
      firstReplies: counts.get('first_reply') ?? 0,
      reports: (counts.get('report_opened') ?? 0) + (counts.get('report_created') ?? 0),
      uniqueChats: uniqueChats.size,
      uniqueCharacters: uniqueCharacters.size,
    },
    contextSnapshots: {
      count: contextSnapshotCount,
      latest: latestSnapshots.map((snapshot) => ({
        ...snapshot,
        createdAt: snapshot.createdAt.toISOString(),
      })),
    },
    recentEvents: events.slice(0, 50).map((event) => ({
      ...event,
      createdAt: event.createdAt.toISOString(),
    })),
  } satisfies ProcessMiningSummary
}
