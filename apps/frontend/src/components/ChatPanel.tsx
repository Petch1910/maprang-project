import { useMemo, useState, type RefObject } from 'react'
import {
  Archive,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  Coins,
  Flag,
  Heart,
  Image,
  Menu,
  MessageSquare,
  Music,
  Settings,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import heroImage from '../assets/hero.png'
import type { Character, ChatMessage, ChatResponse, ChatRuntimeState } from '../lib/api'
import { displayCharacterDetail, displayCharacterSummary, displayMessageContent } from '../lib/characterDisplay'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'

type ChatUsage = NonNullable<ChatResponse['usage']>

type ChatPanelProps = {
  character: Character
  chatEndRef: RefObject<HTMLDivElement | null>
  chatId: string | null
  chatLog: ChatMessage[]
  isLoading: boolean
  isWalletLoading?: boolean
  lastUsage: ChatUsage | null
  tokenBalance: number
  runtimeState: ChatRuntimeState | null
  message: string
  onMessageChange: (message: string) => void
  onOpenMenu: () => void
  onFavoriteCharacter?: (characterId: string, favorite: boolean) => Promise<void> | void
  onOpenCharacterProfile: () => void
  onOpenChats: () => void
  onOpenWallet: () => void
  onReportCharacter: () => void
  onReportMessage?: (chat: ChatMessage) => void
  onSceneAction: (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => void
  onSendMessage: (message?: string) => void
  onStartNewChat: () => void
}

function relationshipLabel(status?: string) {
  const labels: Record<string, string> = {
    RIVAL: 'คู่แข่ง',
    NEUTRAL: 'เริ่มต้น',
    CLOSE: 'ใกล้ชิด',
    TRUSTED: 'ไว้ใจ',
    ROMANTIC: 'โรแมนติก',
  }
  return status ? labels[status] ?? status.toLowerCase() : 'เริ่มต้น'
}

function relationshipTierLabel(tier?: string) {
  const labels: Record<string, string> = {
    neutral: 'โหมดอิสระ',
    cold: 'ระยะห่าง',
    warm: 'อบอุ่น',
    warming: 'อบอุ่นขึ้น',
    cooling: 'เย็นลง',
    steady: 'คงที่',
    close: 'ใกล้ชิด',
    trusted: 'ไว้ใจ',
    intimate: 'ลึกซึ้ง',
    volatile: 'ผันผวน',
  }
  return tier ? labels[tier.toLowerCase()] ?? tier : 'โหมดอิสระ'
}

function usageLabel(usage: ChatUsage | null) {
  if (!usage) return 'ยังไม่มีการใช้โทเคนในรอบนี้'
  const balance = typeof usage.tokenBalance === 'number' ? ` เหลือ ${usage.tokenBalance.toLocaleString()}` : ''
  return `ใช้ ${usage.totalTokens.toLocaleString()} โทเคน${balance}`
}

function compactSceneLabel(runtimeState: ChatRuntimeState | null) {
  const scene = runtimeState?.sceneState
  if (scene?.activeScene) return scene.activeScene.title
  if (scene?.pendingEvents?.length) return `${scene.pendingEvents.length} ฉากรออยู่`
  return 'โหมดอิสระ'
}

function characterInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || 'M'
}

function CharacterStage({
  character,
  chatId,
  runtimeState,
}: {
  character: Character
  chatId: string | null
  runtimeState: ChatRuntimeState | null
}) {
  const relationship = runtimeState?.relationshipState

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/34 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-5">
      <div className="space-y-4">
        <div className="flex min-w-0 items-center gap-4">
          {character.avatarUrl ? (
            <img
              alt=""
              className="size-16 rounded-xl object-cover ring-1 ring-white/18 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
              src={character.avatarUrl}
            />
          ) : (
            <div className="grid size-16 place-items-center rounded-xl border border-white/12 bg-linear-to-br from-indigo-500 via-violet-600 to-fuchsia-500 text-xl font-black shadow-[0_18px_50px_rgba(91,33,182,0.28)]">
              {characterInitial(character.name)}
            </div>
          )}
          <div className="min-w-0">
            <p className="m-0 flex items-center gap-2 text-[11px] font-black tracking-widest text-white/42 uppercase">
              <Sparkles size={13} />
              {chatId ? 'แชทที่บันทึกไว้' : 'เซสชันใหม่'}
            </p>
            <h2 className="m-0 mt-1 truncate text-xl font-black text-white sm:text-2xl">{character.name}</h2>
            <p className="m-0 mt-1 line-clamp-2 max-w-xl text-sm leading-6 text-white/58">{displayCharacterSummary(character)}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs font-bold text-white/62">
          <span className="rounded-lg border border-white/10 bg-white/6 px-3 py-2">
            <span className="block text-white/35">สถานะ</span>
            <span className="mt-0.5 block truncate text-white">{relationshipLabel(relationship?.status)}</span>
          </span>
          <span className="rounded-lg border border-white/10 bg-white/6 px-3 py-2">
            <span className="block text-white/35">ฉาก</span>
            <span className="mt-0.5 block truncate text-white">{compactSceneLabel(runtimeState)}</span>
          </span>
          <span className="rounded-lg border border-white/10 bg-white/6 px-3 py-2">
            <span className="block text-white/35">จังหวะ</span>
            <span className="mt-0.5 block truncate text-white">{relationshipTierLabel(relationship?.tier)}</span>
          </span>
        </div>
      </div>
    </section>
  )
}

