import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Clock, User, Search, Filter, MoreVertical, Trash2, Archive } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatSummaries } from '../store/slices/chatsSlice'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

export function MyChatsPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const chatSummaries = useAppSelector(selectChatSummaries)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'active' | 'archived'>('all')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await dispatch(loadChatSummaries())
      setIsLoading(false)
    }
    load()
  }, [dispatch])

  const filteredChats = chatSummaries.filter((chat) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = chat.character?.name?.toLowerCase().includes(query)
      const matchesTitle = chat.title?.toLowerCase().includes(query)
      if (!matchesName && !matchesTitle) return false
    }

    // Type filter
    if (filterType === 'archived') {
      return chat.archivedAt !== null
    } else if (filterType === 'active') {
      return chat.archivedAt === null
    }

    return true
  })

  const formatLastActive = (date: string | Date) => {
    const now = new Date()
    const then = new Date(date)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    if (diffDays < 7) return `${diffDays} วันที่แล้ว`
    return then.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6">
            <div className="h-10 w-48 animate-pulse rounded-lg bg-slate-800" />
            <div className="mt-2 h-6 w-64 animate-pulse rounded bg-slate-800" />
          </div>
          <LoadingSkeleton variant="list" count={8} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      <div className="mx-auto max-w-6xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">การสนทนาของคุณ</h1>
          <p className="mt-2 text-slate-400">จัดการและดูประวัติการสนทนาทั้งหมด</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาการสนทนา..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filterType === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              ทั้งหมด ({chatSummaries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('active')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filterType === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              ใช้งาน ({chatSummaries.filter((c) => !c.archivedAt).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('archived')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filterType === 'archived'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
              }`}
            >
              เก็บถาวร ({chatSummaries.filter((c) => c.archivedAt).length})
            </button>
          </div>
        </div>

        {/* Chat List */}
        {filteredChats.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-12 text-center">
            <MessageCircle className="mx-auto h-16 w-16 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">
              {searchQuery ? 'ไม่พบการสนทนา' : 'ยังไม่มีการสนทนา'}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {searchQuery
                ? 'ลองค้นหาด้วยคำอื่น'
                : 'เริ่มต้นการสนทนาใหม่กับตัวละครที่คุณชื่นชอบ'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-purple-500"
              >
                สำรวจตัวละคร
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => navigate(`/chat/${chat.id}`)}
                className="group cursor-pointer rounded-xl border border-slate-800 bg-slate-800/30 p-4 transition hover:border-purple-500/50 hover:bg-slate-800/50"
              >
                <div className="flex items-start gap-4">
                  {/* Character Avatar */}
                  <div className="flex-shrink-0">
                    {chat.character?.avatarUrl ? (
                      <img
                        src={chat.character.avatarUrl}
                        alt={chat.character.name || 'Character'}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-700 group-hover:ring-purple-500"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-600 to-pink-600 ring-2 ring-slate-700 group-hover:ring-purple-500">
                        <User className="h-7 w-7 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-lg font-semibold text-white group-hover:text-purple-400">
                          {chat.character?.name || 'Unknown Character'}
                        </h3>
                        <p className="mt-1 truncate text-sm text-slate-400">
                          {chat.title || 'ไม่มีหัวข้อ'}
                        </p>
                      </div>

                      {/* Actions */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          // TODO: Show action menu
                        }}
                        className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-white group-hover:opacity-100"
                        aria-label="ตัวเลือกเพิ่มเติม"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Meta Info */}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatLastActive(chat.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3.5 w-3.5" />
                        {chat.messageCount || 0} ข้อความ
                      </span>
                      {chat.archivedAt && (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <Archive className="h-3.5 w-3.5" />
                          เก็บถาวร
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
