import { apiBaseUrl, formatDiagnosticText, validateBackendRootIdentity, type RootIdentityPayload } from './smoke-helpers'

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
  rootIdentityOk: boolean | undefined
  rootIdentityService: string | undefined
}

export type ReadinessSmokeReadResult = {
  response: Pick<Response, 'ok' | 'status'>
  payload: ReadinessPayload
}

export type ReadinessSmokeRunnerOptions = {
  apiBaseUrl?: string
  rootIdentityReader?: (apiBaseUrl: string) => Promise<RootIdentityPayload>
  readinessReader?: (apiBaseUrl: string) => Promise<ReadinessSmokeReadResult>
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function buildReadinessSummary(
  payload: ReadinessPayload,
  options: { apiBaseUrl: string; responseOk: boolean; statusCode: number; rootIdentity?: RootIdentityPayload },
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
    rootIdentityOk: options.rootIdentity?.ok,
    rootIdentityService: options.rootIdentity?.service,
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
    const reason = formatDiagnosticText(error instanceof Error ? error.message : String(error), 500)
    throw new Error(`ติดต่อ endpoint ความพร้อมที่ ${apiBase}/ready ไม่ได้ (${reason})`)
  }

  const raw = await response.text()
  let payload: ReadinessPayload
  try {
    payload = JSON.parse(raw) as ReadinessPayload
  } catch {
    throw new Error(`/ready ไม่ได้คืน JSON: ${formatDiagnosticText(raw, 300) || 'response ว่าง'}`)
  }

  return { response, payload }
}

export async function readBackendRootIdentity(apiBase = apiBaseUrl, fetchImpl: typeof fetch = fetch) {
  let response: Response
  try {
    response = await fetchImpl(`${apiBase}/`)
  } catch (error) {
    const reason = formatDiagnosticText(error instanceof Error ? error.message : String(error), 500)
    throw new Error(`ติดต่อ root identity ของระบบหลังบ้านที่ ${apiBase}/ ไม่ได้ (${reason})`)
  }

  const raw = await response.text()
  let payload: RootIdentityPayload
  try {
    payload = JSON.parse(raw) as RootIdentityPayload
  } catch {
    throw new Error(`/ ไม่ได้คืน JSON: ${formatDiagnosticText(raw, 300) || 'response ว่าง'}`)
  }

  if (!response.ok) throw new Error(`/ ตอบ ${response.status}: ${formatDiagnosticText(raw, 300) || response.statusText}`)
  validateBackendRootIdentity(payload)
  return payload
}

export async function runReadinessSmoke(options: ReadinessSmokeRunnerOptions = {}) {
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const rootIdentityReader = options.rootIdentityReader ?? readBackendRootIdentity
  const readinessReader = options.readinessReader ?? readReadiness
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  let rootIdentity: RootIdentityPayload
  try {
    rootIdentity = await rootIdentityReader(currentApiBaseUrl)
    validateBackendRootIdentity(rootIdentity)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`ตรวจ readiness ไม่ผ่าน: ${message}`)
    return 1
  }

  let result: ReadinessSmokeReadResult
  try {
    result = await readinessReader(currentApiBaseUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`ตรวจ readiness ไม่ผ่าน: ${message}`)
    return 1
  }

  const { response, payload } = result
  const summary = buildReadinessSummary(payload, {
    apiBaseUrl: currentApiBaseUrl,
    responseOk: response.ok,
    statusCode: response.status,
    rootIdentity,
  })

  writeLine(formatReadinessSummary(summary))

  if (!summary.ok) {
    const reason = summary.failures.length > 0 ? summary.failures.join('; ') : `สถานะ ${response.status}`
    writeError(`ตรวจ readiness ไม่ผ่าน: ${reason}`)
    return 1
  }

  return 0
}

if (import.meta.main) process.exit(await runReadinessSmoke())
