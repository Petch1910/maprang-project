import { describe, expect, test } from 'bun:test'
import { join, resolve } from 'node:path'
import { collectLocalMarkdownLinks, missingIncludes, pathIsInside } from './markdown-audit-helpers'

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
})
