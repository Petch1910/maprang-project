import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatSummaries, selectChatsError, selectChatsLoading } from '../store/slices/chatsSlice'

export function MyChatsPage() {
  const dispatch = useAppDispatch()
  const chats = useAppSelector(selectChatSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">My Chats</h1>
          <p className="mt-2 text-slate-600">Continue saved routes, pending scenes, and relationship arcs.</p>
        </div>
        <button
          className="min-h-11 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
          onClick={() => dispatch(loadChatSummaries())}
          type="button"
        >
          Refresh
        </button>
      </div>

      {error && <div className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">Could not load chats.</div>}

      <div className="grid gap-3 md:grid-cols-2">
        {isLoading && [1, 2, 3, 4].map((item) => <div className="h-32 animate-pulse rounded-2xl bg-slate-200" key={item} />)}

        {!isLoading &&
          chats.map((chat) => {
            const pendingCount = (chat.sceneState?.pendingEvents ?? []).filter((event) => event.status === 'pending').length
            const activeScene = chat.sceneState?.activeScene
            const relationship = chat.relationshipState

            return (
              <Link className="rounded-lg border border-slate-900/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={chat.id} to={`/chat/${chat.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black">{chat.title || chat.characterName}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-500">{chat.preview || 'No message preview yet.'}</p>
                  </div>
                  {pendingCount > 0 && (
                    <span className="flex-none rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                      {pendingCount} scene
                    </span>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{chat.characterName}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {relationship?.status ?? 'NEUTRAL'}
                  </span>
                  {relationship?.tier && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                      {relationship.tier}
                    </span>
                  )}
                  {activeScene && (
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">
                      Scene mode
                    </span>
                  )}
                </div>
              </Link>
            )
          })}

        {!isLoading && chats.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-900/15 bg-white p-6 text-slate-500">
            No saved chats yet. Start from Explore and your active routes will appear here.
          </div>
        )}
      </div>
    </div>
  )
}
