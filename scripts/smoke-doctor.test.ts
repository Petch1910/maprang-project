import { describe, expect, test } from 'bun:test'
import { buildSmokeDoctorReport } from './smoke-doctor'
import type { HealthPayload } from './deploy-readiness'

function healthyPayload(overrides: Partial<HealthPayload> = {}): HealthPayload {
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
      corsOrigins: ['https://app.maprang.example'],
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
      },
      imageGeneration: {
        configured: true,
        liveVerified: true,
        productionReady: true,
        status: 'verified',
        model: 'gpt-image-1.5',
      },
    },
    ...overrides,
  }
}

describe('smoke doctor report', () => {
  test('prints next steps for local staging blockers without failing local handoff', () => {
    const report = buildSmokeDoctorReport(healthyPayload(), {
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalSmokeTarget: true,
    })

    expect(report.exitCode).toBe(0)
    expect(report.stdout).toContain('stagingReady: false')
    expect(report.stdout.join('\n')).toContain('backend URL is local')
    expect(report.stdout.join('\n')).toContain('Run `bun run staging:verify`')
    expect(report.stdout.at(-1)).toBe('Smoke doctor passed.')
  })

  test('strict staging gate fails before production output when staging blockers remain', () => {
    const report = buildSmokeDoctorReport(healthyPayload(), {
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalSmokeTarget: true,
      strictStagingGate: true,
    })

    expect(report.exitCode).toBe(1)
    expect(report.stdout).toContain('stagingReady: false')
    expect(report.stdout.some((line) => line.startsWith('productionReady:'))).toBe(false)
    expect(report.stderr).toContain('Staging gate failed. Fix the staging blockers above, then rerun with a deployed backend URL.')
  })

  test('reports backend health failures with local and deploy fixes', () => {
    const report = buildSmokeDoctorReport(
      healthyPayload({
        ok: false,
        checks: {
          databaseConfigured: true,
          databaseConnected: false,
          openRouterConfigured: true,
          imageGenerationConfigured: true,
        },
      }),
      {
        apiBaseUrl: 'https://api.maprang.example',
        isLocalSmokeTarget: false,
      },
    )

    expect(report.exitCode).toBe(1)
    expect(report.stderr.join('\n')).toContain('backend health returned ok=false')
    expect(report.stderr.join('\n')).toContain('database is not connected')
    expect(report.stderr.join('\n')).toContain('Deploy fix:')
  })
})
