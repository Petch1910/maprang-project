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
        label: 'QA seed: reset before browser smoke',
        command: ['bun', 'run', 'qa:seed'],
      },
      {
        label: 'Playwright smoke: desktop and mobile routes',
        command: ['bunx', 'playwright', 'test', '-c', 'playwright.config.ts'],
      },
      {
        label: 'QA seed: restore demo data after browser smoke',
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
      'QA seed: reset before browser smoke',
      'Playwright smoke: desktop and mobile routes',
      'QA seed: restore demo data after browser smoke',
    ])
  })

  test('stops before browser smoke when initial seed fails', async () => {
    const calls: string[] = []

    await expect(
      runE2eSmoke(
        async (step: E2eSmokeStep) => {
          calls.push(step.label)
          return 1
        },
        quietLogger,
      ),
    ).rejects.toThrow('QA seed: reset before browser smoke failed with exit code 1')

    expect(calls).toEqual(['QA seed: reset before browser smoke'])
  })
})
