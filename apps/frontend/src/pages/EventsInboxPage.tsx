import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, MessageCircle, RefreshCw, Search, Sparkles } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  loadChatSummaries,
  selectChatsError,
  selectChatsLoading,
  selectPendingSceneSummaries,
} from '../store/slices/chatsSlice'

const relationshipLabels: Record<string, string> = {
  RIVAL: 'คู่แข่ง',
  NEUTRAL: 'เป็นกลาง',
  CLOSE: 'ใกล้ชิด',
  TRUSTED: 'ไว้ใจ',
  ROMANTIC: 'โรแมนติก',
}

const eventTones = [
  {
    border: 'border-l-amber-400',
    icon: 'bg-amber-400/15 text-amber-700',
    chip: 'bg-amber-50 text-amber-700',
  },
  {
    border: 'border-l-sky-400',
    icon: 'bg-sky-400/15 text-sky-700',
    chip: 'bg-sky-50 text-sky-700',
  },
  {
    border: 'border-l-emerald-400',
    icon: 'bg-emerald-400/15 text-emerald-700',
    chip: 'bg-emerald-50 text-emerald-700',
  },
]

export function EventsInboxPage() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectPendingSceneSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)
  const [search, setSearch] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const visibleEvents = useMemo(() => {
    if (!normalizedSearch) return events
    return events.filter((event) =>
      [event.title, event.prompt, event.characterName, event.relationshipStatus]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch),
    )
  }, [events, normalizedSearch])

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">กล่องอีเวนต์</h1>
          <p className="mt-2 text-slate-600">รวมฉากสำคัญจากแชทที่กำลังเล่น เพื่อให้กลับไปต่อได้เร็ว</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
          onClick={() => dispatch(loadChatSummaries())}
          type="button"
        >
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      </div>

      <section className="grid gap-3 rounded-2xl border border-slate-900/10 bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-slate-500 focus-within:border-amber-500/50 focus-within:bg-white">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาฉาก ตัวละคร หรือสถานะความสัมพันธ์"
            value={search}
          />
        </label>
        <div className="flex min-h-11 items-center justify-center rounded-lg border border-slate-900/10 bg-slate-50 px-4 text-xs font-black text-slate-600">
          แสดง {visibleEvents.length.toLocaleString()} จาก {events.length.toLocaleString()} ฉาก
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          โหลดอีเวนต์ไม่ได้
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div className="h-28 animate-pulse rounded-lg bg-slate-200" key={item} />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-900/15 bg-white p-6 text-slate-500">
          <p className="m-0 text-sm leading-6">
            {events.length === 0
              ? 'ยังไม่มีฉากที่รออยู่ คุยต่อในห้องแชทจนกว่าเงื่อนไขความสัมพันธ์จะพร้อม แล้วระบบจะแจ้งเตือนก่อนเข้าสู่ฉากสำคัญ'
              : 'ไม่พบฉากที่ตรงกับคำค้นหาตอนนี้'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white" to="/chat">
              ไปห้องแชท
            </Link>
            <Link
              className="inline-flex min-h-10 items-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
              to="/"
            >
              เลือกตัวละครใหม่
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {visibleEvents.map((event, index) => {
            const tone = eventTones[index % eventTones.length]
            return (
            <Link
              className={`group rounded-2xl border border-l-4 border-slate-900/10 ${tone.border} bg-white p-4 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-900/20 hover:shadow-md`}
              key={event.id}
              to={`/chat/${event.chatId}`}
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="flex min-w-0 gap-3">
                  <span className={`mt-0.5 grid size-10 flex-none place-items-center rounded-xl ${tone.icon}`}>
                    <Sparkles size={18} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="m-0 text-xs font-black tracking-widest text-slate-500 uppercase">ฉากพร้อมเข้า</p>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone.chip}`}>
                        {relationshipLabels[event.relationshipStatus] ?? event.relationshipStatus}
                      </span>
                    </div>
                    <h2 className="mt-1 line-clamp-1 text-lg font-black">{event.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{event.prompt}</p>
                  </div>
                </div>
                <div className="grid gap-2 sm:min-w-52">
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-600">
                    <MessageCircle size={14} />
                    <span className="truncate">{event.characterName}</span>
                  </span>
                  <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-slate-50 px-3 text-xs font-black text-slate-600">
                    <Clock3 size={14} />
                    เหลือถึงเทิร์น {event.expiresAtTurn}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-900/10 pt-3">
                <p className="m-0 min-w-0 truncate text-xs font-bold text-slate-500">{event.chatTitle}</p>
                <span className="inline-flex flex-none items-center gap-1.5 text-xs font-black text-slate-700 transition group-hover:translate-x-0.5">
                  เปิดแชท <ArrowRight size={14} />
                </span>
              </div>
            </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
