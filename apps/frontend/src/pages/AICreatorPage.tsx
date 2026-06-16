import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AiCreatorBlockedStateMatrix } from '../components/ai-creator/AiCreatorBlockedStateMatrix'
import { AiCreatorControlPanel } from '../components/ai-creator/AiCreatorControlPanel'
import { AiCreatorHistoryGallery } from '../components/ai-creator/AiCreatorHistoryGallery'
import { AiCreatorHistoryDetailDialog } from '../components/ai-creator/AiCreatorHistoryDetailDialog'
import { AiCreatorPublicGalleryPanel } from '../components/ai-creator/AiCreatorPublicGalleryPanel'
import { AiCreatorResultPreview } from '../components/ai-creator/AiCreatorResultPreview'
import { ReportDialog, type ReportDialogSubmit } from '../components/ReportDialog'
import {
  generateCreatorAiDraft,
  updateCreatorDraft,
  logUnexpectedError,
  ApiError,
  deleteGenerationOutput,
  favoriteGenerationOutput,
  fetchCharacters,
  fetchGenerationJobs,
  fetchGenerationOutputDownload,
  retryGenerationJob,
  unfavoriteGenerationOutput,
  publishGenerationOutput,
  unpublishGenerationOutput,
  fetchPublicGallery,
  reportGenerationOutput,
  type CreatorAiDraftResponse,
  type Character,
} from '../lib/api'
import { getSafeClipboard, safeWriteClipboardText } from '../lib/safeClipboard'
import {
  AI_CREATOR_HISTORY_PAGE_SIZE,
  AI_CREATOR_UPLOAD_SLOT_RULES,
  AI_CREATOR_VIDEO_DEFAULT_TEMPLATE,
  buildAiCreatorDownloadFilename,
  buildAiCreatorBlockedStateMatrix,
  createAiCreatorItemsFromGenerationJobs,
  createAiCreatorUploadPreview,
  createAiCreatorImageItem,
  createAiCreatorVideoItem,
  filterAiCreatorHistory,
  getAiCreatorGenerateBlockReason,
  getAiCreatorDownloadActionState,
  getAiCreatorRetryActionState,
  getAiCreatorVideoDurationFillPercent,
  paginateAiCreatorHistory,
  prependAiCreatorHistory,
  readAiCreatorHistory,
  removeAiCreatorHistoryItem,
  saveAiCreatorItemToCreatorDraft,
  saveAiCreatorItemToCreatorCoverDraft,
  toggleAiCreatorHistoryFavorite,
  getAiCreatorTimestamp,
  validateAiCreatorUploadSlot,
  writeAiCreatorHistory,
  type AiCreatorDownloadLinkSnapshot,
  type AiCreatorGalleryFilter,
  type AiCreatorGeneratedItem,
  type AiCreatorImageTemplate,
  type AiCreatorMode,
  type AiCreatorUploadPreview,
} from '../lib/aiCreator'

const aiCreatorBlockedStateMatrix = buildAiCreatorBlockedStateMatrix()

async function fetchBackendHistoryItems(limit = 12) {
  const res = await fetchGenerationJobs(limit)
  return {
    jobs: res.jobs,
    items: createAiCreatorItemsFromGenerationJobs(res.jobs),
  }
}

