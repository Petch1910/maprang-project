import { formatUnknownDiagnosticText, smokeTargetIsLocal } from './smoke-helpers'

export type E2eSmokeStep = {
  label: string
  command: string[]
  alwaysRun?: boolean
}

export type E2eSmokeLogger = Pick<typeof console, 'log' | 'error'>
export type E2eSmokeEnv = Record<string, string | undefined>
export type E2eSmokeRunner = (step: E2eSmokeStep, env: E2eSmokeEnv) => Promise<number>

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
  const targets = [
    ['E2E_BASE_URL', env.E2E_BASE_URL ?? 'http://127.0.0.1:5173'],
    ['E2E_API_BASE_URL', env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3000'],
  ] as const

  return targets.flatMap(([name, value]) => e2eUrlIssues(name, value))
}

export function e2eSmokeSteps(): E2eSmokeStep[] {
  return [
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
  const [reset, browserSmoke, restore] = steps
  if (!reset || !browserSmoke || !restore) throw new Error('e2e smoke ต้องมีขั้น reset, ตรวจเบราว์เซอร์, และ restore')
  const targetIssues = e2eSmokeTargetIssues(env)
  if (targetIssues.length > 0) {
    logger.error(`ตรวจเบราว์เซอร์ e2e ไม่ผ่าน: ${targetIssues.join('; ')}`)
    return 1
  }

  let exitCode = 0

  await runStep(reset, runner, logger, env)

  try {
    await runStep(browserSmoke, runner, logger, env)
  } catch (error) {
    exitCode = 1
    logger.error(formatE2eSmokeError(error))
  } finally {
    try {
      await runStep(restore, runner, logger, env)
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
