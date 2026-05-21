import { useEffect, useMemo, useState, type RefObject } from 'react'
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
  MapPin,
  Menu,
  MessageSquare,
  Music,
  Settings,
  Share2,
  Sparkles,
  UserRound,
} from 'lucide-react'
import heroImage from '../assets/hero.png'
import type { Character, ChatMessage, ChatResponse, ChatRuntimeState, WorldStateInput } from '../lib/api'
import { displayCharacterDetail, displayCharacterSummary, displayMessageContent } from '../lib/characterDisplay'
import { characterStatusLabel, characterVisibilityLabel } from '../lib/characterLabels'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'
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
  isWorldStateSaving?: boolean
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
  onSaveWorldState?: (input: WorldStateInput) => Promise<void> | void
  onSceneAction: (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => void
  onSendMessage: (message?: string) => void
  onStartNewChat: () => void
}

function usageLabel(usage: ChatUsage | null) {
  if (!usage) return 'ยังไม่มีการใช้โทเคนในรอบนี้'
  const balance = typeof usage.tokenBalance === 'number' ? ` เหลือ ${usage.tokenBalance.toLocaleString()}` : ''
  return `ใช้ ${usage.totalTokens.toLocaleString()} โทเคน${balance}`
}

function providerFailureLabel(failure?: ChatUsage['providerFailure']) {
  if (!failure) return 'ปกติ'
  const labels: Record<NonNullable<ChatUsage['providerFailure']>['code'], string> = {
    invalid_credentials: 'คีย์ผู้ให้บริการไม่พร้อม',
    provider_unavailable: 'ผู้ให้บริการล่มชั่วคราว',
    quota_exhausted: 'เครดิตผู้ให้บริการไม่พอ',
    rate_limited: 'ถูกจำกัดการเรียกใช้ชั่วคราว',
    timeout: 'ตอบช้าเกินเวลา',
    unknown: 'ผิดพลาดไม่ทราบสาเหตุ',
  }
  return `${labels[failure.code]}${failure.retryable ? ' · ลองใหม่ได้' : ' · ต้องให้ผู้ดูแลแก้'}`
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
    <section
      className="mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/34 p-4 text-white shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-5"
      data-testid="chat-character-stage"
    >
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
            <span className="mt-0.5 block truncate text-white">{relationshipStatusLabel(relationship?.status)}</span>
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
        <span className="mt-0.5 block truncate">{relationshipStatusLabel(relationship?.status)}</span>
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
  const disabledReason = disabled ? 'กำลังตอบอยู่หรือโทเคนไม่พอ จึงยังใช้คำชวนคุยไม่ได้' : ''

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border border-white/10 bg-black/24 p-2.5 text-white shadow-[0_18px_52px_rgba(0,0,0,0.24)] backdrop-blur-xl">
      <div className="grid gap-2 sm:grid-cols-3">
        {starterPrompts.map((item) => (
          <button
            className="flex min-h-12 min-w-0 items-center gap-2 rounded-lg border border-white/10 bg-white/6 px-3 text-left text-xs font-black text-white/76 transition hover:border-orange-300/35 hover:bg-orange-500/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
            aria-disabled={disabled}
            disabled={disabled}
            key={item.label}
            onClick={() => onPick(item.value)}
            title={disabledReason || item.label}
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
  chatId,
  character,
  onFavoriteCharacter,
  onOpenCharacterProfile,
  onOpenChats,
  onReportCharacter,
  onSaveWorldState,
  onStartNewChat,
  isWorldStateSaving,
  isReadMode,
  onToggleReadMode,
  runtimeState,
  usage,
}: {
  chatId: string | null
  character: Character
  onFavoriteCharacter?: (characterId: string, favorite: boolean) => Promise<void> | void
  onOpenCharacterProfile: () => void
  onOpenChats: () => void
  onReportCharacter: () => void
  onSaveWorldState?: (input: WorldStateInput) => Promise<void> | void
  onStartNewChat: () => void
  isWorldStateSaving: boolean
  isReadMode: boolean
  onToggleReadMode: () => void
  runtimeState: ChatRuntimeState | null
  usage: ChatUsage | null
}) {
  const relationship = runtimeState?.relationshipState
  const [activePanel, setActivePanel] = useState('role')
  const [isSoundOn, setIsSoundOn] = useState(false)
  const [notice, setNotice] = useState('')
  const [isFavoritePending, setIsFavoritePending] = useState(false)
  const [worldDraft, setWorldDraft] = useState({
    timeOfDay: '',
    location: '',
    weather: '',
    mood: '',
    sceneNotes: '',
  })
  const menuItems = [
    { key: 'world', label: 'สถานะโลก', icon: MapPin },
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
  const worldState = runtimeState?.memory.worldState

  useEffect(() => {
    setWorldDraft({
      timeOfDay: worldState?.timeOfDay ?? '',
      location: worldState?.location ?? '',
      weather: worldState?.weather ?? '',
      mood: worldState?.mood ?? '',
      sceneNotes: worldState?.sceneNotes?.join('\n') ?? '',
    })
  }, [worldState?.timeOfDay, worldState?.location, worldState?.weather, worldState?.mood, worldState?.sceneNotes])

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
    void safeWriteClipboardText(getSafeClipboard(), url).then((copied) => {
      showNotice(copied ? 'คัดลอกลิงก์ตัวละครแล้ว' : `คัดลอกลิงก์นี้: ${url}`)
    })
  }

  const saveWorldDraft = async () => {
    if (!onSaveWorldState || !chatId || isWorldStateSaving) return
    try {
      await onSaveWorldState({
        timeOfDay: worldDraft.timeOfDay,
        location: worldDraft.location,
        weather: worldDraft.weather,
        mood: worldDraft.mood,
        sceneNotes: worldDraft.sceneNotes
          .split('\n')
          .map((note) => note.trim())
          .filter(Boolean)
          .slice(0, 5),
      })
      showNotice('บันทึกสถานะโลกแล้ว')
    } catch {
      showNotice('บันทึกสถานะโลกไม่สำเร็จ')
    }
  }

  const renderPanel = () => {
    if (activePanel === 'role') {
      return (
        <>
          <p className="m-0 text-sm leading-6 text-white/70">{displayCharacterDetail(character)}</p>
          <InfoLine label="สถานะเผยแพร่" value={characterStatusLabel(character.status, 'ดราฟต์')} />
          <InfoLine label="การมองเห็น" value={characterVisibilityLabel(character.visibility, 'ส่วนตัว')} />
        </>
      )
    }
    if (activePanel === 'world') {
      return (
        <div className="space-y-3" data-testid="chat-world-state-panel">
          <p className="m-0 text-sm leading-6 text-white/65">
            ใช้ล็อกเวลา สถานที่ อากาศ และอารมณ์ฉากปัจจุบัน เพื่อให้ AI ไม่หลุดบริบทเวลาคุยยาว
          </p>
          <div className="grid gap-2">
            <label className="space-y-1 text-xs font-black text-white/55">
              <span>เวลาในเรื่อง</span>
              <input
                className="min-h-9 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm font-bold text-white outline-none focus:border-orange-300/45"
                data-testid="chat-world-state-time"
                disabled={!chatId || isWorldStateSaving}
                onChange={(event) => setWorldDraft((value) => ({ ...value, timeOfDay: event.target.value }))}
                placeholder="เช่น เที่ยงคืน, เช้าวันฝนตก"
                value={worldDraft.timeOfDay}
              />
            </label>
            <label className="space-y-1 text-xs font-black text-white/55">
              <span>สถานที่</span>
              <input
                className="min-h-9 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm font-bold text-white outline-none focus:border-orange-300/45"
                data-testid="chat-world-state-location"
                disabled={!chatId || isWorldStateSaving}
                onChange={(event) => setWorldDraft((value) => ({ ...value, location: event.target.value }))}
                placeholder="เช่น ห้องสมุดชั้นสอง"
                value={worldDraft.location}
              />
            </label>
            <label className="space-y-1 text-xs font-black text-white/55">
              <span>สภาพอากาศ</span>
              <input
                className="min-h-9 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm font-bold text-white outline-none focus:border-orange-300/45"
                data-testid="chat-world-state-weather"
                disabled={!chatId || isWorldStateSaving}
                onChange={(event) => setWorldDraft((value) => ({ ...value, weather: event.target.value }))}
                placeholder="เช่น ฝนเบา ๆ, ร้อนอบอ้าว"
                value={worldDraft.weather}
              />
            </label>
            <label className="space-y-1 text-xs font-black text-white/55">
              <span>อารมณ์ฉาก</span>
              <input
                className="min-h-9 w-full rounded-lg border border-white/10 bg-black/24 px-3 text-sm font-bold text-white outline-none focus:border-orange-300/45"
                data-testid="chat-world-state-mood"
                disabled={!chatId || isWorldStateSaving}
                onChange={(event) => setWorldDraft((value) => ({ ...value, mood: event.target.value }))}
                placeholder="เช่น อึดอัดแต่นุ่มนวล"
                value={worldDraft.mood}
              />
            </label>
            <label className="space-y-1 text-xs font-black text-white/55">
              <span>โน้ตฉาก</span>
              <textarea
                className="min-h-20 w-full resize-none rounded-lg border border-white/10 bg-black/24 px-3 py-2 text-sm font-bold leading-6 text-white outline-none focus:border-orange-300/45"
                data-testid="chat-world-state-notes"
                disabled={!chatId || isWorldStateSaving}
                onChange={(event) => setWorldDraft((value) => ({ ...value, sceneNotes: event.target.value }))}
                placeholder="หนึ่งบรรทัดต่อหนึ่งโน้ต สูงสุด 5 รายการ"
                value={worldDraft.sceneNotes}
              />
            </label>
          </div>
          <button
            className="min-h-9 w-full rounded-lg bg-white px-3 text-xs font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
            data-testid="chat-world-state-save"
            disabled={!chatId || !onSaveWorldState || isWorldStateSaving}
            onClick={saveWorldDraft}
            type="button"
          >
            {chatId ? (isWorldStateSaving ? 'กำลังบันทึก...' : 'บันทึกสถานะโลก') : 'เริ่มแชทก่อนบันทึก'}
          </button>
        </div>
      )
    }
    if (activePanel === 'scene') {
      return (
        <>
          <InfoLine label="ฉากปัจจุบัน" value={activeScene?.title ?? compactSceneLabel(runtimeState)} />
          <p className="m-0 text-sm leading-6 text-white/65">
            {activeScene?.objective || character.scenario || 'ยังไม่มีฉากพิเศษ กดคุยต่อเพื่อให้ระบบความสัมพันธ์สร้างจังหวะของเรื่อง'}
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
            {character.characterAnchor || character.compactPrompt || character.description || 'ยังไม่ได้ตั้งแกนตัวละคร'}
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
          <p className="m-0 text-xs leading-5 text-white/45">ชุดอีโมจินี้ใช้เป็นสัญญาณภาพก่อนต่อระบบแสดงบุคลิกจริง</p>
        </>
      )
    }
    if (activePanel === 'media') {
      return (
        <>
          <InfoLine label="รูปหลัก" value={character.avatarUrl ? 'มีรูปตัวละครแล้ว' : 'ยังไม่มีรูป อัปโหลดได้ที่หน้าสร้างตัวละคร'} />
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
            โหมดอ่านจะบีบพื้นที่ข้อความให้แคบลง ลดสิ่งรบกวน และทำให้ฉากยาวอ่านต่อเนื่องขึ้น
          </p>
          <button className="min-h-9 rounded-lg bg-white px-3 text-xs font-black text-slate-950" onClick={onToggleReadMode} type="button">
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
        <InfoLine label="คลังความรู้ที่ดึงมาใช้" value={String(usage?.contextLoreCount ?? 0)} />
        <InfoLine
          label="งบพรอมป์"
          value={
            usage?.promptBudget
              ? `${usage.promptBudget.estimatedTokens.toLocaleString()} / ${usage.promptBudget.maxTokens.toLocaleString()}`
              : 'ยังไม่มีข้อมูล'
          }
        />
        <InfoLine
          label="ประวัติที่ตัดออก"
          value={usage?.promptBudget ? usage.promptBudget.historyMessagesDropped.toLocaleString() : '0'}
        />
        <InfoLine label="สถานะผู้ให้บริการ" value={providerFailureLabel(usage?.providerFailure)} />
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
          <span className="text-sm font-black">{relationshipStatusLabel(relationship?.status)}</span>
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
        <div className="mb-3 space-y-3 rounded-xl border border-white/10 bg-white/6 p-3">
          <p className="m-0 text-xs font-black text-white/45">
            {menuItems.find((item) => item.key === activePanel)?.label ?? 'รายละเอียด'}
          </p>
          {renderPanel()}
        </div>
        {menuItems.map(({ key, label, icon: Icon }) => (
          <button
            className={`flex min-h-10 w-full items-center justify-between border-b border-white/6 text-left text-sm font-bold transition hover:text-white ${
              activePanel === key ? 'text-white' : 'text-white/72'
            }`}
            data-testid={`chat-right-panel-${key}`}
            key={key}
            onClick={() => setActivePanel(key)}
            type="button"
          >
            <span className="flex items-center gap-2">
              <Icon size={16} />
              {label}
              {key === 'read' && isReadMode && (
                <span className="rounded-full bg-orange-400/16 px-1.5 py-0.5 text-[10px] font-black text-orange-100">
                  เปิด
                </span>
              )}
            </span>
            <ChevronRight className="text-white/35" size={15} />
          </button>
        ))}

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
  isWorldStateSaving = false,
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
  onSaveWorldState,
  onSceneAction,
  onSendMessage,
  onStartNewChat,
}: ChatPanelProps) {
  const backdropUrl = character.avatarUrl || heroImage
  const hasAvatarBackdrop = Boolean(character.avatarUrl)
  const isSceneMode = runtimeState?.sceneState.mode === 'scene'
  const [isReadMode, setIsReadMode] = useState(false)
  const isLowToken = !isWalletLoading && tokenBalance <= 250
  const isOutOfTokens = !isWalletLoading && tokenBalance <= 0
  const visibleMessages = useMemo(
    () =>
      chatLog
        .filter((chat) => chat.role !== 'system')
        .map((chat) => ({ ...chat, content: displayMessageContent(chat.content) })),
    [chatLog],
  )
  const hasUserTurn = visibleMessages.some((chat) => chat.role === 'user')
  const showIntro = !hasUserTurn && visibleMessages.length <= 2
  const readingWidthClass = isReadMode ? 'max-w-[700px]' : 'max-w-[820px]'

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
                {relationshipStatusLabel(runtimeState?.relationshipState.status)}
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
          <button
            type="button"
            aria-label={isReadMode ? 'ปิดโหมดอ่าน' : 'เปิดโหมดอ่าน'}
            aria-pressed={isReadMode}
            className={`grid size-9 place-items-center rounded-lg transition ${
              isReadMode ? 'bg-orange-500/18 text-orange-100' : 'text-white/55 hover:bg-white/8 hover:text-white'
            }`}
            data-testid="chat-read-mode"
            onClick={() => setIsReadMode((value) => !value)}
            title={isReadMode ? 'ปิดโหมดอ่าน' : 'เปิดโหมดอ่าน'}
          >
            <BookOpen size={18} />
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
          <div className={`mx-auto flex min-h-full ${readingWidthClass} flex-col gap-5 transition-[max-width] duration-300 ${showIntro ? 'justify-center pb-14' : 'justify-end'}`}>
            {!isReadMode && (
              <MobileQuickActions
                onOpenCharacterProfile={onOpenCharacterProfile}
                onOpenChats={onOpenChats}
                onOpenWallet={onOpenWallet}
                runtimeState={runtimeState}
                tokenBalance={tokenBalance}
              />
            )}
            {isReadMode && (
              <div className="rounded-xl border border-orange-300/20 bg-orange-400/10 px-3 py-2 text-xs font-black text-orange-100 shadow-[0_18px_46px_rgba(0,0,0,0.22)] backdrop-blur-xl">
                โหมดอ่านเปิดอยู่ พื้นที่ข้อความถูกบีบให้พอดีสายตา
              </div>
            )}
            {showIntro && !isReadMode && <CharacterStage character={character} chatId={chatId} runtimeState={runtimeState} />}
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
              className={`mx-auto mb-2 flex w-[calc(100%-1.5rem)] ${readingWidthClass} items-center justify-between gap-3 rounded-xl border px-3 py-2 text-xs font-black transition-[max-width] duration-300 sm:w-[calc(100%-3rem)] ${
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
          <div className={`mx-auto ${readingWidthClass} transition-[max-width] duration-300`}>
            <Composer
              canSubmit={!isOutOfTokens}
              disabled={isLoading}
              message={message}
              onMessageChange={onMessageChange}
              onSubmit={() => onSendMessage()}
              sendDisabledReason="โทเคนหมดแล้ว เติมก่อนส่งข้อความ"
            />
          </div>
          <p className="m-0 pb-2 text-center text-[11px] font-bold text-white/30">อย่าลืม: ทุกสิ่งที่ตัวละครพูดเป็นการแต่งเรื่อง</p>
        </div>
      </div>

      <RightRail
        chatId={chatId}
        character={character}
        isWorldStateSaving={isWorldStateSaving}
        onFavoriteCharacter={onFavoriteCharacter}
        onOpenCharacterProfile={onOpenCharacterProfile}
        onOpenChats={onOpenChats}
        onReportCharacter={onReportCharacter}
        onSaveWorldState={onSaveWorldState}
        onStartNewChat={onStartNewChat}
        isReadMode={isReadMode}
        onToggleReadMode={() => setIsReadMode((value) => !value)}
        runtimeState={runtimeState}
        usage={lastUsage}
      />
    </section>
  )
}
