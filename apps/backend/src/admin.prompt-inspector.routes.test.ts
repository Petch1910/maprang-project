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
    const payload = (await response.json()) as { error?: string; message?: string }

    expect(response.status).toBe(401)
    expect(payload.error).toBe('admin_unauthorized')
    expect(payload.message).toBe('กรุณาใช้สิทธิ์ผู้ดูแลเพื่อใช้งานส่วนนี้')
  })

  test('returns Thai-first messages when admin persistence is unavailable', async () => {
    process.env.ADMIN_API_KEY = 'prompt-inspector-test-key'
    const previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    try {
      const response = await adminRoutes.handle(
        new Request('http://localhost/admin/summary', {
          headers: { 'x-admin-key': 'prompt-inspector-test-key' },
        }),
      )
      const payload = (await response.json()) as { error?: string; message?: string }

      expect(response.status).toBe(503)
      expect(payload).toEqual({
        error: 'database_not_configured',
        message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
      })
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl
      }
    }
  })

  test('runs deterministic local evals behind the admin guard', async () => {
    process.env.ADMIN_API_KEY = 'prompt-inspector-test-key'

    const response = await adminRoutes.handle(
      new Request('http://localhost/admin/evals/local', {
        headers: { 'x-admin-key': 'prompt-inspector-test-key' },
      }),
    )
    const payload = (await response.json()) as {
      passed?: boolean
      scenarioCount?: number
      results?: Array<{ id?: string; passed?: boolean; estimatedTokens?: number }>
    }

    expect(response.status).toBe(200)
    expect(payload.passed).toBe(true)
    expect(payload.scenarioCount).toBeGreaterThan(0)
    expect(payload.results?.some((result) => result.id === 'prompt-injection-defense' && result.passed)).toBe(true)
    expect(payload.results?.every((result) => typeof result.estimatedTokens === 'number')).toBe(true)
  })

  test('protects process mining summaries behind the admin guard', async () => {
    process.env.ADMIN_API_KEY = 'prompt-inspector-test-key'

    const response = await adminRoutes.handle(new Request('http://localhost/admin/process-mining?days=7'))
    const payload = (await response.json()) as { error?: string }

    expect(response.status).toBe(401)
    expect(payload.error).toBe('admin_unauthorized')
  })
})
