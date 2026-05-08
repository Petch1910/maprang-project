async function runStep(label: string, command: string[]) {
  console.log(`\n${label}`)
  const proc = Bun.spawn(command, {
    env: process.env,
    stdio: ['inherit', 'inherit', 'inherit'],
  })
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`${label} failed with exit code ${exitCode}`)
  }
}

let exitCode = 0

await runStep('QA seed: reset before browser smoke', ['bun', 'run', 'qa:seed'])

try {
  await runStep('Playwright smoke: desktop and mobile routes', ['bunx', 'playwright', 'test', '-c', 'playwright.config.ts'])
} catch (error) {
  exitCode = 1
  console.error(error)
} finally {
  try {
    await runStep('QA seed: restore demo data after browser smoke', ['bun', 'run', 'qa:seed'])
  } catch (error) {
    exitCode = 1
    console.error(error)
  }
}

process.exit(exitCode)
