import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { CharacterListFilters } from '../lib/api'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatSummaries, selectChatsLoading } from '../store/slices/chatsSlice'
import {
  loadExploreCharacters,
  selectCharactersError,
  selectCharactersLoading,
  selectExploreCharacters,
} from '../store/slices/charactersSlice'
import { selectContentSettings, setAdultStatus, setShowMature } from '../store/slices/contentSlice'

const categories = [
  { label: 'ทั้งหมด', tag: '' },
  { label: 'อนิเมะ', tag: 'anime' },
  { label: 'แฟนตาซี', tag: 'fantasy' },
  { label: 'โรแมนซ์', tag: 'romance' },
  { label: 'รักเข้มข้น', tag: 'red-flag' },
  { label: 'ชีวิตประจำวัน', tag: 'slice-of-life' },
  { label: 'ดราม่า', tag: 'drama' },
  { label: 'เมนเทอร์', tag: 'mentor' },
  { label: 'คู่แข่ง', tag: 'rival' },
]

const sortOptions: Array<{ label: string; value: CharacterListFilters['sort'] }> = [
  { label: 'ยอดนิยม', value: 'popular' },
  { label: 'มาใหม่', value: 'newest' },
  { label: 'คุณภาพสูง', value: 'quality' },
  { label: 'คนดูมากสุด', value: 'viewed' },
  { label: 'ถูกใจมากสุด', value: 'favorited' },
]

