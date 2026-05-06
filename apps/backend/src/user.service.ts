import { defaultUserId } from './config'
import { getPrisma } from './db'

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
