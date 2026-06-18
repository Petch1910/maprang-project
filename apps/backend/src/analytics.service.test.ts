import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { CharacterStatus, Visibility } from '@prisma/client'
import {
  buildContextSnapshotData,
  buildContextSectionStats,
  createContextSnapshot,
  hashPrompt,
  loadProcessMiningSummary,
  recordAnalyticsEvent,
} from './analytics.service'
import { sendChat } from './chat.service'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'analytics context snapshots')
const analyticsUserId = '990e8400-e29b-41d4-a716-446655440000'
const testPrefix = 'Analytics Context Test'
let analyticsTablesAvailable: boolean | null = null

function reportMissingAnalyticsTables(options: { silent?: boolean } = {}) {
  const message = '[db-test-skip] analytics context snapshots ต้อง apply migration ล่าสุดก่อนทดสอบ persistence'
  if (options.silent) return
  if (process.env.CI === 'true' || process.env.REQUIRE_DB_TESTS === 'true') throw new Error(message)
  console.warn(message)
}

async function shouldRunAnalyticsDbTest(options: { silent?: boolean } = {}) {
  if (!(await shouldRunDbTest(options))) return false
  if (analyticsTablesAvailable !== null) {
    if (!analyticsTablesAvailable) reportMissingAnalyticsTables(options)
    return analyticsTablesAvailable
  }

  try {
    const tables = await prisma!.$queryRaw<Array<{ analyticsEvent: string | null; contextSnapshot: string | null }>>`
      SELECT
        to_regclass('public."AnalyticsEvent"')::text AS "analyticsEvent",
        to_regclass('public."ContextSnapshot"')::text AS "contextSnapshot"
    `
    analyticsTablesAvailable = Boolean(tables[0]?.analyticsEvent && tables[0]?.contextSnapshot)
  } catch {
    analyticsTablesAvailable = false
  }

  if (!analyticsTablesAvailable) reportMissingAnalyticsTables(options)

  return analyticsTablesAvailable
}

async function cleanup() {
  await prisma?.analyticsEvent.deleteMany({ where: { userId: analyticsUserId } })
  await prisma?.contextSnapshot.deleteMany({ where: { userId: analyticsUserId } })
  await prisma?.chat.deleteMany({ where: { userId: analyticsUserId } })
  await prisma?.character.deleteMany({ where: { name: { startsWith: testPrefix } } })
  await prisma?.user.deleteMany({ where: { id: analyticsUserId } })
}

