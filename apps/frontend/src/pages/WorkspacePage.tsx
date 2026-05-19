import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChatPanel } from '../components/ChatPanel'
import { ReportDialog, type ReportDialogSubmit, type ReportDialogTarget } from '../components/ReportDialog'
import { Sidebar } from '../components/Sidebar'
import {
  archiveChat as archiveSavedChat,
  createCharacter,
  createReport,
  createLoreEntry,
  deleteCharacter,
  deleteChat as deleteSavedChat,
  deleteLoreEntry,
  duplicateCharacter,
  fetchAdminSummary,
  fetchCharacters,
  fetchChatMessages,
  fetchChats,
  fetchHealthStatus,
  fetchLoreEntries,
  fetchUsageSummary,
  resetCharacterPrompt,
  sendChatMessage,
  setCharacterFavorite,
  shouldLogUnexpectedError,
  streamChatMessage,
  trackCharacterView,
  updateCharacter,
  updateChatWorldState as updateSavedChatWorldState,
  updateChatTitle as updateSavedChatTitle,
  updateLoreEntry,
  ApiError,
  type Character,
  type AdminSummary,
  type CharacterInput,
  type CharacterListFilters,
  type ChatMessage,
  type ChatResponse,
  type ChatRuntimeState,
  type ChatSummary,
  type HealthStatus,
  type LoreEntry,
  type LoreInput,
  type WorldStateInput,
} from '../lib/api'
import { getAuthState } from '../lib/auth'
import { createGreeting, fallbackCharacter } from '../lib/chat'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { isPlayableChatSummary } from '../store/slices/chatsSlice'
import { selectContentSettings } from '../store/slices/contentSlice'
import { saveComposerDraft, selectComposerDraft, selectPersonaDraft } from '../store/slices/draftsSlice'
import { selectTokenBalance, selectWalletLoading, setTokenBalance } from '../store/slices/walletSlice'

type ChatUsage = NonNullable<ChatResponse['usage']>
type WorkspaceReportTarget =
  | (ReportDialogTarget & { targetType: 'MESSAGE'; messageId: string; role: ChatMessage['role'] })
  | (ReportDialogTarget & { targetType: 'CHARACTER'; characterId: string })

function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 401) return 'กรุณาเข้าสู่ระบบใหม่ เซสชันอาจหมดอายุแล้ว'
  if (error.status === 403) return 'บัญชีนี้ไม่มีสิทธิ์ทำคำสั่งนี้'
  if (error.status === 404) return 'ไม่พบข้อมูลนี้ หรือข้อมูลเป็นของบัญชีอื่น'
  if (error.status === 413) return 'ไฟล์ที่อัปโหลดมีขนาดใหญ่เกินไป'
  if (error.status === 415) return 'ไม่รองรับไฟล์ประเภทนี้'
  if (error.status === 422) return 'ข้อมูลที่ส่งยังไม่ครบหรือไม่ถูกต้อง'
  if (error.status === 429) return 'มีคำขอมากเกินไป กรุณารอสักครู่แล้วลองใหม่'
  return fallback
}

function isExpectedUserApiError(error: unknown) {
  return error instanceof ApiError && [401, 403, 404, 413, 415, 422, 429].includes(error.status)
}

function logUnexpectedWorkspaceError(label: string, error: unknown) {
  if (shouldLogUnexpectedError(error)) console.error(label, error)
}

function hasStoredAdminKey() {
  return typeof window !== 'undefined' && Boolean(window.localStorage.getItem('maprang:adminKey')?.trim())
}

function shouldUseNonStreamingFallback(error: unknown) {
  return !(error instanceof ApiError && [401, 403, 404, 422, 429].includes(error.status))
}

function defaultSceneState(): ChatRuntimeState['sceneState'] {
  return {
    currentScene: 'sandbox',
    lastUserIntent: 'conversation',
    mode: 'sandbox',
    pendingEvents: [],
    activeScene: null,
    sceneOutcomes: [],
    eventCooldowns: {},
    consumedEvents: [],
    declinedEvents: [],
    updatedAt: '',
  }
}

