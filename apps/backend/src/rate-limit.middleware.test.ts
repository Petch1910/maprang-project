import { afterEach, describe, expect, test } from 'bun:test'
import { defaultUserId } from './config'
import { requireTokens, resolveTokenGuardUserId } from './rate-limit.middleware'
import { authErrorMessages } from './security'

describe('token guard middleware', () => {
  const previousNodeEnv = process.env.NODE_ENV
  const previousSupabaseUrl = process.env.SUPABASE_URL
  const previousSupabaseIssuer = process.env.SUPABASE_JWT_ISSUER
  const previousAdminKey = process.env.ADMIN_API_KEY

  afterEach(() => {
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = previousNodeEnv
    if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL
    else process.env.SUPABASE_URL = previousSupabaseUrl
    if (previousSupabaseIssuer === undefined) delete process.env.SUPABASE_JWT_ISSUER
    else process.env.SUPABASE_JWT_ISSUER = previousSupabaseIssuer
    if (previousAdminKey === undefined) delete process.env.ADMIN_API_KEY
    else process.env.ADMIN_API_KEY = previousAdminKey
  })

  test('uses the Elysia context user id when a route derives one', async () => {
    await expect(
      resolveTokenGuardUserId({
        request: new Request('http://local/chat'),
        set: {},
        userId: 'route-user-1',
      }),
    ).resolves.toBe('route-user-1')
  })

  test('resolves local request identity instead of a hard-coded placeholder', async () => {
    await expect(
      resolveTokenGuardUserId({
        request: new Request('http://local/chat', {
          headers: { 'x-user-id': '550e8400-e29b-41d4-a716-446655440000' },
        }),
        set: {},
      }),
    ).resolves.toBe('550e8400-e29b-41d4-a716-446655440000')

    await expect(
      resolveTokenGuardUserId({
        request: new Request('http://local/chat'),
        set: {},
      }),
    ).resolves.toBe(defaultUserId)
  })

  test('returns the shared auth error before token checks in strict production auth', async () => {
    process.env.NODE_ENV = 'production'
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co'
    delete process.env.SUPABASE_JWT_ISSUER
    delete process.env.ADMIN_API_KEY
    const set: { status?: number | string } = {}

    const result = await (await requireTokens(1))({
      request: new Request('http://local/chat'),
      set,
    })

    expect(set.status).toBe(401)
    expect(result).toEqual({
      error: 'auth_required',
      message: authErrorMessages.authRequired,
    })
  })

  test('source does not keep the old placeholder guard identity', async () => {
    const source = await Bun.file(new URL('./rate-limit.middleware.ts', import.meta.url)).text()

    expect(source).not.toContain("const userId = 'user-id'")
    expect(source).not.toContain('TODO: Get from Elysia context')
  })
})
