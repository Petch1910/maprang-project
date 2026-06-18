import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, ChevronLeft, ChevronRight, Coins, Dice5, Search, Sparkles, WandSparkles, X } from 'lucide-react'
import type { Character, CharacterListFilters } from '../lib/api'
import { currentRoutePath, trackFrontendEventSafe } from '../lib/analytics'
import { displayCharacterSummary, displayMessageContent } from '../lib/characterDisplay'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { characterImageUrl } from '../lib/characterVisual'
import { missAiMobileNav, missAiNavSections, type MissAiNavItem } from '../lib/missaiNavigation'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatsLoading, selectPendingSceneCount, selectPlayableChatSummaries } from '../store/slices/chatsSlice'
import {
  loadExploreCharacters,
  selectCharactersError,
  selectCharactersLoading,
  selectExploreCharacters,
} from '../store/slices/charactersSlice'
import { selectContentSettings } from '../store/slices/contentSlice'
import { selectTokenBalance } from '../store/slices/walletSlice'

const tabs = [
  { label: 'ล่าสุด', value: 'newest' },
  { label: '24 ชม.', value: 'popular' },
  { label: 'สัปดาห์นี้', value: 'viewed' },
  { label: 'ตลอดกาล', value: 'favorited' },
] satisfies Array<{ label: string; value: NonNullable<CharacterListFilters['sort']> }>

const quickFilters = [
  { label: 'ทั้งหมด', tag: '' },
  { label: 'อนิเมะ', tag: 'anime' },
  { label: 'แฟนตาซี', tag: 'fantasy' },
  { label: 'โรแมนซ์', tag: 'romance' },
  { label: 'ดราม่า', tag: 'drama' },
  { label: 'ค่อยเป็นค่อยไป', tag: 'slow-burn' },
  { label: 'คู่ปรับ', tag: 'rival' },
]

function avatarFallback(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'M'
}

function displayNumber(value?: number) {
  const next = value ?? 0
  if (next >= 1000000) return `${(next / 1000000).toFixed(1)}M`
  if (next >= 1000) return `${(next / 1000).toFixed(1)}K`
  return next.toLocaleString()
}

function characterSummary(character: Character) {
  return displayCharacterSummary(character, 'เริ่มโรลเพลย์ใหม่กับตัวละครนี้')
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
  return (
    <img
      alt=""
      className="size-8 rounded-full object-cover ring-1 ring-white/10"
      src={characterImageUrl({ id: character.id, name: character.name, src: character.avatarUrl })}
    />
  )
}

function SidebarNavItem({
  item,
  eventCount,
}: {
  item: MissAiNavItem
  eventCount: number
}) {
  const Icon = item.icon
  const to = item.to
  const badge = to === '/events' && eventCount > 0 ? String(eventCount) : item.badge

  if (!to) {
    return (
      <button
        className="flex min-h-11 w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 text-left text-sm font-black text-white/35"
        title={item.disabledReason}
        type="button"
      >
        <Icon className="size-5" />
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
      </button>
    )
  }

  return (
    <NavLink
      className={({ isActive }) =>
        `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-black transition ${
          isActive
            ? 'border border-[#ac4bff]/45 bg-[#ac4bff]/18 text-[#d9b3ff] shadow-[inset_3px_0_0_#ac4bff]'
            : 'text-slate-400 hover:bg-white/6 hover:text-white'
        }`
      }
      end={to === '/'}
      to={to}
    >
      <Icon className="size-5" />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {badge && <span className="rounded-full bg-[#f99c00] px-1.5 py-0.5 text-[10px] font-black text-[#1a1206]">{badge}</span>}
    </NavLink>
  )
}

