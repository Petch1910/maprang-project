export const apiBaseUrl = process.env.SMOKE_API_BASE_URL ?? 'http://127.0.0.1:3000'
export const isLocalSmokeTarget = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\/?$/i.test(apiBaseUrl)

export function smokeAuthHeaders() {
  const headers: Record<string, string> = {}
  const userId = process.env.SMOKE_USER_ID ?? (isLocalSmokeTarget ? 'dev-user' : '')
  const accessToken = process.env.SMOKE_ACCESS_TOKEN

  if (userId) headers['x-user-id'] = userId
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  return headers
}

export async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${JSON.stringify(payload)}`)
  }
  return payload as T
}
