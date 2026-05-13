import { getPrisma } from './db'
import {
  adminAuthConfigured,
  allowedOrigins,
  chatProviderRetryAttempts,
  chatProviderRetryDelayMs,
  creatorDraftRetryAttempts,
  creatorDraftRetryDelayMs,
  imageGenerationConfigured,
  imageGenerationModel,
  maxInputChars,
  minTokenBalanceForChat,
  modelInputCostPer1M,
  modelMaxOutputTokens,
  modelMinRoleplayReplyChars,
  modelName,
  modelOutputCostPer1M,
  modelTemperature,
  promptBudgetTokens,
  promptHistoryMaxMessages,
  supabaseAuthConfigured,
  storageProvider,
} from './config'
import { validateRuntimeEnv } from './env'
import { structuredKnowledgeHealth } from './knowledge.service'
import { supabaseSignedUrlExpiresInSeconds, supabaseStorageAccess } from './storage.service'

export function summarizeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return 'Unknown database error'

  const errorWithCode = error as Error & { code?: unknown }
  const code = typeof errorWithCode.code === 'string' ? errorWithCode.code : ''
  const firstUsefulLine =
    error.message
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !/^Invalid\b.*prisma.*invocation/i.test(line)) ?? ''
  const detail = firstUsefulLine && firstUsefulLine !== error.name ? firstUsefulLine : 'database connection failed'
  const suffix = code ? ` (${code})` : ''

  return `${error.name}${suffix}: ${detail}`
}

function securityPosture({
  databaseConnected,
  openRouterConfigured,
}: {
  databaseConnected: boolean
  openRouterConfigured: boolean
}) {
  return {
    confidentiality: {
      ok: supabaseAuthConfigured && adminAuthConfigured,
      detail: supabaseAuthConfigured && adminAuthConfigured ? 'Supabase JWT and admin API key are configured.' : 'Supabase JWT and admin API key must be configured for protected data.',
    },
    integrity: {
      ok: databaseConnected,
      detail: databaseConnected
        ? 'Prisma query builder, route id validation, owner guards, and migration-backed schema are active.'
        : 'Database connectivity must pass before data integrity can be trusted.',
    },
    availability: {
      ok: databaseConnected && openRouterConfigured,
      detail: databaseConnected && openRouterConfigured ? 'Database, rate-limit buckets, health/readiness, and model provider checks are available.' : 'Database and OpenRouter must both be reachable for stable service.',
    },
    authentication: {
      ok: supabaseAuthConfigured,
      detail: supabaseAuthConfigured ? 'Supabase JWT authentication is configured.' : 'Production must authenticate users with Supabase JWT.',
    },
    authorization: {
      ok: true,
      detail: 'Owner/admin checks cover chat, character, lore, report, wallet, and admin actions.',
    },
    accounting: {
      ok: adminAuthConfigured && databaseConnected,
      detail: adminAuthConfigured && databaseConnected ? 'Usage ledger, token transactions, reports, and admin audit logs are available.' : 'Admin audit/accounting requires admin guard and database connectivity.',
    },
  }
}

