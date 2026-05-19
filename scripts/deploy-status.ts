import { apiBaseUrl, isLocalSmokeTarget, readJson } from './smoke-helpers'
import {
  buildHealthRows,
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  type HealthPayload,
} from './deploy-readiness'

const jsonMode = process.argv.includes('--json')

let health: HealthPayload

try {
  health = await readJson<HealthPayload>('/health')
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  if (jsonMode) {
    console.log(JSON.stringify({ ok: false, apiBaseUrl, error: message }, null, 2))
  } else {
    console.error(`Deploy status failed: ${message}`)
    console.error('Local fix: start the backend and database, then rerun `bun run deploy:status`.')
    console.error('Staging fix: set SMOKE_API_BASE_URL to the deployed backend URL.')
  }
  process.exit(1)
}

const readiness = evaluateDeployReadiness(health, { isLocalSmokeTarget })
const nextSteps = buildNextDeploySteps(readiness)
const failures = healthFailures(health)

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        ok: failures.length === 0,
        apiBaseUrl,
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
      },
      null,
      2,
    ),
  )
  process.exit(failures.length > 0 ? 1 : 0)
}

console.log('Maprang Deploy Status')
console.log('=====================')
for (const [name, value] of buildHealthRows(health, apiBaseUrl)) {
  console.log(`${name}: ${value}`)
}

if (health.env?.missingRequired?.length) console.log(`missingRequired: ${health.env.missingRequired.join(', ')}`)
if (health.env?.missingRecommended?.length) console.log(`missingRecommended: ${health.env.missingRecommended.join(', ')}`)
if (health.env?.invalid?.length) console.log(`invalidEnv: ${health.env.invalid.join('; ')}`)
if (health.databaseError) console.log(`databaseError: ${health.databaseError}`)

if (failures.length > 0) {
  console.log(`healthFailures: ${failures.join('; ')}`)
}

console.log('')
console.log(`stagingReady: ${readiness.stagingReady}`)
console.log(`stagingBlockerCount: ${readiness.stagingBlockers.length}`)
console.log(
  readiness.stagingBlockers.length > 0
    ? `stagingBlockers: ${readiness.stagingBlockers.join('; ')}`
    : 'stagingBlockers: none detected',
)
if (readiness.stagingFixes.length > 0) {
  console.log('stagingFixes:')
  for (const fix of readiness.stagingFixes) console.log(`- ${fix}`)
}

console.log('')
console.log(`productionReady: ${readiness.productionReady}`)
console.log(`productionBlockerCount: ${readiness.productionBlockers.length}`)
console.log(
  readiness.productionBlockers.length > 0
    ? `productionBlockers: ${readiness.productionBlockers.join('; ')}`
    : 'productionBlockers: none detected',
)
if (readiness.productionFixes.length > 0) {
  console.log('productionFixes:')
  for (const fix of readiness.productionFixes) console.log(`- ${fix}`)
}

console.log('')
console.log('nextSteps:')
for (const [index, step] of nextSteps.entries()) {
  console.log(`${index + 1}. ${step}`)
}

if (failures.length > 0) process.exit(1)
