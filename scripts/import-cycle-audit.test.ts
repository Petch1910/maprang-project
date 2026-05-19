import { describe, expect, test } from 'bun:test'
import {
  buildImportGraphFromSources,
  collectImportCycleAuditResult,
  extractRelativeImports,
  findImportCycles,
  resolveRelativeImport,
  runImportCycleAudit,
} from './import-cycle-audit'

describe('import cycle audit', () => {
  test('extracts static, dynamic, side-effect, and re-export relative imports', () => {
    const imports = extractRelativeImports(
      'apps/example/src/a.ts',
      `
        import type { A } from './types'
        import './side-effect'
        import React from 'react'
        export { thing } from '../shared/thing'
        const page = () => import('./pages/Home')
      `,
    )

    expect(imports).toEqual(['./types', './side-effect', '../shared/thing', './pages/Home'])
  })

  test('resolves extensionless and index imports against known source files', () => {
    const knownFiles = new Set([
      'apps/example/src/a.ts',
      'apps/example/src/lib/b.ts',
      'apps/example/src/pages/Home/index.tsx',
    ])

    expect(resolveRelativeImport('apps/example/src/a.ts', './lib/b', knownFiles)).toBe('apps/example/src/lib/b.ts')
    expect(resolveRelativeImport('apps/example/src/a.ts', './pages/Home', knownFiles)).toBe('apps/example/src/pages/Home/index.tsx')
    expect(resolveRelativeImport('apps/example/src/a.ts', 'react', knownFiles)).toBeNull()
  })

  test('detects direct and indirect cycles', () => {
    const graph = buildImportGraphFromSources([
      { file: 'src/a.ts', content: "import { b } from './b'" },
      { file: 'src/b.ts', content: "import { c } from './c'" },
      { file: 'src/c.ts', content: "import { a } from './a'" },
      { file: 'src/d.ts', content: "import { a } from './a'" },
    ])

    expect(findImportCycles(graph)).toEqual([['src/a.ts', 'src/b.ts', 'src/c.ts', 'src/a.ts']])
  })

  test('runs the committed import cycle audit through an importable runner', async () => {
    const result = await collectImportCycleAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runImportCycleAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.ok).toBe(true)
    expect(result.fileCount).toBeGreaterThan(0)
    expect(result.cycles).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ok - import cycle audit passed')
    expect(errors).toEqual([])
  })
})
