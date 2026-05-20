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
  if (!root.ok) throw new Error('backend root identity คืน ok=false')
  if (root.service !== 'maprang-backend') throw new Error('backend root identity คืน service name ไม่ถูกต้อง')
}

export async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl}${path}`
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    const reason = formatFetchErrorReason(error)
    throw new Error(`ติดต่อ backend ที่ ${apiBaseUrl} ไม่สำเร็จ ให้เริ่ม backend ตรวจ SMOKE_API_BASE_URL แล้วลองใหม่ (${reason})`)
  }

  const raw = await response.text()
  const payload = raw ? tryParseJson(raw) : null
  if (!response.ok) {
    throw new Error(`${path} ไม่ผ่านด้วย status ${response.status}: ${formatPayload(payload, raw || response.statusText)}`)
  }
  if (!payload) {
    throw new Error(`${path} ไม่คืน JSON: ${raw.slice(0, 300) || 'response ว่าง'}`)
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

export function formatFetchErrorReason(error: unknown) {
  const reason = error instanceof Error ? error.message : String(error)
  const normalized = reason.toLowerCase()
  if (
    normalized.includes('unable to connect') ||
    normalized.includes('econnrefused') ||
    normalized.includes('connection refused') ||
    normalized.includes('fetch failed')
  ) {
    return 'เชื่อมต่อไม่ได้ ตรวจว่า backend เปิดอยู่และพอร์ตถูกต้อง'
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'หมดเวลารอการเชื่อมต่อ ตรวจ network หรือ backend'
  }
  return reason
}
