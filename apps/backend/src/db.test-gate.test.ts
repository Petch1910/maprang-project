import { afterEach, describe, expect, test } from 'bun:test'
import { createDbTestGate } from './db.test-gate'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

describe('database test gate', () => {
  test('keeps forced DB-test skip guidance Thai-first', async () => {
    process.env.REQUIRE_DB_TESTS = 'true'
    const shouldRun = createDbTestGate(null, 'persistence suite')

    let message = ''
    try {
      await shouldRun()
    } catch (error) {
      message = error instanceof Error ? error.message : String(error)
    }

    expect(message).toContain('ต้องใช้ Postgres database ที่เชื่อมต่อได้')
    expect(message).toContain('DATABASE_URL ยังไม่ได้ตั้งค่า')
    expect(message).not.toContain('requires a reachable Postgres database')
    expect(message).not.toContain('DATABASE_URL is not configured')
  })

  test('returns false without throwing when DB tests are optional', async () => {
    delete process.env.REQUIRE_DB_TESTS
    delete process.env.CI
    const shouldRun = createDbTestGate(null, 'optional persistence suite')

    expect(await shouldRun({ silent: true })).toBe(false)
  })
})
