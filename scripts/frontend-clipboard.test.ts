import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeWriteClipboardText, type SafeClipboardLike } from '../apps/frontend/src/lib/safeClipboard'

function collectSourceFiles(root: string) {
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const filePath = join(root, entry)
    const stats = statSync(filePath)
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(filePath))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry)) files.push(filePath)
  }
  return files
}

describe('frontend clipboard helpers', () => {
  test('wraps clipboard writes without throwing', async () => {
    const writes: string[] = []
    const clipboard: SafeClipboardLike = {
      writeText: (text) => {
        writes.push(text)
      },
    }
    const throwingClipboard: SafeClipboardLike = {
      writeText: () => {
        throw new Error('clipboard blocked')
      },
    }

    await expect(safeWriteClipboardText(clipboard, 'hello')).resolves.toBe(true)
    expect(writes).toEqual(['hello'])
    await expect(safeWriteClipboardText(throwingClipboard, 'hello')).resolves.toBe(false)
    await expect(safeWriteClipboardText(null, 'hello')).resolves.toBe(false)
    await expect(safeWriteClipboardText({}, 'hello')).resolves.toBe(false)
  })

  test('keeps frontend source on safe clipboard wrappers', () => {
    const sourceRoot = join(process.cwd(), 'apps', 'frontend', 'src')
    const directClipboardPattern = /\bnavigator\.clipboard\b|\bclipboard\.writeText\s*\(/g
    const allowedFiles = new Set(['apps/frontend/src/lib/safeClipboard.ts'])
    const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const relativePath = relative(process.cwd(), filePath).replace(/\\/g, '/')
      if (allowedFiles.has(relativePath)) return []
      const content = readFileSync(filePath, 'utf8')
      return [...content.matchAll(directClipboardPattern)].map((match) => `${relativePath}:${match.index ?? 0}`)
    })

    expect(offenders).toEqual([])
  })
})
