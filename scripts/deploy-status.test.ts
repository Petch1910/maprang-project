import { describe, expect, test } from 'bun:test'
import { buildDeployStatusPayload, formatDeployStatusText, runDeployStatus } from './deploy-status'
import type { HealthPayload } from './deploy-readiness'

function baseHealth(overrides: Partial<HealthPayload> = {}): HealthPayload {
  return {
    ok: true,
    checks: {
      databaseConfigured: true,
      databaseConnected: true,
      openRouterConfigured: true,
      imageGenerationConfigured: true,
    },
    security: {
      authMode: 'supabase-jwt',
      avatarStorage: 'supabase',
      avatarStorageAccess: 'signed',
      signedUrlExpiresIn: 3600,
      corsOrigins: ['https://app.example.com'],
    },
    knowledge: {
      structured: { ok: true, fileCount: 5 },
    },
    model: {
      name: 'google/gemini-2.0-flash-001',
      chatProvider: { status: 'verified', liveVerified: true, productionReady: true },
      imageGeneration: {
        configured: true,
        status: 'verified',
        liveVerified: true,
        productionReady: true,
        model: 'gpt-image-1.5',
      },
    },
    ...overrides,
  }
}

describe('deploy status formatting', () => {
  test('builds JSON payload with top-level readiness counts', () => {
    const payload = buildDeployStatusPayload(baseHealth(), {
      apiBaseUrl: 'https://api.example.com',
      isLocalSmokeTarget: false,
    })

    expect(payload.ok).toBe(true)
    expect(payload.stagingReady).toBe(true)
    expect(payload.stagingBlockerCount).toBe(0)
    expect(payload.productionReady).toBe(true)
    expect(payload.productionBlockerCount).toBe(0)
    expect(payload.health.chatStatus).toBe('verified')
    expect(payload.nextSteps.join('\n')).toContain('production:check')
  })

  test('keeps local URL and CORS blockers visible in text output', () => {
    const text = formatDeployStatusText(
      baseHealth({
        security: {
          authMode: 'supabase-jwt',
          avatarStorage: 'supabase',
          avatarStorageAccess: 'signed',
          corsOrigins: ['http://localhost:5173'],
        },
      }),
      { apiBaseUrl: 'http://127.0.0.1:3000', isLocalSmokeTarget: true },
    )

    expect(text).toContain('Maprang Deploy Status')
    expect(text).toContain('stagingBlockerCount: 2')
    expect(text).toContain('backend URL is local')
    expect(text).toContain('CORS_ORIGINS is empty, local, or non-https')
    expect(text).toContain('nextSteps:')
  })

  test('reports health failures without hiding deploy readiness', () => {
    const payload = buildDeployStatusPayload(
      baseHealth({
        ok: false,
        checks: {
          databaseConfigured: true,
          databaseConnected: false,
          openRouterConfigured: true,
          imageGenerationConfigured: true,
        },
      }),
      { apiBaseUrl: 'https://api.example.com', isLocalSmokeTarget: false },
    )

    expect(payload.ok).toBe(false)
    expect(payload.failures).toEqual(['backend health returned ok=false', 'database is not connected'])
    expect(payload.productionReady).toBe(true)
  })

  test('runs deploy status JSON through an importable runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts', '--json'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readHealth: async () => baseHealth(),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(payload.ok).toBe(true)
    expect(payload.apiBaseUrl).toBe('https://api.example.com')
    expect(payload.productionReady).toBe(true)
    expect(errors).toEqual([])
  })

  test('returns a failure code without exiting when health cannot be read', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts'],
      currentApiBaseUrl: 'http://127.0.0.1:3000',
      currentIsLocalSmokeTarget: true,
      readHealth: async () => {
        throw new Error('backend unavailable')
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('Deploy status failed: backend unavailable')
    expect(errors.join('\n')).toContain('Local fix:')
  })
})
