import { afterAll, describe, expect, test } from 'bun:test'
import { getPrisma } from './db'
import { effectiveMaxRatingForUser, loadContentSettings, updateContentSettings } from './user.service'

const prisma = getPrisma()
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
    await prisma?.user.deleteMany({ where: { id: { in: contentUserIds } } })
  })

  test('defaults users to teen romance and clamps requested adult ratings', async () => {
    expect(prisma).not.toBeNull()
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
    expect(prisma).not.toBeNull()
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
})
