import { describe, expect, test } from 'bun:test'
import { backendDbCheckSteps } from './backend-db-check'

describe('backend db check command plan', () => {
  test('checks DB availability before requiring DB-backed backend tests', () => {
    const steps = backendDbCheckSteps({ DATABASE_URL: 'postgresql://example/test' })

    expect(steps[0]).toEqual({
      command: ['bun', 'src/db.required-check.ts'],
      cwd: 'apps/backend',
      env: { DATABASE_URL: 'postgresql://example/test' },
    })
    expect(steps[1].command).toEqual(['bun', 'run', 'backend:check'])
    expect(steps[1].env?.DATABASE_URL).toBe('postgresql://example/test')
    expect(steps[1].env?.REQUIRE_DB_TESTS).toBe('true')
  })
})
