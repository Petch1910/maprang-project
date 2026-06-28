import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AiCreatorBlockedStateMatrix } from '../components/ai-creator/AiCreatorBlockedStateMatrix'
import { AiCreatorControlPanel } from '../components/ai-creator/AiCreatorControlPanel'
import { AiCreatorHistoryDetailDialog } from '../components/ai-creator/AiCreatorHistoryDetailDialog'
import { AiCreatorHistoryGallery } from '../components/ai-creator/AiCreatorHistoryGallery'
import { AiCreatorPublicGalleryPanel } from '../components/ai-creator/AiCreatorPublicGalleryPanel'
import { AiCreatorResultPreview } from '../components/ai-creator/AiCreatorResultPreview'
import { ReportDialog } from '../components/ReportDialog'
import { useAiCreatorCharacterOptions } from '../hooks/useAiCreatorCharacterOptions'
import { useAiCreatorDownloads } from '../hooks/useAiCreatorDownloads'
import { useAiCreatorGeneration } from '../hooks/useAiCreatorGeneration'
import { useAiCreatorHistoryView } from '../hooks/useAiCreatorHistoryView'
import { useAiCreatorLibraryActions } from '../hooks/useAiCreatorLibraryActions'
import { useAiCreatorLocalHistory } from '../hooks/useAiCreatorLocalHistory'
import { useAiCreatorRemoteGalleries } from '../hooks/useAiCreatorRemoteGalleries'
import { useAiCreatorStudioActions } from '../hooks/useAiCreatorStudioActions'
import { useAiCreatorStudioBridge } from '../hooks/useAiCreatorStudioBridge'
import { useAiCreatorUploadReferences } from '../hooks/useAiCreatorUploadReferences'
import {
  AI_CREATOR_UPLOAD_SLOT_RULES,
  AI_CREATOR_VIDEO_DEFAULT_TEMPLATE,
  AI_CREATOR_VIDEO_PROVIDER_NOTICE,
  AI_CREATOR_VIDEO_PROVIDER_STATUS,
  buildAiCreatorBlockedStateMatrix,
  getAiCreatorGenerateBlockReason,
  getAiCreatorVideoDurationFillPercent,
  type AiCreatorGeneratedItem,
  type AiCreatorMode,
} from '../lib/aiCreator'
import { currentRoutePath, trackFrontendEventSafe } from '../lib/analytics'

const aiCreatorBlockedStateMatrix = buildAiCreatorBlockedStateMatrix()

