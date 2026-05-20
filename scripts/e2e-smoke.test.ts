import { describe, expect, test } from 'bun:test'
import { e2eSmokeSteps, runE2eSmoke, type E2eSmokeLogger, type E2eSmokeStep } from './e2e-smoke'

const quietLogger: E2eSmokeLogger = {
  log: () => undefined,
  error: () => undefined,
}

describe('e2e smoke command plan', () => {
  test('runs seed, Playwright, then seed restore in order', () => {
    expect(e2eSmokeSteps()).toEqual([
      {
        label: 'QA seed: reset ก่อนตรวจเบราว์เซอร์',
        command: ['bun', 'run', 'qa:seed'],
      },
      {
        label: 'Playwright smoke: ตรวจ routes บนเดสก์ท็อปและมือถือ',
        command: ['bunx', 'playwright', 'test', '-c', 'playwright.config.ts'],
      },
      {
        label: 'QA seed: คืน demo data หลังตรวจเบราว์เซอร์',
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
      'QA seed: reset ก่อนตรวจเบราว์เซอร์',
      'Playwright smoke: ตรวจ routes บนเดสก์ท็อปและมือถือ',
      'QA seed: คืน demo data หลังตรวจเบราว์เซอร์',
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
    ).rejects.toThrow('QA seed: reset ก่อนตรวจเบราว์เซอร์ ไม่ผ่านด้วย exit code 1')

    expect(calls).toEqual(['QA seed: reset ก่อนตรวจเบราว์เซอร์'])
  })
})
