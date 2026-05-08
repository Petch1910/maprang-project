export const pinnedChatsStorageKey = 'maprang:pinned-chats:v1'

export function loadPinnedChatIds() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(pinnedChatsStorageKey) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function savePinnedChatIds(ids: string[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(pinnedChatsStorageKey, JSON.stringify(ids))
}

export function togglePinnedChatId(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((chatId) => chatId !== id) : [id, ...ids]
}
