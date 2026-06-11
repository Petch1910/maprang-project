import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import {
  apiBaseUrl,
  formatDiagnosticText,
  formatUnknownDiagnosticText,
  isLocalSmokeTarget,
  readJson,
  smokeAuthHeaders,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'

export type HealthPayload = {
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  security: { avatarStorage: 'local' | 'supabase' }
  model?: {
    minRoleplayReplyChars?: number
    chatProvider?: {
      activeRuntimeProvider?: string
      forcedLocal?: boolean
      localModel?: string
    }
  }
}

export type SmokeCharacter = { id: string; name: string; tags: string[] }

export type LocalUsageSummaryPayload = {
  user?: { tokenBalance?: number }
  usage?: {
    totalCost?: string
    byModel?: unknown[]
    daily?: unknown[]
    estimate?: { averageTokensPerRequest?: number; estimatedRemainingRequests?: number | null }
  }
  wallet?: { transactions?: unknown[] }
}

export type LocalChatSmokePayload = {
  reply?: string
  chatId?: string | null
  usage?: {
    totalTokens?: number
    modelName?: string
    providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
  }
}

export type LocalChatSmokeStreamEvent =
  | { type: 'delta'; content?: string }
  | { type: 'done'; chatId?: string | null; usage?: LocalChatSmokePayload['usage'] }
  | { type: 'error'; message?: string }

export type AvatarUploadPayload = {
  url: string
  filename: string
  provider: 'local' | 'supabase'
  access: 'local' | 'public' | 'signed'
  contentType: string
}

export type LocalSmokeJsonReader = <T>(path: string, init?: RequestInit) => Promise<T>
export type LocalSmokeStreamReader = (path: string, init?: RequestInit) => Promise<LocalChatSmokeStreamEvent[]>

export type LocalSmokeRunnerOptions = {
  apiBaseUrl?: string
  isLocalTarget?: boolean
  readJson?: LocalSmokeJsonReader
  readStreamEvents?: LocalSmokeStreamReader
  authHeaders?: () => Record<string, string>
  cleanupLocalUpload?: (filename: string) => Promise<void>
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function pickSmokeCharacter(characters: SmokeCharacter[] = []) {
  return (
    characters.find((character) => character.name.includes('MIKA')) ??
    characters.find((character) => character.name === 'Maprang') ??
    characters[0] ??
    null
  )
}

export function validateAvatarUpload(upload: AvatarUploadPayload, baseUrl: string) {
  if (upload.contentType !== 'image/png') throw new Error('อัปโหลดรูปตัวละครคืน content type ไม่ถูกต้อง')
  if (!upload.access) throw new Error('ผลอัปโหลดรูปตัวละครไม่ระบุ storage access')
  if (!upload.url.startsWith(`${baseUrl}/uploads/avatars/`)) {
    throw new Error(`อัปโหลดรูปตัวละครคืน URL ที่ไม่ได้มาจากระบบหลังบ้าน: ${upload.url}`)
  }
}

export function hasLocalChatRuntime(health: HealthPayload) {
  const provider = health.model?.chatProvider
  return provider?.activeRuntimeProvider === 'local' || provider?.forcedLocal === true
}

export function activeLocalChatModel(health: HealthPayload) {
  return health.model?.chatProvider?.localModel || 'local/mock-roleplay'
}

export function localRoleplayReplyMinimum(health: HealthPayload) {
  return Math.max(420, health.model?.minRoleplayReplyChars ?? 420)
}

export function validateLocalUsageSummary(payload: LocalUsageSummaryPayload) {
  if (typeof payload.user?.tokenBalance !== 'number') throw new Error('local wallet QA ยังไม่มี tokenBalance')
  if (typeof payload.usage?.totalCost !== 'string') throw new Error('local wallet QA ยังไม่มี totalCost')
  if (!Array.isArray(payload.usage.byModel)) throw new Error('local wallet QA ยังไม่มี usage.byModel')
  if (!Array.isArray(payload.usage.daily) || payload.usage.daily.length !== 7) {
    throw new Error('local wallet QA ต้องคืนกราฟ usage 7 วัน')
  }
  if (typeof payload.usage.estimate?.averageTokensPerRequest !== 'number') {
    throw new Error('local wallet QA ยังไม่มี usage estimate')
  }
  if (payload.usage.estimate.estimatedRemainingRequests !== null && typeof payload.usage.estimate.estimatedRemainingRequests !== 'number') {
    throw new Error('local wallet QA estimatedRemainingRequests ต้องเป็นตัวเลขหรือ null')
  }
  if (payload.wallet?.transactions !== undefined && !Array.isArray(payload.wallet.transactions)) {
    throw new Error('local wallet QA รายการกระเป๋าต้องเป็น array')
  }

  return {
    tokenBalance: payload.user.tokenBalance,
    totalCost: payload.usage.totalCost,
    usageModels: payload.usage.byModel.length,
    usageDailyDays: payload.usage.daily.length,
    averageTokensPerRequest: payload.usage.estimate.averageTokensPerRequest,
    estimatedRemainingRequests: payload.usage.estimate.estimatedRemainingRequests ?? null,
    walletTransactions: payload.wallet?.transactions?.length ?? 0,
  }
}

export function validateLocalChatSmoke(
  payload: LocalChatSmokePayload,
  expectedModel: string,
  minRoleplayReplyChars: number,
) {
  if (payload.usage?.providerFailure) {
    throw new Error(`local chat QA ไม่ควรคืน providerFailure: ${payload.usage.providerFailure.code ?? 'unknown'}`)
  }
  if (!payload.chatId) throw new Error('local chat QA ไม่ได้สร้าง chat id')
  if (!payload.reply) throw new Error('local chat QA ไม่คืนคำตอบ')
  if (payload.reply.length < minRoleplayReplyChars) {
    throw new Error(`local chat QA ตอบสั้นเกินไป ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร`)
  }
  if ((payload.usage?.totalTokens ?? -1) !== 0) throw new Error('local chat QA ต้องไม่คิดโทเคน')
  if (payload.usage?.modelName !== expectedModel) {
    throw new Error(`local chat QA ต้องคืน modelName=${expectedModel} แต่ได้ ${payload.usage?.modelName ?? 'missing'}`)
  }

  return {
    chatId: payload.chatId,
    replyChars: payload.reply.length,
    totalTokens: payload.usage?.totalTokens ?? 0,
    modelName: payload.usage?.modelName ?? expectedModel,
  }
}

export function parseLocalSmokeStreamEvents(raw: string, path = '/chat/stream') {
  const events: LocalChatSmokeStreamEvent[] = []

  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice('data:'.length).trim()
    if (!payload || payload === '[DONE]') continue

    try {
      events.push(JSON.parse(payload) as LocalChatSmokeStreamEvent)
    } catch {
      throw new Error(`${path} stream event บรรทัด ${index + 1} ไม่ใช่ JSON ที่ถูกต้อง`)
    }
  }

  if (events.length === 0) throw new Error(`${path} ไม่คืน stream event`)
  return events
}

export async function readLocalSmokeStreamEvents(baseUrl: string, path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init)
  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`${path} ไม่ผ่านด้วยสถานะ ${response.status}: ${formatDiagnosticText(raw, 300) || response.statusText}`)
  }
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) throw new Error(`${path} ไม่คืน event stream: ${contentType}`)
  return parseLocalSmokeStreamEvents(raw, path)
}

