import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Clock3, MessageCircle, RefreshCw, Search, Sparkles } from 'lucide-react'
import { relationshipStatusLabel } from '../lib/relationshipLabels'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  loadChatSummaries,
  selectChatsError,
  selectChatsLoading,
  selectPendingSceneSummaries,
} from '../store/slices/chatsSlice'

const eventTones = [
  {
    border: 'border-l-[#ac4bff]',
    icon: 'bg-[#ac4bff]/12 text-[#d9b3ff]',
    chip: 'bg-[#ac4bff]/14 border border-[#ac4bff]/25 text-[#d9b3ff]',
  },
  {
    border: 'border-l-cyan-400',
    icon: 'bg-cyan-400/12 text-cyan-200',
    chip: 'bg-cyan-400/14 border border-cyan-400/25 text-cyan-100',
  },
  {
    border: 'border-l-emerald-400',
    icon: 'bg-emerald-400/12 text-emerald-200',
    chip: 'bg-emerald-400/14 border border-emerald-400/25 text-emerald-100',
  },
]

export function EventsInboxPage() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectPendingSceneSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)
  const [search, setSearch] = useState('')
  type PendingSceneSummary = (typeof events)[number]
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
  const eventGroups = useMemo<Array<{
    key: string
    title: string
    prompt: string
    relationshipStatus: string
    events: PendingSceneSummary[]
  }>>(() => {
    const groups = new Map<string, {
      key: string
      title: string
      prompt: string
      relationshipStatus: string
      events: PendingSceneSummary[]
    }>()

    for (const event of visibleEvents) {
      const key = `${event.title}::${event.prompt}::${event.relationshipStatus}`
      const group = groups.get(key)
      if (group) {
        group.events.push(event)
        continue
      }
      groups.set(key, {
        key,
        title: event.title,
        prompt: event.prompt,
        relationshipStatus: event.relationshipStatus,
        events: [event],
      })
    }

    return [...groups.values()]
  }, [visibleEvents])

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  return (
    <div className="space-y-5 p-4 text-white sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black">กล่องอีเวนต์</h1>
          <p className="mt-2 text-sm font-bold text-white/58">รวมฉากสำคัญจากแชทที่กำลังเล่น เพื่อให้กลับไปต่อได้เร็ว</p>
        </div>
        <button
          aria-disabled={isLoading}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:border-[#ac4bff]/40 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
          disabled={isLoading}
          onClick={() => dispatch(loadChatSummaries())}
          title={isLoading ? 'กำลังโหลดกล่องอีเวนต์ รอให้เสร็จก่อนรีเฟรช' : 'รีเฟรชกล่องอีเวนต์'}
          type="button"
        >
          <RefreshCw size={16} />
          รีเฟรช
        </button>
      </div>

      <section className="missai-card grid gap-3 rounded-2xl p-3 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#080a1a]/60 px-3 text-white/45 transition focus-within:border-[#ac4bff]/45 focus-within:bg-[#080a1a]/85">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาฉาก ตัวละคร หรือสถานะความสัมพันธ์"
            value={search}
          />
        </label>
        <div className="flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-[#080a1a]/60 px-4 text-xs font-black text-white/55">
          แสดง {visibleEvents.length.toLocaleString()} จาก {events.length.toLocaleString()} ฉาก
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4 text-sm font-bold text-purple-200">
          โหลดอีเวนต์ไม่ได้
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div className="h-28 animate-pulse rounded-2xl bg-white/5 border border-white/10" key={item} />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="missai-card flex flex-col rounded-3xl p-6 text-white/55">
          <p className="m-0 text-sm font-bold leading-6">
            {events.length === 0
              ? 'ยังไม่มีฉากที่รออยู่ คุยต่อในห้องแชทจนกว่าเงื่อนไขความสัมพันธ์จะพร้อม แล้วระบบจะแจ้งเตือนก่อนเข้าสู่ฉากสำคัญ'
              : 'ไม่พบฉากที่ตรงกับคำค้นหาตอนนี้'}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link className="inline-flex min-h-10 items-center justify-center rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-4 text-sm font-black text-white transition hover:brightness-110 missai-glow" to="/chat">
              ไปห้องแชท
            </Link>
            <Link
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:border-[#ac4bff]/40 hover:text-white"
              to="/"
            >
              เลือกตัวละครใหม่
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-3" data-testid="events-scene-list">
          {eventGroups.map((group, index) => {
            const tone = eventTones[index % eventTones.length]
            return (
              <section
                className={`missai-card overflow-hidden rounded-2xl border-l-4 border-[#2e2e44] ${tone.border}`}
                data-testid="events-scene-group"
                key={group.key}
              >
                <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-w-0 gap-3">
                    <span className={`mt-0.5 grid size-10 flex-none place-items-center rounded-lg ${tone.icon}`}>
                      <Sparkles size={18} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="m-0 text-xs font-black tracking-widest text-white/42 uppercase">ฉากพร้อมเข้า</p>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone.chip}`}>
                          {relationshipStatusLabel(group.relationshipStatus)}
                        </span>
                      </div>
                      <h2 className="mt-1 line-clamp-1 text-lg font-black">{group.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6 text-white/58">{group.prompt}</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-[#080a1a]/40 px-3 py-2 text-center text-xs font-black text-white/55">
                    {group.events.length.toLocaleString()} แชทที่พร้อมเข้า
                  </div>
                </div>

                <div className="divide-y divide-white/10">
                  {group.events.map((event) => (
                    <Link
                      className="group grid gap-3 px-4 py-3 text-white transition duration-200 hover:bg-white/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                      data-testid="events-scene-row"
                      key={event.id}
                      to={`/chat/${event.chatId}`}
                    >
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-black">{event.chatTitle}</p>
                        <p className="m-0 mt-1 flex min-w-0 flex-wrap items-center gap-2 text-xs font-bold text-white/48">
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <MessageCircle size={13} />
                            <span className="truncate">{event.characterName}</span>
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 size={13} />
                            เหลือถึงเทิร์น {event.expiresAtTurn}
                          </span>
                        </p>
                      </div>
                      <span className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-white px-3 text-xs font-black text-slate-950 transition duration-200 group-hover:bg-gradient-to-r group-hover:from-[#ac4bff] group-hover:to-[#8b5cf6] group-hover:text-white group-hover:missai-glow group-hover:translate-x-0.5">
                        เปิดแชท <ArrowRight size={14} />
                      </span>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
