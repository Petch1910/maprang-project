import { getPrisma } from './db'
import { recordTokenTransaction } from './token.service'

interface DailyLoginResult {
  rewarded: boolean
  tokensEarned: number
  currentStreak: number
  message: string
}

/**
 * Process daily login reward for user
 * Awards tokens for consecutive daily logins with streak bonus
 */
export async function processDailyLogin(userId: string): Promise<DailyLoginResult> {
  const prisma = getPrisma()
  if (!prisma) {
    throw new Error('Database not available')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of today

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1) // Start of yesterday

  // Get user's last login transaction
  const lastLogin = await prisma.tokenTransaction.findFirst({
    where: {
      userId,
      type: 'DAILY_LOGIN',
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Check if already claimed today
  if (lastLogin && lastLogin.createdAt >= today) {
    return {
      rewarded: false,
      tokensEarned: 0,
      currentStreak: await getCurrentStreak(userId),
      message: 'คุณได้รับโทเคนประจำวันแล้ววันนี้',
    }
  }

  // Calculate streak
  let streak = 1
  if (lastLogin && lastLogin.createdAt >= yesterday && lastLogin.createdAt < today) {
    // Consecutive day - increase streak
    const metadata = lastLogin.metadata as { streak?: number } | null
    streak = (metadata?.streak ?? 0) + 1
  }
  // If more than 1 day gap, streak resets to 1

  // Calculate reward: base 10 + streak bonus
  const baseReward = 10
  const streakBonus = Math.min(streak - 1, 10) * 2 // Max +20 tokens at 11+ day streak
  const totalReward = baseReward + streakBonus

  // Record transaction
  await recordTokenTransaction({
    userId,
    type: 'DAILY_LOGIN',
    amount: totalReward,
    reason: `เข้าสู่ระบบประจำวัน (Streak: ${streak} วัน)`,
    metadata: { streak },
  })

  return {
    rewarded: true,
    tokensEarned: totalReward,
    currentStreak: streak,
    message: `รับโทเคน ${totalReward} (เข้าสู่ระบบติดต่อกัน ${streak} วัน) 🔥`,
  }
}

/**
 * Get user's current login streak
 */
export async function getCurrentStreak(userId: string): Promise<number> {
  const prisma = getPrisma()
  if (!prisma) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Get last login
  const lastLogin = await prisma.tokenTransaction.findFirst({
    where: {
      userId,
      type: 'DAILY_LOGIN',
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  if (!lastLogin) return 0

  const loginDate = new Date(lastLogin.createdAt)
  loginDate.setHours(0, 0, 0, 0)

  // Check if login was today or yesterday
  if (loginDate >= yesterday) {
    const metadata = lastLogin.metadata as { streak?: number } | null
    return metadata?.streak ?? 1
  }

  // Streak broken
  return 0
}

/**
 * Get daily login statistics for user
 */
export async function getDailyLoginStats(userId: string) {
  const prisma = getPrisma()
  if (!prisma) {
    return {
      currentStreak: 0,
      totalLogins: 0,
      longestStreak: 0,
      canClaimToday: false,
    }
  }

  const currentStreak = await getCurrentStreak(userId)

  const transactions = await prisma.tokenTransaction.findMany({
    where: {
      userId,
      type: 'DAILY_LOGIN',
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 100,
  })

  const totalLogins = transactions.length

  // Calculate longest streak from history
  let longestStreak = 0
  for (const tx of transactions) {
    const metadata = tx.metadata as { streak?: number } | null
    const streak = metadata?.streak ?? 1
    if (streak > longestStreak) {
      longestStreak = streak
    }
  }

  // Check if can claim today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const lastLogin = transactions[0]
  const canClaimToday = !lastLogin || new Date(lastLogin.createdAt) < today

  return {
    currentStreak,
    totalLogins,
    longestStreak,
    canClaimToday,
    nextReward: canClaimToday ? 10 + Math.min(currentStreak, 10) * 2 : 0,
  }
}
