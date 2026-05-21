import { safeGetStorageItem, safeSetStorageItem } from './safeStorage'

export const pinnedChatsStorageKey = 'maprang:pinned-chats:v1'

export function loadPinnedChatIdsFromRaw(raw: string | null) {
  try {
    const parsed = JSON.parse(raw ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function serializePinnedChatIds(ids: string[]) {
  return JSON.stringify(ids)
}

export function loadPinnedChatIds() {
  if (typeof window === 'undefined') return []
  return loadPinnedChatIdsFromRaw(safeGetStorageItem(window.localStorage, pinnedChatsStorageKey))
}

export function savePinnedChatIds(ids: string[]) {
  if (typeof window === 'undefined') return
  safeSetStorageItem(window.localStorage, pinnedChatsStorageKey, serializePinnedChatIds(ids))
}

export function togglePinnedChatId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((chatId) => chatId !== id) : [id, ...ids]
}
