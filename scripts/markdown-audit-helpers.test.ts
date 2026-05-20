import { describe, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'
import { collectKnowledgeAuditResult, runKnowledgeAudit } from './knowledge-audit'
import { collectLocalMarkdownLinks, missingIncludes, pathIsInside } from './markdown-audit-helpers'
import { collectMemoryAuditResult, runMemoryAudit } from './memory-audit'

describe('markdown audit helpers', () => {
  test('reports missing required snippets without throwing', () => {
    expect(missingIncludes('alpha beta', ['alpha', 'gamma'])).toEqual(['gamma'])
  })

  test('collects only local markdown links and strips anchors', () => {
    const content = [
      '[local](./guide.md#section)',
      '[root](../README.md)',
      '[hash](#top)',
      '[web](https://example.com)',
      '[mail](mailto:test@example.com)',
      '[custom](app://connector)',
    ].join('\n')

    expect(collectLocalMarkdownLinks(content)).toEqual(['./guide.md', '../README.md'])
  })

  test('checks whether a resolved path stays inside a vault', () => {
    const parent = resolve('memory')

    expect(pathIsInside(parent, parent)).toBe(true)
    expect(pathIsInside(parent, join(parent, 'working-context.md'))).toBe(true)
    expect(pathIsInside(parent, resolve('README.md'))).toBe(false)
  })

  test('runs the memory audit through an importable runner', async () => {
    const result = await collectMemoryAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runMemoryAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.ok).toBe(true)
    expect(result.files).toBeGreaterThan(0)
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - memory audit ผ่านแล้ว')
    expect(lines[0]).toContain('ไฟล์ Markdown')
    expect(lines[0]).not.toContain('markdown files')
    expect(errors).toEqual([])
  })

  test('runs the knowledge audit through an importable runner', async () => {
    const result = await collectKnowledgeAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runKnowledgeAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.ok).toBe(true)
    expect(result.files).toBeGreaterThan(0)
    expect(result.structuredPacks).toBeGreaterThan(0)
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - knowledge audit ผ่านแล้ว')
    expect(lines[0]).toContain('ไฟล์ความรู้')
    expect(lines[0]).toContain('ชุด structured')
    expect(lines[0]).not.toContain('knowledge files')
    expect(lines[0]).not.toContain('structured packs')
    expect(errors).toEqual([])
  })
})
