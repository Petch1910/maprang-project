import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AiCreatorBlockedStateMatrix } from '../components/ai-creator/AiCreatorBlockedStateMatrix'
import { AiCreatorControlPanel } from '../components/ai-creator/AiCreatorControlPanel'
import { AiCreatorHistoryGallery } from '../components/ai-creator/AiCreatorHistoryGallery'
import { AiCreatorHistoryDetailDialog } from '../components/ai-creator/AiCreatorHistoryDetailDialog'
import { AiCreatorPublicGalleryPanel } from '../components/ai-creator/AiCreatorPublicGalleryPanel'
import { AiCreatorResultPreview } from '../components/ai-creator/AiCreatorResultPreview'
import { ReportDialog } from '../components/ReportDialog'
import { currentRoutePath, trackFrontendEventSafe } from '../lib/analytics'
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

const aiCreatorBlockedStateMatrix = buildAiCreatorBlockedStateMatrix()

export function AICreatorPage() {
  // Navigation & Character States
  const characters = useAiCreatorCharacterOptions(40)
  const [selectedCharacterId, setSelectedCharacterId] = useState('')
  const [activeTab, setActiveTab] = useState<AiCreatorMode>('image')

  // Form Inputs
  const [brief, setBrief] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [imageStyle, setImageStyle] = useState('realistic')

  // Video Inputs
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDuration, setVideoDuration] = useState<number>(5)
  const [videoTemplate, setVideoTemplate] = useState(AI_CREATOR_VIDEO_DEFAULT_TEMPLATE)

  // App States
  const [statusMessage, setStatusMessage] = useState('')
  const [lastResult, setLastResult] = useState<AiCreatorGeneratedItem | null>(null)
  const [detailItem, setDetailItem] = useState<AiCreatorGeneratedItem | null>(null)

  // History stored in LocalStorage
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
  const [reportTarget, setReportTarget] = useState<AiCreatorGeneratedItem | null>(null)
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

  useEffect(() => {
    trackFrontendEventSafe({
      eventName: 'ai_creator_opened',
      route: currentRoutePath(),
      entityType: 'surface',
      entityId: 'ai-creator',
    })
  }, [])

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
  const { isGenerating, handleGenerate, handleTemplateClick } = useAiCreatorGeneration({
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
    } else {
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
              videoProviderNotice={AI_CREATOR_VIDEO_PROVIDER_NOTICE}
              onTabChange={(tab) => {
                setActiveTab(tab)
                setStatusMessage('')
              }}
              onSelectedCharacterIdChange={setSelectedCharacterId}
              onBriefChange={setBrief}
              onImagePromptChange={setImagePrompt}
              onImageStyleChange={setImageStyle}
              onImageReferenceFile={handleImageReferenceFile}
              onClearImageReference={clearImageReference}
              onVideoPromptChange={setVideoPrompt}
              onVideoDurationChange={setVideoDuration}
              onVideoTemplateChange={setVideoTemplate}
              onVideoReferenceFile={handleVideoReferenceFile}
              onClearVideoReference={clearVideoReference}
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
              onCopySystemPrompt={() => handleCopySystemPrompt(lastResult)}
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
          onFilterChange={handleFilterChange}
          onPageChange={setCurrentPage}
          onOpenItem={handleOpenHistoryDetail}
          onReuseItem={handleReuseFromHistory}
          onUseAsCharacterImage={(item) => void handleUseAsCharacterImage(item)}
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
          onUseAsCharacterImage={(item) => void handleUseAsCharacterImage(item)}
          onUseAsCover={(item) => void handleUseAsCover(item)}
          onCopySystemPrompt={handleCopyHistorySystemPrompt}
          onDownload={(item) => void handleDownloadHistoryItem(item)}
          onRetry={(item) => void handleRetryHistoryItem(item)}
          onCancel={(item) => void handleCancelHistoryItem(item)}
          onTogglePublish={toggleHistoryPublish}
          onReport={(item) => setReportTarget(item)}
          downloadLink={detailItem ? downloadLinks[detailItem.id] ?? null : null}
          downloadingItemId={downloadingItemId}
          retryingItemId={retryingItemId}
          cancellingItemId={cancellingItemId}
          creatorReferenceAction={creatorReferenceAction}
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
