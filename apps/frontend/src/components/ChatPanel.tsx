import type { RefObject } from 'react'
import { Archive, BookOpen, CalendarDays, ChevronDown, Flag, Heart, Image, Menu, MessageSquare, Music, Settings, Share2, UserRound } from 'lucide-react'
import heroImage from '../assets/hero.png'
import type { Character, ChatMessage, ChatResponse, ChatRuntimeState } from '../lib/api'
import { Composer } from './Composer'
import { MessageBubble } from './MessageBubble'

type ChatUsage = NonNullable<ChatResponse['usage']>

type ChatPanelProps = {
  character: Character
  chatEndRef: RefObject<HTMLDivElement | null>
  chatId: string | null
  chatLog: ChatMessage[]
  isLoading: boolean
  lastUsage: ChatUsage | null
  runtimeState: ChatRuntimeState | null
  message: string
  onMessageChange: (message: string) => void
  onOpenMenu: () => void
  onReportMessage?: (chat: ChatMessage) => void
  onSceneAction: (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => void
  onSendMessage: (message?: string) => void
}

function relationshipLabel(status?: string) {
  const labels: Record<string, string> = {
    RIVAL: 'คู่แข่ง',
    NEUTRAL: 'เป็นกลาง',
    CLOSE: 'ใกล้ชิด',
    TRUSTED: 'ไว้ใจ',
    ROMANTIC: 'โรแมนติก',
  }
  return status ? labels[status] ?? status.toLowerCase() : 'เริ่มต้น'
}

function usageLabel(usage: ChatUsage | null) {
  if (!usage) return 'ยังไม่มีการใช้โทเคนในรอบนี้'
  const balance = typeof usage.tokenBalance === 'number' ? ` เหลือ ${usage.tokenBalance.toLocaleString()}` : ''
  return `ใช้ ${usage.totalTokens.toLocaleString()} โทเคน${balance}`
}

function RoleCard({ character, runtimeState }: { character: Character; runtimeState: ChatRuntimeState | null }) {
  const relationship = runtimeState?.relationshipState
  const lines = [
    ['ชื่อ', character.name],
    ['สถานะ', relationshipLabel(relationship?.status)],
    ['โทน', relationship?.tone ?? 'sandbox'],
    ['เส้นทาง', relationship?.route ?? 'general'],
    ['ฉากปัจจุบัน', runtimeState?.sceneState.activeScene?.title ?? runtimeState?.sceneState.currentScene ?? 'ยังไม่มีฉาก'],
    ['บทบาท', character.scenario || character.tagline || character.description || 'เลือกจุดเริ่มต้น แล้วเริ่มคุยเพื่อให้ระบบความสัมพันธ์ค่อยๆ เปิดฉากตามเงื่อนไข'],
  ]

  return (
    <section className="mx-auto w-full max-w-2xl rounded-md border border-white/18 bg-black/28 p-5 text-sm leading-7 text-white shadow-[0_24px_80px_rgba(0,0,0,0.34)] backdrop-blur-md">
      <h2 className="mb-3 text-base font-black">บทบาท:</h2>
      <div className="space-y-1.5">
        {lines.map(([label, value]) => (
          <p className="m-0 whitespace-pre-wrap break-words" key={label}>
            <span className="font-black">{label}: </span>
            <span>{value}</span>
          </p>
        ))}
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
      <div className="mx-auto w-full max-w-2xl rounded-md border border-white/15 bg-slate-950/72 p-4 text-white backdrop-blur-xl">
        <p className="m-0 text-xs font-black tracking-widest text-white/45 uppercase">Scene Mode</p>
        <h3 className="m-0 mt-1 font-black">{activeScene.title}</h3>
        <p className="m-0 mt-1 text-sm text-white/70">{activeScene.objective}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="min-h-9 rounded-md bg-emerald-400 px-3 text-sm font-black text-emerald-950" disabled={isLoading} onClick={() => onSceneAction('accept')} type="button">
            ยอมรับ
          </button>
          <button className="min-h-9 rounded-md bg-white/12 px-3 text-sm font-black text-white" disabled={isLoading} onClick={() => onSceneAction('resolve')} type="button">
            จบฉาก
          </button>
          <button className="min-h-9 rounded-md bg-rose-400 px-3 text-sm font-black text-rose-950" disabled={isLoading} onClick={() => onSceneAction('reject')} type="button">
            ปฏิเสธ
          </button>
        </div>
      </div>
    )
  }

  if (!pendingEvent) return null
  return (
    <div className="mx-auto w-full max-w-2xl rounded-md border border-amber-300/35 bg-amber-400/14 p-4 text-amber-50 backdrop-blur-xl">
      <p className="m-0 text-xs font-black tracking-widest uppercase">ฉากสำคัญพร้อมแล้ว</p>
      <h3 className="m-0 mt-1 font-black">{pendingEvent.title}</h3>
      <p className="m-0 mt-1 text-sm text-amber-50/75">{pendingEvent.prompt}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="min-h-9 rounded-md bg-amber-300 px-3 text-sm font-black text-amber-950" disabled={isLoading} onClick={() => onSceneAction('enter', pendingEvent.code)} type="button">
          เข้าสู่ฉาก
        </button>
        <button className="min-h-9 rounded-md bg-white/10 px-3 text-sm font-black text-white" disabled={isLoading} onClick={() => onSceneAction('hold', pendingEvent.code)} type="button">
          เก็บไว้ก่อน
        </button>
      </div>
    </div>
  )
}

