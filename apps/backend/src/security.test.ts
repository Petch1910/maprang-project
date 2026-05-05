import { afterEach, describe, expect, test } from 'bun:test'
import { rateLimitKey, requireAdminApiKey, resolveRequestUserId, routeRateLimitMax } from './security'

describe('security helpers', () => {
  const previousAdminKey = process.env.ADMIN_API_KEY
  const previousSupabaseUrl = process.env.SUPABASE_URL
  const previousSupabaseIssuer = process.env.SUPABASE_JWT_ISSUER

  afterEach(() => {
    if (previousAdminKey === undefined) delete process.env.ADMIN_API_KEY
    else process.env.ADMIN_API_KEY = previousAdminKey
    if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousSupabaseUrl
    if (previousSupabaseIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER
    else process.env.SUPABASE_JWT_ISSUER = previousSupabaseIssuer
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

  test('route rate limits are stricter for chat generation', () => {
    expect(routeRateLimitMax('local', new Request('http://local/chat'))).toBeLessThan(
      routeRateLimitMax('local', new Request('http://local/characters')),
    )
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
})
