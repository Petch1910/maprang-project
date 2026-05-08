import { apiBaseUrl, readJson } from './smoke-helpers'

type HealthPayload = {
  ok: boolean
  checks?: {
    imageGenerationConfigured?: boolean
    openRouterConfigured?: boolean
  }
  model?: {
    imageGeneration?: {
      configured?: boolean
      model?: string
    }
  }
}

type CreatorDraftPayload = {
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

const live = ['1', 'true', 'yes'].includes(String(process.env.SMOKE_IMAGE_LIVE ?? '').toLowerCase())

const health = await readJson<HealthPayload>('/health')
const imageConfigured = Boolean(health.checks?.imageGenerationConfigured || health.model?.imageGeneration?.configured)

if (!imageConfigured) {
  throw new Error(
    'Image generation provider is not configured on the backend. Set IMAGE_GENERATION_API_KEY or OPENAI_API_KEY before production.',
  )
}

if (!live) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        apiBaseUrl,
        live: false,
        imageGenerationConfigured: true,
        imageModel: health.model?.imageGeneration?.model ?? null,
        skipped: 'Live provider call was skipped. Set SMOKE_IMAGE_LIVE=1 to generate a real image during staging/production QA.',
      },
      null,
      2,
    ),
  )
  process.exit(0)
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

if (draft.image?.provider !== 'configured') {
  const warnings = draft.warnings?.filter(Boolean).join('; ')
  throw new Error(`Image smoke fell back to placeholder: ${warnings || draft.image?.note || 'no warnings'}`)
}

if (!draft.image.url) {
  throw new Error('Image smoke returned configured provider but no image URL')
}

if (draft.image.url.startsWith('data:image/svg+xml')) {
  throw new Error('Image smoke returned the local placeholder SVG instead of a generated image')
}

console.log(
  JSON.stringify(
    {
      ok: true,
      apiBaseUrl,
      live: true,
      source: draft.source ?? null,
      modelName: draft.modelName ?? null,
      imageModel: health.model?.imageGeneration?.model ?? null,
      imageProvider: draft.image.provider,
      imageUrlKind: draft.image.url.startsWith('data:') ? 'data-url' : 'remote-or-upload-url',
      elapsedMs: Date.now() - startedAt,
      warnings: draft.warnings ?? [],
    },
    null,
    2,
  ),
)
