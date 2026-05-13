import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  Bell,
  CheckSquare,
  Edit3,
  MoreHorizontal,
  Pin,
  PinOff,
  RefreshCw,
  RotateCcw,
  Search,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { displayMessageContent } from '../lib/characterDisplay'
import { archiveChat, deleteChat, fetchChats, restoreChat, updateChatTitle, type ChatSummary } from '../lib/api'
import { loadPinnedChatIds, savePinnedChatIds, togglePinnedChatId } from '../lib/pinnedChats'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectChatsError, selectChatsLoading, selectPlayableChatSummaries } from '../store/slices/chatsSlice'

const relationshipLabels: Record<string, string> = {
  RIVAL: 'คู่แข่ง',
  NEUTRAL: 'เป็นกลาง',
  CLOSE: 'ใกล้ชิด',
  TRUSTED: 'ไว้ใจ',
  ROMANTIC: 'โรแมนติก',
}

const tierLabels: Record<string, string> = {
  neutral: 'โหมดอิสระ',
  cold: 'ระยะห่าง',
  warm: 'อบอุ่น',
  close: 'ใกล้ชิด',
  trusted: 'ไว้ใจ',
  intimate: 'ลึกซึ้ง',
  volatile: 'ผันผวน',
}

export function MyChatsPage() {
  const dispatch = useAppDispatch()
  const chats = useAppSelector(selectPlayableChatSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)
  const [archivedChats, setArchivedChats] = useState<ChatSummary[]>([])
  const [isArchivedLoading, setIsArchivedLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'pinned' | 'pending' | 'archived'>('all')
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => loadPinnedChatIds())
  const [openMenuChatId, setOpenMenuChatId] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<ChatSummary | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ChatSummary | null>(null)
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedChatIds, setSelectedChatIds] = useState<string[]>([])
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState('')
  const normalizedSearch = search.trim().toLowerCase()
  const sourceChats = filter === 'archived' ? archivedChats : chats
  const isListLoading = filter === 'archived' ? isArchivedLoading : isLoading

  const visibleChats = useMemo(() => {
    const pinOrder = new Map(pinnedChatIds.map((id, index) => [id, index]))
    const filtered = sourceChats.filter((chat) => {
      const pendingCount = (chat.sceneState?.pendingEvents ?? []).filter((event) => event.status === 'pending').length
      const matchesFilter =
        filter === 'archived' || filter === 'all' || (filter === 'pending' ? pendingCount > 0 : pinOrder.has(chat.id))
      if (!matchesFilter) return false
      if (!normalizedSearch) return true
      return [chat.title, chat.characterName, chat.preview, chat.relationshipState?.status, chat.relationshipState?.tier]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearch)
    })
    return [...filtered].sort((a, b) => {
      const aPinned = pinOrder.has(a.id)
      const bPinned = pinOrder.has(b.id)
      if (aPinned && bPinned) return (pinOrder.get(a.id) ?? 0) - (pinOrder.get(b.id) ?? 0)
      if (aPinned) return -1
      if (bPinned) return 1
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
    })
  }, [filter, normalizedSearch, pinnedChatIds, sourceChats])

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  const loadArchivedChats = useCallback(async () => {
    setIsArchivedLoading(true)
    setActionNote('')
    try {
      const data = await fetchChats({ archived: true })
      setArchivedChats(data.chats ?? [])
    } catch {
      setActionNote('โหลดแชทที่จัดเก็บไว้ไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setIsArchivedLoading(false)
    }
  }, [])

  useEffect(() => {
    if (filter !== 'archived') return
    void loadArchivedChats()
  }, [filter, loadArchivedChats])

  useEffect(() => {
    setIsSelectionMode(false)
    setSelectedChatIds([])
  }, [filter])

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

  const refreshChats = () => {
    if (filter === 'archived') {
      void loadArchivedChats()
      return
    }
    void dispatch(loadChatSummaries())
  }

  const togglePinChat = (chat: ChatSummary) => {
    const willPin = !pinnedChatIds.includes(chat.id)
    setPinnedChatIds((current) => togglePinnedChatId(current, chat.id))
    setOpenMenuChatId(null)
    setActionNote(willPin ? 'ปักหมุดแชทแล้ว' : 'ถอนหมุดแชทแล้ว')
  }

  const startSelection = (chat?: ChatSummary) => {
    setOpenMenuChatId(null)
    setIsSelectionMode(true)
    setSelectedChatIds(chat ? [chat.id] : [])
    setActionNote(chat ? 'เลือกแชทนี้แล้ว' : 'เลือกแชทที่ต้องการจัดการหลายรายการ')
  }

  const clearSelection = () => {
    setIsSelectionMode(false)
    setSelectedChatIds([])
    setBulkDeleteIds([])
  }

  const toggleSelectedChat = (chatId: string) => {
    setSelectedChatIds((current) => (current.includes(chatId) ? current.filter((id) => id !== chatId) : [...current, chatId]))
  }

  const selectAllVisibleChats = () => {
    setSelectedChatIds(visibleChats.map((chat) => chat.id))
  }

  const openRenameDialog = (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setRenameTarget(chat)
    setRenameValue(chat.title || chat.characterName)
  }

  const confirmRename = async () => {
    const nextTitle = renameValue.trim()
    if (!renameTarget || !nextTitle) return
    setPendingAction(`rename:${renameTarget.id}`)
    setActionNote('')
    try {
      await updateChatTitle(renameTarget.id, nextTitle)
      setRenameTarget(null)
      setRenameValue('')
      setActionNote('บันทึกชื่อแชทแล้ว')
      await dispatch(loadChatSummaries())
    } catch {
      setActionNote('แก้ไขชื่อแชทไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const handleArchive = async (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setPendingAction(`archive:${chat.id}`)
    setActionNote('')
    try {
      await archiveChat(chat.id)
      setActionNote('จัดเก็บแชทแล้ว')
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    } catch {
      setActionNote('จัดเก็บแชทไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const handleRestore = async (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setPendingAction(`restore:${chat.id}`)
    setActionNote('')
    try {
      await restoreChat(chat.id)
      setActionNote('เอาแชทกลับมาแล้ว')
      await Promise.all([dispatch(loadChatSummaries()), loadArchivedChats()])
    } catch {
      setActionNote('เอาแชทกลับมาไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setPendingAction(`delete:${deleteTarget.id}`)
    setActionNote('')
    try {
      await deleteChat(deleteTarget.id)
      setDeleteTarget(null)
      setActionNote('ลบแชทแล้ว')
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    } catch {
      setActionNote('ลบแชทไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const handleBulkArchive = async () => {
    const ids = selectedChatIds.filter(Boolean)
    if (ids.length === 0) return
    setPendingAction('bulk-archive')
    setActionNote('')
    try {
      await Promise.all(ids.map((id) => archiveChat(id)))
      setActionNote(`จัดเก็บ ${ids.length.toLocaleString()} แชทแล้ว`)
      clearSelection()
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    } catch {
      setActionNote('จัดเก็บแชทที่เลือกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const handleBulkRestore = async () => {
    const ids = selectedChatIds.filter(Boolean)
    if (ids.length === 0) return
    setPendingAction('bulk-restore')
    setActionNote('')
    try {
      await Promise.all(ids.map((id) => restoreChat(id)))
      setActionNote(`เอากลับมา ${ids.length.toLocaleString()} แชทแล้ว`)
      clearSelection()
      await Promise.all([dispatch(loadChatSummaries()), loadArchivedChats()])
    } catch {
      setActionNote('เอาแชทที่เลือกกลับมาไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
    }
  }

  const confirmBulkDelete = async () => {
    const ids = bulkDeleteIds.filter(Boolean)
    if (ids.length === 0) return
    setPendingAction('bulk-delete')
    setActionNote('')
    try {
      await Promise.all(ids.map((id) => deleteChat(id)))
      setActionNote(`ลบ ${ids.length.toLocaleString()} แชทแล้ว`)
      clearSelection()
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    } catch {
      setActionNote('ลบแชทที่เลือกไม่สำเร็จ ลองใหม่อีกครั้ง')
    } finally {
      setPendingAction(null)
      setBulkDeleteIds([])
    }
  }

  return (
    <div className="space-y-4 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black">แชทของฉัน</h1>
          <p className="mt-2 text-slate-600">กลับไปเล่นต่อในเส้นทาง ฉาก และความสัมพันธ์ที่บันทึกไว้</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
            data-testid="my-chats-select-mode"
            onClick={() => (isSelectionMode ? clearSelection() : startSelection())}
            type="button"
          >
            {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
            {isSelectionMode ? 'ยกเลิกเลือก' : 'เลือกหลายแชท'}
          </button>
          <button type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
            onClick={refreshChats}
          >
            <RefreshCw size={16} />
            รีเฟรช
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
            to="/events"
          >
            กล่องอีเวนต์
          </Link>
        </div>
      </div>

      <section className="grid gap-3 rounded-lg border border-slate-900/10 bg-white p-3 shadow-sm md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-900/10 bg-slate-50 px-3 text-slate-500 focus-within:border-blue-500/50 focus-within:bg-white">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อตัวละคร สถานะ หรือข้อความล่าสุด"
            value={search}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            className={`min-h-11 rounded-lg px-3 text-sm font-black ${
              filter === 'all' ? 'bg-slate-950 text-white' : 'border border-slate-900/10 bg-slate-50 text-slate-600'
            }`}
            data-testid="my-chats-filter-all"
            onClick={() => setFilter('all')}
            type="button"
          >
            ทั้งหมด
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black ${
              filter === 'pinned' ? 'bg-slate-950 text-white' : 'border border-slate-900/10 bg-slate-50 text-slate-600'
            }`}
            data-testid="my-chats-filter-pinned"
            onClick={() => setFilter('pinned')}
            type="button"
          >
            <Pin size={15} />
            ปักหมุด
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black ${
              filter === 'pending' ? 'bg-amber-500 text-white' : 'border border-slate-900/10 bg-slate-50 text-slate-600'
            }`}
            data-testid="my-chats-filter-pending"
            onClick={() => setFilter('pending')}
            type="button"
          >
            <Bell size={16} />
            มีฉากรอ
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-black ${
              filter === 'archived' ? 'bg-slate-950 text-white' : 'border border-slate-900/10 bg-slate-50 text-slate-600'
            }`}
            data-testid="my-chats-filter-archived"
            onClick={() => setFilter('archived')}
            type="button"
          >
            <Archive size={15} />
            จัดเก็บแล้ว
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-slate-500">
        <span>
          แสดง {visibleChats.length.toLocaleString()} จาก {sourceChats.length.toLocaleString()} แชท
        </span>
        {filter === 'pinned' && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">เฉพาะแชทที่ปักหมุดไว้</span>}
        {filter === 'pending' && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">เฉพาะแชทที่มีฉากรออยู่</span>}
        {filter === 'archived' && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">แชทที่จัดเก็บไว้ ไม่แสดงในรายการหลัก</span>}
      </div>

      {actionNote && (
        <div className="rounded-xl border border-slate-900/10 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm">
          {actionNote}
        </div>
      )}

      {isSelectionMode && (
        <div
          className="sticky top-3 z-20 flex flex-col gap-3 rounded-2xl border border-slate-900/10 bg-slate-950 p-3 text-white shadow-2xl sm:flex-row sm:items-center sm:justify-between"
          data-testid="my-chats-selection-toolbar"
        >
          <div>
            <p className="m-0 text-sm font-black">เลือกไว้ {selectedChatIds.length.toLocaleString()} แชท</p>
            <p className="m-0 mt-1 text-xs font-bold text-white/55">จัดการหลายรายการได้จากแถบนี้ รายการที่จัดเก็บแล้วจะไม่แสดงในหน้าหลัก</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button"
              className="min-h-10 rounded-xl border border-white/10 px-3 text-sm font-black text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="my-chats-select-all"
              disabled={visibleChats.length === 0}
              onClick={selectAllVisibleChats}
            >
              เลือกทั้งหมด
            </button>
            {filter === 'archived' ? (
              <button
                className="min-h-10 rounded-xl bg-white px-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chats-bulk-restore"
                disabled={selectedChatIds.length === 0 || pendingAction === 'bulk-restore'}
                onClick={() => void handleBulkRestore()}
                type="button"
              >
                เอากลับมา
              </button>
            ) : (
              <button
                className="min-h-10 rounded-xl bg-white px-3 text-sm font-black text-slate-950 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chats-bulk-archive"
                disabled={selectedChatIds.length === 0 || pendingAction === 'bulk-archive'}
                onClick={() => void handleBulkArchive()}
                type="button"
              >
                จัดเก็บ
              </button>
            )}
            <button
              className="min-h-10 rounded-xl bg-rose-500 px-3 text-sm font-black text-white transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="my-chats-bulk-delete"
              disabled={selectedChatIds.length === 0 || pendingAction === 'bulk-delete'}
              onClick={() => setBulkDeleteIds(selectedChatIds)}
              type="button"
            >
              ลบ
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-50 p-4 text-sm font-bold text-amber-800">
          โหลดรายการแชทไม่ได้
        </div>
      )}

      <div className="grid min-w-0 gap-2">
        {isListLoading && [1, 2, 3, 4].map((item) => <div className="h-28 animate-pulse rounded-2xl bg-slate-200" key={item} />)}

        {!isListLoading &&
          visibleChats.map((chat) => {
            const pendingCount = (chat.sceneState?.pendingEvents ?? []).filter((event) => event.status === 'pending').length
            const activeScene = chat.sceneState?.activeScene
            const relationship = chat.relationshipState
            const relationshipStatus = relationship?.status ?? 'NEUTRAL'
            const isPinned = pinnedChatIds.includes(chat.id)
            const isArchived = filter === 'archived' || Boolean(chat.isArchived)
            const isBusy =
              pendingAction === `archive:${chat.id}` ||
              pendingAction === `restore:${chat.id}` ||
              pendingAction === `delete:${chat.id}` ||
              pendingAction === `rename:${chat.id}`

            return (
              <article
                className={`relative min-w-0 overflow-visible rounded-xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-4 ${
                  selectedChatIds.includes(chat.id) ? 'border-slate-950 bg-slate-50 ring-2 ring-slate-950/10' : 'border-slate-900/10 bg-white'
                } ${openMenuChatId === chat.id ? 'z-[70]' : 'z-0'}`}
                key={chat.id}
              >
                <div className="relative flex min-h-10 min-w-0 items-start gap-3 pr-24 sm:pr-32">
                  {isSelectionMode && (
                    <button
                      aria-label="Select chat"
                      aria-pressed={selectedChatIds.includes(chat.id)}
                      className="mt-0.5 grid size-9 flex-none place-items-center rounded-lg border border-slate-900/10 bg-white text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
                      data-testid={`my-chat-checkbox-${chat.id}`}
                      onClick={() => toggleSelectedChat(chat.id)}
                      type="button"
                    >
                      {selectedChatIds.includes(chat.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  )}
                  <div className="grid size-10 flex-none place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">
                    {(chat.characterName || chat.title || 'M').trim().slice(0, 1).toUpperCase()}
                  </div>
                  <div className="pointer-events-none min-w-0 flex-1 overflow-hidden">
                    <p className="flex min-w-0 items-center gap-1.5 font-black">
                      {isPinned && <Pin className="flex-none text-amber-500" size={14} />}
                      <span className="min-w-0 max-w-full truncate">{chat.title || chat.characterName}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
                      {chat.preview ? displayMessageContent(chat.preview) : 'ยังไม่มีตัวอย่างข้อความ'}
                    </p>
                  </div>
                  <div className="absolute right-0 top-0 z-30 flex flex-none items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="pointer-events-none rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                        {pendingCount} ฉาก
                      </span>
                    )}
                    <div className="relative z-20">
                      <button
                        aria-expanded={openMenuChatId === chat.id}
                        aria-haspopup="menu"
                        aria-label={`เปิดเมนูแชท ${chat.title || chat.characterName}`}
                        className="relative z-20 grid size-9 scroll-mt-28 touch-manipulation place-items-center rounded-lg border border-slate-900/10 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                        data-testid={`my-chat-menu-${chat.id}`}
                        disabled={isBusy}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenMenuChatId((current) => (current === chat.id ? null : chat.id))
                        }}
                        type="button"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {openMenuChatId === chat.id && (
                        <div
                          className="absolute right-0 top-10 z-[80] w-44 overflow-hidden rounded-xl border border-slate-900/10 bg-white py-1 shadow-[0_18px_44px_rgba(15,23,42,0.16)]"
                          role="menu"
                        >
                          <button
                            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                            data-testid={`my-chat-rename-${chat.id}`}
                            onClick={() => openRenameDialog(chat)}
                            role="menuitem"
                            type="button"
                          >
                            <Edit3 size={15} />
                            แก้ไขแชท
                          </button>
                          {!isArchived && (
                            <button
                              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                              data-testid={`my-chat-pin-${chat.id}`}
                              onClick={() => togglePinChat(chat)}
                              role="menuitem"
                              type="button"
                            >
                              {isPinned ? <PinOff size={15} /> : <Pin size={15} />}
                              {isPinned ? 'ถอนหมุดแชท' : 'ปักหมุดแชท'}
                            </button>
                          )}
                          {isArchived ? (
                            <button
                              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                              data-testid={`my-chat-restore-${chat.id}`}
                              onClick={() => void handleRestore(chat)}
                              role="menuitem"
                              type="button"
                            >
                              <RotateCcw size={15} />
                              เอาแชทกลับมา
                            </button>
                          ) : (
                            <button
                              className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                              data-testid={`my-chat-archive-${chat.id}`}
                              onClick={() => void handleArchive(chat)}
                              role="menuitem"
                              type="button"
                            >
                              <Archive size={15} />
                              จัดเก็บแชท
                            </button>
                          )}
                          <button
                            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-slate-700 transition hover:bg-slate-50"
                            data-testid={`my-chat-select-${chat.id}`}
                            onClick={() => startSelection(chat)}
                            role="menuitem"
                            type="button"
                          >
                            <CheckSquare size={15} />
                            เลือก
                          </button>
                          <button
                            className="flex min-h-10 w-full items-center gap-2 px-3 text-left text-sm font-black text-rose-600 transition hover:bg-rose-50"
                            data-testid={`my-chat-delete-${chat.id}`}
                            onClick={() => {
                              setOpenMenuChatId(null)
                              setDeleteTarget(chat)
                            }}
                            role="menuitem"
                            type="button"
                          >
                            <Trash2 size={15} />
                            ลบแชท
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`mt-3 flex flex-wrap gap-2 ${openMenuChatId === chat.id ? 'pointer-events-none' : ''}`}>
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">{chat.characterName}</span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                    {relationshipLabels[relationshipStatus] ?? relationshipStatus}
                  </span>
                  {relationship?.tier && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
                      {tierLabels[relationship.tier.toLowerCase()] ?? relationship.tier}
                    </span>
                  )}
                  {activeScene && (
                    <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-black text-white">โหมดฉาก</span>
                  )}
                </div>
                <div className={`mt-4 flex flex-wrap gap-2 sm:justify-end ${openMenuChatId === chat.id ? 'pointer-events-none' : ''}`}>
                  <Link
                    className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                    to={`/chat/${chat.id}`}
                  >
                    {isArchived ? 'เปิดอ่าน' : 'เข้าแชท'}
                  </Link>
                  {isArchived && (
                    <button
                      className="inline-flex min-h-10 items-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
                      data-testid={`my-chat-restore-button-${chat.id}`}
                      disabled={isBusy}
                      onClick={() => void handleRestore(chat)}
                      type="button"
                    >
                      เอากลับมา
                    </button>
                  )}
                  {pendingCount > 0 && (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-xl border border-amber-200 bg-amber-50 px-4 text-sm font-black text-amber-800"
                      to={`/chat/${chat.id}`}
                    >
                      เข้าฉากที่รออยู่
                    </Link>
                  )}
                </div>
              </article>
            )
          })}

        {!isListLoading && visibleChats.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-900/15 bg-white p-6 text-slate-500">
            <p className="m-0 text-sm leading-6">
              {filter === 'archived'
                ? 'ยังไม่มีแชทที่จัดเก็บไว้ เมื่อจัดเก็บแชทจากเมนูสามจุด รายการจะมาอยู่ตรงนี้และสามารถเอากลับมาได้'
                : sourceChats.length === 0
                  ? 'ยังไม่มีแชทที่บันทึกไว้ เริ่มจากหน้าแรกแล้วห้องที่เล่นค้างไว้จะแสดงที่นี่พร้อมสถานะความสัมพันธ์และฉากที่รออยู่'
                  : filter === 'pinned'
                  ? 'ยังไม่มีแชทที่ปักหมุดไว้ เปิดเมนูสามจุดบนแชทแล้วเลือกปักหมุดเพื่อเก็บไว้ด้านบน'
                  : 'ไม่พบแชทที่ตรงกับคำค้นหาหรือตัวกรองตอนนี้'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white" to="/">
                ไปสำรวจตัวละคร
              </Link>
              <Link
                className="inline-flex min-h-10 items-center rounded-xl border border-slate-900/10 bg-white px-4 text-sm font-black text-slate-700"
                to="/create"
              >
                สร้างตัวละครของฉัน
              </Link>
            </div>
          </div>
        )}
      </div>

      {renameTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" data-testid="my-chat-rename-dialog">
          <div className="w-full max-w-md rounded-2xl border border-slate-900/10 bg-white p-5 shadow-2xl">
            <h2 className="m-0 text-xl font-black text-slate-950">แก้ไขชื่อแชท</h2>
            <p className="m-0 mt-1 text-sm leading-6 text-slate-500">ตั้งชื่อให้จำง่ายขึ้น ข้อความเดิมและสถานะความสัมพันธ์จะยังอยู่ครบ</p>
            <input
              className="mt-4 min-h-11 w-full rounded-xl border border-slate-900/10 bg-slate-50 px-3 text-sm font-bold text-slate-950 outline-none focus:border-blue-500/50 focus:bg-white"
              data-testid="my-chat-rename-input"
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setRenameTarget(null)
                if (event.key === 'Enter') void confirmRename()
              }}
              value={renameValue}
            />
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-xl border border-slate-900/10 bg-white text-sm font-black text-slate-600"
                data-testid="my-chat-rename-cancel"
                onClick={() => setRenameTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="min-h-11 rounded-xl bg-slate-950 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chat-rename-confirm"
                disabled={!renameValue.trim() || pendingAction === `rename:${renameTarget.id}`}
                onClick={() => void confirmRename()}
                type="button"
              >
                {pendingAction === `rename:${renameTarget.id}` ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" data-testid="my-chat-delete-dialog">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl">
            <h2 className="m-0 text-xl font-black text-slate-950">ลบแชทนี้?</h2>
            <p className="m-0 mt-2 text-sm leading-6 text-slate-500">
              {deleteTarget.title || deleteTarget.characterName} จะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-xl border border-slate-900/10 bg-white text-sm font-black text-slate-600"
                data-testid="my-chat-delete-cancel"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chat-delete-confirm"
                disabled={pendingAction === `delete:${deleteTarget.id}`}
                onClick={() => void confirmDelete()}
                type="button"
              >
                {pendingAction === `delete:${deleteTarget.id}` ? 'กำลังลบ...' : 'ลบแชท'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm" data-testid="my-chats-bulk-delete-dialog">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-5 shadow-2xl">
            <h2 className="m-0 text-xl font-black text-slate-950">ลบแชทที่เลือก?</h2>
            <p className="m-0 mt-2 text-sm leading-6 text-slate-500">
              แชท {bulkDeleteIds.length.toLocaleString()} รายการจะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="min-h-11 rounded-xl border border-slate-900/10 bg-white text-sm font-black text-slate-600"
                data-testid="my-chats-bulk-delete-cancel"
                onClick={() => setBulkDeleteIds([])}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="min-h-11 rounded-xl bg-rose-600 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chats-bulk-delete-confirm"
                disabled={pendingAction === 'bulk-delete'}
                onClick={() => void confirmBulkDelete()}
                type="button"
              >
                {pendingAction === 'bulk-delete' ? 'กำลังลบ...' : 'ลบแชท'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
