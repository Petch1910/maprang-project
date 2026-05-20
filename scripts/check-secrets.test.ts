import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { collectSecretFindings, isUnsafeTrackedEnvPath, runSecretsCheck, shouldCheckSecretPath } from './check-secrets'

const root = join(process.cwd(), '.secret-scan-test-root')

describe('committed secret scan path rules', () => {
  test('rejects tracked real env files but allows env templates to be scanned', () => {
    expect(isUnsafeTrackedEnvPath('.env')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/backend/.env.production')).toBe(true)
    expect(isUnsafeTrackedEnvPath('apps/backend/.env.production.example')).toBe(false)

    expect(
      shouldCheckSecretPath(join(root, 'apps/backend/.env.production'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(false)
    expect(
      shouldCheckSecretPath(join(root, 'apps/backend/.env.production.example'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(true)
  })

  test('scans source/docs/config files and skips binary-like extensions', () => {
    expect(
      shouldCheckSecretPath(join(root, 'apps/backend/src/index.ts'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(true)
    expect(
      shouldCheckSecretPath(join(root, 'README.md'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(true)
    expect(
      shouldCheckSecretPath(join(root, 'apps/backend/Dockerfile'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(true)
    expect(
      shouldCheckSecretPath(join(root, 'public/avatar.png'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(false)
  })

  test('does not scan the secret checker source itself', () => {
    expect(
      shouldCheckSecretPath(join(root, 'scripts/check-secrets.ts'), {
        rootDir: root,
        selfRelativePath: 'scripts/check-secrets.ts',
      }),
    ).toBe(false)
  })

  test('runs the committed secret scan through an importable runner', async () => {
    const findings = await collectSecretFindings()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runSecretsCheck((line) => lines.push(line), (line) => errors.push(line))

    expect(findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('ไม่พบ secret ที่ชัดเจนในไฟล์ที่ commit')
    expect(errors).toEqual([])
  })
})
