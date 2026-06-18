import { useEffect } from 'react'
import { BookOpen, CircleX, Copy, Download, Flag, Image as ImageIcon, RefreshCcw, RotateCcw, Sparkles, Star, Trash2, X } from 'lucide-react'
import {
  getAiCreatorCancelActionState,
  getAiCreatorDownloadActionState,
  getAiCreatorDownloadLinkNotice,
  getAiCreatorRetryActionState,
  type AiCreatorDownloadLinkSnapshot,
  type AiCreatorGeneratedItem,
} from '../../lib/aiCreator'

type AiCreatorHistoryDetailDialogProps = {
  item: AiCreatorGeneratedItem | null
  onClose: () => void
  onReuse: (item: AiCreatorGeneratedItem) => void
  onDelete: (itemId: string) => void
  onToggleFavorite: (itemId: string) => void
  onUseAsCharacterImage: (item: AiCreatorGeneratedItem) => void
  onUseAsCover: (item: AiCreatorGeneratedItem) => void
  onCopySystemPrompt: (item: AiCreatorGeneratedItem) => void
  onDownload: (item: AiCreatorGeneratedItem) => void
  onRetry: (item: AiCreatorGeneratedItem) => void
  onCancel: (item: AiCreatorGeneratedItem) => void
  onTogglePublish?: (item: AiCreatorGeneratedItem) => void
  onReport?: (item: AiCreatorGeneratedItem) => void
  downloadLink?: AiCreatorDownloadLinkSnapshot | null
  downloadingItemId?: string | null
  retryingItemId?: string | null
  cancellingItemId?: string | null
  creatorReferenceAction?: {
    itemId: string
    target: 'character-image' | 'cover'
  } | null
  isPublishing?: boolean
}

function formatGeneratedTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return 'ไม่ทราบเวลา'
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function AiCreatorHistoryDetailDialog({
  item,
  onClose,
  onReuse,
  onDelete,
  onToggleFavorite,
  onUseAsCharacterImage,
  onUseAsCover,
  onCopySystemPrompt,
  onDownload,
  onRetry,
  onCancel,
  onTogglePublish,
  onReport,
  downloadLink,
  downloadingItemId,
  retryingItemId,
  cancellingItemId,
  creatorReferenceAction,
  isPublishing,
}: AiCreatorHistoryDetailDialogProps) {
  useEffect(() => {
    if (!item) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [item, onClose])

  if (!item) return null

  const isVideo = item.type === 'video'
  const sourceLabel = item.videoUrl === 'local-video-preview' ? 'พรีวิวระบบในเครื่อง' : 'ภาพร่างระบบ'
  const downloadState = getAiCreatorDownloadActionState(item)
  const downloadNotice = getAiCreatorDownloadLinkNotice(downloadLink)
  const retryState = getAiCreatorRetryActionState(item)
  const cancelState = getAiCreatorCancelActionState(item)
  const isPublicGalleryItem = item.id.startsWith('public-')
  const isDownloading = downloadingItemId === item.id
  const isRetrying = retryingItemId === item.id
  const isCancelling = cancellingItemId === item.id
  const isUsingAsCharacterImage =
    creatorReferenceAction?.itemId === item.id && creatorReferenceAction.target === 'character-image'
  const isUsingAsCover = creatorReferenceAction?.itemId === item.id && creatorReferenceAction.target === 'cover'
  const isPublic = item.visibility === 'public'
  const downloadLabel =
    !isDownloading && downloadNotice?.state === 'signed-expired' ? 'รีเฟรชลิงก์' : downloadState.label

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-creator-history-detail-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        data-testid={`ai-creator-library-detail-dialog-${item.id}`}
        className="missai-dialog w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#111225] shadow-2xl"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 p-5">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#a78bfa]">
              {isPublicGalleryItem ? 'Public Gallery Detail' : 'My Library Detail'}
            </p>
            <h2 id="ai-creator-history-detail-title" className="mt-1 text-xl font-black text-white">
              {item.response.draft.name}
            </h2>
            <p className="mt-1 text-xs font-semibold text-white/45">
              {isVideo ? 'วิดีโอพรีวิว' : 'ภาพร่าง'} · {isPublicGalleryItem ? 'ผลงานสาธารณะที่ผ่านการคัดกรอง' : sourceLabel} · {formatGeneratedTime(item.timestamp)}
            </p>
          </div>

          <button
            type="button"
            className="missai-icon-button"
            onClick={onClose}
            title="ปิดรายละเอียด"
            aria-label="ปิดรายละเอียด"
          >
            <X size={16} />
          </button>
        </header>

        <div className="grid max-h-[78vh] gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
          <div className="space-y-4">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
              <img src={item.url} alt={item.response.draft.name} className="aspect-[3/4] w-full object-cover" />
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-favorite-${item.id}`}
                  className={`justify-center ${
                    item.isFavorite ? 'missai-button-primary' : 'missai-button-secondary'
                  }`}
                  onClick={() => onToggleFavorite(item.id)}
                  title={item.isFavorite ? 'นำออกจากรายการโปรด' : 'เพิ่มเข้ารายการโปรด'}
                  aria-pressed={item.isFavorite === true}
                >
                  <Star size={14} fill={item.isFavorite ? 'currentColor' : 'none'} />
                  {item.isFavorite ? 'ติดดาวแล้ว' : 'ติดดาว'}
                </button>
              )}
              <button
                type="button"
                data-testid={`ai-creator-library-detail-reuse-${item.id}`}
                className="missai-button-primary justify-center"
                onClick={() => onReuse(item)}
                title="นำ prompt และ template นี้กลับไปแก้ต่อ"
              >
                <RotateCcw size={14} />
                ใช้ซ้ำ
              </button>
              <button
                type="button"
                data-testid={`ai-creator-library-detail-use-image-${item.id}`}
                className={`missai-button-secondary justify-center ${isUsingAsCharacterImage ? 'opacity-60' : ''}`}
                onClick={() => onUseAsCharacterImage(item)}
                disabled={isUsingAsCharacterImage}
                title={
                  isUsingAsCharacterImage
                    ? 'กำลังตรวจสิทธิ์ไฟล์ก่อนส่งเข้าสตูดิโอ'
                    : 'บันทึก draft นี้เข้าหน้าสร้างตัวละคร'
                }
                aria-disabled={isUsingAsCharacterImage}
              >
                <BookOpen size={14} />
                {isUsingAsCharacterImage ? 'กำลังส่ง' : 'เข้าสตูดิโอ'}
              </button>
              <button
                type="button"
                data-testid={`ai-creator-library-detail-use-cover-${item.id}`}
                className={`missai-button-secondary justify-center ${isUsingAsCover ? 'opacity-60' : ''}`}
                onClick={() => onUseAsCover(item)}
                disabled={isUsingAsCover}
                title={
                  isUsingAsCover
                    ? 'กำลังตรวจสิทธิ์ไฟล์ก่อนส่งเป็นภาพปก'
                    : 'บันทึกรูปนี้เป็นภาพปกในดราฟต์หน้าสร้างตัวละคร'
                }
                aria-disabled={isUsingAsCover}
              >
                <ImageIcon size={14} />
                {isUsingAsCover ? 'กำลังส่งปก' : 'ใช้เป็นภาพปก'}
              </button>
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-copy-${item.id}`}
                  className="missai-button-secondary justify-center"
                  onClick={() => onCopySystemPrompt(item)}
                  title="คัดลอก system prompt ของชิ้นงานนี้"
                >
                  <Copy size={14} />
                  คัดลอกคำสั่ง
                </button>
              )}
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-download-${item.id}`}
                  className={`missai-button-secondary justify-center ${
                    downloadState.canDownload && !isDownloading ? '' : 'opacity-60'
                  }`}
                  disabled={!downloadState.canDownload || isDownloading}
                  onClick={() => onDownload(item)}
                  title={isDownloading ? 'กำลังเตรียมไฟล์ดาวน์โหลด' : downloadState.title}
                  aria-disabled={!downloadState.canDownload || isDownloading}
                >
                  <Download size={14} />
                  {isDownloading ? 'กำลังเตรียมไฟล์' : downloadLabel}
                </button>
              )}
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-retry-${item.id}`}
                  className={`missai-button-secondary justify-center ${
                    retryState.canRetry && !isRetrying ? '' : 'opacity-60'
                  }`}
                  disabled={!retryState.canRetry || isRetrying}
                  onClick={() => onRetry(item)}
                  title={isRetrying ? 'กำลังสร้างงานซ้ำจากข้อมูลเดิม' : retryState.title}
                  aria-disabled={!retryState.canRetry || isRetrying}
                >
                  <RefreshCcw size={14} />
                  {isRetrying ? 'กำลังสร้างซ้ำ' : retryState.label}
                </button>
              )}
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-cancel-${item.id}`}
                  className={`missai-button-secondary justify-center ${
                    cancelState.canCancel && !isCancelling ? '' : 'opacity-60'
                  }`}
                  disabled={!cancelState.canCancel || isCancelling}
                  onClick={() => onCancel(item)}
                  title={isCancelling ? 'กำลังยกเลิกงานสร้างนี้' : cancelState.title}
                  aria-disabled={!cancelState.canCancel || isCancelling}
                >
                  <CircleX size={14} />
                  {isCancelling ? 'กำลังยกเลิก' : cancelState.label}
                </button>
              )}
              {onTogglePublish && item.librarySource === 'backend' && !isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-publish-${item.id}`}
                  className={`justify-center ${
                    isPublic ? 'missai-button-primary' : 'missai-button-secondary'
                  } ${isPublishing ? 'opacity-60' : ''}`}
                  disabled={isPublishing}
                  onClick={() => onTogglePublish(item)}
                  title={isPublic ? 'เลิกเผยแพร่ผลงานนี้' : 'เผยแพร่ผลงานนี้ลง Public Gallery'}
                  aria-pressed={isPublic}
                >
                  <Sparkles size={14} fill={isPublic ? 'currentColor' : 'none'} />
                  {isPublishing ? 'กำลังดำเนินการ' : (isPublic ? 'เผยแพร่แล้ว' : 'เผยแพร่สาธารณะ')}
                </button>
              )}
              {onReport && item.id.startsWith('public-') && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-report-${item.id}`}
                  className="missai-button-danger justify-center"
                  onClick={() => onReport(item)}
                  title="รายงานผลงานสร้างที่ไม่เหมาะสม"
                >
                  <Flag size={14} />
                  รายงาน
                </button>
              )}
              {!isPublicGalleryItem && (
                <button
                  type="button"
                  data-testid={`ai-creator-library-detail-delete-${item.id}`}
                  className="missai-button-danger justify-center"
                  onClick={() => onDelete(item.id)}
                  title={item.librarySource === 'backend' ? 'ลบชิ้นงานนี้จาก backend library ของฉัน' : 'ลบชิ้นงานนี้จากคลังของฉัน'}
                >
                  <Trash2 size={14} />
                  ลบ
                </button>
              )}
            </div>

            {isPublicGalleryItem && (
              <div
                data-testid={`ai-creator-library-detail-public-notice-${item.id}`}
                className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3 text-xs font-semibold leading-5 text-emerald-100"
              >
                รายละเอียดนี้มาจาก Public Gallery ที่ส่งเฉพาะข้อมูลที่ปลอดภัยต่อการแชร์ ไม่มี storage key หรือข้อมูลเจ้าของส่วนตัว
              </div>
            )}

            {!isPublicGalleryItem && downloadNotice && (
              <div
                data-testid={`ai-creator-library-detail-download-notice-${item.id}`}
                data-state={downloadNotice.state}
                className={`rounded-2xl border p-3 text-xs font-semibold leading-5 ${
                  downloadNotice.state === 'signed-expired'
                    ? 'border-amber-300/25 bg-amber-300/10 text-amber-100'
                    : 'border-white/10 bg-white/[0.03] text-white/60'
                }`}
                title={downloadNotice.title}
              >
                {downloadNotice.label}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">สถานะ</p>
                <p className="mt-1 text-sm font-black text-emerald-300">พร้อมใช้งาน</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">ประเภท</p>
                <p className="mt-1 text-sm font-black text-white">{isVideo ? 'พรีวิววิดีโอ' : 'ร่างรูปภาพ'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">ค่าใช้จ่าย</p>
                <p className="mt-1 text-sm font-black text-amber-200">ปลอดภัยในเครื่อง</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">พรอมป์</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/78">{item.prompt || 'ไม่มี prompt ที่บันทึกไว้'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">บรีฟ</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/65">{item.brief || 'ไม่มี brief เพิ่มเติม'}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">ร่างตัวละคร</p>
              <dl className="mt-3 grid gap-3 text-xs font-semibold text-white/65">
                <div>
                  <dt className="text-white/35">คำโปรย</dt>
                  <dd className="mt-1 leading-5">{item.response.draft.tagline}</dd>
                </div>
                <div>
                  <dt className="text-white/35">คำทักทาย</dt>
                  <dd className="mt-1 leading-5">{item.response.draft.greeting}</dd>
                </div>
                <div>
                  <dt className="text-white/35">แท็ก</dt>
                  <dd className="mt-1 leading-5">{item.response.draft.tags}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#080a1a] p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-white/35">พรอมป์ระบบ</p>
              <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap text-[11px] font-semibold leading-5 text-white/55">
                {item.response.draft.systemPrompt}
              </pre>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
