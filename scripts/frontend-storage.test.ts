import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem, type SafeStorageLike } from '../apps/frontend/src/lib/safeStorage'
import { loadPinnedChatIdsFromRaw, serializePinnedChatIds, togglePinnedChatId } from '../apps/frontend/src/lib/pinnedChats'
import { filterAndSortChats, getPendingChatEventCount, toggleSelectedChatId } from '../apps/frontend/src/lib/chatList'
import {
  AI_CREATOR_UPLOAD_SLOT_RULES,
  buildAiCreatorBlockedStateMatrix,
  buildAiCreatorDownloadFilename,
  createAiCreatorItemsFromGenerationJobs,
  createAiCreatorItemsFromPublicGalleryOutputs,
  createAiCreatorImageItem,
  createAiCreatorUploadPreview,
  createAiCreatorVideoItem,
  filterAiCreatorHistory,
  formatAiCreatorFileSize,
  getAiCreatorDownloadActionState,
  getAiCreatorDownloadLinkNotice,
  getAiCreatorGenerateBlockReason,
  getAiCreatorGenerateBlockState,
  getAiCreatorRetryActionState,
  getAiCreatorVideoDurationFillPercent,
  paginateAiCreatorHistory,
  prependAiCreatorHistory,
  readAiCreatorHistory,
  removeAiCreatorHistoryItem,
  saveAiCreatorItemToCreatorCoverDraft,
  saveAiCreatorItemToCreatorDraft,
  toggleAiCreatorHistoryFavorite,
  validateAiCreatorUpload,
  validateAiCreatorUploadSlot,
  validateAiCreatorUploadSlots,
  writeAiCreatorHistory,
  type AiCreatorGeneratedItem,
} from '../apps/frontend/src/lib/aiCreator'
import type { ChatSummary } from '../apps/frontend/src/lib/api'
import contentReducer, { hydrateContent } from '../apps/frontend/src/store/slices/contentSlice'
import draftsReducer, { hydrateDrafts } from '../apps/frontend/src/store/slices/draftsSlice'

function mapStorage(): SafeStorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>()
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value)
    },
    removeItem: (key) => {
      values.delete(key)
    },
  }
}

const throwingStorage: SafeStorageLike = {
  getItem: () => {
    throw new Error('storage blocked')
  },
  setItem: () => {
    throw new Error('quota exceeded')
  },
  removeItem: () => {
    throw new Error('storage blocked')
  },
}

function collectSourceFiles(root: string) {
  const files: string[] = []
  for (const entry of readdirSync(root)) {
    const filePath = join(root, entry)
    const stats = statSync(filePath)
    if (stats.isDirectory()) {
      files.push(...collectSourceFiles(filePath))
      continue
    }
    if (/\.(ts|tsx)$/.test(entry)) files.push(filePath)
  }
  return files
}

