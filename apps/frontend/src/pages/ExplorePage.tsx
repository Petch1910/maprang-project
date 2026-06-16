import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Dice5,
  Folder,
  Gamepad2,
  Globe2,
  Heart,
  HelpCircle,
  MessageCircle,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import type { Character, CharacterListFilters } from '../lib/api'
import { displayCharacterSummary, displayMessageContent } from '../lib/characterDisplay'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatsLoading, selectPlayableChatSummaries } from '../store/slices/chatsSlice'
import {
  loadExploreCharacters,
  selectCharactersError,
  selectCharactersLoading,
  selectExploreCharacters,
} from '../store/slices/charactersSlice'
import { selectContentSettings } from '../store/slices/contentSlice'
import { selectTokenBalance } from '../store/slices/walletSlice'

const tabs = [
  { label: 'วันนี้', value: 'newest' },
  { label: 'สัปดาห์นี้', value: 'popular' },
  { label: 'เดือนนี้', value: 'viewed' },
  { label: 'ตลอดกาล', value: 'favorited' },
] satisfies Array<{ label: string; value: NonNullable<CharacterListFilters['sort']> }>

const quickFilters = [
  { label: 'ทั้งหมด', tag: '' },
  { label: 'อนิเมะ', tag: 'anime' },
  { label: 'แฟนตาซี', tag: 'fantasy' },
  { label: 'โรแมนซ์', tag: 'romance' },
  { label: 'ดราม่า', tag: 'drama' },
  { label: 'ค่อยๆ สนิท', tag: 'slow-burn' },
  { label: 'คู่แข่ง', tag: 'rival' },
]

const mobileNavItems = [
  { to: '/', label: 'สำรวจ', icon: Compass },
  { to: '/chats', label: 'แชท', icon: MessageCircle },
  { to: '/create', label: 'สร้าง', icon: PlusCircle },
  { to: '/events', label: 'อีเวนต์', icon: Bell },
  { to: '/profile', label: 'โปรไฟล์', icon: UserRound },
]

function avatarFallback(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'M'
}

function displayNumber(value?: number) {
  const next = value ?? 0
  if (next >= 1000000) return `${(next / 1000000).toFixed(1)}m`
  if (next >= 1000) return `${(next / 1000).toFixed(1)}k`
  return next.toLocaleString()
}

function characterSummary(character: Character) {
  return displayCharacterSummary(character, 'เริ่มเรื่องใหม่กับตัวละครนี้')
}

function getBadges(character: Character) {
  const badges = new Set<string>()
  if (character.tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) badges.add('ความสัมพันธ์')
  if (character.tags.some((tag) => ['rival', 'hostile', 'red-flag', 'slow-burn'].includes(tag))) badges.add('ฉากพร้อม')
  if (character.contentRating && character.contentRating !== 'general') badges.add(ratingLabel(character.contentRating))
  if (badges.size === 0) badges.add('ออริจินัล')
  return [...badges].slice(0, 2)
}

function SidebarAvatar({ character }: { character: Character }) {
  return character.avatarUrl ? (
    <img alt="" className="size-8 rounded-full object-cover ring-1 ring-white/10" src={character.avatarUrl} />
  ) : (
    <span className="grid size-8 place-items-center rounded-full bg-white/12 text-xs font-black text-white">
      {avatarFallback(character.name)}
    </span>
  )
}

