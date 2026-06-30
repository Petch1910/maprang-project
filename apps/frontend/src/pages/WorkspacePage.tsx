import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ChatPanel } from '../components/ChatPanel'
import { ReportDialog } from '../components/ReportDialog'
import { Sidebar } from '../components/Sidebar'
import { useWorkspaceChatHistory } from '../hooks/useWorkspaceChatHistory'
import { useWorkspaceReports } from '../hooks/useWorkspaceReports'
import { useWorkspaceWorldState } from '../hooks/useWorkspaceWorldState'
import {
  archiveChat as archiveSavedChat,
  deleteChat as deleteSavedChat,
  fetchCharacters,
  fetchChatMessages,
  fetchHealthStatus,
  fetchUsageSummary,
  sendChatMessage,
  setCharacterFavorite,
  streamChatMessage,
  trackCharacterView,
  updateChatTitle as updateSavedChatTitle,
  type Character,
  type CharacterListFilters,
  type ChatMessage,
  type ChatResponse,
  type HealthStatus,
  type ChatRuntimeState,
} from '../lib/api'
import { getAuthState } from '../lib/auth'
import { createGreeting } from '../lib/chat'
import { defaultChatReplySettings, type ChatReplySettings } from '../lib/chatReplySettings'
import { canShowQaSeedData, filterVisibleCharacters, isQaSeedCharacter } from '../lib/qaSeedVisibility'
import { relationshipSeedLabel } from '../lib/relationshipLabels'
import {
  apiErrorMessage,
  isExpectedUserApiError,
  logUnexpectedWorkspaceError,
  savedChatMessageWindowLimit,
  savedChatRuntimeState,
  shouldUseNonStreamingFallback,
} from '../lib/workspaceRuntime'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { selectContentSettings } from '../store/slices/contentSlice'
import { saveComposerDraft, selectComposerDraft, selectPersonaDraft } from '../store/slices/draftsSlice'
import { selectTokenBalance, selectWalletLoading, setTokenBalance } from '../store/slices/walletSlice'

type ChatUsage = NonNullable<ChatResponse['usage']>

function EmptyChatWorkspace({
  isLoading,
  note,
  onCreateCharacter,
  onExplore,
  onRetry,
}: {
  isLoading: boolean
  note: string
  onCreateCharacter: () => void
  onExplore: () => void
  onRetry: () => void
}) {
  return (
    <main className="grid h-svh place-items-center overflow-hidden bg-[#080a1a] px-4 text-white">
      <section
        className="missai-card w-full max-w-xl rounded-3xl p-8 text-center shadow-2xl"
        data-testid="chat-empty-character-state"
      >
        <p className="m-0 text-xs font-black tracking-[0.2em] text-[#d9b3ff]/75 uppercase">Maprang Chat</p>
        <h1 className="font-display m-0 mt-3.5 text-2xl font-black text-white sm:text-3xl">ยังไม่มีตัวละครพร้อมเริ่มแชท</h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-semibold leading-relaxed text-slate-400">
          {isLoading
            ? 'กำลังโหลดข้อมูลจริงจากระบบหลังบ้าน...'
            : 'หน้าแชทจะไม่ใช้ตัวละครที่ไม่ได้มาจากระบบหลังบ้านแทนข้อมูลจริง ถ้ายังไม่มีตัวละคร ให้สร้างตัวละครหรือกลับไปสำรวจก่อน'}
        </p>
        {note && <p className="mt-5 rounded-2xl border border-white/5 bg-[#0b0d1f]/60 px-4 py-3 text-sm font-semibold text-slate-300">{note}</p>}
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <button
            className="min-h-11 rounded-xl bg-gradient-to-r from-[#ac4bff] to-[#8b5cf6] px-4 text-sm font-black text-white transition hover:brightness-110 missai-glow"
            onClick={onCreateCharacter}
            type="button"
          >
            สร้างตัวละคร
          </button>
          <button
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={onExplore}
            type="button"
          >
            กลับไปสำรวจ
          </button>
          <button
            aria-disabled={isLoading}
            className="min-h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-black text-slate-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={onRetry}
            title={isLoading ? 'กำลังโหลดข้อมูลจริงจากระบบหลังบ้าน' : 'โหลดข้อมูลตัวละครอีกครั้ง'}
            type="button"
          >
            รีเฟรช
          </button>
        </div>
      </section>
    </main>
  )
}