function directStorageAccessPattern() {
  return /\b(?:(?:window|globalThis)\s*\.\s*)?(?:localStorage|sessionStorage)\s*\.\s*(?:getItem|setItem|removeItem)\s*\(/g
}

function collectDirectStorageAccess(content: string) {
  return [...content.matchAll(directStorageAccessPattern())].map((match) => match[0])
}

function creatorDraftResponse(name = 'มะปราง'): AiCreatorGeneratedItem['response'] {
  return {
    draft: {
      name,
      tagline: 'บททดสอบ',
      description: 'คำอธิบาย',
      biography: 'ประวัติ',
      scenario: 'สถานการณ์',
      systemPrompt: 'system',
      compactPrompt: 'compact',
      characterAnchor: 'anchor',
      constraints: 'constraints',
      greeting: 'สวัสดี',
      tags: 'anime',
    },
    image: {
      url: '/avatar.png',
      provider: 'placeholder',
      prompt: 'portrait',
      note: 'fallback',
    },
    source: 'fallback',
    modelName: 'local/mock',
    warnings: [],
  }
}

function chatSummary(overrides: Partial<ChatSummary> & Pick<ChatSummary, 'id'>): ChatSummary {
  return {
    id: overrides.id,
    title: overrides.title ?? '',
    characterId: overrides.characterId ?? `character-${overrides.id}`,
    characterName: overrides.characterName ?? `ตัวละคร ${overrides.id}`,
    lastMessageAt: overrides.lastMessageAt ?? '2026-06-16T00:00:00.000Z',
    preview: overrides.preview ?? '',
    ...overrides,
  }
}

describe('frontend storage helpers', () => {
  test('wraps localStorage reads, writes, and removals without throwing', () => {
    const storage = mapStorage()

    expect(safeSetStorageItem(storage, 'maprang:test', 'value')).toBe(true)
    expect(safeGetStorageItem(storage, 'maprang:test')).toBe('value')
    expect(safeRemoveStorageItem(storage, 'maprang:test')).toBe(true)
    expect(safeGetStorageItem(storage, 'maprang:test')).toBeNull()

    expect(safeGetStorageItem(throwingStorage, 'maprang:test')).toBeNull()
    expect(safeSetStorageItem(throwingStorage, 'maprang:test', 'value')).toBe(false)
    expect(safeRemoveStorageItem(throwingStorage, 'maprang:test')).toBe(false)
    expect(safeSetStorageItem(null, 'maprang:test', 'value')).toBe(false)
  })

  test('parses pinned chat ids defensively', () => {
    expect(loadPinnedChatIdsFromRaw('["a","b",1,null,"a"]')).toEqual(['a', 'b', 'a'])
    expect(loadPinnedChatIdsFromRaw('not-json')).toEqual([])
    expect(loadPinnedChatIdsFromRaw('{"id":"a"}')).toEqual([])
    expect(serializePinnedChatIds(['b', 'a'])).toBe('["b","a"]')
    expect(togglePinnedChatId(['b'], 'a')).toEqual(['a', 'b'])
    expect(togglePinnedChatId(['a', 'b'], 'a')).toEqual(['b'])
  })

  test('filters, searches, sorts, and selects chat summaries predictably', () => {
    const chats = [
      chatSummary({ id: 'old', characterName: 'มิกะ', lastMessageAt: '2026-06-10T00:00:00.000Z' }),
      chatSummary({
        id: 'pending',
        title: 'ฉากสำคัญ',
        preview: 'มีอีเวนต์รออยู่',
        lastMessageAt: '2026-06-12T00:00:00.000Z',
        sceneState: { mode: 'sandbox', activeScene: null, pendingEvents: [{ id: 'event-1', status: 'pending' }] },
      } as Partial<ChatSummary> & Pick<ChatSummary, 'id'>),
      chatSummary({ id: 'new', characterName: 'ลูน่า', lastMessageAt: '2026-06-15T00:00:00.000Z' }),
    ]

    expect(filterAndSortChats({ chats, filter: 'all', pinnedChatIds: ['old'], search: '' }).map((chat) => chat.id)).toEqual([
      'old',
      'new',
      'pending',
    ])
    expect(filterAndSortChats({ chats, filter: 'pending', pinnedChatIds: [], search: '' }).map((chat) => chat.id)).toEqual([
      'pending',
    ])
    expect(filterAndSortChats({ chats, filter: 'pinned', pinnedChatIds: ['old'], search: '' }).map((chat) => chat.id)).toEqual([
      'old',
    ])
    expect(filterAndSortChats({ chats, filter: 'all', pinnedChatIds: [], search: 'ลูน่า' }).map((chat) => chat.id)).toEqual([
      'new',
    ])
    expect(getPendingChatEventCount(chats[1])).toBe(1)
    expect(toggleSelectedChatId(['old'], 'new')).toEqual(['old', 'new'])
    expect(toggleSelectedChatId(['old', 'new'], 'old')).toEqual(['new'])
  })

  test('persists and reads AI creator history through safe storage', () => {
    const storage = mapStorage()
    const item: AiCreatorGeneratedItem = {
      id: 'generated-1',
      type: 'image',
      url: '/avatar.png',
      prompt: 'portrait',
      brief: 'quiet character',
      style: 'anime',
      timestamp: 1,
      response: creatorDraftResponse(),
    }

    writeAiCreatorHistory(storage, [item])
    expect(readAiCreatorHistory(storage)).toEqual([item])
    expect(readAiCreatorHistory(throwingStorage)).toEqual([])
    safeSetStorageItem(storage, 'maprang:creator-image-history', '{"bad":true}')
    expect(readAiCreatorHistory(storage)).toEqual([])
  })

  test('filters and paginates AI creator history without mutating input', () => {
    const history = Array.from({ length: 14 }, (_, index): AiCreatorGeneratedItem => ({
      id: `item-${index}`,
      type: index % 2 === 0 ? 'image' : 'video',
      url: `/item-${index}.png`,
      prompt: `prompt ${index}`,
      brief: '',
      style: 'anime',
      timestamp: index,
      response: creatorDraftResponse(`item ${index}`),
    }))

    expect(filterAiCreatorHistory(history, 'image')).toHaveLength(7)
    expect(filterAiCreatorHistory(history, 'video')).toHaveLength(7)
    expect(filterAiCreatorHistory([{ ...history[0], isFavorite: true }, ...history.slice(1)], 'favorite')).toHaveLength(1)
    expect(filterAiCreatorHistory(history, 'all')).toBe(history)
    expect(paginateAiCreatorHistory(history, 1)).toHaveLength(12)
    expect(paginateAiCreatorHistory(history, 2).map((item) => item.id)).toEqual(['item-12', 'item-13'])
  })

  test('builds AI creator result items and applies history mutations predictably', () => {
    const response = creatorDraftResponse('มิกะ')
    const imageItem = createAiCreatorImageItem({
      id: 'image-1',
      response,
      prompt: 'portrait',
      brief: 'brief',
      style: 'anime',
      timestamp: 10,
    })
    const videoItem = createAiCreatorVideoItem({
      id: 'video-1',
      response,
      prompt: 'move slowly',
      brief: 'brief',
      duration: 5,
      motionTemplate: 'gentle-breeze',
      timestamp: 11,
    })

    expect(imageItem).toMatchObject({ id: 'image-1', type: 'image', url: '/avatar.png', style: 'anime', timestamp: 10 })
    expect(videoItem).toMatchObject({
      id: 'video-1',
      type: 'video',
      url: '/avatar.png',
      videoUrl: 'local-video-preview',
      style: 'video_render',
      duration: 5,
      motionTemplate: 'gentle-breeze',
      timestamp: 11,
    })
    expect(prependAiCreatorHistory([imageItem], videoItem).map((item) => item.id)).toEqual(['video-1', 'image-1'])
    expect(removeAiCreatorHistoryItem([videoItem, imageItem], 'video-1')).toEqual([imageItem])
    expect(toggleAiCreatorHistoryFavorite([videoItem, imageItem], 'image-1').find((item) => item.id === 'image-1')?.isFavorite).toBe(true)
    expect(
      toggleAiCreatorHistoryFavorite([{ ...imageItem, isFavorite: true }], 'image-1')[0]?.isFavorite,
    ).toBe(false)
  })

  test('derives AI creator download and retry actions for local and backend-backed outputs', () => {
    const localItem = createAiCreatorImageItem({
      id: 'image-1',
      response: creatorDraftResponse('Mika / Test'),
      prompt: 'portrait',
      brief: 'brief',
      style: 'anime',
      timestamp: 10,
    })
    const backendItem: AiCreatorGeneratedItem = {
      ...localItem,
      id: 'image-2',
      backendJobId: '22222222-2222-4222-8222-222222222222',
      backendJobStatus: 'failed',
      backendOutputId: '11111111-1111-4111-8111-111111111111',
    }
    const runningBackendItem: AiCreatorGeneratedItem = {
      ...backendItem,
      id: 'image-running',
      backendJobStatus: 'running',
    }
    const unsafeItem: AiCreatorGeneratedItem = {
      ...localItem,
      id: 'image-3',
      url: 'javascript:alert(1)',
    }

    expect(getAiCreatorDownloadActionState(localItem)).toMatchObject({ canDownload: true, mode: 'local' })
    expect(getAiCreatorDownloadActionState(backendItem)).toMatchObject({ canDownload: true, mode: 'backend' })
    expect(getAiCreatorDownloadActionState(unsafeItem)).toMatchObject({ canDownload: false, mode: 'unavailable' })
    expect(getAiCreatorRetryActionState(localItem)).toMatchObject({ canRetry: false, mode: 'unavailable' })
    expect(getAiCreatorRetryActionState(backendItem)).toMatchObject({ canRetry: true, mode: 'backend' })
    expect(getAiCreatorRetryActionState(runningBackendItem)).toMatchObject({ canRetry: false, mode: 'backend' })
    expect(buildAiCreatorDownloadFilename(localItem)).toBe('mika-test.png')
  })

  test('summarizes AI creator download link expiry and refresh states', () => {
    expect(
      getAiCreatorDownloadLinkNotice({
        access: 'direct',
        generatedAt: 1000,
        expiresIn: null,
        expiresAt: null,
      }),
    ).toMatchObject({ state: 'direct' })
    expect(
      getAiCreatorDownloadLinkNotice({
        access: 'public',
        generatedAt: 1000,
        expiresIn: null,
        expiresAt: null,
      }),
    ).toMatchObject({ state: 'public' })
    expect(
      getAiCreatorDownloadLinkNotice(
        {
          access: 'signed',
          generatedAt: 1000,
          expiresIn: 60,
          expiresAt: 61_000,
        },
        30_100,
      ),
    ).toMatchObject({ state: 'signed-active', remainingSeconds: 31 })
    expect(
      getAiCreatorDownloadLinkNotice(
        {
          access: 'signed',
          generatedAt: 1000,
          expiresIn: 60,
          expiresAt: 61_000,
        },
        61_000,
      ),
    ).toMatchObject({ state: 'signed-expired', remainingSeconds: 0 })
  })

  test('maps backend generation job outputs into private My Library items', () => {
    const items = createAiCreatorItemsFromGenerationJobs([
      {
        id: 'job-1',
        templateId: 'text-to-image',
        status: 'succeeded',
        message: 'created',
        input: { prompt: 'warm portrait' },
        createdAt: '2026-06-17T00:00:00.000Z',
        outputs: [
          {
            id: 'output-1',
            kind: 'image',
            url: 'https://cdn.example.test/output.png',
            isFavorite: true,
            createdAt: '2026-06-17T00:01:00.000Z',
          },
          {
            id: 'output-empty',
            kind: 'image',
            url: null,
          },
        ],
      },
    ])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'backend-output-1',
      backendJobId: 'job-1',
      backendJobStatus: 'succeeded',
      backendOutputId: 'output-1',
      librarySource: 'backend',
      type: 'image',
      url: 'https://cdn.example.test/output.png',
      prompt: 'warm portrait',
      isFavorite: true,
    })
    expect(getAiCreatorDownloadActionState(items[0]).mode).toBe('backend')
    expect(items[0].response.draft.constraints).toContain('ส่วนตัว')
  })

  test('maps public gallery outputs into reusable library items without private metadata', () => {
    const items = createAiCreatorItemsFromPublicGalleryOutputs([
      {
        id: '88888888-1111-4111-8111-888888888888',
        jobId: '77777777-1111-4111-8111-777777777777',
        kind: 'image',
        url: 'https://cdn.example.test/public.png',
        visibility: 'public',
        isFavorite: false,
        createdAt: '2026-06-17T00:00:00.000Z',
        prompt: '  reusable public prompt  ',
        templateId: 'character-avatar',
        brief: '  public brief  ',
      },
      {
        id: '99999999-1111-4111-8111-999999999999',
        jobId: '77777777-1111-4111-8111-777777777777',
        kind: 'image',
        url: null,
        visibility: 'public',
        isFavorite: false,
        createdAt: '2026-06-17T00:00:00.000Z',
        prompt: 'hidden output',
        templateId: 'character-avatar',
      },
    ])

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      id: 'public-88888888-1111-4111-8111-888888888888',
      backendJobId: '77777777-1111-4111-8111-777777777777',
      backendOutputId: '88888888-1111-4111-8111-888888888888',
      librarySource: 'backend',
      type: 'image',
      url: 'https://cdn.example.test/public.png',
      prompt: 'reusable public prompt',
      brief: 'public brief',
      style: 'character-avatar',
      visibility: 'public',
    })
    expect(items[0].response.modelName).toBe('generation/gallery')
    expect(JSON.stringify(items[0])).not.toContain('storageKey')
  })

  test('saves an AI creator library item into the existing creator draft contract', () => {
    const storage = mapStorage()
    const item = createAiCreatorImageItem({
      id: 'image-1',
      response: creatorDraftResponse('มิกะ'),
      prompt: 'soft portrait',
      brief: 'warm friend',
      style: 'anime',
      timestamp: 10,
    })

    const draft = saveAiCreatorItemToCreatorDraft(storage, item)
    expect(draft.form?.avatarUrl).toBe('/avatar.png')
    expect(draft.form?.name).toBe('ไอริส | IRIS')
    expect(draft.avatarSource).toBe('manual')
    expect(draft.hasImageDraft).toBe(true)
    expect(draft.generatedImages).toEqual([{ url: '/avatar.png', source: 'manual' }])
    expect(JSON.parse(storage.getItem('maprang:creator-draft:v1') || '{}')).toMatchObject({
      form: { avatarUrl: '/avatar.png' },
      hasImageDraft: true,
    })
  })

  test('saves an AI creator library item as creator cover without overwriting character fields', () => {
    const storage = mapStorage()
    storage.setItem(
      'maprang:creator-draft:v1',
      JSON.stringify({
        form: { name: 'Existing name', avatarUrl: '/old-avatar.png' },
        hasImageDraft: true,
        generatedImages: [{ url: '/old-avatar.png', source: 'manual' }],
      }),
    )
    const item = createAiCreatorImageItem({
      id: 'image-cover',
      response: creatorDraftResponse('มิกะ'),
      prompt: 'wide cover',
      brief: 'cover mood',
      style: 'cinematic',
      timestamp: 20,
    })

    const draft = saveAiCreatorItemToCreatorCoverDraft(storage, item)
    expect(draft.form?.name).toBe('Existing name')
    expect(draft.form?.avatarUrl).toBe('/old-avatar.png')
    expect(draft.coverImageUrl).toBe('/avatar.png')
    expect(draft.coverImageSource).toBe('manual')
    expect(draft.hasCoverDraft).toBe(true)
    expect(draft.generatedImages).toEqual([
      { url: '/avatar.png', source: 'manual' },
      { url: '/old-avatar.png', source: 'manual' },
    ])
    expect(JSON.parse(storage.getItem('maprang:creator-draft:v1') || '{}')).toMatchObject({
      coverImageUrl: '/avatar.png',
      hasCoverDraft: true,
    })
  })

  test('validates AI creator upload files and generate blocked states', () => {
    expect(validateAiCreatorUpload({ name: 'avatar.png', type: 'image/png', size: 1024 }, 'image')).toEqual({ ok: true })
    expect(validateAiCreatorUpload({ name: 'clip.mp4', type: 'video/mp4', size: 1024 }, 'video')).toEqual({ ok: true })
    expect(createAiCreatorUploadPreview({ name: 'avatar.png', type: 'image/png', size: 1536 })).toEqual({
      name: 'avatar.png',
      typeLabel: 'image/png',
      sizeLabel: '1.5 KB',
    })
    expect(formatAiCreatorFileSize(0)).toBe('0 KB')
    expect(formatAiCreatorFileSize(10 * 1024 * 1024)).toBe('10 MB')
    expect(validateAiCreatorUpload({ name: 'avatar.txt', type: 'text/plain', size: 1024 }, 'image')).toEqual({
      ok: false,
      reason: 'รองรับเฉพาะไฟล์รูปภาพ JPG / PNG / WebP / GIF',
    })
    expect(validateAiCreatorUpload({ name: 'clip.avi', type: 'video/x-msvideo', size: 1024 }, 'video')).toEqual({
      ok: false,
      reason: 'รองรับเฉพาะไฟล์วิดีโอ MP4 / WebM / MOV',
    })
    expect(validateAiCreatorUpload({ name: 'large.png', type: 'image/png', size: 11 * 1024 * 1024 }, 'image')).toEqual({
      ok: false,
      reason: 'รูปภาพต้องมีขนาดไม่เกิน 10MB',
    })
    expect(validateAiCreatorUpload({ name: 'large.mov', type: 'video/quicktime', size: 51 * 1024 * 1024 }, 'video')).toEqual({
      ok: false,
      reason: 'วิดีโอต้องมีขนาดไม่เกิน 50MB',
    })
    expect(validateAiCreatorUpload({ name: 'avatar.webp', type: 'image/webp', size: 10 * 1024 * 1024 }, 'image')).toEqual({
      ok: true,
    })
    expect(validateAiCreatorUpload({ name: 'clip.webm', type: 'video/webm', size: 50 * 1024 * 1024 }, 'video')).toEqual({
      ok: true,
    })
    expect(getAiCreatorGenerateBlockReason({ mode: 'image', brief: '', prompt: '', isGenerating: false })).toBe(
      'กรอกบริบทตัวละครหรือคำสั่งภาพก่อนสร้าง',
    )
    expect(getAiCreatorGenerateBlockReason({ mode: 'video', brief: '', prompt: '', isGenerating: false })).toBe(
      'กรอกบริบทตัวละครหรือคำสั่งวิดีโอก่อนสร้าง',
    )
    expect(getAiCreatorGenerateBlockReason({ mode: 'template', brief: '', prompt: '', isGenerating: false })).toBeNull()
    expect(getAiCreatorGenerateBlockReason({ mode: 'image', brief: 'มีบริบท', prompt: '', isGenerating: false })).toBeNull()
    expect(getAiCreatorGenerateBlockReason({ mode: 'image', brief: 'มีบริบท', prompt: '', isGenerating: true })).toBe(
      'ระบบกำลังประมวลผลอยู่',
    )
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        requiredUploadCount: 2,
        uploadedCount: 1,
      }),
    ).toBe('อัปโหลดไฟล์อ้างอิงให้ครบ 2 ไฟล์ก่อนสร้าง')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        tokenBalance: 100,
        creditCost: 600,
      }),
    ).toBe('เครดิตไม่พอ ต้องใช้ 600 เครดิต')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        userLevel: 1,
        minLevel: 2,
      }),
    ).toBe('ต้องใช้บัญชีเลเวล 2 ขึ้นไป')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        providerReady: false,
      }),
    ).toBe('ยังไม่ได้ตั้งค่าผู้ให้บริการสร้างรูปจริง')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        providerStatus: 'unavailable',
      }),
    ).toBe('ผู้ให้บริการสร้างรูปยังไม่พร้อมใช้งาน ลองใหม่อีกครั้ง')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        providerStatus: 'rate_limited',
      }),
    ).toBe('ผู้ให้บริการสร้างรูปติดข้อจำกัดชั่วคราว ลองใหม่ภายหลัง')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        contentAllowed: false,
      }),
    ).toBe('โหมดเนื้อหาปัจจุบันไม่รองรับแม่แบบนี้')
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'image',
        brief: 'มีบริบท',
        prompt: '',
        isGenerating: false,
        tokenBalance: 600,
        creditCost: 600,
        requiredUploadCount: 1,
        uploadedCount: 1,
        userLevel: 2,
        minLevel: 2,
      }),
    ).toBeNull()
    expect(
      getAiCreatorGenerateBlockReason({
        mode: 'template',
        brief: '',
        prompt: '',
        isGenerating: false,
        requiredUploadCount: 2,
        uploadedCount: 1,
      }),
    ).toBe('อัปโหลดไฟล์อ้างอิงให้ครบ 2 ไฟล์ก่อนสร้าง')
    expect(getAiCreatorVideoDurationFillPercent(3)).toBe(0)
    expect(getAiCreatorVideoDurationFillPercent(10)).toBe(100)
    expect(getAiCreatorVideoDurationFillPercent(2)).toBe(0)
    expect(getAiCreatorVideoDurationFillPercent(11)).toBe(100)
  })

  test('builds a complete AI creator blocked-state QA matrix with no debit states', () => {
    const matrix = buildAiCreatorBlockedStateMatrix()
    const codes = matrix.map((state) => state.code)

    expect(codes).toEqual([
      'missing_image_prompt',
      'missing_upload',
      'invalid_input',
      'insufficient_credit',
      'level_too_low',
      'provider_missing',
      'provider_unavailable',
      'provider_rate_limited',
      'content_gate',
      'running_job',
    ])
    expect(matrix.every((state) => state.debitAllowed === false)).toBe(true)
    expect(matrix.every((state) => state.title && state.cause && state.nextAction)).toBe(true)
  })

  test('prioritizes AI creator blocked states before any debit-capable work', () => {
    expect(
      getAiCreatorGenerateBlockState({
        mode: 'image',
        brief: 'ready',
        prompt: 'ready',
        isGenerating: true,
        providerStatus: 'missing',
        contentAllowed: false,
        tokenBalance: 0,
        creditCost: 100,
        inputError: 'bad file',
        requiredUploadCount: 1,
        uploadedCount: 0,
      })?.code,
    ).toBe('running_job')
    expect(
      getAiCreatorGenerateBlockState({
        mode: 'image',
        brief: 'ready',
        prompt: 'ready',
        isGenerating: false,
        providerStatus: 'missing',
        contentAllowed: false,
        tokenBalance: 0,
        creditCost: 100,
      })?.code,
    ).toBe('content_gate')
    expect(
      getAiCreatorGenerateBlockState({
        mode: 'image',
        brief: 'ready',
        prompt: 'ready',
        isGenerating: false,
        providerStatus: 'missing',
        tokenBalance: 0,
        creditCost: 100,
      })?.code,
    ).toBe('provider_missing')
    expect(
      getAiCreatorGenerateBlockState({
        mode: 'image',
        brief: 'ready',
        prompt: 'ready',
        isGenerating: false,
        providerStatus: 'ready',
        tokenBalance: 0,
        creditCost: 100,
        inputError: 'bad file',
        requiredUploadCount: 1,
        uploadedCount: 0,
      })?.code,
    ).toBe('insufficient_credit')
    expect(
      getAiCreatorGenerateBlockState({
        mode: 'image',
        brief: 'ready',
        prompt: 'ready',
        isGenerating: false,
        providerStatus: 'ready',
        tokenBalance: 100,
        creditCost: 100,
        inputError: 'bad file',
        requiredUploadCount: 1,
        uploadedCount: 0,
      })?.code,
    ).toBe('invalid_input')
  })

  test('validates AI creator upload slots by template contract', () => {
    const imageRule = AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage[0]
    const imageToVideoRule = AI_CREATOR_UPLOAD_SLOT_RULES.imageToVideo[0]
    const videoRule = AI_CREATOR_UPLOAD_SLOT_RULES.advancedVideo[0]

    expect(validateAiCreatorUploadSlots(AI_CREATOR_UPLOAD_SLOT_RULES.textToImage, {})).toEqual({ ok: true })
    expect(validateAiCreatorUploadSlot(imageRule, null)).toMatchObject({
      ok: false,
      slotId: 'reference-image',
    })
    expect(
      validateAiCreatorUploadSlot(imageRule, {
        file: { name: 'animated.gif', type: 'image/gif', size: 1024 },
      }),
    ).toMatchObject({
      ok: false,
      slotId: 'reference-image',
    })
    expect(
      validateAiCreatorUploadSlots(AI_CREATOR_UPLOAD_SLOT_RULES.imageToImage, {
        'reference-image': { file: { name: 'avatar.webp', type: 'image/webp', size: 1024 } },
      }),
    ).toEqual({ ok: true })
    expect(
      validateAiCreatorUploadSlot(imageToVideoRule, {
        file: { name: 'wide.png', type: 'image/png', size: 10 * 1024 * 1024 },
        durationSeconds: 30,
      }),
    ).toEqual({ ok: true })
    expect(
      validateAiCreatorUploadSlot(videoRule, {
        file: { name: 'clip.mp4', type: 'video/mp4', size: 1024 },
        durationSeconds: 31,
      }),
    ).toMatchObject({
      ok: false,
      slotId: 'reference-video',
    })
    expect(
      validateAiCreatorUploadSlot(videoRule, {
        file: { name: 'clip.mov', type: 'video/quicktime', size: 50 * 1024 * 1024 },
        durationSeconds: 30,
      }),
    ).toEqual({ ok: true })
  })

  test('validates aggregate AI creator upload slots in stable first-failure order', () => {
    const rules = [
      {
        id: 'primary-image',
        label: 'รูปหลัก',
        kind: 'image',
        required: true,
        acceptedTypes: ['image/png'] as const,
        maxBytes: 1024,
      },
      {
        id: 'reference-video',
        label: 'วิดีโออ้างอิง',
        kind: 'video',
        required: true,
        acceptedTypes: ['video/mp4'] as const,
        maxBytes: 2048,
        maxDurationSeconds: 10,
      },
    ] as const

    expect(validateAiCreatorUploadSlots(rules, {})).toMatchObject({
      ok: false,
      slotId: 'primary-image',
    })
    expect(
      validateAiCreatorUploadSlots(rules, {
        'primary-image': { file: { name: 'avatar.png', type: 'image/png', size: 1024 } },
      }),
    ).toMatchObject({
      ok: false,
      slotId: 'reference-video',
    })
    expect(
      validateAiCreatorUploadSlots(rules, {
        'primary-image': { file: { name: 'avatar.png', type: 'image/png', size: 1024 } },
        'reference-video': { file: { name: 'clip.mp4', type: 'video/mp4', size: 2048 }, durationSeconds: 10 },
      }),
    ).toEqual({ ok: true })
    expect(
      validateAiCreatorUploadSlots(rules, {
        'primary-image': { file: { name: 'avatar.png', type: 'image/png', size: 1025 } },
        'reference-video': { file: { name: 'clip.mp4', type: 'video/mp4', size: 4096 }, durationSeconds: 11 },
      }),
    ).toMatchObject({
      ok: false,
      slotId: 'primary-image',
    })
  })

  test('drops stale redux fields from persisted local state', () => {
    const legacyContent = {
      isAdult: true,
      ageGateAnswered: true,
      maxRating: 'restricted_18' as const,
      showMature: true,
    }
    const legacyDrafts = {
      composerByKey: { 'chat:1': 'ยังพิมพ์ค้างไว้' },
      personaDraft: 'ผู้เล่นชอบเล่าเรื่องช้า ๆ',
      personaUpdatedAt: '2026-05-25T00:00:00.000Z',
      creatorDraftUpdatedAt: '2026-05-25T00:00:00.000Z',
    }
    const content = contentReducer(undefined, hydrateContent(legacyContent))
    const drafts = draftsReducer(undefined, hydrateDrafts(legacyDrafts))

    expect(content).toEqual({
      isAdult: true,
      ageGateAnswered: true,
      maxRating: 'restricted_18',
    })
    expect('showMature' in content).toBe(false)
    expect(drafts).toEqual({
      composerByKey: { 'chat:1': 'ยังพิมพ์ค้างไว้' },
      personaDraft: 'ผู้เล่นชอบเล่าเรื่องช้า ๆ',
      personaUpdatedAt: '2026-05-25T00:00:00.000Z',
    })
    expect('creatorDraftUpdatedAt' in drafts).toBe(false)
  })

  test('detects direct browser storage access variants', () => {
    expect(
      collectDirectStorageAccess(`
        localStorage.getItem('a')
        localStorage . setItem('a', 'b')
        window.localStorage.removeItem('a')
        window . sessionStorage . getItem('a')
        globalThis . localStorage . setItem('a', 'b')
      `),
    ).toEqual([
      'localStorage.getItem(',
      'localStorage . setItem(',
      'window.localStorage.removeItem(',
      'window . sessionStorage . getItem(',
      'globalThis . localStorage . setItem(',
    ])
  })

  test('keeps frontend source on safe storage wrappers', () => {
    const sourceRoot = join(process.cwd(), 'apps', 'frontend', 'src')
    const offenders = collectSourceFiles(sourceRoot).flatMap((filePath) => {
      const content = readFileSync(filePath, 'utf8')
      return [...content.matchAll(directStorageAccessPattern())].map((match) => `${relative(process.cwd(), filePath)}:${match.index ?? 0}`)
    })

    expect(offenders).toEqual([])
  })
})
