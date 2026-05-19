type BackendDbCheckStep = {
  command: string[]
  cwd?: string
  env?: Record<string, string | undefined>
}

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

async function run(command: string[], options: { cwd?: string; env?: Record<string, string | undefined> } = {}) {
  const child = Bun.spawn(command, {
    cwd: options.cwd,
    stdout: 'inherit',
    stderr: 'inherit',
    env: options.env ?? process.env,
  })

  const exitCode = await child.exited
  if (exitCode !== 0) process.exit(exitCode)
}

export async function runBackendDbCheck() {
  for (const step of backendDbCheckSteps()) {
    await run(step.command, { cwd: step.cwd, env: step.env })
  }
}

if (import.meta.main) await runBackendDbCheck()