describe('analytics context snapshots', () => {
  beforeAll(async () => {
    if (!(await shouldRunAnalyticsDbTest({ silent: true }))) return
    await cleanup()
    await prisma!.user.create({
      data: {
        id: analyticsUserId,
        email: 'analytics-context@maprang.io',
        username: 'AnalyticsContext',
      },
    })
  })

  afterAll(async () => {
    if (!(await shouldRunAnalyticsDbTest({ silent: true }))) return
    await cleanup()
  })

  test('hashes prompts and stores only redacted prompt previews', () => {
    const openRouterKey = ['sk', 'or', 'v1', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('-')
    const openAiProjectKey = ['sk', 'proj', 'abcdefghijklmnopqrstuvwxyz1234567890'].join('-')
    const prompt = [
      'System policy',
      `OPENROUTER_API_KEY=${openRouterKey}`,
      '',
      'Character block',
      'Stay in character.',
    ].join('\n')
    const data = buildContextSnapshotData({
      userId: analyticsUserId,
      modelRoute: 'chat.roleplay.standard',
      replyProfile: 'balanced',
      prompt,
      retrievedLore: ['memory'],
      metadata: {
        providerKey: openAiProjectKey,
      },
    })

    expect(data.promptHash).toHaveLength(64)
    expect(data.promptHash).toBe(hashPrompt(data.redactedPromptPreview ?? ''))
    expect(data.redactedPromptPreview).not.toContain(openRouterKey)
    expect(JSON.stringify(data.metadata)).not.toContain(openAiProjectKey)
    expect(data.loreCount).toBe(1)
    expect(Array.isArray(data.sectionStats)).toBe(true)
  })

  test('builds bounded prompt section stats', () => {
    const stats = buildContextSectionStats('A title:\nfirst block\n\nSecond block\nline')
    expect(stats).toEqual([
      expect.objectContaining({ index: 0, title: 'A title', chars: 20 }),
      expect.objectContaining({ index: 1, title: 'Second block', chars: 17 }),
    ])
    expect(stats.every((section) => section.estimatedTokens > 0)).toBe(true)
  })

  test('persists events and summarizes the process funnel when Postgres is available', async () => {
    if (!(await shouldRunAnalyticsDbTest())) return

    const character = await prisma!.character.create({
      data: {
        name: `${testPrefix} Character ${crypto.randomUUID().slice(0, 6)}`,
        tagline: 'Analytics test character',
        description: 'Used to verify process mining persistence.',
        systemPrompt: 'Stay deterministic for analytics tests.',
        creatorId: analyticsUserId,
        status: CharacterStatus.PUBLISHED,
        visibility: Visibility.PUBLIC,
      },
    })
    const chat = await prisma!.chat.create({
      data: {
        title: `${testPrefix} Chat`,
        userId: analyticsUserId,
        characterId: character.id,
      },
    })

    const snapshot = await createContextSnapshot(
      {
        userId: analyticsUserId,
        chatId: chat.id,
        characterId: character.id,
        modelRoute: 'chat.roleplay.standard',
        replyProfile: 'balanced',
        modelName: 'local/mock-roleplay',
        prompt: 'System policy\n\nCharacter block\n\nRuntime memory',
        promptBudget: { estimatedTokens: 30, maxTokens: 8000 },
        retrievedLore: ['memory', 'relationship'],
      },
      prisma,
    )
    await recordAnalyticsEvent(
      {
        userId: analyticsUserId,
        chatId: chat.id,
        characterId: character.id,
        eventName: 'chat_start',
        entityType: 'chat',
        entityId: chat.id,
        metadata: { contextSnapshotId: snapshot?.id },
      },
      prisma,
    )
    await recordAnalyticsEvent(
      {
        userId: analyticsUserId,
        chatId: chat.id,
        characterId: character.id,
        eventName: 'chat_turn',
        entityType: 'chat',
        entityId: chat.id,
      },
      prisma,
    )

    const summary = await loadProcessMiningSummary({ days: 1, prisma })

    expect(summary?.funnel.chatStarts).toBeGreaterThanOrEqual(1)
    expect(summary?.funnel.chatTurns).toBeGreaterThanOrEqual(1)
    expect(summary?.funnel.uniqueChats).toBeGreaterThanOrEqual(1)
    expect(summary?.contextSnapshots.count).toBeGreaterThanOrEqual(1)
    expect(summary?.contextSnapshots.latest[0]).toMatchObject({
      modelRoute: 'chat.roleplay.standard',
      replyProfile: 'balanced',
      loreCount: 2,
    })
  })

  test('records context snapshots from the local chat runtime', async () => {
    if (!(await shouldRunAnalyticsDbTest())) return

    const previousLocalProvider = process.env.LOCAL_CHAT_PROVIDER
    process.env.LOCAL_CHAT_PROVIDER = '1'

    try {
      const character = await prisma!.character.create({
        data: {
          name: `${testPrefix} Runtime ${crypto.randomUUID().slice(0, 6)}`,
          tagline: 'Runtime analytics test character',
          description: 'Used to verify chat runtime analytics integration.',
          systemPrompt: 'Stay deterministic and answer as a roleplay character.',
          creatorId: analyticsUserId,
          status: CharacterStatus.PUBLISHED,
          visibility: Visibility.PUBLIC,
        },
      })

      const response = await sendChat({
        characterId: character.id,
        userId: analyticsUserId,
        message: 'เริ่มคุยแบบทดสอบ context snapshot',
        maxRating: 'restricted_18',
      })

      expect(response.chatId).toBeString()
      const assistantMessage = await prisma!.message.findFirst({
        where: {
          chatId: response.chatId!,
          role: 'assistant',
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: { metadata: true },
      })
      const metadata = assistantMessage?.metadata as { contextSnapshotId?: string } | null

      expect(metadata?.contextSnapshotId).toBeString()
      const snapshot = await prisma!.contextSnapshot.findUnique({
        where: { id: metadata!.contextSnapshotId },
      })
      const eventNames = (
        await prisma!.analyticsEvent.findMany({
          where: { chatId: response.chatId! },
          select: { eventName: true },
        })
      ).map((event) => event.eventName)

      expect(snapshot).toMatchObject({
        chatId: response.chatId,
        characterId: character.id,
        modelRoute: 'chat.roleplay.standard',
        replyProfile: 'balanced',
        modelName: 'local/mock-roleplay',
      })
      expect(eventNames).toContain('chat_start')
      expect(eventNames).toContain('first_reply')
      expect(eventNames).toContain('context_snapshot_created')
    } finally {
      if (previousLocalProvider === undefined) delete process.env.LOCAL_CHAT_PROVIDER
      else process.env.LOCAL_CHAT_PROVIDER = previousLocalProvider
    }
  })
})