function SceneBar({
  runtimeState,
  isLoading,
  onSceneAction,
}: {
  runtimeState: ChatRuntimeState | null
  isLoading: boolean
  onSceneAction: ChatPanelProps['onSceneAction']
}) {
  if (!runtimeState) return null
  const scene = runtimeState.sceneState
  const activeScene = scene.activeScene
  const pendingEvent = scene.pendingEvents.find((event) => event.status === 'pending') ?? scene.pendingEvents[0]

  if (activeScene) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-white/15 bg-black/45 p-3 text-white shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-black tracking-widest text-white/45 uppercase">โหมดฉาก</p>
            <h3 className="m-0 mt-1 truncate text-sm font-black">{activeScene.title}</h3>
            <p className="m-0 mt-0.5 line-clamp-1 text-xs text-white/60">{activeScene.objective}</p>
          </div>
          <div className="flex gap-2">
            <button className="min-h-8 rounded-lg bg-white px-3 text-xs font-black text-slate-950" disabled={isLoading} onClick={() => onSceneAction('accept')} type="button">
              รับผล
            </button>
            <button className="min-h-8 rounded-lg bg-white/10 px-3 text-xs font-black text-white" disabled={isLoading} onClick={() => onSceneAction('resolve')} type="button">
              จบฉาก
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!pendingEvent) return null
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-amber-300/30 bg-amber-300/12 p-3 text-amber-50 shadow-lg backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-black tracking-widest text-amber-100/70 uppercase">ฉากสำคัญพร้อมแล้ว</p>
          <h3 className="m-0 mt-1 truncate text-sm font-black">{pendingEvent.title}</h3>
          <p className="m-0 mt-0.5 line-clamp-1 text-xs text-amber-50/65">{pendingEvent.prompt}</p>
        </div>
        <div className="flex gap-2">
          <button className="min-h-8 rounded-lg bg-amber-200 px-3 text-xs font-black text-amber-950" disabled={isLoading} onClick={() => onSceneAction('enter', pendingEvent.code)} type="button">
            เข้าฉาก
          </button>
          <button className="min-h-8 rounded-lg bg-white/10 px-3 text-xs font-black text-white" disabled={isLoading} onClick={() => onSceneAction('hold', pendingEvent.code)} type="button">
            ไว้ก่อน
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileQuickActions({
  runtimeState,
  tokenBalance,
  onOpenCharacterProfile,
  onOpenChats,
  onOpenWallet,
}: {
  runtimeState: ChatRuntimeState | null
  tokenBalance: number
  onOpenCharacterProfile: () => void
  onOpenChats: () => void
  onOpenWallet: () => void
}) {
  const relationship = runtimeState?.relationshipState

  return (
    <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 lg:hidden">
      <button type="button"
        className="min-w-0 rounded-xl border border-white/10 bg-black/32 px-3 py-2 text-left text-xs font-black text-white backdrop-blur-xl"
        onClick={onOpenCharacterProfile}
      >
        <span className="block truncate text-white/42">ความสัมพันธ์</span>
        <span className="mt-0.5 block truncate">{relationshipLabel(relationship?.status)}</span>
      </button>
      <button type="button"
        className="min-w-0 rounded-xl border border-white/10 bg-black/32 px-3 py-2 text-left text-xs font-black text-white backdrop-blur-xl"
        onClick={onOpenChats}
      >
        <span className="block truncate text-white/42">ฉาก</span>
        <span className="mt-0.5 block truncate">{compactSceneLabel(runtimeState)}</span>
      </button>
      <button type="button"
        className="min-w-0 rounded-xl border border-white/10 bg-black/32 px-3 py-2 text-left text-xs font-black text-white backdrop-blur-xl"
        onClick={onOpenWallet}
      >
        <span className="flex items-center gap-1 text-white/42">
          <Coins size={13} />
          โทเคน
        </span>
        <span className="mt-0.5 block truncate">{tokenBalance.toLocaleString()}</span>
      </button>
    </div>
  )
}

