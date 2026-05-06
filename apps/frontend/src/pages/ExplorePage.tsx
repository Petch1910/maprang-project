import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Coins,
  Compass,
  Dice5,
  Gamepad2,
  Globe2,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  WandSparkles,
} from 'lucide-react'
import type { Character, CharacterListFilters } from '../lib/api'
import { characterRating, canViewRating, ratingLabel } from '../lib/contentRating'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatSummaries, selectChatsLoading } from '../store/slices/chatsSlice'
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
  { label: 'Slow Burn', tag: 'slow-burn' },
  { label: 'Rival', tag: 'rival' },
]

const demoCharacters: Character[] = [
  {
    id: 'demo-lume',
    name: 'ลูเม [Lume]',
    avatarUrl: null,
    tagline: 'นักเล่าเรื่องโทนอุ่นที่เหมาะกับ slow burn และความสัมพันธ์ค่อย ๆ เปิดใจ',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'อยากเริ่มฉากแบบไหนกับฉันดี?',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 82,
    promptVersion: 1,
    tags: ['slow-burn', 'romance'],
    chatCount: 17300,
    viewCount: 42000,
    contentRating: 'teen_romance',
  },
  {
    id: 'demo-rival',
    name: 'ไค | Rival',
    avatarUrl: null,
    tagline: 'คู่แข่งปากร้ายที่ความสัมพันธ์เปลี่ยนตามการตอบโต้ของผู้เล่น',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'กล้าพอจะคุยกับฉันไหม?',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 85,
    promptVersion: 1,
    tags: ['rival', 'red-flag'],
    chatCount: 24200,
    viewCount: 68000,
    contentRating: 'mature_18',
  },
  {
    id: 'demo-orion',
    name: 'Orion',
    avatarUrl: null,
    tagline: 'แฟนตาซีเมืองฝนกับอีเวนต์ฉากที่ค่อย ๆ ปลดล็อกตามความไว้ใจ',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'คืนนี้เมืองดูแปลกไปนะ',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 80,
    promptVersion: 1,
    tags: ['fantasy', 'scene'],
    chatCount: 44100,
    viewCount: 98000,
    contentRating: 'teen_romance',
  },
  {
    id: 'demo-sora',
    name: 'Sora',
    avatarUrl: null,
    tagline: 'เพื่อนร่วมงานที่เริ่มจากเรื่องธรรมดา แล้วค่อย ๆ ลึกขึ้นตามบทสนทนา',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'วันนี้เหนื่อยไหม เล่าให้ฟังได้นะ',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 88,
    promptVersion: 1,
    tags: ['slice-of-life', 'mentor'],
    chatCount: 70300,
    viewCount: 128000,
    contentRating: 'general',
  },
  {
    id: 'demo-noah',
    name: 'Noah',
    avatarUrl: null,
    tagline: 'โทนดราม่าจัด ชอบซ่อนความจริง และมีฉากสำคัญให้เลือกเข้าหรือเก็บไว้ก่อน',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'อย่าถาม ถ้ายังไม่พร้อมฟังคำตอบ',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 84,
    promptVersion: 1,
    tags: ['drama', 'slow-burn'],
    chatCount: 195500,
    viewCount: 260000,
    contentRating: 'teen_romance',
  },
  {
    id: 'demo-mira',
    name: 'Mira',
    avatarUrl: null,
    tagline: 'ตัวละครแนวอบอุ่นสำหรับผู้เล่นที่อยากได้ความสัมพันธ์สบาย ๆ แต่มีชั้นเชิง',
    description: 'ตัวอย่างการ์ดสำหรับดู layout ระหว่างรอครีเอเตอร์ลงตัวละครจริง',
    biography: null,
    scenario: null,
    systemPrompt: '',
    compactPrompt: null,
    characterAnchor: null,
    constraints: null,
    greeting: 'มาเริ่มจากเรื่องเล็ก ๆ ก่อนก็ได้',
    status: 'PUBLISHED',
    visibility: 'PUBLIC',
    qualityScore: 86,
    promptVersion: 1,
    tags: ['romance', 'trust-building'],
    chatCount: 47900,
    viewCount: 83000,
    contentRating: 'teen_romance',
  },
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

function getBadges(character: Character) {
  const badges = new Set<string>()
  if (character.tags.some((tag) => ['slow-burn', 'trust-building', 'mentor'].includes(tag))) badges.add('relationship')
  if (character.tags.some((tag) => ['rival', 'hostile', 'red-flag', 'slow-burn'].includes(tag))) badges.add('scene')
  if (character.contentRating && character.contentRating !== 'general') badges.add(ratingLabel(character.contentRating))
  if (badges.size === 0) badges.add('original')
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
  chats: ReturnType<typeof selectChatSummaries>
  isChatsLoading: boolean
}) {
  return (
    <aside className="hidden h-svh min-h-0 w-[246px] flex-col border-r border-white/10 bg-[#151518] p-2.5 text-white md:flex">
      <div className="flex items-center gap-2 px-1 pb-2">
        <span className="grid size-8 place-items-center rounded-lg bg-[#ff6a1a] text-lg font-black">M</span>
        <span className="text-lg font-black tracking-wide">MAPRANG</span>
      </div>

      <Link className="flex min-h-9 items-center justify-center gap-2 rounded-md bg-white/10 text-sm font-black hover:bg-white/14" to="/">
        <Compass size={16} />
        ไปหน้าหลัก
      </Link>
      <Link className="mt-2 flex min-h-9 items-center justify-center gap-2 rounded-md bg-white text-sm font-black text-slate-950 hover:bg-white/90" to="/create">
        <Plus size={16} />
        สร้างตัวละคร
      </Link>

      <div className="mt-4 flex items-center justify-between border-b border-white/10 pb-2">
        <button className="relative text-sm font-black after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-white" type="button">
          แชทส่วนตัว
        </button>
        <button className="text-sm font-black text-white/55" type="button">จักรวาล [ทดลอง]</button>
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_36px] gap-2">
        <label className="flex min-h-10 items-center gap-2 rounded-full bg-white/6 px-3 text-white/45">
          <Search size={16} />
          <span className="truncate text-sm">ค้นหาแชท</span>
        </label>
        <button className="grid size-10 place-items-center rounded-full bg-white/6 text-white/60 hover:bg-white/10" type="button">
          <Trash2 size={16} />
        </button>
      </div>

      <section className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 text-xs font-black text-amber-300">ปักหมุด</p>
        <div className="space-y-1">
          {characters.slice(0, 5).map((character) => (
            <Link
              className="grid min-h-10 grid-cols-[32px_minmax(0,1fr)_22px] items-center gap-2 rounded-md px-1.5 hover:bg-white/6"
              key={character.id}
              to={`/characters/${character.id}`}
            >
              <SidebarAvatar character={character} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black">{character.name}</span>
                <span className="block truncate text-[11px] text-white/42">{character.tagline || 'พร้อมเริ่มแชท'}</span>
              </span>
              <MoreHorizontal className="text-white/40" size={16} />
            </Link>
          ))}
        </div>

        <p className="mb-2 mt-4 text-xs font-black text-white/28">วันนี้</p>
        <div className="space-y-1">
          {isChatsLoading && <p className="rounded-md bg-white/5 p-3 text-xs text-white/45">กำลังโหลด...</p>}
          {!isChatsLoading && chats.length === 0 && <p className="rounded-md border border-white/8 bg-white/5 p-3 text-xs text-white/45">ยังไม่มีแชทที่บันทึกไว้</p>}
          {!isChatsLoading &&
            chats.slice(0, 8).map((chat) => (
              <Link className="block rounded-md px-2 py-2 hover:bg-white/6" key={chat.id} to={`/chat/${chat.id}`}>
                <span className="block truncate text-sm font-black">{chat.title || chat.characterName}</span>
                <span className="block truncate text-[11px] text-white/42">{chat.preview || 'กลับไปเล่นต่อ'}</span>
              </Link>
            ))}
        </div>
      </section>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-white/45">
        <button className="grid size-8 place-items-center rounded-md hover:bg-white/8" title="Discord" type="button">
          <Gamepad2 size={16} />
        </button>
        <button className="grid size-8 place-items-center rounded-md hover:bg-white/8" title="ชุมชน" type="button">
          <Globe2 size={16} />
        </button>
        <button className="grid size-8 place-items-center rounded-md hover:bg-white/8" title="ฟีเจอร์เด่น" type="button">
          <Sparkles size={16} />
        </button>
        <button className="ml-auto grid size-8 place-items-center rounded-md hover:bg-white/8" title="ตั้งค่า" type="button">
          <Settings size={16} />
        </button>
      </div>
      <p className="m-0 truncate text-[11px] text-white/35">ข้อกำหนด & ความเป็นส่วนตัว</p>
    </aside>
  )
}

