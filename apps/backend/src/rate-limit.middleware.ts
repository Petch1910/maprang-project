import { checkTokenBalance } from './token.service'
import type { Request, Response, NextFunction } from 'express'

/**
 * Middleware to check if user has enough tokens before allowing action
 */
export async function requireTokens(requiredAmount: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'ต้องเข้าสู่ระบบก่อน',
      })
    }

    const hasEnoughTokens = await checkTokenBalance(userId, requiredAmount)

    if (!hasEnoughTokens) {
      return res.status(402).json({
        error: 'InsufficientTokens',
        message: `ต้องมีโทเคนอย่างน้อย ${requiredAmount} เพื่อดำเนินการต่อ`,
        required: requiredAmount,
        code: 'INSUFFICIENT_TOKENS',
      })
    }

    next()
  }
}

/**
 * Get user's current token balance and check if sufficient for action
 */
export async function getTokenStatus(userId: string, requiredTokens: number) {
  const hasEnough = await checkTokenBalance(userId, requiredTokens)

  return {
    hasEnough,
    required: requiredTokens,
    // Note: Actual balance not returned for security, only boolean check
  }
}