const starterPrompts = [
  {
    label: 'ชวนคุยเบาๆ',
    value: 'เธอดูเงียบไปนะ... กำลังคิดอะไรอยู่เหรอ?',
    icon: MessageSquare,
  },
  {
    label: 'ให้เธอเล่าต่อ',
    value: 'เล่าต่อสิ ฉันอยากรู้ว่าคืนนี้มันเริ่มจากตรงไหน',
    icon: Heart,
  },
  {
    label: 'เปิดฉากช้าๆ',
    value: 'ฉันค่อยๆ นั่งลงตรงข้าม แล้วรอฟังว่าเธอจะพูดอะไรต่อ',
    icon: BookOpen,
  },
]

function QuickStartPrompts({
  disabled,
  onPick,
}: {
  disabled: boolean
  onPick: (message: string) => void
}) {
  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/24 p-2.5 text-white shadow-[0_18px_52px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="grid gap-2 sm:grid-cols-3">
        {starterPrompts.map((item) => (
          <button
            className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 text-left text-xs font-black text-white/76 transition hover:border-orange-300/35 hover:bg-orange-500/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            disabled={disabled}
            key={item.label}
            onClick={() => onPick(item.value)}
            type="button"
          >
            <item.icon className="flex-none text-orange-300" size={16} />
            <span className="min-w-0 truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RightRail({
  character,
  onFavoriteCharacter,
  onOpenCharacterProfile,
  onOpenChats,
  onReportCharacter,
  onStartNewChat,
  runtimeState,
  usage,
}: {
  character: Character
  onFavoriteCharacter?: (characterId: string, favorite: boolean) => Promise<void> | void
  onOpenCharacterProfile: () => void
  onOpenChats: () => void
  onReportCharacter: () => void
  onStartNewChat: () => void
  runtimeState: ChatRuntimeState | null
  usage: ChatUsage | null
}) {
  const relationship = runtimeState?.relationshipState
  const [activePanel, setActivePanel] = useState('role')
  const [isSoundOn, setIsSoundOn] = useState(false)
  const [isReadMode, setIsReadMode] = useState(false)
  const [notice, setNotice] = useState('')
  const [isFavoritePending, setIsFavoritePending] = useState(false)
  const menuItems = [
    { key: 'role', label: 'บทบาท', icon: UserRound },
    { key: 'scene', label: 'สถานการณ์', icon: BookOpen },
    { key: 'personality', label: 'นิสัยตัวละคร', icon: Archive },
    { key: 'support', label: 'ตัวละครสนับสนุน', icon: MessageSquare },
    { key: 'emoji', label: 'อีโมจิตัวละคร', icon: Heart },
    { key: 'media', label: 'รูปภาพและวิดีโอ', icon: Image },
    { key: 'read', label: 'โหมดอ่าน', icon: BookOpen },
    { key: 'avoid', label: 'คำที่ไม่ต้องการ', icon: Flag },
    { key: 'model', label: 'โมเดลของใจ', icon: Settings },
  ]
  const activeScene = runtimeState?.sceneState.activeScene
  const pendingEvents = runtimeState?.sceneState.pendingEvents?.filter((event) => event.status === 'pending') ?? []

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const toggleFavorite = async () => {
    if (!onFavoriteCharacter || isFavoritePending) return
    setIsFavoritePending(true)
    try {
      await onFavoriteCharacter(character.id, !character.isFavorite)
      showNotice(character.isFavorite ? 'นำออกจากรายการโปรดแล้ว' : 'เพิ่มในรายการโปรดแล้ว')
    } catch {
      showNotice('บันทึกรายการโปรดไม่สำเร็จ')
    } finally {
      setIsFavoritePending(false)
    }
  }

  const shareCharacter = () => {
    const url = `${window.location.origin}/characters/${character.id}`
    showNotice('คัดลอกลิงก์ตัวละครแล้ว')
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(url).catch(() => undefined)
    }
  }

  const renderPanel = () => {
    if (activePanel === 'role') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/70">{displayCharacterDetail(character)}</p>
          <InfoLine label="สถานะเผยแพร่" value={character.status ?? 'DRAFT'} />
          <InfoLine label="การมองเห็น" value={character.visibility ?? 'PRIVATE'} />
        </>
      )
    }
    if (activePanel === 'scene') {
      return (
        <>
          <InfoLine label="ฉากปัจจุบัน" value={activeScene?.title ?? compactSceneLabel(runtimeState)} />
          <p className="m-0 text-sm leading-6 text-white/65">
            {activeScene?.objective || character.scenario || 'ยังไม่มีฉากพิเศษ กดคุยต่อเพื่อให้ระบบ relationship สร้างจังหวะของเรื่อง'}
          </p>
          {pendingEvents.length > 0 && (
            <p className="m-0 rounded-lg bg-amber-300/10 p-2 text-xs font-bold text-amber-100">
              มีฉากรออยู่ {pendingEvents.length} ฉาก
            </p>
          )}
        </>
      )
    }
    if (activePanel === 'personality') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/70">
            {character.characterAnchor || character.compactPrompt || character.description || 'ยังไม่ได้ตั้ง anchor ตัวละคร'}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {character.tags.map((tag) => (
              <span className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-white/65" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </>
      )
    }
    if (activePanel === 'support') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/65">
            ห้องนี้ยังเป็นแชท 1 ต่อ 1 อยู่ ถ้าต้องการสลับไปดูแชทอื่นหรือกลับมาเล่นฉากค้างไว้ ให้เปิดหน้ารวมแชทได้จากปุ่มด้านล่าง
          </p>
          <button type="button" className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-slate-950" onClick={onOpenChats}>
            ไปหน้ารวมแชท
          </button>
        </>
      )
    }
    if (activePanel === 'emoji') {
      return (
        <>
          <div className="grid grid-cols-4 gap-2 text-center text-2xl">
            {['🙂', '😳', '✨', '💬', '🔥', '🫧', '🌙', '🎧'].map((emoji) => (
              <span className="rounded-lg bg-white/8 py-2" key={emoji}>{emoji}</span>
            ))}
          </div>
          <p className="m-0 text-xs leading-5 text-white/45">ชุดอีโมจินี้ใช้เป็น visual cue ก่อนต่อระบบ persona expression จริง</p>
        </>
      )
    }
    if (activePanel === 'media') {
      return (
        <>
          <InfoLine label="รูปหลัก" value={character.avatarUrl ? 'มีรูปตัวละครแล้ว' : 'ยังไม่มีรูป อัปโหลดได้ที่ Creator Studio'} />
          <InfoLine label="เพลงประกอบ" value={isSoundOn ? 'เปิดอยู่' : 'ปิดอยู่'} />
          <button className="min-h-9 rounded-lg bg-white/10 px-3 text-xs font-black text-white" onClick={() => setIsSoundOn((value) => !value)} type="button">
            {isSoundOn ? 'ปิดเพลงประกอบ' : 'เปิดเพลงประกอบ'}
          </button>
        </>
      )
    }
    if (activePanel === 'read') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/65">
            โหมดอ่านจะทำให้ผู้เล่นโฟกัสเนื้อเรื่อง ลดสิ่งรบกวน และใช้กับฉากยาวได้ดี
          </p>
          <button className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-slate-950" onClick={() => setIsReadMode((value) => !value)} type="button">
            {isReadMode ? 'ปิดโหมดอ่าน' : 'เปิดโหมดอ่าน'}
          </button>
        </>
      )
    }
    if (activePanel === 'avoid') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/65">
            {character.constraints || 'ยังไม่ได้ตั้งคำหรือเงื่อนไขที่ไม่ต้องการสำหรับตัวละครนี้'}
          </p>
          <button type="button" className="min-h-9 rounded-lg bg-white/10 px-3 text-xs font-black text-white" onClick={onOpenCharacterProfile}>
            เปิดโปรไฟล์เพื่อดูรายละเอียด
          </button>
        </>
      )
    }
    return (
      <>
        <InfoLine label="โมเดลล่าสุด" value={usage?.modelName ?? 'ยังไม่มีรอบแชทล่าสุด'} />
        <InfoLine label="โทเคนรอบล่าสุด" value={usage ? usage.totalTokens.toLocaleString() : '0'} />
        <InfoLine label="Lore ที่ดึงมาใช้" value={String(usage?.contextLoreCount ?? 0)} />
      </>
    )
  }

  return (
    <aside className="hidden h-svh min-h-0 overflow-hidden border-l border-white/8 bg-[#111114]/96 p-4 text-white shadow-[inset_1px_0_0_rgba(255,255,255,0.03)] lg:flex lg:flex-col">
      <div className="flex items-start gap-3">
        {character.avatarUrl ? (
          <img alt="" className="size-12 rounded-xl object-cover ring-1 ring-white/12" src={character.avatarUrl} />
        ) : (
          <div className="grid size-12 place-items-center rounded-xl border border-white/10 bg-linear-to-br from-indigo-500 via-violet-600 to-fuchsia-500 text-sm font-black">
            {characterInitial(character.name)}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="m-0 truncate text-sm font-black">{character.name}</h2>
          <p className="m-0 mt-1 truncate text-xs font-bold text-white/55">ผู้สร้าง @Maprang</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/55">{displayCharacterSummary(character)}</p>

      <button
        className={`mt-4 min-h-9 rounded-lg border border-white/10 text-sm font-black text-white transition ${
          isSoundOn ? 'bg-emerald-500/20 text-emerald-100' : 'bg-white/6 hover:bg-white/10'
        }`}
        onClick={() => {
          setIsSoundOn((value) => !value)
          setActivePanel('media')
        }}
        type="button"
      >
        <Music className="mr-2 inline" size={16} />
        {isSoundOn ? 'เพลงประกอบเปิดอยู่' : 'เพลงประกอบ'}
      </button>

      <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px] font-bold text-white/50">
        <button type="button"
          className={`grid min-h-12 place-items-center rounded-lg transition hover:bg-white/7 hover:text-white ${
            character.isFavorite ? 'text-rose-200' : ''
          }`}
          disabled={isFavoritePending}
          onClick={toggleFavorite}
        >
          <Heart fill={character.isFavorite ? 'currentColor' : 'none'} size={17} />
          <span>ไลก์</span>
        </button>
        <button type="button" className="grid min-h-12 place-items-center rounded-lg transition hover:bg-white/7 hover:text-white" onClick={onOpenCharacterProfile}>
          <UserRound size={17} />
          <span>โปรไฟล์</span>
        </button>
        <button type="button" className="grid min-h-12 place-items-center rounded-lg transition hover:bg-white/7 hover:text-white" onClick={shareCharacter}>
          <Share2 size={17} />
          <span>แชร์</span>
        </button>
        <button type="button" className="grid min-h-12 place-items-center rounded-lg transition hover:bg-white/7 hover:text-white" onClick={onReportCharacter}>
          <Flag size={17} />
          <span>แจ้ง</span>
        </button>
        <button type="button" className="grid min-h-12 place-items-center rounded-lg transition hover:bg-white/7 hover:text-white" onClick={onOpenChats}>
          <MessageSquare size={17} />
          <span>แชทอื่น</span>
        </button>
      </div>
      {notice && <p className="m-0 mt-2 rounded-lg bg-white/8 px-3 py-2 text-xs font-bold text-white/72">{notice}</p>}

      <div className="mt-4 rounded-xl border border-white/10 bg-white/6 p-3">
        <p className="m-0 text-xs font-black text-white/45">ความสัมพันธ์</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-black">{relationshipLabel(relationship?.status)}</span>
          <span className="rounded-full bg-white/12 px-2 py-1 text-xs font-bold text-white/70">{relationshipTierLabel(relationship?.tier)}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/45">
        <span className="flex items-center gap-1"><Clock3 size={14} /> วันนี้</span>
        <span>{usageLabel(usage)}</span>
      </div>

      <button type="button"
        className="mt-4 min-h-10 rounded-lg bg-white text-sm font-black text-slate-950 shadow-[0_14px_34px_rgba(255,255,255,0.08)] transition hover:bg-white/90"
        onClick={onStartNewChat}
      >
        แชทใหม่
      </button>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs font-black text-white/35">ตั้งค่าตัวละคร</p>
        {menuItems.map(({ key, label, icon: Icon }) => (
          <button
            className={`flex min-h-10 w-full items-center justify-between border-b border-white/6 text-left text-sm font-bold transition hover:text-white ${
              activePanel === key ? 'text-white' : 'text-white/72'
            }`}
            key={key}
            onClick={() => setActivePanel(key)}
            type="button"
          >
            <span className="flex items-center gap-2">
              <Icon size={16} />
              {label}
            </span>
            <ChevronRight className="text-white/35" size={15} />
          </button>
        ))}

        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-white/6 p-3">
          <p className="m-0 text-xs font-black text-white/45">
            {menuItems.find((item) => item.key === activePanel)?.label ?? 'รายละเอียด'}
          </p>
          {renderPanel()}
        </div>
      </div>
    </aside>
  )
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="m-0 flex items-center justify-between gap-3 rounded-lg bg-black/18 px-2 py-1.5 text-xs">
      <span className="font-bold text-white/42">{label}</span>
      <span className="truncate text-right font-black text-white/72">{value}</span>
    </p>
  )
}

