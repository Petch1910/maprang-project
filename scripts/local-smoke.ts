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

export type LocalContentSettingsPayload = {
  contentSettings?: {
    isAdult?: boolean
    maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18' | string
  }
}

export type LocalPersonaPayload = {
  persona?: {
    persona?: string
    updatedAt?: string | null
    maxChars?: number
  }
}

export type LocalAdminReportsPayload = {
  reports?: unknown[]
}

export type LocalAdminAuditLogsPayload = {
  logs?: unknown[]
}

export type LocalSavedChatsPayload = {
  chats?: Array<{
    id?: string
    title?: string | null
    isArchived?: boolean
  }>
}

export type LocalSavedChatMessagesPayload = {
  chat?: {
    id?: string
    messages?: unknown[]
    messageWindow?: {
      limit?: number
      mayHaveMoreBefore?: boolean
    }
  }
}

export type LocalWorldStatePayload = {
  chatId?: string
  worldState?: {
    timeOfDay?: string
    location?: string
    weather?: string
    mood?: string
    sceneNotes?: unknown[]
  }
}

export type LocalCreatorDraftPayload = {
  draft?: {
    name?: string
    greeting?: string
    tags?: string
  }
  image?: {
    url?: string
    provider?: string
    note?: string
  }
  source?: string
  warnings?: unknown[]
}

export type LocalCreatorPreviewPayload = {
  preview?: {
    reply?: string
    source?: string
    modelName?: string
    usage?: {
      promptTokens?: number
      completionTokens?: number
      totalTokens?: number
    }
    prompt?: {
      system?: string
      user?: string
      estimatedTokens?: number
    }
    warnings?: unknown[]
  }
}

export type LocalChatSmokePayload = {
  reply?: string
  chatId?: string | null
  memory?: LocalRuntimeMemoryPayload
  usage?: {
    totalTokens?: number
    modelName?: string
    providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
  }
}

export type LocalChatSmokeStreamEvent =
  | { type: 'delta'; content?: string }
  | { type: 'done'; chatId?: string | null; usage?: LocalChatSmokePayload['usage']; memory?: LocalRuntimeMemoryPayload }
  | { type: 'error'; message?: string }

export type LocalRuntimeMemoryPayload = {
  sceneState?: {
    mode?: string
    pendingEvents?: unknown[]
    activeScene?: unknown
    sceneOutcomes?: unknown[]
  }
  relationshipState?: {
    status?: string
    events?: unknown[]
  }
}

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

export function validateLocalContentSettings(payload: LocalContentSettingsPayload) {
  const settings = payload.contentSettings
  if (!settings) throw new Error('local profile QA ยังไม่มี contentSettings')
  if (typeof settings.isAdult !== 'boolean') throw new Error('local profile QA contentSettings.isAdult ต้องเป็น boolean')
  if (!settings.maxRating) throw new Error('local profile QA ยังไม่มี maxRating')
  const allowedRatings = new Set(['general', 'teen_romance', 'mature_18', 'restricted_18'])
  if (!allowedRatings.has(settings.maxRating)) throw new Error(`local profile QA maxRating ไม่ถูกต้อง: ${settings.maxRating}`)

  return {
    isAdult: settings.isAdult,
    maxRating: settings.maxRating,
  }
}

export function validateLocalPersona(payload: LocalPersonaPayload) {
  const persona = payload.persona
  if (!persona) throw new Error('local profile QA ยังไม่มี persona')
  if (typeof persona.persona !== 'string') throw new Error('local profile QA persona ต้องเป็น string')
  if (persona.updatedAt !== null && persona.updatedAt !== undefined && typeof persona.updatedAt !== 'string') {
    throw new Error('local profile QA persona.updatedAt ต้องเป็น string หรือ null')
  }
  if (typeof persona.maxChars !== 'number') throw new Error('local profile QA persona.maxChars ต้องเป็น number')
  if (persona.maxChars < 1) throw new Error('local profile QA persona.maxChars ต้องมากกว่า 0')
  if (persona.persona.length > persona.maxChars) throw new Error('local profile QA persona ยาวเกิน maxChars')

  return {
    personaChars: persona.persona.length,
    personaMaxChars: persona.maxChars,
    personaUpdated: Boolean(persona.updatedAt),
  }
}

