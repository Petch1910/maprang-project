import { TokenTransactionType } from '@prisma/client'
import { getPrisma } from './db'

export type TokenTransactionInput = {
  userId: string
  type: TokenTransactionType
  amount: number
  reason?: string
  metadata?: Record<string, unknown>
  usageId?: string
}

export type DailyLoginReward = {
  tokens: number
  streak: number
  nextRewardAt: Date
}

const DAILY_LOGIN_REWARD = 50
const STREAK_BONUS_MULTIPLIER = 1.1
const MAX_STREAK_BONUS = 5

/**
 * ตรวจสอบและให้รางวัล daily login
 * @returns จำนวน token ที่ได้รับ หรือ null ถ้าได้รับไปแล้ววันนี้
 */
export async function checkDailyLoginReward(userId: string): Promise<DailyLoginReward | null> {
  const prisma = getPrisma()
  if (!prisma) return null

  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)

  // เช็คว่าได้รับรางวัลวันนี้หรือยัง
  const todayLogin = await prisma.tokenTransaction.findFirst({
    where: {
      userId,
      type: TokenTransactionType.DAILY_LOGIN,
      createdAt: {
        gte: today,
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  if (todayLogin) {
    const nextDay = new Date(today)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    return {
      tokens: 0,
      streak: 0,
      nextRewardAt: nextDay,
    }
  }

  // หา streak ปัจจุบัน
  const yesterday = new Date(today)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)

  const recentLogins = await prisma.tokenTransaction.findMany({
    where: {
      userId,
      type: TokenTransactionType.DAILY_LOGIN,
      createdAt: {
        gte: yesterday,
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  let streak = 1
  if (recentLogins.length > 0) {
    const lastLogin = new Date(recentLogins[0]!.createdAt)
    lastLogin.setUTCHours(0, 0, 0, 0)

    if (lastLogin.getTime() === yesterday.getTime()) {
      // ติดต่อกัน นับ streak
      streak = 1
      for (let i = 1; i < recentLogins.length; i++) {
        const loginDate = new Date(recentLogins[i]!.createdAt)
        loginDate.setUTCHours(0, 0, 0, 0)
        const expectedDate = new Date(yesterday)
        expectedDate.setUTCDate(expectedDate.getUTCDate() - i)

        if (loginDate.getTime() === expectedDate.getTime()) {
          streak++
        } else {
          break
        }
      }
    }
  }

  // คำนวณรางวัล
  const streakBonus = Math.min(streak - 1, MAX_STREAK_BONUS)
  const bonusTokens = Math.floor(DAILY_LOGIN_REWARD * (streakBonus * (STREAK_BONUS_MULTIPLIER - 1)))
  const totalTokens = DAILY_LOGIN_REWARD + bonusTokens

  // ให้รางวัล
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  if (!user) return null

  const nextBalance = user.tokenBalance + totalTokens

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: nextBalance },
    })

    await tx.tokenTransaction.create({
      data: {
        userId,
        type: TokenTransactionType.DAILY_LOGIN,
        amount: totalTokens,
        balanceAfter: nextBalance,
        reason: `เข้าสู่ระบบประจำวัน (streak: ${streak} วัน)`,
        metadata: {
          streak,
          baseReward: DAILY_LOGIN_REWARD,
          streakBonus: bonusTokens,
        },
      },
    })
  })

  const nextDay = new Date(today)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return {
    tokens: totalTokens,
    streak,
    nextRewardAt: nextDay,
  }
}

/**
 * ให้รางวัล achievement
 */
export async function grantAchievementReward(
  userId: string,
  achievementId: string,
  tokens: number,
  reason: string,
): Promise<boolean> {
  const prisma = getPrisma()
  if (!prisma) return false

  if (tokens <= 0) return false

  // เช็คว่าได้รับรางวัลนี้ไปแล้วหรือยัง
  const existing = await prisma.tokenTransaction.findFirst({
    where: {
      userId,
      type: TokenTransactionType.ACHIEVEMENT,
      metadata: {
        path: ['achievementId'],
        equals: achievementId,
      },
    },
  })

  if (existing) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  if (!user) return false

  const nextBalance = user.tokenBalance + tokens

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: nextBalance },
    })

    await tx.tokenTransaction.create({
      data: {
        userId,
        type: TokenTransactionType.ACHIEVEMENT,
        amount: tokens,
        balanceAfter: nextBalance,
        reason,
        metadata: {
          achievementId,
        },
      },
    })
  })

  return true
}

/**
 * ลงโทษด้วยการหัก token
 */
export async function applyTokenPenalty(
  userId: string,
  tokens: number,
  reason: string,
  actorUserId?: string,
): Promise<boolean> {
  const prisma = getPrisma()
  if (!prisma) return false

  if (tokens <= 0) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  if (!user) return false

  const penaltyAmount = -Math.abs(tokens)
  const nextBalance = Math.max(0, user.tokenBalance + penaltyAmount)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: nextBalance },
    })

    await tx.tokenTransaction.create({
      data: {
        userId,
        type: TokenTransactionType.PENALTY,
        amount: penaltyAmount,
        balanceAfter: nextBalance,
        reason,
        metadata: {
          actorUserId,
          requestedAmount: penaltyAmount,
          actualAmount: penaltyAmount,
          insufficientBalance: user.tokenBalance < Math.abs(penaltyAmount),
        },
      },
    })
  })

  return true
}

/**
 * สร้าง token transaction ทั่วไป
 */
export async function createTokenTransaction(input: TokenTransactionInput): Promise<boolean> {
  const prisma = getPrisma()
  if (!prisma) return false

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { tokenBalance: true },
  })

  if (!user) return false

  const nextBalance = user.tokenBalance + input.amount

  if (nextBalance < 0) return false

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: input.userId },
      data: { tokenBalance: nextBalance },
    })

    await tx.tokenTransaction.create({
      data: {
        userId: input.userId,
        usageId: input.usageId,
        type: input.type,
        amount: input.amount,
        balanceAfter: nextBalance,
        reason: input.reason?.trim() || null,
        metadata: (input.metadata as any) ?? undefined,
      },
    })
  })

  return true
}

/**
 * บันทึก token transaction (Alias สำหรับ createTokenTransaction)
 * ใช้โดย daily-login.service.ts และ token-expiry.service.ts
 */
export async function recordTokenTransaction(input: TokenTransactionInput): Promise<void> {
  await createTokenTransaction(input)
}

/**
 * ตรวจสอบว่าผู้ใช้มี token เพียงพอหรือไม่
 */
export async function checkTokenBalance(userId: string, requiredTokens: number): Promise<boolean> {
  const prisma = getPrisma()
  if (!prisma) return false

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  })

  return user ? user.tokenBalance >= requiredTokens : false
}

/**
 * โหลด token statistics
 */
export async function loadTokenStatistics(userId: string) {
  const prisma = getPrisma()
  if (!prisma) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)

  const [user, transactions, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { tokenBalance: true },
    }),
    prisma.tokenTransaction.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.tokenTransaction.groupBy({
      by: ['type'],
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
  ])

  if (!user) return null

  const earned = transactions
    .filter((t) => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0)

  const spent = Math.abs(
    transactions
      .filter((t) => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0),
  )

  return {
    currentBalance: user.tokenBalance,
    earned30d: earned,
    spent30d: spent,
    transactionCount30d: transactions.length,
    byType: stats.map((s) => ({
      type: s.type,
      total: s._sum.amount ?? 0,
      count: s._count.id,
    })),
  }
}
