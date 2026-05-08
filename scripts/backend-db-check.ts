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

await run(['bun', 'src/db.required-check.ts'], {
  cwd: 'apps/backend',
  env: process.env,
})

await run(['bun', 'run', 'backend:check'], {
  env: {
    ...process.env,
    REQUIRE_DB_TESTS: 'true',
  },
})
