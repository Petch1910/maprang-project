import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  assertMachineReadableErrorCode,
  creatorImageIssue,
  formatApiSmokeCaughtError,
  formatApiSmokeDiagnostic,
  isOnlyLiveVerificationFailure,
  parseApiSmokeStreamEvents,
  tryParseJson,
} from './api-smoke-helpers'
import {
  assertSmokeUserHasTokenBalance,
  findMatchingChatDebits,
  parseMinSmokeTokenBalance,
  validateLiveChatSmokeStream,
  validateLiveChatSmokeResponse,
} from './live-chat-smoke'
import { imageSmokeUrlKind, liveImageDraftFailure, type CreatorDraftPayload } from './image-smoke'
import {
  apiBaseUrl as defaultApiBaseUrl,
  formatSmokeTargetDiagnosticText,
  readJson,
  smokeAuthHeaders,
  smokeTargetIssuesForDeployedGate,
  smokeTargetIsLocal,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'

export type ApiSmokeStatus = 'pass' | 'warn' | 'fail' | 'skip'

export type ApiSmokeResult = {
  name: string
  status: ApiSmokeStatus
  detail: string
}

export type ApiSmokeHandoffEvidence = Record<string, string | number>

const requiredApiSmokeHandoffEvidenceFields = [
  'Chat smoke normal chatId',
  'Chat smoke normal tokens',
  'Chat smoke normal walletTransactionId',
  'Chat smoke stream chatId',
  'Chat smoke stream tokens',
  'Chat smoke stream walletTransactionId',
  'Image smoke provider',
  'Image smoke source',
  'Image smoke urlKind',
  'Image smoke elapsedMs',
] as const

const positiveNumberApiSmokeHandoffEvidenceFields = new Set<string>([
  'Chat smoke normal tokens',
  'Chat smoke stream tokens',
  'Image smoke elapsedMs',
])

function hasCompleteApiSmokeHandoffEvidence(evidence: ApiSmokeHandoffEvidence | undefined) {
  if (!evidence) return false
  return requiredApiSmokeHandoffEvidenceFields.every((field) => {
    const value = evidence[field]
    if (value === undefined || value === null) return false
    if (typeof value === 'string') return value.trim().length > 0
    if (positiveNumberApiSmokeHandoffEvidenceFields.has(field)) return Number.isFinite(value) && value > 0
    return Number.isFinite(value)
  })
}

export function formatApiSmokeStatus(status: ApiSmokeStatus) {
  const labels: Record<ApiSmokeStatus, string> = {
    pass: 'ผ่าน',
    warn: 'เตือน',
    fail: 'ไม่ผ่าน',
    skip: 'ข้าม',
  }
  return labels[status]
}

type ChatSummary = {
  id: string
  title?: string | null
  characterName?: string | null
  isArchived?: boolean
}

type SmokeCharacter = {
  id: string
  name?: string | null
  tagline?: string | null
  systemPrompt?: string | null
  viewCount?: number
  favoriteCount?: number
  isFavorite?: boolean
  tags?: string[]
}

type SmokeLoreEntry = {
  id: string
  keyword?: string
  content?: string
  priority?: number
}

type StreamSmokeEvent =
  | { type: 'delta'; content?: string }
  | {
      type: 'done'
      chatId?: string | null
      usage?: {
        totalTokens?: number
        modelName?: string
        contextLoreCount?: number
        providerFailure?: { code?: string }
      }
    }
  | { type: 'error'; message?: string; chatId?: string | null }

type HealthSmokePayload = {
  ok: boolean
  checks?: {
    databaseConnected?: boolean
  }
  model?: {
    minRoleplayReplyChars?: number
    promptBudgetTokens?: number
    promptHistoryMaxMessages?: number
    chatProvider?: {
      activeRuntimeProvider?: string
      forcedLocal?: boolean
      localModel?: string
    }
  }
}

type ApiSmokeWalletTransaction = {
  id: string
  type: string
  amount: number
  balanceAfter: number
}

export type ApiSmokeRunnerOptions = {
  argv?: string[]
  apiBaseUrl?: string
  writeLine?: (line: string) => void
  writeWarn?: (line: string) => void
}

export function buildApiSmokeSummary(
  results: ApiSmokeResult[],
  options: {
    apiBaseUrl: string
    live: boolean
    requireLiveImage: boolean
    requireAdmin: boolean
    handoffEvidence?: ApiSmokeHandoffEvidence
  },
) {
  const handoffEvidence =
    options.handoffEvidence && hasCompleteApiSmokeHandoffEvidence(options.handoffEvidence)
      ? options.handoffEvidence
      : undefined
  return {
    ok: results.every((result) => result.status !== 'fail'),
    apiBaseUrl: options.apiBaseUrl,
    live: options.live,
    requireLiveImage: options.requireLiveImage,
    requireAdmin: options.requireAdmin,
    pass: results.filter((result) => result.status === 'pass').length,
    warn: results.filter((result) => result.status === 'warn').length,
    skip: results.filter((result) => result.status === 'skip').length,
    fail: results.filter((result) => result.status === 'fail').length,
    ...(handoffEvidence ? { handoffEvidence } : {}),
  }
}

function formatApiHandoffEvidence(evidence: ApiSmokeHandoffEvidence) {
  return Object.entries(evidence)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ')
}

function apiImageSmokeEvidence(payload: CreatorDraftPayload, elapsedMs: number): ApiSmokeHandoffEvidence {
  const provider = payload.image?.provider ?? 'none'
  const source = payload.source ?? 'unknown'
  const urlKind = imageSmokeUrlKind(payload.image?.url)
  return {
    'Image smoke provider': provider,
    'Image smoke source': source,
    'Image smoke urlKind': urlKind,
    'Image smoke elapsedMs': elapsedMs,
  }
}

function formatApiImageSmokeEvidence(payload: CreatorDraftPayload, elapsedMs: number) {
  return formatApiHandoffEvidence(apiImageSmokeEvidence(payload, elapsedMs))
}

function apiChatSmokeEvidence({
  normalChatId,
  normalTokens,
  normalDebit,
  streamChatId,
  streamTokens,
  streamDebit,
}: {
  normalChatId: string
  normalTokens: number
  normalDebit: ApiSmokeWalletTransaction
  streamChatId: string
  streamTokens: number
  streamDebit: ApiSmokeWalletTransaction
}): ApiSmokeHandoffEvidence {
  return {
    'Chat smoke normal chatId': normalChatId,
    'Chat smoke normal tokens': normalTokens,
    'Chat smoke normal walletTransactionId': normalDebit.id,
    'Chat smoke stream chatId': streamChatId,
    'Chat smoke stream tokens': streamTokens,
    'Chat smoke stream walletTransactionId': streamDebit.id,
  }
}

const fallbackLocalChatModel = 'local/mock-roleplay'

function activeLocalChatModel(health: HealthSmokePayload | null) {
  return health?.model?.chatProvider?.localModel ?? fallbackLocalChatModel
}

function hasLocalChatRuntime(health: HealthSmokePayload | null) {
  const provider = health?.model?.chatProvider
  return provider?.activeRuntimeProvider === 'local' || provider?.forcedLocal === true
}

function validateLocalChatSmokeResponse(
  payload: {
    reply?: string
    chatId?: string | null
    usage?: {
      totalTokens?: number
      modelName?: string
      providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
    }
  },
  expectedModel: string,
  minRoleplayReplyChars: number,
) {
  if (payload.usage?.providerFailure) {
    throw new Error(`local chat mock ไม่ควรคืน providerFailure: ${payload.usage.providerFailure.code ?? 'unknown'}`)
  }
  if (!payload.chatId) throw new Error('local chat mock ไม่ได้สร้าง chat id')
  if (!payload.reply) throw new Error('local chat mock ไม่คืนคำตอบ')
  if (payload.reply.length < minRoleplayReplyChars) {
    throw new Error(`local chat mock ตอบสั้นเกินไป ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร`)
  }
  if ((payload.usage?.totalTokens ?? -1) !== 0) throw new Error('local chat mock ต้องไม่คิดโทเคน')
  if (payload.usage?.modelName !== expectedModel) {
    throw new Error(`local chat mock ต้องคืน modelName=${expectedModel} แต่ได้ ${payload.usage?.modelName ?? 'missing'}`)
  }

  return {
    chatId: payload.chatId,
    replyChars: payload.reply.length,
    totalTokens: payload.usage?.totalTokens ?? 0,
    modelName: payload.usage?.modelName ?? expectedModel,
  }
}

function validateLocalChatSmokeStream(
  events: StreamSmokeEvent[],
  expectedModel: string,
  minReplyChars = 80,
) {
  const reply = events
    .filter((event): event is Extract<StreamSmokeEvent, { type: 'delta' }> => event.type === 'delta')
    .map((event) => event.content ?? '')
    .join('')
    .trim()
  const error = events.find((event): event is Extract<StreamSmokeEvent, { type: 'error' }> => event.type === 'error')
  const done = events.find((event): event is Extract<StreamSmokeEvent, { type: 'done' }> => event.type === 'done')

  if (error?.message) throw new Error(`local chat stream คืน error: ${error.message}`)
  if (!done) throw new Error('local chat stream ไม่คืน event ปิดท้าย')
  if (!done.chatId) throw new Error('local chat stream ไม่คืน chat id')
  if (done.usage?.providerFailure) {
    throw new Error(`local chat stream ไม่ควรคืน providerFailure: ${done.usage.providerFailure.code ?? 'unknown'}`)
  }
  if ((done.usage?.totalTokens ?? -1) !== 0) throw new Error('local chat stream ต้องไม่คิดโทเคน')
  if (done.usage?.modelName !== expectedModel) {
    throw new Error(`local chat stream ต้องคืน modelName=${expectedModel} แต่ได้ ${done.usage?.modelName ?? 'missing'}`)
  }
  if (reply.length < minReplyChars) throw new Error(`local chat stream คืนคำตอบสั้นเกินไป: ${reply}`)

  return {
    chatId: done.chatId,
    replyChars: reply.length,
    totalTokens: done.usage?.totalTokens ?? 0,
    modelName: done.usage?.modelName ?? expectedModel,
  }
}

export async function runApiSmoke(options: ApiSmokeRunnerOptions = {}) {
const argv = options.argv ?? process.argv
const writeLine = options.writeLine ?? ((line: string) => console.log(line))
const writeWarn = options.writeWarn ?? ((line: string) => console.warn(line))
const apiBaseUrl = options.apiBaseUrl ?? defaultApiBaseUrl
const live = argv.includes('--live')
const requireLiveImage = argv.includes('--require-live-image')
const requireAdmin = argv.includes('--require-admin')
const results: ApiSmokeResult[] = []
const handoffEvidence: ApiSmokeHandoffEvidence = {}

const targetIssues = smokeTargetIssuesForDeployedGate(apiBaseUrl, smokeTargetIsLocal(apiBaseUrl))
if (targetIssues.length > 0) {
  const detail = targetIssues.join('; ')
  results.push({ name: 'SMOKE_API_BASE_URL', status: 'fail', detail })
  writeLine(`${formatApiSmokeStatus('fail')} - SMOKE_API_BASE_URL: ${detail}`)
  writeLine(
    JSON.stringify(
      buildApiSmokeSummary(results, {
        apiBaseUrl: formatSmokeTargetDiagnosticText(apiBaseUrl, 300),
        live,
        requireLiveImage,
        requireAdmin,
      }),
      null,
      2,
    ),
  )
  return 1
}

const authHeaders = smokeAuthHeaders()
const adminKey = await loadAdminKey()
const adminHeaders = adminKey ? { ...authHeaders, 'x-admin-key': adminKey } : null
let healthStatus: HealthSmokePayload | null = null

function record(name: string, status: ApiSmokeStatus, detail: string) {
  results.push({ name, status, detail })
}

async function check(name: string, fn: () => Promise<string | void>) {
  try {
    const detail = await fn()
    record(name, 'pass', detail || 'ok')
  } catch (error) {
    record(name, 'fail', formatApiSmokeCaughtError(error))
  }
}

async function warnable(name: string, fn: () => Promise<{ ok: boolean; detail: string }>) {
  try {
    const result = await fn()
    record(name, result.ok ? 'pass' : 'warn', result.detail)
  } catch (error) {
    record(name, 'fail', formatApiSmokeCaughtError(error))
  }
}

await check('GET /', async () => {
  const payload = await readJson<RootIdentityPayload>('/')
  validateBackendRootIdentity(payload)
  return payload.service
})

await check('GET /health', async () => {
  healthStatus = await readJson<HealthSmokePayload>('/health')
  if (!healthStatus.ok) throw new Error('health คืน ok=false')
  if (!healthStatus.checks?.databaseConnected) throw new Error('databaseConnected=false')
  if (typeof healthStatus.model?.promptBudgetTokens !== 'number') throw new Error('ยังไม่มี promptBudgetTokens')
  if (typeof healthStatus.model?.promptHistoryMaxMessages !== 'number') throw new Error('ยังไม่มี promptHistoryMaxMessages')
  return 'backend และ database พร้อมใช้งาน'
})

await warnable('GET /ready', async () => {
  const readyResponse = await readReadyPayload()
  const ready = readyResponse.payload
  if (!readyResponse.ok || !ready.ok || ready.readiness?.status !== 'ready') {
    const failures = ready.readiness?.failures ?? []
    const reason = failures.join(', ') || `สถานะ ${readyResponse.status}`
    if (live && isOnlyLiveVerificationFailure(failures)) {
      return {
        ok: false,
        detail: `readiness รอการยืนยันผู้ให้บริการจริง; จะรันทดสอบผู้ให้บริการต่อเพื่อให้ตั้งค่า flag หลังผ่านจริง (${reason})`,
      }
    }
    throw new Error(`ยังไม่พร้อม: ${reason}`)
  }
  return { ok: true, detail: 'readiness gate พร้อมใช้งาน' }
})

const characters = await runRequired('GET /characters', async () => {
  const payload = await readJson<{ characters?: Array<{ id: string; name: string }> }>('/characters?view=admin&limit=10', {
    headers: authHeaders,
  })
  if (!payload.characters?.length) throw new Error('API ไม่คืนรายการตัวละคร')
  return payload.characters
})

const primaryCharacter = characters.find((character) => character.name.includes('MIKA')) ?? characters[0]

await check('GET /characters/:id', async () => {
  const payload = await readJson<{ character?: { id: string; name: string } }>(`/characters/${primaryCharacter.id}`, {
    headers: authHeaders,
  })
  if (payload.character?.id !== primaryCharacter.id) throw new Error('API คืนตัวละครไม่ตรงกับที่ขอ')
  return payload.character.name
})

await check('GET /me/usage', async () => {
  const payload = await readJson<{
    user?: { tokenBalance?: number }
    usage?: {
      totalCost?: string
      byModel?: unknown[]
      daily?: unknown[]
      estimate?: { averageTokensPerRequest?: number; estimatedRemainingRequests?: number | null }
    }
    wallet?: { transactions?: unknown[] }
  }>('/me/usage', { headers: authHeaders })
  if (typeof payload.user?.tokenBalance !== 'number') throw new Error('ยังไม่มี tokenBalance')
  if (typeof payload.usage?.totalCost !== 'string') throw new Error('ยังไม่มี totalCost')
  if (!Array.isArray(payload.usage.byModel)) throw new Error('ยังไม่มี usage.byModel')
  if (!Array.isArray(payload.usage.daily) || payload.usage.daily.length !== 7) throw new Error('ยังไม่มีกราฟ usage 7 วัน')
  if (typeof payload.usage.estimate?.averageTokensPerRequest !== 'number') throw new Error('ยังไม่มี usage estimate')
  return `โทเคนคงเหลือ=${payload.user.tokenBalance}, ค่าใช้จ่าย=${payload.usage.totalCost}, รายการกระเป๋า=${payload.wallet?.transactions?.length ?? 0}`
})

await check('GET /me/content-settings', async () => {
  const payload = await readJson<{ contentSettings?: { maxRating?: string } }>('/me/content-settings', {
    headers: authHeaders,
  })
  if (!payload.contentSettings?.maxRating) throw new Error('ยังไม่มีค่าจัดระดับเนื้อหา')
  return payload.contentSettings.maxRating
})

await check('GET/PATCH /me/persona', async () => {
  const current = await readJson<{ persona?: { persona?: string; updatedAt?: string | null; maxChars?: number } }>('/me/persona', {
    headers: authHeaders,
  })
  if (typeof current.persona?.persona !== 'string') throw new Error('ยังไม่มีข้อมูลตัวตนผู้เล่น')

  const marker = `API smoke persona ${Date.now()}`
  const saved = await readJson<{ persona?: { persona?: string; updatedAt?: string | null; maxChars?: number } }>('/me/persona', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ persona: marker }),
  })
  if (saved.persona?.persona !== marker) throw new Error('persona ไม่ถูกบันทึก')
  if (!saved.persona.updatedAt) throw new Error('persona ยังไม่มี updatedAt')

  await readJson<{ persona?: { persona?: string } }>('/me/persona', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ persona: current.persona.persona }),
  })

  return `maxChars=${saved.persona.maxChars ?? 'ไม่ทราบ'}`
})

