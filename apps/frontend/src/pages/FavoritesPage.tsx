import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Compass, MessageSquare, Trash2 } from 'lucide-react'
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
      <section className="missai-card flex flex-col gap-3 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-2 text-xs font-bold text-[#d8b4fe]">
          <Heart size={16} className="text-pink-400 fill-pink-400 animate-pulse" />
          <span className="font-black">รายการโปรด</span>
          <span className="rounded-full border border-pink-500/30 bg-pink-500/15 px-2.5 py-0.5 text-[10px] text-pink-300">
            {favoriteCharacters.length} ตัวละคร
          </span>
        </div>
        <h1 className="font-display m-0 text-2xl font-black text-white sm:text-3xl">ตัวละครโปรดของฉัน</h1>
        <p className="m-0 text-sm font-semibold leading-6 text-[#9ca3af]">
          เข้าถึงแชทของตัวละครที่คุณโปรดปราน คัดเลือกเอาไว้เพื่อให้เปิดคุยและสวมบทบาทได้รวดเร็วขึ้น
        </p>
      </section>

      {/* Grid of Favorite Characters */}
      {isLoading && favoriteCharacters.length === 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="h-[260px] animate-pulse rounded-xl bg-white/5 border border-white/10" key={index} />
          ))}
        </div>
      ) : favoriteCharacters.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {favoriteCharacters.map((character) => (
            <Link
              key={character.id}
              className="missai-card group relative flex flex-col overflow-hidden rounded-xl p-2 transition duration-300 hover:-translate-y-0.5 hover:border-[#ac4bff]/50 hover:shadow-[0_8px_26px_rgba(172,75,255,0.15)]"
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
                  className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-black/60 text-rose-400 hover:text-rose-300 hover:bg-black/80 transition shadow-md"
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
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <MessageSquare size={10} />
                  {character.chatCount || 0}
                </span>
                <span className="flex items-center gap-0.5 text-pink-400">
                  <Heart size={10} className="fill-pink-400" />
                  โปรด
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="missai-card flex flex-col items-center justify-center rounded-3xl py-20 text-center text-slate-500">
          <Heart size={48} className="mb-4 text-pink-400/30" />
          <h3 className="font-display m-0 text-base font-black text-white">ยังไม่มีตัวละครโปรด</h3>
          <p className="m-0 mt-2 text-sm font-bold text-white/55">
            กดหัวใจที่หน้าประวัติหรือหน้ารายละเอียดของตัวละครที่คุณสนใจ เพื่อเก็บไว้ที่นี่
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-6 text-sm font-black text-white transition hover:brightness-110 missai-glow"
          >
            <Compass size={15} />
            ไปหน้าสำรวจตัวละคร
          </Link>
        </div>
      )}
    </main>
  )
}
