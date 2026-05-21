import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, test } from 'bun:test'
import { summarizeDatabaseError } from '../apps/backend/src/db.required-check'
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

    expect(source).toContain('ตรวจฐานข้อมูลไม่ผ่าน')
    expect(source).toContain('ตรวจฐานข้อมูลผ่าน')
    expect(source).toContain('วิธีแก้ในเครื่อง')
    expect(source).toContain('วิธีแก้ตอน deploy')
    expect(source).toContain('service ระบบหลังบ้าน')
    expect(source).not.toContain('Database check')
    expect(source).not.toContain('Database check failed')
    expect(source).not.toContain('วิธีแก้ local')
    expect(source).not.toContain('วิธีแก้ deploy')
    expect(source).not.toContain('network access')
    expect(source).not.toContain('backend service')
  })

  test('redacts secret-shaped values from required DB check diagnostics', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const error = new Error(`connect failed for DATABASE_URL=${fakeDatabaseUrl}`)
    error.name = 'PrismaClientKnownRequestError'
    ;(error as Error & { code: string }).code = 'P1001'

    const message = summarizeDatabaseError(error)

    expect(message).toContain('[REDACTED_SECRET]')
    expect(message).not.toContain('super-secret')
    expect(message).not.toContain(fakeDatabaseUrl)
  })
})
