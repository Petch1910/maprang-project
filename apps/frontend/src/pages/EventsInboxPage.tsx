import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import {
  loadChatSummaries,
  selectChatsError,
  selectChatsLoading,
  selectPendingSceneSummaries,
} from '../store/slices/chatsSlice'

export function EventsInboxPage() {
  const dispatch = useAppDispatch()
  const events = useAppSelector(selectPendingSceneSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">Events Inbox</h1>
          <p className="mt-2 text-slate-600">Important scenes from active chats collect here so players can jump back in fast.</p>
        </div>
        <button
          className="min-h-11 rounded-lg border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
          onClick={() => dispatch(loadChatSummaries())}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-lg border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">Could not load events.</div>}

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((item) => (
            <div className="h-28 animate-pulse rounded-lg bg-slate-200" key={item} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-900/15 bg-white p-6 text-slate-500">
          No pending scenes yet. Keep chatting until a relationship event becomes ready.
        </div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Link
              className="rounded-lg border border-amber-300/60 bg-amber-50 p-4 text-amber-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              key={event.id}
              to={`/chat/${event.chatId}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black tracking-widest uppercase text-amber-700">Scene Ready</p>
                  <h2 className="mt-1 text-lg font-black">{event.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-amber-900">{event.prompt}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black">{event.characterName}</span>
                  <span className="rounded-full bg-amber-200/70 px-2.5 py-1 text-xs font-black">{event.relationshipStatus}</span>
                  <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-black">
                    expires turn {event.expiresAtTurn}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
