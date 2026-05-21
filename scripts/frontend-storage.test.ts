import { describe, expect, test } from 'bun:test'
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
})
