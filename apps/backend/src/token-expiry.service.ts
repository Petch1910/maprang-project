import { getPrisma } from './db'
import { recordTokenTransaction } from './token.service'

export type TokenExpiryNotification = {
  userId: string
  email: string | null
  amount: number
  daysAhead: number
  title: string
  message: string
}

/**
 * Expire promotional tokens that have passed their expiry date
 * Called by cron job daily
 *
 * NOTE: Currently uses metadata.expiryDate instead of expiresAt field
 * Update this when TokenTransaction schema has expiresAt column
 */
export async function expirePromotionalTokens(): Promise<{
  expiredCount: number
  totalTokensExpired: number
  affectedUsers: string[]
}> {
  const prisma = getPrisma()
  if (!prisma) {
    throw new Error('Database not available')
  }

  const now = new Date()

  // Find promotional transactions with expiry date in metadata
  const allPromotionalTransactions = await prisma.tokenTransaction.findMany({
    where: {
      type: 'PROMOTION',
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      metadata: true,
      user: {
        select: {
          tokenBalance: true,
        },
      },
    },
  })

  const results = {
    expiredCount: 0,
    totalTokensExpired: 0,
    affectedUsers: [] as string[],
  }

  for (const transaction of allPromotionalTransactions) {
    // Check if metadata has expiryDate
    const metadata = transaction.metadata as any
    if (!metadata?.expiryDate) continue

    const expiryDate = new Date(metadata.expiryDate)
    if (expiryDate > now) continue // Not expired yet

    // Check if already marked as expired
    if (metadata.expired) continue

    const userId = transaction.userId
    const expiredAmount = transaction.amount

    // Only expire if user still has the tokens
    if (transaction.user.tokenBalance >= expiredAmount) {
      // Record expiry transaction
      await recordTokenTransaction({
        userId,
        type: 'EXPIRY',
        amount: -expiredAmount,
        reason: `โทเคนโปรโมชันหมดอายุ (จากรายการ ${transaction.id})`,
        metadata: {
          originalTransactionId: transaction.id,
          expiryDate: expiryDate.toISOString(),
        },
      })

      // Mark original transaction as expired in metadata
      await prisma.tokenTransaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...metadata,
            expired: true,
            expiredAt: now.toISOString(),
          },
        },
      })

      results.expiredCount++
      results.totalTokensExpired += expiredAmount

      if (!results.affectedUsers.includes(userId)) {
        results.affectedUsers.push(userId)
      }
    }
  }

  return results
}

/**
 * Get tokens expiring soon for a user (within next N days)
 */
export async function getExpiringTokens(userId: string, daysAhead: number = 7) {
  const prisma = getPrisma()
  if (!prisma) return []

  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const transactions = await prisma.tokenTransaction.findMany({
    where: {
      userId,
      type: 'PROMOTION',
    },
    select: {
      id: true,
      amount: true,
      reason: true,
      metadata: true,
    },
  })

  // Filter and map transactions with expiry dates
  const expiringTokens = transactions
    .map((tx) => {
      const metadata = tx.metadata as any
      if (!metadata?.expiryDate || metadata.expired) return null

      const expiryDate = new Date(metadata.expiryDate)
      if (expiryDate < new Date() || expiryDate > futureDate) return null

      const daysRemaining = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

      return {
        id: tx.id,
        amount: tx.amount,
        expiresAt: expiryDate,
        daysRemaining,
        reason: tx.reason || 'โปรโมชัน',
      }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime())

  return expiringTokens
}

/**
 * Send notification to users with expiring tokens
 * Should be called 3 days and 1 day before expiry
 */
export async function notifyExpiringTokens(daysAhead: number): Promise<{
  notifiedUsers: number
  totalExpiringTokens: number
  notifications: TokenExpiryNotification[]
}> {
  const prisma = getPrisma()
  if (!prisma) {
    throw new Error('Database not available')
  }

  const startDate = new Date()
  startDate.setDate(startDate.getDate() + daysAhead)
  startDate.setHours(0, 0, 0, 0)

  const endDate = new Date(startDate)
  endDate.setHours(23, 59, 59, 999)

  // Get all promotional transactions
  const transactions = await prisma.tokenTransaction.findMany({
    where: {
      type: 'PROMOTION',
    },
    select: {
      userId: true,
      amount: true,
      metadata: true,
      user: {
        select: {
          email: true,
        },
      },
    },
  })

  // Filter transactions expiring on this specific day
  const expiringTransactions = transactions.filter((tx) => {
    const metadata = tx.metadata as any
    if (!metadata?.expiryDate || metadata.expired) return false

    const expiryDate = new Date(metadata.expiryDate)
    return expiryDate >= startDate && expiryDate <= endDate
  })

  // Group by user
  const userTokens = new Map<string, { amount: number; email: string | null }>()
  for (const tx of expiringTransactions) {
    const current = userTokens.get(tx.userId)
    userTokens.set(tx.userId, {
      amount: (current?.amount ?? 0) + tx.amount,
      email: current?.email ?? tx.user.email ?? null,
    })
  }

  const notifications = buildTokenExpiryNotifications(userTokens, daysAhead)

  return {
    notifiedUsers: notifications.length,
    totalExpiringTokens: notifications.reduce((total, item) => total + item.amount, 0),
    notifications,
  }
}

export function buildTokenExpiryNotifications(
  userTokens: Map<string, { amount: number; email?: string | null }>,
  daysAhead: number,
): TokenExpiryNotification[] {
  return Array.from(userTokens.entries())
    .map(([userId, token]) => {
      const amount = Math.max(0, Math.floor(token.amount))
      if (amount <= 0) return null

      return {
        userId,
        email: token.email ?? null,
        amount,
        daysAhead,
        title: tokenExpiryNotificationTitle(daysAhead),
        message: tokenExpiryNotificationMessage(amount, daysAhead),
      }
    })
    .filter((item): item is TokenExpiryNotification => item !== null)
}

function tokenExpiryNotificationTitle(daysAhead: number) {
  if (daysAhead <= 1) return 'โทเคนโปรโมชันจะหมดอายุพรุ่งนี้'
  return `โทเคนโปรโมชันจะหมดอายุใน ${daysAhead} วัน`
}

function tokenExpiryNotificationMessage(amount: number, daysAhead: number) {
  const when = daysAhead <= 1 ? 'พรุ่งนี้' : `ในอีก ${daysAhead} วัน`
  return `คุณมีโทเคนโปรโมชัน ${amount} โทเคนที่จะหมดอายุ${when} ใช้ก่อนหมดอายุเพื่อไม่ให้เสียสิทธิ์`
}
