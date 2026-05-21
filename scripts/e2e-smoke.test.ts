import { describe, expect, test } from 'bun:test'
import { e2eSmokeSteps, formatE2eSmokeError, runE2eSmoke, type E2eSmokeLogger, type E2eSmokeStep } from './e2e-smoke'

const quietLogger: E2eSmokeLogger = {
  log: () => undefined,
  error: () => undefined,
}

describe('e2e smoke command plan', () => {
  test('runs seed, Playwright, then seed restore in order', () => {
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
        label: 'คืนข้อมูล QA: คืน demo data หลังตรวจเบราว์เซอร์',
        command: ['bun', 'run', 'qa:seed'],
        alwaysRun: true,
      },
    ])
  })

  test('restores demo seed data after Playwright failure', async () => {
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
      'คืนข้อมูล QA: คืน demo data หลังตรวจเบราว์เซอร์',
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
