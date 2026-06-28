import { type Dispatch, type SetStateAction, useCallback, useState } from 'react'
import {
  ApiError,
  cancelGenerationJob,
  deleteGenerationOutput,
  favoriteGenerationOutput,
  logUnexpectedError,
  publishGenerationOutput,
  reportGenerationOutput,
  retryGenerationJob,
  unfavoriteGenerationOutput,
  unpublishGenerationOutput,
} from '../lib/api'
import {
  AI_CREATOR_HISTORY_PAGE_SIZE,
  filterAiCreatorHistory,
  getAiCreatorRetryActionState,
  type AiCreatorGalleryFilter,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'
import type { ReportDialogSubmit } from '../components/ReportDialog'

type UseAiCreatorLibraryActionsInput = {
  backendHistory: AiCreatorGeneratedItem[]
  detailItem: AiCreatorGeneratedItem | null
  galleryFilter: AiCreatorGalleryFilter
  lastResult: AiCreatorGeneratedItem | null
  reportTarget: AiCreatorGeneratedItem | null
  reloadBackendHistory: () => Promise<unknown>
  reloadPublicGallery: () => Promise<unknown>
  removeDownloadLink: (itemId: string) => void
  removeHistoryItem: (itemId: string) => AiCreatorGeneratedItem[]
  setBackendHistory: Dispatch<SetStateAction<AiCreatorGeneratedItem[]>>
  setCurrentPage: Dispatch<SetStateAction<number>>
  setDetailItem: Dispatch<SetStateAction<AiCreatorGeneratedItem | null>>
  setLastResult: Dispatch<SetStateAction<AiCreatorGeneratedItem | null>>
  setPublicHistory: Dispatch<SetStateAction<AiCreatorGeneratedItem[]>>
  setReportTarget: Dispatch<SetStateAction<AiCreatorGeneratedItem | null>>
  setStatusMessage: Dispatch<SetStateAction<string>>
  toggleLocalHistoryFavorite: (itemId: string) => AiCreatorGeneratedItem[]
}

export function useAiCreatorLibraryActions({
  backendHistory,
  detailItem,
  galleryFilter,
  lastResult,
  reportTarget,
  reloadBackendHistory,
  reloadPublicGallery,
  removeDownloadLink,
  removeHistoryItem,
  setBackendHistory,
  setCurrentPage,
  setDetailItem,
  setLastResult,
  setPublicHistory,
  setReportTarget,
  setStatusMessage,
  toggleLocalHistoryFavorite,
}: UseAiCreatorLibraryActionsInput) {
  const [isPublishing, setIsPublishing] = useState(false)
  const [isReporting, setIsReporting] = useState(false)
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null)
  const [cancellingItemId, setCancellingItemId] = useState<string | null>(null)

  const deleteHistoryItem = useCallback(
    (itemId: string) => {
      const backendItem = backendHistory.find((item) => item.id === itemId)
      if (backendItem?.backendOutputId) {
        void deleteGenerationOutput(backendItem.backendOutputId)
          .then(() => {
            setBackendHistory((items) => items.filter((item) => item.id !== itemId))
            removeDownloadLink(itemId)
            if (lastResult?.id === itemId) setLastResult(null)
            if (detailItem?.id === itemId) setDetailItem(null)
            setStatusMessage('ลบชิ้นงานที่บันทึกบน backend แล้ว')
          })
          .catch((err) => {
            logUnexpectedError('ลบผลลัพธ์ AI Creator ไม่สำเร็จ', err)
            setStatusMessage(err instanceof ApiError ? err.message : 'ลบชิ้นงาน backend ไม่สำเร็จ กรุณาลองใหม่')
          })
        return
      }

      const nextHistory = removeHistoryItem(itemId)
      removeDownloadLink(itemId)
      if (lastResult?.id === itemId) {
        setLastResult(null)
      }
      if (detailItem?.id === itemId) {
        setDetailItem(null)
      }
      const nextFilteredLength = filterAiCreatorHistory(nextHistory, galleryFilter).length
      const nextTotalPages = Math.ceil(nextFilteredLength / AI_CREATOR_HISTORY_PAGE_SIZE) || 1
      setCurrentPage((page) => Math.min(page, nextTotalPages))
    },
    [
      backendHistory,
      detailItem,
      galleryFilter,
      lastResult,
      removeDownloadLink,
      removeHistoryItem,
      setBackendHistory,
      setCurrentPage,
      setDetailItem,
      setLastResult,
      setStatusMessage,
    ],
  )

  const handleReportSubmit = useCallback(
    async (input: ReportDialogSubmit) => {
      if (!reportTarget) return
      setIsReporting(true)
      try {
        await reportGenerationOutput(reportTarget.id, input.reason, input.details)
        setStatusMessage('ส่งรายงานสำเร็จ ผู้ดูแลระบบจะตรวจสอบต่อไป')
        setReportTarget(null)
        setPublicHistory((prev) => prev.filter((item) => item.id !== reportTarget.id))
        setDetailItem(null)
      } catch (err) {
        logUnexpectedError('ส่งรายงานไม่สำเร็จ', err)
        setStatusMessage('เกิดข้อผิดพลาดในการส่งรายงาน')
      } finally {
        setIsReporting(false)
      }
    },
    [reportTarget, setDetailItem, setPublicHistory, setReportTarget, setStatusMessage],
  )

  const toggleHistoryFavorite = useCallback(
    (itemId: string) => {
      const backendItem = backendHistory.find((item) => item.id === itemId)
      if (backendItem?.backendOutputId) {
        const nextFavorite = !backendItem.isFavorite
        const updateBackendItems = (items: AiCreatorGeneratedItem[]) =>
          items.map((item) => (item.id === itemId ? { ...item, isFavorite: nextFavorite } : item))
        setBackendHistory(updateBackendItems)
        if (lastResult?.id === itemId) setLastResult({ ...backendItem, isFavorite: nextFavorite })
        if (detailItem?.id === itemId) setDetailItem({ ...backendItem, isFavorite: nextFavorite })
        setStatusMessage(nextFavorite ? 'เพิ่มชิ้นงานระบบเข้ารายการโปรดแล้ว' : 'นำชิ้นงานระบบออกจากรายการโปรดแล้ว')
        const request = nextFavorite
          ? favoriteGenerationOutput(backendItem.backendOutputId)
          : unfavoriteGenerationOutput(backendItem.backendOutputId)
        void request.catch((err) => {
          logUnexpectedError('อัปเดตรายการโปรดของผลลัพธ์ AI Creator ไม่สำเร็จ', err)
          setBackendHistory((items) =>
            items.map((item) => (item.id === itemId ? { ...item, isFavorite: backendItem.isFavorite } : item)),
          )
          if (lastResult?.id === itemId) setLastResult(backendItem)
          if (detailItem?.id === itemId) setDetailItem(backendItem)
          setStatusMessage(err instanceof ApiError ? err.message : 'อัปเดตรายการโปรดไม่สำเร็จ กรุณาลองใหม่')
        })
        return
      }

      const nextHistory = toggleLocalHistoryFavorite(itemId)
      const nextItem = nextHistory.find((item) => item.id === itemId) ?? null
      if (lastResult?.id === itemId) setLastResult(nextItem)
      if (detailItem?.id === itemId) setDetailItem(nextItem)
      setStatusMessage(nextItem?.isFavorite ? 'เพิ่มชิ้นงานเข้ารายการโปรดแล้ว' : 'นำชิ้นงานออกจากรายการโปรดแล้ว')
    },
    [
      backendHistory,
      detailItem,
      lastResult,
      setBackendHistory,
      setDetailItem,
      setLastResult,
      setStatusMessage,
      toggleLocalHistoryFavorite,
    ],
  )

  const toggleHistoryPublish = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      if (item.librarySource !== 'backend' || !item.backendOutputId) return
      setIsPublishing(true)
      const isPublic = item.visibility === 'public'

      try {
        const request = isPublic
          ? unpublishGenerationOutput(item.backendOutputId)
          : publishGenerationOutput(item.backendOutputId)

        const res = await request

        const updateVisibility = (items: AiCreatorGeneratedItem[]) =>
          items.map((it) => (it.backendOutputId === item.backendOutputId ? { ...it, visibility: res.output.visibility } : it))

        setBackendHistory(updateVisibility)
        if (lastResult?.id === item.id) setLastResult({ ...item, visibility: res.output.visibility })
        if (detailItem?.id === item.id) setDetailItem({ ...item, visibility: res.output.visibility })
        setStatusMessage(res.output.visibility === 'public' ? 'เผยแพร่ผลงานสู่สาธารณะแล้ว' : 'ยกเลิกการเผยแพร่ผลงานแล้ว')
        void reloadPublicGallery()
      } catch (err) {
        logUnexpectedError('ปรับสถานะเผยแพร่ไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'ปรับสถานะเผยแพร่ไม่สำเร็จ กรุณาลองใหม่')
      } finally {
        setIsPublishing(false)
      }
    },
    [detailItem, lastResult, reloadPublicGallery, setBackendHistory, setDetailItem, setLastResult, setStatusMessage],
  )

  const handleRetryHistoryItem = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      const retryState = getAiCreatorRetryActionState(item)
      if (!retryState.canRetry || !item.backendJobId || retryingItemId) {
        setStatusMessage(retryState.title)
        return
      }

      setRetryingItemId(item.id)
      try {
        await retryGenerationJob(item.backendJobId)
        await reloadBackendHistory()
        setCurrentPage(1)
        setStatusMessage('บันทึกงานสร้างซ้ำแล้ว ระบบยังไม่หักเครดิตจนกว่างานจริงจะถูกเข้าคิว')
      } catch (err) {
        logUnexpectedError('สร้างงาน AI Creator ซ้ำไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'สร้างงานซ้ำไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setRetryingItemId(null)
      }
    },
    [reloadBackendHistory, retryingItemId, setCurrentPage, setStatusMessage],
  )

  const handleCancelHistoryItem = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      if (!item.backendJobId || cancellingItemId) {
        setStatusMessage('ยกเลิกได้เฉพาะงานที่บันทึกอยู่ใน backend และยังไม่มีคำสั่งยกเลิกค้างอยู่')
        return
      }

      setCancellingItemId(item.id)
      try {
        const result = await cancelGenerationJob(item.backendJobId)
        const updateCancelledItems = (items: AiCreatorGeneratedItem[]) =>
          items.map((entry) =>
            entry.backendJobId === result.job.id ? { ...entry, backendJobStatus: result.job.status, brief: result.job.message } : entry,
          )
        setBackendHistory(updateCancelledItems)
        if (lastResult?.id === item.id) {
          setLastResult({ ...item, backendJobStatus: result.job.status, brief: result.job.message })
        }
        if (detailItem?.id === item.id) {
          setDetailItem({ ...item, backendJobStatus: result.job.status, brief: result.job.message })
        }
        await reloadBackendHistory()
        setStatusMessage('ยกเลิกงานสร้างแล้ว ระบบไม่หักเครดิตเพิ่มจากคำสั่งนี้')
      } catch (err) {
        logUnexpectedError('ยกเลิกงาน AI Creator ไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'ยกเลิกงานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setCancellingItemId(null)
      }
    },
    [
      cancellingItemId,
      detailItem,
      lastResult,
      reloadBackendHistory,
      setBackendHistory,
      setDetailItem,
      setLastResult,
      setStatusMessage,
    ],
  )

  return {
    cancellingItemId,
    deleteHistoryItem,
    handleCancelHistoryItem,
    handleReportSubmit,
    handleRetryHistoryItem,
    isPublishing,
    isReporting,
    retryingItemId,
    toggleHistoryFavorite,
    toggleHistoryPublish,
  }
}