export function validateLocalChatStreamSmoke(
  events: LocalChatSmokeStreamEvent[],
  expectedModel: string,
  minRoleplayReplyChars: number,
) {
  const reply = events
    .filter((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'delta' }> => event.type === 'delta')
    .map((event) => event.content ?? '')
    .join('')
    .trim()
  const error = events.find((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'error' }> => event.type === 'error')
  const done = events.find((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'done' }> => event.type === 'done')

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
  if (reply.length < minRoleplayReplyChars) {
    throw new Error(`local chat stream ตอบสั้นเกินไป ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร`)
  }

  return {
    chatId: done.chatId,
    replyChars: reply.length,
    totalTokens: done.usage?.totalTokens ?? 0,
    modelName: done.usage?.modelName ?? expectedModel,
    eventCount: events.length,
  }
}

export function buildLocalSmokeSummary(input: {
  apiBaseUrl: string
  health: HealthPayload
  usage: ReturnType<typeof validateLocalUsageSummary>
  smokeCharacter: SmokeCharacter
  loreCount: number
  previewTurns: number
  chat?: ReturnType<typeof validateLocalChatSmoke> | null
  stream?: ReturnType<typeof validateLocalChatStreamSmoke> | null
  upload: AvatarUploadPayload
}) {
  return {
    ok: true,
    apiBaseUrl: input.apiBaseUrl,
    databaseConnected: input.health.checks.databaseConnected,
    openRouterConfigured: input.health.checks.openRouterConfigured,
    avatarStorage: input.health.security.avatarStorage,
    tokenBalance: input.usage.tokenBalance,
    usageTotalCost: input.usage.totalCost,
    usageDailyDays: input.usage.usageDailyDays,
    usageModels: input.usage.usageModels,
    walletTransactions: input.usage.walletTransactions,
    character: input.smokeCharacter.name,
    tags: input.smokeCharacter.tags,
    loreCount: input.loreCount,
    previewTurns: input.previewTurns,
    chatId: input.chat?.chatId ?? null,
    chatModel: input.chat?.modelName ?? null,
    chatReplyChars: input.chat?.replyChars ?? 0,
    chatTokens: input.chat?.totalTokens ?? 0,
    streamChatId: input.stream?.chatId ?? null,
    streamModel: input.stream?.modelName ?? null,
    streamReplyChars: input.stream?.replyChars ?? 0,
    streamTokens: input.stream?.totalTokens ?? 0,
    streamEvents: input.stream?.eventCount ?? 0,
    uploadProvider: input.upload.provider,
    uploadAccess: input.upload.access,
  }
}

