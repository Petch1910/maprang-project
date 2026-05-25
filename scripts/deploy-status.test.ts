import { describe, expect, test } from 'bun:test'
import { buildDeployStatusPayload, formatDeployStatusCaughtError, formatDeployStatusText, runDeployStatus } from './deploy-status'
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
      rootIdentity: { ok: true, service: 'maprang-backend' },
    })

    expect(payload.ok).toBe(true)
    expect(payload.stagingReady).toBe(true)
    expect(payload.stagingBlockerCount).toBe(0)
    expect(payload.productionReady).toBe(true)
    expect(payload.productionBlockerCount).toBe(0)
    expect(payload.health.chatStatus).toBe('verified')
    expect(payload.rootIdentity.service).toBe('maprang-backend')
    expect(payload.nextSteps.join('\n')).toContain('production:check')
  })

  test('does not default root identity when helper has no root preflight result', () => {
    const payload = buildDeployStatusPayload(baseHealth(), {
      apiBaseUrl: 'https://api.example.com',
      isLocalSmokeTarget: false,
    })
    const text = formatDeployStatusText(baseHealth(), {
      apiBaseUrl: 'https://api.example.com',
      isLocalSmokeTarget: false,
    })

    expect(payload.rootIdentity.ok).toBeUndefined()
    expect(payload.rootIdentity.service).toBeUndefined()
    expect(text).not.toContain('rootIdentity:')
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
      {
        apiBaseUrl: 'http://127.0.0.1:3000',
        isLocalSmokeTarget: true,
        rootIdentity: { ok: true, service: 'maprang-backend' },
      },
    )

    expect(text).toContain('สถานะ deploy Maprang')
    expect(text).toContain('root identity ระบบหลังบ้าน: maprang-backend')
    expect(text).toContain('stagingBlockerCount: 2')
    expect(text).toContain('backend URL ยังเป็น local')
    expect(text).toContain('CORS_ORIGINS ว่าง เป็น local ไม่ใช่ https หรือไม่ใช่ origin ล้วน')
    expect(text).toContain('ขั้นตอนถัดไป:')
    expect(text).toContain('วิธีแก้สเตจจิง:')
    expect(text).not.toContain('วิธีแก้ staging:')
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
    expect(payload.failures).toEqual(['backend health คืน ok=false', 'ฐานข้อมูลยังเชื่อมต่อไม่ได้'])
    expect(payload.productionReady).toBe(true)
  })

  test('surfaces invalid roleplay reply budget env in JSON and text readiness output', () => {
    const health = baseHealth({
      env: {
        mode: 'production',
        invalid: ['MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production'],
      },
    })

    const payload = buildDeployStatusPayload(health, {
      apiBaseUrl: 'https://api.example.com',
      isLocalSmokeTarget: false,
    })
    const text = formatDeployStatusText(health, {
      apiBaseUrl: 'https://api.example.com',
      isLocalSmokeTarget: false,
    })

    expect(payload.ok).toBe(true)
    expect(payload.stagingReady).toBe(false)
    expect(payload.productionReady).toBe(false)
    expect(payload.readiness.productionBlockers).toContain(
      'production env ไม่ถูกต้อง: MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production',
    )
    expect(text).toContain(
      'env ไม่ถูกต้อง: MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production',
    )
    expect(text).not.toContain('invalidEnv:')
    expect(text).toContain('productionReady: false')
  })

  test('runs deploy status JSON through an importable runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts', '--json'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => baseHealth(),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(payload.ok).toBe(true)
    expect(payload.apiBaseUrl).toBe('https://api.example.com')
    expect(payload.rootIdentity.service).toBe('maprang-backend')
    expect(payload.productionReady).toBe(true)
    expect(errors).toEqual([])
  })

  test('validates backend root identity before health status', async () => {
    const lines: string[] = []
    const errors: string[] = []
    let healthRead = false
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readRootIdentity: async () => ({ ok: true, service: 'wrong-service' }),
      readHealth: async () => {
        healthRead = true
        return baseHealth()
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(healthRead).toBe(false)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('ชื่อ service ไม่ถูกต้อง')
    expect(errors.join('\n')).toContain('ไม่ใช่ proxy ของหน้าบ้าน/static')
    expect(errors.join('\n')).toContain('วิธีแก้ในเครื่อง:')
    expect(errors.join('\n')).toContain('วิธีแก้สเตจจิง:')
  })

  test('returns structured JSON when root identity cannot be read', async () => {
    const lines: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts', '--json'],
      currentApiBaseUrl: 'http://127.0.0.1:3000',
      currentIsLocalSmokeTarget: true,
      readRootIdentity: async () => {
        throw new Error('backend unavailable')
      },
      readHealth: async () => baseHealth(),
      writeLine: (line) => lines.push(line),
      writeError: () => undefined,
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(1)
    expect(payload.ok).toBe(false)
    expect(payload.apiBaseUrl).toBe('http://127.0.0.1:3000')
    expect(payload.error).toBe('backend unavailable')
    expect(payload.failures).toEqual(['backend unavailable'])
    expect(payload.rootIdentity.ok).toBe(false)
    expect(payload.nextSteps.join('\n')).toContain('GET / คืน identity payload')
  })

  test('returns a failure code without exiting when health cannot be read', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts'],
      currentApiBaseUrl: 'http://127.0.0.1:3000',
      currentIsLocalSmokeTarget: true,
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => {
        throw new Error('backend unavailable')
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('ตรวจสถานะ deploy ไม่ผ่าน: backend unavailable')
    expect(errors.join('\n')).not.toContain('Deploy status ไม่ผ่าน')
    expect(errors.join('\n')).toContain('วิธีแก้ในเครื่อง:')
    expect(errors.join('\n')).toContain('วิธีแก้สเตจจิง:')
    expect(errors.join('\n')).toContain('URL ระบบหลังบ้านที่ deploy แล้ว')
    expect(errors.join('\n')).not.toContain('วิธีแก้ local:')
  })

  test('returns structured JSON when health cannot be read after root identity passes', async () => {
    const lines: string[] = []
    const exitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts', '--json'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => {
        throw new Error('health unavailable')
      },
      writeLine: (line) => lines.push(line),
      writeError: () => undefined,
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(1)
    expect(payload.ok).toBe(false)
    expect(payload.error).toBe('health unavailable')
    expect(payload.failures).toEqual(['health unavailable'])
    expect(payload.rootIdentity).toEqual({ ok: true, service: 'maprang-backend' })
    expect(payload.nextSteps.join('\n')).toContain('ฐานข้อมูล')
  })

  test('redacts secret-shaped values from deploy status caught errors', async () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const directMessage = formatDeployStatusCaughtError(new Error(`DATABASE_URL=${fakeDatabaseUrl}`))

    expect(directMessage).toContain('[REDACTED_SECRET]')
    expect(directMessage).not.toContain('super-secret')

    const textLines: string[] = []
    const textErrors: string[] = []
    const textExitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => {
        throw new Error(`health failed with DATABASE_URL=${fakeDatabaseUrl}`)
      },
      writeLine: (line) => textLines.push(line),
      writeError: (line) => textErrors.push(line),
    })

    expect(textExitCode).toBe(1)
    expect(textLines).toEqual([])
    expect(textErrors.join('\n')).toContain('[REDACTED_SECRET]')
    expect(textErrors.join('\n')).not.toContain('super-secret')

    const jsonLines: string[] = []
    const jsonExitCode = await runDeployStatus({
      argv: ['bun', 'deploy-status.ts', '--json'],
      currentApiBaseUrl: 'https://api.example.com',
      currentIsLocalSmokeTarget: false,
      readRootIdentity: async () => {
        throw new Error(`root failed with DATABASE_URL=${fakeDatabaseUrl}`)
      },
      readHealth: async () => baseHealth(),
      writeLine: (line) => jsonLines.push(line),
      writeError: () => {},
    })

    expect(jsonExitCode).toBe(1)
    const payload = JSON.parse(jsonLines.join('\n'))
    expect(payload.error).toContain('[REDACTED_SECRET]')
    expect(payload.error).not.toContain('super-secret')
    expect(payload.failures.join('\n')).toContain('[REDACTED_SECRET]')
  })

  test('formats object-shaped deploy status errors without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:deploy-object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatDeployStatusCaughtError({
      message: `health failed ${fakeDatabaseUrl}`,
      toString() {
        throw new Error('raw object should not be stringified')
      },
    })

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('deploy-object-secret')
    expect(formatDeployStatusCaughtError({ error: 'root identity failed' })).toBe('root identity failed')
    expect(formatDeployStatusCaughtError({ code: 'ECONNREFUSED' })).toBe('ไม่ทราบสาเหตุ')
  })
})
