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
  'chat provider live smoke is not marked verified',
  'image generation live smoke is not marked verified',
])

export function isLocalOrigin(origin: string) {
  try {
    const url = new URL(origin)
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname)
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
      'backend URL is local',
      'set SMOKE_API_BASE_URL and frontend VITE_API_BASE_URL to the deployed backend URL',
    )
  }
  if (health.security?.authMode !== 'supabase-jwt') {
    addProductionBlocker(
      'auth mode is not Supabase JWT',
      'set SUPABASE_URL, SUPABASE_JWT_ISSUER, SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in the backend',
    )
  }
  if (health.security?.avatarStorage !== 'supabase' || health.security?.avatarStorageAccess !== 'signed') {
    addProductionBlocker(
      'avatar storage is not Supabase signed URL',
      'run `bun run supabase:storage:setup`, then set STORAGE_PROVIDER=supabase and SUPABASE_STORAGE_ACCESS=signed on the backend',
    )
  }
  if (!health.security?.corsOrigins?.length || health.security.corsOrigins.some(isLocalOrigin)) {
    addProductionBlocker('CORS_ORIGINS is empty or local', 'set CORS_ORIGINS to the real frontend domain only')
  }
  if (!health.knowledge?.structured?.ok) {
    addProductionBlocker(
      'structured knowledge is not valid',
      'run `bun run knowledge:audit`, fix missing or invalid files in knowledge/structured, then rerun smoke doctor',
    )
  }
  if (!health.checks.openRouterConfigured) {
    addProductionBlocker('OPENROUTER_API_KEY is missing', 'set OPENROUTER_API_KEY in the backend host secrets')
  } else if (!(health.model?.chatProvider?.productionReady ?? health.model?.chatProvider?.liveVerified)) {
    addProductionBlocker(
      'chat provider live smoke is not marked verified',
      `run \`${health.model?.chatProvider?.liveSmokeCommand ?? 'bun run smoke:chat'}\` or \`bun run api:smoke:live\` against staging/production and set CHAT_PROVIDER_LIVE_VERIFIED=1 after it passes`,
    )
  }
  if (!(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured)) {
    addProductionBlocker(
      'image generation provider is missing',
      'set IMAGE_GENERATION_API_KEY or OPENAI_API_KEY in the backend host secrets',
    )
  } else if (!(health.model?.imageGeneration?.productionReady ?? health.model?.imageGeneration?.liveVerified)) {
    addProductionBlocker(
      'image generation live smoke is not marked verified',
      `run \`${health.model?.imageGeneration?.liveSmokeCommand ?? 'bun run smoke:image:live'}\` or \`bun run api:smoke:live\` against staging/production and set IMAGE_GENERATION_LIVE_VERIFIED=1 after it passes`,
    )
  }
  for (const name of health.env?.missingRequired ?? []) {
    addProductionBlocker(`${name} is missing`, `set ${name} in the backend host secrets or fix the placeholder value`)
  }
  for (const issue of health.env?.invalid ?? []) {
    addProductionBlocker(`invalid env: ${issue}`, 'fix the backend production environment value reported by /health')
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
  if (!health.ok) failures.push('backend health returned ok=false')
  if (!health.checks.databaseConfigured) failures.push('DATABASE_URL is not configured')
  if (!health.checks.databaseConnected) failures.push('database is not connected')
  return failures
}

export function buildNextDeploySteps(readiness: DeployReadiness) {
  const steps: string[] = []

  if (!readiness.stagingReady) {
    for (const fix of readiness.stagingFixes) steps.push(fix)
    steps.push('Run `bun run staging:verify` with SMOKE_API_BASE_URL and SMOKE_ADMIN_API_KEY.')
  } else if (!readiness.productionReady) {
    for (const fix of readiness.productionFixes) steps.push(fix)
    steps.push('Rerun `bun run production:check` against the staging/production backend.')
  } else {
    steps.push('Run `bun run production:check` one final time against the production backend and frontend domains.')
    steps.push('Fill `RELEASE_HANDOFF.md` with deployed URLs, migration status, storage/auth/CORS, live smoke results, known limitations, and go/no-go notes.')
  }

  return steps
}
