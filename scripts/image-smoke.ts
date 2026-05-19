import { apiBaseUrl, readJson } from './smoke-helpers'

export type ImageSmokeHealthPayload = {
  ok: boolean
  checks?: {
    imageGenerationConfigured?: boolean
    openRouterConfigured?: boolean
  }
  model?: {
    imageGeneration?: {
      configured?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      productionReady?: boolean
      model?: string
    }
  }
}

export type CreatorDraftPayload = {
  source?: 'ai' | 'fallback'
  modelName?: string
  image?: {
    url?: string
    provider?: 'configured' | 'placeholder'
    prompt?: string
    note?: string
  }
  warnings?: string[]
}

export function imageGenerationIsConfigured(health: ImageSmokeHealthPayload) {
  return Boolean(health.checks?.imageGenerationConfigured || health.model?.imageGeneration?.configured)
}

export function shouldRunLiveImageSmoke(argv = process.argv, env = process.env) {
  return (
    ['1', 'true', 'yes'].includes(String(env.SMOKE_IMAGE_LIVE ?? '').toLowerCase()) ||
    argv.includes('--live') ||
    argv.includes('--require-live-image')
  )
}

export function providerFailureHint(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('billing_hard_limit_reached') || normalized.includes('billing hard limit')) {
    return ' | Fix: increase or reset the image provider billing limit, then rerun `bun run smoke:image:live`.'
  }
  if (normalized.includes('insufficient_quota') || normalized.includes('quota')) {
    return ' | Fix: add image provider credits/quota, then rerun `bun run smoke:image:live`.'
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('invalid api key')) {
    return ' | Fix: replace IMAGE_GENERATION_API_KEY/OPENAI_API_KEY with a valid backend-only image provider key.'
  }
  if (normalized.includes('model')) {
    return ' | Fix: check IMAGE_GENERATION_MODEL and whether the provider account can use that image model.'
  }
  return ''
}

export function buildSkippedImageSmokePayload(health: ImageSmokeHealthPayload, baseUrl = apiBaseUrl) {
  return {
    ok: true,
    apiBaseUrl: baseUrl,
    live: false,
    imageGenerationConfigured: true,
    imageModel: health.model?.imageGeneration?.model ?? null,
    imageStatus: health.model?.imageGeneration?.status ?? null,
    imageProductionReady: health.model?.imageGeneration?.productionReady ?? false,
    skipped:
      'Live provider call was skipped. Set SMOKE_IMAGE_LIVE=1 or run `bun run smoke:image:live` to generate a real image during staging/production QA.',
  }
}

export function liveImageDraftFailure(draft: CreatorDraftPayload) {
  if (draft.image?.provider !== 'configured') {
    const warnings = draft.warnings?.filter(Boolean).join('; ')
    const issue = warnings || draft.image?.note || 'no warnings'
    return `Image smoke fell back to placeholder: ${issue}${providerFailureHint(issue)}`
  }

  if (!draft.image.url) {
    return 'Image smoke returned configured provider but no image URL'
  }

  if (draft.image.url.startsWith('data:image/svg+xml')) {
    return 'Image smoke returned the local placeholder SVG instead of a generated image'
  }

  return null
}

export function buildLiveImageSmokePayload(
  draft: CreatorDraftPayload,
  health: ImageSmokeHealthPayload,
  options: {
    baseUrl?: string
    elapsedMs: number
  },
) {
  return {
    ok: true,
    apiBaseUrl: options.baseUrl ?? apiBaseUrl,
    live: true,
    source: draft.source ?? null,
    modelName: draft.modelName ?? null,
    imageModel: health.model?.imageGeneration?.model ?? null,
    imageStatus: health.model?.imageGeneration?.status ?? null,
    imageProvider: draft.image?.provider,
    imageUrlKind: draft.image?.url?.startsWith('data:') ? 'data-url' : 'remote-or-upload-url',
    elapsedMs: options.elapsedMs,
    warnings: draft.warnings ?? [],
  }
}

export async function runImageSmoke() {
  const live = shouldRunLiveImageSmoke()
  const health = await readJson<ImageSmokeHealthPayload>('/health')
  const imageConfigured = imageGenerationIsConfigured(health)

  if (!imageConfigured) {
    throw new Error(
      'Image generation provider is not configured on the backend. Set IMAGE_GENERATION_API_KEY or OPENAI_API_KEY before production.',
    )
  }

  if (!live) {
    console.log(JSON.stringify(buildSkippedImageSmokePayload(health), null, 2))
    return
  }

  const startedAt = Date.now()
  const draft = await readJson<CreatorDraftPayload>('/creator/ai-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief:
        'Create a safe original Thai roleplay character for staging QA: a mysterious cafe owner with a slow-burn relationship arc.',
      imagePrompt:
        'original Thai roleplay character avatar, mysterious cafe owner, cinematic portrait, warm cafe light, tasteful outfit, no text, no watermark',
      current: {
        tags: 'roleplay, thai, mystery, slow-burn, staging-qa',
      },
    }),
  })

  const failure = liveImageDraftFailure(draft)
  if (failure) throw new Error(failure)

  console.log(
    JSON.stringify(
      buildLiveImageSmokePayload(draft, health, {
        elapsedMs: Date.now() - startedAt,
      }),
      null,
      2,
    ),
  )
}

if (import.meta.main) await runImageSmoke()
