import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem, type SafeStorageLike } from '../apps/frontend/src/lib/safeStorage'
import { loadPinnedChatIdsFromRaw, serializePinnedChatIds, togglePinnedChatId } from '../apps/frontend/src/lib/pinnedChats'

function mapStorage(): SafeStorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

const throwingStorage: SafeStorageLike = {
  getItem: () => {
    throw new Error('storage blocked')
  },
  setItem: () => {
    throw new Error('quota exceeded')
  },
  removeItem: () => {
    throw new Error('storage blocked')
  },
}

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

describe('frontend storage helpers', () => {
  test('wraps localStorage reads, writes, and removals without throwing', () => {
    const storage = mapStorage()

    expect(safeSetStorageItem(storage, 'maprang:test', 'value')).toBe(true)
    expect(safeGetStorageItem(storage, 'maprang:test')).toBe('value')
    expect(safeRemoveStorageItem(storage, 'maprang:test')).toBe(true)
    expect(safeGetStorageItem(storage, 'maprang:test')).toBeNull()

    expect(safeGetStorageItem(throwingStorage, 'maprang:test')).toBeNull()
    expect(safeSetStorageItem(throwingStorage, 'maprang:test', 'value')).toBe(false)
    expect(safeRemoveStorageItem(throwingStorage, 'maprang:test')).toBe(false)
    expect(safeSetStorageItem(null, 'maprang:test', 'value')).toBe(false)
  })

  test('parses pinned chat ids defensively', () => {
    expect(loadPinnedChatIdsFromRaw('["a","b",1,null,"a"]')).toEqual(['a', 'b', 'a'])
    expect(loadPinnedChatIdsFromRaw('not-json')).toEqual([])
    expect(loadPinnedChatIdsFromRaw('{"id":"a"}')).toEqual([])
    expect(serializePinnedChatIds(['b', 'a'])).toBe('["b","a"]')
    expect(togglePinnedChatId(['b'], 'a')).toEqual(['a', 'b'])
    expect(togglePinnedChatId(['a', 'b'], 'a')).toEqual(['b'])
  })

  test('keeps frontend source on safe storage wrappers', () => {
    const sourceRoot = join(process.cwd(), 'apps', 'frontend', 'src')
    const directStoragePattern = /\blocalStorage\.(?:getItem|setItem|removeItem)\s*\(/g
    const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      return [...content.matchAll(directStoragePattern)].map((match) => `${relative(process.cwd(), filePath)}:${match.index ?? 0}`)
    })

    expect(offenders).toEqual([])
  })
})