export function AICreatorPage() {
  const navigate = useNavigate()

  // Navigation & Character States
  const [characters, setCharacters] = useState<Character[]>([])
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [activeTab, setActiveTab] = useState<AiCreatorMode>('image')

  // Form Inputs
  const [brief, setBrief] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('realistic')
  const [referenceImage, setReferenceImage] = useState<string | null>(null)
  const [referenceImageMeta, setReferenceImageMeta] = useState<AiCreatorUploadPreview | null>(null)
  const [imageInputError, setImageInputError] = useState<string | null>(null)

  // Video Inputs
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState<number>(5)
  const [videoTemplate, setVideoTemplate] = useState(AI_CREATOR_VIDEO_DEFAULT_TEMPLATE)
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)
  const [referenceVideoMeta, setReferenceVideoMeta] = useState<AiCreatorUploadPreview | null>(null)
  const [videoInputError, setVideoInputError] = useState<string | null>(null)

  // App States
  const [isGenerating, setIsGenerating] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<AiCreatorGeneratedItem | null>(null)
  const [detailItem, setDetailItem] = useState<AiCreatorGeneratedItem | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null)
  const [downloadLinks, setDownloadLinks] = useState<Record<string, AiCreatorDownloadLinkSnapshot>>({})
  const [retryingItemId, setRetryingItemId] = useState<string | null>(null)


  // History stored in LocalStorage
  const [history, setHistory] = useState<AiCreatorGeneratedItem[]>(() => {
    if (typeof window === 'undefined') return []
    return readAiCreatorHistory(window.localStorage)
  })
  const [backendHistory, setBackendHistory] = useState<AiCreatorGeneratedItem[]>([])
  const [publicHistory, setPublicHistory] = useState<AiCreatorGeneratedItem[]>([])
  const [isPublishing, setIsPublishing] = useState(false)
  const [reportTarget, setReportTarget] = useState<AiCreatorGeneratedItem | null>(null)
  const [isReporting, setIsReporting] = useState(false)

  // Pagination & Filter States
  const [currentPage, setCurrentPage] = useState(1)
  const [galleryFilter, setGalleryFilter] = useState<AiCreatorGalleryFilter>('all')

  // Fetch characters on load
  useEffect(() => {
    let active = true
    fetchCharacters({ view: 'public', limit: 40 })
      .then((res) => {
        if (active && res.characters) {
          setCharacters(res.characters)
        }
      })
      .catch((err) => {
        logUnexpectedError('ดึงข้อมูลรายชื่อตัวละครเพื่อสร้างภาพร่างล้มเหลว', err)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    fetchBackendHistoryItems()
      .then(({ jobs, items }) => {
        if (!active) return
        setBackendHistory(items)
        if (jobs.length === 0) return
        setStatusMessage(`พบงานสร้างภาพที่บันทึกบนระบบ ${jobs.length} รายการ ใช้คลังในเครื่องต่อได้และพร้อมเชื่อมรายละเอียดงาน`)
      })
      .catch((err) => {
        logUnexpectedError('โหลดคลังงานสร้างภาพจากระบบไม่สำเร็จ', err)
      })
    return () => {
      active = false
    }
  }, [])

  const loadPublicGallery = () => {
    fetchPublicGallery(24)
      .then((res) => {
        const mapped = res.outputs.map((out) => ({
          id: `public-${out.id}`,
          backendJobId: out.jobId,
          backendOutputId: out.id,
          librarySource: 'backend' as const,
          type: out.kind,
          url: out.url || '',
          prompt: out.prompt || '',
          brief: '',
          style: out.kind === 'image' ? (out.templateId || '') : '',
          motionTemplate: out.kind === 'video' ? (out.templateId || '') : undefined,
          timestamp: Date.parse(out.createdAt) || getAiCreatorTimestamp(),
          isFavorite: out.isFavorite,
          visibility: out.visibility,
          response: {
            draft: {
              name: 'Public Generation',
              systemPrompt: out.prompt || '',
              avatarUrl: '', coverUrl: '', tagline: '', description: '', biography: '', scenario: '', greeting: '', exampleDialog: '', compactPrompt: '', characterAnchor: '', constraints: '', promptVersion: 1
            }
          }
        }))
        setPublicHistory(mapped as unknown as AiCreatorGeneratedItem[])
      })
      .catch((err) => {
        logUnexpectedError('โหลด Public Gallery ไม่สำเร็จ', err)
      })
  }

  useEffect(() => {
    loadPublicGallery()
  }, [])

  const saveHistory = (newHistory: AiCreatorGeneratedItem[]) => {
    setHistory(newHistory)
    if (typeof window !== 'undefined') {
      writeAiCreatorHistory(window.localStorage, newHistory)
    }
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()

    const isVideoMode = activeTab === 'video'
    const promptText = isVideoMode ? videoPrompt.trim() : imagePrompt.trim()
    const briefText = brief.trim()

    if (!briefText && !promptText) return

    setIsGenerating(true)
    setStatusMessage('กำลังวิเคราะห์เค้าโครงร่างของสื่อและติดต่อระบบสิทธิ์ผู้ให้บริการคีย์ตรง...')
    setLastResult(null)

    try {
      // Execute the generator draft backend service
      const res = await generateCreatorAiDraft({
        brief: briefText,
        imagePrompt: promptText,
        imageStyle: isVideoMode ? 'realistic' : imageStyle,
        imageOnly: false,
      })

      const targetChar = characters.find((c) => c.id === selectedCharacterId)
      if (targetChar) {
        res.draft.name = targetChar.name
      }

      let newItem: AiCreatorGeneratedItem

      if (isVideoMode) {
        newItem = createAiCreatorVideoItem({
          id: crypto.randomUUID(),
          response: res,
          prompt: videoPrompt.trim(),
          brief: briefText,
          duration: videoDuration,
          motionTemplate: videoTemplate,
        })
        setStatusMessage('ระบบจำลองการสั่นไหวและเรนเดอร์วิดีโอเคลื่อนไหวผ่านสิทธิ์ผู้ให้บริการคีย์ตรงเสร็จสิ้น')
      } else {
        newItem = createAiCreatorImageItem({
          id: crypto.randomUUID(),
          response: res,
          prompt: imagePrompt.trim() || briefText,
          brief: briefText,
          style: imageStyle,
        })
        setStatusMessage('ระบบวิเคราะห์ประมวลผลแบบสเก็ตช์ภาพร่างระบบเสร็จสิ้น')
      }

      saveHistory(prependAiCreatorHistory(history, newItem))
      setLastResult(newItem)
      setCurrentPage(1) // Reset to first page of gallery
    } catch (err) {
      logUnexpectedError('การประมวลผลสร้างภาพร่างขัดข้อง', err)
      if (err instanceof ApiError) {
        setStatusMessage(err.message)
      } else {
        setStatusMessage('ระบบสิทธิ์เชื่อมโยงขัดข้องชั่วคราว กรุณาตรวจสอบการตั้งค่าคีย์ของคุณแล้วลองใหม่อีกครั้ง')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle Preset Template Auto-click
  const handleTemplateClick = async (tpl: AiCreatorImageTemplate) => {
    setActiveTab('image')
    setImagePrompt(tpl.prompt)
    setImageStyle(tpl.style)

    // Submit the selected preset through the same generation path as manual prompts.
    setIsGenerating(true)
    setStatusMessage('กำลังโหลดโครงร่างสไตล์ความนุ่มนวลและเชื่อมระบบสร้างภาพร่างระบบ...')
    setLastResult(null)

    try {
      const res = await generateCreatorAiDraft({
        brief: brief.trim(),
        imagePrompt: tpl.prompt,
        imageStyle: tpl.style,
        imageOnly: false,
      })

      const newItem = createAiCreatorImageItem({
        id: crypto.randomUUID(),
        response: res,
        prompt: tpl.prompt,
        brief: brief.trim(),
        style: tpl.style,
      })

      saveHistory(prependAiCreatorHistory(history, newItem))
      setLastResult(newItem)
      setCurrentPage(1)
      setStatusMessage('ระบบวิเคราะห์ประมวลผลแม่แบบภาพร่างเสร็จสิ้นเรียบร้อย')
    } catch (err) {
      logUnexpectedError('ประมวลผลเทมเพลตภาพร่างไม่สำเร็จ', err)
      setStatusMessage('ไม่สามารถเรียกข้อมูลประมวลผลแม่แบบได้ชั่วคราว')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveToStudio = async (response: CreatorAiDraftResponse) => {
    try {
      setStatusMessage('กำลังบันทึกภาพร่างเข้าสู่ศูนย์ควบคุมห้องทำงานนักพัฒนา...')
      await updateCreatorDraft(response.draft)
      setStatusMessage('บันทึกภาพร่างระบบและบุคลิกเข้าสู่ห้องทำงานสตูดิโอเรียบร้อยแล้ว')
    } catch (err) {
      logUnexpectedError('บันทึกข้อมูลดราฟต์นักพัฒนาไม่สำเร็จ', err)
      setStatusMessage('ไม่สามารถบันทึกข้อมูลโครงร่างสำเร็จ')
    }
  }

  const handleOpenHistoryDetail = (item: AiCreatorGeneratedItem) => {
    setLastResult(item)
    setDetailItem(item)
    setActiveTab(item.type === 'video' ? 'video' : 'image')
  }

  const handleReuseFromHistory = (item: AiCreatorGeneratedItem) => {
    setLastResult(item)
    setDetailItem(null)
    setBrief(item.brief)
    if (item.type === 'video') {
      setActiveTab('video')
      setVideoPrompt(item.prompt)
      setVideoDuration(item.duration || 5)
      setVideoTemplate(item.motionTemplate || AI_CREATOR_VIDEO_DEFAULT_TEMPLATE)
      
      if (item.librarySource === 'backend' && item.url) {
        setReferenceVideo(item.url)
        setReferenceVideoMeta({
          name: 'แกลเลอรีสาธารณะ (Video)',
          typeLabel: 'Video Reference',
          sizeLabel: 'Remote',
        })
      }
    } else {
      setActiveTab('image')
      setImagePrompt(item.prompt)
      setImageStyle(item.style)
      
      if (item.librarySource === 'backend' && item.url) {
        setReferenceImage(item.url)
        setReferenceImageMeta({
          name: 'แกลเลอรีสาธารณะ (Image)',
          typeLabel: 'Image Reference',
          sizeLabel: 'Remote',
        })
      }
    }
  }

  const deleteHistoryItem = (itemId: string) => {
    const backendItem = backendHistory.find((item) => item.id === itemId)
    if (backendItem?.backendOutputId) {
      void deleteGenerationOutput(backendItem.backendOutputId)
        .then(() => {
          setBackendHistory((items) => items.filter((item) => item.id !== itemId))
          setDownloadLinks((links) => {
            const nextLinks = { ...links }
            delete nextLinks[itemId]
            return nextLinks
          })
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

    const nextHistory = removeAiCreatorHistoryItem(history, itemId)
    saveHistory(nextHistory)
    setDownloadLinks((links) => {
      const nextLinks = { ...links }
      delete nextLinks[itemId]
      return nextLinks
    })
    if (lastResult?.id === itemId) {
      setLastResult(null)
    }
    if (detailItem?.id === itemId) {
      setDetailItem(null)
    }
    const nextFilteredLength = filterAiCreatorHistory(nextHistory, galleryFilter).length
    const nextTotalPages = Math.ceil(nextFilteredLength / AI_CREATOR_HISTORY_PAGE_SIZE) || 1
    setCurrentPage((page) => Math.min(page, nextTotalPages))
  }

  const handleReportSubmit = async (input: ReportDialogSubmit) => {
    if (!reportTarget) return
    setIsReporting(true)
    try {
      await reportGenerationOutput(reportTarget.id, input.reason, input.details)
      setStatusMessage('ส่งรายงานสำเร็จ ผู้ดูแลระบบจะตรวจสอบต่อไป')
      setReportTarget(null)
      // Hide from UI optimistically or let user wait for admin review
      setPublicHistory((prev) => prev.filter((item) => item.id !== reportTarget.id))
      setDetailItem(null)
    } catch (err) {
      logUnexpectedError('ส่งรายงานไม่สำเร็จ', err)
      setStatusMessage('เกิดข้อผิดพลาดในการส่งรายงาน')
    } finally {
      setIsReporting(false)
    }
  }

  const toggleHistoryFavorite = (itemId: string) => {
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

    const nextHistory = toggleAiCreatorHistoryFavorite(history, itemId)
    saveHistory(nextHistory)
    const nextItem = nextHistory.find((item) => item.id === itemId) ?? null
    if (lastResult?.id === itemId) setLastResult(nextItem)
    if (detailItem?.id === itemId) setDetailItem(nextItem)
    setStatusMessage(nextItem?.isFavorite ? 'เพิ่มชิ้นงานเข้ารายการโปรดแล้ว' : 'นำชิ้นงานออกจากรายการโปรดแล้ว')
  }

  const toggleHistoryPublish = async (item: AiCreatorGeneratedItem) => {
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
      loadPublicGallery() // refresh
    } catch (err) {
      logUnexpectedError('ปรับสถานะเผยแพร่ไม่สำเร็จ', err)
      setStatusMessage(err instanceof ApiError ? err.message : 'ปรับสถานะเผยแพร่ไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsPublishing(false)
    }
  }

  const clearHistory = () => {
    saveHistory([])
    setCurrentPage(1)
    setLastResult(null)
    setDetailItem(null)
    setDownloadLinks({})
  }

  const handleCopySystemPrompt = () => {
    if (!lastResult) return
    void safeWriteClipboardText(getSafeClipboard(), lastResult.response.draft.systemPrompt).then((success) => {
      if (success) {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
      }
    })
  }

  const handleCopyHistorySystemPrompt = (item: AiCreatorGeneratedItem) => {
    void safeWriteClipboardText(getSafeClipboard(), item.response.draft.systemPrompt).then((success) => {
      setStatusMessage(success ? 'คัดลอก system prompt ของชิ้นงานแล้ว' : 'คัดลอก system prompt ไม่สำเร็จ')
    })
  }

  const handleUseAsCharacterImage = (item: AiCreatorGeneratedItem) => {
    if (typeof window === 'undefined') return
    const draft = saveAiCreatorItemToCreatorDraft(window.localStorage, item)
    void updateCreatorDraft(draft).catch(() => {})
    setDetailItem(null)
    setStatusMessage('ส่งรูปและเนื้อหาตั้งต้นไปยังหน้าสร้างตัวละครแล้ว')
    navigate('/create')
  }

  const handleUseAsCover = (item: AiCreatorGeneratedItem) => {
    if (typeof window === 'undefined') return
    const draft = saveAiCreatorItemToCreatorCoverDraft(window.localStorage, item)
    void updateCreatorDraft(draft).catch(() => {})
    setDetailItem(null)
    setStatusMessage('บันทึกรูปนี้เป็นภาพปกในดราฟต์หน้าสร้างตัวละครแล้ว')
    navigate('/create')
  }

  const startDownload = (url: string, filename: string) => {
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const handleDownloadHistoryItem = async (item: AiCreatorGeneratedItem) => {
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
  }

  const handleRetryHistoryItem = async (item: AiCreatorGeneratedItem) => {
    const retryState = getAiCreatorRetryActionState(item)
    if (!retryState.canRetry || !item.backendJobId || retryingItemId) {
      setStatusMessage(retryState.title)
      return
    }

    setRetryingItemId(item.id)
    try {
      await retryGenerationJob(item.backendJobId)
      const { items } = await fetchBackendHistoryItems()
      setBackendHistory(items)
      setCurrentPage(1)
      setStatusMessage('บันทึกงานสร้างซ้ำแล้ว ระบบยังไม่หักโทเคนจนกว่างานจริงจะถูกเข้าคิว')
    } catch (err) {
      logUnexpectedError('สร้างงาน AI Creator ซ้ำไม่สำเร็จ', err)
      setStatusMessage(err instanceof ApiError ? err.message : 'สร้างงานซ้ำไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
    } finally {
      setRetryingItemId(null)
    }
  }

  const handleImageReferenceFile = (file: File, input: HTMLInputElement) => {
    const validation = validateAiCreatorUploadSlot(AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage[0], { file })
    if (!validation.ok) {
      setReferenceImage(null)
      setReferenceImageMeta(null)
      setImageInputError(validation.reason)
      setStatusMessage(validation.reason)
      input.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => setReferenceImage(reader.result as string)
    reader.readAsDataURL(file)
    setReferenceImageMeta(createAiCreatorUploadPreview(file))
    setImageInputError(null)
    setStatusMessage(`โหลดรูปอ้างอิงแล้ว: ${file.name}`)
  }

  const handleVideoReferenceFile = (file: File, input: HTMLInputElement) => {
    const validation = validateAiCreatorUploadSlot(AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo[0], {
      file,
      durationSeconds: videoDuration,
    })
    if (!validation.ok) {
      setReferenceVideo(null)
      setReferenceVideoMeta(null)
      setVideoInputError(validation.reason)
      setStatusMessage(validation.reason)
      input.value = ''
      return
    }

    setReferenceVideo(file.name)
    setReferenceVideoMeta(createAiCreatorUploadPreview(file))
    setVideoInputError(null)
    setStatusMessage(`โหลดวิดีโออ้างอิงแล้ว: ${file.name}`)
  }

  // Filter and Paginate History items
  const combinedHistory = [...backendHistory, ...history]
  const filteredHistory = filterAiCreatorHistory(combinedHistory, galleryFilter)

  const totalPages = Math.ceil(filteredHistory.length / AI_CREATOR_HISTORY_PAGE_SIZE) || 1
  const paginatedHistory = paginateAiCreatorHistory(filteredHistory, currentPage)
  const imageGenerateBlockReason = getAiCreatorGenerateBlockReason({
    mode: 'image',
    brief,
    prompt: imagePrompt,
    isGenerating,
    inputError: imageInputError,
  })
  const videoGenerateBlockReason = getAiCreatorGenerateBlockReason({
    mode: 'video',
    brief,
    prompt: videoPrompt,
    isGenerating,
    requiredUploadCount: AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo.length,
    uploadedCount: referenceVideo ? 1 : 0,
    inputError: videoInputError,
  })
  const videoDurationFillPercent = getAiCreatorVideoDurationFillPercent(videoDuration)

  return (
    <div className="missai-page text-white" data-testid="ai-creator-page">
      <div className="missai-shell max-w-7xl">
        {/* Upper bar */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link
            to="/create"
            className="missai-button-secondary min-h-10 rounded-xl px-4 text-xs"
          >
            <ArrowLeft size={14} />
            กลับสู่ห้องควบคุมหลัก
          </Link>

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-[0_2px_12px_rgba(168,85,247,0.3)]">
                CG造物主
              </span>
              <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-300 to-cyan-400">
                หน้าออกแบบภาพร่างและโมเดลเคลื่อนไหว
              </h1>
            </div>
            <p className="text-xs font-medium text-[#6b7280] mt-1">
              ระบบควบคุมภาพและวิดีโออัจฉริยะผ่านสิทธิ์ผู้ให้บริการคีย์ตรง (Enterprise Direct Key Creator Surface)
            </p>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Side: Dynamic Multi-Tab Controls */}
          <section className="lg:col-span-5 space-y-6">
            <AiCreatorControlPanel
              activeTab={activeTab}
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              brief={brief}
              imagePrompt={imagePrompt}
              imageStyle={imageStyle}
              referenceImage={referenceImage}
              referenceImageMeta={referenceImageMeta}
              videoPrompt={videoPrompt}
              videoDuration={videoDuration}
              videoDurationFillPercent={videoDurationFillPercent}
              videoTemplate={videoTemplate}
              referenceVideo={referenceVideo}
              referenceVideoMeta={referenceVideoMeta}
              isGenerating={isGenerating}
              statusMessage={statusMessage}
              imageGenerateBlockReason={imageGenerateBlockReason}
              videoGenerateBlockReason={videoGenerateBlockReason}
              onTabChange={(tab) => {
                setActiveTab(tab)
                setStatusMessage('')
              }}
              onSelectedCharacterIdChange={setSelectedCharacterId}
              onBriefChange={setBrief}
              onImagePromptChange={setImagePrompt}
              onImageStyleChange={setImageStyle}
              onImageReferenceFile={handleImageReferenceFile}
              onClearImageReference={() => {
                setReferenceImage(null)
                setReferenceImageMeta(null)
                setImageInputError(null)
              }}
              onVideoPromptChange={setVideoPrompt}
              onVideoDurationChange={setVideoDuration}
              onVideoTemplateChange={setVideoTemplate}
              onVideoReferenceFile={handleVideoReferenceFile}
              onClearVideoReference={() => {
                setReferenceVideo(null)
                setReferenceVideoMeta(null)
                setVideoInputError(null)
              }}
              onGenerate={handleGenerate}
              onTemplateClick={(template) => void handleTemplateClick(template)}
            />
          </section>

          {/* Right Side: Interactive Preview surface */}
          <section className="lg:col-span-7">
            <AiCreatorResultPreview
              result={lastResult}
              copiedPrompt={copiedPrompt}
              onSaveToStudio={(response) => void handleSaveToStudio(response)}
              onCopySystemPrompt={handleCopySystemPrompt}
            />
          </section>
        </div>

        <AiCreatorHistoryGallery
          historyCount={history.length}
          filteredCount={filteredHistory.length}
          items={paginatedHistory}
          galleryFilter={galleryFilter}
          currentPage={currentPage}
          totalPages={totalPages}
          onFilterChange={(filter) => {
            setGalleryFilter(filter)
            setCurrentPage(1)
          }}
          onPageChange={setCurrentPage}
          onOpenItem={handleOpenHistoryDetail}
          onReuseItem={handleReuseFromHistory}
          onUseAsCharacterImage={handleUseAsCharacterImage}
          onToggleFavorite={toggleHistoryFavorite}
          onDeleteItem={deleteHistoryItem}
          onClearHistory={clearHistory}
        />

        <AiCreatorPublicGalleryPanel
          privateItemCount={combinedHistory.length}
          publicItems={publicHistory}
          onOpenItem={handleOpenHistoryDetail}
          onReuseItem={handleReuseFromHistory}
          onCreateFocus={() => {
            setActiveTab('image')
            setStatusMessage('สร้างชิ้นงานใหม่ได้จากแผงด้านบน')
          }}
        />

        <AiCreatorBlockedStateMatrix states={aiCreatorBlockedStateMatrix} />

        <AiCreatorHistoryDetailDialog
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onReuse={handleReuseFromHistory}
          onDelete={deleteHistoryItem}
          onToggleFavorite={toggleHistoryFavorite}
          onUseAsCharacterImage={handleUseAsCharacterImage}
          onUseAsCover={handleUseAsCover}
          onCopySystemPrompt={handleCopyHistorySystemPrompt}
          onDownload={(item) => void handleDownloadHistoryItem(item)}
          onRetry={(item) => void handleRetryHistoryItem(item)}
          onTogglePublish={toggleHistoryPublish}
          onReport={(item) => setReportTarget(item)}
          downloadLink={detailItem ? downloadLinks[detailItem.id] ?? null : null}
          downloadingItemId={downloadingItemId}
          retryingItemId={retryingItemId}
          isPublishing={isPublishing}
        />

        <ReportDialog
          isOpen={!!reportTarget}
          isSubmitting={isReporting}
          target={
            reportTarget
              ? {
                  targetType: 'GENERATION_OUTPUT',
                  title: reportTarget.response.draft.name,
                  preview: `Prompt: ${reportTarget.prompt}\nBrief: ${reportTarget.brief}`,
                }
              : null
          }
          onClose={() => setReportTarget(null)}
          onSubmit={handleReportSubmit}
        />
      </div>
    </div>
  )
}
