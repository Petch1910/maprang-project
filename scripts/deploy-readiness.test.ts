import { describe, expect, test } from 'bun:test'
import {
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  isUnsafeCorsOrigin,
  isLocalOrigin,
  type HealthPayload,
} from './deploy-readiness'

const baseHealth: HealthPayload = {
  ok: true,
  checks: {
    databaseConfigured: true,
    databaseConnected: true,
    openRouterConfigured: true,
    imageGenerationConfigured: true,
    supabaseAuthConfigured: true,
    adminAuthConfigured: true,
  },
  security: {
    authMode: 'supabase-jwt',
    avatarStorage: 'supabase',
    avatarStorageAccess: 'signed',
    signedUrlExpiresIn: 3600,
    corsOrigins: ['https://app.example.com'],
  },
  knowledge: {
    structured: {
      ok: true,
      fileCount: 5,
      missing: [],
      errors: [],
    },
  },
  model: {
    name: 'google/gemini-2.0-flash-001',
    chatProvider: {
      configured: true,
      liveVerified: true,
      productionReady: true,
      status: 'verified',
      liveSmokeCommand: 'bun run smoke:chat',
    },
    imageGeneration: {
      configured: true,
      liveVerified: true,
      productionReady: true,
      status: 'verified',
      model: 'gpt-image-1.5',
      liveSmokeCommand: 'bun run smoke:image:live',
    },
  },
  env: {
    mode: 'production',
    missingRequired: [],
    invalid: [],
  },
}

function cloneHealth(overrides: Partial<HealthPayload> = {}): HealthPayload {
  return {
    ...baseHealth,
    ...overrides,
    checks: {
      ...baseHealth.checks,
      ...overrides.checks,
    },
    security: {
      ...baseHealth.security,
      ...overrides.security,
    },
    knowledge: {
      ...baseHealth.knowledge,
      ...overrides.knowledge,
      structured: {
        ...baseHealth.knowledge?.structured,
        ...overrides.knowledge?.structured,
      },
    },
    model: {
      ...baseHealth.model,
      ...overrides.model,
      chatProvider: {
        ...baseHealth.model?.chatProvider,
        ...overrides.model?.chatProvider,
      },
      imageGeneration: {
        ...baseHealth.model?.imageGeneration,
        ...overrides.model?.imageGeneration,
      },
    },
    env: {
      ...baseHealth.env,
      ...overrides.env,
    },
  }
}

describe('deploy readiness evaluation', () => {
  test('passes a production-ready health payload', () => {
    const readiness = evaluateDeployReadiness(baseHealth, { isLocalSmokeTarget: false })

    expect(readiness.stagingReady).toBe(true)
    expect(readiness.productionReady).toBe(true)
    expect(readiness.stagingBlockers).toEqual([])
    expect(readiness.productionBlockers).toEqual([])
    expect(buildNextDeploySteps(readiness)).toContain(
      'Run `bun run production:check` one final time against the production backend and frontend domains.',
    )
    expect(buildNextDeploySteps(readiness)).toContain(
      'Fill `RELEASE_HANDOFF.md` with deployed URLs, migration status, storage/auth/CORS, live smoke results, known limitations, and go/no-go notes.',
    )
  })

  test('separates staging blockers from live provider verification blockers', () => {
    const localHealth = cloneHealth({
      security: {
        corsOrigins: ['http://localhost:5173'],
      },
      model: {
        chatProvider: {
          liveVerified: false,
          productionReady: false,
          status: 'needs_live_smoke',
        },
        imageGeneration: {
          liveVerified: false,
          productionReady: false,
          status: 'needs_live_smoke',
        },
      },
    })

    const readiness = evaluateDeployReadiness(localHealth, { isLocalSmokeTarget: true })
    const nextSteps = buildNextDeploySteps(readiness)

    expect(readiness.stagingReady).toBe(false)
    expect(readiness.productionReady).toBe(false)
    expect(readiness.stagingBlockers).toEqual(['backend URL is local', 'CORS_ORIGINS is empty, local, or non-https'])
    expect(readiness.productionBlockers).toContain('chat provider live smoke is not marked verified')
    expect(readiness.productionBlockers).toContain('image generation live smoke is not marked verified')
    expect(nextSteps).toContain(
      'backend URL is local: set SMOKE_API_BASE_URL and frontend VITE_API_BASE_URL to the deployed backend URL',
    )
    expect(nextSteps).not.toContain(
      'chat provider live smoke is not marked verified: run `bun run smoke:chat` or `bun run api:smoke:live` against staging/production and set CHAT_PROVIDER_LIVE_VERIFIED=1 after it passes',
    )
  })

  test('turns missing production hardening into staging blockers', () => {
    const incompleteHealth = cloneHealth({
      checks: {
        openRouterConfigured: false,
        imageGenerationConfigured: false,
      },
      security: {
        authMode: 'local-dev',
        avatarStorage: 'local',
        avatarStorageAccess: 'public',
        corsOrigins: [],
      },
      knowledge: {
        structured: {
          ok: false,
          fileCount: 0,
          missing: ['relationship-rules.json'],
          errors: [],
        },
      },
      env: {
        missingRequired: ['DATABASE_URL'],
        invalid: ['CORS_ORIGINS must use https origins in production'],
      },
    })

    const readiness = evaluateDeployReadiness(incompleteHealth, { isLocalSmokeTarget: false })

    expect(readiness.stagingReady).toBe(false)
    expect(readiness.stagingBlockers).toEqual(
      expect.arrayContaining([
        'auth mode is not Supabase JWT',
        'avatar storage is not Supabase signed URL',
        'CORS_ORIGINS is empty, local, or non-https',
        'structured knowledge is not valid',
        'OPENROUTER_API_KEY is missing',
        'image generation provider is missing',
        'DATABASE_URL is missing',
        'invalid env: CORS_ORIGINS must use https origins in production',
      ]),
    )
  })

  test('reports health failures before deploy gates', () => {
    const brokenHealth = cloneHealth({
      ok: false,
      checks: {
        databaseConfigured: false,
        databaseConnected: false,
      },
    })

    expect(healthFailures(brokenHealth)).toEqual([
      'backend health returned ok=false',
      'DATABASE_URL is not configured',
      'database is not connected',
    ])
  })

  test('detects local and invalid origins', () => {
    expect(isLocalOrigin('http://localhost:5173')).toBe(true)
    expect(isLocalOrigin('http://127.0.0.1:5173')).toBe(true)
    expect(isLocalOrigin('not-a-url')).toBe(true)
    expect(isLocalOrigin('https://app.example.com')).toBe(false)
    expect(isUnsafeCorsOrigin('http://app.example.com')).toBe(true)
    expect(isUnsafeCorsOrigin('https://localhost:5173')).toBe(true)
    expect(isUnsafeCorsOrigin('*')).toBe(true)
    expect(isUnsafeCorsOrigin('https://app.example.com')).toBe(false)
  })
})
