import { checkTokenBalance } from './token.service'

// Elysia context types (not Express)
type Context = {
  request: Request
  set: {
    status?: number | string
  }
}

/**
 * Middleware to check if user has enough tokens before allowing action
 * Note: For Elysia, use this as a guard function, not Express middleware
 */
export async function requireTokens(requiredAmount: number) {
  return async (context: Context) => {
    // This is a placeholder for Elysia
    // In actual use, integrate with Elysia's guard system
    const userId = 'user-id' // TODO: Get from Elysia context

    if (!userId) {
      context.set.status = 401
      return {
        error: 'Unauthorized',
        message: 'ต้องเข้าสู่ระบบก่อน',
      }
    }

    const hasEnoughTokens = await checkTokenBalance(userId, requiredAmount)

    if (!hasEnoughTokens) {
      context.set.status = 402
      return {
        error: 'InsufficientTokens',
        message: `ต้องมีโทเคนอย่างน้อย ${requiredAmount} เพื่อดำเนินการต่อ`,
        required: requiredAmount,
        code: 'INSUFFICIENT_TOKENS',
      }
    }

    return null // Pass through
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
