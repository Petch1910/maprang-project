import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChatPanel } from '../components/ChatPanel'
import {
  fetchChatMessages,
  sendChatMessage,
  streamChatMessage,
  setCharacterFavorite,
  updateChatWorldState as updateSavedChatWorldState,
  type Character,
  type ChatMessage,
  type ChatResponse,
  type ChatRuntimeState,
  type WorldStateInput,
} from '../lib/api'
import { useAppSelector } from '../store/hooks'
import { selectTokenBalance, selectWalletLoading } from '../store/slices/walletSlice'

type ChatUsage = NonNullable<ChatResponse['usage']>

const fallbackCharacter: Character = {
  id: '',
  name: 'กำลังโหลด...',
  tagline: null,
  description: null,
  avatarUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  creatorId: '',
  visibility: 'PUBLIC',
  status: 'PUBLISHED',
  tags: [],
  chatCount: 0,
  favoriteCount: 0,
  viewCount: 0,
  isFavorite: false,
}

function createGreeting(character: Character): ChatMessage {
  return {
    id: 'greeting',
    chatId: '',
    role: 'assistant',
    content: character.greeting || `สวัสดี! ฉันชื่อ ${character.name}`,
    createdAt: new Date(),
  }
}

interface ChatWrapperProps {
  chatId: string
}

export function ChatWrapper({ chatId }: ChatWrapperProps) {
  const navigate = useNavigate()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const tokenBalance = useAppSelector(selectTokenBalance)
  const isWalletLoading = useAppSelector(selectWalletLoading)

  const [character, setCharacter] = useState<Character>(fallbackCharacter)
  const [chatLog, setChatLog] = useState<ChatMessage[]>([])
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isWorldStateSaving, setIsWorldStateSaving] = useState(false)
  const [lastUsage, setLastUsage] = useState<ChatUsage | null>(null)
  const [runtimeState, setRuntimeState] = useState<ChatRuntimeState | null>(null)

  // Load chat messages
  useEffect(() => {
    if (!chatId) return

    fetchChatMessages(chatId)
      .then((data) => {
        setCharacter(data.character)
        setChatLog(data.messages)
        setRuntimeState(data.runtimeState || null)
      })
      .catch((error) => {
        console.error('Failed to load chat:', error)
      })
  }, [chatId])

  // Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatLog])

  const handleSendMessage = useCallback(
    async (customMessage?: string) => {
      const content = customMessage || message
      if (!content.trim() || !chatId || isLoading) return

      setIsLoading(true)
      setMessage('')

      // Add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        chatId,
        role: 'user',
        content,
        createdAt: new Date(),
      }
      setChatLog((prev) => [...prev, userMessage])

      try {
        // Try streaming first
        let assistantMessage: ChatMessage | null = null
        const onChunk = (text: string) => {
          if (!assistantMessage) {
            assistantMessage = {
              id: `temp-assistant-${Date.now()}`,
              chatId,
              role: 'assistant',
              content: text,
              createdAt: new Date(),
            }
            setChatLog((prev) => [...prev, assistantMessage!])
          } else {
            assistantMessage.content = text
            setChatLog((prev) => prev.map((msg) => (msg.id === assistantMessage!.id ? assistantMessage! : msg)))
          }
        }

        const response = await streamChatMessage(chatId, content, onChunk)

        // Update with final response
        setChatLog((prev) => {
          const withoutTemp = prev.filter((msg) => !msg.id.startsWith('temp-'))
          return [...withoutTemp, userMessage, response.reply]
        })

        setLastUsage(response.usage || null)
        setRuntimeState(response.runtimeState || null)
      } catch (error) {
        console.error('Streaming failed, falling back to regular send:', error)

        // Fallback to regular send
        try {
          const response = await sendChatMessage(chatId, content)
          setChatLog((prev) => {
            const withoutTemp = prev.filter((msg) => !msg.id.startsWith('temp-'))
            return [...withoutTemp, userMessage, response.reply]
          })
          setLastUsage(response.usage || null)
          setRuntimeState(response.runtimeState || null)
        } catch (sendError) {
          console.error('Send message failed:', sendError)
          setChatLog((prev) => prev.filter((msg) => msg.id !== userMessage.id))
        }
      } finally {
        setIsLoading(false)
      }
    },
    [chatId, message, isLoading]
  )

  const handleFavoriteCharacter = useCallback(
    async (characterId: string, favorite: boolean) => {
      try {
        await setCharacterFavorite(characterId, favorite)
        setCharacter((prev) => ({ ...prev, isFavorite: favorite }))
      } catch (error) {
        console.error('Failed to favorite character:', error)
      }
    },
    []
  )

  const handleSaveWorldState = useCallback(
    async (input: WorldStateInput) => {
      if (!chatId) return false
      setIsWorldStateSaving(true)
      try {
        await updateSavedChatWorldState(chatId, input)
        return true
      } catch (error) {
        console.error('Failed to save world state:', error)
        return false
      } finally {
        setIsWorldStateSaving(false)
      }
    },
    [chatId]
  )

  const handleSceneAction = useCallback(
    (action: 'enter' | 'hold' | 'decline' | 'exit' | 'resolve' | 'accept' | 'reject', code?: string) => {
      console.log('Scene action:', action, code)
      // TODO: Implement scene actions
    },
    []
  )

  return (
    <ChatPanel
      character={character}
      chatEndRef={chatEndRef}
      chatId={chatId}
      chatLog={chatLog}
      isLoading={isLoading}
      isWalletLoading={isWalletLoading}
      isWorldStateSaving={isWorldStateSaving}
      lastUsage={lastUsage}
      tokenBalance={tokenBalance}
      runtimeState={runtimeState}
      message={message}
      onMessageChange={setMessage}
      onOpenMenu={() => {}}
      onFavoriteCharacter={handleFavoriteCharacter}
      onOpenCharacterProfile={() => navigate(`/characters/${character.id}`)}
      onOpenChats={() => navigate('/chats')}
      onOpenWallet={() => navigate('/wallet')}
      onReportCharacter={() => console.log('Report character')}
      onReportMessage={() => console.log('Report message')}
      onSaveWorldState={handleSaveWorldState}
      onSceneAction={handleSceneAction}
      onSendMessage={handleSendMessage}
      onStartNewChat={() => navigate('/')}
    />
  )
}
