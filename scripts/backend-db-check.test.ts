import { describe, expect, test } from 'bun:test'
import { backendDbCheckSteps, runBackendDbCheck, type BackendDbCheckStep } from './backend-db-check'

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

  test('runs the DB check command plan through an importable runner', async () => {
    const steps: BackendDbCheckStep[] = []
    const exitCode = await runBackendDbCheck({ DATABASE_URL: 'postgresql://example/test' }, async (step) => {
      steps.push(step)
      return 0
    })

    expect(exitCode).toBe(0)
    expect(steps.map((step) => step.command)).toEqual([
      ['bun', 'src/db.required-check.ts'],
      ['bun', 'run', 'backend:check'],
    ])
  })

  test('stops the DB check command plan after the first failing step', async () => {
    const steps: BackendDbCheckStep[] = []
    const exitCode = await runBackendDbCheck({ DATABASE_URL: 'postgresql://example/test' }, async (step) => {
      steps.push(step)
      return 17
    })

    expect(exitCode).toBe(17)
    expect(steps.map((step) => step.command)).toEqual([['bun', 'src/db.required-check.ts']])
  })
})
