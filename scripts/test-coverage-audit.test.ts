import { describe, expect, test } from 'bun:test'
import { auditTestCoverage, collectTestCoverageAuditResult, runTestCoverageAudit } from './test-coverage-audit'

function baseInput(overrides: Partial<Parameters<typeof auditTestCoverage>[0]> = {}) {
  return {
    testFiles: [
      'scripts/example.test.ts',
      'apps/backend/src/example.service.test.ts',
      'tests/e2e/example.spec.ts',
    ],
    rootScripts: {
      'backend:check': 'cd apps/backend && bun run deploy:check',
      'example:test': 'bun test scripts/example.test.ts',
      'e2e:smoke': 'bun scripts/e2e-smoke.ts',
      'qa:repo': 'bun run example:test && bun run backend:check',
      'qa:full': 'bun run qa:local && bun run e2e:smoke',
    },
    backendScripts: {
      'deploy:check': 'bunx prisma validate && bunx tsc --noEmit && bun test',
    },
    e2eSmokeContent: "command: ['bunx', 'playwright', 'test', '-c', 'playwright.config.ts']",
    playwrightConfigContent: "testDir: './tests/e2e'",
    ...overrides,
  }
}

describe('test coverage audit', () => {
  test('passes the committed repo test wiring', async () => {
    const result = await collectTestCoverageAuditResult()

    expect(result.findings).toEqual([])
    expect(result.checkedTestFiles).toBeGreaterThan(30)
    expect(result.checkedRootTestScripts).toBeGreaterThan(20)
  })

  test('flags script tests without direct root package scripts', () => {
    const result = auditTestCoverage(
      baseInput({
        rootScripts: {
          ...baseInput().rootScripts,
          'example:test': 'bun test scripts/other.test.ts',
          'qa:repo': 'bun run backend:check',
        },
      }),
    )

    expect(result.findings).toContain(
      'scripts/example.test.ts เป็น test ใน scripts/ แต่ยังไม่มี root package script ที่รันไฟล์นี้ตรง ๆ',
    )
  })

  test('flags root test scripts missing from qa:repo', () => {
    const result = auditTestCoverage(
      baseInput({
        rootScripts: {
          ...baseInput().rootScripts,
          'qa:repo': 'bun run backend:check',
        },
      }),
    )

    expect(result.findings).toContain('package.json qa:repo ยังไม่ได้รัน bun run example:test')
  })

  test('flags stale bun test file references', () => {
    const result = auditTestCoverage(
      baseInput({
        rootScripts: {
          ...baseInput().rootScripts,
          'missing:test': 'bun test scripts/missing.test.ts',
          'qa:repo': 'bun run example:test && bun run missing:test && bun run backend:check',
        },
      }),
    )

    expect(result.findings).toContain('package.json อ้าง bun test scripts/missing.test.ts แต่ไม่พบไฟล์ test นี้ใน repo')
  })

  test('requires backend and e2e suite gates', () => {
    const result = auditTestCoverage(
      baseInput({
        rootScripts: {
          ...baseInput().rootScripts,
          'backend:check': 'bun run deploy:check',
          'qa:full': 'bun run qa:local',
        },
        backendScripts: { 'deploy:check': 'bunx prisma validate && bunx tsc --noEmit' },
        e2eSmokeContent: "command: ['bunx', 'playwright', 'test']",
        playwrightConfigContent: "testDir: './tests/browser'",
      }),
    )

    expect(result.findings).toEqual(
      expect.arrayContaining([
        'backend test suite มีไฟล์ test แต่ root backend:check ยังไม่ได้ชี้ไป apps/backend deploy:check',
        'backend deploy:check ต้องรัน bun test เพื่อครอบ apps/backend/src/*.test.ts',
        'playwright.config.ts ต้องชี้ testDir ไปที่ ./tests/e2e เพื่อครอบ e2e specs',
        'scripts/e2e-smoke.ts ต้องรัน Playwright ด้วย playwright.config.ts',
        'package.json qa:full ต้องรัน bun run e2e:smoke เพื่อครอบ browser e2e specs',
      ]),
    )
  })

  test('runs through an importable runner with Thai-first diagnostics', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runTestCoverageAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - ตรวจ test coverage แล้ว')
    expect(errors).toEqual([])
  })
})