export async function cleanupLocalAvatarUpload(filename: string) {
  await unlink(join(import.meta.dir, '..', 'apps', 'backend', 'uploads', 'avatars', filename)).catch(() => {})
}

export function formatLocalSmokeCaughtError(error: unknown) {
  return formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
}

export async function runLocalSmoke(options: LocalSmokeRunnerOptions = {}) {
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const currentIsLocalTarget = options.isLocalTarget ?? isLocalSmokeTarget
  const jsonReader = options.readJson ?? readJson
  const streamReader = options.readStreamEvents ?? ((path, init) => readLocalSmokeStreamEvents(currentApiBaseUrl, path, init))
  const authHeaders = options.authHeaders ?? smokeAuthHeaders
  const cleanupUpload = options.cleanupLocalUpload ?? cleanupLocalAvatarUpload
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  try {
    const root = await jsonReader<RootIdentityPayload>('/')
    validateBackendRootIdentity(root)

    const health = await jsonReader<HealthPayload>('/health')

    if (!health.ok || !health.checks.databaseConnected) {
      throw new Error('ตรวจสุขภาพระบบหลังบ้านไม่ผ่าน')
    }

    const usage = validateLocalUsageSummary(
      await jsonReader<LocalUsageSummaryPayload>('/me/usage', {
        headers: authHeaders(),
      }),
    )

    const characters = await jsonReader<{
      characters?: SmokeCharacter[]
    }>('/characters?view=admin&limit=10', {
      headers: authHeaders(),
    })

    const smokeCharacter = pickSmokeCharacter(characters.characters)
    if (!smokeCharacter) throw new Error('ไม่พบตัวละคร seed สำหรับการตรวจ smoke')

    const lore = await jsonReader<{ loreEntries?: Array<{ id: string; keyword: string }> }>(`/characters/${smokeCharacter.id}/lore`)

    const preview = await jsonReader<{ preview?: { turns?: unknown[] } }>('/relationship/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['friendly', 'slow-burn', 'trust-building'],
        messages: ['hello', 'thank you for listening'],
      }),
    })

    if (!preview.preview?.turns?.length) throw new Error('ตัวอย่างความสัมพันธ์ไม่คืน turn ทดสอบ')

    let chat: ReturnType<typeof validateLocalChatSmoke> | null = null
    let stream: ReturnType<typeof validateLocalChatStreamSmoke> | null = null
    if (hasLocalChatRuntime(health)) {
      const expectedModel = activeLocalChatModel(health)
      const minRoleplayReplyChars = localRoleplayReplyMinimum(health)
      const chatPayload = await jsonReader<LocalChatSmokePayload>('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          characterId: smokeCharacter.id,
          relationshipSeed: 'stranger',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ฉันเข้ามาในคาเฟ่ช่วงฝนตกแล้วทักเธอด้วยน้ำเสียงเกรงใจ ช่วยตอบเป็นฉากโรลเพลย์ภาษาไทยที่มีบรรยากาศ ความรู้สึก การกระทำ และเหลือพื้นที่ให้ฉันตอบต่อ',
        }),
      })
      chat = validateLocalChatSmoke(chatPayload, expectedModel, minRoleplayReplyChars)

      const streamEvents = await streamReader('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          chatId: chat.chatId,
          characterId: smokeCharacter.id,
          relationshipSeed: 'stranger',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ต่อฉากเดิมแบบสตรีม ให้เห็นจังหวะการตอบและบรรยากาศ โดยไม่เรียกผู้ให้บริการจริง',
        }),
      })
      stream = validateLocalChatStreamSmoke(streamEvents, expectedModel, minRoleplayReplyChars)
    }

    const form = new FormData()
    form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'qa.png', { type: 'image/png' }))

    const upload = await jsonReader<AvatarUploadPayload>('/uploads/avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })

    validateAvatarUpload(upload, currentApiBaseUrl)

    if (upload.provider === 'local' && currentIsLocalTarget) {
      await cleanupUpload(upload.filename)
    }

    writeLine(
      JSON.stringify(
        buildLocalSmokeSummary({
          apiBaseUrl: currentApiBaseUrl,
          health,
          usage,
          smokeCharacter,
          loreCount: lore.loreEntries?.length ?? 0,
          previewTurns: preview.preview.turns.length,
          chat,
          stream,
          upload,
        }),
        null,
        2,
      ),
    )
    return 0
  } catch (error) {
    const message = formatLocalSmokeCaughtError(error)
    writeError(`ตรวจระบบ local ไม่ผ่าน: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runLocalSmoke())