function characterBadges(tags: string[]) {
  const badges = new Set<string>()
  if (tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) badges.add('พร้อมระบบสัมพันธ์')
  if (tags.some((tag) => ['slow-burn', 'rival', 'hostile'].includes(tag))) badges.add('มีอีเวนต์ฉาก')
  if (tags.includes('slow-burn')) badges.add('ค่อยเป็นค่อยไป')
  if (badges.size === 0) badges.add('พร้อมโรลเพลย์')
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
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState<CharacterListFilters['sort']>('popular')
  const exploreFilters = useMemo(
    () => ({
      q: search.trim() || undefined,
      tag: activeTag || undefined,
      sort,
      maxRating: content.maxRating,
      limit: 24,
    }),
    [activeTag, content.maxRating, search, sort],
  )

  useEffect(() => {
    dispatch(loadExploreCharacters(exploreFilters))
    dispatch(loadChatSummaries())
  }, [dispatch, exploreFilters])

  const heroCharacterId = characters[0]?.id ?? 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
  const visibleCharacters = characters.filter((character) => canViewRating(characterRating(character), content.maxRating))

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <section className="overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1d4ed8,#9333ea_52%,#f97316)] p-5 text-white shadow-[0_24px_70px_rgba(69,64,174,0.26)] sm:p-8">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs font-black tracking-[0.22em] uppercase text-white/75">Maprang AI</p>
          <h1 className="text-3xl font-black tracking-normal sm:text-5xl">
            โรลเพลย์ที่จำความสัมพันธ์ ไม่ใช่แค่จำข้อความแชท
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-white/86 sm:text-base">
            สำรวจตัวละคร เล่นฉากที่ค้างไว้ และเลือกจุดเริ่มต้นความสัมพันธ์ก่อนเริ่มคุย
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-full bg-white px-4 py-2 text-sm font-black text-blue-700" to={`/characters/${heroCharacterId}`}>
              เริ่มสำรวจ
            </Link>
            <Link className="rounded-full border border-white/40 px-4 py-2 text-sm font-black text-white" to="/chats">
              แชทต่อ
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">การตั้งค่าคอนเทนต์</h2>
            <p className="mt-1 text-sm text-slate-500">เลือกโหมดการมองเห็นคอนเทนต์ให้เหมาะกับอายุและความต้องการของคุณ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-full px-4 py-2 text-sm font-black ${content.isAdult ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              onClick={() => dispatch(setAdultStatus(!content.isAdult))}
              type="button"
            >
              {content.isAdult ? 'เปิดโหมด 18+' : 'โหมดทั่วไป'}
            </button>
            <button
              className={`rounded-full px-4 py-2 text-sm font-black ${content.showMature ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              disabled={!content.isAdult}
              onClick={() => dispatch(setShowMature(!content.showMature))}
              type="button"
            >
              คอนเทนต์ผู้ใหญ่: {content.showMature ? 'แสดง' : 'ซ่อน'}
            </button>
            <span className="flex min-h-10 items-center rounded-full bg-slate-100 px-4 text-sm font-black text-slate-600">
              สูงสุด {ratingLabel(content.maxRating)}
            </span>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">แชทต่อ</h2>
          <Link className="text-sm font-black text-blue-600" to="/chats">
            ดูทั้งหมด
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {isChatsLoading &&
            [1, 2].map((item) => <div className="h-24 animate-pulse rounded-2xl bg-blue-100" key={item} />)}

          {!isChatsLoading &&
            chats.slice(0, 4).map((chat) => (
              <Link
                className="rounded-2xl border border-blue-600/15 bg-blue-50 p-4 transition hover:-translate-y-0.5 hover:shadow-md"
                key={chat.id}
                to={`/chat/${chat.id}`}
              >
                <p className="text-sm font-black text-blue-700">{chat.title || chat.characterName}</p>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{chat.preview || 'สถานะความสัมพันธ์จะแสดงตรงนี้'}</p>
                <p className="mt-2 text-xs font-black text-blue-500">คุยต่อกับ {chat.characterName}</p>
              </Link>
            ))}

          {!isChatsLoading && chats.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-900/15 bg-white p-4 text-sm text-slate-500">
              ยังไม่มีแชทที่บันทึกไว้ เลือกตัวละครด้านล่างเพื่อเริ่มเส้นทางแรกได้เลย
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-900/10 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_auto] lg:items-center">
          <label className="block">
            <span className="sr-only">ค้นหาตัวละคร</span>
            <input
              className="min-h-11 w-full rounded-xl border border-slate-900/10 bg-slate-50 px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-blue-500/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="ค้นหาตัวละคร อารมณ์ แท็ก หรือแนวเรื่อง..."
              value={search}
            />
          </label>
          <select
            className="min-h-11 rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-sm font-black text-slate-700 outline-none"
            onChange={(event) => setSort(event.target.value as CharacterListFilters['sort'])}
            value={sort}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-black text-white transition hover:bg-blue-700"
            onClick={() => dispatch(loadExploreCharacters(exploreFilters))}
            type="button"
          >
            รีเฟรช
          </button>
        </div>
      </section>

      <section className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            className={`min-h-10 flex-none rounded-full border px-4 text-sm font-black transition ${
              activeTag === category.tag
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-900/10 bg-white text-slate-700 hover:bg-slate-50'
            }`}
            key={category.label}
            onClick={() => setActiveTag(category.tag)}
            type="button"
          >
            {category.label}
          </button>
        ))}
      </section>

      {charactersError && (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          โหลดตัวละครจาก backend ไม่ได้ กรุณาเช็กการเชื่อมต่อแล้วลองใหม่
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {isCharactersLoading &&
          [1, 2, 3, 4, 5, 6].map((item) => <div className="h-72 animate-pulse rounded-2xl bg-slate-200" key={item} />)}

        {!isCharactersLoading &&
          visibleCharacters.map((character) => {
            const rating = characterRating(character)
            return (
              <Link
                className="overflow-hidden rounded-2xl border border-slate-900/10 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                key={character.id}
                to={`/characters/${character.id}`}
              >
                <div className="aspect-[4/3] overflow-hidden bg-linear-to-br from-slate-200 via-blue-100 to-amber-100">
                  {character.avatarUrl && <img alt="" className="h-full w-full object-cover" src={character.avatarUrl} />}
                </div>
                <div className="space-y-3 p-3 sm:p-4">
                  <div>
                    <h3 className="truncate text-base font-black">{character.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{character.tagline || character.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">
                      {ratingLabel(rating)}
                    </span>
                    {characterBadges(character.tags).map((badge) => (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600" key={badge}>
                        {badge}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs font-black text-slate-400">{character.chatCount.toLocaleString()} แชท</p>
                </div>
              </Link>
            )
          })}

        {!isCharactersLoading && characters.length > 0 && visibleCharacters.length === 0 && (
          <div className="col-span-full rounded-lg border border-dashed border-slate-900/15 bg-white p-6 text-sm text-slate-500">
            ไม่พบตัวละครที่ตรงกับการค้นหาหรือโหมดคอนเทนต์ปัจจุบัน ลองปรับตัวกรองหรือเปิดโหมดผู้ใหญ่
          </div>
        )}
      </section>
    </div>
  )
}
