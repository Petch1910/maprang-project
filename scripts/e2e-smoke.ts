export type E2eSmokeStep = {
  label: string
  command: string[]
  alwaysRun?: boolean
}

export type E2eSmokeRunner = (step: E2eSmokeStep) => Promise<number>
export type E2eSmokeLogger = Pick<typeof console, 'log' | 'error'>

export function e2eSmokeSteps(): E2eSmokeStep[] {
  return [
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
  ]
}

async function spawnStep(step: E2eSmokeStep) {
  const proc = Bun.spawn(step.command, {
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  return proc.exited
}

async function runStep(step: E2eSmokeStep, runner: E2eSmokeRunner, logger: E2eSmokeLogger) {
  logger.log(`\n${step.label}`)
  const exitCode = await runner(step)
  if (exitCode !== 0) {
    throw new Error(`${step.label} ไม่ผ่านด้วย exit code ${exitCode}`)
  }
}

export async function runE2eSmoke(
  runner: E2eSmokeRunner = spawnStep,
  logger: E2eSmokeLogger = console,
  steps: E2eSmokeStep[] = e2eSmokeSteps(),
) {
  const [reset, browserSmoke, restore] = steps
  if (!reset || !browserSmoke || !restore) throw new Error('e2e smoke ต้องมีขั้น reset, ตรวจเบราว์เซอร์, และ restore')

  let exitCode = 0

  await runStep(reset, runner, logger)

  try {
    await runStep(browserSmoke, runner, logger)
  } catch (error) {
    exitCode = 1
    logger.error(error)
  } finally {
    try {
      await runStep(restore, runner, logger)
    } catch (error) {
      exitCode = 1
      logger.error(error)
    }
  }

  return exitCode
}

if (import.meta.main) {
  process.exit(await runE2eSmoke())
}
