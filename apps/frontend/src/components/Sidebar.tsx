import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  CheckSquare,
  ChevronRight,
  Compass,
  Disc3,
  Edit3,
  Globe2,
  MoreHorizontal,
  Pin,
  PinOff,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Sparkle,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import type {
  Character,
  ChatSummary,
  ChatRuntimeState,
} from '../lib/api'
import { displayCharacterSummary, displayMessageContent } from '../lib/characterDisplay'
import { formatTime } from '../lib/chat'
import { loadPinnedChatIds, savePinnedChatIds, togglePinnedChatId } from '../lib/pinnedChats'

type SidebarProps = {
  character: Character
  characters: Character[]
  chatHistory: ChatSummary[]
  chatId: string | null
  runtimeState: ChatRuntimeState | null
  connectionNote: string
  isHistoryLoading: boolean
  isMobileOpen: boolean
  onArchiveChat: (chatId: string) => void
  onAuthChanged: () => Promise<void>
  onCloseMobile: () => void
  onDeleteChat: (chatId: string) => void
  onLoadChatHistory: () => void
  onOpenChat: (chatId: string) => void
  onRenameChat: (chatId: string, title: string) => Promise<void>
  onSelectCharacter: (character: Character) => void
  onStartNewChat: () => void
}

export function Sidebar(props: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-black/65 backdrop-blur-sm transition md:hidden ${
          props.isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        data-testid="chat-sidebar-overlay"
        onClick={props.onCloseMobile}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(92vw,246px)] min-h-0 flex-col border-r border-white/8 bg-[#111114] p-2.5 text-white shadow-2xl transition-transform md:static md:z-auto md:w-auto md:translate-x-0 md:shadow-none ${
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
    <img alt="" className="size-8 rounded-lg object-cover ring-1 ring-white/10" src={src} />
  ) : (
    <span className="grid size-8 place-items-center rounded-lg bg-white/12 text-xs font-black">{name.slice(0, 1)}</span>
  )
}

const listItemClass =
  'grid min-h-12 w-full grid-cols-[32px_minmax(0,1fr)_28px] items-center gap-2 rounded-lg px-1.5 text-left transition hover:bg-white/6'

function SidebarCharacterRow({
  character,
  isActive,
  onSelect,
}: {
  character: Character
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button type="button"
      className={`${listItemClass} ${isActive ? 'bg-white/10 shadow-[inset_3px_0_0_rgba(255,255,255,0.86)]' : ''}`}
      onClick={onSelect}
    >
      <Avatar name={character.name} src={character.avatarUrl} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-white">{character.name}</span>
        <span className="block truncate text-[11px] leading-4 text-white/45">
          {displayCharacterSummary(character, 'พร้อมเริ่มแชท')}
        </span>
      </span>
      <ChevronRight className="text-white/35" size={17} />
    </button>
  )
}

