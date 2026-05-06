import { Link } from 'react-router-dom'
import { Compass, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react'
import type {
  AdminSummary as AdminSummaryData,
  Character,
  CharacterInput,
  CharacterListFilters,
  ChatSummary,
  ChatRuntimeState,
  HealthStatus,
  LoreEntry,
  LoreInput,
} from '../lib/api'
import { formatTime } from '../lib/chat'

type SidebarProps = {
  character: Character
  adminSummary: AdminSummaryData | null
  characters: Character[]
  chatHistory: ChatSummary[]
  chatId: string | null
  runtimeState: ChatRuntimeState | null
  connectionNote: string
  healthStatus: HealthStatus | null
  isHistoryLoading: boolean
  isLoreLoading: boolean
  isMobileOpen: boolean
  isSavingCharacter: boolean
  isSavingLore: boolean
  loreEntries: LoreEntry[]
  onArchiveChat: (chatId: string) => void
  onAuthChanged: () => Promise<void>
  onCloseMobile: () => void
  onCreateCharacter: (input: CharacterInput) => Promise<void>
  onCreateLore: (input: LoreInput) => Promise<void>
  onDeleteCharacter: () => Promise<void>
  onDeleteLore: (loreId: string) => Promise<void>
  onDuplicateCharacter: () => Promise<void>
  onFilterCharacters: (filters?: CharacterListFilters) => Promise<Character[]>
  onFavoriteCharacter: (characterId: string, favorite: boolean) => Promise<void>
  onLoadChatHistory: () => void
  onLoadHealth: () => Promise<void>
  onLoadAdminSummary: () => Promise<void>
  onLoadLore: () => Promise<void>
  onOpenChat: (chatId: string) => void
  onResetCharacterPrompt: () => Promise<void>
  onSaveCharacter: (input: CharacterInput) => Promise<void>
  onSelectCharacter: (character: Character) => void
  onStartNewChat: () => void
  onUpdateLore: (loreId: string, input: Partial<LoreInput>) => Promise<void>
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/65 backdrop-blur-sm transition md:hidden ${
          props.isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={props.onCloseMobile}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(92vw,246px)] min-h-0 flex-col border-r border-white/10 bg-[#151518] p-2.5 text-white shadow-2xl transition-transform md:static md:z-auto md:w-auto md:translate-x-0 md:shadow-none ${
          props.isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent {...props} />
      </aside>
    </>
  )
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  return src ? (
    <img alt="" className="size-8 rounded-full object-cover" src={src} />
  ) : (
    <span className="grid size-8 place-items-center rounded-full bg-white/12 text-xs font-black">{name.slice(0, 1)}</span>
  )
}

function SidebarContent({
  character,
  characters,
  chatHistory,
  chatId,
  connectionNote,
  isHistoryLoading,
  onArchiveChat,
  onCloseMobile,
  onLoadChatHistory,
  onOpenChat,
  onSelectCharacter,
  onStartNewChat,
}: SidebarProps) {
  const pinnedCharacters = characters.slice(0, 8)

  const openChat = (id: string) => {
    onOpenChat(id)
    onCloseMobile()
  }

  const selectCharacter = (nextCharacter: Character) => {
    onSelectCharacter(nextCharacter)
    onCloseMobile()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <section className="relative overflow-hidden rounded-md border border-white/8 bg-[linear-gradient(135deg,rgba(91,57,255,0.55),rgba(255,138,41,0.50))] p-3">
        <p className="m-0 text-sm font-black">ดูดวงไพ่ทาโรต์ประจำวัน</p>
        <p className="m-0 mt-1 line-clamp-2 text-xs leading-5 text-white/70">ไม่ว่าจะเป็นความรัก งาน หรือความสัมพันธ์ของคุณ</p>
        <div className="mt-2 flex gap-1">
          <span className="size-1.5 rounded-full bg-white" />
          <span className="size-1.5 rounded-full bg-white/40" />
          <span className="size-1.5 rounded-full bg-white/40" />
        </div>
      </section>

      <Link className="flex min-h-9 items-center justify-center gap-2 rounded-md bg-white/10 text-sm font-black text-white hover:bg-white/14" to="/">
        <Compass size={16} />
        ไปหน้าหลัก
      </Link>

      <button className="flex min-h-9 items-center justify-center gap-2 rounded-md bg-white text-sm font-black text-slate-950" onClick={onStartNewChat} type="button">
        <Plus size={16} />
        สร้างต่อจากตัวละครนี้
      </button>

      <div className="mt-2 flex items-center justify-between border-b border-white/10 pb-2">
        <button className="text-sm font-black text-white" type="button">แชทส่วนตัว</button>
        <button className="text-sm font-black text-white/55" type="button">จักรวาล [ทดลอง]</button>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
        <label className="flex min-h-10 items-center gap-2 rounded-full bg-white/6 px-3 text-white/45">
          <Search size={16} />
          <span className="truncate text-sm">ค้นหาแชท</span>
        </label>
        <button className="grid size-10 place-items-center rounded-full bg-white/6 text-white/60" onClick={onLoadChatHistory} type="button">
          <Trash2 size={16} />
        </button>
      </div>

      <section className="min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 mt-3 text-xs font-black text-amber-300">ปักหมุด</p>
        <div className="space-y-1">
          {pinnedCharacters.map((item) => (
            <button
              className={`grid min-h-10 w-full grid-cols-[32px_minmax(0,1fr)_24px] items-center gap-2 rounded-md px-1.5 text-left hover:bg-white/6 ${
                item.id === character.id ? 'bg-white/8' : ''
              }`}
              key={item.id}
              onClick={() => selectCharacter(item)}
              type="button"
            >
              <Avatar name={item.name} src={item.avatarUrl} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-white">{item.name}</span>
                <span className="block truncate text-[11px] text-white/45">{item.tagline || item.description || 'พร้อมเริ่มแชท'}</span>
              </span>
              <MoreHorizontal className="text-white/45" size={17} />
            </button>
          ))}
        </div>

        <p className="mb-2 mt-4 text-xs font-black text-white/30">วันนี้</p>
        <div className="space-y-1">
          {chatHistory.length === 0 && (
            <p className="rounded-md border border-white/8 bg-white/5 p-3 text-xs leading-5 text-white/45">
              {isHistoryLoading ? 'กำลังโหลด...' : 'ยังไม่มีแชทที่บันทึกไว้'}
            </p>
          )}
          {chatHistory.map((chat) => (
            <div
              className={`grid grid-cols-[minmax(0,1fr)_28px] rounded-md ${chat.id === chatId ? 'bg-white/10' : 'hover:bg-white/6'}`}
              key={chat.id}
            >
              <button className="min-w-0 px-2 py-2 text-left" onClick={() => openChat(chat.id)} type="button">
                <span className="block truncate text-sm font-black text-white">{chat.title || chat.characterName}</span>
                <span className="block truncate text-[11px] text-white/42">{chat.preview || formatTime(chat.lastMessageAt)}</span>
              </button>
              <button className="grid place-items-center text-white/35 hover:text-rose-300" onClick={() => onArchiveChat(chat.id)} title="เก็บแชท" type="button">
                <MoreHorizontal size={17} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <p className="m-0 border-t border-white/10 pt-2 text-[11px] leading-5 text-white/35">{connectionNote}</p>
    </div>
  )
}
