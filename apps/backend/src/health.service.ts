import { getPrisma } from './db'
import {
  adminAuthConfigured,
  allowedOrigins,
  maxInputChars,
  minTokenBalanceForChat,
  modelInputCostPer1M,
  modelName,
  modelOutputCostPer1M,
  supabaseAuthConfigured,
  storageProvider,
} from './config'
import { validateRuntimeEnv } from './env'

export async function loadHealthStatus() {
  const prisma = getPrisma()
  const checks = {
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseConnected: false,
    openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
    adminAuthConfigured,
    supabaseAuthConfigured,
  }

  let databaseError: string | null = null

  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.databaseConnected = true
    } catch (error) {
      databaseError = error instanceof Error ? error.message : 'Unknown database error'
    }
  }

  const ok = checks.databaseConfigured && checks.databaseConnected
  const env = validateRuntimeEnv()

  return {
    ok,
    service: 'maprang-backend',
    checks,
    model: {
      name: modelName,
      inputCostPer1M: modelInputCostPer1M,
      outputCostPer1M: modelOutputCostPer1M,
      maxInputChars,
      minTokenBalanceForChat,
    },
    security: {
      corsOrigins: allowedOrigins,
      authMode: supabaseAuthConfigured ? 'supabase-jwt' : 'local-dev-header',
      adminGuard: adminAuthConfigured ? 'api-key' : 'disabled',
      avatarStorage: storageProvider,
    },
    env: {
      mode: env.mode,
      missingRequired: env.missingRequired,
      missingRecommended: env.missingRecommended,
      invalid: env.invalid,
    },
    databaseError,
    timestamp: new Date().toISOString(),
  }
}
