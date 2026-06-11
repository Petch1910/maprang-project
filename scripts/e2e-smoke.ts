import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { formatUnknownDiagnosticText, smokeTargetIsLocal } from './smoke-helpers'

export type E2eSmokeStep = {
  label: string
  command: string[]
  cwd?: string
  alwaysRun?: boolean
}

export type E2eSmokeLogger = Pick<typeof console, 'log' | 'error'>
export type E2eSmokeEnv = Record<string, string | undefined>
export type E2eSmokeRunner = (step: E2eSmokeStep, env: E2eSmokeEnv) => Promise<number>

const backendEnvPath = join(import.meta.dir, '..', 'apps/backend/.env')
export const E2E_SMOKE_DB_PREFLIGHT_LABEL = 'ตรวจฐานข้อมูลก่อน QA: PostgreSQL พร้อมก่อน seed'

function unquoteEnvValue(value: string) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function backendEnvPort(envText: string) {
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const match = line.match(/^PORT\s*=\s*(.+)$/)
    if (!match?.[1]) continue
    const port = unquoteEnvValue(match[1])
    if (/^\d+$/.test(port)) return port
  }
  return ''
}

export function resolveE2eSmokeEnv(env: E2eSmokeEnv = process.env, backendEnvText = ''): E2eSmokeEnv {
  const backendPort = env.E2E_API_BASE_URL ? '' : backendEnvPort(backendEnvText)
  const e2eApiBaseUrl = env.E2E_API_BASE_URL ?? (backendPort ? `http://127.0.0.1:${backendPort}` : 'http://127.0.0.1:3000')
  const e2eBaseUrl = env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'

  return {
    ...env,
    E2E_BASE_URL: e2eBaseUrl,
    E2E_API_BASE_URL: e2eApiBaseUrl,
    VITE_API_BASE_URL: env.VITE_API_BASE_URL ?? e2eApiBaseUrl,
  }
}

async function readBackendEnvText() {
  try {
    return await readFile(backendEnvPath, 'utf8')
  } catch {
    return ''
  }
}

function e2eUrlIssues(name: string, value: string) {
  const issues: string[] = []
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return [`${name} ต้องเป็น URL ที่ถูกต้อง`]
  }

  const localTarget = smokeTargetIsLocal(value)
  if (!localTarget && url.protocol !== 'https:') issues.push(`${name} ต้องใช้ https เมื่อไม่ใช่ local`)
  if (url.username || url.password) issues.push(`${name} ห้ามมี credential/userinfo`)
  if (url.pathname !== '/' || url.search || url.hash) issues.push(`${name} ต้องเป็น origin เท่านั้น ห้ามมี path/query/hash`)

  return issues
}

export function e2eSmokeTargetIssues(env: E2eSmokeEnv = process.env) {
  const resolvedEnv = resolveE2eSmokeEnv(env)
  const targets = [
    ['E2E_BASE_URL', resolvedEnv.E2E_BASE_URL ?? 'http://127.0.0.1:5173'],
    ['E2E_API_BASE_URL', resolvedEnv.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000'],
  ] as const

  return targets.flatMap(([name, value]) => e2eUrlIssues(name, value))
}

export function e2eSmokeSteps(): E2eSmokeStep[] {
  return [
    {
      label: E2E_SMOKE_DB_PREFLIGHT_LABEL,
      command: ['bun', 'src/db.required-check.ts'],
      cwd: 'apps/backend',
    },
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
  ]
}

async function spawnStep(step: E2eSmokeStep, env: E2eSmokeEnv = process.env) {
  const proc = Bun.spawn(step.command, {
    cwd: step.cwd,
    env: { ...process.env, ...env },
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  return proc.exited
}

async function runStep(step: E2eSmokeStep, runner: E2eSmokeRunner, logger: E2eSmokeLogger, env: E2eSmokeEnv) {
  logger.log(`\n${step.label}`)
  const exitCode = await runner(step, env)
  if (exitCode !== 0) {
    throw new Error(`${step.label} ไม่ผ่านด้วย exit code ${exitCode}`)
  }
}

export function formatE2eSmokeError(error: unknown) {
  const message = formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
  return `ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: ${message}`
}

export async function runE2eSmoke(
  runner: E2eSmokeRunner = spawnStep,
  logger: E2eSmokeLogger = console,
  steps: E2eSmokeStep[] = e2eSmokeSteps(),
  env: E2eSmokeEnv = process.env,
) {
  const [dbPreflight, reset, browserSmoke, restore] = steps
  if (!dbPreflight || !reset || !browserSmoke || !restore) {
    throw new Error('e2e smoke ต้องมีขั้น DB preflight, reset, ตรวจเบราว์เซอร์, และ restore')
  }
  const runtimeEnv = resolveE2eSmokeEnv(env, await readBackendEnvText())
  const targetIssues = e2eSmokeTargetIssues(runtimeEnv)
  if (targetIssues.length > 0) {
    logger.error(`ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: ${targetIssues.join('; ')}`)
    return 1
  }

  let exitCode = 0

  try {
    await runStep(dbPreflight, runner, logger, runtimeEnv)
  } catch (error) {
    logger.error(formatE2eSmokeError(error))
    return 1
  }

  try {
    await runStep(reset, runner, logger, runtimeEnv)
  } catch (error) {
    logger.error(formatE2eSmokeError(error))
    try {
      await runStep(restore, runner, logger, runtimeEnv)
    } catch (restoreError) {
      logger.error(formatE2eSmokeError(restoreError))
    }
    return 1
  }

  try {
    await runStep(browserSmoke, runner, logger, runtimeEnv)
  } catch (error) {
    exitCode = 1
    logger.error(formatE2eSmokeError(error))
  } finally {
    try {
      await runStep(restore, runner, logger, runtimeEnv)
    } catch (error) {
      exitCode = 1
      logger.error(formatE2eSmokeError(error))
    }
  }

  return exitCode
}

if (import.meta.main) {
  process.exit(await runE2eSmoke())
}
