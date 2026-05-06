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

export type HealthStatus = Awaited<ReturnType<typeof loadHealthStatus>>

export function readinessFailures(health: HealthStatus) {
  const failures: string[] = []

  if (!health.ok) failures.push('backend health is not ok')
  if (!health.checks.databaseConfigured) failures.push('DATABASE_URL is not configured')
  if (!health.checks.databaseConnected) failures.push('database is not connected')
  if (!health.checks.openRouterConfigured) failures.push('OPENROUTER_API_KEY is not configured')

  for (const name of health.env.missingRequired) {
    failures.push(`${name} is missing`)
  }
  for (const issue of health.env.invalid) {
    failures.push(issue)
  }

  if (health.env.mode === 'production') {
    if (!health.checks.supabaseAuthConfigured) failures.push('Supabase auth is not configured')
    if (!health.checks.adminAuthConfigured) failures.push('ADMIN_API_KEY is not configured')
    if (health.security.avatarStorage !== 'supabase') failures.push('production avatar storage must use Supabase')
    if (health.security.authMode !== 'supabase-jwt') failures.push('production auth mode must use Supabase JWT')
    if (health.security.adminGuard !== 'api-key') failures.push('production admin guard must use an API key')
  }

  return failures
}

export async function loadReadinessStatus() {
  const health = await loadHealthStatus()
  const failures = readinessFailures(health)

  return {
    ...health,
    ok: failures.length === 0,
    healthOk: health.ok,
    readiness: {
      status: failures.length === 0 ? 'ready' : 'not_ready',
      failures,
    },
  }
}