await check('GET /relationship/presets', async () => {
  const payload = await readJson<{ presets?: unknown[] }>('/relationship/presets')
  if (payload.presets?.length !== 25) throw new Error(`preset ทั้งหมดควรมี 25 รายการ แต่ได้ ${payload.presets?.length ?? 0}`)
  const contractPayload = await readJson<{ presets?: Array<{ id?: string; surfaces?: string[] }> }>('/relationship/presets?surface=contract')
  const creatorPayload = await readJson<{ presets?: Array<{ id?: string; surfaces?: string[] }> }>('/relationship/presets?surface=creator')
  if (contractPayload.presets?.length !== 20) throw new Error(`contract preset ควรมี 20 รายการ แต่ได้ ${contractPayload.presets?.length ?? 0}`)
  if (creatorPayload.presets?.length !== 24) throw new Error(`creator preset ควรมี 24 รายการ แต่ได้ ${creatorPayload.presets?.length ?? 0}`)
  if (!contractPayload.presets.some((preset) => preset.id === 'stranger')) throw new Error('contract preset ยังไม่มี stranger')
  if (!contractPayload.presets.some((preset) => preset.id === 'soulmate')) throw new Error('contract preset ยังไม่มี soulmate')
  if (contractPayload.presets.some((preset) => preset.id === 'safe-family-bond')) throw new Error('contract preset มี creator-only preset ปนอยู่')
  if (creatorPayload.presets.some((preset) => preset.id === 'stranger')) throw new Error('creator preset มี contract-only stranger ปนอยู่')
  if (!creatorPayload.presets.some((preset) => preset.id === 'safe-family-bond')) throw new Error('creator preset ยังไม่มี safe-family-bond')
  if (!contractPayload.presets.every((preset) => preset.surfaces?.includes('contract'))) throw new Error('contract preset ยังไม่มี surface contract ครบ')
  if (!creatorPayload.presets.every((preset) => preset.surfaces?.includes('creator'))) throw new Error('creator preset ยังไม่มี surface creator ครบ')
  return `${payload.presets.length} presets, ${contractPayload.presets.length} contract, ${creatorPayload.presets.length} creator`
})

