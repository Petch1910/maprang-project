import { apiBaseUrl, isLocalSmokeTarget, readJson } from './smoke-helpers'
import {
  buildHealthRows,
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  type DeployReadiness,
  type HealthPayload,
} from './deploy-readiness'

type DeployStatusPayload = {
  ok: boolean
  apiBaseUrl: string
  stagingReady: boolean
  stagingBlockerCount: number
  productionReady: boolean
  productionBlockerCount: number
  health: {
    backend: boolean
    databaseConfigured: boolean
    databaseConnected: boolean
    openRouterConfigured: boolean
    imageGenerationConfigured: boolean
    authMode: string
    avatarStorage: string
    avatarStorageAccess: string
    chatStatus: string
    imageStatus: string
  }
  readiness: DeployReadiness
  nextSteps: string[]
  failures: string[]
}

export type DeployStatusRunnerOptions = {
  argv?: string[]
  readHealth?: () => Promise<HealthPayload>
  currentApiBaseUrl?: string
  currentIsLocalSmokeTarget?: boolean
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function buildDeployStatusPayload(
  health: HealthPayload,
  options: { apiBaseUrl: string; isLocalSmokeTarget: boolean },
): DeployStatusPayload {
  const readiness = evaluateDeployReadiness(health, { isLocalSmokeTarget: options.isLocalSmokeTarget })
  const nextSteps = buildNextDeploySteps(readiness)
  const failures = healthFailures(health)

  return {
    ok: failures.length === 0,
    apiBaseUrl: options.apiBaseUrl,
    stagingReady: readiness.stagingReady,
    stagingBlockerCount: readiness.stagingBlockers.length,
    productionReady: readiness.productionReady,
    productionBlockerCount: readiness.productionBlockers.length,
    health: {
      backend: health.ok,
      databaseConfigured: health.checks.databaseConfigured,
      databaseConnected: health.checks.databaseConnected,
      openRouterConfigured: health.checks.openRouterConfigured,
      imageGenerationConfigured: health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured ?? false,
      authMode: health.security?.authMode ?? 'unknown',
      avatarStorage: health.security?.avatarStorage ?? 'unknown',
      avatarStorageAccess: health.security?.avatarStorageAccess ?? 'unknown',
      chatStatus: health.model?.chatProvider?.status ?? 'unknown',
      imageStatus: health.model?.imageGeneration?.status ?? 'unknown',
    },
    readiness,
    nextSteps,
    failures,
  }
}

export function formatDeployStatusText(
  health: HealthPayload,
  options: { apiBaseUrl: string; isLocalSmokeTarget: boolean },
) {
  const payload = buildDeployStatusPayload(health, options)
  const { readiness, nextSteps, failures } = payload
  const lines = ['Maprang Deploy Status', '=====================']

  for (const [name, value] of buildHealthRows(health, options.apiBaseUrl)) {
    lines.push(`${name}: ${value}`)
  }

  if (health.env?.missingRequired?.length) lines.push(`missingRequired: ${health.env.missingRequired.join(', ')}`)
  if (health.env?.missingRecommended?.length) lines.push(`missingRecommended: ${health.env.missingRecommended.join(', ')}`)
  if (health.env?.invalid?.length) lines.push(`invalidEnv: ${health.env.invalid.join('; ')}`)
  if (health.databaseError) lines.push(`databaseError: ${health.databaseError}`)
  if (failures.length > 0) lines.push(`healthFailures: ${failures.join('; ')}`)

  lines.push('')
  lines.push(`stagingReady: ${readiness.stagingReady}`)
  lines.push(`stagingBlockerCount: ${readiness.stagingBlockers.length}`)
  lines.push(
    readiness.stagingBlockers.length > 0
      ? `stagingBlockers: ${readiness.stagingBlockers.join('; ')}`
      : 'stagingBlockers: none detected',
  )
  if (readiness.stagingFixes.length > 0) {
    lines.push('stagingFixes:')
    for (const fix of readiness.stagingFixes) lines.push(`- ${fix}`)
  }

  lines.push('')
  lines.push(`productionReady: ${readiness.productionReady}`)
  lines.push(`productionBlockerCount: ${readiness.productionBlockers.length}`)
  lines.push(
    readiness.productionBlockers.length > 0
      ? `productionBlockers: ${readiness.productionBlockers.join('; ')}`
      : 'productionBlockers: none detected',
  )
  if (readiness.productionFixes.length > 0) {
    lines.push('productionFixes:')
    for (const fix of readiness.productionFixes) lines.push(`- ${fix}`)
  }

  lines.push('')
  lines.push('nextSteps:')
  for (const [index, step] of nextSteps.entries()) {
    lines.push(`${index + 1}. ${step}`)
  }

  return lines.join('\n')
}

export async function runDeployStatus(options: DeployStatusRunnerOptions | string[] = {}) {
  const normalized = Array.isArray(options) ? { argv: options } : options
  const argv = normalized.argv ?? process.argv
  const currentApiBaseUrl = normalized.currentApiBaseUrl ?? apiBaseUrl
  const currentIsLocalSmokeTarget = normalized.currentIsLocalSmokeTarget ?? isLocalSmokeTarget
  const writeLine = normalized.writeLine ?? ((line: string) => console.log(line))
  const writeError = normalized.writeError ?? ((line: string) => console.error(line))
  const readHealth = normalized.readHealth ?? (() => readJson<HealthPayload>('/health'))
  const jsonMode = argv.includes('--json')
  let health: HealthPayload

  try {
    health = await readHealth()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (jsonMode) {
      writeLine(JSON.stringify({ ok: false, apiBaseUrl: currentApiBaseUrl, error: message }, null, 2))
    } else {
      writeError(`Deploy status failed: ${message}`)
      writeError('Local fix: start the backend and database, then rerun `bun run deploy:status`.')
      writeError('Staging fix: set SMOKE_API_BASE_URL to the deployed backend URL.')
    }
    return 1
  }

  if (jsonMode) {
    const payload = buildDeployStatusPayload(health, {
      apiBaseUrl: currentApiBaseUrl,
      isLocalSmokeTarget: currentIsLocalSmokeTarget,
    })
    writeLine(JSON.stringify(payload, null, 2))
    return payload.failures.length > 0 ? 1 : 0
  }

  const text = formatDeployStatusText(health, {
    apiBaseUrl: currentApiBaseUrl,
    isLocalSmokeTarget: currentIsLocalSmokeTarget,
  })
  writeLine(text)
  return healthFailures(health).length > 0 ? 1 : 0
}

if (import.meta.main) process.exit(await runDeployStatus())
