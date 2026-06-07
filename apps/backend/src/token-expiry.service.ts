import { getPrisma } from './db'
import { recordTokenTransaction } from './token.service'

/**
 * Expire promotional tokens that have passed their expiry date
 * Called by cron job daily
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

  // Find all promotional transactions that have expiry date and not yet expired
  const expiredTransactions = await prisma.tokenTransaction.findMany({
    where: {
      type: 'PROMOTION',
      expiresAt: {
        lte: now, // Expired
      },
      // Only get ones that haven't been marked as expired yet
      NOT: {
        metadata: {
          path: ['expired'],
          equals: true,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
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

  for (const transaction of expiredTransactions) {
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
          expiryDate: transaction.expiresAt?.toISOString(),
        },
      })

      // Mark original transaction as expired
      await prisma.tokenTransaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata as object),
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

  const expiringTransactions = await prisma.tokenTransaction.findMany({
    where: {
      userId,
      type: 'PROMOTION',
      expiresAt: {
        gte: new Date(),
        lte: futureDate,
      },
      NOT: {
        metadata: {
          path: ['expired'],
          equals: true,
        },
      },
    },
    orderBy: {
      expiresAt: 'asc',
    },
  })

  return expiringTransactions.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    expiresAt: tx.expiresAt,
    daysRemaining: Math.ceil(
      ((tx.expiresAt?.getTime() || 0) - Date.now()) / (1000 * 60 * 60 * 24)
    ),
    reason: tx.reason,
  }))
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

  // Find tokens expiring on this specific day
  const expiringTransactions = await prisma.tokenTransaction.findMany({
    where: {
      type: 'PROMOTION',
      expiresAt: {
        gte: startDate,
        lte: endDate,
      },
      NOT: {
        metadata: {
          path: ['expired'],
          equals: true,
        },
      },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
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
