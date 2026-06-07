import { Role } from '@prisma/client'
import { defaultUserId } from './config'
import { getPrisma } from './db'

type AdminGuardContext = {
  request: Request
  set: {
    status?: number | string
  }
}

type JwtHeader = {
  alg?: string
  kid?: string
  typ?: string
}

type SupabaseJwtPayload = {
  sub?: string
  email?: string
  role?: string
  aud?: string | string[]
  iss?: string
  exp?: number
  app_metadata?: {
    role?: string
    app_role?: string
  }
  user_metadata?: {
    username?: string
    name?: string
    preferred_username?: string
  }
}

type SupabaseUserResponse = {
  id?: string
  email?: string
  role?: string
  app_metadata?: SupabaseJwtPayload['app_metadata']
  user_metadata?: SupabaseJwtPayload['user_metadata']
}

type JwksKey = {
  kid?: string
  kty: string
  alg?: string
  use?: string
  n?: string
  e?: string
}

let jwksCache: { keys: JwksKey[]; expiresAt: number } | null = null
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const safeRecordIdPattern = /^[a-z0-9_-]{8,80}$/i

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && uuidPattern.test(value))
}

export function isSafeRecordId(value: string | null | undefined): value is string {
  return Boolean(value && safeRecordIdPattern.test(value))
}

export class AuthError extends Error {
  code: 'auth_required' | 'invalid_auth_token'

  constructor(code: AuthError['code'], message: string) {
    super(message)
    this.name = 'AuthError'
    this.code = code
  }
}

export const authErrorMessages = {
  invalidAuthToken: 'โทเคนเข้าสู่ระบบของ Supabase ไม่ถูกต้องหรือหมดอายุ',
  authRequired: 'กรุณาเข้าสู่ระบบก่อนใช้งานส่วนนี้',
  jwksMalformed: 'Supabase JWKS ตอบกลับ JSON ไม่ถูกต้อง',
  userMalformed: 'Supabase auth user ตอบกลับ JSON ไม่ถูกต้อง',
}

export function authErrorResponse(error: AuthError) {
  return {
    error: error.code,
    message: error.code === 'invalid_auth_token' ? authErrorMessages.invalidAuthToken : authErrorMessages.authRequired,
  }
}

export const rateLimitReplyMessage = 'ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่'

