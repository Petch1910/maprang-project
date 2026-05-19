export type BackendDbCheckStep = {
  command: string[]
  cwd?: string
  env?: Record<string, string | undefined>
}

export type BackendDbCommandRunner = (step: BackendDbCheckStep) => Promise<number>

export function backendDbCheckSteps(env: Record<string, string | undefined> = process.env): BackendDbCheckStep[] {
  return [
    {
      command: ['bun', 'src/db.required-check.ts'],
      cwd: 'apps/backend',
      env,
    },
    {
      command: ['bun', 'run', 'backend:check'],
      env: {
        ...env,
        REQUIRE_DB_TESTS: 'true',
      },
    },
  ]
}

export async function runBackendDbCheckStep(step: BackendDbCheckStep) {
  const child = Bun.spawn(step.command, {
    cwd: step.cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: step.env ?? process.env,
  })

  return child.exited
}

export async function runBackendDbCheck(
  env: Record<string, string | undefined> = process.env,
  runStep: BackendDbCommandRunner = runBackendDbCheckStep,
) {
  for (const step of backendDbCheckSteps(env)) {
    const exitCode = await runStep(step)
    if (exitCode !== 0) return exitCode
  }

  return 0
}

if (import.meta.main) process.exit(await runBackendDbCheck())
