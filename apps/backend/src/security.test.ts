import { afterEach, describe, expect, test } from 'bun:test'
import { chatRoutes } from './chat.routes'
import {
  AuthError,
  buildRateLimitErrorResponse,
  rateLimitBucket,
  rateLimitKey,
  rateLimitReplyMessage,
  rateLimitRequestKey,
  requireAdminApiKey,
  resolveRequestUserId,
  routeRateLimitMax,
} from './security'

describe('security helpers', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousAdminKey = process.env.ADMIN_API_KEY
  const previousSupabaseUrl = process.env.SUPABASE_URL
  const previousSupabaseIssuer = process.env.SUPABASE_JWT_ISSUER
  const previousSupabaseAnonKey = process.env.SUPABASE_ANON_KEY
  const previousSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousAdminKey === undefined) delete process.env.ADMIN_API_KEY
    else process.env.ADMIN_API_KEY = previousAdminKey
    if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousSupabaseUrl
    if (previousSupabaseIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER
    else process.env.SUPABASE_JWT_ISSUER = previousSupabaseIssuer
    if (previousSupabaseAnonKey === undefined) delete process.env.SUPABASE_ANON_KEY
    else process.env.SUPABASE_ANON_KEY = previousSupabaseAnonKey
    if (previousSupabaseServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY
    else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseServiceRoleKey
  })

  test('admin key guard is disabled until ADMIN_API_KEY is configured', () => {
    delete process.env.ADMIN_API_KEY
    const set = { status: 200 }

    expect(requireAdminApiKey({ request: new Request('http://local/admin/summary'), set })).toBe(true)
    expect(set.status).toBe(200)
  })

  test('admin key guard accepts bearer or x-admin-key when configured', () => {
    process.env.ADMIN_API_KEY = 'secret'

    expect(
      requireAdminApiKey({
        request: new Request('http://local/admin/summary', { headers: { authorization: 'Bearer secret' } }),
        set: { status: 200 },
      }),
    ).toBe(true)
    expect(
      requireAdminApiKey({
        request: new Request('http://local/admin/summary', { headers: { 'x-admin-key': 'secret' } }),
        set: { status: 200 },
      }),
    ).toBe(true)
  })

  test('admin key guard rejects missing key when configured', () => {
    process.env.ADMIN_API_KEY = 'secret'
    const set = { status: 200 }

    expect(requireAdminApiKey({ request: new Request('http://local/admin/summary'), set })).toBe(false)
    expect(set.status).toBe(401)
  })

  test('rate limit key prefers explicit user id before proxy headers', () => {
    const request = new Request('http://local/chat', {
      headers: {
        'x-user-id': 'user-1',
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
    })

    expect(rateLimitKey(request)).toBe('user-1')
  })

  test('production rate limit key ignores spoofed user ids without admin auth', () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    delete process.env.ADMIN_API_KEY
    const request = new Request('http://local/chat', {
      headers: {
        'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      },
    })

    expect(rateLimitKey(request)).toBe('203.0.113.1')
  })

  test('route rate limits are stricter for chat generation', () => {
    expect(routeRateLimitMax('local', new Request('http://local/chat'))).toBeLessThan(
      routeRateLimitMax('local', new Request('http://local/characters')),
    )
  })

  test('rate limit request key separates read navigation from expensive chat generation', () => {
    const headers = { 'x-user-id': 'user-1' }
    const readRequest = new Request('http://local/characters', { headers })
    const chatRequest = new Request('http://local/chat', { method: 'POST', headers })

    expect(rateLimitBucket(readRequest)).toBe('read')
    expect(rateLimitBucket(chatRequest)).toBe('chat')
    expect(rateLimitRequestKey(readRequest)).toBe('user-1:read')
    expect(rateLimitRequestKey(chatRequest)).toBe('user-1:chat')
  })

  test('rate limit response is Thai-first and machine-readable', async () => {
    const response = buildRateLimitErrorResponse()
    const body = (await response.json()) as { error?: string; message?: string }

    expect(response.status).toBe(429)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body.error).toBe('rate_limited')
    expect(body.message).toBe(rateLimitReplyMessage)
    expect(body.message).toContain('ส่งคำขอถี่เกินไป')
  })

  test('request user resolution keeps local dev fallback when Supabase issuer is not configured', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_JWT_ISSUER

    await expect(
      resolveRequestUserId(
        new Request('http://local/me/usage', {
          headers: {
            authorization: 'Bearer not-a-real-token',
            'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
        'fallback-user',
      ),
    ).resolves.toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  test('request user resolution ignores invalid local dev user ids', async () => {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_JWT_ISSUER

    await expect(
      resolveRequestUserId(
        new Request('http://local/me/usage', {
          headers: {
            'x-user-id': 'dev-user',
          },
        }),
        '550e8400-e29b-41d4-a716-446655440000',
      ),
    ).resolves.toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  test('production Supabase auth rejects local user id impersonation without admin key', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    delete process.env.SUPABASE_JWT_ISSUER
    delete process.env.ADMIN_API_KEY

    await expect(
      resolveRequestUserId(
        new Request('http://local/me/usage', {
          headers: {
            'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
        'fallback-user',
      ),
    ).rejects.toBeInstanceOf(AuthError)
  })

  test('production Supabase auth allows admin-key smoke user impersonation', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    process.env.ADMIN_API_KEY = 'secret'
    delete process.env.SUPABASE_JWT_ISSUER

    await expect(
      resolveRequestUserId(
        new Request('http://local/me/usage', {
          headers: {
            'x-admin-key': 'secret',
            'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
          },
        }),
        'fallback-user',
      ),
    ).resolves.toBe('550e8400-e29b-41d4-a716-446655440000')
  })

  test('chat route returns 401 for production auth failures instead of provider fallback', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    delete process.env.ADMIN_API_KEY

    const response = await chatRoutes.handle(
      new Request('http://local/chat', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': '550e8400-e29b-41d4-a716-446655440000',
        },
        body: JSON.stringify({
          message: 'hello',
        }),
      }),
    )
    const body = (await response.json()) as { error?: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('auth_required')
  })
})