export function AICreatorPage() {
  const characters = useAiCreatorCharacterOptions(40)
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [activeTab, setActiveTab] = useState<AiCreatorMode>('image')
  const [brief, setBrief] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('realistic')
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState<number>(5)
  const [videoTemplate, setVideoTemplate] = useState(AI_CREATOR_VIDEO_DEFAULT_TEMPLATE)
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<AiCreatorGeneratedItem | null>(null)
  const [detailItem, setDetailItem] = useState<AiCreatorGeneratedItem | null>(null)
  const [reportTarget, setReportTarget] = useState<AiCreatorGeneratedItem | null>(null)

  const {
    history,
    prependHistoryItem,
    removeHistoryItem,
    toggleHistoryFavorite: toggleLocalHistoryFavorite,
    clearLocalHistory,
  } = useAiCreatorLocalHistory()
  const {
    backendHistory,
    setBackendHistory,
    publicHistory,
    setPublicHistory,
    reloadBackendHistory,
    reloadPublicGallery,
  } = useAiCreatorRemoteGalleries({ onStatusMessage: setStatusMessage })
  const {
    combinedHistory,
    currentPage,
    galleryFilter,
    filteredHistory,
    paginatedHistory,
    totalPages,
    setCurrentPage,
    handleFilterChange,
  } = useAiCreatorHistoryView(backendHistory, history)
  const {
    downloadingItemId,
    downloadLinks,
    handleDownloadHistoryItem,
    removeDownloadLink,
    clearDownloadLinks,
  } = useAiCreatorDownloads(setStatusMessage)
  const {
    referenceImage,
    referenceImageMeta,
    imageInputError,
    referenceVideo,
    referenceVideoMeta,
    videoInputError,
    handleImageReferenceFile,
    handleVideoReferenceFile,
    clearImageReference,
    clearVideoReference,
    setReferenceImage,
    setReferenceImageMeta,
    setReferenceVideo,
    setReferenceVideoMeta,
  } = useAiCreatorUploadReferences(videoDuration, setStatusMessage)

  useEffect(() => {
    trackFrontendEventSafe({
      eventName: 'ai_creator_opened',
      route: currentRoutePath(),
      entityType: 'surface',
      entityId: 'ai-creator',
    })
  }, [])

  const { isGenerating, handleGenerate } = useAiCreatorGeneration({
    activeTab,
    brief,
    characters,
    imagePrompt,
    imageStyle,
    selectedCharacterId,
    videoDuration,
    videoPrompt,
    videoTemplate,
    prependHistoryItem,
    setActiveTab,
    setCurrentPage,
    setImagePrompt,
    setImageStyle,
    setLastResult,
    setStatusMessage,
  })
  const {
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
  } = useAiCreatorLibraryActions({
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
  })
  const {
    creatorReferenceAction,
    handleUseAsCharacterImage,
    handleUseAsCover,
  } = useAiCreatorStudioBridge(setStatusMessage, setDetailItem)
  const {
    copiedPrompt,
    handleSaveToStudio,
    handleCopySystemPrompt,
    handleCopyHistorySystemPrompt,
  } = useAiCreatorStudioActions(setStatusMessage)

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
          name: 'แกลเลอรีสาธารณะ (วิดีโอ)',
          typeLabel: 'วิดีโออ้างอิง',
          sizeLabel: 'ไฟล์ระยะไกล',
        })
      }
      return
    }

    setActiveTab('image')
    setImagePrompt(item.prompt)
    setImageStyle(item.style)

    if (item.librarySource === 'backend' && item.url) {
      setReferenceImage(item.url)
      setReferenceImageMeta({
        name: 'แกลเลอรีสาธารณะ (รูปภาพ)',
        typeLabel: 'รูปอ้างอิง',
        sizeLabel: 'ไฟล์ระยะไกล',
      })
    }
  }

  const clearHistory = () => {
    clearLocalHistory()
    setCurrentPage(1)
    setLastResult(null)
    setDetailItem(null)
    clearDownloadLinks()
  }

  const imageGenerateBlockReason = getAiCreatorGenerateBlockReason({
    mode: 'image',
    brief,
    prompt: imagePrompt,
    isGenerating,
    requiredUploadCount: activeTab === 'template' ? AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage.length : 0,
    uploadedCount: activeTab === 'template' && referenceImage ? 1 : 0,
    inputError: imageInputError,
  })
  const videoGenerateBlockReason = getAiCreatorGenerateBlockReason({
    mode: 'video',
    brief,
    prompt: videoPrompt,
    isGenerating,
    providerStatus: AI_CREATOR_VIDEO_PROVIDER_STATUS,
    requiredUploadCount: AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo.length,
    uploadedCount: referenceVideo ? 1 : 0,
    inputError: videoInputError,
  })
  const videoDurationFillPercent = getAiCreatorVideoDurationFillPercent(videoDuration)

  return (
    <div className="missai-page text-white" data-testid="ai-creator-page">
      <div className="missai-shell max-w-[86rem]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <Link className="missai-button-secondary min-h-10 rounded-xl px-4 text-xs" to="/create">
            <ArrowLeft size={14} />
            กลับไปหน้าสร้างตัวละคร
          </Link>

          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="rounded-xl bg-[#ac4bff] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_2px_12px_rgba(172,75,255,0.3)]">
                ผู้ช่วยสร้างรูป
              </span>
              <h1 className="text-2xl font-black text-white">ห้องสร้างรูปและสื่อของมะปราง</h1>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-500">
              เลือกแม่แบบ ใส่คำสั่ง สร้างรูป เก็บเข้าคลัง และส่งต่อไปยังหน้าสตูดิโอสร้างตัวละครได้ในหน้าเดียว
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
          <section className="space-y-6">
            <AiCreatorControlPanel
              activeTab={activeTab}
              brief={brief}
              characters={characters}
              imageGenerateBlockReason={imageGenerateBlockReason}
              imagePrompt={imagePrompt}
              imageStyle={imageStyle}
              isGenerating={isGenerating}
              onBriefChange={setBrief}
              onClearImageReference={clearImageReference}
              onClearVideoReference={clearVideoReference}
              onGenerate={handleGenerate}
              onImagePromptChange={setImagePrompt}
              onImageReferenceFile={handleImageReferenceFile}
              onImageStyleChange={setImageStyle}
              onSelectedCharacterIdChange={setSelectedCharacterId}
              onTabChange={(tab) => {
                setActiveTab(tab)
                setStatusMessage('')
              }}
              onVideoDurationChange={setVideoDuration}
              onVideoPromptChange={setVideoPrompt}
              onVideoReferenceFile={handleVideoReferenceFile}
              onVideoTemplateChange={setVideoTemplate}
              referenceImage={referenceImage}
              referenceImageMeta={referenceImageMeta}
              referenceVideo={referenceVideo}
              referenceVideoMeta={referenceVideoMeta}
              selectedCharacterId={selectedCharacterId}
              statusMessage={statusMessage}
              videoDuration={videoDuration}
              videoDurationFillPercent={videoDurationFillPercent}
              videoGenerateBlockReason={videoGenerateBlockReason}
              videoPrompt={videoPrompt}
              videoProviderNotice={AI_CREATOR_VIDEO_PROVIDER_NOTICE}
              videoTemplate={videoTemplate}
            />
          </section>

          <section>
            <AiCreatorResultPreview
              copiedPrompt={copiedPrompt}
              onCopySystemPrompt={() => handleCopySystemPrompt(lastResult)}
              onSaveToStudio={(response) => void handleSaveToStudio(response)}
              result={lastResult}
            />
          </section>
        </div>

        <AiCreatorHistoryGallery
          currentPage={currentPage}
          filteredCount={filteredHistory.length}
          galleryFilter={galleryFilter}
          historyCount={history.length}
          items={paginatedHistory}
          onClearHistory={clearHistory}
          onDeleteItem={deleteHistoryItem}
          onFilterChange={handleFilterChange}
          onOpenItem={handleOpenHistoryDetail}
          onPageChange={setCurrentPage}
          onReuseItem={handleReuseFromHistory}
          onToggleFavorite={toggleHistoryFavorite}
          onUseAsCharacterImage={(item) => void handleUseAsCharacterImage(item)}
          totalPages={totalPages}
        />

        <AiCreatorPublicGalleryPanel
          privateItemCount={combinedHistory.length}
          publicItems={publicHistory}
          onCreateFocus={() => {
            setActiveTab('image')
            setStatusMessage('สร้างชิ้นงานใหม่ได้จากแผงด้านบน')
          }}
          onOpenItem={handleOpenHistoryDetail}
          onReuseItem={handleReuseFromHistory}
        />

        <AiCreatorBlockedStateMatrix states={aiCreatorBlockedStateMatrix} />

        <AiCreatorHistoryDetailDialog
          cancellingItemId={cancellingItemId}
          creatorReferenceAction={creatorReferenceAction}
          downloadLink={detailItem ? downloadLinks[detailItem.id] ?? null : null}
          downloadingItemId={downloadingItemId}
          isPublishing={isPublishing}
          item={detailItem}
          onCancel={(item) => void handleCancelHistoryItem(item)}
          onClose={() => setDetailItem(null)}
          onCopySystemPrompt={handleCopyHistorySystemPrompt}
          onDelete={deleteHistoryItem}
          onDownload={(item) => void handleDownloadHistoryItem(item)}
          onReport={(item) => setReportTarget(item)}
          onRetry={(item) => void handleRetryHistoryItem(item)}
          onReuse={handleReuseFromHistory}
          onToggleFavorite={toggleHistoryFavorite}
          onTogglePublish={toggleHistoryPublish}
          onUseAsCharacterImage={(item) => void handleUseAsCharacterImage(item)}
          onUseAsCover={(item) => void handleUseAsCover(item)}
          retryingItemId={retryingItemId}
        />

        <ReportDialog
          isOpen={!!reportTarget}
          isSubmitting={isReporting}
          target={
            reportTarget
              ? {
                  targetType: 'GENERATION_OUTPUT',
                  title: reportTarget.response.draft.name,
                  preview: `คำสั่ง: ${reportTarget.prompt}\nบริบท: ${reportTarget.brief}`,
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
