import type { CreatorAiDraftResponse } from './api'
import {
  buildCharacterDraftFromImage,
  mergeDraftTags,
  readStoredCreatorDraft,
  writeStoredCreatorDraft,
  type CharacterDraftAvatarSource,
  type CharacterDraftFormFields,
  type CreatorStoredDraft,
} from './characterDraft'
import { safeGetStorageItem, safeSetStorageItem, type SafeStorageLike } from './safeStorage'

export type AiCreatorGeneratedItem = {
  id: string
  backendJobId?: string
  backendJobStatus?: string
  backendOutputId?: string
  librarySource?: 'local' | 'backend'
  type: 'image' | 'video'
  url: string
  videoUrl?: string
  prompt: string
  brief: string
  style: string
  duration?: number
  motionTemplate?: string
  timestamp: number
  isFavorite?: boolean
  response: CreatorAiDraftResponse
}

export type AiCreatorGalleryFilter = 'all' | 'favorite' | 'image' | 'video'
export type AiCreatorMode = 'image' | 'video' | 'template'
export type AiCreatorUploadKind = 'image' | 'video'
export type AiCreatorProviderStatus = 'ready' | 'missing' | 'unavailable' | 'rate_limited'
export type AiCreatorGenerateBlockCode =
  | 'running_job'
  | 'content_gate'
  | 'provider_missing'
  | 'provider_unavailable'
  | 'provider_rate_limited'
  | 'level_too_low'
  | 'insufficient_credit'
  | 'invalid_input'
  | 'missing_upload'
  | 'missing_video_prompt'
  | 'missing_image_prompt'
export type AiCreatorGenerateBlockState = {
  code: AiCreatorGenerateBlockCode
  title: string
  cause: string
  nextAction: string
  debitAllowed: false
}
export type AiCreatorUploadPreview = {
  name: string
  sizeLabel: string
  typeLabel: string
}
export type AiCreatorUploadSlotRule = {
  id: string
  label: string
  kind: AiCreatorUploadKind
  required: boolean
  acceptedTypes: readonly string[]
  maxBytes: number
  maxDurationSeconds?: number
}
export type AiCreatorUploadSlotInput = {
  file?: Pick<File, 'name' | 'size' | 'type'> | null
  durationSeconds?: number | null
}
export type AiCreatorUploadSlotValidationResult =
  | { ok: true }
  | { ok: false; slotId: string; reason: string }
export type AiCreatorDownloadActionState = {
  canDownload: boolean
  mode: 'backend' | 'local' | 'unavailable'
  label: string
  title: string
}
export type AiCreatorDownloadLinkSnapshot = {
  access: 'direct' | 'public' | 'signed'
  generatedAt: number
  expiresIn: number | null
  expiresAt: number | null
}
export type AiCreatorDownloadLinkNotice = {
  state: 'direct' | 'public' | 'signed-active' | 'signed-expired'
  label: string
  title: string
  remainingSeconds?: number
}
export type AiCreatorRetryActionState = {
  canRetry: boolean
  mode: 'backend' | 'unavailable'
  label: string
  title: string
}
export type AiCreatorGenerationJobSnapshot = {
  id: string
  templateId: string
  status: string
  message?: string
  input?: {
    prompt?: string
  }
  createdAt?: string
  outputs?: Array<{
    id: string
    kind: 'image' | 'video'
    url: string | null
    isFavorite?: boolean
    createdAt?: string
  }>
}

export const AI_CREATOR_HISTORY_KEY = 'maprang:creator-image-history'
export const AI_CREATOR_HISTORY_PAGE_SIZE = 12
export const AI_CREATOR_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const AI_CREATOR_VIDEO_MAX_BYTES = 50 * 1024 * 1024
export const AI_CREATOR_IMAGE_ACCEPT_LABEL = 'JPG / PNG / WebP / GIF'
export const AI_CREATOR_TEMPLATE_IMAGE_ACCEPT_LABEL = 'JPG / PNG / WebP'
export const AI_CREATOR_VIDEO_ACCEPT_LABEL = 'MP4 / WebM / MOV'
export const AI_CREATOR_TEMPLATE_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const
export const AI_CREATOR_TEMPLATE_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'] as const
export const AI_CREATOR_VIDEO_MIN_SECONDS = 3
export const AI_CREATOR_VIDEO_MAX_SECONDS = 10
export const AI_CREATOR_VIDEO_DEFAULT_TEMPLATE = 'gentle-breeze'
export const AI_CREATOR_UPLOAD_SLOT_RULES = {
  textToImage: [] as AiCreatorUploadSlotRule[],
  imageToImage: [
    {
      id: 'reference-image',
      label: 'รูปอ้างอิง',
      kind: 'image',
      required: true,
      acceptedTypes: AI_CREATOR_TEMPLATE_IMAGE_TYPES,
      maxBytes: AI_CREATOR_IMAGE_MAX_BYTES,
    },
  ],
  imageToVideo: [
    {
      id: 'source-image',
      label: 'รูปตั้งต้นสำหรับวิดีโอ',
      kind: 'image',
      required: true,
      acceptedTypes: AI_CREATOR_TEMPLATE_IMAGE_TYPES,
      maxBytes: AI_CREATOR_IMAGE_MAX_BYTES,
      maxDurationSeconds: 30,
    },
  ],
  advancedVideo: [
    {
      id: 'reference-video',
      label: 'วิดีโออ้างอิง',
      kind: 'video',
      required: true,
      acceptedTypes: AI_CREATOR_TEMPLATE_VIDEO_TYPES,
      maxBytes: AI_CREATOR_VIDEO_MAX_BYTES,
      maxDurationSeconds: 30,
    },
  ],
} as const

