import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

describe('predeploy check wiring', () => {
  test('keeps predeploy diagnostics Thai-first', async () => {
    const predeploy = await readRepoFile('scripts/predeploy-check.ts')

    expect(predeploy).toContain('ไฟล์ deploy ที่จำเป็นต้องมีครบ')
    expect(predeploy).toContain('หัวข้อ Markdown สำคัญต้องเป็น Thai-first')
    expect(predeploy).toContain('assertThaiFirstMarkdownHeadings')
    expect(predeploy).toContain('memory/decisions/0014-add-chat-provider-failure-classification.md')
    expect(predeploy).toContain('^#\\s+\\d{4}\\s+-\\s+')
    expect(predeploy).toContain('ยังไม่มีข้อความที่ต้องมี')
    expect(predeploy).toContain("result.ok ? 'ผ่าน' : 'ไม่ผ่าน'")
    expect(predeploy).not.toContain("result.ok ? 'ok' : 'fail'")
    expect(predeploy).not.toContain('is missing ${missing.join')
    expect(predeploy).not.toContain('contains stale text')
  })

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

    const qaRepo = packageJson.scripts?.['qa:repo'] ?? ''
    const qaLocal = packageJson.scripts?.['qa:local'] ?? ''
    const qaLocalCoverage = `${qaRepo} ${qaLocal}`

    expect(packageJson.scripts?.['predeploy:check:test']).toBe('bun test scripts/predeploy-check.test.ts')
    expect(qaLocal).toContain('bun run qa:repo')
    expect(qaLocal).toContain('bun run smoke:doctor')
    expect(qaLocal).toContain('bun run smoke:local')
    expect(qaLocal).toContain('bun run api:smoke')
    expect(qaLocalCoverage).toContain('bun run predeploy:check:test')
    expect(qaLocalCoverage).toContain('bun run deploy:doctor:self-test')
    expect(ciWorkflow.match(/name: ติดตั้ง dependencies ระดับ repo[\s\S]*?run: bun install --frozen-lockfile/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
    expect(ciWorkflow).toContain('รัน local smoke จาก seed')
    expect(ciWorkflow).not.toContain('Install root dependencies')
    expect(ciWorkflow).toContain('bun run predeploy:check:test')
    expect(ciWorkflow).toContain('bun run deploy:doctor:self-test')
    expect(productionSmoke).toContain('bun run predeploy:check:test')
    expect(productionSmoke).toContain('Backend URL ที่ต้องการทดสอบ')
    expect(productionSmoke).toContain('ตรวจ config ก่อนรัน smoke')
    expect(productionSmoke).toContain('รันทดสอบแชทจริงกับ AI คำสั่งนี้ใช้เครดิตผู้ให้บริการจริง')
    expect(productionSmoke).toContain('รันทดสอบสร้างรูปจริง คำสั่งนี้ใช้เครดิตสร้างรูปจริง')
    expect(productionSmoke).toContain('ยอดโทเคนขั้นต่ำของผู้ใช้ smoke ก่อนรันทดสอบแชทจริง')
    expect(productionSmoke).toContain('ตั้ง workflow input api_base_url หรือ repository secret SMOKE_API_BASE_URL ก่อนรัน smoke')
    expect(productionSmoke).not.toContain('Backend URL to test')
    expect(productionSmoke).not.toContain('รัน live AI chat smoke')
    expect(productionSmoke).not.toContain('รัน live image generation smoke')
    expect(productionSmoke).not.toContain('ยอดโทเคนขั้นต่ำของ smoke user ก่อนรัน live chat smoke')
    expect(productionSmoke).not.toContain('Validate smoke configuration')
    expect(productionSmoke).not.toContain('Minimum smoke-user token balance')
    expect(productionSmoke).not.toContain('Set workflow input api_base_url')
  })
})