await check('POST /relationship/preview', async () => {
  const payload = await readJson<{ preview?: { turns?: unknown[] } }>('/relationship/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tags: ['slow-burn', 'relationship-ready', 'scene-ready'],
      messages: ['hello', 'thank you for telling me'],
    }),
  })
  if (!payload.preview?.turns?.length) throw new Error('ตัวอย่างความสัมพันธ์ไม่คืน turn')
  return `${payload.preview.turns.length} turns`
})

await check('POST /relationship/validate', async () => {
  const payload = await readJson<{ issues?: unknown[]; seed?: { route?: string } }>('/relationship/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tags: ['thai', 'roleplay', 'slow-burn', 'relationship-ready', 'scene-ready'],
    }),
  })
  if (!payload.seed?.route) throw new Error('ยังไม่มีเส้นทาง relationship seed')
  if (!Array.isArray(payload.issues)) throw new Error('ยังไม่มีรายการผลตรวจ relationship validation')
  return `route=${payload.seed.route}, issues=${payload.issues.length}`
})

await check('POST/PATCH /characters + lore runtime', async () => {
  const marker = Date.now()
  const createdCharacterIds: string[] = []
  let createdLoreId: string | null = null

  try {
    const created = await readJson<{ character?: SmokeCharacter }>('/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        name: `API Smoke ${marker}`,
        tagline: 'ตัวละครชั่วคราวสำหรับตรวจ runtime API',
        description:
          'ตัวละครทดสอบนี้ถูกสร้างโดย smoke test เพื่อยืนยันว่า API สร้าง แก้ไข จัดการ lore และลบข้อมูลได้จริง',
        biography:
          'เกิดมาเพื่อทดสอบระบบก่อนขึ้น production มีบุคลิกชัดเจน สุภาพ และพร้อมถูกลบทิ้งหลังตรวจสอบเสร็จ',
        scenario: 'พบกันในห้อง QA ก่อนปล่อยระบบจริง ผู้ใช้กำลังตรวจว่าทุก endpoint ทำงานครบถ้วน',
        systemPrompt:
          'คุณคือ API Smoke Character สำหรับทดสอบระบบเท่านั้น ตอบเป็นภาษาไทย สุภาพ กระชับ และไม่สร้างข้อมูลถาวร',
        compactPrompt: 'API Smoke Character: ตัวละครทดสอบชั่วคราวสำหรับตรวจระบบ runtime',
        characterAnchor: 'ย้ำเสมอว่านี่คือข้อมูลทดสอบชั่วคราวของระบบ QA',
        constraints: 'ห้ามอ้างว่าเป็นตัวละครจริงหรือข้อมูล production',
        greeting: 'สวัสดี นี่คือรอบตรวจระบบ API แบบชั่วคราว',
        tags: ['api-smoke', 'thai', 'roleplay', 'relationship-ready'],
        visibility: 'PRIVATE',
        status: 'DRAFT',
      }),
    })
    const characterId = created.character?.id
    if (!characterId) throw new Error('สร้างตัวละครแล้วไม่ได้คืน id')
    createdCharacterIds.push(characterId)

    const loaded = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}`, { headers: authHeaders })
    if (loaded.character?.id !== characterId) throw new Error('โหลดตัวละครที่เพิ่งสร้างไม่ได้')

    const patchedTagline = `แก้ไขโดย API smoke ${marker}`
    const patched = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        tagline: patchedTagline,
        tags: ['api-smoke', 'thai', 'slow-burn', 'scene-ready'],
      }),
    })
    if (patched.character?.tagline !== patchedTagline) throw new Error('แก้ไข tagline ของตัวละครแล้วไม่ถูกบันทึก')
    if (!patched.character.tags?.includes('scene-ready')) throw new Error('แก้ไข tag ของตัวละครแล้วไม่ถูกบันทึก')

    const viewed = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/view`, {
      method: 'POST',
      headers: authHeaders,
    })
    if (typeof viewed.character?.viewCount !== 'number') throw new Error('view endpoint ไม่คืน viewCount')

    const favorited = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ favorite: true }),
    })
    if (!favorited.character?.isFavorite) throw new Error('favorite endpoint ไม่ได้ตั้งค่าตัวละครเป็นรายการโปรด')

    const unfavorited = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ favorite: false }),
    })
    if (unfavorited.character?.isFavorite) throw new Error('favorite endpoint ไม่ได้เอาตัวละครออกจากรายการโปรด')

    const lore = await readJson<{ loreEntry?: SmokeLoreEntry }>(`/characters/${characterId}/lore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        keyword: `api-smoke-${marker}`,
        aliases: ['qa', 'runtime'],
        content: 'Lore ชั่วคราวสำหรับยืนยันว่า creator สามารถเพิ่มข้อมูลจักรวาลของตัวละครได้',
        priority: 2,
      }),
    })
    createdLoreId = lore.loreEntry?.id ?? null
    if (!createdLoreId) throw new Error('สร้าง lore แล้วไม่ได้คืน id')

    const patchedLore = await readJson<{ loreEntry?: SmokeLoreEntry }>(`/lore/${createdLoreId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        content: 'Lore ชั่วคราวถูกแก้ไขแล้วโดย API smoke',
        priority: 4,
      }),
    })
    if (patchedLore.loreEntry?.priority !== 4) throw new Error('แก้ไข priority ของ lore แล้วไม่ถูกบันทึก')

    const deletedLore = await readJson<{ ok?: boolean }>(`/lore/${createdLoreId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!deletedLore.ok) throw new Error('lore delete endpoint คืน ok=false')
    createdLoreId = null

    const duplicated = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/duplicate`, {
      method: 'POST',
      headers: authHeaders,
    })
    const duplicatedId = duplicated.character?.id
    if (!duplicatedId || duplicatedId === characterId) throw new Error('duplicate endpoint ไม่ได้คืน character id ใหม่')
    createdCharacterIds.push(duplicatedId)

    const reset = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/reset-prompt`, {
      method: 'POST',
      headers: authHeaders,
    })
    if (reset.character?.id !== characterId) throw new Error('reset prompt คืนตัวละครไม่ตรงกับที่ขอ')
    if (!reset.character.systemPrompt) throw new Error('reset prompt ไม่คืน systemPrompt')

    return `characterId=${characterId}, duplicateId=${duplicatedId}, lore=created/updated/deleted`
  } finally {
    if (createdLoreId) {
      await bestEffort('delete temporary lore after character smoke', () =>
        readJson(`/lore/${createdLoreId}`, {
          method: 'DELETE',
          headers: authHeaders,
        }),
      )
    }

    for (const characterId of [...createdCharacterIds].reverse()) {
      await bestEffort(`delete temporary character ${characterId} after character smoke`, () =>
        readJson(`/characters/${characterId}`, {
          method: 'DELETE',
          headers: authHeaders,
        }),
      )
    }
  }
})

await warnable('POST /creator/ai-draft', async () => {
  const imageStartedAt = Date.now()
  const payload = await readJson<CreatorDraftPayload & {
    draft?: { name?: string; greeting?: string }
  }>('/creator/ai-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brief: 'Create a Thai slow-burn roleplay character for API smoke. Keep it safe and immediately playable.',
      imagePrompt: 'original Thai roleplay character portrait, cinematic light, no text, no watermark',
      imageOnly: !live,
      skipImageProvider: !live,
      current: {
        tags: 'roleplay, thai, slow-burn, relationship-ready, scene-ready',
      },
    }),
  })
  const imageElapsedMs = Math.max(1, Date.now() - imageStartedAt)
  if (!payload.draft?.name || !payload.draft.greeting) throw new Error('draft ยังขาดช่องข้อความที่จำเป็น')
  const imageProvider = payload.image?.provider ?? 'ไม่มี'
  const detail = `แหล่งร่าง=${payload.source ?? 'ไม่ทราบ'}, รูป=${imageProvider}, ${formatApiImageSmokeEvidence(payload, imageElapsedMs)}`
  const liveImageFailure = live ? liveImageDraftFailure(payload) : null
  if (liveImageFailure) {
    if (requireLiveImage) throw new Error(liveImageFailure)
    return {
      ok: false,
      detail: `${detail}; ${liveImageFailure}`,
    }
  }
  if (live && payload.source !== 'ai') {
    const issue = 'source ของ live image smoke ต้องเป็น ai ก่อนใช้เป็นหลักฐาน release handoff'
    if (requireLiveImage) throw new Error(issue)
    return {
      ok: false,
      detail: `${detail}; ${issue}`,
    }
  }
  if (imageProvider !== 'configured') {
    const issue = creatorImageIssue(payload)
    if (requireLiveImage) throw new Error(issue)
    if (!live) {
      return {
        ok: true,
        detail: `${detail}; ข้ามผู้ให้บริการสร้างรูปสำหรับการตรวจในเครื่อง`,
      }
    }
    return {
      ok: false,
      detail: `${detail}; ${issue}`,
    }
  }
  if (live) Object.assign(handoffEvidence, apiImageSmokeEvidence(payload, imageElapsedMs))
  return { ok: true, detail }
})

await check('POST /chat validation', async () => {
  const payload = await readJson<{
    reply?: string
    chatId?: string | null
    usage?: {
      totalTokens?: number
      providerFailure?: { code?: string }
    }
  }>('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      characterId: "' OR 1=1 --",
      message: 'ตรวจ validation ของแชทต้องไม่เรียกผู้ให้บริการจริง',
      history: [],
    }),
  })

  if (!payload.reply?.includes('รหัสตัวละครไม่ถูกต้อง')) throw new Error('chat validation ไม่คืนข้อความไทยสำหรับ character id ไม่ถูกต้อง')
  if (payload.chatId !== null && payload.chatId !== undefined) throw new Error('chat validation ไม่ควรคืน chatId')
  if ((payload.usage?.totalTokens ?? 0) !== 0) throw new Error('เส้นทางตรวจ validation ของแชทไม่ควรใช้โทเคน')
  if (payload.usage?.providerFailure) {
    throw new Error(`เส้นทางตรวจ validation ของแชทไม่ควรเรียกผู้ให้บริการ แต่พบ providerFailure: ${payload.usage.providerFailure.code}`)
  }
  return 'ปฏิเสธรหัสตัวละครไม่ถูกต้องก่อนเรียกผู้ให้บริการ'
})

let liveChatId: string | null = null
let liveChatTotalTokens: number | null = null

if (live) {
  await check('POST /chat', async () => {
    const minSmokeTokenBalance = parseMinSmokeTokenBalance()
    const wallet = await readJson<{ user?: { tokenBalance?: number } }>('/me/usage', { headers: authHeaders })
    assertSmokeUserHasTokenBalance(wallet.user?.tokenBalance ?? 0, minSmokeTokenBalance)

    const payload = await readJson<{
      reply?: string
      chatId?: string
      usage?: {
        totalTokens?: number
        providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
      }
    }>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        characterId: primaryCharacter.id,
        relationshipSeed: 'stranger',
        maxRating: 'restricted_18',
        history: [],
        message:
          'ฉันนั่งลงตรงข้ามเธอแล้ววางแก้วชาไว้ใกล้มือเธอ ก่อนถามเบาๆว่า วันนี้ดูเหนื่อยนะ เกิดอะไรขึ้นหรือเปล่า เล่าเป็นฉากโรลเพลย์ที่มีบรรยากาศ ความรู้สึก และจังหวะให้ฉันตอบต่อ',
      }),
    })
    const minRoleplayReplyChars = Math.max(420, healthStatus?.model?.minRoleplayReplyChars ?? 420)
    const chatResult = validateLiveChatSmokeResponse(payload, minRoleplayReplyChars)
    liveChatId = chatResult.chatId
    liveChatTotalTokens = chatResult.totalTokens
    return `chatId=${chatResult.chatId}, โทเคน=${chatResult.totalTokens}, ยอดขั้นต่ำ=${minSmokeTokenBalance}, ความยาวคำตอบ=${chatResult.replyChars}, ขั้นต่ำคำตอบโรลเพลย์=${minRoleplayReplyChars}`
  })

  await check('POST /chat/stream live', async () => {
    if (!liveChatId || !liveChatTotalTokens) {
      throw new Error('ยังไม่มีผลแชทจริงให้ใช้ต่อในสตรีมและจับคู่รายการ wallet')
    }

    const events = await readStreamEvents('/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        chatId: liveChatId,
        characterId: primaryCharacter.id,
        relationshipSeed: 'stranger',
        maxRating: 'restricted_18',
        history: [],
        message:
          'ลองตอบกลับเป็นฉากสั้นแบบสตรีมให้เห็นบรรยากาศและจังหวะการคุย เพื่อยืนยันว่าเส้นทาง stream เรียกผู้ให้บริการจริงได้',
      }),
    })

    const streamResult = validateLiveChatSmokeStream(events)
    const streamTotalTokens = streamResult.totalTokens
    const walletAfter = await readJson<{ wallet?: { transactions?: ApiSmokeWalletTransaction[] } }>('/me/usage', {
      headers: authHeaders,
    })
    const chatDebits = findMatchingChatDebits(walletAfter.wallet?.transactions, [liveChatTotalTokens, streamTotalTokens])
    if (!chatDebits) {
      throw new Error('แชทจริงและสตรีมแชทจริงคืนโทเคนแล้ว แต่ไม่พบรายการ wallet แบบ CHAT_USAGE ครบทั้งสองเส้นทาง')
    }

    const [normalDebit, streamDebit] = chatDebits
    if (!normalDebit || !streamDebit) {
      throw new Error('พบรายการ wallet แบบ CHAT_USAGE ไม่ครบสำหรับหลักฐาน release handoff')
    }
    const chatEvidence = apiChatSmokeEvidence({
      normalChatId: liveChatId,
      normalTokens: liveChatTotalTokens,
      normalDebit,
      streamChatId: streamResult.chatId,
      streamTokens: streamTotalTokens,
      streamDebit,
    })
    Object.assign(handoffEvidence, chatEvidence)
    return `chatId=${streamResult.chatId}, โทเคน=${streamTotalTokens}, deltaChars=${streamResult.replyChars}, walletDebits=${chatDebits.length}, ${formatApiHandoffEvidence(chatEvidence)}`
  })
} else {
  if (hasLocalChatRuntime(healthStatus)) {
    let localChatId: string | null = null
    const localModel = activeLocalChatModel(healthStatus)
    const minRoleplayReplyChars = Math.max(420, healthStatus?.model?.minRoleplayReplyChars ?? 420)

    await check('POST /chat local mock', async () => {
      const payload = await readJson<{
        reply?: string
        chatId?: string | null
        usage?: {
          totalTokens?: number
          modelName?: string
          providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
        }
      }>('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          characterId: primaryCharacter.id,
          relationshipSeed: 'stranger',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ฉันเปิดประตูเข้ามาในคาเฟ่ช่วงฝนตก แล้วทักเธอด้วยน้ำเสียงเกรงใจ ช่วยตอบเป็นฉากโรลเพลย์ภาษาไทยที่มีบรรยากาศ ความรู้สึก การกระทำ และเหลือพื้นที่ให้ฉันตอบต่อ',
        }),
      })

      const result = validateLocalChatSmokeResponse(payload, localModel, minRoleplayReplyChars)
      localChatId = result.chatId
      return `chatId=${result.chatId}, model=${result.modelName}, โทเคน=${result.totalTokens}, ความยาวคำตอบ=${result.replyChars}, ขั้นต่ำคำตอบโรลเพลย์=${minRoleplayReplyChars}`
    })

    await check('POST /chat/stream local mock', async () => {
      if (!localChatId) throw new Error('ยังไม่มี local chat id ให้ใช้ต่อใน stream smoke')

      const events = await readStreamEvents('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          chatId: localChatId,
          characterId: primaryCharacter.id,
          relationshipSeed: 'stranger',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ต่อฉากเดิมแบบสตรีม ให้เห็นจังหวะการตอบและบรรยากาศโดยไม่เรียกผู้ให้บริการจริง',
        }),
      })

      const result = validateLocalChatSmokeStream(events, localModel)
      return `chatId=${result.chatId}, model=${result.modelName}, โทเคน=${result.totalTokens}, deltaChars=${result.replyChars}, event=${events.length}`
    })
  }

  record('POST /chat', 'skip', 'ข้ามการเรียกโมเดลจริง; รัน `bun run api:smoke:live` เมื่อต้องการตรวจจริง')
  record('POST /chat/stream live', 'skip', 'ข้ามการเรียกสตรีมจริง; รัน `bun run api:smoke:live` เมื่อต้องการตรวจจริง')
}

await check('POST /chat/stream', async () => {
  const events = await readStreamEvents('/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      characterId: "' OR 1=1 --",
      message: 'ตรวจ validation ของสตรีมต้องไม่เรียกผู้ให้บริการจริง',
      history: [],
    }),
  })

  const delta = events.find((event): event is Extract<StreamSmokeEvent, { type: 'delta' }> => event.type === 'delta')
  const done = events.find((event): event is Extract<StreamSmokeEvent, { type: 'done' }> => event.type === 'done')
  if (!delta?.content?.includes('รหัสตัวละครไม่ถูกต้อง')) throw new Error('สตรีมไม่คืน validation delta ภาษาไทย')
  if (!done) throw new Error('สตรีมไม่คืน event ปิดท้าย')
  if ((done.usage?.totalTokens ?? 0) !== 0) throw new Error('เส้นทางตรวจ validation ของสตรีมไม่ควรใช้โทเคน')
  if (done.usage?.providerFailure) {
    throw new Error(`เส้นทางตรวจ validation ของสตรีมไม่ควรเรียกผู้ให้บริการ แต่พบ providerFailure: ${done.usage.providerFailure.code}`)
  }
  return `${events.length} event จากสตรีม, เส้นทาง validation ไม่ถูกคิดโทเคน`
})

const activeChats = await runRequired('GET /chats', async () => {
  const payload = await readJson<{ chats?: ChatSummary[] }>('/chats', { headers: authHeaders })
  if (!payload.chats) throw new Error('ยังไม่มี chats array')
  return payload.chats
})

await check('GET /chats?archived=true', async () => {
  const payload = await readJson<{ chats?: ChatSummary[] }>('/chats?archived=true', { headers: authHeaders })
  if (!payload.chats) throw new Error('ยังไม่มี archived chats array')
  return `แชทที่จัดเก็บแล้ว ${payload.chats.length} รายการ`
})

if (activeChats.length > 0) {
  await check('PATCH /chats/:id menu actions', async () => {
    const chat = activeChats[0]
    const originalTitle = chat.title?.trim() || chat.characterName?.trim() || 'API Smoke Chat'
    const smokeTitle = `API smoke menu ${Date.now()}`
    let titleRestored = false
    let chatArchived = false

    try {
      const renamed = await readJson<{ chat?: { id?: string; title?: string | null } }>(`/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title: smokeTitle }),
      })
      if (renamed.chat?.id !== chat.id || renamed.chat.title !== smokeTitle) throw new Error('แก้ชื่อแชทแล้วไม่ถูกบันทึก')

      const restoredTitle = await readJson<{ chat?: { id?: string; title?: string | null } }>(`/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title: originalTitle }),
      })
      if (restoredTitle.chat?.id !== chat.id || restoredTitle.chat.title !== originalTitle) {
        throw new Error('คืนชื่อแชทเดิมไม่สำเร็จ')
      }
      titleRestored = true

      const archived = await readJson<{ ok?: boolean }>(`/chats/${chat.id}/archive`, {
        method: 'PATCH',
        headers: authHeaders,
      })
      if (!archived.ok) throw new Error('archive endpoint คืน ok=false')
      chatArchived = true

      const archivedList = await readJson<{ chats?: ChatSummary[] }>('/chats?archived=true', { headers: authHeaders })
      const archivedChat = archivedList.chats?.find((item) => item.id === chat.id)
      if (!archivedChat?.isArchived) throw new Error('แชทที่จัดเก็บแล้วไม่อยู่ในรายการ archived')

      const restored = await readJson<{ ok?: boolean }>(`/chats/${chat.id}/restore`, {
        method: 'PATCH',
        headers: authHeaders,
      })
      if (!restored.ok) throw new Error('restore endpoint คืน ok=false')
      chatArchived = false

      const activeList = await readJson<{ chats?: ChatSummary[] }>('/chats', { headers: authHeaders })
      if (!activeList.chats?.some((item) => item.id === chat.id && !item.isArchived)) {
        throw new Error('แชทที่กู้คืนแล้วไม่อยู่ในรายการ active')
      }
    } finally {
      if (!titleRestored) {
        await bestEffort('restore chat title after menu smoke', () =>
          readJson(`/chats/${chat.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders },
            body: JSON.stringify({ title: originalTitle }),
          }),
        )
      }
      if (chatArchived) {
        await bestEffort('restore archived chat after menu smoke', () =>
          readJson(`/chats/${chat.id}/restore`, {
            method: 'PATCH',
            headers: authHeaders,
          }),
        )
      }
    }

    return 'rename, archive และ restore ใช้งานได้'
  })

  await check('GET /chats/:id/messages', async () => {
    const payload = await readJson<{ chat?: { id?: string; messages?: unknown[] } }>(`/chats/${activeChats[0].id}/messages`, {
      headers: authHeaders,
    })
    if (payload.chat?.id !== activeChats[0].id) throw new Error('API คืนแชทไม่ตรงกับที่ขอ')
    if (!Array.isArray(payload.chat.messages)) throw new Error('ยังไม่มี messages array')
    return `${payload.chat.messages.length} messages`
  })

  await check('PATCH/GET /chats/:id/world-state', async () => {
    const location = `api-smoke-room-${Date.now()}`
    const patchPayload = await readJson<{
      chatId?: string
      worldState?: { location?: string; sceneNotes?: string[] }
    }>(`/chats/${activeChats[0].id}/world-state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        timeOfDay: 'api smoke evening',
        location,
        weather: 'dry run',
        mood: 'stable QA',
        sceneNotes: ['API smoke ต้องบันทึก world state โดยไม่เปลี่ยนข้อความในแชท'],
      }),
    })
    if (patchPayload.chatId !== activeChats[0].id) throw new Error('world state patch คืนแชทไม่ตรงกับที่ขอ')
    if (patchPayload.worldState?.location !== location) throw new Error('world state location ไม่ถูกบันทึก')
    if (!patchPayload.worldState.sceneNotes?.length) throw new Error('world state notes ไม่ถูกบันทึก')

    const getPayload = await readJson<{
      chatId?: string
      worldState?: { location?: string; mood?: string }
    }>(`/chats/${activeChats[0].id}/world-state`, {
      headers: authHeaders,
    })
    if (getPayload.chatId !== activeChats[0].id) throw new Error('world state get คืนแชทไม่ตรงกับที่ขอ')
    if (getPayload.worldState?.location !== location) throw new Error('world state get ไม่คืน location ที่บันทึกไว้')
    return getPayload.worldState.mood ?? 'world-state-updated'
  })
} else {
  record('GET /chats/:id/messages', 'skip', 'ไม่มี active chat ให้ตรวจ')
  record('PATCH/GET /chats/:id/world-state', 'skip', 'ไม่มี active chat ให้ตรวจ')
}

await check('DELETE /chats/:id validation', async () => {
  const payload = await readExpectedError('/chats/not-a-uuid', {
    method: 'DELETE',
    headers: authHeaders,
  })
  assertExpectedErrorPayload(payload, 400, 'invalid_chat_id', 'รหัสแชทไม่ถูกต้อง')
  return 'ปฏิเสธ chat id ไม่ถูกต้องก่อนลบ'
})

await check('GET /characters/:id/lore', async () => {
  const payload = await readJson<{ loreEntries?: unknown[] }>(`/characters/${primaryCharacter.id}/lore`, {
    headers: authHeaders,
  })
  if (!payload.loreEntries) throw new Error('ยังไม่มี loreEntries array')
  return `${payload.loreEntries.length} lore entries`
})

await check('POST /reports validation', async () => {
  const payload = await readExpectedError('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      targetType: 'CHARACTER',
      characterId: "' OR 1=1 --",
      reason: 'non-mutating report validation smoke',
    }),
  })
  assertExpectedErrorPayload(payload, 400, 'invalid_character_id', 'รหัสตัวละครไม่ถูกต้อง')
  return 'ปฏิเสธ character id ลักษณะ SQL-like ก่อนบันทึก report'
})

await check('PATCH /me/content-settings', async () => {
  const current = await readJson<{ contentSettings?: { isAdult?: boolean; maxRating?: string } }>('/me/content-settings', {
    headers: authHeaders,
  })
  if (!current.contentSettings?.maxRating) throw new Error('ยังไม่มีค่าจัดระดับเนื้อหาปัจจุบัน')

  const payload = await readJson<{ contentSettings?: { isAdult?: boolean; maxRating?: string } }>('/me/content-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      isAdult: Boolean(current.contentSettings.isAdult),
      maxRating: current.contentSettings.maxRating,
    }),
  })
  const nextMaxRating = payload.contentSettings?.maxRating
  if (nextMaxRating !== current.contentSettings.maxRating) {
    throw new Error(`content setting เปลี่ยนโดยไม่คาดคิด: ${nextMaxRating}`)
  }
  return nextMaxRating
})

await check('PUT/GET /creator/draft', async () => {
  const marker = `api-smoke-${Date.now()}`
  await readJson<{ ok: boolean }>('/creator/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      payload: {
        creatorBrief: marker,
        form: {
          name: 'API Smoke Draft',
          tags: 'roleplay, thai, api-smoke',
        },
        updatedAt: Date.now(),
      },
    }),
  })

  const saved = await readJson<{ draft?: { creatorBrief?: string } | null }>('/creator/draft', {
    headers: authHeaders,
  })
  if (saved.draft?.creatorBrief !== marker) throw new Error('creator draft ไม่ถูกบันทึก')

  await readJson<{ ok: boolean }>('/creator/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ payload: null }),
  })

  const cleared = await readJson<{ draft?: unknown | null }>('/creator/draft', {
    headers: authHeaders,
  })
  if (cleared.draft !== null) throw new Error('creator draft ไม่ถูกล้าง')

  return 'บันทึกและล้าง draft สำเร็จ'
})

if (adminHeaders) {
  await check('GET /admin/summary', async () => {
    const payload = await readJson<{ totals?: { users?: number; characters?: number } }>('/admin/summary', {
      headers: adminHeaders,
    })
    if (typeof payload.totals?.users !== 'number') throw new Error('ยังไม่มียอดรวมฝั่งผู้ดูแล')
    return `users=${payload.totals.users}, characters=${payload.totals.characters ?? 0}`
  })

  await check('PATCH /admin/users/:id/tokens validation', async () => {
    const payload = await readExpectedError('/admin/users/not-a-uuid/tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ amount: 1, reason: 'non-mutating smoke validation' }),
    })
    assertExpectedErrorPayload(payload, 400, 'invalid_user_id', 'รหัสผู้ใช้ไม่ถูกต้อง')
    return 'ปฏิเสธ admin wallet user id ไม่ถูกต้องก่อนเปลี่ยนข้อมูล'
  })

  await check('POST /admin/prompt-inspector', async () => {
    const payload = await readJson<{
      snapshot?: {
        prompt?: string
        totals?: { estimatedTokens?: number; sectionCount?: number }
        sections?: Array<{ title?: string }>
        redacted?: boolean
      }
      diff?: { estimatedTokenDelta?: number; changedSections?: unknown[] }
    }>('/admin/prompt-inspector', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({
        characterId: primaryCharacter.id,
        compareWithMessage: 'สวัสดี',
        message: 'ช่วยคงบรรยากาศเดิมและตอบแบบมีรายละเอียดมากขึ้น',
        runtimeNote: 'Smoke runtime note: verify context inspector without calling the live model.',
      }),
    })
    if (!payload.snapshot?.redacted) throw new Error('ตัวตรวจพรอมป์ไม่คืน snapshot ที่ปิดข้อมูลลับ')
    if (!payload.snapshot.prompt?.includes('กฎคุมพรอมป์ของแพลตฟอร์ม')) throw new Error('ยังไม่มีกฎคุมพรอมป์ของแพลตฟอร์ม')
    if (!payload.snapshot.sections?.some((section) => section.title === 'ความจำขณะรัน')) {
      throw new Error('ยังไม่มีส่วนความจำขณะรัน')
    }
    if (!payload.snapshot.totals?.estimatedTokens || !payload.snapshot.totals.sectionCount) {
      throw new Error('ยังไม่มียอดรวมพรอมป์')
    }
    if (!payload.diff || !Array.isArray(payload.diff.changedSections)) throw new Error('ยังไม่มีผลเทียบพรอมป์')
    return `sections=${payload.snapshot.totals.sectionCount}, estimatedTokens=${payload.snapshot.totals.estimatedTokens}`
  })

  await check('GET /admin/evals/local', async () => {
    const payload = await readJson<{
      passed?: boolean
      scenarioCount?: number
      passCount?: number
      failCount?: number
      results?: Array<{ id?: string; passed?: boolean; estimatedTokens?: number }>
    }>('/admin/evals/local', {
      headers: adminHeaders,
    })
    if (!payload.passed) throw new Error(`ตรวจ eval ในเครื่องไม่ผ่าน; failCount=${payload.failCount ?? 'ไม่ทราบ'}`)
    if (!payload.scenarioCount || !payload.results?.length) throw new Error('ยังไม่มีสถานการณ์ eval ในเครื่อง')
    if (!payload.results.some((result) => result.id === 'prompt-injection-defense' && result.passed)) {
      throw new Error('ยังไม่มีผลทดสอบ prompt injection eval')
    }
    return `ผ่าน ${payload.passCount ?? payload.results.length}/${payload.scenarioCount} สถานการณ์`
  })

  await check('GET /admin/reports', async () => {
    const payload = await readJson<{ reports?: unknown[] }>('/admin/reports?limit=5', { headers: adminHeaders })
    if (!payload.reports) throw new Error('ยังไม่มีรายการรายงาน')
    return `รายงาน ${payload.reports.length} รายการ`
  })

  await check('PATCH/POST /admin/reports validation', async () => {
    const patch = await readExpectedError('/admin/reports/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    assertExpectedErrorPayload(patch, 400, 'invalid_report_id', 'รหัสรายงานไม่ถูกต้อง', 'PATCH id ไม่ถูกต้อง')

    const action = await readExpectedError('/admin/reports/not-a-uuid/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ action: 'ARCHIVE_MESSAGE' }),
    })
    assertExpectedErrorPayload(action, 400, 'invalid_report_id', 'รหัสรายงานไม่ถูกต้อง', 'POST action id ไม่ถูกต้อง')

    return 'ปฏิเสธ admin report id ไม่ถูกต้องก่อนเปลี่ยนข้อมูล'
  })

  await check('GET /admin/audit-logs', async () => {
    const payload = await readJson<{ logs?: unknown[] }>('/admin/audit-logs?limit=5', { headers: adminHeaders })
    if (!payload.logs) throw new Error('ยังไม่มีรายการ audit log')
    return `บันทึก audit ${payload.logs.length} รายการ`
  })
} else {
  const status: ApiSmokeStatus = requireAdmin ? 'fail' : 'skip'
  const detail = 'ยังไม่มี SMOKE_ADMIN_API_KEY หรือ ADMIN_API_KEY local'
  record('GET /admin/summary', status, detail)
  record('PATCH /admin/users/:id/tokens validation', status, detail)
  record('POST /admin/prompt-inspector', status, detail)
  record('GET /admin/evals/local', status, detail)
  record('GET /admin/reports', status, detail)
  record('PATCH/POST /admin/reports validation', status, detail)
  record('GET /admin/audit-logs', status, detail)
}

for (const result of results) {
  writeLine(`${formatApiSmokeStatus(result.status)} - ${result.name}: ${result.detail}`)
}

const summary = buildApiSmokeSummary(results, {
  apiBaseUrl,
  live,
  requireLiveImage,
  requireAdmin,
  handoffEvidence,
})

writeLine(
  JSON.stringify(
    summary,
    null,
    2,
  ),
)

const exitCode = summary.ok ? 0 : 1

async function runRequired<T>(name: string, fn: () => Promise<T>) {
  try {
    const value = await fn()
    record(name, 'pass', 'ok')
    return value
  } catch (error) {
    const message = formatApiSmokeCaughtError(error)
    record(name, 'fail', message)
    throw new Error(`${name}: ${message}`)
  }
}

async function bestEffort(name: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (error) {
    writeWarn(`คำเตือน: ทำงานเสริม "${name}" ไม่สำเร็จ: ${formatApiSmokeCaughtError(error)}`)
  }
}

async function readStreamEvents(path: string, init: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  const raw = await response.text()
  if (!response.ok) throw new Error(`${path} ไม่ผ่านด้วยสถานะ ${response.status}: ${formatApiSmokeDiagnostic(raw)}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) throw new Error(`${path} ไม่คืน event stream: ${contentType}`)

  return parseApiSmokeStreamEvents<StreamSmokeEvent>(raw, path)
}

async function readReadyPayload() {
  const response = await fetch(`${apiBaseUrl}/ready`)
  const raw = await response.text()
  const payload = raw ? tryParseJson(raw) : null
  if (!payload || typeof payload !== 'object') {
    throw new Error(`/ready ไม่คืน JSON: ${formatApiSmokeDiagnostic(raw)}`)
  }

  return {
    ok: response.ok,
    status: response.status,
    payload: payload as { ok: boolean; readiness?: { status?: string; failures?: string[] } },
  }
}

async function readExpectedError(path: string, init: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  const raw = await response.text()
  const parsed = raw ? tryParseJson(raw) : null
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`${path} ไม่คืน JSON ของ error ที่คาดไว้: ${formatApiSmokeDiagnostic(raw)}`)
  }

  if (response.ok) throw new Error(`${path} สำเร็จทั้งที่ควรเป็น error`)

  const payload = parsed as { error?: string; message?: string }
  assertMachineReadableErrorCode(payload, `${path} error ที่คาดไว้`)

  return {
    status: response.status,
    payload,
  }
}

