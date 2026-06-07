import { describe, expect, test } from 'bun:test'
import {
  collectBunRunReferences,
  collectDefaultAuditedCommandFiles,
  collectDocsCommandAuditResult,
  runDocsCommandAudit,
} from './docs-command-audit'

describe('docs command audit', () => {
  test('tracks app context after cd inside markdown command blocks', () => {
    const references = collectBunRunReferences(
      'README.md',
      [
        '```bash',
        'cd apps/backend',
        'bun run env:check',
        'cd ../..',
        'bun run predeploy:check',
        '```',
      ].join('\n'),
    )

    expect(references.map(({ script, context }) => ({ script, context }))).toEqual([
      { script: 'env:check', context: 'apps/backend' },
      { script: 'predeploy:check', context: 'root' },
    ])
  })

  test('uses package README context before accepting command references', () => {
    const references = collectBunRunReferences(
      'apps/frontend/README.md',
      ['```bash', 'bun run build', '```'].join('\n'),
    )

    expect(references).toEqual([
      expect.objectContaining({ script: 'build', context: 'apps/frontend' }),
    ])
  })

  test('infers Render frontend build commands from root-directory guidance', () => {
    const references = collectBunRunReferences(
      'DEPLOY_RENDER.md',
      [
        '- Root directory: `apps/frontend`',
        '- Build command: `bun install --frozen-lockfile && bun run build`',
      ].join('\n'),
    )

    expect(references).toEqual([
      expect.objectContaining({ script: 'build', context: 'apps/frontend' }),
    ])
  })

  test('tracks GitHub workflow working-directory contexts and job boundaries', () => {
    const references = collectBunRunReferences(
      '.github/workflows/ci.yml',
      [
        'jobs:',
        '  backend:',
        '    defaults:',
        '      run:',
        '        working-directory: apps/backend',
        '    steps:',
        '      - run: bun run deploy:check',
        '  predeploy:',
        '    steps:',
        '      - run: bun run predeploy:check',
      ].join('\n'),
    )

    expect(references.map(({ script, context }) => ({ script, context }))).toEqual([
      { script: 'deploy:check', context: 'apps/backend' },
      { script: 'predeploy:check', context: 'root' },
    ])
  })

  test('tracks GitHub workflow cd changes inside run blocks', () => {
    const references = collectBunRunReferences(
      '.github/workflows/ci.yml',
      [
        'jobs:',
        '  smoke-local:',
        '    steps:',
        '      - run: |',
        '          cd apps/backend',
        '          bun run start &',
        '          cd ../..',
        '          bun run smoke:doctor',
      ].join('\n'),
    )

    expect(references.map(({ script, context }) => ({ script, context }))).toEqual([
      { script: 'start', context: 'apps/backend' },
      { script: 'smoke:doctor', context: 'root' },
    ])
  })

  test('runs the committed documentation command audit through an importable runner', async () => {
    const result = await collectDocsCommandAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runDocsCommandAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.checkedReferences).toBeGreaterThan(0)
    expect(result.findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - ตรวจคำสั่งในเอกสารแล้ว')
    expect(lines[0]).toContain('จุดอ้างอิง')
    expect(lines[0]).not.toContain('references')
    expect(errors).toEqual([])
  })

  test('includes decision files in the default command audit set', async () => {
    const files = await collectDefaultAuditedCommandFiles()
    const decisionFiles = files.filter((file) => file.startsWith('memory/decisions/'))

    expect(files).toContain('memory/decisions/index.md')
    expect(decisionFiles.length).toBeGreaterThan(1)
    expect(decisionFiles).toContain('memory/decisions/0019-audit-decision-command-references.md')
  })
})
