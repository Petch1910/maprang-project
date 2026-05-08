import { describe, expect, test } from 'bun:test'
import { readinessFailures, summarizeDatabaseError, type HealthStatus } from './health.service'

type HealthOverrides = Partial<Omit<HealthStatus, 'checks' | 'model' | 'security' | 'env'>> & {
  checks?: Partial<HealthStatus['checks']>
  model?: Partial<HealthStatus['model']>
  security?: Partial<HealthStatus['security']>
  securityPosture?: Partial<HealthStatus['securityPosture']>
  env?: Partial<HealthStatus['env']>
}

function health(overrides: HealthOverrides = {}): HealthStatus {
  const base: HealthStatus = {
    ok: true,
    service: 'maprang-backend',
    checks: {
      databaseConfigured: true,
      databaseConnected: true,
      openRouterConfigured: true,
      imageGenerationConfigured: true,
      adminAuthConfigured: true,
      supabaseAuthConfigured: true,
    },
    model: {
      name: 'google/gemini-2.0-flash-001',
      inputCostPer1M: 0.1,
      outputCostPer1M: 0.4,
      temperature: 0.85,
      maxOutputTokens: 900,
      maxInputChars: 4000,
      minTokenBalanceForChat: 1,
      imageGeneration: {
        configured: true,
        model: 'gpt-image-1.5',
      },
    },
    security: {
      corsOrigins: ['https://app.example.com'],
      authMode: 'supabase-jwt',
      adminGuard: 'api-key',
      avatarStorage: 'supabase',
      avatarStorageAccess: 'signed',
      signedUrlExpiresIn: 3600,
    },
    securityPosture: {
      confidentiality: { ok: true, detail: 'Supabase JWT and admin API key are configured.' },
      integrity: { ok: true, detail: 'Prisma query builder and owner guards are active.' },
      availability: { ok: true, detail: 'Database and model provider checks are available.' },
      authentication: { ok: true, detail: 'Supabase JWT authentication is configured.' },
      authorization: { ok: true, detail: 'Owner/admin checks cover protected actions.' },
      accounting: { ok: true, detail: 'Usage ledger and admin audit logs are available.' },
    },
    env: {
      mode: 'production',
      missingRequired: [],
      missingRecommended: [],
      invalid: [],
    },
    databaseError: null,
    timestamp: new Date().toISOString(),
  }

  return {
    ...base,
    ...overrides,
    checks: { ...base.checks, ...overrides.checks },
    model: { ...base.model, ...overrides.model },
    security: { ...base.security, ...overrides.security },
    securityPosture: { ...base.securityPosture, ...overrides.securityPosture },
    env: { ...base.env, ...overrides.env },
  }
}

describe('readiness gate', () => {
  test('summarizes Prisma database errors with code and useful message', () => {
    const error = new Error('\nInvalid `prisma.$queryRaw()` invocation:\n\nconnect ECONNREFUSED 127.0.0.1:5432')
    error.name = 'PrismaClientKnownRequestError'
    ;(error as Error & { code: string }).code = 'ECONNREFUSED'

    expect(summarizeDatabaseError(error)).toBe(
      'PrismaClientKnownRequestError (ECONNREFUSED): connect ECONNREFUSED 127.0.0.1:5432',
    )
  })

  test('accepts a complete production health status', () => {
    expect(readinessFailures(health())).toEqual([])
  })

  test('requires database and OpenRouter readiness', () => {
    expect(
      readinessFailures(
        health({
          ok: false,
          checks: {
            databaseConfigured: false,
            databaseConnected: false,
            openRouterConfigured: false,
            imageGenerationConfigured: false,
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'backend health is not ok',
        'DATABASE_URL is not configured',
        'database is not connected',
        'OPENROUTER_API_KEY is not configured',
        'IMAGE_GENERATION_API_KEY or OPENAI_API_KEY is not configured',
      ]),
    )
  })

  test('requires production auth and storage hardening', () => {
    expect(
      readinessFailures(
        health({
          checks: {
            adminAuthConfigured: false,
            supabaseAuthConfigured: false,
          },
          security: {
            authMode: 'local-dev-header',
            adminGuard: 'disabled',
            avatarStorage: 'local',
            avatarStorageAccess: 'local',
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'Supabase auth is not configured',
        'ADMIN_API_KEY is not configured',
        'production avatar storage must use Supabase',
        'production avatar storage access must use signed URLs',
        'production auth mode must use Supabase JWT',
        'production admin guard must use an API key',
      ]),
    )
  })

  test('passes through env validation failures', () => {
    expect(
      readinessFailures(
        health({
          env: {
            missingRequired: ['SUPABASE_SERVICE_ROLE_KEY'],
            invalid: ['CORS_ORIGINS must use https origins in production'],
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'SUPABASE_SERVICE_ROLE_KEY is missing',
        'CORS_ORIGINS must use https origins in production',
      ]),
    )
  })
})
