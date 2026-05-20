import { describe, expect, test } from 'bun:test'
import {
  buildLiveImageSmokePayload,
  buildSkippedImageSmokePayload,
  imageGenerationIsConfigured,
  liveImageDraftFailure,
  runImageSmoke,
  type CreatorDraftPayload,
  type ImageSmokeHealthPayload,
} from './image-smoke'

function health(overrides: Partial<ImageSmokeHealthPayload> = {}): ImageSmokeHealthPayload {
  return {
    ok: true,
    checks: {
      imageGenerationConfigured: true,
      openRouterConfigured: true,
    },
    model: {
      imageGeneration: {
        configured: true,
        status: 'needs_live_smoke',
        productionReady: false,
        model: 'gpt-image-1.5',
      },
    },
    ...overrides,
  }
}

describe('image smoke helpers', () => {
  test('detects configured image provider from health checks or model metadata', () => {
    expect(imageGenerationIsConfigured(health())).toBe(true)
    expect(imageGenerationIsConfigured(health({ checks: { imageGenerationConfigured: false } }))).toBe(true)
    expect(imageGenerationIsConfigured({ ok: true, checks: { imageGenerationConfigured: false } })).toBe(false)
  })

  test('builds skipped live-image payload without pretending production is verified', () => {
    expect(buildSkippedImageSmokePayload(health(), 'https://api.maprang.example')).toEqual({
      ok: true,
      apiBaseUrl: 'https://api.maprang.example',
      live: false,
      imageGenerationConfigured: true,
      imageModel: 'gpt-image-1.5',
      imageStatus: 'needs_live_smoke',
      imageProductionReady: false,
      skipped:
        'ข้ามการเรียกสร้างรูปจริงแล้ว ตั้ง SMOKE_IMAGE_LIVE=1 หรือรัน `bun run smoke:image:live` เพื่อสร้างรูปจริงตอน QA สเตจจิงหรือโปรดักชัน',
    })
  })

  test('reports placeholder, missing URL, and SVG placeholder failures', () => {
    expect(
      liveImageDraftFailure({
        image: { provider: 'placeholder', note: 'billing_hard_limit_reached' },
      }),
    ).toContain('เพดานวงเงิน')

    expect(liveImageDraftFailure({ image: { provider: 'configured' } })).toBe(
      'ตรวจสร้างรูปจริงใช้ผู้ให้บริการที่ตั้งค่าแล้ว แต่ไม่พบ URL รูป',
    )
    expect(
      liveImageDraftFailure({
        image: { provider: 'configured', url: 'data:image/svg+xml;base64,abc' },
      }),
    ).toBe('ตรวจสร้างรูปจริงได้ SVG ตัวอย่างในเครื่องแทนรูปจริงจากผู้ให้บริการ')
    expect(liveImageDraftFailure({ image: { provider: 'placeholder' } })).toContain(
      'ไม่มีรายละเอียดจากผู้ให้บริการสร้างรูป',
    )
    expect(liveImageDraftFailure({ image: { provider: 'placeholder' } })).not.toContain('ตรวจรูป smoke')
  })

  test('formats successful live-image payload and classifies generated URL kind', () => {
    expect(
      buildLiveImageSmokePayload(
        {
          source: 'ai',
          modelName: 'gpt-image-1.5',
          image: { provider: 'configured', url: 'https://cdn.example/avatar.png' },
          warnings: ['minor warning'],
        },
        health({ model: { imageGeneration: { configured: true, status: 'verified', productionReady: true } } }),
        { baseUrl: 'https://api.maprang.example', elapsedMs: 1200 },
      ),
    ).toEqual({
      ok: true,
      apiBaseUrl: 'https://api.maprang.example',
      live: true,
      source: 'ai',
      modelName: 'gpt-image-1.5',
      imageModel: null,
      imageStatus: 'verified',
      imageProvider: 'configured',
      imageUrlKind: 'remote-or-upload-url',
      elapsedMs: 1200,
      warnings: ['minor warning'],
    })
  })

  test('runs skipped image smoke through an importable runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runImageSmoke({
      argv: ['bun', 'image-smoke.ts'],
      env: {},
      apiBaseUrl: 'https://api.maprang.example',
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => health(),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(payload.live).toBe(false)
    expect(payload.apiBaseUrl).toBe('https://api.maprang.example')
    expect(errors).toEqual([])
  })

  test('reports missing configured provider with Thai-first deploy guidance', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runImageSmoke({
      argv: ['bun', 'image-smoke.ts'],
      env: {},
      apiBaseUrl: 'https://api.maprang.example',
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => ({
        ok: true,
        checks: { imageGenerationConfigured: false },
        model: { imageGeneration: { configured: false } },
      }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('ผู้ให้บริการสร้างรูปยังไม่ได้ตั้งค่าบนระบบหลังบ้าน')
    expect(errors.join('\n')).toContain('IMAGE_GENERATION_API_KEY')
    expect(errors.join('\n')).toContain('ก่อนตรวจโปรดักชัน')
    expect(errors.join('\n')).not.toContain('ก่อนตรวจ production')
  })

  test('runs live image smoke through an importable runner without provider calls', async () => {
    const lines: string[] = []
    const errors: string[] = []
    let now = 1000
    const draft: CreatorDraftPayload = {
      source: 'ai',
      modelName: 'gpt-image-1.5',
      image: { provider: 'configured', url: 'https://cdn.example/avatar.png' },
    }

    const exitCode = await runImageSmoke({
      argv: ['bun', 'image-smoke.ts', '--live'],
      env: {},
      apiBaseUrl: 'https://api.maprang.example',
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => health(),
      readCreatorDraft: async () => draft,
      now: () => {
        now += 250
        return now
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(payload.live).toBe(true)
    expect(payload.imageUrlKind).toBe('remote-or-upload-url')
    expect(payload.elapsedMs).toBe(250)
    expect(errors).toEqual([])
  })

  test('returns a failure code when live image smoke falls back to placeholder', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runImageSmoke({
      argv: ['bun', 'image-smoke.ts', '--live'],
      env: {},
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      readHealth: async () => health(),
      readCreatorDraft: async () => ({
        image: { provider: 'placeholder', note: 'billing_hard_limit_reached' },
      }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('เพดานวงเงิน')
  })

  test('validates backend root identity before image provider checks', async () => {
    const lines: string[] = []
    const errors: string[] = []
    let healthRead = false
    const exitCode = await runImageSmoke({
      argv: ['bun', 'image-smoke.ts', '--live'],
      env: {},
      readRootIdentity: async () => ({ ok: true, service: 'wrong-service' }),
      readHealth: async () => {
        healthRead = true
        return health()
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(healthRead).toBe(false)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('ชื่อ service ไม่ถูกต้อง')
  })
})
