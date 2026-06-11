import { Search, Plus, MessageCircle, Clock } from 'lucide-react'
import { useState } from 'react'
import type { ChatSummary } from '../../lib/api'

interface ChatHistoryListProps {
  chats: ChatSummary[]
  activeChat?: string
  onSelectChat?: (chatId: string) => void
  onNewChat?: () => void
}

function timeAgo(date: Date | string): string {
  const now = new Date()
  const then = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'เมื่อสักครู่'
  if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
  if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
  if (diffDays < 7) return `${diffDays} วันที่แล้ว`
  return then.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

export function ChatHistoryList({ chats, activeChat, onSelectChat, onNewChat }: ChatHistoryListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredChats = chats.filter((chat) => {
    const characterName = chat.character?.name ?? chat.characterName ?? chat.title
    return characterName.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-700/50 p-4">
        <h2 className="text-lg font-semibold text-slate-100">ประวัติการสนทนา</h2>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาการสนทนา..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-slate-700/50 py-2 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* New Chat Button */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-medium text-white transition-all hover:bg-purple-500 hover:shadow-lg hover:shadow-purple-500/30"
        >
          <Plus className="h-4 w-4" />
          สร้างการสนทนาใหม่
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto px-2">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageCircle className="h-12 w-12 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">
              {searchQuery ? 'ไม่พบการสนทนา' : 'ยังไม่มีประวัติการสนทนา'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredChats.map((chat) => (
              (() => {
                const characterName = chat.character?.name ?? chat.characterName ?? 'ตัวละคร'
                const avatarUrl = chat.character?.avatarUrl || '/placeholder-avatar.png'
                const lastActiveAt = chat.lastMessageAt ?? chat.updatedAt ?? chat.createdAt ?? new Date().toISOString()
                return (
              <button
                type="button"
                key={chat.id}
                onClick={() => onSelectChat?.(chat.id)}
                className={`
                  group relative w-full rounded-lg p-3 text-left transition-all
                  ${
                    activeChat === chat.id
                      ? 'bg-purple-600/20 ring-1 ring-purple-500/50'
                      : 'hover:bg-slate-700/50'
                  }
                `}
              >
                {/* Active Indicator */}
                {activeChat === chat.id && (
                  <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-purple-500" />
                )}

                {/* Chat Info */}
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-slate-700">
                    <img
                      src={avatarUrl}
                      alt={characterName}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-medium text-slate-100">
                        {characterName}
                      </h3>
                      <span className="flex-shrink-0 text-xs text-slate-400">
                        {timeAgo(lastActiveAt)}
                      </span>
                    </div>

                    {/* Last Message Preview */}
                    {chat.lastMessage && (
                      <p className="mt-0.5 truncate text-sm text-slate-400">
                        {chat.lastMessage.role === 'user' ? 'คุณ: ' : ''}
                        {chat.lastMessage.content}
                      </p>
                    )}

                    {/* Relationship */}
                    {chat.relationship && (
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-purple-400">
                          {chat.relationship.current}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Unread indicator (if needed) */}
                {chat.unreadCount && chat.unreadCount > 0 && (
                  <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-xs font-semibold text-white">
                    {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                  </div>
                )}
              </button>
                )
              })()
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-700/50 p-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <MessageCircle className="h-3 w-3" />
            {chats.length} การสนทนา
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            อัพเดทเมื่อสักครู่
          </span>
        </div>
      </div>
    </div>
  )
}
