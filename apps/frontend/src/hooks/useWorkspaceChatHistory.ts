import { useCallback, useState } from 'react'
import { fetchChats, type ChatSummary } from '../lib/api'
import { logUnexpectedWorkspaceError } from '../lib/workspaceRuntime'
import { isPlayableChatSummary } from '../store/slices/chatsSlice'

export function useWorkspaceChatHistory() {
  const [chatHistory, setChatHistory] = useState<ChatSummary[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)

  const loadChatHistory = useCallback(async () => {
    setIsHistoryLoading(true)
    try {
      const data = await fetchChats()
      setChatHistory((data.chats ?? []).filter(isPlayableChatSummary))
    } catch (error) {
      logUnexpectedWorkspaceError('Load chat history failed:', error)
      setChatHistory([])
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  return {
    chatHistory,
    isHistoryLoading,
    loadChatHistory,
  }
}
