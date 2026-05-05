import { Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import { selectPendingEvents } from '../store/slices/eventsSlice'

export function EventsInboxPage() {
  const events = useAppSelector(selectPendingEvents)

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <h1 className="text-3xl font-black">Events Inbox</h1>
      <p className="text-slate-600">Pending scenes from every chat will appear here so users can jump back into important moments.</p>
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-900/15 bg-white p-6 text-slate-500">No pending scenes yet.</div>
      ) : (
        <div className="grid gap-3">
          {events.map((event) => (
            <Link className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm" key={event.id} to={`/chat/${event.chatId}`}>
              <p className="font-black">{event.title}</p>
              <p className="mt-1 text-sm text-slate-500">{event.characterName} - {event.relationshipStatus}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
