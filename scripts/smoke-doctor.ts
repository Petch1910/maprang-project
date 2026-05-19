import { apiBaseUrl, isLocalSmokeTarget, readJson } from './smoke-helpers'
import {
  buildHealthRows,
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  type HealthPayload,
} from './deploy-readiness'

const recommendedRoleplayMaxOutputTokens = 1600
const recommendedMinRoleplayReplyChars = 420

export type SmokeDoctorReport = {
  exitCode: number
  stdout: string[]
  stderr: string[]
  warnings: string[]
}

export function buildSmokeDoctorReport(
  health: HealthPayload,
  options: {
    apiBaseUrl: string
    isLocalSmokeTarget: boolean
    strictProductionGate?: boolean
    strictStagingGate?: boolean
  },
): SmokeDoctorReport {
  const stdout: string[] = []
  const stderr: string[] = []
  const warnings: string[] = []

  for (const [name, value] of buildHealthRows(health, options.apiBaseUrl)) {
    stdout.push(`${name}: ${value}`)
  }

  if (health.env?.missingRequired?.length) stdout.push(`missingRequired: ${health.env.missingRequired.join(', ')}`)
  if (health.env?.missingRecommended?.length) {
    stdout.push(`missingRecommended: ${health.env.missingRecommended.join(', ')}`)
  }
  if (health.env?.invalid?.length) stdout.push(`invalidEnv: ${health.env.invalid.join('; ')}`)
  if (health.databaseError) stdout.push(`databaseError: ${health.databaseError}`)

  const failures = healthFailures(health)

  if (failures.length > 0) {
    stderr.push(`Smoke doctor failed: ${failures.join('; ')}`)
    stderr.push('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
    stderr.push('Deploy fix: check DATABASE_URL, migrations, and networking for the backend service.')
    return { exitCode: 1, stdout, stderr, warnings }
  }

  if (!health.checks.openRouterConfigured) {
    warnings.push('Warning: OPENROUTER_API_KEY is not configured. `smoke:local` can still pass, but `smoke:chat` will fail.')
  }
  if (!(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured)) {
    warnings.push('Warning: image generation provider is not configured. Creator Studio will use placeholder avatars.')
  }
  if (health.model) {
    const maxOutputTokens = health.model.maxOutputTokens ?? 0
    const minRoleplayReplyChars = health.model.minRoleplayReplyChars ?? 0
    if (
      maxOutputTokens > 0 &&
      minRoleplayReplyChars > 0 &&
      (maxOutputTokens < recommendedRoleplayMaxOutputTokens ||
        minRoleplayReplyChars < recommendedMinRoleplayReplyChars)
    ) {
      warnings.push(
        `Warning: roleplay reply budget is below the recommended ${recommendedRoleplayMaxOutputTokens}/${recommendedMinRoleplayReplyChars}. Current MODEL_MAX_OUTPUT_TOKENS=${maxOutputTokens}, MODEL_MIN_ROLEPLAY_REPLY_CHARS=${minRoleplayReplyChars}.`,
      )
    }
  }

  const {
    productionReady,
    productionBlockers,
    productionFixes,
    stagingReady,
    stagingBlockers,
    stagingFixes,
  } = evaluateDeployReadiness(health, { isLocalSmokeTarget: options.isLocalSmokeTarget })

  stdout.push(`stagingReady: ${stagingReady}`)
  stdout.push(`stagingBlockerCount: ${stagingBlockers.length}`)
  if (stagingBlockers.length > 0) {
    stdout.push(`stagingBlockers: ${stagingBlockers.join('; ')}`)
    stdout.push('stagingFixes:')
    for (const fix of stagingFixes) stdout.push(`- ${fix}`)
    stdout.push('stagingGate: run `bun run staging:verify` against the deployed staging backend before production verification.')
    if (options.strictStagingGate) {
      stderr.push('Staging gate failed. Fix the staging blockers above, then rerun with a deployed backend URL.')
      return { exitCode: 1, stdout, stderr, warnings }
    }
  } else {
    stdout.push('stagingBlockers: none detected')
  }

  stdout.push(`productionReady: ${productionReady}`)
  stdout.push(`productionBlockerCount: ${productionBlockers.length}`)

  if (productionBlockers.length > 0) {
    stdout.push(`productionBlockers: ${productionBlockers.join('; ')}`)
    stdout.push('productionFixes:')
    for (const fix of productionFixes) stdout.push(`- ${fix}`)
    stdout.push('productionGate: run `bun run production:check` against the staging/production backend before deploy.')
    if (options.strictProductionGate) {
      stderr.push('Production gate failed. Fix the production blockers above, then rerun with a deployed backend URL.')
      return { exitCode: 1, stdout, stderr, warnings }
    }
  } else {
    stdout.push('productionBlockers: none detected')
  }

  const nextSteps = buildNextDeploySteps({
    productionReady,
    productionBlockers,
    productionFixes,
    stagingReady,
    stagingBlockers,
    stagingFixes,
  })
  stdout.push('nextSteps:')
  for (const [index, step] of nextSteps.entries()) {
    stdout.push(`${index + 1}. ${step}`)
  }

  stdout.push('Smoke doctor passed.')
  return { exitCode: 0, stdout, stderr, warnings }
}

export async function runSmokeDoctor(argv = process.argv) {
  const strictProductionGate = argv.includes('--strict-production') || process.env.STRICT_PRODUCTION_GATE === '1'
  const strictStagingGate = argv.includes('--strict-staging') || process.env.STRICT_STAGING_GATE === '1'

  let health: HealthPayload
  try {
    health = await readJson<HealthPayload>('/health')
  } catch (error) {
    console.error(`Smoke doctor failed: ${error instanceof Error ? error.message : String(error)}`)
    console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
    console.error('Deploy fix: check SMOKE_API_BASE_URL and confirm the deployed backend is reachable.')
    return 1
  }

  const report = buildSmokeDoctorReport(health, {
    apiBaseUrl,
    isLocalSmokeTarget,
    strictProductionGate,
    strictStagingGate,
  })

  for (const line of report.stdout) console.log(line)
  for (const warning of report.warnings) console.warn(warning)
  for (const line of report.stderr) console.error(line)

  return report.exitCode
}

if (import.meta.main) {
  process.exit(await runSmokeDoctor())
}
