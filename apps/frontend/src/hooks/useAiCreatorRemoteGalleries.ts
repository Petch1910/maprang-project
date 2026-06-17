import { useCallback, useEffect, useState } from 'react'
import {
  fetchGenerationJobs,
  fetchPublicGallery,
  logUnexpectedError,
  type GenerationJob,
} from '../lib/api'
import {
  createAiCreatorItemsFromGenerationJobs,
  createAiCreatorItemsFromPublicGalleryOutputs,
  type AiCreatorGeneratedItem,
} from '../lib/aiCreator'

type UseAiCreatorRemoteGalleriesOptions = {
  onStatusMessage?: (message: string) => void
}

type BackendHistoryLoadResult = {
  jobs: GenerationJob[]
  items: AiCreatorGeneratedItem[]
}

async function fetchAiCreatorBackendHistoryItems(limit = 12): Promise<BackendHistoryLoadResult> {
  const res = await fetchGenerationJobs(limit)
  return {
    jobs: res.jobs,
    items: createAiCreatorItemsFromGenerationJobs(res.jobs),
  }
}

async function fetchAiCreatorPublicGalleryItems(limit = 24): Promise<AiCreatorGeneratedItem[]> {
  const res = await fetchPublicGallery(limit)
  return createAiCreatorItemsFromPublicGalleryOutputs(res.outputs)
}

export function useAiCreatorRemoteGalleries(options: UseAiCreatorRemoteGalleriesOptions = {}) {
  const { onStatusMessage } = options
  const [backendHistory, setBackendHistory] = useState<AiCreatorGeneratedItem[]>([])
  const [publicHistory, setPublicHistory] = useState<AiCreatorGeneratedItem[]>([])

  const reloadBackendHistory = useCallback(async () => {
    const { items } = await fetchAiCreatorBackendHistoryItems()
    setBackendHistory(items)
    return items
  }, [])

  const reloadPublicGallery = useCallback(async () => {
    const items = await fetchAiCreatorPublicGalleryItems()
    setPublicHistory(items)
    return items
  }, [])

  useEffect(() => {
    let active = true
    fetchAiCreatorBackendHistoryItems()
      .then(({ jobs, items }) => {
        if (!active) return
        setBackendHistory(items)
        if (jobs.length > 0) {
          onStatusMessage?.(
            `พบงานสร้างภาพที่บันทึกบนระบบ ${jobs.length} รายการ ใช้คลังในเครื่องต่อได้และพร้อมเชื่อมรายละเอียดงาน`,
          )
        }
      })
      .catch((err) => {
        logUnexpectedError('โหลดคลังงานสร้างภาพจากระบบไม่สำเร็จ', err)
      })

    return () => {
      active = false
    }
  }, [onStatusMessage])

  useEffect(() => {
    let active = true
    fetchAiCreatorPublicGalleryItems()
      .then((items) => {
        if (active) setPublicHistory(items)
      })
      .catch((err) => {
        logUnexpectedError('โหลด Public Gallery ไม่สำเร็จ', err)
      })

    return () => {
      active = false
    }
  }, [])

  return {
    backendHistory,
    setBackendHistory,
    publicHistory,
    setPublicHistory,
    reloadBackendHistory,
    reloadPublicGallery,
  }
}
