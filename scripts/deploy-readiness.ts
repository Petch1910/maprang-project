export type HealthPayload = {
  ok: boolean
  checks: {
    databaseConfigured: boolean
    databaseConnected: boolean
    openRouterConfigured: boolean
    imageGenerationConfigured?: boolean
    supabaseAuthConfigured?: boolean
    adminAuthConfigured?: boolean
  }
  security?: {
    authMode?: string
    avatarStorage?: string
    avatarStorageAccess?: string
    signedUrlExpiresIn?: number | null
    corsOrigins?: string[]
  }
  securityPosture?: Record<string, { ok: boolean; detail: string }>
  knowledge?: {
    structured?: {
      ok?: boolean
      fileCount?: number
      missing?: string[]
      errors?: string[]
    }
  }
  model?: {
    name: string
    temperature?: number
    maxOutputTokens?: number
    minRoleplayReplyChars?: number
    providerRetry?: {
      chatAttempts?: number
      chatDelayMs?: number
      creatorDraftAttempts?: number
      creatorDraftDelayMs?: number
    }
    chatProvider?: {
      configured?: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      liveSmokeCommand?: string
    }
    imageGeneration?: {
      configured?: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      model?: string
      liveSmokeCommand?: string
    }
  }
  databaseError?: string
  env?: {
    mode?: 'production' | 'development'
    missingRequired?: string[]
    missingRecommended?: string[]
    invalid?: string[]
  }
}

export type DeployReadiness = {
  productionReady: boolean
  productionBlockers: string[]
  productionFixes: string[]
  stagingReady: boolean
  stagingBlockers: string[]
  stagingFixes: string[]
}

const liveVerificationBlockers = new Set([
  'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
  'live smoke ของระบบสร้างรูปยังไม่ได้ยืนยันผ่าน',
])

export function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return true
  }
}

export function isUnsafeCorsOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
  } catch {
    return true
  }
}

export function buildHealthRows(health: HealthPayload, apiBaseUrl: string) {
  return [
    ['backend', health.ok ? 'ok' : 'not ready'],
    ['apiBaseUrl', apiBaseUrl],
    ['databaseConfigured', String(health.checks.databaseConfigured)],
    ['databaseConnected', String(health.checks.databaseConnected)],
    ['openRouterConfigured', String(health.checks.openRouterConfigured)],
    ['imageGenerationConfigured', String(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured ?? false)],
    ['authMode', health.security?.authMode ?? 'unknown'],
    ['avatarStorage', health.security?.avatarStorage ?? 'unknown'],
    ['avatarStorageAccess', health.security?.avatarStorageAccess ?? 'unknown'],
    ['signedUrlExpiresIn', String(health.security?.signedUrlExpiresIn ?? 'n/a')],
    ['model', health.model?.name ?? 'not configured'],
    ['modelTemperature', String(health.model?.temperature ?? 'default')],
    ['modelMaxOutputTokens', String(health.model?.maxOutputTokens ?? 'default')],
    ['modelMinRoleplayReplyChars', String(health.model?.minRoleplayReplyChars ?? 'default')],
    ['chatProviderRetryAttempts', String(health.model?.providerRetry?.chatAttempts ?? 'default')],
    ['creatorDraftRetryAttempts', String(health.model?.providerRetry?.creatorDraftAttempts ?? 'default')],
    ['chatStatus', health.model?.chatProvider?.status ?? 'unknown'],
    ['chatLiveVerified', String(health.model?.chatProvider?.liveVerified ?? false)],
    ['chatProductionReady', String(health.model?.chatProvider?.productionReady ?? false)],
    ['imageModel', health.model?.imageGeneration?.model ?? 'not configured'],
    ['imageStatus', health.model?.imageGeneration?.status ?? 'unknown'],
    ['imageLiveVerified', String(health.model?.imageGeneration?.liveVerified ?? false)],
    ['imageProductionReady', String(health.model?.imageGeneration?.productionReady ?? false)],
    [
      'securityPosture',
      health.securityPosture
        ? `${Object.values(health.securityPosture).filter((item) => item.ok).length}/${Object.values(health.securityPosture).length} ready`
        : 'not reported',
    ],
    ['structuredKnowledge', health.knowledge?.structured?.ok ? `${health.knowledge.structured.fileCount ?? 0} files ready` : 'not ready'],
  ] satisfies Array<[string, string]>
}