export const AI_CREATOR_STYLE_PRESETS = [
  { value: 'realistic', label: 'ภาพบุคคลสมจริง (Realistic Portrait)' },
  { value: 'anime', label: 'การ์ตูนญี่ปุ่น (Japanese Anime)' },
  { value: '3d_render', label: 'สามมิติระดับพรีเมียม (3D Render)' },
  { value: 'cyberpunk', label: 'ไซเบอร์พังก์เรืองแสง (Cyberpunk Concept)' },
  { value: 'oil_painting', label: 'จิตรกรรมสีน้ำมัน (Oil Painting Style)' },
]

export const AI_CREATOR_IMAGE_TEMPLATES = [
  {
    id: 'neon-tokyo',
    title: 'นีออนโตเกียว (Neon Tokyo Cyberpunk)',
    prompt:
      'close up portrait of an elegant character glowing under neon lights in rain-slicked Tokyo streets, cyberpunk aesthetic, highly detailed',
    style: 'cyberpunk',
    bgClass: 'from-[#2e1065] via-[#090514] to-[#1e1b4b]',
    tag: 'Cyberpunk',
  },
  {
    id: 'cozy-anime',
    title: 'อนิเมะคาเฟ่ (Cozy Anime Cafe)',
    prompt:
      'soft portrait of a beautiful character sitting in a cozy sunlit cafe drinking tea, highly detailed anime illustration style, warm lighting',
    style: 'anime',
    bgClass: 'from-[#451a03] via-[#0f0502] to-[#1e1b4b]',
    tag: 'Anime',
  },
  {
    id: 'fantasy-forest',
    title: 'ป่าเวทมนตร์ (Fantasy Magic Forest)',
    prompt:
      'full body portrait of an adventurer character in a magical glowing forest, golden particles, floating magical dust, high fantasy digital art',
    style: '3d_render',
    bgClass: 'from-[#064e3b] via-[#02120b] to-[#1e1b4b]',
    tag: 'Fantasy',
  },
  {
    id: 'classical-oil',
    title: 'สีน้ำมันคลาสสิก (Classical Oil Portrait)',
    prompt:
      'fine art oil painting portrait of a noble character, renaissance style, dramatic chiaroscuro lighting, deep classical tones, textured brush strokes',
    style: 'oil_painting',
    bgClass: 'from-[#7f1d1d] via-[#1c0205] to-[#1e1b4b]',
    tag: 'Classical',
  },
]

export type AiCreatorImageTemplate = (typeof AI_CREATOR_IMAGE_TEMPLATES)[number]

export const AI_CREATOR_MOTION_TEMPLATES = [
  { val: 'gentle-breeze', label: 'ลมพัดเบาๆ (Breeze)' },
  { val: 'snow', label: 'ละอองหิมะโปรย (Snowfall)' },
  { val: 'zoom-in', label: 'ซูมดึงเข้า (Zoom In)' },
  { val: 'zoom-out', label: 'ซูมออกขยาย (Zoom Out)' },
]

export type AiCreatorMotionTemplateValue = (typeof AI_CREATOR_MOTION_TEMPLATES)[number]['val']

export const AI_CREATOR_GALLERY_FILTERS: ReadonlyArray<{ val: AiCreatorGalleryFilter; label: string }> = [
  { val: 'all', label: 'ทั้งหมด' },
  { val: 'favorite', label: 'รายการโปรด' },
  { val: 'image', label: 'ภาพร่าง' },
  { val: 'video', label: 'วิดีโอ' },
]

export function getAiCreatorTimestamp(): number {
  return Date.now()
}