function defaultMemoryState(): ChatRuntimeState['memory'] {
  return {
    summary: '',
    facts: [],
    turnCount: 0,
    updatedAt: '',
  }
}

function defaultRelationshipState(): ChatRuntimeState['relationshipState'] {
  return {
    affinity: 0,
    trust: 0,
    intimacy: 0,
    dominance: 0,
    fear: 0,
    respect: 0,
    route: 'general',
    arcStage: 'setup',
    status: 'NEUTRAL',
    tier: 'neutral',
    tone: 'neutral',
    flags: [],
    constraints: [],
    events: [],
    multipliers: {
      affinityGain: 1,
      trustGain: 1,
      intimacyGain: 1,
      respectGain: 1,
    },
    normalized: {
      affinity: 0,
      trust: 0,
      intimacy: 0,
      dominance: 0,
      fear: 0,
      respect: 0,
    },
    promptProfile: '',
    tagProfile: {
      discovery: [],
      engine: [],
      safety: [],
      unknown: [],
    },
    updatedAt: '',
  }
}

export function WorkspacePage() {
  const reduxDispatch = useAppDispatch()
  const navigate = useNavigate()
  const { chatId: routeChatId } = useParams()
  const [searchParams] = useSearchParams()
  const routeCharacterId = searchParams.get('characterId')
  const relationshipSeed = searchParams.get('relationship_seed')
  const [message, setMessage] = useState('')
  const [character, setCharacter] = useState<Character>(fallbackCharacter)
  const [characters, setCharacters] = useState<Character[]>([fallbackCharacter])
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatLog, setChatLog] = useState<ChatMessage[]>([createGreeting(fallbackCharacter)])
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>([])
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [adminSummary, setAdminSummary] = useState<AdminSummary | null>(null)
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([])
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null)
  const [runtimeState, setRuntimeState] = useState<ChatRuntimeState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [isLoreLoading, setIsLoreLoading] = useState(false)
  const [isWorldStateSaving, setIsWorldStateSaving] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSavingCharacter, setIsSavingCharacter] = useState(false)
  const [isSavingLore, setIsSavingLore] = useState(false)
  const [reportTarget, setReportTarget] = useState<WorkspaceReportTarget | null>(null)
  const [isReporting, setIsReporting] = useState(false)
  const [connectionNote, setConnectionNote] = useState('กำลังโหลดตัวละครจากฐานข้อมูล...')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lastUsageChatIdRef = useRef<string | null>(null)
  const draftKey = chatId ? `chat:${chatId}` : `character:${character.id}`
  const savedDraft = useAppSelector(selectComposerDraft(draftKey))
  const personaDraft = useAppSelector(selectPersonaDraft)
  const contentSettings = useAppSelector(selectContentSettings)
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isWalletLoading = useAppSelector(selectWalletLoading)

  const visibleHistory = useMemo(
    () =>
      chatLog
        .filter((chat) => chat.role !== 'system')
        .slice(-10)
        .map((chat) => ({
          role: chat.role as 'user' | 'assistant',
          content: chat.content,
        })),
    [chatLog],
  )

  const loadHealthStatus = useCallback(async () => {
    try {
      const health = await fetchHealthStatus()
      setHealthStatus(health)
      if (!health.checks.databaseConnected) {
        setConnectionNote('บริการแชททำงานแล้ว แต่ฐานข้อมูลยังไม่พร้อม')
        return
      }
      if (!health.checks.openRouterConfigured) {
        setConnectionNote('ฐานข้อมูลพร้อมแล้ว แต่บริการ AI ยังไม่พร้อม')
        return
      }
      if (!health.checks.imageGenerationConfigured) {
        setConnectionNote('แชทพร้อมแล้ว แต่ AI สร้างรูปยังใช้ภาพตัวอย่างจนกว่าจะตั้งค่าผู้ให้บริการสร้างรูป')
        return
      }
      setConnectionNote('ฐานข้อมูลและบริการ AI เชื่อมต่อแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Load health status error:', error)
      setHealthStatus(null)
      setConnectionNote('เชื่อมต่อบริการแชทไม่ได้')
    }
  }, [])

  const loadUsageSummary = useCallback(async () => {
    try {
      const data = await fetchUsageSummary()
      reduxDispatch(setTokenBalance(data.user.tokenBalance))
    } catch (error) {
      logUnexpectedWorkspaceError('Load usage summary error:', error)
    }
  }, [reduxDispatch])

  const loadAdminSummary = useCallback(async () => {
    if (!hasStoredAdminKey()) {
      setAdminSummary(null)
      return
    }

    try {
      const data = await fetchAdminSummary()
      setAdminSummary(data)
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setAdminSummary(null)
        return
      }
      logUnexpectedWorkspaceError('Load admin summary error:', error)
      setAdminSummary(null)
    }
  }, [])

  const loadChatHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    try {
      const data = await fetchChats()
      setChatHistory((data.chats ?? []).filter(isPlayableChatSummary))
    } catch (error) {
      logUnexpectedWorkspaceError('Load chat history error:', error)
      setChatHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  const loadCharacters = useCallback(async (filters: CharacterListFilters = { view: 'admin', sort: 'popular', limit: 40 }) => {
    const data = await fetchCharacters(filters)
    const loadedCharacters = data.characters?.length ? data.characters : [fallbackCharacter]
    setCharacters(loadedCharacters)
    return loadedCharacters
  }, [])

  const loadLoreEntries = useCallback(async (characterId: string) => {
    setIsLoreLoading(true)
    try {
      const data = await fetchLoreEntries(characterId)
      setLoreEntries(data.loreEntries ?? [])
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setLoreEntries([])
        return
      }
      logUnexpectedWorkspaceError('Load lore error:', error)
      setLoreEntries([])
    } finally {
      setIsLoreLoading(false)
    }
  }, [])

  async function reloadWorkspaceAfterAuthChange() {
    await getAuthState()
    await loadHealthStatus()
    const loadedCharacters = await loadCharacters()
    const nextCharacter = loadedCharacters.find((item) => item.id === character.id) ?? loadedCharacters[0] ?? fallbackCharacter
    setCharacter(nextCharacter)
    setChatId(null)
    setRuntimeState(null)
    setChatLog([createGreeting(nextCharacter)])
    await loadLoreEntries(nextCharacter.id)
    await loadChatHistory()
    await loadUsageSummary()
    await loadAdminSummary()
  }

  useEffect(() => {
    setMessage(savedDraft)
  }, [draftKey, savedDraft])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog, isLoading])

  const updateMessageDraft = (nextMessage: string) => {
    setMessage(nextMessage)
    reduxDispatch(saveComposerDraft({ key: draftKey, value: nextMessage }))
  }

  const chatRouteForCharacter = (characterId: string) => `/chat?characterId=${encodeURIComponent(characterId)}`

  const promoteChatRoute = (nextChatId: string) => {
    if (routeChatId !== nextChatId) navigate(`/chat/${nextChatId}`, { replace: true })
  }

  const startNewChat = () => {
    setChatId(null)
    lastUsageChatIdRef.current = null
    setLastUsage(null)
    setRuntimeState(null)
    setChatLog([createGreeting(character)])
    navigate(chatRouteForCharacter(character.id))
  }

  const selectCharacter = async (nextCharacter: Character) => {
    setCharacter(nextCharacter)
    setChatId(null)
    lastUsageChatIdRef.current = null
    setLastUsage(null)
    setRuntimeState(null)
    setMessage('')
    setChatLog([createGreeting(nextCharacter)])
    setConnectionNote(`เลือก ${nextCharacter.name} แล้ว`)
    navigate(chatRouteForCharacter(nextCharacter.id))
    try {
      const data = await trackCharacterView(nextCharacter.id)
      setCharacter(data.character)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
    } catch (error) {
      logUnexpectedWorkspaceError('Track character view error:', error)
    }
    await loadLoreEntries(nextCharacter.id)
  }

  const openChat = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const data = await fetchChatMessages(id)
      if (!data.chat) return
      setChatId(data.chat.id)
      setLastUsage((current) => (lastUsageChatIdRef.current === data.chat!.id ? current : null))
      setRuntimeState({
        memory: { ...defaultMemoryState(), ...(data.chat.memory ?? {}) },
        sceneState: { ...defaultSceneState(), ...(data.chat.sceneState ?? {}) },
        relationshipState: data.chat.relationshipState ?? {
          ...defaultRelationshipState(),
        },
      })
      setCharacter(data.chat.character)
      setChatLog(data.chat.messages.length > 0 ? data.chat.messages : [createGreeting(data.chat.character)])
      await loadLoreEntries(data.chat.character.id)
    } catch (error) {
      logUnexpectedWorkspaceError('Open chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsLoading(false)
    }
  }, [loadLoreEntries])

  useEffect(() => {
    async function boot() {
      if (routeChatId) {
        setIsLoading(true)
        setConnectionNote('กำลังโหลดแชทที่บันทึกไว้...')
      }
      await getAuthState()
      await loadHealthStatus()

      try {
        const loadedCharacters = await loadCharacters()
        if (!routeChatId) {
          const firstCharacter = loadedCharacters.find((item) => item.id === routeCharacterId) ?? loadedCharacters[0] ?? fallbackCharacter
          setCharacter(firstCharacter)
          setChatLog([
            createGreeting(firstCharacter),
            ...(relationshipSeed
              ? [
                  {
                    id: crypto.randomUUID(),
                    role: 'assistant' as const,
                    content: `เลือกจุดเริ่มต้นความสัมพันธ์: ${relationshipSeed} แชทนี้จะเริ่มจากสัญญาอารมณ์นี้`,
                  },
                ]
              : []),
          ])
          await loadLoreEntries(firstCharacter.id)
        }
      } catch (error) {
        logUnexpectedWorkspaceError('Load character error:', error)
        setConnectionNote('เชื่อมต่อบริการแชทไม่ได้')
      }

      await loadChatHistory()
      await loadUsageSummary()
      await loadAdminSummary()
      if (routeChatId) await openChat(routeChatId)
    }

    void boot()
  }, [
    loadAdminSummary,
    loadCharacters,
    loadChatHistory,
    loadHealthStatus,
    loadLoreEntries,
    loadUsageSummary,
    openChat,
    relationshipSeed,
    routeCharacterId,
    routeChatId,
  ])

  const archiveChat = async (id: string) => {
    try {
      await archiveSavedChat(id)
      if (chatId === id) startNewChat()
      await loadChatHistory()
      await loadAdminSummary()
      setConnectionNote('จัดเก็บแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Archive chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const renameChat = async (id: string, title: string) => {
    try {
      await updateSavedChatTitle(id, title)
      await loadChatHistory()
      setConnectionNote('เปลี่ยนชื่อแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Rename chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'เปลี่ยนชื่อแชทไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const removeChat = async (id: string) => {
    try {
      await deleteSavedChat(id)
      if (chatId === id) startNewChat()
      await loadChatHistory()
      await loadAdminSummary()
      setConnectionNote('ลบแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Delete chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'ลบแชทไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const toggleFavorite = async (characterId: string, favorite: boolean) => {
    try {
      const data = await setCharacterFavorite(characterId, favorite)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      if (character.id === data.character.id) setCharacter(data.character)
      setConnectionNote(favorite ? `เพิ่ม ${data.character.name} ในรายการโปรดแล้ว` : `นำ ${data.character.name} ออกจากรายการโปรดแล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Favorite character error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const saveCharacter = async (input: CharacterInput) => {
    setIsSavingCharacter(true)
    try {
      const data = await updateCharacter(character.id, input)
      setCharacter(data.character)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      setChatLog((prev) => (prev.length === 1 && prev[0]?.role === 'assistant' ? [createGreeting(data.character)] : prev))
      setConnectionNote(`บันทึก ${data.character.name} แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Save character error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const createNewCharacter = async (input: CharacterInput) => {
    setIsSavingCharacter(true)
    try {
      const data = await createCharacter(input)
      setCharacter(data.character)
      setCharacters((prev) => [data.character, ...prev.filter((item) => item.id !== data.character.id)])
      setChatId(null)
      lastUsageChatIdRef.current = null
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(data.character)])
      setConnectionNote(`บันทึก ${data.character.name} แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Create character error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const duplicateSelectedCharacter = async () => {
    setIsSavingCharacter(true)
    try {
      const data = await duplicateCharacter(character.id)
      setCharacter(data.character)
      setCharacters((prev) => [data.character, ...prev.filter((item) => item.id !== data.character.id)])
      setChatId(null)
      lastUsageChatIdRef.current = null
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(data.character)])
      setConnectionNote(`อัปเดต ${character.name} แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Duplicate character error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const resetSelectedCharacterPrompt = async () => {
    setIsSavingCharacter(true)
    try {
      const data = await resetCharacterPrompt(character.id)
      setCharacter(data.character)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      setChatLog((prev) => (prev.length === 1 && prev[0]?.role === 'assistant' ? [createGreeting(data.character)] : prev))
      setConnectionNote(`บันทึก ${data.character.name} แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Reset prompt error:', error)
      setConnectionNote(apiErrorMessage(error, 'รีเซ็ตพรอมป์ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const deleteSelectedCharacter = async () => {
    setIsSavingCharacter(true)
    try {
      await deleteCharacter(character.id)
      const remaining = characters.filter((item) => item.id !== character.id)
      const nextCharacter = remaining[0] ?? fallbackCharacter
      setCharacters(remaining.length > 0 ? remaining : [fallbackCharacter])
      setCharacter(nextCharacter)
      setChatId(null)
      lastUsageChatIdRef.current = null
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(nextCharacter)])
      setConnectionNote(`อัปเดต ${character.name} แล้ว`)
      await loadLoreEntries(nextCharacter.id)
    } catch (error) {
      logUnexpectedWorkspaceError('Delete character error:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const createNewLore = async (input: LoreInput) => {
    setIsSavingLore(true)
    try {
      const data = await createLoreEntry(character.id, input)
      setLoreEntries((prev) => [data.loreEntry, ...prev])
      setConnectionNote(`บันทึก lore "${data.loreEntry.keyword}" แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Create lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'อัปเดต lore ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingLore(false)
    }
  }

  const saveLore = async (loreId: string, input: Partial<LoreInput>) => {
    setIsSavingLore(true)
    try {
      const data = await updateLoreEntry(loreId, input)
      setLoreEntries((prev) => prev.map((entry) => (entry.id === loreId ? data.loreEntry : entry)))
      setConnectionNote(`บันทึก lore "${data.loreEntry.keyword}" แล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('Update lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'อัปเดต lore ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingLore(false)
    }
  }

  const removeLore = async (loreId: string) => {
    setIsSavingLore(true)
    try {
      await deleteLoreEntry(loreId)
      setLoreEntries((prev) => prev.filter((entry) => entry.id !== loreId))
      setConnectionNote('อัปเดต lore แล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Delete lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'อัปเดต lore ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsSavingLore(false)
    }
  }

  const sendMessage = async (value = message) => {
    const currentMsg = value.trim()
    if (!currentMsg || isLoading) return

    const sceneCommand = currentMsg.match(/^\/scene\s+(enter|hold|decline|exit|resolve|accept|reject)\s*([a-z0-9_-]+)?/i)
    const userFacingMessage = sceneCommand
      ? sceneCommand[1] === 'enter'
        ? 'เข้าฉากนี้'
        : sceneCommand[1] === 'hold'
          ? 'เก็บฉากนี้ไว้ก่อน'
          : sceneCommand[1] === 'decline'
            ? 'ข้ามฉากนี้'
            : sceneCommand[1] === 'resolve'
              ? 'จบฉากนี้'
              : sceneCommand[1] === 'accept'
                ? 'ยอมรับผลลัพธ์ของฉากนี้'
                : sceneCommand[1] === 'reject'
                  ? 'ปฏิเสธผลลัพธ์ของฉากนี้'
                  : 'ออกจากฉากนี้'
      : currentMsg
    const assistantMessageId = crypto.randomUUID()
    setChatLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: userFacingMessage },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ])
    if (!sceneCommand) {
      setMessage('')
      reduxDispatch(saveComposerDraft({ key: draftKey, value: '' }))
    }
    setIsLoading(true)
    let completedChatId = chatId

    try {
      await streamChatMessage(
        {
          message: currentMsg,
          characterId: character.id,
          chatId,
          relationshipSeed: chatId ? undefined : relationshipSeed ?? undefined,
          userPersona: personaDraft.trim() || undefined,
          maxRating: contentSettings.maxRating,
          history: visibleHistory,
        },
        (event) => {
          if (event.type === 'delta') {
            setChatLog((prev) =>
              prev.map((chat) =>
                chat.id === assistantMessageId ? { ...chat, content: chat.content + event.content } : chat,
              ),
            )
          }

          if (event.type === 'done') {
            if (event.chatId) {
              completedChatId = event.chatId
              setChatId(event.chatId)
              promoteChatRoute(event.chatId)
            }
            lastUsageChatIdRef.current = event.chatId ?? completedChatId
            setLastUsage(event.usage)
            if (typeof event.usage.tokenBalance === 'number') reduxDispatch(setTokenBalance(event.usage.tokenBalance))
            if (event.memory) setRuntimeState(event.memory)
          }

          if (event.type === 'error') {
            setChatLog((prev) =>
              prev.map((chat) => (chat.id === assistantMessageId ? { ...chat, content: event.message } : chat)),
            )
          }
        },
      )
      if (completedChatId) await syncOpenChatMessages(completedChatId)
      await loadChatHistory()
      await loadAdminSummary()
    } catch (error) {
      if (!isExpectedUserApiError(error)) logUnexpectedWorkspaceError('Chat error:', error)
      const streamMessage = apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่')
      if (!shouldUseNonStreamingFallback(error)) {
        setConnectionNote(streamMessage)
        setChatLog((prev) =>
          prev.map((chat) =>
            chat.id === assistantMessageId
              ? {
                  ...chat,
                  content: streamMessage,
                }
              : chat,
          ),
        )
        return
      }

      try {
        const data = await sendChatMessage({
          message: currentMsg,
          characterId: character.id,
          chatId,
          relationshipSeed: chatId ? undefined : relationshipSeed ?? undefined,
          userPersona: personaDraft.trim() || undefined,
          maxRating: contentSettings.maxRating,
          history: visibleHistory,
        })
        if (data.chatId) {
          completedChatId = data.chatId
          setChatId(data.chatId)
          promoteChatRoute(data.chatId)
        }
        if (data.usage) {
          lastUsageChatIdRef.current = data.chatId ?? completedChatId
          setLastUsage(data.usage)
          if (typeof data.usage.tokenBalance === 'number') reduxDispatch(setTokenBalance(data.usage.tokenBalance))
        }
        if (data.memory) setRuntimeState(data.memory)
        setChatLog((prev) =>
          prev.map((chat) =>
            chat.id === assistantMessageId
              ? {
                  ...chat,
                  content: data.reply?.trim() || 'มะปรางยังตอบไม่ได้ในตอนนี้ กรุณาลองถามใหม่',
                }
              : chat,
          ),
        )
        if (completedChatId) await syncOpenChatMessages(completedChatId)
        await loadChatHistory()
      } catch (fallbackError) {
        if (!isExpectedUserApiError(fallbackError)) logUnexpectedWorkspaceError('Chat fallback error:', fallbackError)
        const fallbackMessage = apiErrorMessage(
          fallbackError,
          streamMessage || 'เชื่อมต่อบริการ AI ไม่ได้ กรุณาตรวจการตั้งค่าระบบแชท',
        )
        setConnectionNote(fallbackMessage)
        setChatLog((prev) =>
          prev.map((chat) =>
            chat.id === assistantMessageId
              ? {
                  ...chat,
                  content: fallbackMessage,
                }
              : chat,
          ),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSceneAction = (
    action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject',
    code?: string,
  ) => {
    const command = `/scene ${action}${code ? ` ${code}` : ''}`
    sendMessage(command)
  }

  const saveWorldState = async (input: WorldStateInput) => {
    if (!chatId) {
      setConnectionNote('ต้องเริ่มแชทให้ระบบสร้างห้องก่อน แล้วค่อยบันทึกสถานะโลก')
      return
    }

    setIsWorldStateSaving(true)
    try {
      const data = await updateSavedChatWorldState(chatId, input)
      setRuntimeState((current) => ({
        memory: {
          ...defaultMemoryState(),
          ...(current?.memory ?? {}),
          worldState: data.worldState,
        },
        sceneState: current?.sceneState ?? defaultSceneState(),
        relationshipState: current?.relationshipState ?? defaultRelationshipState(),
      }))
      setConnectionNote('บันทึกสถานะโลกของแชทนี้แล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('Save world state error:', error)
      setConnectionNote(apiErrorMessage(error, 'บันทึกสถานะโลกไม่สำเร็จ กรุณาลองใหม่'))
      throw error
    } finally {
      setIsWorldStateSaving(false)
    }
  }

  const syncOpenChatMessages = async (id: string) => {
    try {
      const data = await fetchChatMessages(id)
      if (!data.chat) return
      setChatLog(data.chat.messages.length > 0 ? data.chat.messages : [createGreeting(data.chat.character)])
      setRuntimeState({
        memory: { ...defaultMemoryState(), ...(data.chat.memory ?? {}) },
        sceneState: { ...defaultSceneState(), ...(data.chat.sceneState ?? {}) },
        relationshipState: data.chat.relationshipState ?? {
          ...defaultRelationshipState(),
        },
      })
    } catch (error) {
      logUnexpectedWorkspaceError('Sync chat messages error:', error)
    }
  }

  const openMessageReport = (chat: ChatMessage) => {
    if (isLoading || chat.role === 'system' || !chat.content.trim()) return
    setReportTarget({
      targetType: 'MESSAGE',
      title: `ข้อความจาก${chat.role === 'assistant' ? character.name : 'ผู้ใช้'}`,
      preview: chat.content,
      messageId: chat.id,
      role: chat.role,
    })
  }

  const openCharacterReport = () => {
    if (!character.id) return
    setReportTarget({
      targetType: 'CHARACTER',
      title: character.name,
      preview: character.biography || character.description || character.tagline || character.greeting || '',
      characterId: character.id,
    })
  }

  const reportMessage = async ({ reason, details }: ReportDialogSubmit) => {
    if (!reportTarget || isReporting) return
    setIsReporting(true)
    setConnectionNote(reportTarget.targetType === 'CHARACTER' ? 'กำลังส่งรายงานตัวละคร...' : 'กำลังส่งรายงานข้อความ...')
    try {
      if (reportTarget.targetType === 'CHARACTER') {
        await createReport({
          targetType: 'CHARACTER',
          characterId: reportTarget.characterId,
          reason,
          details: details || `รายงานตัวละคร ${character.name} จากหน้าห้องแชท`,
          metadata: {
            chatId,
            tags: character.tags,
            status: character.status,
            visibility: character.visibility,
          },
        })
      } else {
        await createReport({
          targetType: 'MESSAGE',
          messageId: reportTarget.messageId,
          reason,
          details: details || `รายงานข้อความจาก ${reportTarget.role} ในห้องแชท`,
          metadata: {
            chatId,
            characterId: character.id,
            role: reportTarget.role,
          },
        })
      }
      setConnectionNote(reportTarget.targetType === 'CHARACTER' ? 'ส่งรายงานตัวละครให้ผู้ดูแลตรวจแล้ว' : 'ส่งรายงานข้อความให้ผู้ดูแลตรวจแล้ว')
      setReportTarget(null)
      await loadAdminSummary()
    } catch (error) {
      logUnexpectedWorkspaceError('Report error:', error)
      setConnectionNote(apiErrorMessage(error, 'ส่งรายงานไม่ได้ กรุณาลองใหม่หลังแชทซิงก์เสร็จ'))
    } finally {
      setIsReporting(false)
    }
  }

  return (
    <main className="grid h-svh grid-cols-1 overflow-hidden bg-[#111113] text-white md:grid-cols-[246px_minmax(0,1fr)]">
      <Sidebar
        character={character}
        adminSummary={adminSummary}
        characters={characters}
        chatHistory={chatHistory}
        chatId={chatId}
        runtimeState={runtimeState}
        connectionNote={connectionNote}
        healthStatus={healthStatus}
        isHistoryLoading={isHistoryLoading}
        isLoreLoading={isLoreLoading}
        isMobileOpen={isMobileMenuOpen}
        isSavingCharacter={isSavingCharacter}
        isSavingLore={isSavingLore}
        loreEntries={loreEntries}
        onArchiveChat={archiveChat}
        onAuthChanged={reloadWorkspaceAfterAuthChange}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onCreateCharacter={createNewCharacter}
        onCreateLore={createNewLore}
        onDeleteCharacter={deleteSelectedCharacter}
        onDeleteChat={removeChat}
        onDeleteLore={removeLore}
        onDuplicateCharacter={duplicateSelectedCharacter}
        onFilterCharacters={loadCharacters}
        onFavoriteCharacter={toggleFavorite}
        onLoadChatHistory={loadChatHistory}
        onLoadHealth={loadHealthStatus}
        onLoadAdminSummary={loadAdminSummary}
        onLoadLore={() => loadLoreEntries(character.id)}
        onOpenChat={openChat}
        onResetCharacterPrompt={resetSelectedCharacterPrompt}
        onSaveCharacter={saveCharacter}
        onRenameChat={renameChat}
        onSelectCharacter={selectCharacter}
        onStartNewChat={startNewChat}
        onUpdateLore={saveLore}
      />

      <ChatPanel
        character={character}
        chatEndRef={chatEndRef}
        chatId={chatId}
        chatLog={chatLog}
        isLoading={isLoading}
        isWalletLoading={isWalletLoading}
        lastUsage={lastUsage}
        tokenBalance={tokenBalance}
        runtimeState={runtimeState}
        message={message}
        isWorldStateSaving={isWorldStateSaving}
        onMessageChange={updateMessageDraft}
        onFavoriteCharacter={toggleFavorite}
        onOpenCharacterProfile={() => navigate(`/characters/${character.id}`)}
        onOpenChats={() => navigate('/chats')}
        onOpenWallet={() => navigate('/wallet')}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        onReportCharacter={openCharacterReport}
        onReportMessage={openMessageReport}
        onSaveWorldState={saveWorldState}
        onSceneAction={handleSceneAction}
        onSendMessage={sendMessage}
        onStartNewChat={startNewChat}
      />

      <ReportDialog
        isOpen={Boolean(reportTarget)}
        isSubmitting={isReporting}
        onClose={() => setReportTarget(null)}
        onSubmit={reportMessage}
        target={reportTarget}
      />
    </main>
  )
}
