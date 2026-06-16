import type { ChatSummary } from './api'

export type ChatListFilter = 'all' | 'pinned' | 'pending' | 'archived'

export function getPendingChatEventCount(chat: ChatSummary): number {
  return (chat.sceneState?.pendingEvents ?? []).filter((event) => event.status === 'pending').length
}

export function getChatSearchText(chat: ChatSummary): string {
  return [
    chat.title,
    chat.characterName,
    chat.preview,
    chat.relationshipState?.status,
    chat.relationshipState?.tier,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function filterAndSortChats({
  chats,
  filter,
  pinnedChatIds,
  search,
}: {
  chats: ChatSummary[]
  filter: ChatListFilter
  pinnedChatIds: string[]
  search: string
}): ChatSummary[] {
  const normalizedSearch = search.trim().toLowerCase()
  const pinOrder = new Map(pinnedChatIds.map((id, index) => [id, index]))
  const filtered = chats.filter((chat) => {
    const matchesFilter =
      filter === 'archived' ||
      filter === 'all' ||
      (filter === 'pending' ? getPendingChatEventCount(chat) > 0 : pinOrder.has(chat.id))
    if (!matchesFilter) return false
    if (!normalizedSearch) return true
    return getChatSearchText(chat).includes(normalizedSearch)
  })

  return [...filtered].sort((a, b) => {
    const aPinned = pinOrder.has(a.id)
    const bPinned = pinOrder.has(b.id)
    if (aPinned && bPinned) return (pinOrder.get(a.id) ?? 0) - (pinOrder.get(b.id) ?? 0)
    if (aPinned) return -1
    if (bPinned) return 1
    return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  })
}

export function toggleSelectedChatId(selectedIds: string[], chatId: string): string[] {
  return selectedIds.includes(chatId) ? selectedIds.filter((id) => id !== chatId) : [...selectedIds, chatId]
}
