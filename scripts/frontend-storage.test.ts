import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem, type SafeStorageLike } from '../apps/frontend/src/lib/safeStorage'
import { loadPinnedChatIdsFromRaw, serializePinnedChatIds, togglePinnedChatId } from '../apps/frontend/src/lib/pinnedChats'
import contentReducer, { hydrateContent } from '../apps/frontend/src/store/slices/contentSlice'
import draftsReducer, { hydrateDrafts } from '../apps/frontend/src/store/slices/draftsSlice'

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

function directStorageAccessPattern() {
  return /\b(?:(?:window|globalThis)\s*\.\s*)?(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(/g
}

function collectDirectStorageAccess(content: string) {
  return [...content.matchAll(directStorageAccessPattern())].map((match) => match[0])
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

  test('drops stale redux fields from persisted local state', () => {
    const legacyContent = {
      isAdult: true,
      ageGateAnswered: true,
      maxRating: 'restricted_18' as const,
      showMature: true,
    }
    const legacyDrafts = {
      composerByKey: { 'chat:1': 'ยังพิมพ์ค้างไว้' },
      personaDraft: 'ผู้เล่นชอบเล่าเรื่องช้า ๆ',
      personaUpdatedAt: '2026-05-25T00:00:00.000Z',
      creatorDraftUpdatedAt: '2026-05-25T00:00:00.000Z',
    }
    const content = contentReducer(undefined, hydrateContent(legacyContent))
    const drafts = draftsReducer(undefined, hydrateDrafts(legacyDrafts))

    expect(content).toEqual({
      isAdult: true,
      ageGateAnswered: true,
      maxRating: 'restricted_18',
    })
    expect('showMature' in content).toBe(false)
    expect(drafts).toEqual({
      composerByKey: { 'chat:1': 'ยังพิมพ์ค้างไว้' },
      personaDraft: 'ผู้เล่นชอบเล่าเรื่องช้า ๆ',
      personaUpdatedAt: '2026-05-25T00:00:00.000Z',
    })
    expect('creatorDraftUpdatedAt' in drafts).toBe(false)
  })

  test('detects direct browser storage access variants', () => {
    expect(
      collectDirectStorageAccess(`
        localStorage.getItem('a')
        localStorage . setItem('a', 'b')
        window.localStorage.removeItem('a')
        window . sessionStorage . getItem('a')
        globalThis . localStorage . setItem('a', 'b')
      `),
    ).toEqual([
      'localStorage.getItem(',
      'localStorage . setItem(',
      'window.localStorage.removeItem(',
      'window . sessionStorage . getItem(',
      'globalThis . localStorage . setItem(',
    ])
  })

  test('keeps frontend source on safe storage wrappers', () => {
    const sourceRoot = join(process.cwd(), 'apps', 'frontend', 'src')
    const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      return [...content.matchAll(directStorageAccessPattern())].map((match) => `${relative(process.cwd(), filePath)}:${match.index ?? 0}`)
    })

    expect(offenders).toEqual([])
  })
})
