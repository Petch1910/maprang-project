import { describe, expect, test } from 'bun:test'
import {
  buildLiveImageSmokePayload,
  buildSkippedImageSmokePayload,
  imageGenerationIsConfigured,
  liveImageDraftFailure,
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
        'Live provider call was skipped. Set SMOKE_IMAGE_LIVE=1 or run `bun run smoke:image:live` to generate a real image during staging/production QA.',
    })
  })

  test('reports placeholder, missing URL, and SVG placeholder failures', () => {
    expect(
      liveImageDraftFailure({
        image: { provider: 'placeholder', note: 'billing_hard_limit_reached' },
      }),
    ).toContain('billing limit')

    expect(liveImageDraftFailure({ image: { provider: 'configured' } })).toBe(
      'Image smoke returned configured provider but no image URL',
    )
    expect(
      liveImageDraftFailure({
        image: { provider: 'configured', url: 'data:image/svg+xml;base64,abc' },
      }),
    ).toBe('Image smoke returned the local placeholder SVG instead of a generated image')
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
})