export function validateLocalAdminModerationSnapshot(reportsPayload: LocalAdminReportsPayload, auditPayload: LocalAdminAuditLogsPayload) {
  if (!Array.isArray(reportsPayload.reports)) throw new Error('local moderation QA ยังไม่มี reports array')
  if (!Array.isArray(auditPayload.logs)) throw new Error('local moderation QA ยังไม่มี audit logs array')

  return {
    reports: reportsPayload.reports.length,
    auditLogs: auditPayload.logs.length,
  }
}

export function validateLocalSavedChats(payload: LocalSavedChatsPayload, expectedChatId?: string | null) {
  if (!Array.isArray(payload.chats)) throw new Error('local saved chats QA ยังไม่มี chats array')
  if (expectedChatId && !payload.chats.some((chat) => chat.id === expectedChatId)) {
    throw new Error('local saved chats QA ไม่พบแชทที่เพิ่งสร้างในรายการแชท')
  }

  return {
    chats: payload.chats.length,
    foundExpectedChat: expectedChatId ? payload.chats.some((chat) => chat.id === expectedChatId) : false,
  }
}

export function validateLocalSavedChatMessages(payload: LocalSavedChatMessagesPayload, expectedChatId: string, expectedLimit: number) {
  const chat = payload.chat
  if (!chat) throw new Error('local saved chat messages QA ยังไม่มี chat')
  if (chat.id !== expectedChatId) throw new Error('local saved chat messages QA คืน chat id ไม่ตรงกับที่ขอ')
  if (!Array.isArray(chat.messages)) throw new Error('local saved chat messages QA ยังไม่มี messages array')
  if (!chat.messageWindow) throw new Error('local saved chat messages QA ยังไม่มี messageWindow')
  if (chat.messageWindow.limit !== expectedLimit) throw new Error('local saved chat messages QA messageWindow limit ไม่ตรงกับที่ขอ')
  if (typeof chat.messageWindow.mayHaveMoreBefore !== 'boolean') {
    throw new Error('local saved chat messages QA ยังไม่มี mayHaveMoreBefore')
  }
  if (chat.messages.length > expectedLimit) throw new Error('local saved chat messages QA messages เกิน window limit')

  return {
    messages: chat.messages.length,
    messageWindowLimit: chat.messageWindow.limit,
    mayHaveMoreBefore: chat.messageWindow.mayHaveMoreBefore,
  }
}

export function validateLocalWorldState(payload: LocalWorldStatePayload, expectedChatId: string, expectedLocation: string) {
  if (payload.chatId !== expectedChatId) throw new Error('local world state QA คืน chat id ไม่ตรงกับที่ขอ')
  if (!payload.worldState) throw new Error('local world state QA ยังไม่มี worldState')
  if (payload.worldState.location !== expectedLocation) throw new Error('local world state QA location ไม่ตรงกับที่บันทึก')
  if (!payload.worldState.mood) throw new Error('local world state QA ยังไม่มี mood')
  if (!Array.isArray(payload.worldState.sceneNotes)) throw new Error('local world state QA sceneNotes ต้องเป็น array')

  return {
    location: payload.worldState.location,
    mood: payload.worldState.mood,
    sceneNotes: payload.worldState.sceneNotes.length,
  }
}

export function validateLocalCreatorDraft(payload: LocalCreatorDraftPayload) {
  if (!payload.draft?.name) throw new Error('local creator QA draft ยังไม่มีชื่อ')
  if (!payload.draft.greeting) throw new Error('local creator QA draft ยังไม่มีข้อความทักทาย')
  if (!payload.draft.tags) throw new Error('local creator QA draft ยังไม่มีแท็ก')
  if (!payload.image?.url) throw new Error('local creator QA ยังไม่มีรูปตัวอย่าง')
  if (payload.image.provider !== 'placeholder') throw new Error(`local creator QA ต้องใช้ภาพ placeholder แต่ได้ ${payload.image.provider ?? 'missing'}`)
  if (payload.source !== 'fallback') throw new Error(`local creator QA ต้องใช้ fallback source แต่ได้ ${payload.source ?? 'missing'}`)
  if (!Array.isArray(payload.warnings)) throw new Error('local creator QA warnings ต้องเป็น array')

  return {
    draftName: payload.draft.name,
    draftGreetingChars: payload.draft.greeting.length,
    draftTagChars: payload.draft.tags.length,
    imageProvider: payload.image.provider,
    source: payload.source,
    warnings: payload.warnings.length,
  }
}

