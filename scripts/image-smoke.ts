import { apiBaseUrl, readJson, validateBackendRootIdentity, type RootIdentityPayload } from './smoke-helpers'

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

export type ImageSmokeRunnerOptions = {
  argv?: string[]
  env?: Record<string, string | undefined>
  apiBaseUrl?: string
  readRootIdentity?: () => Promise<RootIdentityPayload>
  readHealth?: () => Promise<ImageSmokeHealthPayload>
  readCreatorDraft?: () => Promise<CreatorDraftPayload>
  now?: () => number
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
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

export async function runImageSmoke(options: ImageSmokeRunnerOptions = {}) {
  const argv = options.argv ?? process.argv
  const env = options.env ?? process.env
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const now = options.now ?? (() => Date.now())
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))
  const live = shouldRunLiveImageSmoke(argv, env)

  let health: ImageSmokeHealthPayload
  try {
    validateBackendRootIdentity(await (options.readRootIdentity ?? (() => readJson<RootIdentityPayload>('/')))())
    health = await (options.readHealth ?? (() => readJson<ImageSmokeHealthPayload>('/health')))()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`Image smoke failed: ${message}`)
    return 1
  }

  const imageConfigured = imageGenerationIsConfigured(health)

  if (!imageConfigured) {
    writeError('Image generation provider is not configured on the backend. Set IMAGE_GENERATION_API_KEY or OPENAI_API_KEY before production.')
    return 1
  }

  if (!live) {
    writeLine(JSON.stringify(buildSkippedImageSmokePayload(health, currentApiBaseUrl), null, 2))
    return 0
  }

  const startedAt = now()
  let draft: CreatorDraftPayload
  try {
    draft = await (options.readCreatorDraft ??
      (() =>
        readJson<CreatorDraftPayload>('/creator/ai-draft', {
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
        })))()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`Image smoke failed: ${message}`)
    return 1
  }

  const failure = liveImageDraftFailure(draft)
  if (failure) {
    writeError(failure)
    return 1
  }

  writeLine(
    JSON.stringify(
      buildLiveImageSmokePayload(draft, health, {
        baseUrl: currentApiBaseUrl,
        elapsedMs: now() - startedAt,
      }),
      null,
      2,
    ),
  )
  return 0
}

if (import.meta.main) process.exit(await runImageSmoke())
