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
  if (!(error instanceof Error)) return 'ข้อผิดพลาดฐานข้อมูลไม่ทราบสาเหตุ'

  const errorWithCode = error as Error & { code?: unknown }
  const code = typeof errorWithCode.code === 'string' ? errorWithCode.code : ''
  const firstUsefulLine =
    error.message
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !/^Invalid\b.*prisma.*invocation/i.test(line)) ?? ''
  const detail = firstUsefulLine && firstUsefulLine !== error.name ? firstUsefulLine : 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ'
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
      detail: supabaseAuthConfigured && adminAuthConfigured ? 'ตั้งค่า Supabase JWT และ admin API key แล้ว' : 'ข้อมูลที่ป้องกันไว้ต้องมี Supabase JWT และ admin API key',
    },
    integrity: {
      ok: databaseConnected,
      detail: databaseConnected
        ? 'Prisma query builder, route id validation, owner guards, และ schema จาก migration พร้อมใช้งาน'
        : 'ต้องเชื่อมต่อฐานข้อมูลให้ผ่านก่อนจึงจะเชื่อถือ data integrity ได้',
    },
    availability: {
      ok: databaseConnected && openRouterConfigured,
      detail: databaseConnected && openRouterConfigured ? 'ฐานข้อมูล, rate-limit buckets, health/readiness, และ model provider checks พร้อมใช้งาน' : 'บริการจะนิ่งได้เมื่อฐานข้อมูลและ OpenRouter เข้าถึงได้ทั้งคู่',
    },
    authentication: {
      ok: supabaseAuthConfigured,
      detail: supabaseAuthConfigured ? 'ตั้งค่า Supabase JWT authentication แล้ว' : 'Production ต้องยืนยันผู้ใช้ด้วย Supabase JWT',
    },
    authorization: {
      ok: true,
      detail: 'Owner/admin checks ครอบคลุม chat, character, lore, report, wallet, และ admin actions',
    },
    accounting: {
      ok: adminAuthConfigured && databaseConnected,
      detail: adminAuthConfigured && databaseConnected ? 'Usage ledger, token transactions, reports, และ admin audit logs พร้อมใช้งาน' : 'Admin audit/accounting ต้องมี admin guard และฐานข้อมูลที่เชื่อมต่อได้',
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

  if (!health.ok) failures.push('สถานะ backend ยังไม่พร้อม')
  if (!health.checks.databaseConfigured) failures.push('DATABASE_URL ยังไม่ได้ตั้งค่า')
  if (!health.checks.databaseConnected) failures.push('ฐานข้อมูลยังเชื่อมต่อไม่ได้')
  if (!health.checks.openRouterConfigured) failures.push('OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า')
  if (!health.knowledge.structured.ok) failures.push('คลังความรู้ structured ยังไม่ผ่านการตรวจ')

  for (const name of health.env.missingRequired) {
    failures.push(`${name} ยังไม่ได้ตั้งค่า`)
  }
  for (const issue of health.env.invalid) {
    failures.push(issue)
  }

  if (health.env.mode === 'production') {
    if (!health.checks.supabaseAuthConfigured) failures.push('Supabase Auth ยังไม่ได้ตั้งค่า')
    if (!health.checks.adminAuthConfigured) failures.push('ADMIN_API_KEY ยังไม่ได้ตั้งค่า')
    if (!health.checks.imageGenerationConfigured) failures.push('IMAGE_GENERATION_API_KEY or OPENAI_API_KEY ยังไม่ได้ตั้งค่า')
    if (!health.model.chatProvider.liveVerified) {
      failures.push('live smoke ของผู้ให้บริการแชทยังไม่ผ่านการยืนยัน')
    }
    if (!health.model.imageGeneration.liveVerified) {
      failures.push('live smoke ของระบบสร้างรูปยังไม่ผ่านการยืนยัน')
    }
    if (health.security.avatarStorage !== 'supabase') failures.push('production avatar storage ต้องใช้ Supabase')
    if (health.security.avatarStorageAccess !== 'signed') failures.push('production avatar storage access ต้องใช้ signed URL')
    if (health.security.authMode !== 'supabase-jwt') failures.push('production auth mode ต้องใช้ Supabase JWT')
    if (health.security.adminGuard !== 'api-key') failures.push('production admin guard ต้องใช้ API key')
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
