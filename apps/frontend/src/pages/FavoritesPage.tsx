import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Compass, MessageSquare, Star, Trash2 } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadExploreCharacters, selectExploreCharacters, selectCharactersLoading } from '../store/slices/charactersSlice'
import { safeGetStorageItem, safeSetStorageItem } from '../lib/safeStorage'

export function FavoritesPage() {
  const dispatch = useAppDispatch()
  const characters = useAppSelector(selectExploreCharacters)
  const isLoading = useAppSelector(selectCharactersLoading)
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = safeGetStorageItem(window.localStorage, 'maprang:favorites:v1')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    dispatch(loadExploreCharacters({}))
  }, [dispatch])

  const toggleFavorite = (id: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const next = favoriteIds.includes(id)
      ? favoriteIds.filter(favId => favId !== id)
      : [...favoriteIds, id]
    setFavoriteIds(next)
    if (typeof window !== 'undefined') {
      safeSetStorageItem(window.localStorage, 'maprang:favorites:v1', JSON.stringify(next))
    }
  }

  const favoriteCharacters = characters.filter(c => favoriteIds.includes(c.id))

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:py-8">
      {/* Header Banner */}
      <section className="flex flex-col gap-3 rounded-2xl border border-[#2e2e44] bg-[#1e1e34]/90 p-6 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <Heart size={16} className="text-pink-400 fill-pink-400" />
          <span>รายการโปรด</span>
          <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-2.5 py-0.5 text-[10px] text-pink-300">
            {favoriteCharacters.length} ตัวละคร
          </span>
        </div>
        <h1 className="m-0 text-2xl font-black text-white sm:text-3xl">ตัวละครโปรดของฉัน</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          เข้าถึงแชทของตัวละครที่คุณโปรดปราน คัดเลือกเอาไว้เพื่อให้เปิดคุยและสวมบทบาทได้รวดเร็วขึ้น
        </p>
      </section>

      {/* Grid of Favorite Characters */}
      {isLoading && favoriteCharacters.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-[260px] animate-pulse rounded-xl bg-[#1e1e34] border border-[#2e2e44]" key={index} />
          ))}
        </div>
      ) : favoriteCharacters.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {favoriteCharacters.map((character) => (
            <Link
              key={character.id}
              className="group relative flex flex-col overflow-hidden rounded-xl border border-[#2e2e44] bg-[#1e1e34]/70 p-2 transition duration-300 hover:scale-105 hover:bg-[#1e1e34] hover:border-slate-500"
              to={`/characters/${character.id}`}
            >
              {/* Image / Avatar wrapper */}
              <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-[#080A1A]">
                {character.avatarUrl ? (
                  <img
                    alt={character.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    src={character.avatarUrl}
                  />
                ) : (
                  <div className="grid h-full place-items-center bg-gradient-to-br from-[#1e1e34] via-[#080a1a] to-[#2e2e44] text-3xl font-black text-slate-500">
                    {character.name.slice(0, 1)}
                  </div>
                )}
                {/* Heart/Unfavorite action button */}
                <button
                  type="button"
                  onClick={(e) => toggleFavorite(character.id, e)}
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-pink-400 hover:bg-black/80 transition shadow-md"
                  title="เอาออกจากรายการโปรด"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Title & Info */}
              <h3 className="mt-2 truncate text-sm font-black text-white">{character.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-8 text-xs leading-[1.15rem] text-[#9ca3af]">
                {character.greeting || 'เริ่มเรื่องใหม่กับตัวละครนี้...'}
              </p>

              {/* Badges / Bottom Row */}
              <div className="mt-2 flex items-center justify-between border-t border-[#2e2e44]/40 pt-2 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <MessageSquare size={10} />
                  {character.chatCount || 0}
                </span>
                <span className="flex items-center gap-0.5 text-[#d8b4fe]">
                  <Star size={10} className="fill-[#d8b4fe]" />
                  โปรด
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#2e2e44] bg-[#1e1e34]/30 py-20 text-center text-slate-500">
          <Heart size={48} className="mb-4 text-pink-400/30" />
          <h3 className="m-0 text-base font-black text-white">ยังไม่มีตัวละครโปรด</h3>
          <p className="m-0 mt-2 text-sm text-[#9ca3af]">
            กดหัวใจที่หน้าประวัติหรือหน้ารายละเอียดของตัวละครที่คุณสนใจ เพื่อเก็บไว้ที่นี่
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#a855f7] px-6 text-sm font-black text-white transition hover:bg-[#a855f7]/90 shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
          >
            <Compass size={15} />
            ไปหน้าสำรวจตัวละคร
          </Link>
        </div>
      )}
    </main>
  )
}
