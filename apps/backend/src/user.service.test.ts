import { afterAll, describe, expect, test } from 'bun:test'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import { userRoutes } from './user.routes'
import {
  effectiveMaxRatingForUser,
  loadContentSettings,
  loadUsageSummary,
  loadUserPersona,
  updateContentSettings,
  updateUserPersona,
} from './user.service'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'user content settings')
const contentUserIds = [
  '880e8400-e29b-41d4-a716-446655440000',
  '880e8400-e29b-41d4-a716-446655440001',
  '880e8400-e29b-41d4-a716-446655440002',
]

async function ensureContentUser(userId: string) {
  const suffix = userId.slice(-1)
  await prisma!.user.upsert({
    where: { id: userId },
    update: {
      email: `content-${suffix}@maprang.io`,
      username: `ContentUser${suffix}`,
      tokenBalance: 1000,
      contentMaxRating: 'teen_romance',
      adultVerifiedAt: null,
    },
    create: {
      id: userId,
      email: `content-${suffix}@maprang.io`,
      username: `ContentUser${suffix}`,
      tokenBalance: 1000,
    },
  })
}

describe('user content settings', () => {
  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await prisma?.user.deleteMany({ where: { id: { in: contentUserIds } } })
  })

  test('returns Thai-first messages when user persistence is unavailable', async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    try {
      const response = await userRoutes.handle(new Request('http://localhost/me/persona'))
      const body = (await response.json()) as { error: string; message: string }

      expect(response.status).toBe(503)
      expect(body).toEqual({
        error: 'database_not_configured',
        message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
      })
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl
      }
    }
  })

  test('defaults users to teen romance and clamps requested adult ratings', async () => {
    if (!(await shouldRunDbTest())) return
    const contentUserId = contentUserIds[0]!

    await ensureContentUser(contentUserId)

    const contentSettings = await loadContentSettings(contentUserId)
    expect(contentSettings).toMatchObject({
      isAdult: false,
      maxRating: 'teen_romance',
    })
    const effectiveMaxRating = await effectiveMaxRatingForUser(contentUserId, 'restricted_18')
    expect(effectiveMaxRating).toBe('teen_romance')
  })

  test('persists adult content mode server-side', async () => {
    if (!(await shouldRunDbTest())) return
    const contentUserId = contentUserIds[1]!
    await ensureContentUser(contentUserId)

    const contentSettings = await updateContentSettings(contentUserId, {
      isAdult: true,
      maxRating: 'restricted_18',
    })

    expect(contentSettings).toMatchObject({
      isAdult: true,
      maxRating: 'restricted_18',
    })
    expect(contentSettings?.adultVerifiedAt).toBeInstanceOf(Date)
    const effectiveMaxRating = await effectiveMaxRatingForUser(contentUserId, 'restricted_18')
    expect(effectiveMaxRating).toBe('restricted_18')
  })

  test('persists user persona server-side and trims long drafts', async () => {
    if (!(await shouldRunDbTest())) return
    const contentUserId = contentUserIds[0]!
    await ensureContentUser(contentUserId)

    const saved = await updateUserPersona(contentUserId, {
      persona: `  ชื่อ: พลอย\nสไตล์: ชอบ slow burn  ${'x'.repeat(2200)}`,
    })

    expect(saved?.persona.startsWith('ชื่อ: พลอย')).toBe(true)
    expect(saved?.persona.length).toBeLessThanOrEqual(2000)
    expect(saved?.updatedAt).toBeInstanceOf(Date)

    const loaded = await loadUserPersona(contentUserId)
    expect(loaded?.persona).toBe(saved?.persona)

    const cleared = await updateUserPersona(contentUserId, { persona: '' })
    expect(cleared?.persona).toBe('')
  })

  test('summarizes usage cost by model and daily trend', async () => {
    if (!(await shouldRunDbTest())) return
    const contentUserId = contentUserIds[2]!
    await ensureContentUser(contentUserId)
    await prisma!.usage.deleteMany({ where: { userId: contentUserId } })

    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setUTCDate(today.getUTCDate() - 1)

    await prisma!.usage.createMany({
      data: [
        {
          userId: contentUserId,
          tokens: 300,
          cost: '0.000030',
          modelName: 'model-a',
          createdAt: today,
        },
        {
          userId: contentUserId,
          tokens: 700,
          cost: '0.000070',
          modelName: 'model-a',
          createdAt: yesterday,
        },
        {
          userId: contentUserId,
          tokens: 200,
          cost: '0.000020',
          modelName: 'model-b',
          createdAt: yesterday,
        },
      ],
    })

    const summary = await loadUsageSummary(contentUserId)

    expect(summary?.usage.totalTokens).toBe(1200)
    expect(summary?.usage.totalCost).toBe('0.000120')
    expect(summary?.usage.requestCount).toBe(3)
    expect(summary?.usage.estimate.averageTokensPerRequest).toBe(400)
    expect(summary?.usage.estimate.estimatedRemainingRequests).toBe(2)
    expect(summary?.usage.byModel[0]).toMatchObject({
      modelName: 'model-a',
      tokens: 1000,
      cost: '0.000100',
      requestCount: 2,
    })
    expect(summary?.usage.byModel[1]).toMatchObject({
      modelName: 'model-b',
      tokens: 200,
      cost: '0.000020',
      requestCount: 1,
    })
    expect(summary?.usage.daily).toHaveLength(7)
    expect(summary?.usage.daily.reduce((total, item) => total + item.tokens, 0)).toBe(1200)
  })
})