export function validateLocalCreatorPreview(payload: LocalCreatorPreviewPayload) {
  const preview = payload.preview
  if (!preview) throw new Error('local creator preview QA ยังไม่มี preview')
  if (!preview.reply) throw new Error('local creator preview QA ยังไม่มีคำตอบลองบท')
  if (preview.reply.length < 80) throw new Error('local creator preview QA คำตอบลองบทสั้นเกินไป')
  if (preview.source !== 'local') throw new Error(`local creator preview QA ต้องใช้ local source แต่ได้ ${preview.source ?? 'missing'}`)
  if (preview.modelName !== 'local/preview') {
    throw new Error(`local creator preview QA ต้องคืน modelName=local/preview แต่ได้ ${preview.modelName ?? 'missing'}`)
  }
  if (typeof preview.usage?.promptTokens !== 'number') throw new Error('local creator preview QA ยังไม่มี promptTokens')
  if (typeof preview.usage.completionTokens !== 'number') throw new Error('local creator preview QA ยังไม่มี completionTokens')
  if (typeof preview.usage.totalTokens !== 'number') throw new Error('local creator preview QA ยังไม่มี totalTokens')
  if (preview.usage.totalTokens <= 0) throw new Error('local creator preview QA totalTokens ต้องมากกว่า 0 สำหรับตัวประมาณค่า')
  if (typeof preview.prompt?.system !== 'string' || !preview.prompt.system.trim()) throw new Error('local creator preview QA ยังไม่มี system prompt')
  if (typeof preview.prompt.user !== 'string' || !preview.prompt.user.trim()) throw new Error('local creator preview QA ยังไม่มี user prompt')
  if (typeof preview.prompt.estimatedTokens !== 'number') throw new Error('local creator preview QA ยังไม่มี estimatedTokens')
  if (!Array.isArray(preview.warnings)) throw new Error('local creator preview QA warnings ต้องเป็น array')

  return {
    replyChars: preview.reply.length,
    source: preview.source,
    modelName: preview.modelName,
    promptTokens: preview.usage.promptTokens,
    completionTokens: preview.usage.completionTokens,
    totalTokens: preview.usage.totalTokens,
    estimatedTokens: preview.prompt.estimatedTokens,
    warnings: preview.warnings.length,
  }
}

export function validateLocalRuntimeSceneState(memory: LocalRuntimeMemoryPayload | undefined, expectedMinimumPendingEvents = 0) {
  if (!memory?.sceneState) throw new Error('local runtime QA ยังไม่มี sceneState')
  if (memory.sceneState.mode !== 'sandbox' && memory.sceneState.mode !== 'scene') {
    throw new Error(`local runtime QA sceneState.mode ไม่ถูกต้อง: ${memory.sceneState.mode ?? 'missing'}`)
  }
  if (!Array.isArray(memory.sceneState.pendingEvents)) throw new Error('local runtime QA pendingEvents ต้องเป็น array')
  if (memory.sceneState.pendingEvents.length < expectedMinimumPendingEvents) {
    throw new Error(`local runtime QA pendingEvents น้อยกว่า ${expectedMinimumPendingEvents}`)
  }
  if (memory.sceneState.activeScene !== null && typeof memory.sceneState.activeScene !== 'object') {
    throw new Error('local runtime QA activeScene ต้องเป็น object หรือ null')
  }
  if (memory.sceneState.sceneOutcomes !== undefined && !Array.isArray(memory.sceneState.sceneOutcomes)) {
    throw new Error('local runtime QA sceneOutcomes ต้องเป็น array')
  }
  if (!memory.relationshipState) throw new Error('local runtime QA ยังไม่มี relationshipState')
  if (!memory.relationshipState.status) throw new Error('local runtime QA relationshipState ยังไม่มี status')
  if (!Array.isArray(memory.relationshipState.events)) throw new Error('local runtime QA relationship events ต้องเป็น array')

  return {
    sceneMode: memory.sceneState.mode,
    pendingEvents: memory.sceneState.pendingEvents.length,
    relationshipStatus: memory.relationshipState.status,
    relationshipEvents: memory.relationshipState.events.length,
  }
}

