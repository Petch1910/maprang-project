import { apiBaseUrl } from './smoke-helpers'

type ReadinessPayload = {
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
  model?: {
    name?: string
  }
}

let response: Response
try {
  response = await fetch(`${apiBaseUrl}/ready`)
} catch (error) {
  const reason = error instanceof Error ? error.message : String(error)
  throw new Error(`Could not reach readiness endpoint at ${apiBaseUrl}/ready (${reason})`)
}

const raw = await response.text()
let payload: ReadinessPayload
try {
  payload = JSON.parse(raw) as ReadinessPayload
} catch {
  throw new Error(`/ready did not return JSON: ${raw.slice(0, 300) || 'empty response'}`)
}

const failures = payload.readiness?.failures ?? []

console.log(
  JSON.stringify(
    {
      ok: response.ok && payload.ok,
      apiBaseUrl,
      statusCode: response.status,
      readiness: payload.readiness?.status ?? (payload.ok ? 'ready' : 'not_ready'),
      failures,
      checks: payload.checks,
      envMode: payload.env?.mode,
      authMode: payload.security?.authMode,
      adminGuard: payload.security?.adminGuard,
      avatarStorage: payload.security?.avatarStorage,
      avatarStorageAccess: payload.security?.avatarStorageAccess,
      signedUrlExpiresIn: payload.security?.signedUrlExpiresIn,
      model: payload.model?.name,
    },
    null,
    2,
  ),
)

if (!response.ok || !payload.ok) {
  const reason = failures.length > 0 ? failures.join('; ') : `status ${response.status}`
  throw new Error(`Readiness smoke failed: ${reason}`)
}
