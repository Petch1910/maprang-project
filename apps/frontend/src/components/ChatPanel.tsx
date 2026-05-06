import type { RefObject } from 'react'
import {
  Archive,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Flag,
  Heart,
  Image,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Music,
  Settings,
  Share2,
  UserRound,
} from 'lucide-react'
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

function compactSceneLabel(runtimeState: ChatRuntimeState | null) {
  const scene = runtimeState?.sceneState
  if (scene?.activeScene) return scene.activeScene.title
  if (scene?.pendingEvents?.length) return `${scene.pendingEvents.length} ฉากรออยู่`
  return 'Sandbox'
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
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-white/15 bg-black/45 p-3 text-white shadow-lg backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-black uppercase tracking-widest text-white/45">Scene Mode</p>
            <h3 className="m-0 mt-1 truncate text-sm font-black">{activeScene.title}</h3>
            <p className="m-0 mt-0.5 line-clamp-1 text-xs text-white/60">{activeScene.objective}</p>
          </div>
          <div className="flex gap-2">
            <button className="min-h-8 rounded-md bg-white px-3 text-xs font-black text-slate-950" disabled={isLoading} onClick={() => onSceneAction('accept')} type="button">
              รับผล
            </button>
            <button className="min-h-8 rounded-md bg-white/10 px-3 text-xs font-black text-white" disabled={isLoading} onClick={() => onSceneAction('resolve')} type="button">
              จบฉาก
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!pendingEvent) return null
  return (
    <div className="mx-auto w-full max-w-3xl rounded-lg border border-amber-300/30 bg-amber-300/12 p-3 text-amber-50 shadow-lg backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[11px] font-black uppercase tracking-widest text-amber-100/70">ฉากสำคัญพร้อมแล้ว</p>
          <h3 className="m-0 mt-1 truncate text-sm font-black">{pendingEvent.title}</h3>
          <p className="m-0 mt-0.5 line-clamp-1 text-xs text-amber-50/65">{pendingEvent.prompt}</p>
        </div>
        <div className="flex gap-2">
          <button className="min-h-8 rounded-md bg-amber-200 px-3 text-xs font-black text-amber-950" disabled={isLoading} onClick={() => onSceneAction('enter', pendingEvent.code)} type="button">
            เข้าฉาก
          </button>
          <button className="min-h-8 rounded-md bg-white/10 px-3 text-xs font-black text-white" disabled={isLoading} onClick={() => onSceneAction('hold', pendingEvent.code)} type="button">
            ไว้ก่อน
          </button>
        </div>
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
    <aside className="hidden h-svh min-h-0 overflow-hidden border-l border-white/10 bg-[#151518]/96 p-4 text-white lg:flex lg:flex-col">
      <div className="flex items-start gap-3">
        <img alt="" className="size-12 rounded-full object-cover ring-1 ring-white/12" src={character.avatarUrl || heroImage} />
        <div className="min-w-0">
          <h2 className="m-0 truncate text-sm font-black">{character.name}</h2>
          <p className="m-0 mt-1 truncate text-xs font-bold text-white/55">ผู้สร้าง @Maprang</p>
        </div>
      </div>

      <p className="mt-4 line-clamp-3 text-sm leading-6 text-white/55">
        {character.tagline || character.description || character.greeting || 'เริ่มคุย แล้วให้ระบบความสัมพันธ์ค่อย ๆ เปิดฉากตามจังหวะของเรื่อง'}
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
        <p className="m-0 text-xs font-black text-white/45">ความสัมพันธ์</p>
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
            <ChevronRight className="text-white/35" size={15} />
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
    <section className="grid h-svh min-w-0 grid-cols-1 overflow-hidden bg-[#101012] lg:grid-cols-[minmax(0,1fr)_288px]">
      <div
        className={`relative grid min-h-0 grid-rows-[64px_1fr_auto] overflow-hidden transition duration-300 ${isSceneMode ? 'shadow-[inset_0_0_0_9999px_rgba(0,0,0,0.22)]' : ''}`}
        style={{
          backgroundImage: `linear-gradient(90deg,rgba(12,12,14,0.86),rgba(12,12,14,0.46) 52%,rgba(12,12,14,0.84)), linear-gradient(180deg,rgba(0,0,0,0.35),rgba(0,0,0,0.80)), url(${backdropUrl})`,
          backgroundPosition: 'center',
          backgroundSize: 'cover',
        }}
      >
        <header className="relative z-20 flex items-center gap-3 border-b border-white/10 bg-black/24 px-4 backdrop-blur-xl">
          <button
            className="grid size-10 place-items-center rounded-md border border-white/10 bg-black/35 text-white md:hidden"
            onClick={onOpenMenu}
            title="เปิดเมนู"
            type="button"
          >
            <Menu size={19} />
          </button>
          <img alt="" className="size-10 rounded-full object-cover ring-1 ring-white/20" src={character.avatarUrl || heroImage} />
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
          <button className="grid size-9 place-items-center rounded-md text-white/55 hover:bg-white/8 hover:text-white" type="button">
            <MoreHorizontal size={18} />
          </button>
        </header>

        <div className="relative z-10 min-h-0 overflow-y-auto px-3 pb-6 pt-4 sm:px-5">
          <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-end gap-4">
            <SceneBar isLoading={isLoading} onSceneAction={onSceneAction} runtimeState={runtimeState} />

            <div className="flex flex-col gap-4">
              {visibleMessages.map((chat) => (
                <MessageBubble chat={chat} isReporting={isLoading} key={chat.id} onReport={onReportMessage} />
              ))}
              {isLoading && visibleMessages.at(-1)?.role !== 'assistant' && (
                <p className="self-start rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm text-white/55 backdrop-blur-md">
                  กำลังพิมพ์...
                </p>
              )}
            </div>
            <div ref={chatEndRef} />
          </div>
        </div>

        <div className="relative z-20 border-t border-white/10 bg-black/32 pt-3 backdrop-blur-xl">
          <button className="absolute right-5 top-[-50px] grid size-10 place-items-center rounded-full bg-white text-slate-950 shadow-lg" type="button">
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