export function buildRateLimitErrorResponse() {
  return new Response(JSON.stringify({ error: 'rate_limited', message: rateLimitReplyMessage }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

function bearerToken(request: Request) {
  return request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
}

function base64UrlToBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
}

function decodeJsonPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as T
}

function supabaseIssuer() {
  const explicitIssuer = process.env.SUPABASE_JWT_ISSUER?.trim()
  if (explicitIssuer) return explicitIssuer.replace(/\/$/, '')

  const supabaseUrl = process.env.SUPABASE_URL?.trim()
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, '')}/auth/v1` : null
}

function strictAuthEnabled() {
  return process.env.NODE_ENV === 'production' && Boolean(supabaseIssuer())
}

function supabaseAuthVerificationApiKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    null
  )
}

async function loadSupabaseJwks() {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys

  const issuer = supabaseIssuer()
  if (!issuer) return []

  const response = await fetch(`${issuer}/.well-known/jwks.json`)
  if (!response.ok) throw new Error(`โหลด Supabase JWKS ไม่สำเร็จด้วย status ${response.status}`)

  const body = await readSupabaseJwksPayload(response)
  jwksCache = {
    keys: body.keys ?? [],
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  return jwksCache.keys
}

export async function readSupabaseJwksPayload(response: Response) {
  try {
    return (await response.json()) as { keys?: JwksKey[] }
  } catch {
    throw new Error(authErrorMessages.jwksMalformed)
  }
}

export async function readSupabaseUserPayload(response: Response) {
  try {
    return (await response.json()) as SupabaseUserResponse
  } catch {
    throw new Error(authErrorMessages.userMalformed)
  }
}

async function verifySupabaseJwt(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [encodedHeader, encodedPayload, encodedSignature] = parts
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null
    const header = decodeJsonPart<JwtHeader>(encodedHeader)
    const payload = decodeJsonPart<SupabaseJwtPayload>(encodedPayload)
    if (header.alg !== 'RS256' || !header.kid || !payload.sub) return null

    const issuer = supabaseIssuer()
    if (!issuer || payload.iss?.replace(/\/$/, '') !== issuer) return null
    if (payload.exp && payload.exp * 1000 < Date.now()) return null

    const key = (await loadSupabaseJwks()).find((item) => item.kid === header.kid && item.kty === 'RSA')
    if (!key) return null

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      {
        kty: key.kty,
        n: key.n,
        e: key.e,
      },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const isValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      base64UrlToBytes(encodedSignature),
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    )

    return isValid ? payload : null
  } catch {
    return null
  }
}

async function verifySupabaseJwtWithAuthServer(token: string) {
  const issuer = supabaseIssuer()
  const apiKey = supabaseAuthVerificationApiKey()
  if (!issuer || !apiKey) return null

  let user: SupabaseUserResponse
  try {
    const response = await fetch(`${issuer}/user`, {
      headers: {
        apikey: apiKey,
        authorization: `Bearer ${token}`,
      },
    })
    if (!response.ok) return null
    user = await readSupabaseUserPayload(response)
  } catch {
    return null
  }

  if (!user.id) return null
  return {
    sub: user.id,
    email: user.email,
    role: user.role,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  } satisfies SupabaseJwtPayload
}

async function syncSupabaseUser(payload: SupabaseJwtPayload) {
  if (!payload.sub || !payload.email) return payload.sub

  const prisma = getPrisma()
  if (!prisma) return payload.sub

  const metadata = payload.user_metadata ?? {}
  const role = payload.app_metadata?.role === 'admin' || payload.app_metadata?.app_role === 'admin' ? Role.ADMIN : Role.USER
  await prisma.user.upsert({
    where: { id: payload.sub },
    update: {
      email: payload.email,
      username: metadata.username ?? metadata.preferred_username ?? metadata.name ?? undefined,
      role,
    },
    create: {
      id: payload.sub,
      email: payload.email,
      username: metadata.username ?? metadata.preferred_username ?? metadata.name ?? null,
      role,
    },
  })

  return payload.sub
}

export function requestUserId(request: Request, fallback?: string) {
  const requestedUserId = request.headers.get('x-user-id')?.trim()
  if (isUuid(requestedUserId)) return requestedUserId

  return fallback ?? defaultUserId
}

export async function resolveRequestUserId(request: Request, fallback?: string) {
  const token = bearerToken(request)
  if (token && supabaseIssuer()) {
    const payload = (await verifySupabaseJwt(token)) ?? (await verifySupabaseJwtWithAuthServer(token))
    if (payload?.sub) return syncSupabaseUser(payload)
    if (strictAuthEnabled()) {
      throw new AuthError('invalid_auth_token', authErrorMessages.invalidAuthToken)
    }
  }

  if (strictAuthEnabled()) {
    if (isAdminRequest(request)) return requestUserId(request, fallback)
    throw new AuthError('auth_required', authErrorMessages.authRequired)
  }

  return requestUserId(request, fallback)
}

export function isAdminRequest(request: Request) {
  const expected = process.env.ADMIN_API_KEY?.trim()
  if (!expected) return false

  const token = request.headers.get('x-admin-key') ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return token === expected
}

export function requireAdminApiKey({ request, set }: AdminGuardContext) {
  const expected = process.env.ADMIN_API_KEY?.trim()
  if (!expected) return true

  if (isAdminRequest(request)) return true

  set.status = 401
  return false
}

export function canAccessOwnerResource({
  request,
  ownerId,
  actorId,
}: {
  request: Request
  ownerId: string
  actorId?: string
}) {
  return isAdminRequest(request) || (!!actorId && actorId === ownerId)
}

export function rateLimitKey(request: Request) {
  if (strictAuthEnabled()) {
    const adminUserId = isAdminRequest(request) ? request.headers.get('x-user-id')?.trim() : null
    const token = bearerToken(request)
    if (isUuid(adminUserId)) return `admin-user:${adminUserId}`
    if (token) return `auth-token:${token.slice(-32)}`
    return ipRateLimitKey(request)
  }

  return request.headers.get('x-user-id') ?? ipRateLimitKey(request)
}

export function rateLimitBucket(request: Request) {
  const path = new URL(request.url).pathname
  const method = request.method.toUpperCase()

  if (path === '/chat' || path === '/chat/stream') return 'chat'
  if (path === '/creator/ai-draft') return 'ai-draft'
  if (path.startsWith('/admin')) return 'admin'
  if (path === '/health' || path === '/ready' || path === '/') return 'system'
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return 'read'
  return 'write'
}

export function rateLimitRequestKey(request: Request) {
  return `${rateLimitKey(request)}:${rateLimitBucket(request)}`
}

function ipRateLimitKey(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'local'
  )
}

export function routeRateLimitMax(key: string, request: Request) {
  const bucket = rateLimitBucket(request)
  if (bucket === 'chat') return 30
  if (bucket === 'ai-draft') return 20
  if (bucket === 'admin') return 120
  if (bucket === 'read' || bucket === 'system') return 600
  return 240
}
