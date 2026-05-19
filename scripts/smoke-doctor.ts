import { apiBaseUrl, isLocalSmokeTarget, readJson } from './smoke-helpers'
import { buildHealthRows, evaluateDeployReadiness, healthFailures, type HealthPayload } from './deploy-readiness'

let health: HealthPayload
const strictProductionGate =
  process.argv.includes('--strict-production') || process.env.STRICT_PRODUCTION_GATE === '1'
const strictStagingGate =
  process.argv.includes('--strict-staging') || process.env.STRICT_STAGING_GATE === '1'

try {
  health = await readJson<HealthPayload>('/health')
} catch (error) {
  console.error(`Smoke doctor failed: ${error instanceof Error ? error.message : String(error)}`)
  console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
  console.error('Deploy fix: check SMOKE_API_BASE_URL and confirm the deployed backend is reachable.')
  process.exit(1)
}

for (const [name, value] of buildHealthRows(health, apiBaseUrl)) {
  console.log(`${name}: ${value}`)
}

if (health.env?.missingRequired?.length) {
  console.log(`missingRequired: ${health.env.missingRequired.join(', ')}`)
}
if (health.env?.missingRecommended?.length) {
  console.log(`missingRecommended: ${health.env.missingRecommended.join(', ')}`)
}
if (health.env?.invalid?.length) {
  console.log(`invalidEnv: ${health.env.invalid.join('; ')}`)
}

if (health.databaseError) {
  console.log(`databaseError: ${health.databaseError}`)
}

const failures = healthFailures(health)

if (failures.length > 0) {
  console.error(`Smoke doctor failed: ${failures.join('; ')}`)
  console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
  console.error('Deploy fix: check DATABASE_URL, migrations, and networking for the backend service.')
  process.exit(1)
}

if (!health.checks.openRouterConfigured) {
  console.warn('Warning: OPENROUTER_API_KEY is not configured. `smoke:local` can still pass, but `smoke:chat` will fail.')
}
if (!(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured)) {
  console.warn('Warning: image generation provider is not configured. Creator Studio will use placeholder avatars.')
}

const {
  productionReady,
  productionBlockers,
  productionFixes,
  stagingReady,
  stagingBlockers,
  stagingFixes,
} = evaluateDeployReadiness(health, { isLocalSmokeTarget })
console.log(`stagingReady: ${stagingReady}`)
console.log(`stagingBlockerCount: ${stagingBlockers.length}`)
if (stagingBlockers.length > 0) {
  console.log(`stagingBlockers: ${stagingBlockers.join('; ')}`)
  console.log('stagingFixes:')
  for (const fix of stagingFixes) console.log(`- ${fix}`)
  console.log('stagingGate: run `bun run staging:verify` against the deployed staging backend before production verification.')
  if (strictStagingGate) {
    console.error('Staging gate failed. Fix the staging blockers above, then rerun with a deployed backend URL.')
    process.exit(1)
  }
} else {
  console.log('stagingBlockers: none detected')
}

console.log(`productionReady: ${productionReady}`)
console.log(`productionBlockerCount: ${productionBlockers.length}`)

if (productionBlockers.length > 0) {
  console.log(`productionBlockers: ${productionBlockers.join('; ')}`)
  console.log('productionFixes:')
  for (const fix of productionFixes) console.log(`- ${fix}`)
  console.log('productionGate: run `bun run production:check` against the staging/production backend before deploy.')
  if (strictProductionGate) {
    console.error('Production gate failed. Fix the production blockers above, then rerun with a deployed backend URL.')
    process.exit(1)
  }
} else {
  console.log('productionBlockers: none detected')
}

console.log('Smoke doctor passed.')
