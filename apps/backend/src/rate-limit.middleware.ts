import { checkTokenBalance } from './token.service'
import { defaultUserId } from './config'
import { AuthError, authErrorResponse, resolveRequestUserId } from './security'

// Elysia context types (not Express)
type Context = {
  request: Request
  set: {
    status?: number | string
  }
  userId?: string
}

/**
 * Middleware to check if user has enough tokens before allowing action
 * Note: For Elysia, use this as a guard function, not Express middleware
 */
export async function requireTokens(requiredAmount: number) {
  return async (context: Context) => {
    let userId: string
    try {
      userId = await resolveTokenGuardUserId(context)
    } catch (error) {
      context.set.status = 401
      if (error instanceof AuthError) return authErrorResponse(error)
      return { error: 'auth_required', message: 'กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้' }
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

    return null
  }
}

export async function resolveTokenGuardUserId(context: Context) {
  const contextUserId = context.userId?.trim()
  if (contextUserId) return contextUserId
  return resolveRequestUserId(context.request, defaultUserId)
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