function assertExpectedErrorPayload(
  result: { status: number; payload: { error?: string; message?: string } },
  expectedStatus: number,
  expectedError: string,
  expectedMessage: string,
  label = 'error ที่คาดไว้',
) {
  if (result.status !== expectedStatus || result.payload.error !== expectedError) {
    throw new Error(`${label} ควรได้ ${expectedError} ${expectedStatus} แต่ได้สถานะ ${result.status} ${result.payload.error ?? 'ไม่ทราบ'}`)
  }
  if (!result.payload.message?.includes(expectedMessage)) {
    throw new Error(`${label} ควรได้ข้อความไทย "${expectedMessage}" แต่ได้ ${result.payload.message ?? 'ไม่มีข้อความ'}`)
  }
}

async function loadAdminKey() {
  if (process.env.SMOKE_ADMIN_API_KEY) return process.env.SMOKE_ADMIN_API_KEY
  if (process.env.ADMIN_API_KEY) return process.env.ADMIN_API_KEY

  try {
    const envPath = join(import.meta.dir, '..', 'apps', 'backend', '.env')
    const envFile = await readFile(envPath, 'utf8')
    const line = envFile
      .split(/\r?\n/)
      .find((item) => item.trim().startsWith('ADMIN_API_KEY='))
    return line?.replace(/^ADMIN_API_KEY=/, '').trim() || null
  } catch {
    return null
  }
}

return exitCode
}

if (import.meta.main) process.exit(await runApiSmoke())
