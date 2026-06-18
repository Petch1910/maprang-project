import { useCallback, useState } from 'react'
import {
  prependAiCreatorHistory,
  readAiCreatorHistory,
  removeAiCreatorHistoryItem,
  toggleAiCreatorHistoryFavorite,
  writeAiCreatorHistory,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'

function persistAiCreatorHistory(nextHistory: AiCreatorGeneratedItem[]) {
  if (typeof window !== 'undefined') {
    writeAiCreatorHistory(window.localStorage, nextHistory)
  }
}

export function useAiCreatorLocalHistory() {
  const [history, setHistory] = useState<AiCreatorGeneratedItem[]>(() => {
    if (typeof window === 'undefined') return []
    return readAiCreatorHistory(window.localStorage)
  })

  const saveHistory = useCallback((nextHistory: AiCreatorGeneratedItem[]) => {
    setHistory(nextHistory)
    persistAiCreatorHistory(nextHistory)
  }, [])

  const prependHistoryItem = useCallback((item: AiCreatorGeneratedItem) => {
    setHistory((currentHistory) => {
      const nextHistory = prependAiCreatorHistory(currentHistory, item)
      persistAiCreatorHistory(nextHistory)
      return nextHistory
    })
  }, [])

  const removeHistoryItem = useCallback(
    (itemId: string) => {
      const nextHistory = removeAiCreatorHistoryItem(history, itemId)
      saveHistory(nextHistory)
      return nextHistory
    },
    [history, saveHistory],
  )

  const toggleHistoryFavorite = useCallback(
    (itemId: string) => {
      const nextHistory = toggleAiCreatorHistoryFavorite(history, itemId)
      saveHistory(nextHistory)
      return nextHistory
    },
    [history, saveHistory],
  )

  const clearLocalHistory = useCallback(() => {
    saveHistory([])
  }, [saveHistory])

  return {
    history,
    saveHistory,
    prependHistoryItem,
    removeHistoryItem,
    toggleHistoryFavorite,
    clearLocalHistory,
  }
}