export function ChatPanel({
  character,
  chatEndRef,
  chatId,
  chatLog,
  isLoading,
  isWalletLoading = false,
  lastUsage,
  tokenBalance,
  runtimeState,
  message,
  onMessageChange,
  onFavoriteCharacter,
  onOpenCharacterProfile,
  onOpenChats,
  onOpenWallet,
  onOpenMenu,
  onReportCharacter,
  onReportMessage,
  onSceneAction,
  onSendMessage,
  onStartNewChat,
}: ChatPanelProps) {
  const backdropUrl = character.avatarUrl || heroImage
  const hasAvatarBackdrop = Boolean(character.avatarUrl)
  const isSceneMode = runtimeState?.sceneState.mode === 'scene'
  const isLowToken = !isWalletLoading && tokenBalance <= 250
  const isOutOfTokens = !isWalletLoading && tokenBalance <= 0
  const visibleMessages = useMemo(
    () =>
      chatLog
        .filter((chat) => chat.role !== 'system')
        .map((chat) => ({ ...chat, content: displayMessageContent(chat.content) })),
    [chatLog],
  )
  const showIntro = visibleMessages.length <= 2

  return (
    <section className="grid h-svh min-w-0 grid-cols-1 overflow-hidden bg-[#0c0c0f] lg:grid-cols-[minmax(0,1fr)_300px]">
      <div
        className={`relative grid min-h-0 grid-rows-[64px_1fr_auto] overflow-hidden transition duration-300 ${isSceneMode ? 'shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.22)]' : ''}`}
        style={{
          backgroundImage: hasAvatarBackdrop
            ? `linear-gradient(90deg,rgba(7,7,9,0.88),rgba(7,7,9,0.38) 48%,rgba(7,7,9,0.84)), linear-gradient(180deg,rgba(0,0,0,0.36),rgba(0,0,0,0.82)), url(${backdropUrl})`
            : `radial-gradient(circle at 50% 8%,rgba(129,92,246,0.26),transparent 30%), radial-gradient(circle at 12% 78%,rgba(244,114,182,0.18),transparent 28%), linear-gradient(135deg,rgba(16,16,20,0.86),rgba(6,6,9,0.96)), url(${backdropUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <div className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_18%,transparent_72%,rgba(0,0,0,0.42))]" />
        <div className="pointer-events-none absolute inset-x-10 top-20 z-0 h-px bg-linear-to-r from-transparent via-white/14 to-transparent" />

        <header className="relative z-20 flex items-center gap-3 border-b border-white/8 bg-black/28 px-4 backdrop-blur-2xl">
          <button type="button"
            aria-label="เปิดเมนูแชท"
            className="grid size-10 place-items-center rounded-lg border border-white/10 bg-black/35 text-white md:hidden"
            data-testid="chat-mobile-menu"
            onClick={onOpenMenu}
            title="เปิดเมนู"
          >
            <Menu size={19} />
          </button>
          {character.avatarUrl ? (
            <img alt="" className="size-10 rounded-xl object-cover ring-1 ring-white/20" src={character.avatarUrl} />
          ) : (
            <div className="grid size-10 place-items-center rounded-xl border border-white/12 bg-linear-to-br from-indigo-500 via-violet-600 to-fuchsia-500 text-sm font-black">
              {characterInitial(character.name)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="m-0 truncate text-sm font-black text-white">{character.name}</h1>
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-black text-white/70">
                {relationshipLabel(runtimeState?.relationshipState.status)}
              </span>
            </div>
            <p className="m-0 mt-0.5 truncate text-xs text-white/45">
              {chatId ? 'แชทที่บันทึกไว้' : 'แชทใหม่'} · {compactSceneLabel(runtimeState)}
            </p>
          </div>
          <button type="button"
            aria-label="เริ่มแชทใหม่"
            className="grid size-9 place-items-center rounded-lg text-white/55 hover:bg-white/8 hover:text-white"
            data-testid="chat-start-new"
            onClick={onStartNewChat}
            title="แชทใหม่"
          >
            <MessageSquare size={18} />
          </button>
          <button type="button"
            aria-label="รายงานตัวละคร"
            className="grid size-9 place-items-center rounded-lg text-white/55 hover:bg-white/8 hover:text-white"
            data-testid="chat-report-character"
            onClick={onReportCharacter}
            title="รายงานตัวละคร"
          >
            <Flag size={18} />
          </button>
          <button type="button"
            aria-label="เปิดโปรไฟล์ตัวละคร"
            className="grid size-9 place-items-center rounded-lg text-white/55 hover:bg-white/8 hover:text-white"
            data-testid="chat-open-character"
            onClick={onOpenCharacterProfile}
            title="เปิดโปรไฟล์ตัวละคร"
          >
            <UserRound size={18} />
          </button>
        </header>

        <div className="relative z-10 min-h-0 overflow-y-auto px-3 pb-6 pt-5 sm:px-6">
          <div className={`mx-auto flex min-h-full max-w-[820px] flex-col gap-5 ${showIntro ? 'justify-center pb-14' : 'justify-end'}`}>
            <MobileQuickActions
              onOpenCharacterProfile={onOpenCharacterProfile}
              onOpenChats={onOpenChats}
              onOpenWallet={onOpenWallet}
              runtimeState={runtimeState}
              tokenBalance={tokenBalance}
            />
            {showIntro && <CharacterStage character={character} chatId={chatId} runtimeState={runtimeState} />}
            <SceneBar isLoading={isLoading} onSceneAction={onSceneAction} runtimeState={runtimeState} />

            <div className="flex flex-col gap-3.5">
              {visibleMessages.map((chat) => (
                <MessageBubble
                  assistantAvatarUrl={character.avatarUrl}
                  assistantName={character.name}
                  chat={chat}
                  isReporting={isLoading}
                  key={chat.id}
                  onReport={onReportMessage}
                />
              ))}
              {isLoading && visibleMessages.at(-1)?.role !== 'assistant' && (
                <p className="self-start rounded-xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/55 backdrop-blur-md">
                  กำลังพิมพ์...
                </p>
              )}
            </div>
            {showIntro && (
              <QuickStartPrompts disabled={isLoading || isOutOfTokens} onPick={(value) => onSendMessage(value)} />
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="relative z-20 border-t border-white/8 bg-black/36 pt-3 backdrop-blur-2xl">
          <button
            className="absolute right-5 top-[-50px] grid size-10 place-items-center rounded-full bg-white text-slate-950 shadow-lg"
            onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
            title="เลื่อนลงล่างสุด"
            type="button"
          >
            <ChevronDown size={20} />
          </button>
          {isLowToken && (
            <div
              className={`mx-auto mb-2 flex w-[calc(100%-1.5rem)] max-w-[820px] items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-black sm:w-[calc(100%-3rem)] ${
                isOutOfTokens
                  ? 'border-rose-300/30 bg-rose-500/14 text-rose-100'
                  : 'border-amber-300/30 bg-amber-400/12 text-amber-100'
              }`}
            >
              <span>
                {isOutOfTokens
                  ? 'โทเคนหมดแล้ว เติมก่อนส่งข้อความเพื่อให้ AI ตอบได้'
                  : `โทเคนเหลือน้อย: ${tokenBalance.toLocaleString()} ควรเติมก่อนเล่นฉากยาว`}
              </span>
              <button type="button"
                className="min-h-8 rounded-lg bg-white px-3 text-[11px] font-black text-slate-950"
                onClick={onOpenWallet}
              >
                เติมโทเคน
              </button>
            </div>
          )}
          <Composer
            canSubmit={!isOutOfTokens}
            disabled={isLoading}
            message={message}
            onMessageChange={onMessageChange}
            onSubmit={() => onSendMessage()}
            sendDisabledReason="โทเคนหมดแล้ว เติมก่อนส่งข้อความ"
          />
          <p className="m-0 pb-2 text-center text-[11px] font-bold text-white/30">อย่าลืม: ทุกสิ่งที่ตัวละครพูดเป็นการแต่งเรื่อง</p>
        </div>
      </div>

      <RightRail
        character={character}
        onFavoriteCharacter={onFavoriteCharacter}
        onOpenCharacterProfile={onOpenCharacterProfile}
        onOpenChats={onOpenChats}
        onReportCharacter={onReportCharacter}
        onStartNewChat={onStartNewChat}
        runtimeState={runtimeState}
        usage={lastUsage}
      />
    </section>
  )
}
