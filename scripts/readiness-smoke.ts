import { apiBaseUrl } from './smoke-helpers'

export type ReadinessPayload = {
  ok: boolean
  healthOk?: boolean
  checks?: {
    databaseConfigured?: boolean
    databaseConnected?: boolean
    openRouterConfigured?: boolean
    imageGenerationConfigured?: boolean
    adminAuthConfigured?: boolean
    supabaseAuthConfigured?: boolean
  }
  readiness?: {
    status?: string
    failures?: string[]
  }
  security?: {
    authMode?: string
    adminGuard?: string
    avatarStorage?: string
    avatarStorageAccess?: string
    signedUrlExpiresIn?: number | null
  }
  env?: {
    mode?: string
    missingRequired?: string[]
    missingRecommended?: string[]
    invalid?: string[]
  }
  knowledge?: {
    structured?: {
      ok?: boolean
      fileCount?: number
      missing?: string[]
      errors?: string[]
    }
  }
  model?: {
    name?: string
    chatProvider?: {
      configured?: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
    }
    imageGeneration?: {
      configured?: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      model?: string
    }
  }
}

export type ReadinessSummary = {
  ok: boolean
  apiBaseUrl: string
  statusCode: number
  readiness: string
  failures: string[]
  checks: ReadinessPayload['checks']
  envMode: string | undefined
  missingRequired: string[] | undefined
  invalidEnv: string[] | undefined
  structuredKnowledge: boolean | undefined
  structuredKnowledgeFileCount: number | undefined
  authMode: string | undefined
  adminGuard: string | undefined
  avatarStorage: string | undefined
  avatarStorageAccess: string | undefined
  signedUrlExpiresIn: number | null | undefined
  model: string | undefined
  chatStatus: string | undefined
  chatLiveVerified: boolean | undefined
  chatProductionReady: boolean | undefined
  imageModel: string | undefined
  imageStatus: string | undefined
  imageLiveVerified: boolean | undefined
  imageProductionReady: boolean | undefined
}

export function buildReadinessSummary(
  payload: ReadinessPayload,
  options: { apiBaseUrl: string; responseOk: boolean; statusCode: number },
): ReadinessSummary {
  const failures = payload.readiness?.failures ?? []

  return {
    ok: options.responseOk && payload.ok,
    apiBaseUrl: options.apiBaseUrl,
    statusCode: options.statusCode,
    readiness: payload.readiness?.status ?? (payload.ok ? 'ready' : 'not_ready'),
    failures,
    checks: payload.checks,
    envMode: payload.env?.mode,
    missingRequired: payload.env?.missingRequired,
    invalidEnv: payload.env?.invalid,
    structuredKnowledge: payload.knowledge?.structured?.ok,
    structuredKnowledgeFileCount: payload.knowledge?.structured?.fileCount,
    authMode: payload.security?.authMode,
    adminGuard: payload.security?.adminGuard,
    avatarStorage: payload.security?.avatarStorage,
    avatarStorageAccess: payload.security?.avatarStorageAccess,
    signedUrlExpiresIn: payload.security?.signedUrlExpiresIn,
    model: payload.model?.name,
    chatStatus: payload.model?.chatProvider?.status,
    chatLiveVerified: payload.model?.chatProvider?.liveVerified,
    chatProductionReady: payload.model?.chatProvider?.productionReady,
    imageModel: payload.model?.imageGeneration?.model,
    imageStatus: payload.model?.imageGeneration?.status,
    imageLiveVerified: payload.model?.imageGeneration?.liveVerified,
    imageProductionReady: payload.model?.imageGeneration?.productionReady,
  }
}

export function formatReadinessSummary(summary: ReadinessSummary) {
  return JSON.stringify(summary, null, 2)
}

export async function readReadiness(apiBase = apiBaseUrl, fetchImpl: typeof fetch = fetch) {
  let response: Response
  try {
    response = await fetchImpl(`${apiBase}/ready`)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not reach readiness endpoint at ${apiBase}/ready (${reason})`)
  }

  const raw = await response.text()
  let payload: ReadinessPayload
  try {
    payload = JSON.parse(raw) as ReadinessPayload
  } catch {
    throw new Error(`/ready did not return JSON: ${raw.slice(0, 300) || 'empty response'}`)
  }

  return { response, payload }
}

export async function runReadinessSmoke() {
  const { response, payload } = await readReadiness()
  const summary = buildReadinessSummary(payload, {
    apiBaseUrl,
    responseOk: response.ok,
    statusCode: response.status,
  })

  console.log(formatReadinessSummary(summary))

  if (!summary.ok) {
    const reason = summary.failures.length > 0 ? summary.failures.join('; ') : `status ${response.status}`
    throw new Error(`Readiness smoke failed: ${reason}`)
  }
}

if (import.meta.main) await runReadinessSmoke()
