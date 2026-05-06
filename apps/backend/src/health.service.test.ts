import { describe, expect, test } from 'bun:test'
import { readinessFailures, type HealthStatus } from './health.service'

type HealthOverrides = Partial<Omit<HealthStatus, 'checks' | 'model' | 'security' | 'env'>> & {
  checks?: Partial<HealthStatus['checks']>
  model?: Partial<HealthStatus['model']>
  security?: Partial<HealthStatus['security']>
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
      adminAuthConfigured: true,
      supabaseAuthConfigured: true,
    },
    model: {
      name: 'google/gemini-2.0-flash-001',
      inputCostPer1M: 0.1,
      outputCostPer1M: 0.4,
      maxInputChars: 4000,
      minTokenBalanceForChat: 1,
    },
    security: {
      corsOrigins: ['https://app.example.com'],
      authMode: 'supabase-jwt',
      adminGuard: 'api-key',
      avatarStorage: 'supabase',
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
    env: { ...base.env, ...overrides.env },
  }
}

describe('readiness gate', () => {
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
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'backend health is not ok',
        'DATABASE_URL is not configured',
        'database is not connected',
        'OPENROUTER_API_KEY is not configured',
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
          },
        }),
      ),
    ).toEqual(
      expect.arrayContaining([
        'Supabase auth is not configured',
        'ADMIN_API_KEY is not configured',
        'production avatar storage must use Supabase',
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
