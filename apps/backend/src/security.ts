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
  user_metadata?: {
    username?: string
    name?: string
    preferred_username?: string
  }
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

async function loadSupabaseJwks() {
  if (jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache.keys

  const issuer = supabaseIssuer()
  if (!issuer) return []

  const response = await fetch(`${issuer}/.well-known/jwks.json`)
  if (!response.ok) throw new Error(`Supabase JWKS fetch failed with status ${response.status}`)

  const body = (await response.json()) as { keys?: JwksKey[] }
  jwksCache = {
    keys: body.keys ?? [],
    expiresAt: Date.now() + 10 * 60 * 1000,
  }
  return jwksCache.keys
}

async function verifySupabaseJwt(token: string) {
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
}

async function syncSupabaseUser(payload: SupabaseJwtPayload) {
  if (!payload.sub || !payload.email) return payload.sub

  const prisma = getPrisma()
  if (!prisma) return payload.sub

  const metadata = payload.user_metadata ?? {}
  await prisma.user.upsert({
    where: { id: payload.sub },
    update: {
      email: payload.email,
      username: metadata.username ?? metadata.preferred_username ?? metadata.name ?? undefined,
    },
    create: {
      id: payload.sub,
      email: payload.email,
      username: metadata.username ?? metadata.preferred_username ?? metadata.name ?? null,
      role: payload.role === 'admin' ? Role.ADMIN : Role.USER,
    },
  })

  return payload.sub
}

export function requestUserId(request: Request, fallback?: string) {
  const requestedUserId = request.headers.get('x-user-id')?.trim()
  if (requestedUserId && uuidPattern.test(requestedUserId)) return requestedUserId

  return fallback ?? defaultUserId
}

export async function resolveRequestUserId(request: Request, fallback?: string) {
  const token = bearerToken(request)
  if (token && supabaseIssuer()) {
    const payload = await verifySupabaseJwt(token)
    if (payload?.sub) return syncSupabaseUser(payload)
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
  return (
    request.headers.get('x-user-id') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'local'
  )
}

export function routeRateLimitMax(key: string, request: Request) {
  const path = new URL(request.url).pathname
  if (path === '/chat' || path === '/chat/stream') return 30
  if (path.startsWith('/relationship/preview')) return 60
  if (path.startsWith('/admin')) return 120
  return 240
}
