import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatSummaries, selectChatsLoading } from '../store/slices/chatsSlice'
import {
  loadExploreCharacters,
  selectCharactersError,
  selectCharactersLoading,
  selectExploreCharacters,
} from '../store/slices/charactersSlice'
import { selectContentSettings, setAdultStatus, setShowMature } from '../store/slices/contentSlice'

const categories = ['Anime', 'Fantasy', 'Romance', 'Dark Romance', 'Slice of Life', 'Drama', 'Mentor', 'Rival']

function characterBadges(tags: string[]) {
  const badges = new Set<string>()
  if (tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) badges.add('Relationship Ready')
  if (tags.some((tag) => ['slow-burn', 'rival', 'hostile'].includes(tag))) badges.add('Scene Event')
  if (tags.includes('slow-burn')) badges.add('Slow Burn')
  if (badges.size === 0) badges.add('Roleplay Ready')
  return [...badges].slice(0, 3)
}

export function ExplorePage() {
  const dispatch = useAppDispatch()
  const content = useAppSelector(selectContentSettings)
  const characters = useAppSelector(selectExploreCharacters)
  const chats = useAppSelector(selectChatSummaries)
  const isCharactersLoading = useAppSelector(selectCharactersLoading)
  const isChatsLoading = useAppSelector(selectChatsLoading)
  const charactersError = useAppSelector(selectCharactersError)

  useEffect(() => {
    dispatch(loadExploreCharacters())
    dispatch(loadChatSummaries())
  }, [dispatch])

  const heroCharacterId = characters[0]?.id ?? 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#9333ea_52%,#f97316)] p-5 text-white shadow-[0_24px_70px_rgba(69,64,174,0.26)] sm:p-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-black tracking-[0.22em] uppercase text-white/75">Maprang AI</p>
          <h1 className="text-3xl font-black tracking-normal sm:text-5xl">Roleplay that remembers the relationship, not just the chat.</h1>
          <p className="max-w-2xl text-sm leading-7 text-white/86 sm:text-base">
            Explore characters, continue pending scenes, and choose relationship contracts before the first message.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-black text-blue-700" to={`/characters/${heroCharacterId}`}>
              Start exploring
            </Link>
            <Link className="rounded-full border border-white/40 px-4 py-2 text-sm font-black text-white" to="/chats">
              Continue chatting
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">Content preferences</h2>
            <p className="mt-1 text-sm text-slate-500">Age-aware discovery keeps Explore familiar while making mature routes opt-in.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm font-black ${content.isAdult ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => dispatch(setAdultStatus(!content.isAdult))}
              type="button"
            >
              {content.isAdult ? '18+ enabled' : 'Teen mode'}
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-black ${content.showMature ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              disabled={!content.isAdult}
              onClick={() => dispatch(setShowMature(!content.showMature))}
              type="button"
            >
              Mature {content.showMature ? 'shown' : 'hidden'}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Continue Chatting</h2>
          <Link className="text-sm font-black text-blue-600" to="/chats">
            View all
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {isChatsLoading &&
            [1, 2].map((item) => <div className="h-24 animate-pulse rounded-2xl bg-blue-100" key={item} />)}

          {!isChatsLoading &&
            chats.slice(0, 4).map((chat) => (
              <Link className="rounded-2xl border border-blue-600/15 bg-blue-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md" key={chat.id} to={`/chat/${chat.id}`}>
                <p className="text-sm font-black text-blue-700">{chat.title || chat.characterName}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{chat.preview || 'Relationship status will appear here next.'}</p>
                <p className="mt-2 text-xs font-black text-blue-500">Continue with {chat.characterName}</p>
              </Link>
            ))}

          {!isChatsLoading && chats.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-900/15 bg-white p-4 text-sm text-slate-500">
              No saved chats yet. Pick a character below to start your first route.
            </div>
          )}
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button className="min-h-10 flex-none rounded-full border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700" key={category}>
            {category}
          </button>
        ))}
      </section>

      {charactersError && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          Could not load live characters. Check backend connection and try again.
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {isCharactersLoading &&
          [1, 2, 3, 4, 5, 6].map((item) => <div className="h-72 animate-pulse rounded-2xl bg-slate-200" key={item} />)}

        {!isCharactersLoading &&
          characters.map((character) => (
            <Link className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" key={character.id} to={`/characters/${character.id}`}>
              <div className="aspect-[4/3] overflow-hidden bg-linear-to-br from-slate-200 via-blue-100 to-amber-100">
                {character.avatarUrl && <img alt="" className="h-full w-full object-cover" src={character.avatarUrl} />}
              </div>
              <div className="space-y-3 p-3 sm:p-4">
                <div>
                  <h3 className="truncate text-base font-black">{character.name}</h3>
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{character.tagline || character.description}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {characterBadges(character.tags).map((badge) => (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600" key={badge}>
                      {badge}
                    </span>
                  ))}
                </div>
                <p className="text-xs font-black text-slate-400">{character.chatCount.toLocaleString()} chats</p>
              </div>
            </Link>
          ))}
      </section>
    </div>
  )
}