function SidebarChatRow({
  chat,
  isActive,
  isMenuOpen,
  isPinned,
  isSelected,
  isSelectionMode,
  openMenuUp,
  onArchive,
  onCloseMenu,
  onDelete,
  onRename,
  onOpen,
  onSelectMode,
  onToggleMenu,
  onTogglePin,
  onToggleSelect,
}: {
  chat: ChatSummary
  isActive: boolean
  isMenuOpen: boolean
  isPinned: boolean
  isSelected: boolean
  isSelectionMode: boolean
  openMenuUp: boolean
  onArchive: () => void
  onCloseMenu: () => void
  onDelete: () => void
  onRename: () => void
  onOpen: () => void
  onSelectMode: () => void
  onToggleMenu: () => void
  onTogglePin: () => void
  onToggleSelect: () => void
}) {
  const actionButtonClass =
    'flex min-h-9 w-full items-center gap-2 px-3 text-left text-xs font-black text-white/82 transition hover:bg-white/8 hover:text-white'

  return (
    <div
      className={`relative ${listItemClass} ${
        isSelected ? 'bg-white/14 ring-1 ring-white/20' : isActive ? 'bg-white/10 shadow-[inset_3px_0_0_rgba(255,255,255,0.86)]' : ''
      }`}
    >
      {isSelectionMode && (
        <button
          aria-label="เลือกแชท"
          aria-pressed={isSelected}
          className="grid size-8 place-items-center rounded-lg text-white/55 transition hover:bg-white/8 hover:text-white"
          data-testid={`chat-row-checkbox-${chat.id}`}
          onClick={onToggleSelect}
          type="button"
        >
          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
        </button>
      )}
      <button type="button" className="contents text-left" onClick={isSelectionMode ? onToggleSelect : onOpen}>
        {!isSelectionMode && <Avatar name={chat.characterName} src={null} />}
        <span className="min-w-0">
          <span className="flex min-w-0 items-center gap-1.5">
            {isPinned && <Pin className="flex-none text-amber-300" size={12} />}
            <span className="block truncate text-sm font-black text-white">{chat.title || chat.characterName}</span>
          </span>
          <span className="block truncate text-[11px] leading-4 text-white/42">
            {chat.preview ? displayMessageContent(chat.preview) : formatTime(chat.lastMessageAt)}
          </span>
        </span>
      </button>
      <button
        aria-label={`เปิดเมนูแชท ${chat.title || chat.characterName}`}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        className="grid size-7 place-items-center rounded-md text-white/35 transition hover:bg-white/8 hover:text-white"
        data-testid={`chat-row-menu-${chat.id}`}
        onClick={(event) => {
          event.stopPropagation()
          onToggleMenu()
        }}
        title="เมนูแชท"
        type="button"
      >
        <MoreHorizontal size={16} />
      </button>
      {isMenuOpen && (
        <div
          className={`absolute right-0 z-30 w-44 max-w-[calc(100vw-2rem)] overflow-hidden rounded-lg border border-white/10 bg-[#09090b] py-1 shadow-[0_18px_42px_rgba(0,0,0,0.42)] ${
            openMenuUp ? 'bottom-10' : 'top-10'
          }`}
          role="menu"
        >
          <button type="button" className={actionButtonClass} data-testid={`chat-row-rename-${chat.id}`} onClick={onRename} role="menuitem">
            <Edit3 size={14} />
            แก้ไขแชท
          </button>
          <button type="button" className={actionButtonClass} data-testid={`chat-row-pin-${chat.id}`} onClick={onTogglePin} role="menuitem">
            {isPinned ? <PinOff size={14} /> : <Pin size={14} />}
            {isPinned ? 'ถอนหมุดแชท' : 'ปักหมุดแชท'}
          </button>
          <button type="button" className={actionButtonClass} data-testid={`chat-row-archive-${chat.id}`} onClick={onArchive} role="menuitem">
            <Archive size={14} />
            จัดเก็บแชท
          </button>
          <button type="button" className={actionButtonClass} data-testid={`chat-row-select-${chat.id}`} onClick={onSelectMode} role="menuitem">
            <CheckSquare size={14} />
            เลือก
          </button>
          <button type="button" className={`${actionButtonClass} text-rose-400 hover:text-rose-300`} data-testid={`chat-row-delete-${chat.id}`} onClick={onDelete} role="menuitem">
            <Trash2 size={14} />
            ลบแชท
          </button>
          <button type="button" className="sr-only" onClick={onCloseMenu}>
            ปิดเมนู
          </button>
        </div>
      )}
    </div>
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
  onDeleteChat,
  onLoadChatHistory,
  onOpenChat,
  onRenameChat,
  onSelectCharacter,
}: SidebarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null)
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => loadPinnedChatIds())
  const [renameTarget, setRenameTarget] = useState<ChatSummary | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ChatSummary | null>(null)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const [isRenaming, setIsRenaming] = useState(false)
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const featuredCharacters = useMemo(() => characters.slice(0, 9), [characters])

  useEffect(() => {
    savePinnedChatIds(pinnedChatIds)
  }, [pinnedChatIds])

  useEffect(() => {
    if (!openMenuChatId) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuChatId(null)
    }
    const closeOnWindowClick = () => setOpenMenuChatId(null)
    window.addEventListener('keydown', closeOnEscape)
    window.addEventListener('click', closeOnWindowClick)
    return () => {
      window.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('click', closeOnWindowClick)
    }
  }, [openMenuChatId])

  const filteredCharacters = useMemo(() => {
    if (!normalizedSearch) return featuredCharacters
    return featuredCharacters.filter((item) =>
      [item.name, displayCharacterSummary(item, '')].join(' ').toLowerCase().includes(normalizedSearch),
    )
  }, [normalizedSearch, featuredCharacters])

  const filteredChats = useMemo(() => {
    const source = normalizedSearch
      ? chatHistory.filter((item) =>
          [item.title, item.characterName, item.preview].filter(Boolean).join(' ').toLowerCase().includes(normalizedSearch),
        )
      : chatHistory
    const pinOrder = new Map(pinnedChatIds.map((id, index) => [id, index]))
    return [...source].sort((a, b) => {
      const aPinned = pinOrder.has(a.id)
      const bPinned = pinOrder.has(b.id)
      if (aPinned && bPinned) return (pinOrder.get(a.id) ?? 0) - (pinOrder.get(b.id) ?? 0)
      if (aPinned) return -1
      if (bPinned) return 1
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })
  }, [chatHistory, normalizedSearch, pinnedChatIds])

  const pinnedChats = useMemo(() => filteredChats.filter((chat) => pinnedChatIds.includes(chat.id)), [filteredChats, pinnedChatIds])
  const regularChats = useMemo(
    () => filteredChats.filter((chat) => !pinnedChatIds.includes(chat.id)),
    [filteredChats, pinnedChatIds],
  )

  const togglePinChat = (id: string) => {
    setPinnedChatIds((current) => togglePinnedChatId(current, id))
    setOpenMenuChatId(null)
  }

  const startSelection = (id: string) => {
    setOpenMenuChatId(null)
    setIsSelectionMode(true)
    setSelectedChatIds([id])
  }

  const clearSelection = () => {
    setIsSelectionMode(false)
    setSelectedChatIds([])
    setBulkDeleteIds([])
  }

  const toggleSelectedChat = (id: string) => {
    setSelectedChatIds((current) => (current.includes(id) ? current.filter((chatId) => chatId !== id) : [...current, id]))
  }

  const archiveSelectedChats = () => {
    const ids = selectedChatIds
    clearSelection()
    ids.forEach((id) => {
      setPinnedChatIds((current) => current.filter((chatId) => chatId !== id))
      onArchiveChat(id)
    })
  }

  const deleteSelectedChats = () => {
    setBulkDeleteIds(selectedChatIds)
  }

  const confirmDeleteSelectedChats = () => {
    const ids = bulkDeleteIds
    clearSelection()
    ids.forEach((id) => {
      setPinnedChatIds((current) => current.filter((chatId) => chatId !== id))
      onDeleteChat(id)
    })
  }

  const openChat = (id: string) => {
    setOpenMenuChatId(null)
    onOpenChat(id)
    onCloseMobile()
  }

  const openRenameDialog = (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setRenameTarget(chat)
    setRenameValue(chat.title || chat.characterName)
  }

  const confirmRenameChat = async () => {
    const nextTitle = renameValue.trim()
    if (!renameTarget) return
    if (!nextTitle) return
    setIsRenaming(true)
    try {
      await onRenameChat(renameTarget.id, nextTitle)
      setRenameTarget(null)
      setRenameValue('')
    } finally {
      setIsRenaming(false)
    }
  }

  const archiveChat = (id: string) => {
    setOpenMenuChatId(null)
    setPinnedChatIds((current) => current.filter((chatId) => chatId !== id))
    onArchiveChat(id)
  }

  const openDeleteDialog = (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setDeleteTarget(chat)
  }

  const confirmDeleteChat = () => {
    if (!deleteTarget) return
    setPinnedChatIds((current) => current.filter((chatId) => chatId !== deleteTarget.id))
    onDeleteChat(deleteTarget.id)
    setDeleteTarget(null)
  }

  const selectionActionDisabledReason =
    selectedChatIds.length === 0 ? 'เลือกแชทอย่างน้อย 1 รายการก่อนจัดการ' : undefined
  const refreshDisabledReason = isHistoryLoading ? 'กำลังโหลดรายการแชทในแถบข้าง' : undefined
  const renameConfirmDisabledReason = renameTarget
    ? renameValue.trim().length === 0
      ? 'กรอกชื่อแชทก่อนบันทึก'
      : isRenaming
        ? 'กำลังบันทึกชื่อแชท'
        : undefined
    : undefined

  const renderChatRow = (chat: ChatSummary, index = 0, rows: ChatSummary[] = regularChats) => (
    <SidebarChatRow
      chat={chat}
      isActive={chat.id === chatId}
      isMenuOpen={openMenuChatId === chat.id}
      isPinned={pinnedChatIds.includes(chat.id)}
      isSelected={selectedChatIds.includes(chat.id)}
      isSelectionMode={isSelectionMode}
      key={chat.id}
      openMenuUp={rows.length > 1 && index >= rows.length - 2}
      onArchive={() => archiveChat(chat.id)}
      onCloseMenu={() => setOpenMenuChatId(null)}
      onDelete={() => openDeleteDialog(chat)}
      onOpen={() => openChat(chat.id)}
      onRename={() => openRenameDialog(chat)}
      onSelectMode={() => startSelection(chat.id)}
      onToggleMenu={() => setOpenMenuChatId((current) => (current === chat.id ? null : chat.id))}
      onTogglePin={() => togglePinChat(chat.id)}
      onToggleSelect={() => toggleSelectedChat(chat.id)}
    />
  )

  const selectCharacter = (nextCharacter: Character) => {
    onSelectCharacter(nextCharacter)
    onCloseMobile()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <Link className="mb-1 flex min-h-10 items-center gap-2 rounded-lg px-1 text-white" onClick={onCloseMobile} to="/">
        <span className="grid size-8 flex-none place-items-center rounded-lg bg-[#ff6a1a] text-lg font-black shadow-[0_12px_26px_rgba(255,106,26,0.24)]">
          M
        </span>
        <span className="min-w-0">
          <span className="block truncate text-lg font-black tracking-wide">MAPRANG</span>
          <span className="block truncate text-[11px] font-bold text-white/38">บทบาทสมมุติภาษาไทย</span>
        </span>
      </Link>

      <Link
        className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-white/9 text-sm font-black text-white transition hover:bg-white/14"
        to="/"
      >
        <Compass size={16} />
        ไปหน้าหลัก
      </Link>

      <Link
        className="flex min-h-9 items-center justify-center gap-2 rounded-lg bg-white text-sm font-black text-slate-950 transition hover:bg-white/90"
        onClick={onCloseMobile}
        to="/create"
      >
        <Plus size={16} />
        สร้างตัวละคร
      </Link>

      <div className="mt-2 flex items-center justify-between border-b border-white/10 pb-2">
        <Link
          className="relative text-sm font-black text-white after:absolute after:-bottom-2 after:left-0 after:h-0.5 after:w-full after:bg-white"
          onClick={onCloseMobile}
          to="/chats"
        >
          แชทส่วนตัว
        </Link>
        <Link className="text-sm font-black text-white/55 transition hover:text-white" onClick={onCloseMobile} to="/events">
          อีเวนต์รวม
        </Link>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_36px] gap-2">
        <label className="flex min-h-10 items-center gap-2 rounded-full bg-white/6 px-3 text-white/45 focus-within:bg-white/9 focus-within:text-white/70">
          <Search size={16} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/42"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="ค้นหาแชท"
            value={searchTerm}
          />
        </label>
        <button type="button"
          aria-disabled={Boolean(refreshDisabledReason)}
          className="grid size-10 place-items-center rounded-full bg-white/6 text-white/60 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
          data-testid="chat-sidebar-refresh"
          disabled={Boolean(refreshDisabledReason)}
          onClick={onLoadChatHistory}
          title={refreshDisabledReason || 'โหลดรายการแชทใหม่'}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {isSelectionMode && (
        <div className="rounded-lg border border-white/10 bg-white/6 p-2" data-testid="chat-selection-toolbar">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-black text-white">เลือกไว้ {selectedChatIds.length.toLocaleString()} แชท</span>
            <button
              aria-label="ยกเลิกการเลือกแชท"
              className="grid size-7 place-items-center rounded-md text-white/55 transition hover:bg-white/8 hover:text-white"
              data-testid="chat-selection-cancel"
              onClick={clearSelection}
              type="button"
            >
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              className="min-h-9 rounded-lg bg-white px-2 text-xs font-black text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
              aria-disabled={Boolean(selectionActionDisabledReason)}
              data-testid="chat-selection-archive"
              disabled={Boolean(selectionActionDisabledReason)}
              onClick={archiveSelectedChats}
              title={selectionActionDisabledReason || 'จัดเก็บแชทที่เลือก'}
            >
              จัดเก็บ
            </button>
            <button type="button"
              className="min-h-9 rounded-lg bg-rose-500 px-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
              aria-disabled={Boolean(selectionActionDisabledReason)}
              data-testid="chat-selection-delete"
              disabled={Boolean(selectionActionDisabledReason)}
              onClick={deleteSelectedChats}
              title={selectionActionDisabledReason || 'ลบแชทที่เลือก'}
            >
              ลบ
            </button>
          </div>
        </div>
      )}

      <section className="min-h-0 flex-1 overflow-y-auto pr-1">
        <p className="mb-2 mt-3 text-xs font-black text-amber-300">ตัวละคร</p>
        <div className="space-y-1">
          {filteredCharacters.map((item) => (
            <SidebarCharacterRow
              character={item}
              isActive={item.id === character.id}
              key={item.id}
              onSelect={() => selectCharacter(item)}
            />
          ))}
          {filteredCharacters.length === 0 && (
            <p className="rounded-lg border border-white/8 bg-white/5 p-3 text-xs leading-5 text-white/45">
              ไม่พบตัวละครที่ตรงกับคำค้นหา
            </p>
          )}
        </div>

        {pinnedChats.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-xs font-black text-amber-300">ปักหมุดแชท</p>
            <div className="space-y-1">{pinnedChats.map((chat, index) => renderChatRow(chat, index, pinnedChats))}</div>
          </>
        )}

        <p className="mb-2 mt-4 text-xs font-black text-white/30">ล่าสุด</p>
        <div className="space-y-1">
          {filteredChats.length === 0 && (
            <p className="rounded-lg border border-white/8 bg-white/5 p-3 text-xs leading-5 text-white/45">
              {isHistoryLoading ? 'กำลังโหลด...' : normalizedSearch ? 'ไม่พบแชทที่ตรงกับคำค้นหา' : 'ยังไม่มีแชทที่บันทึกไว้'}
            </p>
          )}
          {regularChats.map((chat, index) => renderChatRow(chat, index, regularChats))}
        </div>
      </section>

      <div className="flex items-center gap-2 border-t border-white/10 pt-2 text-white/45">
        <Link
          className="grid size-8 place-items-center rounded-lg transition hover:bg-white/8 hover:text-white"
          onClick={onCloseMobile}
          title="อีเวนต์"
          to="/events"
        >
          <Disc3 size={16} />
        </Link>
        <Link
          className="grid size-8 place-items-center rounded-lg transition hover:bg-white/8 hover:text-white"
          onClick={onCloseMobile}
          title="แชททั้งหมด"
          to="/chats"
        >
          <Globe2 size={16} />
        </Link>
        <Link
          className="grid size-8 place-items-center rounded-lg transition hover:bg-white/8 hover:text-white"
          onClick={onCloseMobile}
          title="สร้างตัวละคร"
          to="/create"
        >
          <Sparkle size={16} />
        </Link>
        <Link
          className="ml-auto grid size-8 place-items-center rounded-lg transition hover:bg-white/8 hover:text-white"
          onClick={onCloseMobile}
          title="ตั้งค่า"
          to="/profile"
        >
          <Settings size={16} />
        </Link>
      </div>
      <p className="m-0 text-[11px] leading-5 text-white/35">{connectionNote}</p>

      {renameTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" data-testid="chat-rename-dialog">
          <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#151518] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-base font-black text-white">แก้ไขชื่อแชท</p>
                <p className="m-0 mt-1 text-xs font-bold leading-5 text-white/45">ตั้งชื่อให้จำง่ายขึ้นโดยไม่กระทบบทสนทนาเดิม</p>
              </div>
              <button
                className="grid size-8 place-items-center rounded-lg text-white/45 transition hover:bg-white/8 hover:text-white"
                onClick={() => setRenameTarget(null)}
                type="button"
              >
                ×
              </button>
            </div>
            <input
              className="mt-4 min-h-11 w-full rounded-lg border border-white/10 bg-white/6 px-3 text-sm font-bold text-white outline-none placeholder:text-white/35 focus:border-orange-400/70 focus:ring-4 focus:ring-orange-400/10"
              data-testid="chat-rename-input"
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void confirmRenameChat()
                if (event.key === 'Escape') setRenameTarget(null)
              }}
              placeholder="ชื่อแชท"
              value={renameValue}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-white/75 transition hover:bg-white/8"
                data-testid="chat-rename-cancel"
                onClick={() => setRenameTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="min-h-10 rounded-lg bg-white px-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                aria-disabled={Boolean(renameConfirmDisabledReason)}
                data-testid="chat-rename-confirm"
                disabled={Boolean(renameConfirmDisabledReason)}
                onClick={() => void confirmRenameChat()}
                title={renameConfirmDisabledReason || 'บันทึกชื่อแชท'}
                type="button"
              >
                {isRenaming ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" data-testid="chat-delete-dialog">
          <div className="w-full max-w-sm rounded-xl border border-rose-400/20 bg-[#151518] p-4 shadow-2xl">
            <p className="m-0 text-base font-black text-white">ลบแชทนี้?</p>
            <p className="m-0 mt-2 text-sm font-bold leading-6 text-white/55">
              {deleteTarget.title || deleteTarget.characterName} จะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-white/75 transition hover:bg-white/8"
                data-testid="chat-delete-cancel"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button type="button"
                className="min-h-10 rounded-lg bg-rose-500 px-3 text-sm font-black text-white transition hover:bg-rose-400"
                data-testid="chat-delete-confirm"
                onClick={confirmDeleteChat}
              >
                ลบแชท
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" data-testid="chat-bulk-delete-dialog">
          <div className="w-full max-w-sm rounded-xl border border-rose-400/20 bg-[#151518] p-4 shadow-2xl">
            <p className="m-0 text-base font-black text-white">ลบแชทที่เลือก?</p>
            <p className="m-0 mt-2 text-sm font-bold leading-6 text-white/55">
              แชท {bulkDeleteIds.length.toLocaleString()} รายการจะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-10 rounded-lg border border-white/10 px-3 text-sm font-black text-white/75 transition hover:bg-white/8"
                data-testid="chat-bulk-delete-cancel"
                onClick={() => setBulkDeleteIds([])}
                type="button"
              >
                ยกเลิก
              </button>
              <button type="button"
                className="min-h-10 rounded-lg bg-rose-500 px-3 text-sm font-black text-white transition hover:bg-rose-400"
                data-testid="chat-bulk-delete-confirm"
                onClick={confirmDeleteSelectedChats}
              >
                ลบแชท
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