function RightRail({ character, runtimeState, usage }: { character: Character; runtimeState: ChatRuntimeState | null; usage: ChatUsage | null }) {
  const relationship = runtimeState?.relationshipState
  const menuItems = [
    ['บทบาท', UserRound],
    ['สถานการณ์', BookOpen],
    ['นิสัยตัวละคร', Archive],
    ['ตัวละครสนับสนุน', MessageSquare],
    ['อีโมจิตัวละคร', Heart],
    ['รูปภาพและวิดีโอ', Image],
    ['โหมดอ่าน', BookOpen],
    ['คำที่ไม่ต้องการ', Flag],
    ['โมเดลของใจ', Settings],
  ] as const

  return (
    <aside className="hidden min-h-0 border-l border-white/10 bg-[#151518]/96 p-4 text-white lg:flex lg:flex-col">
      <div className="flex items-start gap-3">
        <img
          alt=""
          className="size-12 rounded-full object-cover ring-1 ring-white/12"
          src={character.avatarUrl || heroImage}
        />
        <div className="min-w-0">
          <h2 className="m-0 truncate text-sm font-black">{character.name}</h2>
          <p className="m-0 mt-1 truncate text-xs font-bold text-white/55">ผู้สร้าง @Maprang</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/55">
        {character.greeting || character.tagline || character.description || 'เริ่มบทสนทนา แล้วให้ระบบ relationship ค่อยๆ เปิดฉากตามอารมณ์ของเรื่อง'}
      </p>

      <button className="mt-4 min-h-9 rounded-md border border-white/10 bg-white/5 text-sm font-black text-white" type="button">
        <Music className="mr-2 inline" size={16} />
        เพลงประกอบ
      </button>

      <div className="mt-4 grid grid-cols-5 gap-1 text-center text-[11px] font-bold text-white/55">
        {[
          ['ไลก์', Heart],
          ['โปรไฟล์', UserRound],
          ['แชร์', Share2],
          ['แจ้ง', Flag],
          ['แชทอื่น', MessageSquare],
        ].map(([label, Icon]) => (
          <button className="grid min-h-12 place-items-center rounded-md hover:bg-white/6" key={label as string} type="button">
            <Icon size={17} />
            <span>{label as string}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
        <p className="m-0 text-xs font-black text-white/45">โหมดความสัมพันธ์</p>
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-black">{relationshipLabel(relationship?.status)}</span>
          <span className="rounded-full bg-white/12 px-2 py-1 text-xs font-bold text-white/70">{relationship?.tier ?? 'sandbox'}</span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-white/45">
        <span className="flex items-center gap-1"><CalendarDays size={14} /> วันนี้</span>
        <span>{usageLabel(usage)}</span>
      </div>

      <button className="mt-4 min-h-10 rounded-md bg-white/12 text-sm font-black text-white hover:bg-white/16" type="button">
        แชทใหม่
      </button>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        <p className="mb-2 text-xs font-black text-white/35">ตั้งค่าตัวละคร</p>
        {menuItems.map(([label, Icon]) => (
          <button className="flex min-h-10 w-full items-center justify-between border-b border-white/6 text-left text-sm font-bold text-white/78" key={label} type="button">
            <span className="flex items-center gap-2">
              <Icon size={16} />
              {label}
            </span>
            <ChevronDown className="-rotate-90 text-white/35" size={15} />
          </button>
        ))}
      </div>
    </aside>
  )
}

export function ChatPanel({
  character,
  chatEndRef,
  chatId,
  chatLog,
  isLoading,
  lastUsage,
  runtimeState,
  message,
  onMessageChange,
  onOpenMenu,
  onReportMessage,
  onSceneAction,
  onSendMessage,
}: ChatPanelProps) {
  const backdropUrl = character.avatarUrl || heroImage
  const isSceneMode = runtimeState?.sceneState.mode === 'scene'
  const visibleMessages = chatLog.filter((chat) => chat.role !== 'system')

  return (
    <section className="grid min-h-svh min-w-0 grid-cols-1 overflow-hidden bg-[#101012] lg:grid-cols-[minmax(0,1fr)_288px]">
      <div
        className={`relative grid min-h-0 grid-rows-[auto_1fr_auto] overflow-hidden transition duration-300 ${isSceneMode ? 'shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.20)]' : ''}`}
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(14,14,16,0.74),rgba(14,14,16,0.34) 48%,rgba(14,14,16,0.76)), linear-gradient(180deg,rgba(0,0,0,0.28),rgba(0,0,0,0.74)), url(${backdropUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <header className="relative z-10 flex min-h-24 items-start justify-center px-4 py-4">
          <button
            className="absolute left-4 top-4 grid size-10 place-items-center rounded-md border border-white/10 bg-black/35 text-white backdrop-blur-md md:hidden"
            onClick={onOpenMenu}
            title="เปิดเมนู"
            type="button"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0 text-center">
            <img alt="" className="mx-auto size-16 rounded-full object-cover ring-2 ring-white/20" src={character.avatarUrl || heroImage} />
            <h1 className="mt-2 truncate text-base font-black text-white">{character.name}</h1>
            <p className="mx-auto mt-1 max-w-xl truncate text-sm text-white/55">{character.greeting || character.tagline || 'เริ่มบทสนทนาในโหมด sandbox'}</p>
            <p className="mt-1 text-xs text-white/40">{chatId ? 'แชทที่บันทึกไว้' : 'แชทใหม่'} | ผู้สร้าง @Maprang</p>
          </div>
        </header>

        <div className="relative z-10 min-h-0 overflow-y-auto px-4 pb-28 pt-4">
          <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-4">
            <RoleCard character={character} runtimeState={runtimeState} />
            <SceneBar isLoading={isLoading} onSceneAction={onSceneAction} runtimeState={runtimeState} />

            {visibleMessages.length > 1 && (
              <div className="mt-auto flex flex-col gap-4 pt-8">
                {visibleMessages.map((chat) => (
                  <MessageBubble chat={chat} isReporting={isLoading} key={chat.id} onReport={onReportMessage} />
                ))}
                {isLoading && visibleMessages.at(-1)?.role !== 'assistant' && (
                  <p className="self-start rounded-md border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/55 backdrop-blur-md">
                    กำลังพิมพ์...
                  </p>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="relative z-20 border-t border-white/10 bg-black/30 pt-2 backdrop-blur-xl">
          <button className="absolute right-5 top-[-56px] grid size-10 place-items-center rounded-full bg-white text-slate-950 shadow-lg" type="button">
            <ChevronDown size={20} />
          </button>
          <Composer disabled={isLoading} message={message} onMessageChange={onMessageChange} onSubmit={() => onSendMessage()} />
          <p className="m-0 pb-2 text-center text-[11px] font-bold text-white/30">อย่าลืม: ทุกสิ่งที่ตัวละครพูดเป็นการแต่งเรื่อง</p>
        </div>
      </div>

      <RightRail character={character} runtimeState={runtimeState} usage={lastUsage} />
    </section>
  )
}
