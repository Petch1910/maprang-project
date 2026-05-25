import {
  apiBaseUrl,
  formatUnknownDiagnosticText,
  readJson,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'

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
    return ' | วิธีแก้: เพิ่มหรือรีเซ็ตเพดานวงเงินของผู้ให้บริการสร้างรูป แล้วรัน `bun run smoke:image:live` ใหม่'
  }
  if (normalized.includes('insufficient_quota') || normalized.includes('quota')) {
    return ' | วิธีแก้: เติมเครดิต/โควตาของผู้ให้บริการสร้างรูป แล้วรัน `bun run smoke:image:live` ใหม่'
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('invalid api key')) {
    return ' | วิธีแก้: เปลี่ยน IMAGE_GENERATION_API_KEY/OPENAI_API_KEY เป็นคีย์ฝั่งระบบหลังบ้านสำหรับสร้างรูปที่ถูกต้อง'
  }
  if (normalized.includes('model')) {
    return ' | วิธีแก้: ตรวจ IMAGE_GENERATION_MODEL และสิทธิ์บัญชีผู้ให้บริการว่าสร้างรูปด้วยโมเดลนั้นได้'
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
      'ข้ามการเรียกสร้างรูปจริงแล้ว ตั้ง SMOKE_IMAGE_LIVE=1 หรือรัน `bun run smoke:image:live` เพื่อสร้างรูปจริงตอน QA สเตจจิงหรือโปรดักชัน',
  }
}

export function liveImageDraftFailure(draft: CreatorDraftPayload) {
  if (draft.image?.provider !== 'configured') {
    const warnings = draft.warnings?.filter(Boolean).join('; ')
    const issue = warnings || draft.image?.note || 'ไม่มีรายละเอียดจากผู้ให้บริการสร้างรูป'
    return `ตรวจสร้างรูปจริงกลับไปใช้ภาพตัวอย่างระบบ: ${issue}${providerFailureHint(issue)}`
  }

  if (!draft.image.url) {
    return 'ตรวจสร้างรูปจริงใช้ผู้ให้บริการที่ตั้งค่าแล้ว แต่ไม่พบ URL รูป'
  }

  if (draft.image.url.startsWith('data:image/svg+xml')) {
    return 'ตรวจสร้างรูปจริงได้ SVG ตัวอย่างในเครื่องแทนรูปจริงจากผู้ให้บริการ'
  }

  return null
}

export function imageSmokeUrlKind(url?: string) {
  if (!url) return 'missing-url'
  return url.startsWith('data:') ? 'data-url' : 'remote-or-upload-url'
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
    imageUrlKind: imageSmokeUrlKind(draft.image?.url),
    elapsedMs: options.elapsedMs,
    warnings: draft.warnings ?? [],
  }
}

export function formatImageSmokeCaughtError(error: unknown) {
  return formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
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
    const message = formatImageSmokeCaughtError(error)
    writeError(`ตรวจสร้างรูปไม่ผ่าน: ${message}`)
    return 1
  }

  const imageConfigured = imageGenerationIsConfigured(health)

  if (!imageConfigured) {
    writeError(
      'ผู้ให้บริการสร้างรูปยังไม่ได้ตั้งค่าบนระบบหลังบ้าน ตั้ง IMAGE_GENERATION_API_KEY หรือ OPENAI_API_KEY ก่อนตรวจโปรดักชัน',
    )
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
    const message = formatImageSmokeCaughtError(error)
    writeError(`ตรวจสร้างรูปจริงไม่ผ่าน: ${message}`)
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