export async function loadHealthStatus() {
  const prisma = getPrisma()
  const chatLiveVerified = process.env.CHAT_PROVIDER_LIVE_VERIFIED === '1'
  const imageLiveVerified = process.env.IMAGE_GENERATION_LIVE_VERIFIED === '1'
  const chatProviderConfigured = Boolean(process.env.OPENROUTER_API_KEY)
  const chatProviderStatus = !chatProviderConfigured
    ? 'missing_provider'
    : chatLiveVerified
      ? 'verified'
      : 'needs_live_smoke'
  const imageGenerationStatus = !imageGenerationConfigured
    ? 'missing_provider'
    : imageLiveVerified
      ? 'verified'
      : 'needs_live_smoke'
  const checks = {
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseConnected: false,
    openRouterConfigured: chatProviderConfigured,
    imageGenerationConfigured,
    adminAuthConfigured,
    supabaseAuthConfigured,
  }

  let databaseError: string | null = null

  if (prisma) {
    try {
      await prisma.$queryRaw`SELECT 1`
      checks.databaseConnected = true
    } catch (error) {
      databaseError = summarizeDatabaseError(error)
    }
  }

  const ok = checks.databaseConfigured && checks.databaseConnected
  const env = validateRuntimeEnv({ throwOnError: false })
  const knowledge = structuredKnowledgeHealth()

  return {
    ok,
    service: 'maprang-backend',
    checks,
    model: {
      name: modelName,
      inputCostPer1M: modelInputCostPer1M,
      outputCostPer1M: modelOutputCostPer1M,
      temperature: modelTemperature,
      maxOutputTokens: modelMaxOutputTokens,
      minRoleplayReplyChars: modelMinRoleplayReplyChars,
      promptBudgetTokens,
      promptHistoryMaxMessages,
      maxInputChars,
      minTokenBalanceForChat,
      providerRetry: {
        chatAttempts: chatProviderRetryAttempts,
        chatDelayMs: chatProviderRetryDelayMs,
        creatorDraftAttempts: creatorDraftRetryAttempts,
        creatorDraftDelayMs: creatorDraftRetryDelayMs,
      },
      chatProvider: {
        configured: chatProviderConfigured,
        liveVerified: chatLiveVerified,
        productionReady: chatProviderConfigured && chatLiveVerified,
        status: chatProviderStatus,
        liveSmokeCommand: 'bun run smoke:chat',
      },
      imageGeneration: {
        configured: imageGenerationConfigured,
        liveVerified: imageLiveVerified,
        productionReady: imageGenerationConfigured && imageLiveVerified,
        status: imageGenerationStatus,
        model: imageGenerationModel,
        liveSmokeCommand: 'bun run smoke:image:live',
      },
    },
    security: {
      corsOrigins: allowedOrigins,
      authMode: supabaseAuthConfigured ? 'supabase-jwt' : 'local-dev-header',
      adminGuard: adminAuthConfigured ? 'api-key' : 'disabled',
      avatarStorage: storageProvider,
      avatarStorageAccess: storageProvider === 'supabase' ? supabaseStorageAccess : 'local',
      signedUrlExpiresIn: storageProvider === 'supabase' ? supabaseSignedUrlExpiresInSeconds : null,
    },
    securityPosture: securityPosture({
      databaseConnected: checks.databaseConnected,
      openRouterConfigured: checks.openRouterConfigured,
    }),
    knowledge: {
      structured: {
        ok: knowledge.ok,
        fileCount: knowledge.files.length,
        missing: knowledge.missing,
        errors: knowledge.errors,
        files: knowledge.files.map((file) => ({
          file: file.file,
          ok: file.ok,
          id: file.id,
          schemaVersion: file.schemaVersion,
          updatedAt: file.updatedAt,
          errors: file.errors,
        })),
      },
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
  if (!health.knowledge.structured.ok) failures.push('structured knowledge is not valid')

  for (const name of health.env.missingRequired) {
    failures.push(`${name} is missing`)
  }
  for (const issue of health.env.invalid) {
    failures.push(issue)
  }

  if (health.env.mode === 'production') {
    if (!health.checks.supabaseAuthConfigured) failures.push('Supabase auth is not configured')
    if (!health.checks.adminAuthConfigured) failures.push('ADMIN_API_KEY is not configured')
    if (!health.checks.imageGenerationConfigured) failures.push('IMAGE_GENERATION_API_KEY or OPENAI_API_KEY is not configured')
    if (!health.model.imageGeneration.liveVerified) {
      failures.push('image generation live smoke has not been verified')
    }
    if (health.security.avatarStorage !== 'supabase') failures.push('production avatar storage must use Supabase')
    if (health.security.avatarStorageAccess !== 'signed') failures.push('production avatar storage access must use signed URLs')
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
