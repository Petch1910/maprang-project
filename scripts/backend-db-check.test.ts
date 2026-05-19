import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
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

  test('keeps DB check failure guidance Thai-first', async () => {
    const source = await readFile(join(import.meta.dir, '../apps/backend/src/db.required-check.ts'), 'utf8')

    expect(source).toContain('Database check ไม่ผ่าน')
    expect(source).toContain('วิธีแก้ local')
    expect(source).toContain('วิธีแก้ deploy')
    expect(source).not.toContain('Database check failed')
    expect(source).not.toContain('Local fix:')
    expect(source).not.toContain('Deploy fix:')
  })
})
