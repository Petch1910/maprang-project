import { describe, expect, test } from 'bun:test'
import {
  buildReadinessSummary,
  formatReadinessSummary,
  readBackendRootIdentity,
  runReadinessSmoke,
  type ReadinessPayload,
} from './readiness-smoke'

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
      rootIdentity: { ok: true, service: 'maprang-backend' },
    })

    expect(summary.ok).toBe(true)
    expect(summary.rootIdentityService).toBe('maprang-backend')
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
          failures: ['ฐานข้อมูลยังเชื่อมต่อไม่ได้', 'คลังความรู้ structured ยังไม่ผ่าน'],
        },
      }),
      { apiBaseUrl: 'https://api.example.com', responseOk: false, statusCode: 503 },
    )

    expect(summary.ok).toBe(false)
    expect(summary.statusCode).toBe(503)
    expect(summary.failures).toEqual(['ฐานข้อมูลยังเชื่อมต่อไม่ได้', 'คลังความรู้ structured ยังไม่ผ่าน'])
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

  test('runs readiness smoke through an importable runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runReadinessSmoke({
      apiBaseUrl: 'https://api.example.com',
      rootIdentityReader: async () => ({ ok: true, service: 'maprang-backend' }),
      readinessReader: async () => ({
        response: { ok: true, status: 200 },
        payload: readyPayload(),
      }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const summary = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(summary.ok).toBe(true)
    expect(summary.rootIdentityOk).toBe(true)
    expect(summary.rootIdentityService).toBe('maprang-backend')
    expect(summary.apiBaseUrl).toBe('https://api.example.com')
    expect(errors).toEqual([])
  })

  test('validates backend root identity before readiness', async () => {
    const lines: string[] = []
    const errors: string[] = []
    let readinessRead = false
    const exitCode = await runReadinessSmoke({
      apiBaseUrl: 'https://api.example.com',
      rootIdentityReader: async () => ({ ok: true, service: 'wrong-service' }),
      readinessReader: async () => {
        readinessRead = true
        return {
          response: { ok: true, status: 200 },
          payload: readyPayload(),
        }
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(readinessRead).toBe(false)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('service name ไม่ถูกต้อง')
  })

  test('returns a failure code without exiting when readiness is not ready', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runReadinessSmoke({
      apiBaseUrl: 'https://api.example.com',
      rootIdentityReader: async () => ({ ok: true, service: 'maprang-backend' }),
      readinessReader: async () => ({
        response: { ok: false, status: 503 },
        payload: readyPayload({
          ok: false,
          readiness: { status: 'not_ready', failures: ['ฐานข้อมูลยังเชื่อมต่อไม่ได้'] },
        }),
      }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(JSON.parse(lines.join('\n')).failures).toEqual(['ฐานข้อมูลยังเชื่อมต่อไม่ได้'])
    expect(errors).toEqual(['Readiness smoke ไม่ผ่าน: ฐานข้อมูลยังเชื่อมต่อไม่ได้'])
  })

  test('reads and validates backend root identity without reading readiness payload', async () => {
    const payload = await readBackendRootIdentity('https://api.example.com', async (url) => {
      expect(url).toBe('https://api.example.com/')
      return new Response(JSON.stringify({ ok: true, service: 'maprang-backend' }), { status: 200 })
    })

    expect(payload).toEqual({ ok: true, service: 'maprang-backend' })
  })
})