export function evaluateDeployReadiness(
  health: HealthPayload,
  options: {
    isLocalSmokeTarget: boolean
  },
): DeployReadiness {
  const productionBlockers: string[] = []
  const productionFixes: string[] = []

  function addProductionBlocker(blocker: string, fix: string) {
    productionBlockers.push(blocker)
    productionFixes.push(`${blocker}: ${fix}`)
  }

  if (options.isLocalSmokeTarget) {
    addProductionBlocker(
      'backend URL ยังเป็น local',
      'ตั้ง SMOKE_API_BASE_URL และ frontend VITE_API_BASE_URL เป็น deployed backend URL',
    )
  }
  if (health.security?.authMode !== 'supabase-jwt') {
    addProductionBlocker(
      'auth mode ยังไม่ใช่ Supabase JWT',
      'ตั้ง SUPABASE_URL, SUPABASE_JWT_ISSUER, SUPABASE_ANON_KEY, และ SUPABASE_SERVICE_ROLE_KEY ใน backend',
    )
  }
  if (health.security?.avatarStorage !== 'supabase' || health.security?.avatarStorageAccess !== 'signed') {
    addProductionBlocker(
      'avatar storage ยังไม่ใช่ Supabase signed URL',
      'รัน `bun run supabase:storage:setup` แล้วตั้ง STORAGE_PROVIDER=supabase และ SUPABASE_STORAGE_ACCESS=signed บน backend',
    )
  }
  if (!health.security?.corsOrigins?.length || health.security.corsOrigins.some(isUnsafeCorsOrigin)) {
    addProductionBlocker(
      'CORS_ORIGINS ว่าง เป็น local หรือไม่ใช่ https',
      'ตั้ง CORS_ORIGINS เป็น frontend domain จริงแบบ https เท่านั้น',
    )
  }
  if (!health.knowledge?.structured?.ok) {
    addProductionBlocker(
      'คลังความรู้ structured ยังไม่ผ่าน',
      'รัน `bun run knowledge:audit`, แก้ไฟล์ที่หายหรือไม่ถูกต้องใน knowledge/structured แล้วรัน smoke doctor ใหม่',
    )
  }
  if (!health.checks.openRouterConfigured) {
    addProductionBlocker('OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า', 'ตั้ง OPENROUTER_API_KEY ใน secrets ของระบบหลังบ้าน')
  } else if (!(health.model?.chatProvider?.productionReady ?? health.model?.chatProvider?.liveVerified)) {
    addProductionBlocker(
      'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
      `รัน \`${health.model?.chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'}\` หรือ \`bun run api:smoke:live\` กับ staging/production แล้วตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 หลังผ่าน`,
    )
  }
  if (!(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured)) {
    addProductionBlocker(
      'ผู้ให้บริการสร้างรูปยังไม่ได้ตั้งค่า',
      'ตั้ง IMAGE_GENERATION_API_KEY หรือ OPENAI_API_KEY ใน secrets ของระบบหลังบ้าน',
    )
  } else if (!(health.model?.imageGeneration?.productionReady ?? health.model?.imageGeneration?.liveVerified)) {
    addProductionBlocker(
      'live smoke ของระบบสร้างรูปยังไม่ได้ยืนยันผ่าน',
      `รัน \`${health.model?.imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'}\` หรือ \`bun run api:smoke:live\` กับ staging/production แล้วตั้ง IMAGE_GENERATION_LIVE_VERIFIED=1 หลังผ่าน`,
    )
  }
  for (const name of health.env?.missingRequired ?? []) {
    addProductionBlocker(`${name} ยังไม่ได้ตั้งค่า`, `ตั้ง ${name} ใน secrets ของระบบหลังบ้าน หรือแก้ค่าตัวอย่างที่ยังค้างอยู่`)
  }
  for (const issue of health.env?.invalid ?? []) {
    addProductionBlocker(`production env ไม่ถูกต้อง: ${issue}`, 'แก้ค่าตัวแปร production ของระบบหลังบ้านที่ /health รายงาน')
  }

  const productionReady = productionBlockers.length === 0
  const stagingBlockers = productionBlockers.filter((blocker) => !liveVerificationBlockers.has(blocker))
  const stagingFixes = productionFixes.filter((fix) => {
    for (const blocker of liveVerificationBlockers) {
      if (fix.startsWith(`${blocker}:`)) return false
    }
    return true
  })

  return {
    productionReady,
    productionBlockers,
    productionFixes,
    stagingReady: stagingBlockers.length === 0,
    stagingBlockers,
    stagingFixes,
  }
}

export function healthFailures(health: HealthPayload) {
  const failures: string[] = []
  if (!health.ok) failures.push('backend health คืน ok=false')
  if (!health.checks.databaseConfigured) failures.push('DATABASE_URL ยังไม่ได้ตั้งค่า')
  if (!health.checks.databaseConnected) failures.push('ฐานข้อมูลยังเชื่อมต่อไม่ได้')
  return failures
}

export function buildNextDeploySteps(readiness: DeployReadiness) {
  const steps: string[] = []

  if (!readiness.stagingReady) {
    for (const fix of readiness.stagingFixes) steps.push(fix)
    steps.push('รัน `bun run staging:verify` พร้อม SMOKE_API_BASE_URL และ SMOKE_ADMIN_API_KEY')
  } else if (!readiness.productionReady) {
    for (const fix of readiness.productionFixes) steps.push(fix)
    steps.push('รัน `bun run production:check` ใหม่กับ staging/production backend')
  } else {
    steps.push('รัน `bun run production:check` รอบสุดท้ายกับ production backend และ frontend domains')
    steps.push('กรอก `RELEASE_HANDOFF.md` ด้วย deployed URLs, migration status, storage/auth/CORS, live smoke results, known limitations, และ go/no-go notes')
  }

  return steps
}
