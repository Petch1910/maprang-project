import { defaultUserId } from './config'
import { clampMaxRating, normalizeMaxRating, type ContentRating } from './content-rating'
import { getPrisma } from './db'

export type ContentSettingsInput = {
  isAdult?: boolean
  maxRating?: ContentRating
}

function publicContentSettings(user: { contentMaxRating: string; adultVerifiedAt: Date | null }) {
  const maxRating = normalizeMaxRating(user.contentMaxRating)
  return {
    isAdult: Boolean(user.adultVerifiedAt) && (maxRating === 'mature_18' || maxRating === 'restricted_18'),
    maxRating,
    adultVerifiedAt: user.adultVerifiedAt,
  }
}

export async function loadContentSettings(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      contentMaxRating: true,
      adultVerifiedAt: true,
    },
  })

  return user ? publicContentSettings(user) : null
}

export async function updateContentSettings(userId = defaultUserId, input: ContentSettingsInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const isAdult = Boolean(input.isAdult)
  const requestedMaxRating = input.maxRating ? normalizeMaxRating(input.maxRating) : isAdult ? 'restricted_18' : 'teen_romance'
  const maxRating = isAdult ? requestedMaxRating : clampMaxRating(requestedMaxRating, 'teen_romance')
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      contentMaxRating: maxRating,
      adultVerifiedAt: isAdult ? new Date() : null,
    },
    select: {
      contentMaxRating: true,
      adultVerifiedAt: true,
    },
  })

  return publicContentSettings(user)
}

export async function effectiveMaxRatingForUser(userId = defaultUserId, requested?: ContentRating) {
  const settings = await loadContentSettings(userId)
  const allowed = settings?.maxRating ?? 'teen_romance'
  return clampMaxRating(requested, allowed)
}

export async function loadUsageSummary(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const [user, aggregate, recentUsages, tokenTransactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        tokenBalance: true,
        role: true,
        contentMaxRating: true,
        adultVerifiedAt: true,
      },
    }),
    prisma.usage.aggregate({
      where: { userId },
      _sum: { tokens: true },
      _count: { id: true },
    }),
    prisma.usage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tokens: true,
        modelName: true,
        cost: true,
        createdAt: true,
      },
    }),
    prisma.tokenTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        createdAt: true,
      },
    }),
  ])

  if (!user) return null

  return {
    user,
    contentSettings: publicContentSettings(user),
    usage: {
      totalTokens: aggregate._sum.tokens ?? 0,
      requestCount: aggregate._count.id,
      recent: recentUsages,
    },
    wallet: {
      transactions: tokenTransactions,
    },
  }
}
