import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Heart, MessageCircle, User, Clock, CheckCircle, X } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { loadChatSummaries, selectPendingSceneCount } from '../store/slices/chatsSlice'
import { LoadingSkeleton } from '../components/LoadingSkeleton'

interface Event {
  id: string
  type: 'scene' | 'message' | 'system'
  title: string
  message: string
  characterName?: string
  characterAvatar?: string
  timestamp: string
  isRead: boolean
  chatId?: string
}

export function EventsInboxPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const pendingCount = useAppSelector(selectPendingSceneCount)
  const [isLoading, setIsLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await dispatch(loadChatSummaries())

      // Mock events for now
      setEvents([
        {
          id: '1',
          type: 'scene',
          title: 'ฉากใหม่รอตอบกลับ',
          message: 'คุณมีฉากที่ยังไม่ได้ตอบกลับ',
          characterName: 'ตัวละคร A',
          timestamp: new Date().toISOString(),
          isRead: false,
          chatId: 'chat-1',
        },
      ])

      setIsLoading(false)
    }
    load()
  }, [dispatch])

  const filteredEvents = filter === 'unread' ? events.filter(e => !e.isRead) : events

  const formatTime = (timestamp: string) => {
    const now = new Date()
    const then = new Date(timestamp)
    const diffMs = now.getTime() - then.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)

    if (diffMins < 1) return 'เมื่อสักครู่'
    if (diffMins < 60) return `${diffMins} นาทีที่แล้ว`
    if (diffHours < 24) return `${diffHours} ชั่วโมงที่แล้ว`
    return then.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }

  const handleMarkAsRead = (eventId: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, isRead: true } : e))
  }

  const handleEventClick = (event: Event) => {
    if (event.chatId) {
      navigate(`/chat/${event.chatId}`)
    }
    handleMarkAsRead(event.id)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="mx-auto max-w-4xl">
          <LoadingSkeleton variant="list" count={5} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 pb-24 md:pb-6">
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">การแจ้งเตือน</h1>
              <p className="mt-2 text-slate-400">
                {pendingCount > 0 ? `คุณมี ${pendingCount} การแจ้งเตือนใหม่` : 'ไม่มีการแจ้งเตือนใหม่'}
              </p>
            </div>
            {events.some(e => !e.isRead) && (
              <button
                type="button"
                onClick={() => setEvents(prev => prev.map(e => ({ ...e, isRead: true })))}
                className="flex items-center gap-2 rounded-lg bg-slate-800/50 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-slate-700/50"
              >
                <CheckCircle className="h-4 w-4" />
                อ่านทั้งหมด
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            ทั้งหมด ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              filter === 'unread'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-white'
            }`}
          >
            ยังไม่ได้อ่าน ({events.filter(e => !e.isRead).length})
          </button>
        </div>

        {/* Events List */}
        {filteredEvents.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-800/30 p-12 text-center">
            <Bell className="mx-auto h-16 w-16 text-slate-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-300">ไม่มีการแจ้งเตือน</h3>
            <p className="mt-2 text-sm text-slate-500">
              {filter === 'unread' ? 'คุณอ่านการแจ้งเตือนทั้งหมดแล้ว' : 'ยังไม่มีการแจ้งเตือนในขณะนี้'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventClick(event)}
                className={`group cursor-pointer rounded-xl border p-4 transition ${
                  event.isRead
                    ? 'border-slate-800 bg-slate-800/20 hover:border-slate-700 hover:bg-slate-800/30'
                    : 'border-purple-500/50 bg-purple-900/20 hover:border-purple-500 hover:bg-purple-900/30'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 rounded-full p-2 ${
                      event.type === 'scene'
                        ? 'bg-blue-600/20 text-blue-400'
                        : event.type === 'message'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-purple-600/20 text-purple-400'
                    }`}
                  >
                    {event.type === 'scene' && <MessageCircle className="h-5 w-5" />}
                    {event.type === 'message' && <Bell className="h-5 w-5" />}
                    {event.type === 'system' && <Heart className="h-5 w-5" />}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">{event.message}</p>
                        {event.characterName && (
                          <p className="mt-2 text-xs text-slate-500">จาก {event.characterName}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(event.id)
                        }}
                        className="rounded-lg p-2 text-slate-500 opacity-0 transition hover:bg-slate-700 hover:text-white group-hover:opacity-100"
                        title="ทำเครื่องหมายว่าอ่านแล้ว"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="h-3.5 w-3.5" />
                      {formatTime(event.timestamp)}
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
