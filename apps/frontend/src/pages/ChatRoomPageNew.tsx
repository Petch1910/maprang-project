import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ThreeColumnLayout } from '../components/layout/ThreeColumnLayout'
import { ChatHistoryList } from '../components/chat/ChatHistoryList'
import { LorePanel } from '../components/settings/LorePanel'
import { ChatWrapper } from '../components/ChatWrapper'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { loadChatSummaries, selectPlayableChatSummaries, selectChatsLoading } from '../store/slices/chatsSlice'
import type { ChatSummary } from '../lib/api'

export function ChatRoomPageNew() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { chatId } = useParams()

  const chats = useAppSelector(selectPlayableChatSummaries)
  const loading = useAppSelector(selectChatsLoading)

  const [selectedChatId, setSelectedChatId] = useState<string | undefined>(chatId)

  // Load chat history
  useEffect(() => {
    dispatch(loadChatSummaries())
  }, [dispatch])

  // Update selected chat when route changes
  useEffect(() => {
    if (chatId) {
      setSelectedChatId(chatId)
    }
  }, [chatId])

  // Find active chat
  const activeChat = useMemo(() => {
    return chats.find((chat) => chat.id === selectedChatId)
  }, [chats, selectedChatId])

  const handleSelectChat = (newChatId: string) => {
    setSelectedChatId(newChatId)
    navigate(`/chats/${newChatId}`)
  }

  const handleNewChat = () => {
    navigate('/')
  }

  // Mock lore entries (TODO: integrate with real lore system)
  const mockLoreEntries = [
    {
      id: '1',
      title: 'เจอกันครั้งแรก',
      content: 'เราเจอกันที่คาเฟ่แห่งหนึ่ง บรรยากาศดีมาก',
      category: 'memory' as const,
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'วันเกิดของเธอ',
      content: '15 มีนาคม - จำวันนี้ไว้เสมอ',
      category: 'event' as const,
      createdAt: new Date(),
    },
  ]

  // Mock relationship info (TODO: integrate with real relationship system)
  const mockRelationship = activeChat?.relationship
    ? {
        status: activeChat.relationship.current || 'เพื่อน',
        tier: activeChat.relationship.tier || 'casual',
        affinity: Math.round((activeChat.relationship.affinity || 0) * 100),
        trust: Math.round((activeChat.relationship.trust || 0) * 100),
        intimacy: Math.round((activeChat.relationship.intimacy || 0) * 100),
      }
    : undefined

  return (
    <ThreeColumnLayout
      leftSidebar={
        <ChatHistoryList
          chats={chats}
          activeChat={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
        />
      }
      rightSidebar={
        activeChat ? (
          <LorePanel
            character={activeChat.character}
            loreEntries={mockLoreEntries}
            relationship={mockRelationship}
            onAddLore={() => console.log('Add lore')}
            onEditLore={(id) => console.log('Edit lore', id)}
            onDeleteLore={(id) => console.log('Delete lore', id)}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <p className="text-slate-400">เลือกการสนทนาเพื่อดูรายละเอียด</p>
            </div>
          </div>
        )
      }
    >
      {selectedChatId && activeChat ? (
        <ChatWrapper chatId={selectedChatId} />
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-900">
          <div className="text-center">
            <div className="text-6xl opacity-20">💬</div>
            <h2 className="mt-4 text-xl font-semibold text-slate-300">
              เลือกการสนทนาจากด้านซ้าย
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              หรือสร้างการสนทนาใหม่เพื่อเริ่มต้น
            </p>
          </div>
        </div>
      )}
    </ThreeColumnLayout>
  )
}