function Sidebar({
  characters,
  chats,
  eventCount,
  isChatsLoading,
}: {
  characters: Character[]
  chats: ReturnType<typeof selectPlayableChatSummaries>
  eventCount: number
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
    <aside className="hidden h-svh min-h-0 w-[206px] shrink-0 flex-col border-r border-white/10 bg-[#0a0c1f]/95 p-3 text-white md:flex">
      <Link className="mb-5 flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center" to="/">
        <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[#ac4bff] to-[#34d5ff] text-2xl font-black shadow-[0_0_28px_rgba(172,75,255,0.35)]">
          M
        </span>
        <span>
          <span className="font-display block text-lg font-black tracking-[0.22em] text-[#d9b3ff]">Maprang</span>
          <span className="block text-[11px] font-bold text-white/45">เซิร์ฟเวอร์ในเครื่องพร้อมเล่น</span>
        </span>
      </Link>

      <nav className="space-y-5">
        {missAiNavSections.map((section, sectionIndex) => (
          <section className="space-y-1" key={section.label ?? sectionIndex}>
            {section.label && <p className="m-0 px-3 pt-2 text-[11px] font-black tracking-wide text-white/35">{section.label}</p>}
            {section.items.map((item) => (
              <SidebarNavItem eventCount={eventCount} item={item} key={item.label} />
            ))}
          </section>
        ))}
      </nav>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)_36px] gap-2">
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

      <section className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 text-xs font-black text-[#d9b3ff]">ตัวละครที่ปักหมุด</p>
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
            <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/45">ไม่พบตัวละครที่ตรงกับคำค้นหา</p>
          )}
        </div>

        <p className="mb-2 mt-4 text-xs font-black text-slate-500">แชทล่าสุด</p>
        <div className="space-y-1">
          {isChatsLoading && <p className="rounded-xl bg-white/[0.03] p-3 text-xs text-white/45">กำลังโหลดแชท...</p>}
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
                <img
                  alt={chat.characterName}
                  className="size-8 rounded-full object-cover ring-1 ring-white/10"
                  src={characterImageUrl({ id: chat.characterId, name: chat.characterName, src: chat.characterAvatarUrl })}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black">{chat.title || chat.characterName}</span>
                  <span className="block truncate text-[11px] text-white/42">{chat.preview || 'กลับไปต่อจากเรื่องเดิม'}</span>
                </span>
                <ChevronRight className="text-white/40" size={16} />
              </Link>
            ))}
        </div>
      </section>

      <p className="m-0 border-t border-white/10 pt-3 text-[11px] text-white/35">ข้อกำหนดและความเป็นส่วนตัว</p>
    </aside>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const badges = getBadges(character)
  const coverImageUrl = character.coverUrl || characterImageUrl({ id: character.id, name: character.name, src: character.avatarUrl })
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
          <span className="grid size-5 place-items-center rounded-full bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-[11px] font-black text-white shadow-[0_2px_8px_rgba(172,75,255,0.5)]">
            M
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 to-transparent p-2">
          <div className="flex items-center justify-end gap-1 text-[11px] font-black text-[#f9c86d]">
            <span>{displayNumber(character.chatCount || character.viewCount)}</span>
          </div>
        </div>
      </div>
      <h3 className="mt-2 truncate text-sm font-black leading-5">{character.name}</h3>
      <p className="mt-0.5 line-clamp-2 min-h-9 text-xs leading-[1.15rem] text-[#94a3b8]">{characterSummary(character)}</p>
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
  characters,
  isLoading,
}: {
  title: string
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
        <h2 className="font-display m-0 text-xl font-black">{title}</h2>
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
          <h2 className="font-display m-0 flex items-center gap-2 text-xl font-black">คุยต่อ</h2>
          <p className="m-0 mt-1 text-sm font-bold text-white/45">กลับเข้าเรื่องเดิมพร้อมสถานะความสัมพันธ์และฉากที่รออยู่</p>
        </div>
        <Link className="text-sm font-black text-[#d9b3ff]/70 transition hover:text-[#d9b3ff]" to="/chats">
          ดูแชททั้งหมด
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
                  <img
                    alt={chat.characterName}
                    className="size-10 flex-none rounded-xl object-cover ring-1 ring-[#ac4bff]/25"
                    src={characterImageUrl({ id: chat.characterId, name: chat.characterName, src: chat.characterAvatarUrl })}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-black">{chat.title || chat.characterName}</span>
                    <span className="block truncate text-xs text-white/45">{chat.characterName}</span>
                  </span>
                </div>
                <p className="m-0 line-clamp-2 min-h-10 text-xs leading-5 text-[#94a3b8]">
                  {chat.preview ? displayMessageContent(chat.preview) : 'ต่อจากเทิร์นล่าสุด'}
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
                      {pendingCount} ฉากรออยู่
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
  const eventCount = useAppSelector(selectPendingSceneCount)
  const isCharactersLoading = useAppSelector(selectCharactersLoading)
  const isChatsLoading = useAppSelector(selectChatsLoading)
  const charactersError = useAppSelector(selectCharactersError)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState('')
  const [sort, setSort] = useState<CharacterListFilters['sort']>('popular')
  const trackedImpressionIdsRef = useRef(new Set<string>())

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

  useEffect(() => {
    trackFrontendEventSafe({
      eventName: 'marketplace_view',
      route: currentRoutePath(),
      entityType: 'surface',
      entityId: 'explore',
      metadata: { sort, tag: activeTag || 'all', maxRating: content.maxRating },
    })
  }, [activeTag, content.maxRating, sort])

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

  useEffect(() => {
    for (const character of taggedCharacters.slice(0, 12)) {
      if (trackedImpressionIdsRef.current.has(character.id)) continue
      trackedImpressionIdsRef.current.add(character.id)
      trackFrontendEventSafe({
        eventName: 'character_impression',
        route: currentRoutePath(),
        entityType: 'character',
        entityId: character.id,
        characterId: character.id,
        metadata: { source: 'explore_rail', tags: character.tags.slice(0, 6), rating: character.contentRating ?? 'general' },
      })
    }
  }, [taggedCharacters])

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
      <Sidebar characters={marketplaceCharacters} chats={chats} eventCount={eventCount} isChatsLoading={isChatsLoading} />

      <section className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080a1a]/80 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
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
               <span>{tokenBalance.toLocaleString()} โทเคน</span>
              <Link className="ml-2 rounded-full bg-gradient-to-r from-[#f9c86d] to-[#f99c00] px-4 py-1 text-xs font-black text-[#1a1206]" to="/wallet">
                เติมโทเคน
              </Link>
            </div>
            <button
              type="button"
              className="hidden size-12 place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow transition duration-200 hover:brightness-110 lg:grid"
              onClick={openRandomCharacter}
              title="สุ่มตัวละคร"
            >
              <Dice5 size={20} />
            </button>
            <button
              type="button"
              className="hidden size-12 place-items-center rounded-xl bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow transition duration-200 hover:brightness-110 lg:grid"
              onClick={activateRelationshipPicks}
              title="เลือกจากโทนความสัมพันธ์"
            >
              <WandSparkles size={20} />
            </button>
            <Link className="relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-[#ac4bff]/50 hover:text-[#ac4bff]" to="/events">
              <Bell size={18} />
              {eventCount > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1 text-[10px] font-black text-white">{eventCount}</span>}
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
            <div className="flex gap-3 overflow-x-auto [scrollbar-width:none]">
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
                โหลดตัวละครไม่ได้ ตรวจการเชื่อมต่อระบบหลังบ้านแล้วลองใหม่อีกครั้ง
              </div>
            )}
          </section>

          <ContinueChattingRail chats={chats} isLoading={isChatsLoading} />
          {!isCharactersLoading && marketplaceCharacters.length === 0 && !charactersError && (
            <section className="missai-card rounded-3xl p-6 text-center" data-testid="explore-empty-state">
              <div className="mx-auto grid size-12 place-items-center rounded-full bg-[#ac4bff]/16 text-[#ac4bff]">
                <Sparkles size={22} />
              </div>
              <h2 className="font-display m-0 mt-4 text-xl font-black">ยังไม่มีตัวละคร</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm font-bold leading-6 text-white/55">
                ตัวละครที่เผยแพร่แล้วจะแสดงที่นี่ ลองสร้างตัวละครแรกของ Maprang เพื่อเริ่มเติมตลาดตัวละคร
              </p>
              <Link
                className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-5 text-sm font-black text-white transition hover:brightness-110 missai-glow"
                to="/create"
              >
                สร้างตัวละคร
              </Link>
            </section>
          )}
          <CharacterRail characters={forYou} isLoading={isCharactersLoading} title="สำหรับคุณ" />
          <CharacterRail characters={popular} isLoading={isCharactersLoading} title="ตัวละครยอดนิยม" />
          <CharacterRail characters={fresh} isLoading={isCharactersLoading} title="มาใหม่" />
        </div>
      </section>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-[#0b0d1f]/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden"
        data-testid="explore-mobile-nav"
      >
        {missAiMobileNav.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              className={({ isActive }) =>
                `flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-black transition ${
                  isActive ? 'bg-gradient-to-br from-[#ac4bff] to-[#8b5cf6] text-white missai-glow' : 'text-slate-400'
                }`
              }
              end={item.to === '/'}
              key={item.label}
              data-testid={`explore-mobile-nav-${item.to === '/' ? 'home' : item.to?.slice(1)}`}
              to={item.to ?? '/'}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>
    </main>
  )
}
