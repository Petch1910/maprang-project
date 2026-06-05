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
      localFallbackEnabled?: boolean
      forcedLocal?: boolean
      activeRuntimeProvider?: 'local' | 'openrouter' | string
      localModel?: string
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
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname)
  } catch {
    return true
  }
}

export function isUnsafeCorsOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return (
      url.protocol !== 'https:' ||
      ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(url.hostname) ||
      Boolean(url.username) ||
      Boolean(url.password) ||
      url.pathname !== '/' ||
      Boolean(url.search) ||
      Boolean(url.hash)
    )
  } catch {
    return true
  }
}

export function buildHealthRows(health: HealthPayload, apiBaseUrl: string) {
  return [
    ['backend', health.ok ? 'พร้อม' : 'ยังไม่พร้อม'],
    ['apiBaseUrl', apiBaseUrl],
    ['databaseConfigured', String(health.checks.databaseConfigured)],
    ['databaseConnected', String(health.checks.databaseConnected)],
    ['openRouterConfigured', String(health.checks.openRouterConfigured)],
    ['imageGenerationConfigured', String(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured ?? false)],
    ['authMode', health.security?.authMode ?? 'ไม่ทราบ'],
    ['avatarStorage', health.security?.avatarStorage ?? 'ไม่ทราบ'],
    ['avatarStorageAccess', health.security?.avatarStorageAccess ?? 'ไม่ทราบ'],
    ['signedUrlExpiresIn', String(health.security?.signedUrlExpiresIn ?? 'ไม่มี')],
    ['model', health.model?.name ?? 'ยังไม่ได้ตั้งค่า'],
    ['modelTemperature', String(health.model?.temperature ?? 'ค่าเริ่มต้น')],
    ['modelMaxOutputTokens', String(health.model?.maxOutputTokens ?? 'ค่าเริ่มต้น')],
    ['modelMinRoleplayReplyChars', String(health.model?.minRoleplayReplyChars ?? 'ค่าเริ่มต้น')],
    ['chatProviderRetryAttempts', String(health.model?.providerRetry?.chatAttempts ?? 'ค่าเริ่มต้น')],
    ['creatorDraftRetryAttempts', String(health.model?.providerRetry?.creatorDraftAttempts ?? 'ค่าเริ่มต้น')],
    ['chatRuntimeProvider', health.model?.chatProvider?.activeRuntimeProvider ?? 'ไม่ทราบ'],
    ['chatLocalFallbackEnabled', String(health.model?.chatProvider?.localFallbackEnabled ?? false)],
    ['chatForcedLocal', String(health.model?.chatProvider?.forcedLocal ?? false)],
    ['chatLocalModel', health.model?.chatProvider?.localModel ?? 'local/mock-roleplay'],
    ['chatStatus', health.model?.chatProvider?.status ?? 'ไม่ทราบ'],
    ['chatLiveVerified', String(health.model?.chatProvider?.liveVerified ?? false)],
    ['chatProductionReady', String(health.model?.chatProvider?.productionReady ?? false)],
    ['imageModel', health.model?.imageGeneration?.model ?? 'ยังไม่ได้ตั้งค่า'],
    ['imageStatus', health.model?.imageGeneration?.status ?? 'ไม่ทราบ'],
    ['imageLiveVerified', String(health.model?.imageGeneration?.liveVerified ?? false)],
    ['imageProductionReady', String(health.model?.imageGeneration?.productionReady ?? false)],
    [
      'securityPosture',
      health.securityPosture
        ? `${Object.values(health.securityPosture).filter((item) => item.ok).length}/${Object.values(health.securityPosture).length} พร้อม`
        : 'ไม่ได้รายงาน',
    ],
    ['structuredKnowledge', health.knowledge?.structured?.ok ? `${health.knowledge.structured.fileCount ?? 0} ไฟล์พร้อม` : 'ยังไม่พร้อม'],
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
      'ตั้ง SMOKE_API_BASE_URL และ VITE_API_BASE_URL ฝั่งหน้าบ้านเป็น URL ระบบหลังบ้านที่ deploy แล้ว',
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
      'พื้นที่เก็บรูปตัวละครยังไม่ใช่ Supabase signed URL',
      'รัน `bun run supabase:storage:setup` แล้วตั้ง STORAGE_PROVIDER=supabase และ SUPABASE_STORAGE_ACCESS=signed บน backend',
    )
  }
  if (!health.security?.corsOrigins?.length || health.security.corsOrigins.some(isUnsafeCorsOrigin)) {
    addProductionBlocker(
      'CORS_ORIGINS ว่าง เป็น local ไม่ใช่ https หรือไม่ใช่ origin ล้วน',
      'ตั้ง CORS_ORIGINS เป็น origin หน้าบ้านจริงแบบ https เท่านั้น โดยไม่มี credential/userinfo หรือ path/query/hash',
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
      `รัน \`${health.model?.chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'}\` หรือ \`bun run api:smoke:live\` กับสเตจจิงหรือโปรดักชัน แล้วตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 หลังผ่าน`,
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
      `รัน \`${health.model?.imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'}\` หรือ \`bun run api:smoke:live\` กับสเตจจิงหรือโปรดักชัน แล้วตั้ง IMAGE_GENERATION_LIVE_VERIFIED=1 หลังผ่าน`,
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
    steps.push(
      'หลัง backend/frontend staging มี HTTPS origins จริงแล้ว ให้ตั้ง E2E_BASE_URL และ E2E_API_BASE_URL เป็น deployed origins แล้วรัน `bun run e2e:smoke`',
    )
  } else if (!readiness.productionReady) {
    for (const fix of readiness.productionFixes) steps.push(fix)
    steps.push(
      'รัน `bun run api:smoke:live` หนึ่งรอบกับ staging เพื่อยืนยัน normal chat, stream chat, wallet CHAT_USAGE, และ image generation พร้อมกัน',
    )
    steps.push(
      'คัด JSON `handoffEvidence` ลง `RELEASE_HANDOFF.md` ก่อนตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 หรือ IMAGE_GENERATION_LIVE_VERIFIED=1',
    )
    steps.push('รัน `bun run production:check` ใหม่กับระบบหลังบ้านสเตจจิงหรือโปรดักชัน')
  } else {
    steps.push('รัน `bun run production:check` รอบสุดท้ายกับโดเมนระบบหลังบ้านและหน้าบ้านโปรดักชัน')
    steps.push('กรอก `RELEASE_HANDOFF.md` ด้วย URL ที่ deploy แล้ว, สถานะ migration, storage/auth/CORS, ผล live smoke, ข้อจำกัดที่ยังรู้, และบันทึก go/no-go')
  }

  return steps
}
