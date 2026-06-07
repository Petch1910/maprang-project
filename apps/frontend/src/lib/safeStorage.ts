export type SafeStorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export function safeGetStorageItem(storage: SafeStorageLike | null | undefined, key: string) {
  try {
    return storage?.getItem(key) ?? null
  } catch {
    return null
  }
}

export function safeSetStorageItem(storage: SafeStorageLike | null | undefined, key: string, value: string) {
  try {
    storage?.setItem(key, value)
    return Boolean(storage)
  } catch {
    return false
  }
}

export function safeRemoveStorageItem(storage: SafeStorageLike | null | undefined, key: string) {
  try {
    storage?.removeItem(key)
    return Boolean(storage)
  } catch {
    return false
  }
}
