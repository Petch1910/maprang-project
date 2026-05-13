import { afterAll, describe, expect, test } from 'bun:test'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import { effectiveMaxRatingForUser, loadContentSettings, loadUserPersona, updateContentSettings, updateUserPersona } from './user.service'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'user content settings')
const contentUserIds = [
  '880e8400-e29b-41d4-a716-446655440000',
  '880e8400-e29b-41d4-a716-446655440001',
]

async function ensureContentUser(userId: string) {
  await prisma!.user.upsert({
    where: { id: userId },
    update: {
      email: 'content@maprang.io',
      username: `ContentUser${userId.slice(-1)}`,
      contentMaxRating: 'teen_romance',
      adultVerifiedAt: null,
    },
    create: {
      id: userId,
      email: `content-${userId.slice(-1)}@maprang.io`,
      username: `ContentUser${userId.slice(-1)}`,
    },
  })
}

describe('user content settings', () => {
  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await prisma?.user.deleteMany({ where: { id: { in: contentUserIds } } })
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
})