function CharacterCard({ character }: { character: Character }) {
  const badges = getBadges(character)
  const isDemo = character.id.startsWith('demo-')
  return (
    <Link className="group block w-[132px] flex-none text-white sm:w-[148px]" to={isDemo ? '/create' : `/characters/${character.id}`}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-[#26262a] ring-1 ring-white/8">
        {character.avatarUrl ? (
          <img alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={character.avatarUrl} />
        ) : (
          <div className="grid h-full place-items-center bg-linear-to-br from-[#303038] via-[#1d1d22] to-[#4a2f1f] text-4xl font-black text-white/60">
            {avatarFallback(character.name)}
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-1.5">
          <span className="rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-black text-white">only on Maprang</span>
          <span className="grid size-5 place-items-center rounded-full bg-[#ff6a1a] text-[11px] font-black">↗</span>
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 to-transparent p-2">
          <div className="flex items-center justify-end gap-1 text-[11px] font-black text-white">
            <span>◌</span>
            <span>{displayNumber(character.chatCount || character.viewCount)}</span>
          </div>
        </div>
      </div>
      <h3 className="mt-2 truncate text-sm font-black leading-5">{character.name}</h3>
      <p className="mt-0.5 line-clamp-2 min-h-9 text-xs leading-[1.15rem] text-white/68">
        {character.tagline || character.description || 'เริ่มเรื่องใหม่กับตัวละครนี้'}
      </p>
      <div className="mt-1 flex min-w-0 items-center gap-1">
        {badges.map((badge) => (
          <span className="truncate rounded bg-white/8 px-1.5 py-0.5 text-[10px] font-black text-white/70" key={badge}>
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
  if (!isLoading && characters.length === 0) return null

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="m-0 flex items-center gap-2 text-xl font-black">
          <span>{icon}</span>
          <span>{title}</span>
        </h2>
        <Link className="text-sm font-black text-white/45 hover:text-white" to="/chats">ดูทั้งหมด</Link>
      </div>
      <div className="relative">
        <button className="absolute -left-2 top-[72px] z-10 hidden size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md lg:grid" type="button">
          <ChevronLeft size={20} />
        </button>
        <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
          {isLoading &&
            Array.from({ length: 10 }).map((_, index) => (
              <div className="h-[250px] w-[132px] flex-none animate-pulse rounded-md bg-white/8 sm:w-[148px]" key={index} />
            ))}
          {!isLoading && characters.map((character) => <CharacterCard character={character} key={character.id} />)}
        </div>
        <button className="absolute -right-2 top-[72px] z-10 hidden size-10 place-items-center rounded-full bg-black/55 text-white backdrop-blur-md lg:grid" type="button">
          <ChevronRight size={20} />
        </button>
      </div>
    </section>
  )
}

export function ExplorePage() {
  const dispatch = useAppDispatch()
  const content = useAppSelector(selectContentSettings)
  const characters = useAppSelector(selectExploreCharacters)
  const chats = useAppSelector(selectChatSummaries)
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
  const marketplaceCharacters = useMemo(() => {
    if (visibleCharacters.length >= 8) return visibleCharacters
    const visibleIds = new Set(visibleCharacters.map((character) => character.id))
    return [
      ...visibleCharacters,
      ...demoCharacters
        .filter((character) => !visibleIds.has(character.id) && canViewRating(characterRating(character), content.maxRating))
        .slice(0, 12 - visibleCharacters.length),
    ]
  }, [content.maxRating, visibleCharacters])

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

  return (
    <main className="flex min-h-svh bg-[#111113] text-white">
      <Sidebar characters={visibleCharacters} chats={chats} isChatsLoading={isChatsLoading} />

      <section className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 border-b border-white/8 bg-[#111113]/92 px-4 py-3 backdrop-blur-xl md:px-8">
          <div className="flex items-center gap-3">
            <button className="grid size-10 place-items-center rounded-md bg-white/6 text-white/55 md:hidden" type="button">
              <Compass size={18} />
            </button>
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/70" size={18} />
              <input
                className="min-h-12 w-full rounded-md border border-white/8 bg-[#242428] px-4 pr-11 text-sm font-bold text-white outline-none placeholder:text-white/38 focus:border-white/18 focus:bg-[#2a2a2f]"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="ค้นหาตัวละคร"
                value={search}
              />
            </label>
            <div className="hidden items-center gap-2 rounded-full bg-[#3a2f17] px-3 py-2 text-sm font-black text-amber-100 sm:flex">
              <Coins size={16} />
              <span>{tokenBalance.toLocaleString()} คอยน์</span>
              <Link className="ml-2 rounded-full bg-white px-4 py-1 text-xs text-slate-950" to="/wallet">เติม</Link>
            </div>
            <button className="hidden size-12 place-items-center rounded-md bg-[#ff6a1a] text-white shadow-[0_10px_26px_rgba(255,106,26,0.22)] sm:grid" type="button">
              <Dice5 size={20} />
            </button>
            <button className="hidden size-12 place-items-center rounded-md bg-[#ff6a1a] text-white shadow-[0_10px_26px_rgba(255,106,26,0.22)] sm:grid" type="button">
              <WandSparkles size={20} />
            </button>
            <button className="grid size-10 place-items-center rounded-full bg-white/8 text-white/70" type="button">
              <Bell size={18} />
            </button>
          </div>
        </header>

        <div className="space-y-9 px-4 py-7 md:px-8">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {quickFilters.map((filter) => (
              <button
                className={`min-h-9 flex-none rounded-md px-3 text-sm font-black transition ${
                  activeTag === filter.tag ? 'bg-white text-slate-950' : 'bg-white/6 text-white/58 hover:bg-white/10 hover:text-white'
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
            <h1 className="m-0 flex items-center gap-2 text-xl font-black">
              <span>✨</span>
              <span>สำหรับคุณ</span>
            </h1>
            <div className="flex gap-3">
              {tabs.map((tab) => (
                <button
                  className={`min-h-9 rounded-md px-3 text-sm font-black ${
                    sort === tab.value ? 'bg-[#242428] text-[#ff7a1a]' : 'text-white/42 hover:text-white'
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
              <div className="rounded-md border border-amber-400/20 bg-amber-300/10 p-4 text-sm font-bold text-amber-100">
                โหลดตัวละครจาก backend ไม่ได้ กรุณาเช็คการเชื่อมต่อแล้วลองใหม่
              </div>
            )}
          </section>

          <CharacterRail characters={forYou} icon="✨" isLoading={isCharactersLoading} title="สำหรับคุณ" />
          <CharacterRail characters={popular} icon="🔥" isLoading={isCharactersLoading} title="ตัวละครยอดนิยม" />
          <CharacterRail characters={fresh} icon="🆕" isLoading={isCharactersLoading} title="มาใหม่" />
        </div>
      </section>
    </main>
  )
}
