import { apiBaseUrl, readJson } from './smoke-helpers'

type HealthPayload = {
  ok: boolean
  checks: {
    databaseConfigured: boolean
    databaseConnected: boolean
    openRouterConfigured: boolean
    supabaseAuthConfigured?: boolean
    adminAuthConfigured?: boolean
  }
  security?: {
    authMode?: string
    avatarStorage?: string
    corsOrigins?: string[]
  }
  model?: {
    name: string
  }
  databaseError?: string
  env?: {
    missingRecommended?: string[]
  }
}

let health: HealthPayload

try {
  health = await readJson<HealthPayload>('/health')
} catch (error) {
  console.error(`Smoke doctor failed: ${error instanceof Error ? error.message : String(error)}`)
  console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
  console.error('Deploy fix: check SMOKE_API_BASE_URL and confirm the deployed backend is reachable.')
  process.exit(1)
}

const rows = [
  ['backend', health.ok ? 'ok' : 'not ready'],
  ['apiBaseUrl', apiBaseUrl],
  ['databaseConfigured', String(health.checks.databaseConfigured)],
  ['databaseConnected', String(health.checks.databaseConnected)],
  ['openRouterConfigured', String(health.checks.openRouterConfigured)],
  ['authMode', health.security?.authMode ?? 'unknown'],
  ['avatarStorage', health.security?.avatarStorage ?? 'unknown'],
  ['model', health.model?.name ?? 'not configured'],
]

for (const [name, value] of rows) {
  console.log(`${name}: ${value}`)
}

if (health.env?.missingRecommended?.length) {
  console.log(`missingRecommended: ${health.env.missingRecommended.join(', ')}`)
}

if (health.databaseError) {
  console.log(`databaseError: ${health.databaseError}`)
}

const failures: string[] = []
if (!health.ok) failures.push('backend health returned ok=false')
if (!health.checks.databaseConfigured) failures.push('DATABASE_URL is not configured')
if (!health.checks.databaseConnected) failures.push('database is not connected')

if (failures.length > 0) {
  console.error(`Smoke doctor failed: ${failures.join('; ')}`)
  console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, run migrations, then start the backend.')
  console.error('Deploy fix: check DATABASE_URL, migrations, and networking for the backend service.')
  process.exit(1)
}

if (!health.checks.openRouterConfigured) {
  console.warn('Warning: OPENROUTER_API_KEY is not configured. `smoke:local` can still pass, but `smoke:chat` will fail.')
}

console.log('Smoke doctor passed.')
