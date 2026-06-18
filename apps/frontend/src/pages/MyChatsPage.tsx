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
import { filterAndSortChats, getPendingChatEventCount, toggleSelectedChatId, type ChatListFilter } from '../lib/chatList'
import { archiveChat, deleteChat, fetchChats, restoreChat, updateChatTitle, type ChatSummary } from '../lib/api'
import { characterImageUrl } from '../lib/characterVisual'
import { loadPinnedChatIds, savePinnedChatIds, togglePinnedChatId } from '../lib/pinnedChats'
import { relationshipStatusLabel, relationshipTierLabel } from '../lib/relationshipLabels'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { isPlayableChatSummary, loadChatSummaries, selectChatsError, selectChatsLoading, selectPlayableChatSummaries } from '../store/slices/chatsSlice'

export function MyChatsPage() {
  const dispatch = useAppDispatch()
  const chats = useAppSelector(selectPlayableChatSummaries)
  const isLoading = useAppSelector(selectChatsLoading)
  const error = useAppSelector(selectChatsError)
  const [archivedChats, setArchivedChats] = useState<ChatSummary[]>([])
  const [isArchivedLoading, setIsArchivedLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<ChatListFilter>('all')
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
  const sourceChats = filter === 'archived' ? archivedChats : chats
  const isListLoading = filter === 'archived' ? isArchivedLoading : isLoading
  const hasListError = Boolean(error) || actionNote.includes('โหลดแชทที่จัดเก็บไว้ไม่สำเร็จ')
  const refreshDisabledReason = isListLoading ? 'กำลังโหลดรายการแชท' : undefined

  const visibleChats = useMemo(
    () => filterAndSortChats({ chats: sourceChats, filter, pinnedChatIds, search }),
    [filter, pinnedChatIds, search, sourceChats],
  )
  const selectAllDisabledReason =
    visibleChats.length === 0 ? (hasListError ? 'ยังโหลดรายการแชทไม่ได้' : 'ไม่มีแชทให้เลือกในตัวกรองนี้') : undefined
  const bulkArchiveDisabledReason =
    selectedChatIds.length === 0
      ? 'เลือกแชทอย่างน้อย 1 รายการก่อนจัดเก็บ'
      : pendingAction === 'bulk-archive'
        ? 'กำลังจัดเก็บแชทที่เลือก'
        : undefined
  const bulkRestoreDisabledReason =
    selectedChatIds.length === 0
      ? 'เลือกแชทอย่างน้อย 1 รายการก่อนเอากลับมา'
      : pendingAction === 'bulk-restore'
        ? 'กำลังเอาแชทที่เลือกกลับมา'
        : undefined
  const bulkDeleteDisabledReason =
    selectedChatIds.length === 0
      ? 'เลือกแชทอย่างน้อย 1 รายการก่อนลบ'
      : pendingAction === 'bulk-delete'
        ? 'กำลังลบแชทที่เลือก'
        : undefined

  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  const loadArchivedChats = useCallback(async () => {
    setIsArchivedLoading(true)
    setActionNote('')
    try {
      const data = await fetchChats({ archived: true })
      setArchivedChats((data.chats ?? []).filter(isPlayableChatSummary))
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
    setSelectedChatIds((current) => toggleSelectedChatId(current, chatId))
  }

  const selectAllVisibleChats = () => {
    setSelectedChatIds(visibleChats.map((chat) => chat.id))
  }

  const openRenameDialog = (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    setRenameTarget(chat)
    setRenameValue(chat.title || chat.characterName)
  }

  const runChatAction = async (
    actionId: string,
    successNote: string,
    failureNote: string,
    action: () => Promise<void>,
    cleanup?: () => void,
  ) => {
    setPendingAction(actionId)
    setActionNote('')
    try {
      await action()
      setActionNote(successNote)
    } catch {
      setActionNote(failureNote)
    } finally {
      setPendingAction(null)
      cleanup?.()
    }
  }

  const confirmRename = async () => {
    const nextTitle = renameValue.trim()
    if (!renameTarget || !nextTitle) return
    await runChatAction(`rename:${renameTarget.id}`, 'บันทึกชื่อแชทแล้ว', 'แก้ไขชื่อแชทไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await updateChatTitle(renameTarget.id, nextTitle)
      setRenameTarget(null)
      setRenameValue('')
      await dispatch(loadChatSummaries())
    })
  }

  const handleArchive = async (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    await runChatAction(`archive:${chat.id}`, 'จัดเก็บแชทแล้ว', 'จัดเก็บแชทไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await archiveChat(chat.id)
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    })
  }

  const handleRestore = async (chat: ChatSummary) => {
    setOpenMenuChatId(null)
    await runChatAction(`restore:${chat.id}`, 'เอาแชทกลับมาแล้ว', 'เอาแชทกลับมาไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await restoreChat(chat.id)
      await Promise.all([dispatch(loadChatSummaries()), loadArchivedChats()])
    })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    await runChatAction(`delete:${deleteTarget.id}`, 'ลบแชทแล้ว', 'ลบแชทไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await deleteChat(deleteTarget.id)
      setDeleteTarget(null)
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    })
  }

  const handleBulkArchive = async () => {
    const ids = selectedChatIds.filter(Boolean)
    if (ids.length === 0) return
    await runChatAction('bulk-archive', `จัดเก็บ ${ids.length.toLocaleString()} แชทแล้ว`, 'จัดเก็บแชทที่เลือกไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await Promise.all(ids.map((id) => archiveChat(id)))
      clearSelection()
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    })
  }

  const handleBulkRestore = async () => {
    const ids = selectedChatIds.filter(Boolean)
    if (ids.length === 0) return
    await runChatAction('bulk-restore', `เอากลับมา ${ids.length.toLocaleString()} แชทแล้ว`, 'เอาแชทที่เลือกกลับมาไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await Promise.all(ids.map((id) => restoreChat(id)))
      clearSelection()
      await Promise.all([dispatch(loadChatSummaries()), loadArchivedChats()])
    })
  }

  const confirmBulkDelete = async () => {
    const ids = bulkDeleteIds.filter(Boolean)
    if (ids.length === 0) return
    await runChatAction('bulk-delete', `ลบ ${ids.length.toLocaleString()} แชทแล้ว`, 'ลบแชทที่เลือกไม่สำเร็จ ลองใหม่อีกครั้ง', async () => {
      await Promise.all(ids.map((id) => deleteChat(id)))
      clearSelection()
      await dispatch(loadChatSummaries())
      if (filter === 'archived') await loadArchivedChats()
    }, () => setBulkDeleteIds([]))
  }

  const renameConfirmDisabledReason = renameTarget
    ? !renameValue.trim()
      ? 'กรอกชื่อแชทก่อนบันทึก'
      : pendingAction === `rename:${renameTarget.id}`
        ? 'กำลังบันทึกชื่อแชท'
        : undefined
    : undefined
  const deleteConfirmDisabledReason =
    deleteTarget && pendingAction === `delete:${deleteTarget.id}` ? 'กำลังลบแชทนี้' : undefined
  const bulkDeleteConfirmDisabledReason = pendingAction === 'bulk-delete' ? 'กำลังลบแชทที่เลือก' : undefined

  return (
    <div className="missai-shell space-y-4 text-white">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-black text-white">แชทของฉัน</h1>
          <p className="mt-2 text-sm font-bold text-white/55">กลับไปเล่นต่อในเส้นทาง ฉาก และความสัมพันธ์ที่บันทึกไว้</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="missai-button-secondary min-h-11 rounded-xl px-4 text-sm"
            data-testid="my-chats-select-mode"
            onClick={() => (isSelectionMode ? clearSelection() : startSelection())}
            type="button"
          >
            {isSelectionMode ? <X size={16} /> : <CheckSquare size={16} />}
            {isSelectionMode ? 'ยกเลิกเลือก' : 'เลือกหลายแชท'}
          </button>
          <button type="button"
            aria-disabled={Boolean(refreshDisabledReason)}
            className="missai-button-secondary min-h-11 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-55"
            data-testid="my-chats-refresh"
            disabled={Boolean(refreshDisabledReason)}
            onClick={refreshChats}
            title={refreshDisabledReason ?? 'รีเฟรชรายการแชท'}
          >
            <RefreshCw size={16} />
            รีเฟรช
          </button>
          <Link
            className="missai-button-primary min-h-11 rounded-xl px-4 text-sm"
            to="/events"
          >
            กล่องอีเวนต์
          </Link>
        </div>
      </div>

      <section className="missai-card grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(0,1fr)_auto]">
        <label className="missai-input flex min-h-11 items-center gap-2 px-3 py-0 text-slate-400">
          <Search size={17} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/35"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาชื่อตัวละคร สถานะ หรือข้อความล่าสุด"
            value={search}
          />
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button
            className={`missai-tab min-h-11 px-4 text-sm ${filter === 'all' ? 'missai-tab-active' : ''}`}
            data-testid="my-chats-filter-all"
            onClick={() => setFilter('all')}
            type="button"
          >
            ทั้งหมด
          </button>
          <button
            className={`missai-tab min-h-11 px-4 text-sm ${filter === 'pinned' ? 'missai-tab-active' : ''}`}
            data-testid="my-chats-filter-pinned"
            onClick={() => setFilter('pinned')}
            type="button"
          >
            <Pin size={15} />
            ปักหมุด
          </button>
          <button
            className={`missai-tab min-h-11 px-4 text-sm ${filter === 'pending' ? 'missai-tab-active border-[#f99c00]/50 bg-[#f99c00]/15 text-[#f9c86d]' : ''}`}
            data-testid="my-chats-filter-pending"
            onClick={() => setFilter('pending')}
            type="button"
          >
            <Bell size={16} />
            มีฉากรอ
          </button>
          <button
            className={`missai-tab min-h-11 px-4 text-sm ${filter === 'archived' ? 'missai-tab-active' : ''}`}
            data-testid="my-chats-filter-archived"
            onClick={() => setFilter('archived')}
            type="button"
          >
            <Archive size={15} />
            จัดเก็บแล้ว
          </button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-black text-white/48">
        <span>
          {hasListError
            ? 'ยังโหลดรายการแชทไม่ได้'
            : `แสดง ${visibleChats.length.toLocaleString()} จาก ${sourceChats.length.toLocaleString()} แชท`}
        </span>
        {filter === 'pinned' && <span className="missai-badge text-[#d9b3ff]">เฉพาะแชทที่ปักหมุดไว้</span>}
        {filter === 'pending' && <span className="missai-badge border-[#f99c00]/30 bg-[#f99c00]/15 text-[#f9c86d]">เฉพาะแชทที่มีฉากรออยู่</span>}
        {filter === 'archived' && <span className="missai-badge text-slate-400">แชทที่จัดเก็บไว้ ไม่แสดงในรายการหลัก</span>}
      </div>

      {actionNote && (
        <div className="missai-card rounded-2xl px-4 py-3 text-sm font-bold text-slate-300">
          {actionNote}
        </div>
      )}

      {isSelectionMode && (
        <div
          className="missai-card sticky top-3 z-20 flex flex-col gap-3 rounded-2xl p-4 text-white sm:flex-row sm:items-center sm:justify-between"
          data-testid="my-chats-selection-toolbar"
        >
          <div>
            <p className="m-0 text-sm font-black">เลือกไว้ {selectedChatIds.length.toLocaleString()} แชท</p>
            <p className="m-0 mt-1 text-xs font-bold text-white/55">จัดการหลายรายการได้จากแถบนี้ รายการที่จัดเก็บแล้วจะไม่แสดงในหน้าหลัก</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              aria-disabled={Boolean(selectAllDisabledReason)}
              className="missai-button-secondary min-h-10 rounded-xl px-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="my-chats-select-all"
              disabled={Boolean(selectAllDisabledReason)}
              onClick={selectAllVisibleChats}
              title={selectAllDisabledReason ?? 'เลือกแชททั้งหมดที่เห็น'}
              type="button"
            >
              เลือกทั้งหมด
            </button>
            {filter === 'archived' ? (
              <button
                aria-disabled={Boolean(bulkRestoreDisabledReason)}
                className="missai-button-primary min-h-10 rounded-xl px-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chats-bulk-restore"
                disabled={Boolean(bulkRestoreDisabledReason)}
                onClick={() => void handleBulkRestore()}
                title={bulkRestoreDisabledReason ?? 'เอาแชทที่เลือกกลับมา'}
                type="button"
              >
                เอากลับมา
              </button>
            ) : (
              <button
                aria-disabled={Boolean(bulkArchiveDisabledReason)}
                className="missai-button-primary min-h-10 rounded-xl px-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                data-testid="my-chats-bulk-archive"
                disabled={Boolean(bulkArchiveDisabledReason)}
                onClick={() => void handleBulkArchive()}
                title={bulkArchiveDisabledReason ?? 'จัดเก็บแชทที่เลือก'}
                type="button"
              >
                จัดเก็บ
              </button>
            )}
            <button
              aria-disabled={Boolean(bulkDeleteDisabledReason)}
              className="missai-button-danger min-h-10 rounded-xl px-3 text-sm disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="my-chats-bulk-delete"
              disabled={Boolean(bulkDeleteDisabledReason)}
              onClick={() => setBulkDeleteIds(selectedChatIds)}
              title={bulkDeleteDisabledReason ?? 'ลบแชทที่เลือก'}
              type="button"
            >
              ลบ
            </button>
          </div>
        </div>
      )}

      {error && (
        <div
          className="missai-card flex flex-col gap-3 rounded-2xl border-rose-500/25 bg-rose-500/10 p-4 text-sm font-bold text-rose-300 sm:flex-row sm:items-center sm:justify-between"
          data-testid="my-chats-load-error"
          role="status"
        >
          <span>โหลดรายการแชทไม่ได้ ตรวจการเชื่อมต่อระบบหลังบ้านแล้วลองรีเฟรชอีกครั้ง</span>
          <button
            className="missai-button-danger min-h-10 rounded-xl px-3 text-xs"
            onClick={refreshChats}
            type="button"
          >
            <RefreshCw size={15} />
            รีเฟรชรายการ
          </button>
        </div>
      )}

      <div className="grid min-w-0 gap-2">
        {isListLoading && [1, 2, 3, 4].map((item) => <div className="missai-card h-28 animate-pulse rounded-2xl" key={item} />)}

        {!isListLoading &&
          visibleChats.map((chat) => {
            const pendingCount = getPendingChatEventCount(chat)
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
                className={`missai-card relative min-w-0 overflow-visible rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-neon)]/50 hover:shadow-[0_8px_26px_rgba(172,75,255,0.15)] ${
                  selectedChatIds.includes(chat.id) ? 'border-[var(--color-neon)]/50 bg-[var(--color-accent)]/10 ring-2 ring-[var(--color-accent)]/20' : ''
                } ${openMenuChatId === chat.id ? 'z-[70]' : 'z-0'}`}
                key={chat.id}
              >
                <div className="relative flex min-h-10 min-w-0 items-start gap-3 pr-24 sm:pr-32">
                  {isSelectionMode && (
                    <button
                      aria-label="เลือกแชท"
                      aria-pressed={selectedChatIds.includes(chat.id)}
                      className="missai-icon-button mt-0.5 size-9 flex-none"
                      data-testid={`my-chat-checkbox-${chat.id}`}
                      onClick={() => toggleSelectedChat(chat.id)}
                      type="button"
                    >
                      {selectedChatIds.includes(chat.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  )}
                  <img
                    alt={chat.characterName}
                    className="size-10 flex-none rounded-lg object-cover ring-1 ring-[#ac4bff]/35 missai-glow"
                    src={characterImageUrl({ id: chat.characterId, name: chat.characterName, src: chat.characterAvatarUrl })}
                  />
                  <div className="pointer-events-none min-w-0 flex-1 overflow-hidden">
                    <p className="flex min-w-0 items-center gap-1.5 font-black text-white">
                      {isPinned && <Pin className="flex-none text-amber-300" size={14} />}
                      <span className="min-w-0 max-w-full truncate">{chat.title || chat.characterName}</span>
                    </p>
                    <p className="mt-1 line-clamp-2 break-words text-sm font-semibold leading-6 text-slate-400 [overflow-wrap:anywhere]">
                      {chat.preview ? displayMessageContent(chat.preview) : 'ยังไม่มีข้อความล่าสุด'}
                    </p>
                  </div>
                  <div className="absolute right-0 top-0 z-30 flex flex-none items-center gap-2">
                    {pendingCount > 0 && (
                      <span className="missai-badge pointer-events-none border-[#ac4bff]/30 bg-[#ac4bff]/15 text-[#d9b3ff]">
                        {pendingCount} ฉาก
                      </span>
                    )}
                    <div className="relative z-20">
                      <button
                        aria-expanded={openMenuChatId === chat.id}
                        aria-haspopup="menu"
                        aria-label={`เปิดเมนูแชท ${chat.title || chat.characterName}`}
                        aria-disabled={isBusy}
                        className="missai-icon-button relative z-20 size-9 scroll-mt-28 touch-manipulation disabled:cursor-not-allowed disabled:opacity-45"
                        data-testid={`my-chat-menu-${chat.id}`}
                        disabled={isBusy}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpenMenuChatId((current) => (current === chat.id ? null : chat.id))
                        }}
                        title={isBusy ? 'กำลังจัดการแชทนี้' : `เปิดเมนูจัดการแชท ${chat.title || chat.characterName}`}
                        type="button"
                      >
                        <MoreHorizontal size={17} />
                      </button>
                      {openMenuChatId === chat.id && (
                        <div
                           className="missai-menu absolute right-0 top-10 z-[80] w-44 py-1"
                          role="menu"
                        >
                          <button
                            className="missai-menu-item"
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
                              className="missai-menu-item"
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
                              className="missai-menu-item"
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
                              className="missai-menu-item"
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
                            className="missai-menu-item"
                            data-testid={`my-chat-select-${chat.id}`}
                            onClick={() => startSelection(chat)}
                            role="menuitem"
                            type="button"
                          >
                            <CheckSquare size={15} />
                            เลือก
                          </button>
                          <button
                            className="missai-menu-item missai-menu-item-danger"
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
                  <span className="missai-badge border-sky-500/20 bg-sky-500/10 text-sky-300">{chat.characterName}</span>
                  <span className="missai-badge border-[#ac4bff]/30 bg-[#ac4bff]/15 text-[#d9b3ff]">
                    {relationshipStatusLabel(relationshipStatus)}
                  </span>
                  {relationship?.tier && (
                    <span className="missai-badge border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      {relationshipTierLabel(relationship.tier)}
                    </span>
                  )}
                  {activeScene && (
                    <span className="missai-badge border-[#f99c00]/25 bg-gradient-to-r from-[#f9c86d] to-[#f99c00] text-[#1a1206]">โหมดฉาก</span>
                  )}
                </div>
                <div className={`mt-4 flex flex-wrap gap-2 sm:justify-end ${openMenuChatId === chat.id ? 'pointer-events-none' : ''}`}>
                  <Link
                    className="missai-button-primary min-h-10 rounded-xl px-4 text-sm"
                    to={`/chat/${chat.id}`}
                  >
                    {isArchived ? 'เปิดอ่าน' : 'เข้าแชท'}
                  </Link>
                  {isArchived && (
                    <button
                      className="missai-button-secondary min-h-10 rounded-xl px-4 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                      aria-disabled={isBusy}
                      data-testid={`my-chat-restore-button-${chat.id}`}
                      disabled={isBusy}
                      onClick={() => void handleRestore(chat)}
                      title={isBusy ? 'กำลังเอาแชทกลับมา' : 'เอาแชทนี้กลับมา'}
                      type="button"
                    >
                      เอากลับมา
                    </button>
                  )}
                  {pendingCount > 0 && (
                    <Link
                      className="missai-button-secondary min-h-10 rounded-xl border-[#f99c00]/30 bg-[#f99c00]/15 px-4 text-sm text-[#f9c86d] hover:bg-[#f99c00]/25"
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
          <div className="missai-card flex flex-col items-center justify-center rounded-2xl p-8 text-center text-slate-400">
            <p className="m-0 text-sm font-bold leading-6 text-white/55">
              {filter === 'archived'
                ? hasListError
                  ? 'ยังโหลดแชทที่จัดเก็บไว้ไม่ได้ ลองรีเฟรชอีกครั้งหลังระบบหลังบ้านพร้อมใช้งาน'
                  : 'ยังไม่มีแชทที่จัดเก็บไว้ เมื่อจัดเก็บแชทจากเมนูสามจุด รายการจะมาอยู่ตรงนี้และสามารถเอากลับมาได้'
                : hasListError
                  ? 'ยังโหลดรายการแชทไม่ได้ เมื่อระบบหลังบ้านพร้อมใช้งาน รายการแชทที่เล่นค้างไว้จะแสดงที่นี่พร้อมสถานะความสัมพันธ์และฉากที่รออยู่'
                  : sourceChats.length === 0
                    ? 'ยังไม่มีแชทที่บันทึกไว้ เริ่มจากหน้าแรกแล้วห้องที่เล่นค้างไว้จะแสดงที่นี่พร้อมสถานะความสัมพันธ์และฉากที่รออยู่'
                  : filter === 'pinned'
                  ? 'ยังไม่มีแชทที่ปักหมุดไว้ เปิดเมนูสามจุดบนแชทแล้วเลือกปักหมุดเพื่อเก็บไว้ด้านบน'
                  : 'ไม่พบแชทที่ตรงกับคำค้นหาหรือตัวกรองตอนนี้'}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <Link className="missai-button-primary min-h-10 rounded-xl px-5 text-sm" to="/">
                ไปสำรวจตัวละคร
              </Link>
              <Link
                className="missai-button-secondary min-h-10 rounded-xl px-5 text-sm"
                to="/create"
              >
                สร้างตัวละครของฉัน
              </Link>
            </div>
          </div>
        )}
      </div>

      {renameTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" data-testid="my-chat-rename-dialog">
          <div className="missai-dialog w-full max-w-md p-6">
            <h2 className="font-display m-0 text-xl font-black text-white">แก้ไขชื่อแชท</h2>
            <p className="m-0 mt-1.5 text-sm font-bold leading-relaxed text-slate-400">ตั้งชื่อให้จำง่ายขึ้น ข้อความเดิมและสถานะความสัมพันธ์จะยังอยู่ครบ</p>
            <input
              className="missai-input mt-4 min-h-11"
              data-testid="my-chat-rename-input"
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setRenameTarget(null)
                if (event.key === 'Enter') void confirmRename()
              }}
              value={renameValue}
            />
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="missai-button-secondary min-h-11 rounded-xl text-sm"
                data-testid="my-chat-rename-cancel"
                onClick={() => setRenameTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="missai-button-primary min-h-11 rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-45"
                aria-disabled={Boolean(renameConfirmDisabledReason)}
                data-testid="my-chat-rename-confirm"
                disabled={Boolean(renameConfirmDisabledReason)}
                onClick={() => void confirmRename()}
                title={renameConfirmDisabledReason || 'บันทึกชื่อแชท'}
                type="button"
              >
                {pendingAction === `rename:${renameTarget.id}` ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" data-testid="my-chat-delete-dialog">
          <div className="missai-dialog w-full max-w-md p-6">
            <h2 className="font-display m-0 text-xl font-black text-white">ลบแชทนี้?</h2>
            <p className="m-0 mt-2 text-sm font-bold leading-relaxed text-slate-400">
              {deleteTarget.title || deleteTarget.characterName} จะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="missai-button-secondary min-h-11 rounded-xl text-sm"
                data-testid="my-chat-delete-cancel"
                onClick={() => setDeleteTarget(null)}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="missai-button-danger min-h-11 rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-45"
                aria-disabled={Boolean(deleteConfirmDisabledReason)}
                data-testid="my-chat-delete-confirm"
                disabled={Boolean(deleteConfirmDisabledReason)}
                onClick={() => void confirmDelete()}
                title={deleteConfirmDisabledReason || 'ยืนยันลบแชทนี้'}
                type="button"
              >
                {pendingAction === `delete:${deleteTarget.id}` ? 'กำลังลบ...' : 'ลบแชท'}
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkDeleteIds.length > 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" data-testid="my-chats-bulk-delete-dialog">
          <div className="missai-dialog w-full max-w-md p-6">
            <h2 className="font-display m-0 text-xl font-black text-white">ลบแชทที่เลือก?</h2>
            <p className="m-0 mt-2 text-sm font-bold leading-relaxed text-slate-400">
              แชท {bulkDeleteIds.length.toLocaleString()} รายการจะถูกนำออกจากรายการแชทของคุณ
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                className="missai-button-secondary min-h-11 rounded-xl text-sm"
                data-testid="my-chats-bulk-delete-cancel"
                onClick={() => setBulkDeleteIds([])}
                type="button"
              >
                ยกเลิก
              </button>
              <button
                className="missai-button-danger min-h-11 rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-45"
                aria-disabled={Boolean(bulkDeleteConfirmDisabledReason)}
                data-testid="my-chats-bulk-delete-confirm"
                disabled={Boolean(bulkDeleteConfirmDisabledReason)}
                onClick={() => void confirmBulkDelete()}
                title={bulkDeleteConfirmDisabledReason || 'ยืนยันลบแชทที่เลือก'}
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
