import { readdir, readFile } from 'node:fs/promises'
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

  test('formats object-shaped required DB check diagnostics without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const message = summarizeDatabaseError({
      message: `connect failed for DATABASE_URL=${fakeDatabaseUrl}`,
      toString() {
        throw new Error('ไม่ควร stringify raw object')
      },
    })

    expect(message).toContain('[REDACTED_SECRET]')
    expect(message).not.toContain('super-secret')
    expect(message).not.toContain(fakeDatabaseUrl)
  })

  test('keeps a database index for saved chat message windows', async () => {
    const schema = await readFile(join(import.meta.dir, '../apps/backend/prisma/schema.prisma'), 'utf8')
    const migrationsDir = join(import.meta.dir, '../apps/backend/prisma/migrations')
    const migrationNames = await readdir(migrationsDir)
    const migrationSql = (
      await Promise.all(
        migrationNames.map(async (name) => {
          try {
            return await readFile(join(migrationsDir, name, 'migration.sql'), 'utf8')
          } catch {
            return ''
          }
        }),
      )
    ).join('\n')

    expect(schema).toContain(
      '@@index([chatId, deletedAt, createdAt(sort: Desc), id(sort: Desc)], map: "Message_chatId_deletedAt_createdAt_id_idx")',
    )
    expect(migrationSql).toContain('CREATE INDEX "Message_chatId_deletedAt_createdAt_id_idx"')
    expect(migrationSql).toContain('ON "Message"("chatId", "deletedAt", "createdAt" DESC, "id" DESC)')
  })
})
