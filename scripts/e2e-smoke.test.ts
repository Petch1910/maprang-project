import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  backendEnvPort,
  E2E_SMOKE_DB_PREFLIGHT_LABEL,
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

const defaultSteps = e2eSmokeSteps()
const [dbPreflightStep, qaSeedStep, playwrightStep, qaClearStep] = defaultSteps

function expectFormattedStepError(errors: unknown[], step: E2eSmokeStep, index = 0) {
  expect(errors[index]).toBeString()
  expect(String(errors[index])).toContain(step.label)
  expect(String(errors[index])).toContain('exit code 1')
}

describe('e2e smoke command plan', () => {
  test('locks Not Found fallback route coverage', () => {
    expect(e2eSpec).toContain('/__maprang-not-found-e2e')
    expect(e2eSpec).toContain('not-found-page')
  })

  test('locks immersive shell coverage for explore and chat routes', () => {
    expect(e2eSpec).toContain('expectImmersiveShell')
    expect(e2eSpec).toContain('app-mobile-nav')
    expect(e2eSpec).toContain('โหมดสว่างยังไม่รองรับ')
    expect(e2eSpec).toContain("target.path === '/' || target.path.startsWith('/chat')")
  })

  test('locks product-facing local runtime copy in admin health e2e coverage', () => {
    expect(e2eSpec).toContain('เซิร์ฟเวอร์ในเครื่องพร้อมเล่น')
    expect(e2eSpec).toContain('แชทในเครื่องพร้อมใช้งาน')
    expect(e2eSpec).toContain("not.toContainText('โหมด local QA พร้อมเล่น')")
    expect(e2eSpec).toContain("not.toContainText('แชท local สำหรับ QA')")
    expect(e2eSpec).toContain("not.toContainText('local/mock-roleplay')")
    expect(e2eSpec).not.toContain(")).toContainText('โหมด local QA พร้อมเล่น')")
    expect(e2eSpec).not.toContain(")).toContainText('แชท local สำหรับ QA')")
    expect(e2eSpec).not.toContain(")).toContainText('local/mock-roleplay')")
  })

  test('locks chat message action menu coverage', () => {
    expect(e2eSpec).toContain('message-actions-')
    expect(e2eSpec).toContain('message-action-menu-')
    expect(e2eSpec).toContain('message-copy-')
    expect(e2eSpec).toContain('message-report-')
    expect(e2eSpec).toContain('message-edit-disabled-')
    expect(e2eSpec).toContain('message-regenerate-disabled-')
    expect(e2eSpec).toContain('message-delete-disabled-')
  })

  test('locks AI Creator cancel action browser coverage', () => {
    expect(e2eSpec).toContain('ai-creator-library-detail-cancel-')
    expect(e2eSpec).toContain('toBeDisabled()')
    expect(e2eSpec).toContain('งานนี้จบแล้ว')
  })

  test('locks AI Creator video provider contract browser coverage', () => {
    expect(e2eSpec).toContain('ai-creator-video-contract-state')
    expect(e2eSpec).toContain("toContainText('ระบบยังไม่เปิดบริการสร้างวิดีโอจริง')")
  })

  test('defaults local browser smoke to an isolated backend port', () => {
    const backendEnv = 'DATABASE_URL=postgresql://example\nPORT="3001"\n'

    expect(backendEnvPort(backendEnv)).toBe('3001')
    expect(resolveE2eSmokeEnv({}, backendEnv)).toMatchObject({
      E2E_BASE_URL: 'http://127.0.0.1:5174',
      E2E_API_BASE_URL: 'http://127.0.0.1:3191',
      VITE_API_BASE_URL: 'http://127.0.0.1:3191',
    })
  })

  test('can opt into using the backend env port for focused local debugging', () => {
    const backendEnv = 'DATABASE_URL=postgresql://example\nPORT="3001"\n'

    expect(resolveE2eSmokeEnv({ E2E_RESPECT_BACKEND_ENV_PORT: '1' }, backendEnv)).toMatchObject({
      E2E_BASE_URL: 'http://127.0.0.1:5174',
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

  test('runs DB preflight, seed, Playwright, then QA cleanup in order', () => {
    expect(defaultSteps).toHaveLength(4)
    expect(defaultSteps.map(({ command }) => command.join(' '))).toEqual([
      'bun src/db.required-check.ts',
      'bun run qa:seed',
      'bunx playwright test -c playwright.config.ts',
      'bun run qa:clear',
    ])
    expect(dbPreflightStep).toMatchObject({
      label: E2E_SMOKE_DB_PREFLIGHT_LABEL,
      cwd: 'apps/backend',
    })
    expect(qaClearStep?.alwaysRun).toBe(true)
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
    expect(seen.map(({ label }) => label)).toEqual(defaultSteps.map(({ label }) => label))
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
        return step.command.includes('playwright') ? 1 : 0
      },
      quietLogger,
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual(defaultSteps.map(({ label }) => label))
  })

  test('formats Playwright failure output without logging raw Error objects', async () => {
    const errors: unknown[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => (step.command.includes('playwright') ? 1 : 0),
      { log: () => undefined, error: (error) => errors.push(error) },
    )

    expect(exitCode).toBe(1)
    expect(errors).toHaveLength(1)
    expectFormattedStepError(errors, playwrightStep)
  })

  test('stops before QA seed when database preflight fails', async () => {
    const calls: string[] = []
    const errors: unknown[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => {
        calls.push(step.label)
        return 1
      },
      { log: () => undefined, error: (error) => errors.push(error) },
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual([dbPreflightStep.label])
    expect(errors).toHaveLength(1)
    expectFormattedStepError(errors, dbPreflightStep)
  })

  test('cleans QA data before stopping when initial seed fails', async () => {
    const calls: string[] = []
    const errors: unknown[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => {
        calls.push(step.label)
        return step.command.includes('qa:seed') ? 1 : 0
      },
      { log: () => undefined, error: (error) => errors.push(error) },
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual([dbPreflightStep.label, qaSeedStep.label, qaClearStep.label])
    expect(errors).toHaveLength(1)
    expectFormattedStepError(errors, qaSeedStep)
  })

  test('reports cleanup failure after initial seed failure', async () => {
    const calls: string[] = []
    const errors: unknown[] = []

    const exitCode = await runE2eSmoke(
      async (step: E2eSmokeStep) => {
        calls.push(step.label)
        return step.command.includes('qa:seed') || step.command.includes('qa:clear') ? 1 : 0
      },
      { log: () => undefined, error: (error) => errors.push(error) },
    )

    expect(exitCode).toBe(1)
    expect(calls).toEqual([dbPreflightStep.label, qaSeedStep.label, qaClearStep.label])
    expect(errors).toHaveLength(2)
    expectFormattedStepError(errors, qaSeedStep)
    expectFormattedStepError(errors, qaClearStep, 1)
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