export function readAiCreatorHistory(storage: SafeStorageLike): AiCreatorGeneratedItem[] {
  try {
    const stored = safeGetStorageItem(storage, AI_CREATOR_HISTORY_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeAiCreatorHistory(storage: SafeStorageLike, history: AiCreatorGeneratedItem[]) {
  safeSetStorageItem(storage, AI_CREATOR_HISTORY_KEY, JSON.stringify(history))
}

export function filterAiCreatorHistory(
  history: AiCreatorGeneratedItem[],
  filter: AiCreatorGalleryFilter,
): AiCreatorGeneratedItem[] {
  if (filter === 'favorite') return history.filter((item) => item.isFavorite === true)
  if (filter === 'image') return history.filter((item) => item.type === 'image')
  if (filter === 'video') return history.filter((item) => item.type === 'video')
  return history
}

export function paginateAiCreatorHistory(
  history: AiCreatorGeneratedItem[],
  page: number,
  pageSize = AI_CREATOR_HISTORY_PAGE_SIZE,
): AiCreatorGeneratedItem[] {
  const safePage = Math.max(1, page)
  return history.slice((safePage - 1) * pageSize, safePage * pageSize)
}

export function prependAiCreatorHistory(
  history: AiCreatorGeneratedItem[],
  item: AiCreatorGeneratedItem,
): AiCreatorGeneratedItem[] {
  return [item, ...history]
}

export function removeAiCreatorHistoryItem(
  history: AiCreatorGeneratedItem[],
  itemId: string,
): AiCreatorGeneratedItem[] {
  return history.filter((item) => item.id !== itemId)
}

export function toggleAiCreatorHistoryFavorite(
  history: AiCreatorGeneratedItem[],
  itemId: string,
): AiCreatorGeneratedItem[] {
  return history.map((item) => (item.id === itemId ? { ...item, isFavorite: !item.isFavorite } : item))
}

function isSafeAiCreatorDownloadUrl(url: string) {
  return (
    url.startsWith('data:image/') ||
    url.startsWith('blob:') ||
    url.startsWith('/') ||
    url.startsWith('http://') ||
    url.startsWith('https://')
  )
}

export function getAiCreatorDownloadActionState(item: AiCreatorGeneratedItem): AiCreatorDownloadActionState {
  if (item.backendOutputId) {
    return {
      canDownload: true,
      mode: 'backend',
      label: 'ดาวน์โหลดไฟล์',
      title: 'สร้างลิงก์ดาวน์โหลดที่ปลอดภัยจาก backend ก่อนเปิดไฟล์',
    }
  }

  if (isSafeAiCreatorDownloadUrl(item.url)) {
    return {
      canDownload: true,
      mode: 'local',
      label: 'ดาวน์โหลดไฟล์',
      title: 'ดาวน์โหลดจากไฟล์ที่แสดงอยู่ในคลังเครื่องนี้',
    }
  }

  return {
    canDownload: false,
    mode: 'unavailable',
    label: 'ยังไม่มีไฟล์',
    title: 'ยังไม่มีไฟล์ผลลัพธ์ที่ดาวน์โหลดได้',
  }
}

export function getAiCreatorRetryActionState(item: AiCreatorGeneratedItem): AiCreatorRetryActionState {
  if (!item.backendJobId) {
    return {
      canRetry: false,
      mode: 'unavailable',
      label: 'รอ job API',
      title: 'Retry ใช้ได้กับงานที่บันทึกใน backend เท่านั้น',
    }
  }

  if (item.backendJobStatus === 'queued' || item.backendJobStatus === 'running') {
    return {
      canRetry: false,
      mode: 'backend',
      label: 'กำลังรัน',
      title: 'งานนี้กำลังอยู่ในคิวหรือกำลังประมวลผล จึงยัง retry ซ้ำไม่ได้',
    }
  }

  return {
    canRetry: true,
    mode: 'backend',
    label: 'ลองสร้างซ้ำ',
    title: 'สร้างงานใหม่จาก prompt และ template เดิมโดยไม่หัก token ซ้ำก่อน backend รับงานจริง',
  }
}

export function getAiCreatorDownloadLinkNotice(
  snapshot: AiCreatorDownloadLinkSnapshot | null | undefined,
  now = getAiCreatorTimestamp(),
): AiCreatorDownloadLinkNotice | null {
  if (!snapshot) return null

  if (snapshot.access === 'direct') {
    return {
      state: 'direct',
      label: 'ลิงก์ไฟล์ตรงพร้อมใช้',
      title: 'ไฟล์นี้เป็น URL ตรง ไม่ต้องรีเฟรช signed URL',
    }
  }

  if (snapshot.access === 'public') {
    return {
      state: 'public',
      label: 'ลิงก์ public พร้อมใช้',
      title: 'ไฟล์นี้เปิดอ่านแบบ public จาก storage',
    }
  }

  if (!snapshot.expiresAt) {
    return {
      state: 'signed-active',
      label: 'ลิงก์ signed พร้อมใช้',
      title: 'backend ออก signed URL แล้ว แต่ไม่ได้ส่งเวลาหมดอายุกลับมา',
    }
  }

  const remainingSeconds = Math.max(0, Math.ceil((snapshot.expiresAt - now) / 1000))
  if (remainingSeconds === 0) {
    return {
      state: 'signed-expired',
      label: 'ลิงก์ signed หมดอายุแล้ว',
      title: 'กดดาวน์โหลดอีกครั้งเพื่อออก signed URL ใหม่',
      remainingSeconds,
    }
  }

  return {
    state: 'signed-active',
    label: `ลิงก์ signed พร้อมใช้ เหลือ ${remainingSeconds} วินาที`,
    title: 'ลิงก์นี้มีอายุจำกัดเพื่อป้องกันการเปิดไฟล์ส่วนตัวถาวร',
    remainingSeconds,
  }
}

export function buildAiCreatorDownloadFilename(item: AiCreatorGeneratedItem) {
  const safeName = (item.response.draft.name || 'maprang-ai-creator')
    .toLowerCase()
    .replace(/[^a-z0-9ก-๙]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const extension = item.type === 'video' ? 'mp4' : 'png'
  return `${safeName || 'maprang-ai-creator'}.${extension}`
}

function buildGenerationJobDraftResponse(
  job: AiCreatorGenerationJobSnapshot,
  output: NonNullable<AiCreatorGenerationJobSnapshot['outputs']>[number],
): CreatorAiDraftResponse {
  const prompt = job.input?.prompt?.trim() || job.message || job.templateId
  return {
    draft: {
      name: `งานสร้างภาพ ${job.templateId}`,
      tagline: job.status === 'succeeded' ? 'ผลลัพธ์จากงานที่บันทึกในระบบ' : 'งานที่บันทึกจากระบบสร้างภาพ',
      description: prompt,
      biography: prompt,
      scenario: 'ผลลัพธ์นี้มาจากคลังงานส่วนตัวของผู้ใช้และยังไม่ถูกเผยแพร่สาธารณะ',
      systemPrompt: `ใช้ผลลัพธ์จากงาน ${job.id} เป็น reference ส่วนตัวของผู้ใช้ ห้ามเปิดเผย storage key หรือข้อมูลภายใน`,
      compactPrompt: prompt,
      characterAnchor: 'ผลลัพธ์ส่วนตัวจากระบบสร้างภาพ',
      constraints: 'เป็นงานส่วนตัวของเจ้าของเท่านั้น',
      greeting: 'พร้อมนำภาพนี้ไปต่อยอดในหน้าสร้างตัวละคร',
      tags: output.kind === 'video' ? 'ระบบสร้างภาพ, วิดีโอ, ส่วนตัว' : 'ระบบสร้างภาพ, ภาพ, ส่วนตัว',
    },
    image: {
      url: output.url ?? '',
      provider: 'configured',
      prompt,
      note: 'ผลลัพธ์ที่โหลดจากงานสร้างภาพที่บันทึกในระบบ',
    },
    source: 'ai',
    modelName: 'generation/job',
    warnings: [],
  }
}

export function createAiCreatorItemsFromGenerationJobs(
  jobs: AiCreatorGenerationJobSnapshot[],
): AiCreatorGeneratedItem[] {
  return jobs.flatMap((job) =>
    (job.outputs ?? [])
      .filter((output) => typeof output.url === 'string' && output.url.length > 0)
      .map((output) => {
        const timestamp = Date.parse(output.createdAt ?? job.createdAt ?? '')
        return {
          id: `backend-${output.id}`,
          backendJobId: job.id,
          backendJobStatus: job.status,
          backendOutputId: output.id,
          librarySource: 'backend' as const,
          type: output.kind,
          url: output.url ?? '',
          prompt: job.input?.prompt ?? '',
          brief: job.message ?? '',
          style: job.templateId,
          timestamp: Number.isFinite(timestamp) ? timestamp : getAiCreatorTimestamp(),
          isFavorite: output.isFavorite,
          response: buildGenerationJobDraftResponse(job, output),
        }
      }),
  )
}

function fillCreatorDraftField<K extends keyof CharacterDraftFormFields>(
  currentForm: Partial<CharacterDraftFormFields>,
  draft: CharacterDraftFormFields,
  field: K,
) {
  const currentValue = currentForm[field]
  return typeof currentValue === 'string' && currentValue.trim() ? currentValue : draft[field]
}

function getAiCreatorItemAvatarSource(item: AiCreatorGeneratedItem): CharacterDraftAvatarSource {
  if (item.response.image.provider === 'configured') return 'provider'
  if (item.url.startsWith('data:image/svg+xml')) return 'placeholder'
  return 'manual'
}

function prependGeneratedImageOnce(
  stored: CreatorStoredDraft | null,
  url: string,
  source: CharacterDraftAvatarSource,
) {
  return stored?.generatedImages?.some((image) => image.url === url)
    ? (stored.generatedImages ?? [])
    : [{ url, source }, ...(stored?.generatedImages ?? [])]
}

export function saveAiCreatorItemToCreatorDraft(
  storage: SafeStorageLike,
  item: AiCreatorGeneratedItem,
): CreatorStoredDraft {
  const stored = readStoredCreatorDraft(storage)
  const currentForm = stored?.form ?? {}
  const draftFromImage = buildCharacterDraftFromImage({
    imagePrompt: item.prompt || item.brief,
    imageUrl: item.url,
  })
  const draftForm: CharacterDraftFormFields = {
    avatarUrl: item.url,
    ...draftFromImage,
  }
  const avatarSource = getAiCreatorItemAvatarSource(item)
  const generatedImages = prependGeneratedImageOnce(stored, item.url, avatarSource)
  const nextDraft: CreatorStoredDraft = {
    ...stored,
    form: {
      ...currentForm,
      avatarUrl: item.url,
      name: fillCreatorDraftField(currentForm, draftForm, 'name'),
      tagline: fillCreatorDraftField(currentForm, draftForm, 'tagline'),
      description: fillCreatorDraftField(currentForm, draftForm, 'description'),
      biography: fillCreatorDraftField(currentForm, draftForm, 'biography'),
      scenario: fillCreatorDraftField(currentForm, draftForm, 'scenario'),
      systemPrompt: fillCreatorDraftField(currentForm, draftForm, 'systemPrompt'),
      compactPrompt: fillCreatorDraftField(currentForm, draftForm, 'compactPrompt'),
      characterAnchor: fillCreatorDraftField(currentForm, draftForm, 'characterAnchor'),
      constraints: fillCreatorDraftField(currentForm, draftForm, 'constraints'),
      greeting: fillCreatorDraftField(currentForm, draftForm, 'greeting'),
      tags: mergeDraftTags(currentForm.tags ?? '', draftForm.tags),
    },
    creatorBrief: stored?.creatorBrief || item.brief,
    avatarSource,
    hasImageDraft: true,
    hasPreviewRun: stored?.hasPreviewRun ?? false,
    lastImageSignal: item.prompt || item.brief || item.response.image.prompt,
    generatedImages,
    imageStyle: item.style,
    updatedAt: getAiCreatorTimestamp(),
  }
  writeStoredCreatorDraft(storage, nextDraft)
  return nextDraft
}

export function saveAiCreatorItemToCreatorCoverDraft(
  storage: SafeStorageLike,
  item: AiCreatorGeneratedItem,
): CreatorStoredDraft {
  const stored = readStoredCreatorDraft(storage)
  const coverImageSource = getAiCreatorItemAvatarSource(item)
  const nextDraft: CreatorStoredDraft = {
    ...stored,
    coverImageUrl: item.url,
    coverImageSource,
    hasCoverDraft: true,
    generatedImages: prependGeneratedImageOnce(stored, item.url, coverImageSource),
    creatorBrief: stored?.creatorBrief || item.brief,
    lastImageSignal: stored?.lastImageSignal || item.prompt || item.brief || item.response.image.prompt,
    imageStyle: stored?.imageStyle || item.style,
    updatedAt: getAiCreatorTimestamp(),
  }
  writeStoredCreatorDraft(storage, nextDraft)
  return nextDraft
}

export function createAiCreatorImageItem({
  id,
  response,
  prompt,
  brief,
  style,
  timestamp = getAiCreatorTimestamp(),
}: {
  id: string
  response: CreatorAiDraftResponse
  prompt: string
  brief: string
  style: string
  timestamp?: number
}): AiCreatorGeneratedItem {
  return {
    id,
    type: 'image',
    url: response.image.url,
    prompt,
    brief,
    style,
    timestamp,
    response,
  }
}

export function createAiCreatorVideoItem({
  id,
  response,
  prompt,
  brief,
  duration,
  motionTemplate,
  timestamp = getAiCreatorTimestamp(),
}: {
  id: string
  response: CreatorAiDraftResponse
  prompt: string
  brief: string
  duration: number
  motionTemplate: string
  timestamp?: number
}): AiCreatorGeneratedItem {
  return {
    id,
    type: 'video',
    url: response.image.url,
    videoUrl: 'local-video-preview',
    prompt,
    brief,
    style: 'video_render',
    duration,
    motionTemplate,
    timestamp,
    response,
  }
}

export function getAiCreatorVideoDurationFillPercent(durationSeconds: number): number {
  const clamped = Math.min(AI_CREATOR_VIDEO_MAX_SECONDS, Math.max(AI_CREATOR_VIDEO_MIN_SECONDS, durationSeconds))
  return ((clamped - AI_CREATOR_VIDEO_MIN_SECONDS) / (AI_CREATOR_VIDEO_MAX_SECONDS - AI_CREATOR_VIDEO_MIN_SECONDS)) * 100
}

export function formatAiCreatorFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }
  const fractionDigits = value >= 10 || unitIndex === 0 ? 0 : 1
  return `${value.toFixed(fractionDigits)} ${units[unitIndex]}`
}

export function createAiCreatorUploadPreview(file: Pick<File, 'name' | 'size' | 'type'>): AiCreatorUploadPreview {
  return {
    name: file.name || 'ไฟล์ที่เลือก',
    sizeLabel: formatAiCreatorFileSize(file.size),
    typeLabel: file.type || 'ไม่ทราบชนิดไฟล์',
  }
}

function formatAiCreatorAcceptedTypes(types: readonly string[]) {
  const labels = types.map((type) => {
    if (type === 'image/jpeg') return 'JPG'
    if (type === 'image/png') return 'PNG'
    if (type === 'image/webp') return 'WebP'
    if (type === 'image/gif') return 'GIF'
    if (type === 'video/mp4') return 'MP4'
    if (type === 'video/webm') return 'WebM'
    if (type === 'video/quicktime') return 'MOV'
    return type
  })
  return labels.join(' / ')
}

export function validateAiCreatorUploadSlot(
  rule: AiCreatorUploadSlotRule,
  input: AiCreatorUploadSlotInput | null | undefined,
): AiCreatorUploadSlotValidationResult {
  const file = input?.file ?? null
  if (!file) {
    if (!rule.required) return { ok: true }
    return {
      ok: false,
      slotId: rule.id,
      reason: `ต้องอัปโหลด${rule.label}ก่อนสร้าง`,
    }
  }

  if (!rule.acceptedTypes.includes(file.type)) {
    return {
      ok: false,
      slotId: rule.id,
      reason: `${rule.label}รองรับเฉพาะไฟล์ ${formatAiCreatorAcceptedTypes(rule.acceptedTypes)}`,
    }
  }

  if (file.size > rule.maxBytes) {
    return {
      ok: false,
      slotId: rule.id,
      reason: `${rule.label}ต้องมีขนาดไม่เกิน ${formatAiCreatorFileSize(rule.maxBytes)}`,
    }
  }

  if (
    typeof rule.maxDurationSeconds === 'number' &&
    typeof input?.durationSeconds === 'number' &&
    input.durationSeconds > rule.maxDurationSeconds
  ) {
    return {
      ok: false,
      slotId: rule.id,
      reason: `${rule.label}ต้องยาวไม่เกิน ${rule.maxDurationSeconds} วินาที`,
    }
  }

  return { ok: true }
}

export function validateAiCreatorUploadSlots(
  rules: readonly AiCreatorUploadSlotRule[],
  inputs: Record<string, AiCreatorUploadSlotInput | null | undefined>,
): AiCreatorUploadSlotValidationResult {
  for (const rule of rules) {
    const result = validateAiCreatorUploadSlot(rule, inputs[rule.id])
    if (!result.ok) return result
  }
  return { ok: true }
}

export function validateAiCreatorUpload(
  file: Pick<File, 'name' | 'size' | 'type'>,
  kind: AiCreatorUploadKind,
): { ok: true } | { ok: false; reason: string } {
  if (kind === 'image') {
    if (!file.type.startsWith('image/')) {
      return { ok: false, reason: `รองรับเฉพาะไฟล์รูปภาพ ${AI_CREATOR_IMAGE_ACCEPT_LABEL}` }
    }
    if (file.size > AI_CREATOR_IMAGE_MAX_BYTES) {
      return { ok: false, reason: 'รูปภาพต้องมีขนาดไม่เกิน 10MB' }
    }
    return { ok: true }
  }

  const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime'])
  if (!allowedVideoTypes.has(file.type)) {
    return { ok: false, reason: `รองรับเฉพาะไฟล์วิดีโอ ${AI_CREATOR_VIDEO_ACCEPT_LABEL}` }
  }
  if (file.size > AI_CREATOR_VIDEO_MAX_BYTES) {
    return { ok: false, reason: 'วิดีโอต้องมีขนาดไม่เกิน 50MB' }
  }
  return { ok: true }
}

export function getAiCreatorGenerateBlockReason({
  mode,
  brief,
  prompt,
  isGenerating,
  requiredUploadCount = 0,
  uploadedCount = 0,
  tokenBalance,
  creditCost,
  providerReady = true,
  providerStatus,
  userLevel,
  minLevel,
  contentAllowed = true,
  inputError,
}: {
  mode: AiCreatorMode
  brief: string
  prompt: string
  isGenerating: boolean
  requiredUploadCount?: number
  uploadedCount?: number
  tokenBalance?: number
  creditCost?: number
  providerReady?: boolean
  providerStatus?: AiCreatorProviderStatus
  userLevel?: number
  minLevel?: number
  contentAllowed?: boolean
  inputError?: string | null
}): string | null {
  return getAiCreatorGenerateBlockState({
    mode,
    brief,
    prompt,
    isGenerating,
    requiredUploadCount,
    uploadedCount,
    tokenBalance,
    creditCost,
    providerReady,
    providerStatus,
    userLevel,
    minLevel,
    contentAllowed,
    inputError,
  })?.title ?? null
}

export function getAiCreatorGenerateBlockState({
  mode,
  brief,
  prompt,
  isGenerating,
  requiredUploadCount = 0,
  uploadedCount = 0,
  tokenBalance,
  creditCost,
  providerReady = true,
  providerStatus,
  userLevel,
  minLevel,
  contentAllowed = true,
  inputError,
}: {
  mode: AiCreatorMode
  brief: string
  prompt: string
  isGenerating: boolean
  requiredUploadCount?: number
  uploadedCount?: number
  tokenBalance?: number
  creditCost?: number
  providerReady?: boolean
  providerStatus?: AiCreatorProviderStatus
  userLevel?: number
  minLevel?: number
  contentAllowed?: boolean
  inputError?: string | null
}): AiCreatorGenerateBlockState | null {
  if (isGenerating) {
    return {
      code: 'running_job',
      title: 'ระบบกำลังประมวลผลอยู่',
      cause: 'มีงาน Generate ที่ยังไม่จบ ระบบจึงกันการยิงซ้ำเพื่อไม่ให้เสียโทเคนซ้อน',
      nextAction: 'รอให้งานปัจจุบันจบ หรือยกเลิกงานเมื่อมี cancel route พร้อม',
      debitAllowed: false,
    }
  }
  if (!contentAllowed) {
    return {
      code: 'content_gate',
      title: 'โหมดเนื้อหาปัจจุบันไม่รองรับแม่แบบนี้',
      cause: 'แม่แบบที่เลือกต้องใช้โหมดเนื้อหาหรือการยืนยันอายุที่ session นี้ยังไม่ผ่าน',
      nextAction: 'เปลี่ยนแม่แบบ หรือเปิดโหมดเนื้อหาที่ตรงเงื่อนไขก่อนสร้าง',
      debitAllowed: false,
    }
  }
  const normalizedProviderStatus: AiCreatorProviderStatus = providerStatus ?? (providerReady ? 'ready' : 'missing')
  if (normalizedProviderStatus === 'missing') {
    return {
      code: 'provider_missing',
      title: 'ยังไม่ได้ตั้งค่าผู้ให้บริการสร้างรูปจริง',
      cause: 'ระบบยังไม่มีคีย์หรือการตั้งค่าผู้ให้บริการสร้างรูปสำหรับงานสร้างภาพจริง',
      nextAction: 'ตั้งค่าผู้ให้บริการ หรือใช้ภาพร่างสำรองที่มีป้ายบอกสถานะชัดเจน',
      debitAllowed: false,
    }
  }
  if (normalizedProviderStatus === 'unavailable') {
    return {
      code: 'provider_unavailable',
      title: 'ผู้ให้บริการสร้างรูปยังไม่พร้อมใช้งาน ลองใหม่อีกครั้ง',
      cause: 'ผลตรวจสุขภาพผู้ให้บริการหรือการตรวจเบื้องต้นของ backend ระบุว่ายังรับงานไม่ได้',
      nextAction: 'ลองใหม่ภายหลัง หรือเปลี่ยนผู้ให้บริการเมื่อระบบเลือกโมเดลพร้อม',
      debitAllowed: false,
    }
  }
  if (normalizedProviderStatus === 'rate_limited') {
    return {
      code: 'provider_rate_limited',
      title: 'ผู้ให้บริการสร้างรูปติดข้อจำกัดชั่วคราว ลองใหม่ภายหลัง',
      cause: 'ผู้ให้บริการตอบกลับว่าเกินขีดจำกัดการเรียกใช้งานหรือโควตาชั่วคราว',
      nextAction: 'รอสักครู่แล้วลองใหม่ ระบบต้องไม่หักโทเคนถ้างานยังไม่ถูก accepted',
      debitAllowed: false,
    }
  }
  if (typeof minLevel === 'number' && typeof userLevel === 'number' && userLevel < minLevel) {
    return {
      code: 'level_too_low',
      title: `ต้องใช้บัญชีเลเวล ${minLevel} ขึ้นไป`,
      cause: `บัญชีเลเวล ${userLevel} ต่ำกว่าเงื่อนไขเลเวล ${minLevel} ของแม่แบบนี้`,
      nextAction: 'ใช้แม่แบบระดับเริ่มต้น หรือเพิ่มเลเวลบัญชีก่อน',
      debitAllowed: false,
    }
  }
  if (typeof tokenBalance === 'number' && typeof creditCost === 'number' && tokenBalance < creditCost) {
    return {
      code: 'insufficient_credit',
      title: `โทเคนไม่พอ ต้องใช้ ${creditCost} โทเคน`,
      cause: `ยอดคงเหลือ ${tokenBalance} ต่ำกว่าค่าใช้จ่าย ${creditCost}`,
      nextAction: 'ลดแม่แบบที่แพงกว่า หรือไปหน้ากระเป๋าโทเคนเมื่อ top-up flow พร้อม',
      debitAllowed: false,
    }
  }
  if (inputError?.trim()) {
    return {
      code: 'invalid_input',
      title: inputError.trim(),
      cause: 'ไฟล์หรือข้อมูลที่เลือกไม่ผ่าน schema ของแม่แบบ',
      nextAction: 'เปลี่ยนไฟล์หรือแก้ข้อมูลให้ตรงชนิด ขนาด จำนวน และความยาวที่ระบบกำหนด',
      debitAllowed: false,
    }
  }
  if (requiredUploadCount > uploadedCount) {
    return {
      code: 'missing_upload',
      title: `อัปโหลดไฟล์อ้างอิงให้ครบ ${requiredUploadCount} ไฟล์ก่อนสร้าง`,
      cause: `มีไฟล์อ้างอิง ${uploadedCount} จาก ${requiredUploadCount} ไฟล์ที่แม่แบบต้องใช้`,
      nextAction: 'อัปโหลดไฟล์อ้างอิงให้ครบทุก slot ก่อนกด Generate',
      debitAllowed: false,
    }
  }
  if (mode === 'template') return null
  if (brief.trim() || prompt.trim()) return null
  if (mode === 'video') {
    return {
      code: 'missing_video_prompt',
      title: 'กรอกบริบทตัวละครหรือคำสั่งวิดีโอก่อนสร้าง',
      cause: 'แม่แบบวิดีโอต้องมีบริบทหรือคำสั่งวิดีโอเพื่อประกอบคำสั่งส่ง backend',
      nextAction: 'กรอก brief หรือคำสั่งวิดีโออย่างน้อยหนึ่งช่อง',
      debitAllowed: false,
    }
  }
  return {
    code: 'missing_image_prompt',
    title: 'กรอกบริบทตัวละครหรือคำสั่งภาพก่อนสร้าง',
    cause: 'แม่แบบภาพต้องมีบริบทหรือคำสั่งภาพเพื่อประกอบคำสั่งส่ง backend',
    nextAction: 'กรอก brief หรือคำสั่งภาพอย่างน้อยหนึ่งช่อง',
    debitAllowed: false,
  }
}

export function buildAiCreatorBlockedStateMatrix(): AiCreatorGenerateBlockState[] {
  const scenarios = [
    getAiCreatorGenerateBlockState({ mode: 'image', brief: '', prompt: '', isGenerating: false }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      requiredUploadCount: 2,
      uploadedCount: 1,
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      inputError: 'รองรับเฉพาะไฟล์รูปภาพ JPG / PNG / WebP / GIF',
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      tokenBalance: 100,
      creditCost: 600,
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      userLevel: 1,
      minLevel: 2,
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      providerStatus: 'missing',
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      providerStatus: 'unavailable',
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      providerStatus: 'rate_limited',
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: false,
      contentAllowed: false,
    }),
    getAiCreatorGenerateBlockState({
      mode: 'image',
      brief: 'มีบริบท',
      prompt: '',
      isGenerating: true,
    }),
  ]
  return scenarios.filter((scenario): scenario is AiCreatorGenerateBlockState => scenario !== null)
}
