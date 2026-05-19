import { describe, expect, test } from 'bun:test'
import { buildReadinessSummary, formatReadinessSummary, type ReadinessPayload } from './readiness-smoke'

function readyPayload(overrides: Partial<ReadinessPayload> = {}): ReadinessPayload {
  return {
    ok: true,
    checks: {
      databaseConfigured: true,
      databaseConnected: true,
      openRouterConfigured: true,
      imageGenerationConfigured: true,
      adminAuthConfigured: true,
      supabaseAuthConfigured: true,
    },
    readiness: { status: 'ready', failures: [] },
    security: {
      authMode: 'supabase-jwt',
      adminGuard: 'configured',
      avatarStorage: 'supabase',
      avatarStorageAccess: 'signed',
      signedUrlExpiresIn: 3600,
    },
    knowledge: { structured: { ok: true, fileCount: 5 } },
    model: {
      name: 'google/gemini-2.0-flash-001',
      chatProvider: { status: 'verified', liveVerified: true, productionReady: true },
      imageGeneration: {
        status: 'verified',
        liveVerified: true,
        productionReady: true,
        model: 'gpt-image-1.5',
      },
    },
    ...overrides,
  }
}

describe('readiness smoke summary', () => {
  test('summarizes a ready payload without requiring a live backend', () => {
    const summary = buildReadinessSummary(readyPayload(), {
      apiBaseUrl: 'https://api.example.com',
      responseOk: true,
      statusCode: 200,
    })

    expect(summary.ok).toBe(true)
    expect(summary.readiness).toBe('ready')
    expect(summary.authMode).toBe('supabase-jwt')
    expect(summary.avatarStorageAccess).toBe('signed')
    expect(summary.chatProductionReady).toBe(true)
    expect(summary.imageProductionReady).toBe(true)
  })

  test('keeps readiness failures visible for staging and production gates', () => {
    const summary = buildReadinessSummary(
      readyPayload({
        ok: false,
        readiness: {
          status: 'not_ready',
          failures: ['database is not connected', 'structured knowledge is invalid'],
        },
      }),
      { apiBaseUrl: 'https://api.example.com', responseOk: false, statusCode: 503 },
    )

    expect(summary.ok).toBe(false)
    expect(summary.statusCode).toBe(503)
    expect(summary.failures).toEqual(['database is not connected', 'structured knowledge is invalid'])
    expect(formatReadinessSummary(summary)).toContain('"readiness": "not_ready"')
  })

  test('falls back to payload ok when readiness status is omitted', () => {
    const readySummary = buildReadinessSummary(
      readyPayload({ readiness: undefined }),
      { apiBaseUrl: 'https://api.example.com', responseOk: true, statusCode: 200 },
    )
    const notReadySummary = buildReadinessSummary(
      readyPayload({ ok: false, readiness: undefined }),
      { apiBaseUrl: 'https://api.example.com', responseOk: true, statusCode: 200 },
    )

    expect(readySummary.readiness).toBe('ready')
    expect(notReadySummary.readiness).toBe('not_ready')
  })
})
