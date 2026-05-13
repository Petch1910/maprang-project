import { afterEach, describe, expect, test } from 'bun:test'
import { adminRoutes } from './admin.routes'

const originalAdminKey = process.env.ADMIN_API_KEY

afterEach(() => {
  process.env.ADMIN_API_KEY = originalAdminKey
})

describe('admin prompt inspector route', () => {
  test('requires admin api key before exposing prompt snapshots', async () => {
    process.env.ADMIN_API_KEY = 'prompt-inspector-test-key'

    const response = await adminRoutes.handle(
      new Request('http://localhost/admin/prompt-inspector', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
          message: 'inspect this prompt',
        }),
      }),
    )
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(401)
    expect(payload.error).toBe('admin_unauthorized')
  })
})