export function validateLocalChatSmoke(
  payload: LocalChatSmokePayload,
  expectedModel: string,
  minRoleplayReplyChars: number,
  expectedMinimumPendingEvents = 0,
) {
  if (payload.usage?.providerFailure) {
    throw new Error(`local roleplay QA ไม่ควรคืน providerFailure: ${payload.usage.providerFailure.code ?? 'unknown'}`)
  }
  if (!payload.chatId) throw new Error('local roleplay QA ไม่ได้สร้าง chat id')
  if (!payload.reply) throw new Error('local roleplay QA ไม่คืนคำตอบ')
  if (payload.reply.length < minRoleplayReplyChars) {
    throw new Error(`local roleplay QA ตอบสั้นเกินไป ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร`)
  }
  if ((payload.usage?.totalTokens ?? -1) !== 0) throw new Error('local roleplay QA ต้องไม่คิดโทเคน')
  if (payload.usage?.modelName !== expectedModel) {
    throw new Error(`local roleplay QA ต้องคืน modelName=${expectedModel} แต่ได้ ${payload.usage?.modelName ?? 'missing'}`)
  }
  const runtime = validateLocalRuntimeSceneState(payload.memory, expectedMinimumPendingEvents)

  return {
    chatId: payload.chatId,
    replyChars: payload.reply.length,
    totalTokens: payload.usage?.totalTokens ?? 0,
    modelName: payload.usage?.modelName ?? expectedModel,
    ...runtime,
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
  expectedMinimumPendingEvents = 0,
) {
  const reply = events
    .filter((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'delta' }> => event.type === 'delta')
    .map((event) => event.content ?? '')
    .join('')
    .trim()
  const error = events.find((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'error' }> => event.type === 'error')
  const done = events.find((event): event is Extract<LocalChatSmokeStreamEvent, { type: 'done' }> => event.type === 'done')

  if (error?.message) throw new Error(`local roleplay stream คืน error: ${error.message}`)
  if (!done) throw new Error('local roleplay stream ไม่คืน event ปิดท้าย')
  if (!done.chatId) throw new Error('local roleplay stream ไม่คืน chat id')
  if (done.usage?.providerFailure) {
    throw new Error(`local roleplay stream ไม่ควรคืน providerFailure: ${done.usage.providerFailure.code ?? 'unknown'}`)
  }
  if ((done.usage?.totalTokens ?? -1) !== 0) throw new Error('local roleplay stream ต้องไม่คิดโทเคน')
  if (done.usage?.modelName !== expectedModel) {
    throw new Error(`local roleplay stream ต้องคืน modelName=${expectedModel} แต่ได้ ${done.usage?.modelName ?? 'missing'}`)
  }
  if (reply.length < minRoleplayReplyChars) {
    throw new Error(`local roleplay stream ตอบสั้นเกินไป ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร`)
  }
  const runtime = validateLocalRuntimeSceneState(done.memory, expectedMinimumPendingEvents)

  return {
    chatId: done.chatId,
    replyChars: reply.length,
    totalTokens: done.usage?.totalTokens ?? 0,
    modelName: done.usage?.modelName ?? expectedModel,
    eventCount: events.length,
    ...runtime,
  }
}

export function buildLocalSmokeSummary(input: {
  apiBaseUrl: string
  health: HealthPayload
  usage: ReturnType<typeof validateLocalUsageSummary>
  contentSettings: ReturnType<typeof validateLocalContentSettings>
  persona: ReturnType<typeof validateLocalPersona>
  moderation?: ReturnType<typeof validateLocalAdminModerationSnapshot> | null
  moderationSkippedReason?: string | null
  creatorDraft: ReturnType<typeof validateLocalCreatorDraft>
  creatorPreview: ReturnType<typeof validateLocalCreatorPreview>
  smokeCharacter: SmokeCharacter
  loreCount: number
  previewTurns: number
  chat?: ReturnType<typeof validateLocalChatSmoke> | null
  stream?: ReturnType<typeof validateLocalChatStreamSmoke> | null
  savedChats: ReturnType<typeof validateLocalSavedChats>
  savedMessages?: ReturnType<typeof validateLocalSavedChatMessages> | null
  worldState?: ReturnType<typeof validateLocalWorldState> | null
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
    contentMaxRating: input.contentSettings.maxRating,
    contentIsAdult: input.contentSettings.isAdult,
    personaChars: input.persona.personaChars,
    personaMaxChars: input.persona.personaMaxChars,
    personaUpdated: input.persona.personaUpdated,
    moderationReports: input.moderation?.reports ?? 0,
    moderationAuditLogs: input.moderation?.auditLogs ?? 0,
    moderationSkippedReason: input.moderationSkippedReason ?? null,
    creatorDraftName: input.creatorDraft.draftName,
    creatorDraftGreetingChars: input.creatorDraft.draftGreetingChars,
    creatorDraftImageProvider: input.creatorDraft.imageProvider,
    creatorDraftSource: input.creatorDraft.source,
    creatorDraftWarnings: input.creatorDraft.warnings,
    creatorPreviewReplyChars: input.creatorPreview.replyChars,
    creatorPreviewModel: input.creatorPreview.modelName,
    creatorPreviewSource: input.creatorPreview.source,
    creatorPreviewTokens: input.creatorPreview.totalTokens,
    creatorPreviewWarnings: input.creatorPreview.warnings,
    character: input.smokeCharacter.name,
    tags: input.smokeCharacter.tags,
    loreCount: input.loreCount,
    previewTurns: input.previewTurns,
    chatId: input.chat?.chatId ?? null,
    chatModel: input.chat?.modelName ?? null,
    chatReplyChars: input.chat?.replyChars ?? 0,
    chatTokens: input.chat?.totalTokens ?? 0,
    chatSceneMode: input.chat?.sceneMode ?? null,
    chatPendingEvents: input.chat?.pendingEvents ?? 0,
    chatRelationshipStatus: input.chat?.relationshipStatus ?? null,
    chatRelationshipEvents: input.chat?.relationshipEvents ?? 0,
    streamChatId: input.stream?.chatId ?? null,
    streamModel: input.stream?.modelName ?? null,
    streamReplyChars: input.stream?.replyChars ?? 0,
    streamTokens: input.stream?.totalTokens ?? 0,
    streamEvents: input.stream?.eventCount ?? 0,
    streamPendingEvents: input.stream?.pendingEvents ?? 0,
    savedChats: input.savedChats.chats,
    savedChatFound: input.savedChats.foundExpectedChat,
    savedChatMessages: input.savedMessages?.messages ?? 0,
    savedChatMessageWindowLimit: input.savedMessages?.messageWindowLimit ?? null,
    savedChatMayHaveMoreBefore: input.savedMessages?.mayHaveMoreBefore ?? null,
    worldStateLocation: input.worldState?.location ?? null,
    worldStateMood: input.worldState?.mood ?? null,
    worldStateSceneNotes: input.worldState?.sceneNotes ?? 0,
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
    const contentSettings = validateLocalContentSettings(
      await jsonReader<LocalContentSettingsPayload>('/me/content-settings', {
        headers: authHeaders(),
      }),
    )
    const persona = validateLocalPersona(
      await jsonReader<LocalPersonaPayload>('/me/persona', {
        headers: authHeaders(),
      }),
    )
    const currentAuthHeaders = authHeaders()
    let moderation: ReturnType<typeof validateLocalAdminModerationSnapshot> | null = null
    let moderationSkippedReason: string | null = 'missing-admin-smoke-key'
    if (currentAuthHeaders['x-admin-key']) {
      moderation = validateLocalAdminModerationSnapshot(
        await jsonReader<LocalAdminReportsPayload>('/admin/reports?limit=5', {
          headers: currentAuthHeaders,
        }),
        await jsonReader<LocalAdminAuditLogsPayload>('/admin/audit-logs?limit=5', {
          headers: currentAuthHeaders,
        }),
      )
      moderationSkippedReason = null
    }
    const creatorDraft = validateLocalCreatorDraft(
      await jsonReader<LocalCreatorDraftPayload>('/creator/ai-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: 'สร้างตัวละครโรลเพลย์ภาษาไทยสำหรับตรวจ local smoke ให้เล่นได้ทันทีและมีบุคลิกชัด',
          imagePrompt: 'original Thai roleplay character portrait, cinematic light, no text, no watermark',
          imageOnly: true,
          skipImageProvider: true,
          current: {
            tags: 'roleplay, thai, slow-burn, relationship-ready, scene-ready',
          },
        }),
      }),
    )
    const creatorPreview = validateLocalCreatorPreview(
      await jsonReader<LocalCreatorPreviewPayload>('/creator/preview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: creatorDraft.draftName,
          description: 'ตัวละครตรวจ local smoke สำหรับลองบทก่อนเผยแพร่',
          biography: 'ชอบบทสนทนาที่ค่อยๆ เปิดใจและมีรายละเอียดทางอารมณ์',
          scenario: 'คาเฟ่เล็กๆ ในวันที่ฝนเริ่มตก ผู้เล่นเพิ่งเดินเข้ามาทัก',
          systemPrompt:
            'ตอบเป็นตัวละครภาษาไทยแบบโรลเพลย์ มีบรรยากาศ การกระทำ และความรู้สึกชัดเจน เหลือพื้นที่ให้ผู้เล่นตอบต่อ',
          greeting: 'มาถึงแล้วเหรอ... ฝนข้างนอกแรงไหม',
          userMessage: 'ฉันนั่งลงตรงข้ามแล้วถามว่า เธอรอนานหรือเปล่า',
          userPersona: 'ผู้เล่นเป็นคนสุภาพ ชอบคุยช้าๆ และไม่เร่งความสัมพันธ์',
          relationshipSeed: 'คนรู้จัก',
          skipProvider: true,
        }),
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
          relationshipSeed: 'soulmate',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ฉันเข้ามาในคาเฟ่ช่วงฝนตกแล้วทักเธอด้วยน้ำเสียงเกรงใจ ช่วยตอบเป็นฉากโรลเพลย์ภาษาไทยที่มีบรรยากาศ ความรู้สึก การกระทำ และเหลือพื้นที่ให้ฉันตอบต่อ',
        }),
      })
      chat = validateLocalChatSmoke(chatPayload, expectedModel, minRoleplayReplyChars, 1)

      const streamEvents = await streamReader('/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          chatId: chat.chatId,
          characterId: smokeCharacter.id,
          relationshipSeed: 'soulmate',
          maxRating: 'restricted_18',
          history: [],
          message:
            'ต่อฉากเดิมแบบสตรีม ให้เห็นจังหวะการตอบและบรรยากาศ โดยไม่เรียกผู้ให้บริการจริง',
        }),
      })
      stream = validateLocalChatStreamSmoke(streamEvents, expectedModel, minRoleplayReplyChars, 1)
    }

    const savedChats = validateLocalSavedChats(
      await jsonReader<LocalSavedChatsPayload>('/chats', {
        headers: currentAuthHeaders,
      }),
      chat?.chatId,
    )
    const savedMessages = chat?.chatId
      ? validateLocalSavedChatMessages(
          await jsonReader<LocalSavedChatMessagesPayload>(`/chats/${chat.chatId}/messages?limit=5`, {
            headers: currentAuthHeaders,
          }),
          chat.chatId,
          5,
        )
      : null
    const worldStateLocation = 'local-smoke-room'
    const worldState = chat?.chatId
      ? validateLocalWorldState(
          await jsonReader<LocalWorldStatePayload>(`/chats/${chat.chatId}/world-state`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...currentAuthHeaders },
            body: JSON.stringify({
              timeOfDay: 'local smoke evening',
              location: worldStateLocation,
              weather: 'ฝนหยุดแล้ว',
              mood: 'นิ่งและพร้อมทดสอบ',
              sceneNotes: ['local smoke ยืนยัน world state หลังสร้างแชท'],
            }),
          }),
          chat.chatId,
          worldStateLocation,
        )
      : null
    if (chat?.chatId) {
      validateLocalWorldState(
        await jsonReader<LocalWorldStatePayload>(`/chats/${chat.chatId}/world-state`, {
          headers: currentAuthHeaders,
        }),
        chat.chatId,
        worldStateLocation,
      )
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
          contentSettings,
          persona,
          moderation,
          moderationSkippedReason,
          creatorDraft,
          creatorPreview,
          smokeCharacter,
          loreCount: lore.loreEntries?.length ?? 0,
          previewTurns: preview.preview.turns.length,
          chat,
          stream,
          savedChats,
          savedMessages,
          worldState,
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
