import { defaultUserId } from './config'
import { clampMaxRating, normalizeMaxRating, type ContentRating } from './content-rating'
import { getPrisma } from './db'

export type ContentSettingsInput = {
  isAdult?: boolean
  maxRating?: ContentRating
}

export type UserPersonaInput = {
  persona?: string
}

const maxPersonaChars = 2000
const usageLookbackDays = 7

function normalizePersona(value?: string) {
  return value?.replace(/\r\n/g, '\n').trim().slice(0, maxPersonaChars) ?? ''
}

function publicContentSettings(user: { contentMaxRating: string; adultVerifiedAt: Date | null }) {
  const maxRating = normalizeMaxRating(user.contentMaxRating)
  return {
    isAdult: Boolean(user.adultVerifiedAt) && (maxRating === 'mature_18' || maxRating === 'restricted_18'),
    maxRating,
    adultVerifiedAt: user.adultVerifiedAt,
  }
}

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10)
}

function decimalString(value: { toString(): string } | number | string | null | undefined) {
  if (value === null || value === undefined) return '0'
  const numericValue = Number(value.toString())
  if (!Number.isFinite(numericValue)) return '0'
  return numericValue.toFixed(6)
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

export async function loadUserPersona(userId = defaultUserId) {
  const prisma = getPrisma()
  if (!prisma) return null

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      persona: true,
      personaUpdatedAt: true,
    },
  })

  if (!user) return null
  return {
    persona: user.persona ?? '',
    updatedAt: user.personaUpdatedAt,
    maxChars: maxPersonaChars,
  }
}

export async function updateUserPersona(userId = defaultUserId, input: UserPersonaInput) {
  const prisma = getPrisma()
  if (!prisma) return null

  const persona = normalizePersona(input.persona)
  const updatedAt = new Date()
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      persona: persona || null,
      personaUpdatedAt: updatedAt,
    },
    select: {
      persona: true,
      personaUpdatedAt: true,
    },
  })

  return {
    persona: user.persona ?? '',
    updatedAt: user.personaUpdatedAt,
    maxChars: maxPersonaChars,
  }
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

  const lookbackStart = new Date()
  lookbackStart.setUTCHours(0, 0, 0, 0)
  lookbackStart.setUTCDate(lookbackStart.getUTCDate() - (usageLookbackDays - 1))

  const [user, aggregate, recentUsages, usageByModel, dailyUsages, tokenTransactions] = await Promise.all([
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
      _sum: { tokens: true, cost: true },
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
    prisma.usage.groupBy({
      by: ['modelName'],
      where: { userId },
      _sum: {
        tokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.usage.findMany({
      where: {
        userId,
        createdAt: {
          gte: lookbackStart,
        },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        tokens: true,
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

  const totalTokens = aggregate._sum.tokens ?? 0
  const requestCount = aggregate._count.id
  const totalCost = decimalString(aggregate._sum.cost)
  const averageTokensPerRequest = requestCount > 0 ? Math.round(totalTokens / requestCount) : 0
  const averageCostPerRequest = requestCount > 0 ? Number(totalCost) / requestCount : 0
  const estimatedRemainingRequests =
    averageTokensPerRequest > 0 ? Math.floor(user.tokenBalance / averageTokensPerRequest) : null

  const dailyMap = new Map<string, { date: string; tokens: number; cost: number; requestCount: number }>()
  for (let index = 0; index < usageLookbackDays; index += 1) {
    const day = new Date(lookbackStart)
    day.setUTCDate(lookbackStart.getUTCDate() + index)
    const key = dateKey(day)
    dailyMap.set(key, { date: key, tokens: 0, cost: 0, requestCount: 0 })
  }
  for (const usage of dailyUsages) {
    const key = dateKey(usage.createdAt)
    const row = dailyMap.get(key)
    if (!row) continue
    row.tokens += usage.tokens
    row.cost += Number(usage.cost ?? 0)
    row.requestCount += 1
  }

  return {
    user,
    contentSettings: publicContentSettings(user),
    usage: {
      totalTokens,
      totalCost,
      requestCount,
      recent: recentUsages,
      byModel: usageByModel
        .map((row) => ({
          modelName: row.modelName,
          tokens: row._sum.tokens ?? 0,
          cost: decimalString(row._sum.cost),
          requestCount: row._count.id,
        }))
        .sort((left, right) => right.tokens - left.tokens)
        .slice(0, 8),
      daily: Array.from(dailyMap.values()).map((row) => ({
        ...row,
        cost: row.cost.toFixed(6),
      })),
      estimate: {
        averageTokensPerRequest,
        averageCostPerRequest: averageCostPerRequest.toFixed(6),
        estimatedRemainingRequests,
      },
    },
    wallet: {
      transactions: tokenTransactions,
    },
  }
}
