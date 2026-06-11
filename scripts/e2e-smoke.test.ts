import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  backendEnvPort,
  e2eSmokeSteps,
  e2eSmokeTargetIssues,
  formatE2eSmokeError,
  resolveE2eSmokeEnv,
  runE2eSmoke,
  type E2eSmokeLogger,
  type E2eSmokeStep,
} from './e2e-smoke'

const e2eSpec = readFileSync(join(import.meta.dir, '..', 'tests/e2e/maprang-smoke.spec.ts'), 'utf8')

const quietLogger: E2eSmokeLogger = {
  log: () => undefined,
  error: () => undefined,
}

describe('e2e smoke command plan', () => {
  test('locks Not Found fallback route coverage', () => {
    expect(e2eSpec).toContain('/__maprang-not-found-e2e')
    expect(e2eSpec).toContain('not-found-page')
  })

  test('resolves local backend port from backend env when E2E_API_BASE_URL is omitted', () => {
    const backendEnv = 'DATABASE_URL=postgresql://example\nPORT=\"3001\"\n'

    expect(backendEnvPort(backendEnv)).toBe('3001')
    expect(resolveE2eSmokeEnv({}, backendEnv)).toMatchObject({
      E2E_BASE_URL: 'http://127.0.0.1:5173',
      E2E_API_BASE_URL: 'http://127.0.0.1:3001',
      VITE_API_BASE_URL: 'http://127.0.0.1:3001',
    })
  })

  test('keeps explicit deployed E2E targets ahead of backend env port inference', () => {
    expect(
      resolveE2eSmokeEnv(
        {
          E2E_BASE_URL: 'https://app.example.com',
          E2E_API_BASE_URL: 'https://api.example.com',
          VITE_API_BASE_URL: 'https://api.example.com',
        },
        'PORT=3001',
      ),
    ).toMatchObject({
      E2E_BASE_URL: 'https://app.example.com',
      E2E_API_BASE_URL: 'https://api.example.com',
      VITE_API_BASE_URL: 'https://api.example.com',
    })
  })

  test('runs seed, Playwright, then QA cleanup in order', () => {
    expect(e2eSmokeSteps()).toEqual([
      {
        label: 'เตรียมข้อมูล QA: reset ก่อนตรวจเบราว์เซอร์',
        command: ['bun', 'run', 'qa:seed'],
      },
      {
        label: 'ตรวจเบราว์เซอร์ Playwright: ตรวจ routes บนเดสก์ท็อปและมือถือ',
        command: ['bunx', 'playwright', 'test', '-c', 'playwright.config.ts'],
      },
      {
        label: 'ล้างข้อมูล QA: ลบ seed ทดสอบหลังตรวจเบราว์เซอร์',
        command: ['bun', 'run', 'qa:clear'],
        alwaysRun: true,
      },
    ])
  })

  test('validates staging E2E target URLs before Playwright starts', async () => {
    expect(e2eSmokeTargetIssues({})).toEqual([])
    expect(e2eSmokeTargetIssues({ E2E_BASE_URL: 'https://app.example.com', E2E_API_BASE_URL: 'https://api.example.com' })).toEqual([])
    expect(e2eSmokeTargetIssues({ E2E_BASE_URL: 'http://app.example.com' }).join('\n')).toContain('https')
    expect(e2eSmokeTargetIssues({ E2E_API_BASE_URL: 'https://smoke-user:smoke-pass@api.example.com' }).join('\n')).toContain(
      'credential/userinfo',
    )
    expect(e2eSmokeTargetIssues({ E2E_BASE_URL: 'https://app.example.com/app?x=1#debug' }).join('\n')).toContain(
      'path/query/hash',
    )

    const calls: string[] = []
    const errors: string[] = []
    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => {
        calls.push(step.label)
        return 0
      },
      { log: () => undefined, error: (error) => errors.push(error) },
      e2eSmokeSteps(),
      { E2E_API_BASE_URL: 'https://smoke-user:smoke-pass@api.example.com' },
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual([])
    expect(errors.join('\n')).toContain('credential/userinfo')
    expect(errors.join('\n')).not.toContain('smoke-pass')
  })

  test('passes the validated E2E target env to every runner step', async () => {
    const env = {
      E2E_BASE_URL: 'https://app.example.com',
      E2E_API_BASE_URL: 'https://api.example.com',
      EXTRA_E2E_FLAG: '1',
    }
    const seen: Array<{ label: string; env: Record<string, string | undefined> }> = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep, stepEnv) => {
        seen.push({ label: step.label, env: stepEnv })
        return 0
      },
      quietLogger,
      e2eSmokeSteps(),
      env,
    )

    expect(exitCode).toBe(0)
    expect(seen.map(({ label }) => label)).toEqual(e2eSmokeSteps().map(({ label }) => label))
    for (const entry of seen) {
      expect(entry.env.E2E_BASE_URL).toBe('https://app.example.com')
      expect(entry.env.E2E_API_BASE_URL).toBe('https://api.example.com')
      expect(entry.env.EXTRA_E2E_FLAG).toBe('1')
    }
  })

  test('cleans QA seed data after Playwright failure', async () => {
    const calls: string[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => {
        calls.push(step.label)
        return step.label.includes('Playwright') ? 1 : 0
      },
      quietLogger,
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual([
      'เตรียมข้อมูล QA: reset ก่อนตรวจเบราว์เซอร์',
      'ตรวจเบราว์เซอร์ Playwright: ตรวจ routes บนเดสก์ท็อปและมือถือ',
      'ล้างข้อมูล QA: ลบ seed ทดสอบหลังตรวจเบราว์เซอร์',
    ])
  })

  test('formats Playwright failure output without logging raw Error objects', async () => {
    const errors: unknown[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => (step.label.includes('Playwright') ? 1 : 0),
      { log: () => undefined, error: (error) => errors.push(error) },
    )

    expect(exitCode).toBe(1)
    expect(errors).toEqual([
      'ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: ตรวจเบราว์เซอร์ Playwright: ตรวจ routes บนเดสก์ท็อปและมือถือ ไม่ผ่านด้วย exit code 1',
    ])
  })

  test('stops before browser route check when initial seed fails', async () => {
    const calls: string[] = []

    await expect(
      runE2eSmoke(
        async (step: E2eSmokeStep) => {
          calls.push(step.label)
          return 1
        },
        quietLogger,
      ),
    ).rejects.toThrow('เตรียมข้อมูล QA: reset ก่อนตรวจเบราว์เซอร์ ไม่ผ่านด้วย exit code 1')

    expect(calls).toEqual(['เตรียมข้อมูล QA: reset ก่อนตรวจเบราว์เซอร์'])
  })

  test('formats unknown e2e smoke errors for QA logs', () => {
    expect(formatE2eSmokeError('restore failed')).toBe('ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: restore failed')
  })

  test('formats object-shaped e2e smoke errors without stringifying raw objects', () => {
    const message = formatE2eSmokeError({
      message: 'restore object failed',
      toString() {
        throw new Error('ไม่ควร stringify raw object')
      },
    })

    expect(message).toBe('ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: restore object failed')
  })

  test('redacts secret-shaped values from e2e smoke errors', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatE2eSmokeError(new Error(`Playwright failed with DATABASE_URL=${fakeDatabaseUrl}`))

    expect(message).toContain('[REDACTED_SECRET]')
    expect(message).not.toContain('super-secret')
  })
})
