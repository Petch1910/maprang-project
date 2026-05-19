export type SmokeEnv = {
  SMOKE_API_BASE_URL?: string
  SMOKE_USER_ID?: string
  SMOKE_ACCESS_TOKEN?: string
  SMOKE_ADMIN_API_KEY?: string
}

export type RootIdentityPayload = {
  ok: boolean
  service?: string
}

export function smokeApiBaseUrl(env: SmokeEnv = process.env) {
  return env.SMOKE_API_BASE_URL ?? 'http://127.0.0.1:3000'
}

export function smokeTargetIsLocal(baseUrl: string) {
  return /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(baseUrl)
}

export const apiBaseUrl = smokeApiBaseUrl()
export const isLocalSmokeTarget = smokeTargetIsLocal(apiBaseUrl)

export function buildSmokeAuthHeaders(env: SmokeEnv = process.env, localTarget = smokeTargetIsLocal(smokeApiBaseUrl(env))) {
  const headers: Record<string, string> = {}
  const userId = env.SMOKE_USER_ID ?? (localTarget ? 'dev-user' : '')
  const accessToken = env.SMOKE_ACCESS_TOKEN
  const adminKey = env.SMOKE_ADMIN_API_KEY

  if (userId) headers['x-user-id'] = userId
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (adminKey) headers['x-admin-key'] = adminKey

  return headers
}

export function smokeAuthHeaders() {
  return buildSmokeAuthHeaders(process.env, isLocalSmokeTarget)
}

export function validateBackendRootIdentity(root: RootIdentityPayload) {
  if (!root.ok) throw new Error('Backend root identity returned ok=false')
  if (root.service !== 'maprang-backend') throw new Error('Backend root identity returned an unexpected service name')
}

export async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl}${path}`
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Could not reach backend at ${apiBaseUrl}. Start the backend, check SMOKE_API_BASE_URL, then try again. (${reason})`)
  }

  const raw = await response.text()
  const payload = raw ? tryParseJson(raw) : null
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${formatPayload(payload, raw || response.statusText)}`)
  }
  if (!payload) {
    throw new Error(`${path} did not return JSON: ${raw.slice(0, 300) || 'empty response'}`)
  }
  return payload as T
}

export function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export function formatPayload(payload: unknown, fallback: string) {
  if (payload) return JSON.stringify(payload)
  return fallback.slice(0, 500)
}
