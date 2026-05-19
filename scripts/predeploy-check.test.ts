import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

describe('predeploy check wiring', () => {
  test('locks Thai-first e2e labels for admin eval smoke', async () => {
    const predeploy = await readRepoFile('scripts/predeploy-check.ts')
    const e2eSmoke = await readRepoFile('tests/e2e/maprang-smoke.spec.ts')

    expect(e2eSmoke).toContain('ทดสอบคุณภาพพรอมป์และบริบท')
    expect(e2eSmoke).not.toContain('ทดสอบคุณภาพ prompt/context')
    expect(predeploy).toContain('ทดสอบคุณภาพพรอมป์และบริบท')
    expect(predeploy).toContain('prompt/context')
  })

  test('keeps the predeploy regression test in local and deployed QA gates', async () => {
    const packageJson = JSON.parse(await readRepoFile('package.json')) as { scripts?: Record<string, string> }
    const ciWorkflow = await readRepoFile('.github/workflows/ci.yml')
    const productionSmoke = await readRepoFile('.github/workflows/production-smoke.yml')

    expect(packageJson.scripts?.['predeploy:check:test']).toBe('bun test scripts/predeploy-check.test.ts')
    expect(packageJson.scripts?.['qa:local']).toContain('bun run predeploy:check:test')
    expect(packageJson.scripts?.['qa:local']).toContain('bun run deploy:doctor:self-test')
    expect(ciWorkflow).toContain('bun run predeploy:check:test')
    expect(ciWorkflow).toContain('bun run deploy:doctor:self-test')
    expect(productionSmoke).toContain('bun run predeploy:check:test')
  })
})
