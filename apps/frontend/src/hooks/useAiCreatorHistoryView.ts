import { useMemo, useState } from 'react'
import {
  AI_CREATOR_HISTORY_PAGE_SIZE,
  filterAiCreatorHistory,
  paginateAiCreatorHistory,
  type AiCreatorGalleryFilter,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'

export function useAiCreatorHistoryView(backendHistory: AiCreatorGeneratedItem[], history: AiCreatorGeneratedItem[]) {
  const [currentPage, setCurrentPage] = useState(1)
  const [galleryFilter, setGalleryFilter] = useState<AiCreatorGalleryFilter>('all')

  const combinedHistory = useMemo(() => [...backendHistory, ...history], [backendHistory, history])
  const filteredHistory = useMemo(() => filterAiCreatorHistory(combinedHistory, galleryFilter), [combinedHistory, galleryFilter])
  const totalPages = Math.ceil(filteredHistory.length / AI_CREATOR_HISTORY_PAGE_SIZE) || 1
  const paginatedHistory = useMemo(() => paginateAiCreatorHistory(filteredHistory, currentPage), [currentPage, filteredHistory])

  const handleFilterChange = (filter: AiCreatorGalleryFilter) => {
    setGalleryFilter(filter)
    setCurrentPage(1)
  }

  return {
    combinedHistory,
    currentPage,
    galleryFilter,
    filteredHistory,
    paginatedHistory,
    totalPages,
    setCurrentPage,
    handleFilterChange,
  }
}