function Sidebar({
  characters,
  chats,
  isChatsLoading,
}: {
  characters: Character[]
  chats: ReturnType<typeof selectPlayableChatSummaries>
  isChatsLoading: boolean
}) {
  const [sidebarSearch, setSidebarSearch] = useState('')
  const normalizedSidebarSearch = sidebarSearch.trim().toLowerCase()
  const filteredCharacters = useMemo(() => {
    const pinned = characters.slice(0, 8)
    if (!normalizedSidebarSearch) return pinned
    return pinned.filter((character) =>
      [character.name, characterSummary(character), character.tags.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedSidebarSearch),
    )
  }, [characters, normalizedSidebarSearch])
  const filteredChats = useMemo(() => {
    if (!normalizedSidebarSearch) return chats
    return chats.filter((chat) =>
      [chat.title, chat.characterName, chat.preview]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSidebarSearch),
    )
  }, [chats, normalizedSidebarSearch])

  return (
    <aside className="hidden h-svh min-h-0 w-[246px] flex-col border-r border-white/10 bg-[#0a0c1c]/80 p-2.5 text-white backdrop-blur-xl md:flex">
      <Link className="mb-1 flex min-h-10 items-center gap-2 rounded-xl px-1 text-white" to="/">
        <span className="grid size-8 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-lg font-black text-white missai-glow">
          M
        </span>
        <span className="min-w-0">
          <span className="font-display block truncate text-lg font-black tracking-wide">MAPRANG</span>
          <span className="block truncate text-[11px] font-bold text-[#9ca3af]">บทบาทสมมุติภาษาไทย</span>
        </span>
      </Link>

      <Link className="flex min-h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 text-sm font-black text-slate-200 transition hover:border-[#ac4bff]/40 hover:text-white" to="/">
        <Compass size={16} />
        ไปหน้าหลัก
      </Link>
      <Link
        className="mt-2 flex min-h-9 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] text-sm font-black text-white transition hover:brightness-110 missai-glow"
        to="/create"
      >
        <Plus size={16} />
        สร้างตัวละคร
      </Link>

      {/* Premium Navigation Links */}
      <div className="flex flex-col gap-1 border-b border-white/10 pb-2 mt-1">
        <Link
          className="flex min-h-8 items-center gap-3 rounded-xl px-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          to="/favorites"
        >
          <Heart size={14} className="text-pink-400" />
          รายการโปรด
        </Link>
        <Link
          className="flex min-h-8 items-center gap-3 rounded-xl px-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          to="/works"
        >
          <Folder size={14} className="text-blue-400" />
          ผลงานของฉัน
        </Link>
        <Link
          className="flex min-h-8 items-center gap-3 rounded-xl px-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          to="/creators"
        >
          <Trophy size={14} className="text-[#f9c86d]" />
          อันดับนักสร้าง
        </Link>
        <Link
          className="flex min-h-8 items-center gap-3 rounded-xl px-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          to="/announcements"
        >
          <Bell size={14} className="text-[#ac4bff]" />
          ประกาศระบบ
        </Link>
        <Link
          className="flex min-h-8 items-center gap-3 rounded-xl px-2 text-xs font-bold text-slate-300 transition hover:bg-white/5 hover:text-white"
          to="/support"
        >
          <HelpCircle size={14} className="text-emerald-400" />
          ศูนย์ช่วยเหลือ
        </Link>
      </div>

      <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-2">
        <Link className="relative text-sm font-black text-[#ac4bff] after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-gradient-to-r after:from-[#ac4bff] after:to-[#8b5cf6]" to="/chats">
          แชทส่วนตัว
        </Link>
        <Link className="text-sm font-black text-slate-400 transition hover:text-white" to="/events">อีเวนต์รวม</Link>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_36px] gap-2">
        <label className="flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-white/45 focus-within:border-[#ac4bff]/60 focus-within:ring-1 focus-within:ring-[#ac4bff]/25">
          <Search size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/42"
            onChange={(event) => setSidebarSearch(event.target.value)}
            placeholder="ค้นหาแชท"
            value={sidebarSearch}
          />
        </label>
        <button
          className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/60 transition hover:bg-white/10"
          onClick={() => setSidebarSearch('')}
          title="ล้างคำค้นหา"
          type="button"
        >
          <X size={16} />
        </button>
      </div>

      <section className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 text-xs font-black text-[#d9b3ff]">ตัวละครแนะนำ</p>
        <div className="space-y-1">
          {filteredCharacters.map((character) => (
            <Link
              className="grid min-h-10 grid-cols-[32px_minmax(0,1fr)_22px] items-center gap-2 rounded-xl px-1.5 transition hover:bg-[#ac4bff]/12 hover:text-[#d9b3ff]"
              key={character.id}
              to={`/characters/${character.id}`}
            >
              <SidebarAvatar character={character} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{character.name}</span>
                <span className="block truncate text-[11px] text-white/42">{characterSummary(character)}</span>
              </span>
              <ChevronRight className="text-white/40" size={16} />
            </Link>
          ))}
          {filteredCharacters.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
              ไม่พบตัวละครที่ตรงกับคำค้นหา
            </p>
          )}
        </div>

        <p className="mb-2 mt-4 text-xs font-black text-slate-500">วันนี้</p>
        <div className="space-y-1">
          {isChatsLoading && <p className="rounded-xl bg-white/[0.03] p-3 text-xs text-white/45">กำลังโหลด...</p>}
          {!isChatsLoading && filteredChats.length === 0 && (
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">
              {normalizedSidebarSearch ? 'ไม่พบแชทที่ตรงกับคำค้นหา' : 'ยังไม่มีแชทที่บันทึกไว้'}
            </p>
          )}
          {!isChatsLoading &&
            filteredChats.slice(0, 8).map((chat) => (
              <Link
                className="grid min-h-10 grid-cols-[32px_minmax(0,1fr)_22px] items-center gap-2 rounded-xl px-1.5 transition hover:bg-[#ac4bff]/12 hover:text-[#d9b3ff]"
                key={chat.id}
                to={`/chat/${chat.id}`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-white/8 text-xs font-black text-slate-300">
                  {avatarFallback(chat.characterName)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{chat.title || chat.characterName}</span>
                  <span className="block truncate text-[11px] text-white/42">{chat.preview || 'กลับไปเล่นต่อ'}</span>
                </span>
                <ChevronRight className="text-white/40" size={16} />
              </Link>
            ))}
        </div>
      </section>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-white/45">
        <Link className="grid size-8 place-items-center rounded-xl transition hover:bg-[#ac4bff]/15 hover:text-[#d9b3ff]" title="อีเวนต์" to="/events">
          <Gamepad2 size={16} />
        </Link>
        <Link className="grid size-8 place-items-center rounded-xl transition hover:bg-[#ac4bff]/15 hover:text-[#d9b3ff]" title="แชททั้งหมด" to="/chats">
          <Globe2 size={16} />
        </Link>
        <Link className="grid size-8 place-items-center rounded-xl transition hover:bg-white/8 hover:text-white" title="สร้างตัวละคร" to="/create">
          <Sparkles size={16} />
        </Link>
        <Link className="ml-auto grid size-8 place-items-center rounded-xl transition hover:bg-white/8 hover:text-white" title="ตั้งค่า" to="/profile">
          <Settings size={16} />
        </Link>
      </div>
      <p className="m-0 truncate text-[11px] text-white/35">ข้อกำหนด & ความเป็นส่วนตัว</p>
    </aside>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const badges = getBadges(character)
  const coverImageUrl = character.coverUrl || character.avatarUrl || ''
  return (
    <Link className="group block w-[132px] flex-none text-white sm:w-[148px]" to={`/characters/${character.id}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-[#101226] ring-1 ring-[#7864c8]/30 transition duration-300 group-hover:ring-[#ac4bff]/70 group-hover:shadow-[0_14px_36px_rgba(172,75,255,0.35)]">
        {coverImageUrl ? (
          <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={coverImageUrl} />
        ) : (
          <div className="grid h-full place-items-center bg-gradient-to-br from-[#1e1e34] via-[#080a1a] to-[#59168b] text-4xl font-black text-slate-400">
            {avatarFallback(character.name)}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-black text-[#f9c86d] backdrop-blur-sm">เฉพาะ Maprang</span>
          <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-[11px] font-black text-white shadow-[0_2px_8px_rgba(172,75,255,0.5)]">↗</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-2">
          <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#f9c86d]">
            <span>◌</span>
            <span>{displayNumber(character.chatCount || character.viewCount)}</span>
          </div>
        </div>
      </div>
      <h3 className="mt-2 truncate text-sm font-black leading-5">{character.name}</h3>
      <p className="mt-0.5 line-clamp-2 min-h-9 text-xs leading-[1.15rem] text-[#94a3b8]">
        {characterSummary(character)}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-1">
        {badges.map((badge) => (
          <span className="truncate rounded-full border border-[#ac4bff]/25 bg-[#ac4bff]/12 px-2 py-0.5 text-[10px] font-black text-[#d9b3ff]" key={badge}>
            {badge}
          </span>
        ))}
      </div>
    </Link>
  )
}

function CharacterRail({
  title,
  icon,
  characters,
  isLoading,
}: {
  title: string
  icon: string
  characters: Character[]
  isLoading: boolean
}) {
  const showSkeleton = isLoading && characters.length === 0
  const railRef = useRef<HTMLDivElement | null>(null)
  const scrollRail = (direction: -1 | 1) => {
    railRef.current?.scrollBy({ left: direction * 620, behavior: 'smooth' })
  }

  if (!showSkeleton && characters.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display m-0 flex items-center gap-2 text-xl font-black">
          <span>{icon}</span>
          <span>{title}</span>
        </h2>
        <button
          className="text-sm font-black text-[#d9b3ff]/70 transition hover:text-[#d9b3ff]"
          aria-label={`เลื่อน ${title} ไปทางขวา`}
          onClick={() => scrollRail(1)}
          type="button"
        >
          ดูเพิ่ม
        </button>
      </div>
      <div className="relative">
        <button
          className="absolute -left-2 top-[72px] z-10 hidden size-10 place-items-center rounded-full border border-[#ac4bff]/30 bg-[#101226]/80 text-[#d9b3ff] backdrop-blur-md transition hover:bg-[#ac4bff]/25 lg:grid"
          aria-label={`เลื่อน ${title} ไปทางซ้าย`}
          onClick={() => scrollRail(-1)}
          type="button"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]" ref={railRef}>
          {showSkeleton &&
            Array.from({ length: 10 }).map((_, index) => (
              <div className="h-[250px] w-[132px] flex-none animate-pulse rounded-2xl border border-[#7864c8]/20 bg-[#101226] sm:w-[148px]" key={index} />
            ))}
          {!showSkeleton && characters.map((character) => <CharacterCard character={character} key={character.id} />)}
        </div>
        <button
          className="absolute -right-2 top-[72px] z-10 hidden size-10 place-items-center rounded-full border border-[#ac4bff]/30 bg-[#101226]/80 text-[#d9b3ff] backdrop-blur-md transition hover:bg-[#ac4bff]/25 lg:grid"
          aria-label={`เลื่อน ${title} ไปทางขวา`}
          onClick={() => scrollRail(1)}
          type="button"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}

function ContinueChattingRail({
  chats,
  isLoading,
}: {
  chats: ReturnType<typeof selectPlayableChatSummaries>
  isLoading: boolean
}) {
  const recentChats = chats.slice(0, 8)
  if (!isLoading && recentChats.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display m-0 flex items-center gap-2 text-xl font-black">
            <MessageCircle className="text-[#ac4bff]" size={20} />
            <span>เล่นต่อ</span>
          </h2>
          <p className="m-0 mt-1 text-sm font-bold text-white/45">กลับเข้าเรื่องเดิมพร้อมสถานะความสัมพันธ์ล่าสุด</p>
        </div>
        <Link className="text-sm font-black text-[#d9b3ff]/70 transition hover:text-[#d9b3ff]" to="/chats">
          ดูทั้งหมด
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none]">
        {isLoading &&
          recentChats.length === 0 &&
          Array.from({ length: 4 }).map((_, index) => (
            <div className="h-32 w-[250px] flex-none animate-pulse rounded-2xl border border-[#7864c8]/20 bg-[#101226]" key={index} />
          ))}

        {!isLoading &&
          recentChats.map((chat) => {
            const pendingCount = (chat.sceneState?.pendingEvents ?? []).filter((event) => event.status === 'pending').length
            return (
              <Link
                className="missai-card group grid w-[250px] flex-none gap-3 rounded-2xl p-3 text-white transition hover:-translate-y-0.5 hover:border-[#ac4bff]/50"
                key={chat.id}
                to={`/chat/${chat.id}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 flex-none place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-sm font-black">
                    {avatarFallback(chat.characterName)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{chat.title || chat.characterName}</span>
                    <span className="block truncate text-xs text-white/45">{chat.characterName}</span>
                  </span>
                </div>
                <p className="m-0 line-clamp-2 min-h-10 text-xs leading-5 text-[#94a3b8]">
                  {chat.preview ? displayMessageContent(chat.preview) : 'กลับไปเล่นต่อจากจังหวะล่าสุด'}
                </p>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  <span className="rounded-full border border-[#ac4bff]/25 bg-[#ac4bff]/12 px-2 py-1 text-[11px] font-black text-[#d9b3ff]">
                    {relationshipStatusLabel(chat.relationshipState?.status)}
                  </span>
                  {chat.relationshipState?.tier && (
                    <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-[11px] font-black text-emerald-100">
                      {relationshipTierLabel(chat.relationshipState.tier)}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="rounded-full border border-[#f99c00]/30 bg-[#f99c00]/14 px-2 py-1 text-[11px] font-black text-[#f9c86d]">
                      {pendingCount} ฉากรอ
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
      </div>
    </section>
  )
}

export function ExplorePage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const content = useAppSelector(selectContentSettings)
  const characters = useAppSelector(selectExploreCharacters)
  const chats = useAppSelector(selectPlayableChatSummaries)
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isCharactersLoading = useAppSelector(selectCharactersLoading)
  const isChatsLoading = useAppSelector(selectChatsLoading)
  const charactersError = useAppSelector(selectCharactersError)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState<CharacterListFilters['sort']>('popular')

  const exploreFilters = useMemo(
    () => ({
      q: search.trim() || undefined,
      sort,
      maxRating: content.maxRating,
      limit: 36,
    }),
    [content.maxRating, search, sort],
  )

  useEffect(() => {
    dispatch(loadExploreCharacters(exploreFilters))
    dispatch(loadChatSummaries())
  }, [dispatch, exploreFilters])

  const visibleCharacters = useMemo(
    () => characters.filter((character) => canViewRating(characterRating(character), content.maxRating)),
    [characters, content.maxRating],
  )
  const marketplaceCharacters = visibleCharacters

  const taggedCharacters = useMemo(() => {
    const source = marketplaceCharacters
    if (!activeTag) return source
    const next = source.filter((character) =>
      character.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase()),
    )
    return next.length > 0 ? next : source
  }, [activeTag, marketplaceCharacters])
  const forYou = taggedCharacters.slice(0, 12)
  const popular = [...taggedCharacters]
    .sort((a, b) => (b.chatCount + (b.viewCount ?? 0)) - (a.chatCount + (a.viewCount ?? 0)))
    .slice(0, 12)
  const fresh = taggedCharacters.length > 6 ? [...taggedCharacters].slice(6, 18) : taggedCharacters.slice(0, 12)
  const openRandomCharacter = () => {
    const pool = taggedCharacters.length > 0 ? taggedCharacters : marketplaceCharacters
    const picked = pool[Math.floor(Math.random() * pool.length)]
    if (!picked) {
      navigate('/create')
      return
    }
    navigate(`/characters/${picked.id}`)
  }
  const activateRelationshipPicks = () => {
    setSearch('')
    setActiveTag('slow-burn')
    setSort('popular')
  }

  return (
    <main className="missai-aurora flex min-h-svh text-white">
      <Sidebar characters={marketplaceCharacters} chats={chats} isChatsLoading={isChatsLoading} />

      <section className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a1a]/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <Link
              aria-label="เปิดแชทของฉัน"
              className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 md:hidden"
              to="/chats"
            >
              <MessageCircle size={18} />
            </Link>
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#ac4bff]/80" size={18} />
              <input
                className="min-h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 pr-11 text-sm font-bold text-white outline-none backdrop-blur-md placeholder:text-white/38 focus:border-[#ac4bff]/70 focus:ring-2 focus:ring-[#ac4bff]/25"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาตัวละคร"
                value={search}
              />
            </label>
            <div className="hidden items-center gap-2 rounded-full border border-[#f99c00]/30 bg-[#f99c00]/10 px-3 py-2 text-sm font-black text-[#f9c86d] xl:flex">
              <Coins size={16} />
              <span>{tokenBalance.toLocaleString()} คอยน์</span>
              <Link className="ml-2 rounded-full bg-gradient-to-r from-[#f9c86d] to-[#f99c00] px-4 py-1 text-xs font-black text-[#1a1206]" to="/wallet">จัดการ</Link>
            </div>
            <button type="button"
              className="hidden size-12 place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow transition duration-200 hover:brightness-110 lg:grid"
              onClick={openRandomCharacter}
              title="สุ่มตัวละคร"
            >
              <Dice5 size={20} />
            </button>
            <button type="button"
              className="hidden size-12 place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow transition duration-200 hover:brightness-110 lg:grid"
              onClick={activateRelationshipPicks}
              title="แนะนำตัวละครความสัมพันธ์"
            >
              <WandSparkles size={20} />
            </button>
            <Link className="grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-[#ac4bff]/50 hover:text-[#ac4bff]" to="/events">
              <Bell size={18} />
            </Link>
          </div>
        </header>

        <div className="space-y-9 px-4 py-7 md:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {quickFilters.map((filter) => (
              <button
                className={`min-h-9 flex-none rounded-full px-4 text-sm font-black transition ${
                  activeTag === filter.tag ? 'bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] text-white missai-glow' : 'border border-white/10 bg-white/[0.04] text-slate-300 hover:border-[#ac4bff]/40 hover:text-white'
                }`}
                key={filter.label}
                onClick={() => setActiveTag(filter.tag)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <section className="space-y-4">
            <div className="flex gap-3">
              {tabs.map((tab) => (
                <button
                  className={`min-h-9 rounded-full px-4 text-sm font-black transition ${
                    sort === tab.value ? 'border border-[#ac4bff]/50 bg-[#ac4bff]/15 text-[#d9b3ff]' : 'text-slate-400 hover:text-white'
                  }`}
                  key={tab.value}
                  onClick={() => setSort(tab.value)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {charactersError && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
                โหลดตัวละครจากเซิร์ฟเวอร์ไม่ได้ กรุณาเช็คการเชื่อมต่อแล้วลองใหม่
              </div>
            )}
          </section>

          <ContinueChattingRail chats={chats} isLoading={isChatsLoading} />
          {!isCharactersLoading && marketplaceCharacters.length === 0 && !charactersError && (
            <section
              className="missai-card rounded-3xl p-6 text-center"
              data-testid="explore-empty-state"
            >
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#ac4bff]/16 text-[#ac4bff]">
                <Sparkles size={22} />
              </div>
              <h2 className="font-display m-0 mt-4 text-xl font-black">ยังไม่มีตัวละครให้สำรวจ</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-white/55">
                เมื่อมีตัวละครที่เผยแพร่แล้ว รายการจะมาแสดงตรงนี้ทันที ตอนนี้เริ่มจากสร้างตัวละครแรกของ Maprang ได้เลย
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-5 text-sm font-black text-white transition hover:brightness-110 missai-glow"
                to="/create"
              >
                <Plus size={17} />
                สร้างตัวละคร
              </Link>
            </section>
          )}
          <CharacterRail characters={forYou} icon="✨" isLoading={isCharactersLoading} title="สำหรับคุณ" />
          <CharacterRail characters={popular} icon="🔥" isLoading={isCharactersLoading} title="ตัวละครยอดนิยม" />
          <CharacterRail characters={fresh} icon="🆕" isLoading={isCharactersLoading} title="มาใหม่" />
        </div>
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#0b0d1f]/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden"
        data-testid="explore-mobile-nav"
      >
        {mobileNavItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black transition ${
                isActive ? 'bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow' : 'text-slate-400'
              }`
            }
            end={item.to === '/'}
            key={item.to}
            data-testid={`explore-mobile-nav-${item.to === '/' ? 'home' : item.to.slice(1)}`}
            to={item.to}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </main>
  )
}
