export const apiBaseUrl = process.env.SMOKE_API_BASE_URL ?? 'http://127.0.0.1:3000'
export const isLocalSmokeTarget = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(apiBaseUrl)

export function smokeAuthHeaders() {
  const headers: Record<string, string> = {}
  const userId = process.env.SMOKE_USER_ID ?? (isLocalSmokeTarget ? 'dev-user' : '')
  const accessToken = process.env.SMOKE_ACCESS_TOKEN
  const adminKey = process.env.SMOKE_ADMIN_API_KEY

  if (userId) headers['x-user-id'] = userId
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (adminKey) headers['x-admin-key'] = adminKey

  return headers
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

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function formatPayload(payload: unknown, fallback: string) {
  if (payload) return JSON.stringify(payload)
  return fallback.slice(0, 500)
}
