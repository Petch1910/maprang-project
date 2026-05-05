import { useEffect, useMemo, useRef, useState } from 'react'
import { ChatPanel } from './components/ChatPanel'
import { Sidebar } from './components/Sidebar'
import {
  archiveChat as archiveSavedChat,
  createCharacter,
  createLoreEntry,
  deleteCharacter,
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
  streamChatMessage,
  trackCharacterView,
  updateCharacter,
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
} from './lib/api'
import { getAuthState } from './lib/auth'
import { createGreeting, fallbackCharacter } from './lib/chat'

type ChatUsage = NonNullable<ChatResponse['usage']>

function apiErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof ApiError)) return fallback
  if (error.status === 401) return 'Please sign in again. Your session may have expired.'
  if (error.status === 403) return 'This account does not have permission for that action.'
  if (error.status === 404) return 'The requested record was not found or belongs to another account.'
  if (error.status === 413) return 'The uploaded file is too large.'
  if (error.status === 415) return 'This file type is not supported.'
  if (error.status === 422) return 'The submitted data is incomplete or invalid.'
  if (error.status === 429) return 'Too many requests. Please wait a moment and try again.'
  return fallback
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

function App() {
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSavingCharacter, setIsSavingCharacter] = useState(false)
  const [isSavingLore, setIsSavingLore] = useState(false)
  const [connectionNote, setConnectionNote] = useState('Loading characters from the database...')
  const chatEndRef = useRef<HTMLDivElement>(null)

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

  async function loadHealthStatus() {
    try {
      const health = await fetchHealthStatus()
      setHealthStatus(health)
      if (!health.checks.databaseConnected) {
        setConnectionNote('Backend is running, but the database is not connected yet.')
        return
      }
      if (!health.checks.openRouterConfigured) {
        setConnectionNote('Database is ready, but OPENROUTER_API_KEY is not configured.')
        return
      }
      setConnectionNote('Database and AI service are connected.')
    } catch (error) {
      console.error('Load health status error:', error)
      setHealthStatus(null)
      setConnectionNote('Could not connect to the backend.')
    }
  }

  async function loadUsageSummary() {
    try {
      const data = await fetchUsageSummary()
      setLastUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: data.usage.totalTokens,
        modelName: 'usage-summary',
        contextLoreCount: 0,
        tokenBalance: data.user.tokenBalance,
      })
    } catch (error) {
      console.error('Load usage summary error:', error)
    }
  }

  async function loadAdminSummary() {
    try {
      const data = await fetchAdminSummary()
      setAdminSummary(data)
    } catch (error) {
      console.error('Load admin summary error:', error)
      setAdminSummary(null)
    }
  }

  async function loadChatHistory() {
    setIsHistoryLoading(true)
    try {
      const data = await fetchChats()
      setChatHistory(data.chats ?? [])
    } catch (error) {
      console.error('Load chat history error:', error)
      setChatHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }

  async function loadCharacters(filters: CharacterListFilters = { view: 'admin', sort: 'popular', limit: 40 }) {
    const data = await fetchCharacters(filters)
    const loadedCharacters = data.characters?.length ? data.characters : [fallbackCharacter]
    setCharacters(loadedCharacters)
    return loadedCharacters
  }

  async function loadLoreEntries(characterId = character.id) {
    setIsLoreLoading(true)
    try {
      const data = await fetchLoreEntries(characterId)
      setLoreEntries(data.loreEntries ?? [])
    } catch (error) {
      console.error('Load lore error:', error)
      setLoreEntries([])
    } finally {
      setIsLoreLoading(false)
    }
  }

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
    async function boot() {
      await getAuthState()
      await loadHealthStatus()

      try {
        const loadedCharacters = await loadCharacters()
        const firstCharacter = loadedCharacters[0] ?? fallbackCharacter
        setCharacter(firstCharacter)
        setChatLog([createGreeting(firstCharacter)])
        await loadLoreEntries(firstCharacter.id)
      } catch (error) {
        console.error('Load character error:', error)
        setConnectionNote('Could not connect to the backend.')
      }

      await loadChatHistory()
      await loadUsageSummary()
      await loadAdminSummary()
    }

    boot()
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog, isLoading])

  const startNewChat = () => {
    setChatId(null)
    setLastUsage(null)
    setRuntimeState(null)
    setChatLog([createGreeting(character)])
  }

  const selectCharacter = async (nextCharacter: Character) => {
    setCharacter(nextCharacter)
    setChatId(null)
    setLastUsage(null)
    setRuntimeState(null)
    setMessage('')
    setChatLog([createGreeting(nextCharacter)])
    setConnectionNote(`Selected ${nextCharacter.name}.`)
    try {
      const data = await trackCharacterView(nextCharacter.id)
      setCharacter(data.character)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
    } catch (error) {
      console.error('Track character view error:', error)
    }
    await loadLoreEntries(nextCharacter.id)
  }

  const openChat = async (id: string) => {
    setIsLoading(true)
    try {
      const data = await fetchChatMessages(id)
      if (!data.chat) return
      setChatId(data.chat.id)
      setLastUsage(null)
      setRuntimeState({
        memory: data.chat.memory ?? {
          summary: '',
          facts: [],
          turnCount: 0,
          updatedAt: '',
        },
        sceneState: { ...defaultSceneState(), ...(data.chat.sceneState ?? {}) },
        relationshipState: data.chat.relationshipState ?? {
          ...defaultRelationshipState(),
        },
      })
      setCharacter(data.chat.character)
      setChatLog(data.chat.messages.length > 0 ? data.chat.messages : [createGreeting(data.chat.character)])
      await loadLoreEntries(data.chat.character.id)
    } catch (error) {
      console.error('Open chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
    } finally {
      setIsLoading(false)
    }
  }

  const archiveChat = async (id: string) => {
    try {
      await archiveSavedChat(id)
      if (chatId === id) startNewChat()
      await loadChatHistory()
      await loadAdminSummary()
    } catch (error) {
      console.error('Archive chat error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
    }
  }

  const toggleFavorite = async (characterId: string, favorite: boolean) => {
    try {
      const data = await setCharacterFavorite(characterId, favorite)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      if (character.id === data.character.id) setCharacter(data.character)
      setConnectionNote(favorite ? `Added ${data.character.name} to favorites.` : `Removed ${data.character.name} from favorites.`)
    } catch (error) {
      console.error('Favorite character error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
    }
  }

  const saveCharacter = async (input: CharacterInput) => {
    setIsSavingCharacter(true)
    try {
      const data = await updateCharacter(character.id, input)
      setCharacter(data.character)
      setCharacters((prev) => prev.map((item) => (item.id === data.character.id ? data.character : item)))
      setChatLog((prev) => (prev.length === 1 && prev[0]?.role === 'assistant' ? [createGreeting(data.character)] : prev))
      setConnectionNote(`Saved ${data.character.name}.`)
    } catch (error) {
      console.error('Save character error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
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
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(data.character)])
      setConnectionNote(`Saved ${data.character.name}.`)
    } catch (error) {
      console.error('Create character error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
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
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(data.character)])
      setConnectionNote(`Updated ${character.name}.`)
    } catch (error) {
      console.error('Duplicate character error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
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
      setConnectionNote(`Saved ${data.character.name}.`)
    } catch (error) {
      console.error('Reset prompt error:', error)
      setConnectionNote(apiErrorMessage(error, 'Could not reset the prompt. Please try again.'))
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
      setLastUsage(null)
      setLoreEntries([])
      setChatLog([createGreeting(nextCharacter)])
      setConnectionNote(`Updated ${character.name}.`)
      await loadLoreEntries(nextCharacter.id)
    } catch (error) {
      console.error('Delete character error:', error)
      setConnectionNote(apiErrorMessage(error, 'The action could not be completed. Please try again.'))
    } finally {
      setIsSavingCharacter(false)
    }
  }

  const createNewLore = async (input: LoreInput) => {
    setIsSavingLore(true)
    try {
      const data = await createLoreEntry(character.id, input)
      setLoreEntries((prev) => [data.loreEntry, ...prev])
      setConnectionNote(`Saved lore "${data.loreEntry.keyword}".`)
    } catch (error) {
      console.error('Create lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'Could not update lore. Please try again.'))
    } finally {
      setIsSavingLore(false)
    }
  }

  const saveLore = async (loreId: string, input: Partial<LoreInput>) => {
    setIsSavingLore(true)
    try {
      const data = await updateLoreEntry(loreId, input)
      setLoreEntries((prev) => prev.map((entry) => (entry.id === loreId ? data.loreEntry : entry)))
      setConnectionNote(`Saved lore "${data.loreEntry.keyword}".`)
    } catch (error) {
      console.error('Update lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'Could not update lore. Please try again.'))
    } finally {
      setIsSavingLore(false)
    }
  }

  const removeLore = async (loreId: string) => {
    setIsSavingLore(true)
    try {
      await deleteLoreEntry(loreId)
      setLoreEntries((prev) => prev.filter((entry) => entry.id !== loreId))
      setConnectionNote('Updated lore.')
    } catch (error) {
      console.error('Delete lore error:', error)
      setConnectionNote(apiErrorMessage(error, 'Could not update lore. Please try again.'))
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
        ? 'Enter this scene'
        : sceneCommand[1] === 'hold'
          ? 'Hold this scene for later'
          : sceneCommand[1] === 'decline'
            ? 'Skip this scene'
            : sceneCommand[1] === 'resolve'
              ? 'Resolve this scene'
              : sceneCommand[1] === 'accept'
                ? 'Accept this scene outcome'
                : sceneCommand[1] === 'reject'
                  ? 'Reject this scene outcome'
                  : 'Exit this scene'
      : currentMsg
    const assistantMessageId = crypto.randomUUID()
    setChatLog((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: 'user', content: userFacingMessage },
      { id: assistantMessageId, role: 'assistant', content: '' },
    ])
    if (!sceneCommand) setMessage('')
    setIsLoading(true)

    try {
      await streamChatMessage(
        {
          message: currentMsg,
          characterId: character.id,
          chatId,
          history: [...visibleHistory, { role: 'user', content: currentMsg }],
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
            if (event.chatId) setChatId(event.chatId)
            setLastUsage(event.usage)
            if (event.memory) setRuntimeState(event.memory)
          }

          if (event.type === 'error') {
            setChatLog((prev) =>
              prev.map((chat) => (chat.id === assistantMessageId ? { ...chat, content: event.message } : chat)),
            )
          }
        },
      )
      await loadChatHistory()
      await loadAdminSummary()
    } catch (error) {
      console.error('Chat error:', error)
      const streamMessage = apiErrorMessage(error, 'The action could not be completed. Please try again.')
      try {
        const data = await sendChatMessage({
          message: currentMsg,
          characterId: character.id,
          chatId,
          history: [...visibleHistory, { role: 'user', content: currentMsg }],
        })
        if (data.chatId) setChatId(data.chatId)
        if (data.usage) setLastUsage(data.usage)
        if (data.memory) setRuntimeState(data.memory)
        setChatLog((prev) =>
          prev.map((chat) =>
            chat.id === assistantMessageId
              ? {
                  ...chat,
                  content: data.reply?.trim() || 'Maprang could not produce a reply yet. Please try asking again.',
                }
              : chat,
          ),
        )
        await loadChatHistory()
      } catch (fallbackError) {
        console.error('Chat fallback error:', fallbackError)
        setConnectionNote(
          apiErrorMessage(
            fallbackError,
            streamMessage || 'Could not connect to the AI service. Check backend and OPENROUTER_API_KEY.',
          ),
        )
        setChatLog((prev) =>
          prev.map((chat) =>
            chat.id === assistantMessageId
              ? {
                  ...chat,
                  content: 'Could not connect to the AI service. Confirm the backend is running at http://localhost:3000 and OPENROUTER_API_KEY is configured.',
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

  return (
    <main className="grid min-h-svh grid-cols-1 bg-[radial-gradient(circle_at_top_left,rgba(255,177,79,0.24),transparent_32rem),linear-gradient(135deg,#fbfcff_0%,#eef4ff_45%,#fff8ef_100%)] text-slate-900 md:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
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
        onDeleteLore={removeLore}
        onDuplicateCharacter={duplicateSelectedCharacter}
        onFilterCharacters={loadCharacters}
        onFavoriteCharacter={toggleFavorite}
        onLoadChatHistory={loadChatHistory}
        onLoadHealth={loadHealthStatus}
        onLoadAdminSummary={loadAdminSummary}
        onLoadLore={() => loadLoreEntries()}
        onOpenChat={openChat}
        onResetCharacterPrompt={resetSelectedCharacterPrompt}
        onSaveCharacter={saveCharacter}
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
        lastUsage={lastUsage}
        runtimeState={runtimeState}
        message={message}
        onMessageChange={setMessage}
        onOpenMenu={() => setIsMobileMenuOpen(true)}
        onSceneAction={handleSceneAction}
        onSendMessage={sendMessage}
      />
    </main>
  )
}

export default App
