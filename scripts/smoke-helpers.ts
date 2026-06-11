import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { redactSensitiveText } from '../apps/backend/src/redaction'

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

export const backendEnvPath = join(import.meta.dir, '..', 'apps/backend/.env')

function unquoteEnvValue(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function backendEnvPort(envText: string) {
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^PORT\s*=\s*(.+)$/)
    if (!match?.[1]) continue
    const port = unquoteEnvValue(match[1])
    if (/^\d+$/.test(port)) return port
  }
  return ''
}

function readBackendEnvText() {
  try {
    return readFileSync(backendEnvPath, 'utf8')
  } catch {
    return ''
  }
}

export function smokeApiBaseUrl(env: SmokeEnv = process.env, backendEnvText = readBackendEnvText()) {
  const explicitBaseUrl = env.SMOKE_API_BASE_URL?.trim()
  if (explicitBaseUrl) return explicitBaseUrl
  const backendPort = backendEnvPort(backendEnvText)
  return backendPort ? `http://127.0.0.1:${backendPort}` : 'http://127.0.0.1:3000'
}

export function smokeTargetIsLocal(baseUrl: string) {
  try {
    const host = new URL(baseUrl).hostname.toLowerCase()
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(host)
  } catch {
    return false
  }
}

export function deployedSmokeTargetIssues(baseUrl: string) {
  const issues: string[] = []
  let url: URL

  try {
    url = new URL(baseUrl)
  } catch {
    return ['SMOKE_API_BASE_URL ต้องเป็น URL ที่ถูกต้อง']
  }

  if (url.protocol !== 'https:') issues.push('SMOKE_API_BASE_URL ต้องใช้ https')
  if (smokeTargetIsLocal(baseUrl)) {
    issues.push('SMOKE_API_BASE_URL ห้ามเป็น localhost/loopback (localhost/127.0.0.1/0.0.0.0/::1)')
  }
  if (url.username || url.password) issues.push('SMOKE_API_BASE_URL ห้ามมี credential/userinfo')
  if (url.pathname !== '/' || url.search || url.hash) {
    issues.push('SMOKE_API_BASE_URL ต้องเป็น backend origin เท่านั้น ห้ามมี path/query/hash')
  }

  return issues
}

export function smokeTargetIssuesForDeployedGate(baseUrl: string, localTarget: boolean) {
  const issues = deployedSmokeTargetIssues(baseUrl)
  if (!localTarget) return issues
  return issues.filter(
    (issue) =>
      issue.includes('ต้องเป็น URL ที่ถูกต้อง') ||
      issue.includes('credential/userinfo') ||
      issue.includes('path/query/hash'),
  )
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
  if (!root.ok) throw new Error('root identity ของระบบหลังบ้านคืน ok=false')
  if (root.service !== 'maprang-backend') throw new Error('root identity ของระบบหลังบ้านคืนชื่อ service ไม่ถูกต้อง')
}

export function formatDiagnosticText(value: string, maxLength: number) {
  return redactSensitiveText(value).text.slice(0, maxLength)
}

export function formatSmokeTargetDiagnosticText(baseUrl: string, maxLength: number) {
  try {
    const url = new URL(baseUrl)
    if (url.username || url.password) {
      const path = `${url.pathname}${url.search}${url.hash}`
      return formatDiagnosticText(`${url.protocol}//[REDACTED_USERINFO]@${url.host}${path}`, maxLength)
    }
  } catch {
    // Fall through to the normal redactor so malformed values are still clipped consistently.
  }
  return formatDiagnosticText(baseUrl, maxLength)
}

export function formatSmokeTargetPathDiagnosticText(baseUrl: string, path: string, maxLength: number) {
  return formatDiagnosticText(`${formatSmokeTargetDiagnosticText(baseUrl, maxLength).replace(/\/$/, '')}${path}`, maxLength)
}

export function formatUnknownDiagnosticText(error: unknown, maxLength: number) {
  if (error instanceof Error) return formatDiagnosticText(error.message, maxLength)
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return formatDiagnosticText(message, maxLength)
    const errorField = (error as { error?: unknown }).error
    if (typeof errorField === 'string') return formatDiagnosticText(errorField, maxLength)
    return ''
  }
  return formatDiagnosticText(String(error), maxLength)
}

export async function readJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${apiBaseUrl}${path}`
  let response: Response

  try {
    response = await fetch(url, init)
  } catch (error) {
    const reason = formatFetchErrorReason(error)
    throw new Error(`ติดต่อระบบหลังบ้านที่ ${formatSmokeTargetDiagnosticText(apiBaseUrl, 300)} ไม่สำเร็จ ให้เริ่มระบบหลังบ้าน ตรวจ SMOKE_API_BASE_URL แล้วลองใหม่ (${reason})`)
  }

  const raw = await response.text()
  const payload = raw ? tryParseJson(raw) : null
  if (!response.ok) {
    throw new Error(`${path} ไม่ผ่านด้วยสถานะ ${response.status}: ${formatPayload(payload, raw || response.statusText)}`)
  }
  if (!payload) {
    throw new Error(`${path} ไม่คืน JSON: ${formatDiagnosticText(raw, 300) || 'response ว่าง'}`)
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
  const text = payload ? JSON.stringify(payload) : fallback
  return formatDiagnosticText(text, 500)
}

export function formatFetchErrorReason(error: unknown) {
  const reason = formatUnknownDiagnosticText(error, 500)
  const normalized = reason.toLowerCase()
  if (
    normalized.includes('unable to connect') ||
    normalized.includes('econnrefused') ||
    normalized.includes('connection refused') ||
    normalized.includes('fetch failed')
  ) {
    return 'เชื่อมต่อไม่ได้ ตรวจว่าระบบหลังบ้านเปิดอยู่และพอร์ตถูกต้อง'
  }
  if (normalized.includes('timeout') || normalized.includes('timed out')) {
    return 'หมดเวลารอการเชื่อมต่อ ตรวจเครือข่ายหรือระบบหลังบ้าน'
  }
  return reason
}
