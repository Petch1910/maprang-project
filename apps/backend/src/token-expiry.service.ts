import { getPrisma } from './db'
import { recordTokenTransaction } from './token.service'

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
  const userTokens = new Map<string, number>()
  for (const tx of expiringTransactions) {
    const current = userTokens.get(tx.userId) || 0
    userTokens.set(tx.userId, current + tx.amount)
  }

  // TODO: Send actual notifications (email, in-app, etc.)
  // For now, just log the notification intent
  console.log(
    `[Token Expiry] ${daysAhead} days notice: ${userTokens.size} users with ${Array.from(userTokens.values()).reduce((a, b) => a + b, 0)} expiring tokens`
  )

  return {
    notifiedUsers: userTokens.size,
    totalExpiringTokens: Array.from(userTokens.values()).reduce((a, b) => a + b, 0),
  }
}