export function WorkspacePage() {
  const reduxDispatch = useAppDispatch()
  const navigate = useNavigate()
  const { chatId: routeChatId } = useParams()
  const [searchParams] = useSearchParams()
  const routeCharacterId = searchParams.get('characterId')
  const relationshipSeed = searchParams.get('relationship_seed')
  const relationshipSeedName = relationshipSeedLabel(relationshipSeed)
  const [message, setMessage] = useState('')
  const [character, setCharacter] = useState<Character | null>(null)
  const [characters, setCharacters] = useState<Character[]>([])
  const [chatId, setChatId] = useState<string | null>(null)
  const [chatLog, setChatLog] = useState<ChatMessage[]>([])
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null)
  const [replySettings, setReplySettings] = useState<ChatReplySettings>(defaultChatReplySettings)
  const [runtimeState, setRuntimeState] = useState<ChatRuntimeState | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isBooting, setIsBooting] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [connectionNote, setConnectionNote] = useState('กำลังโหลดตัวละครจากฐานข้อมูล...')
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lastUsageChatIdRef = useRef<string | null>(null)
  const draftKey = chatId ? `chat:${chatId}` : `character:${character?.id ?? 'none'}`
  const savedDraft = useAppSelector(selectComposerDraft(draftKey))
  const personaDraft = useAppSelector(selectPersonaDraft)
  const contentSettings = useAppSelector(selectContentSettings)
  const tokenBalance = useAppSelector(selectTokenBalance)
  const isWalletLoading = useAppSelector(selectWalletLoading)
  const { chatHistory, isHistoryLoading, loadChatHistory } = useWorkspaceChatHistory()
  const { isWorldStateSaving, saveWorldState } = useWorkspaceWorldState({
    chatId,
    setConnectionNote,
    setRuntimeState,
  })
  const {
    isReporting,
    openCharacterReport,
    openMessageReport,
    reportMessage,
    reportTarget,
    setReportTarget,
  } = useWorkspaceReports({
    character,
    chatId,
    isLoading,
    setConnectionNote,
  })

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
        setConnectionNote('แชทพร้อมแล้ว แต่ระบบสร้างรูปจริงยังไม่พร้อม จึงใช้ภาพร่างระบบสำหรับจัดฟอร์มตัวละคร')
        return
      }
      if (health.model?.chatProvider?.activeRuntimeProvider === 'local' || health.model?.chatProvider?.forcedLocal) {
        setConnectionNote('ฐานข้อมูลพร้อมแล้ว แชทกำลังใช้โหมดในเครื่องสำหรับทดสอบเซิร์ฟเวอร์เครื่องนี้')
        return
      }
      setConnectionNote('ฐานข้อมูลและบริการ AI เชื่อมต่อแล้ว')
    } catch (error) {
      setHealthStatus(null)
      logUnexpectedWorkspaceError('โหลดสถานะระบบไม่สำเร็จ:', error)
      setConnectionNote('เชื่อมต่อบริการแชทไม่ได้')
    }
  }, [])

  const loadUsageSummary = useCallback(async () => {
    try {
      const data = await fetchUsageSummary()
      reduxDispatch(setTokenBalance(data.user.tokenBalance))
    } catch (error) {
      logUnexpectedWorkspaceError('โหลดสรุปการใช้โทเคนไม่สำเร็จ:', error)
    }
  }, [reduxDispatch])

  const loadCharacters = useCallback(async (filters: CharacterListFilters = { view: 'admin', sort: 'popular', limit: 40 }) => {
    const data = await fetchCharacters(filters)
    const visibleCharacters = filterVisibleCharacters(data.characters ?? [])
    setCharacters(visibleCharacters)
    return visibleCharacters
  }, [])

  const refreshWorkspaceAuth = useCallback(async () => {
    try {
      await getAuthState()
      return true
    } catch (error) {
      logUnexpectedWorkspaceError('โหลดสถานะบัญชีไม่สำเร็จ:', error)
      setConnectionNote('โหลดสถานะบัญชีไม่สำเร็จ แต่ยังใช้โหมดในเครื่องต่อได้')
      return false
    }
  }, [])

  async function reloadWorkspaceAfterAuthChange() {
    await refreshWorkspaceAuth()
    await loadHealthStatus()
    const loadedCharacters = await loadCharacters()
    const nextCharacter = loadedCharacters.find((item) => item.id === character?.id) ?? loadedCharacters[0] ?? null
    setCharacter(nextCharacter)
    setChatId(null)
    setRuntimeState(null)
    setChatLog(nextCharacter ? [createGreeting(nextCharacter)] : [])
    await loadChatHistory()
    await loadUsageSummary()
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
    if (!character) {
      setConnectionNote('ยังไม่มีตัวละครจริงให้เริ่มแชท สร้างตัวละครหรือเลือกจากหน้าสำรวจก่อน')
      navigate('/create')
      return
    }
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
      logUnexpectedWorkspaceError('บันทึกยอดเข้าชมตัวละครไม่สำเร็จ:', error)
    }
  }

  const openChat = useCallback(async (id: string) => {
    setIsLoading(true)
    try {
      const data = await fetchChatMessages(id, { limit: savedChatMessageWindowLimit })
      if (!data.chat) return
      if (isQaSeedCharacter(data.chat.character) && !canShowQaSeedData()) {
        setConnectionNote('แชทนี้ไม่พร้อมแสดงในโหมดใช้งานจริง')
        navigate('/chat', { replace: true })
        return
      }
      setChatId(data.chat.id)
      setLastUsage((current) => (lastUsageChatIdRef.current === data.chat!.id ? current : null))
      setRuntimeState(savedChatRuntimeState(data.chat))
      setCharacter(data.chat.character)
      setChatLog(data.chat.messages.length > 0 ? data.chat.messages : [createGreeting(data.chat.character)])
    } catch (error) {
      logUnexpectedWorkspaceError('เปิดแชทไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    } finally {
      setIsLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    async function boot() {
      setIsBooting(true)
      if (routeChatId) {
        setIsLoading(true)
        setConnectionNote('กำลังโหลดแชทที่บันทึกไว้...')
      }
      await refreshWorkspaceAuth()
      await loadHealthStatus()

      try {
        const loadedCharacters = await loadCharacters()
        if (!routeChatId) {
          const firstCharacter = loadedCharacters.find((item) => item.id === routeCharacterId) ?? loadedCharacters[0] ?? null
          setCharacter(firstCharacter)
          setChatLog(
            firstCharacter
              ? [
                  createGreeting(firstCharacter),
                  ...(relationshipSeed
                    ? [
                        {
                          id: crypto.randomUUID(),
                          role: 'assistant' as const,
                          content: `เลือกจุดเริ่มต้นความสัมพันธ์: ${relationshipSeedName} แชทนี้จะเริ่มจากสัญญาอารมณ์นี้`,
                        },
                      ]
                    : []),
                ]
              : [],
          )
          if (firstCharacter && relationshipSeed) {
            setChatLog([createGreeting(firstCharacter, { relationshipSeedName })])
          }
          if (!firstCharacter) {
            setConnectionNote('ยังไม่มีตัวละครสำหรับเริ่มแชท สร้างตัวละครใหม่หรือกลับไปเลือกจากหน้าสำรวจก่อน')
          }
        }
      } catch (error) {
        logUnexpectedWorkspaceError('โหลดตัวละครไม่สำเร็จ:', error)
        setConnectionNote('เชื่อมต่อบริการแชทไม่ได้')
      }

      await loadChatHistory()
      await loadUsageSummary()
      if (routeChatId) await openChat(routeChatId)
      setIsBooting(false)
    }

    void boot()
  }, [
    loadCharacters,
    loadChatHistory,
    loadHealthStatus,
    loadUsageSummary,
    openChat,
    refreshWorkspaceAuth,
    relationshipSeed,
    relationshipSeedName,
    routeCharacterId,
    routeChatId,
  ])

  const archiveChat = async (id: string) => {
    try {
      await archiveSavedChat(id)
      if (chatId === id) startNewChat()
      await loadChatHistory()
      setConnectionNote('จัดเก็บแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('จัดเก็บแชทไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const renameChat = async (id: string, title: string) => {
    try {
      await updateSavedChatTitle(id, title)
      await loadChatHistory()
      setConnectionNote('เปลี่ยนชื่อแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('เปลี่ยนชื่อแชทไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'เปลี่ยนชื่อแชทไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const removeChat = async (id: string) => {
    try {
      await deleteSavedChat(id)
      if (chatId === id) startNewChat()
      await loadChatHistory()
      setConnectionNote('ลบแชทแล้ว')
    } catch (error) {
      logUnexpectedWorkspaceError('ลบแชทไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'ลบแชทไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const toggleFavorite = async (characterId: string, favorite: boolean) => {
    try {
      const data = await setCharacterFavorite(characterId, favorite)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      if (character?.id === data.character.id) setCharacter(data.character)
      setConnectionNote(favorite ? `เพิ่ม ${data.character.name} ในรายการโปรดแล้ว` : `นำ ${data.character.name} ออกจากรายการโปรดแล้ว`)
    } catch (error) {
      logUnexpectedWorkspaceError('อัปเดตรายการโปรดไม่สำเร็จ:', error)
      setConnectionNote(apiErrorMessage(error, 'ทำคำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'))
    }
  }

  const sendMessage = async (value = message) => {
    if (!character) {
      setConnectionNote('ยังไม่มีตัวละครจริงให้ส่งข้อความ เลือกตัวละครจากหน้าสำรวจหรือสร้างตัวละครก่อน')
      return
    }
    const currentMsg = value.trim()
    if (!currentMsg || isLoading) return
    const modelRoute = replySettings.modelRoute
    const replyProfile = replySettings.replyProfile
    const responseDepth = replySettings.responseDepth

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
          modelRoute,
          replyProfile,
          responseDepth,
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
      setIsLoading(false)
      try {
        if (completedChatId) await syncOpenChatMessages(completedChatId)
        await loadChatHistory()
      } catch (syncError) {
        logUnexpectedWorkspaceError('ซิงก์ประวัติแชทหลังตอบกลับไม่สำเร็จ:', syncError)
        setConnectionNote('ตอบกลับสำเร็จแล้ว แต่ซิงก์ประวัติแชทไม่ครบ กดรีเฟรชรายการแชทได้')
      }
      return
    } catch (error) {
      if (!isExpectedUserApiError(error)) logUnexpectedWorkspaceError('ส่งแชทไม่สำเร็จ:', error)
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
          modelRoute,
          replyProfile,
          responseDepth,
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
        if (!isExpectedUserApiError(fallbackError)) logUnexpectedWorkspaceError('ส่งแชทแบบสำรองไม่สำเร็จ:', fallbackError)
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

  const isLocalChatRuntime =
    healthStatus?.model?.chatProvider?.activeRuntimeProvider === 'local' || healthStatus?.model?.chatProvider?.forcedLocal === true

  const syncOpenChatMessages = async (id: string) => {
    try {
      const data = await fetchChatMessages(id, { limit: savedChatMessageWindowLimit })
      if (!data.chat) return
      setChatLog(data.chat.messages.length > 0 ? data.chat.messages : [createGreeting(data.chat.character)])
      setRuntimeState(savedChatRuntimeState(data.chat))
    } catch (error) {
      logUnexpectedWorkspaceError('ซิงก์ข้อความแชทไม่สำเร็จ:', error)
    }
  }

  if (!character) {
    return (
      <EmptyChatWorkspace
        isLoading={isBooting || isLoading}
        note={connectionNote}
        onCreateCharacter={() => navigate('/create')}
        onExplore={() => navigate('/')}
        onRetry={() => {
          void loadCharacters().then((loadedCharacters) => {
            const nextCharacter = loadedCharacters[0] ?? null
            setCharacter(nextCharacter)
            setChatLog(nextCharacter ? [createGreeting(nextCharacter)] : [])
            setConnectionNote(nextCharacter ? `เลือก ${nextCharacter.name} แล้ว` : 'ยังไม่มีตัวละครจริงในระบบสำหรับเริ่มแชท')
          })
        }}
      />
    )
  }

  return (
    <main className="grid h-svh grid-cols-1 overflow-hidden bg-[#18182f] text-white md:grid-cols-[246px_minmax(0,1fr)]">
      <Sidebar
        character={character}
        characters={characters}
        chatHistory={chatHistory}
        chatId={chatId}
        runtimeState={runtimeState}
        connectionNote={connectionNote}
        isHistoryLoading={isHistoryLoading}
        isMobileOpen={isMobileMenuOpen}
        onArchiveChat={archiveChat}
        onAuthChanged={reloadWorkspaceAfterAuthChange}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        onDeleteChat={removeChat}
        onLoadChatHistory={loadChatHistory}
        onOpenChat={openChat}
        onRenameChat={renameChat}
        onSelectCharacter={selectCharacter}
        onStartNewChat={startNewChat}
      />

      <ChatPanel
        character={character}
        chatEndRef={chatEndRef}
        chatId={chatId}
        chatLog={chatLog}
        isLoading={isLoading}
        isLocalChatRuntime={isLocalChatRuntime}
        isWalletLoading={isWalletLoading}
        lastUsage={lastUsage}
        tokenBalance={tokenBalance}
        runtimeState={runtimeState}
        message={message}
        isWorldStateSaving={isWorldStateSaving}
        onMessageChange={updateMessageDraft}
        onReplySettingsChange={setReplySettings}
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
        replySettings={replySettings}
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
