import { useCallback, useState } from 'react'
import {
  ApiError,
  fetchGenerationOutputDownload,
  logUnexpectedError,
} from '../lib/api'
import {
  buildAiCreatorDownloadFilename,
  getAiCreatorDownloadActionState,
  type AiCreatorDownloadLinkSnapshot,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'

type SetStatusMessage = (message: string) => void

function startDownload(url: string, filename: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener noreferrer'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export function useAiCreatorDownloads(setStatusMessage: SetStatusMessage) {
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null)
  const [downloadLinks, setDownloadLinks] = useState<Record<string, AiCreatorDownloadLinkSnapshot>>({})

  const removeDownloadLink = useCallback((itemId: string) => {
    setDownloadLinks((links) => {
      const nextLinks = { ...links }
      delete nextLinks[itemId]
      return nextLinks
    })
  }, [])

  const clearDownloadLinks = useCallback(() => {
    setDownloadLinks({})
  }, [])

  const handleDownloadHistoryItem = useCallback(
    async (item: AiCreatorGeneratedItem) => {
      const downloadState = getAiCreatorDownloadActionState(item)
      if (!downloadState.canDownload || downloadingItemId) {
        setStatusMessage(downloadState.title)
        return
      }

      setDownloadingItemId(item.id)
      try {
        const filename = buildAiCreatorDownloadFilename(item)
        if (downloadState.mode === 'backend' && item.backendOutputId) {
          const result = await fetchGenerationOutputDownload(item.backendOutputId)
          const generatedAt = Date.now()
          setDownloadLinks((links) => ({
            ...links,
            [item.id]: {
              access: result.download.access,
              generatedAt,
              expiresIn: result.download.expiresIn,
              expiresAt: result.download.expiresIn ? generatedAt + result.download.expiresIn * 1000 : null,
            },
          }))
          startDownload(result.download.url, filename)
          setStatusMessage(
            result.download.expiresIn
              ? `เตรียมลิงก์ดาวน์โหลดแล้ว ลิงก์นี้หมดอายุใน ${result.download.expiresIn} วินาที`
              : 'เตรียมไฟล์ดาวน์โหลดแล้ว',
          )
          return
        }

        setDownloadLinks((links) => ({
          ...links,
          [item.id]: {
            access: 'direct',
            generatedAt: Date.now(),
            expiresIn: null,
            expiresAt: null,
          },
        }))
        startDownload(item.url, filename)
        setStatusMessage('เริ่มดาวน์โหลดไฟล์จากคลังเครื่องนี้แล้ว')
      } catch (err) {
        logUnexpectedError('ดาวน์โหลดผลลัพธ์ AI Creator ไม่สำเร็จ', err)
        setStatusMessage(err instanceof ApiError ? err.message : 'ดาวน์โหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
      } finally {
        setDownloadingItemId(null)
      }
    },
    [downloadingItemId, setStatusMessage],
  )

  return {
    downloadingItemId,
    downloadLinks,
    handleDownloadHistoryItem,
    removeDownloadLink,
    clearDownloadLinks,
  }
}
