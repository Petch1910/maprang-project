import { API_BASE_URL } from './env'
import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem } from './safeStorage'

export { API_BASE_URL }

export const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const backendLocalHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'])
const genericApiErrorMessage = 'คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'
const thaiTextPattern = /[\u0e00-\u0e7f]/
const rawTechnicalMessagePattern =
  /\b(?:Cannot read|PrismaClient\w*|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|TypeError|ReferenceError|SyntaxError|DATABASE_URL|OPENROUTER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|service_role|SQLSTATE|stack trace|undefined)\b/i
const malformedApiJsonPayload = { message: 'API ตอบกลับไม่สมบูรณ์ กรุณาลองใหม่' }

function payloadString(payload: unknown, key: 'message' | 'error') {
  if (!payload || typeof payload !== 'object') return ''
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function safeApiUserMessage(value: string) {
  const message = value.trim()
  if (!message) return ''
  if (!thaiTextPattern.test(message)) return ''
  if (rawTechnicalMessagePattern.test(message)) return ''
  return message
}

export class ApiError extends Error {
  path: string
  status: number
  payload: unknown

  constructor(path: string, status: number, payload: unknown) {
    const message = safeApiUserMessage(payloadString(payload, 'message')) || `${genericApiErrorMessage} (สถานะ ${status})`
    super(message)
    this.name = 'ApiError'
    this.path = path
    this.status = status
    this.payload = payload
  }
}

async function readErrorPayload(response: Response) {
  return response
    .clone()
    .json()
    .catch(() => null)
}

export async function readApiJson<T>(path: string, response: Response): Promise<T> {
  try {
    return (await response.json()) as T
  } catch {
    throw new ApiError(path, 502, malformedApiJsonPayload)
  }
}

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') return true
  if (error && typeof error === 'object') {
    return (error as { name?: unknown }).name === 'AbortError'
  }
  return false
}

export function shouldLogUnexpectedError(error: unknown) {
  if (error instanceof ApiError) return false
  if (error instanceof TypeError && error.message === 'Failed to fetch') return false
  if (isAbortLikeError(error)) return false
  if (error && typeof error === 'object') {
    const namedError = error as { name?: unknown; path?: unknown; status?: unknown }
    if (namedError.name === 'ApiError') return false
    if (typeof namedError.path === 'string' && typeof namedError.status === 'number') return false
  }
  return true
}

export function safeBrowserErrorSummary(error: unknown) {
  if (error instanceof Error) return { name: error.name || 'Error' }
  return { type: typeof error }
}

export function logUnexpectedError(label: string, error: unknown) {
  if (shouldLogUnexpectedError(error)) console.error(label, safeBrowserErrorSummary(error))
}

function localValue(key: string) {
  if (typeof window === 'undefined') return null
  return safeGetStorageItem(window.localStorage, key)
}

function sessionValue(key: string) {
  if (typeof window === 'undefined') return null
  return safeGetStorageItem(window.sessionStorage, key)
}

export function normalizeBackendMediaUrl(value?: string | null) {
  if (!value) return value ?? null
  if (value.startsWith('/uploads/')) return `${API_BASE_URL}${value}`

  try {
    const url = new URL(value)
    if (backendLocalHosts.has(url.hostname.toLowerCase()) && url.pathname.startsWith('/uploads/')) {
      return `${API_BASE_URL}${url.pathname}${url.search}${url.hash}`
    }
  } catch {
    return value
  }

  return value
}

export function normalizeCharacterMedia<T extends Character>(character: T): T {
  return {
    ...character,
    avatarUrl: normalizeBackendMediaUrl(character.avatarUrl),
    coverUrl: normalizeBackendMediaUrl(character.coverUrl),
  }
}

export function normalizeChatSummaryMedia<T extends ChatSummary>(chat: T): T {
  const character = chat.character ? normalizeCharacterMedia(chat.character) : undefined
  return {
    ...chat,
    characterAvatarUrl: normalizeBackendMediaUrl(chat.characterAvatarUrl ?? character?.avatarUrl),
    ...(character ? { character } : {}),
  }
}

export function normalizeSavedChatMedia<T extends SavedChat>(chat: T): T {
  return {
    ...chat,
    character: normalizeCharacterMedia(chat.character),
  }
}

export function setApiUserId(userId: string) {
  if (typeof window === 'undefined') return
  if (!uuidPattern.test(userId)) return
  safeSetStorageItem(window.localStorage, 'maprang:userId', userId)
}

export function setAdminApiKey(apiKey: string) {
  if (typeof window === 'undefined') return
  safeSetStorageItem(window.localStorage, 'maprang:adminKey', apiKey)
}

export function clearAdminApiKey() {
  if (typeof window === 'undefined') return
  safeRemoveStorageItem(window.localStorage, 'maprang:adminKey')
}

export function setAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return
  safeSetStorageItem(window.localStorage, 'maprang:accessToken', accessToken)
}

export function clearApiAuth() {
  if (typeof window === 'undefined') return
  safeRemoveStorageItem(window.localStorage, 'maprang:accessToken')
  safeRemoveStorageItem(window.localStorage, 'maprang:adminKey')
}

function authHeaders() {
  const storedUserId = localValue('maprang:userId')
  const userId = storedUserId && uuidPattern.test(storedUserId) ? storedUserId : DEFAULT_USER_ID
  if (storedUserId && storedUserId !== userId) safeRemoveStorageItem(window.localStorage, 'maprang:userId')
  const adminKey = localValue('maprang:adminKey')
  const accessToken = localValue('maprang:accessToken')
  const shouldSendLocalUserId = import.meta.env.DEV || Boolean(adminKey)

  const bypassEnabled = localValue('maprang:bypassEnabled') === 'true'
  const customApiKey = sessionValue('maprang:customApiKey:session')?.trim()
  const customApiProvider = localValue('maprang:customApiProvider')?.trim()

  const bypassHeaders = bypassEnabled
    ? {
        ...(customApiKey ? { 'x-user-api-key': customApiKey } : { 'x-user-api-vault': '1' }),
        ...(customApiProvider ? { 'x-user-api-provider': customApiProvider } : {}),
      }
    : {}

  return {
    ...(shouldSendLocalUserId ? { 'x-user-id': userId } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(adminKey ? { 'x-admin-key': adminKey } : {}),
    ...bypassHeaders,
    'ngrok-skip-browser-warning': '69420',
  }
}

export async function testConnection(apiKey: string, provider: string) {
  return requestJson<{ ok: boolean; message: string }>('/chat/test-key', {
    method: 'POST',
    body: JSON.stringify({ apiKey: apiKey.trim(), provider }),
  })
}

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  chatId?: string
  role: ChatRole
  content: string
  createdAt?: string | Date
}

export type Character = {
  id: string
  name: string
  avatarUrl?: string | null
  coverUrl?: string | null
  tagline: string | null
  description?: string | null
  biography?: string | null
  scenario?: string | null
  systemPrompt?: string
  compactPrompt?: string | null
  characterAnchor?: string | null
  constraints?: string | null
  greeting: string | null
  status?: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
  visibility?: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  qualityScore?: number
  qualityNotes?: {
    passes?: boolean
    notes?: string[]
  } | null
  publishedAt?: string | null
  promptVersion?: number
  viewCount?: number
  favoriteCount?: number
  isFavorite?: boolean
  createdAt: string | Date
  updatedAt: string | Date
  creatorId?: string
  persona?: string | null
  tags: string[]
  chatCount: number
  contentRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
}

export type ChatSummary = {
  id: string
  title: string
  characterId: string
  characterName: string
  characterAvatarUrl?: string | null
  character?: Character
  lastMessageAt: string
  createdAt?: string
  updatedAt?: string
  preview: string
  lastMessage?: {
    role: ChatRole
    content: string
    createdAt?: string
  } | null
  isArchived?: boolean
  archivedAt?: string | null
  messageCount?: number
  unreadCount?: number
  relationship?: {
    current?: string
    status?: string
    tier?: string
    affinity?: number
    trust?: number
    intimacy?: number
  } | null
  sceneState?: ChatRuntimeState['sceneState'] | null
  relationshipState?: ChatRuntimeState['relationshipState'] | null
}

export type ChatResponse = {
  reply?: string
  chatId?: string | null
  memory?: ChatRuntimeState
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens: number
    cost?: number
    modelName: string
    contextLoreCount?: number
    tokenBalance?: number | null
    promptBudget?: {
      estimatedTokens: number
      maxTokens: number
      historyMessagesIncluded: number
      historyMessagesDropped: number
      overBudget: boolean
    }
    responseQuality?: {
      responseDepth: 'quick' | 'balanced' | 'deep' | 'cinematic'
      minRecommendedChars: number
      charCount: number
      lineCount: number
      hasAction: boolean
      hasEmotion: boolean
      hasNextHook: boolean
      hasContextReference: boolean
      likelyTooShort: boolean
      score: number
      notes: string[]
    }
    providerFailure?: {
      code: 'rate_limited' | 'quota_exhausted' | 'invalid_credentials' | 'timeout' | 'provider_unavailable' | 'unknown'
      status: number | null
      retryable: boolean
      userMessage: string
    }
  }
}

export type WorldState = {
  timeOfDay: string
  location: string
  weather: string
  mood: string
  sceneNotes: string[]
  updatedAt: string
}

export type WorldStateInput = Partial<Pick<WorldState, 'timeOfDay' | 'location' | 'weather' | 'mood' | 'sceneNotes'>>

export type ChatRuntimeState = {
  memory: {
    summary: string
    facts: string[]
    relationshipTimeline?: Array<{
      turn: number
      type: 'message' | 'scene' | 'event'
      label: string
      summary: string
      createdAt: string
    }>
    emotionalMomentum?: {
      direction: 'warming' | 'cooling' | 'volatile' | 'steady'
      positive: number
      negative: number
      vulnerable: number
      threatening: number
      updatedAt: string
    }
    worldState?: WorldState
    turnCount: number
    updatedAt: string
  }
  sceneState: {
    currentScene: string
    lastUserIntent: string
    mode: 'sandbox' | 'scene'
    pendingEvents: Array<{
      code: string
      title: string
      prompt: string
      priority: number
      cooldownTurns?: number
      repeatable?: boolean
      expiresAtTurn: number
      status: 'pending' | 'held'
    }>
    activeScene: {
      code: string
      title: string
      objective: string
      startedAtTurn: number
      exitAfterTurns: number
    } | null
    sceneOutcomes?: Array<{
      code: string
      title: string
      outcome: 'accepted' | 'rejected' | 'resolved' | 'abandoned' | 'expired'
      turn: number
      createdAt: string
    }>
    eventCooldowns?: Record<string, number>
    consumedEvents: string[]
    declinedEvents: string[]
    updatedAt: string
  }
  relationshipState: {
    affinity: number
    trust: number
    intimacy: number
    dominance: number
    fear: number
    respect: number
    route: string
    arcStage: string
    status: string
    tier: string
    tone: string
    flags: string[]
    constraints: string[]
    events: Array<{
      code: string
      label: string
      priority: number
      cooldownTurns?: number
      repeatable?: boolean
    }>
    multipliers: {
      affinityGain: number
      trustGain: number
      intimacyGain: number
      respectGain: number
    }
    normalized: {
      affinity: number
      trust: number
      intimacy: number
      dominance: number
      fear: number
      respect: number
    }
    promptProfile: string
    tagProfile: {
      discovery: string[]
      engine: string[]
      safety: string[]
      unknown: string[]
    }
    updatedAt: string
  }
}

export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'done'
      chatId: string | null
      usage: NonNullable<ChatResponse['usage']>
      memory?: ChatRuntimeState
    }
  | { type: 'error'; message: string; chatId: string | null }

const chatStreamMalformedPayload = { message: 'สตรีมแชทขัดข้อง กรุณาลองใหม่' }

function malformedChatStreamError() {
  return new ApiError('/chat/stream', 502, chatStreamMalformedPayload)
}

export function parseChatStreamEvent(raw: string) {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw malformedChatStreamError()
  }

  if (!parsed || typeof parsed !== 'object' || typeof (parsed as { type?: unknown }).type !== 'string') {
    throw malformedChatStreamError()
  }

  return parsed as ChatStreamEvent
}

export type SavedChat = {
  id: string
  title: string | null
  memory: ChatRuntimeState['memory'] | null
  sceneState: ChatRuntimeState['sceneState'] | null
  relationshipState: ChatRuntimeState['relationshipState'] | null
  character: Character
  messageWindow?: {
    limit: number
    mayHaveMoreBefore: boolean
  }
  messages: ChatMessage[]
}

export type HealthStatus = {
  ok: boolean
  service: string
  checks: {
    databaseConfigured: boolean
    databaseConnected: boolean
    openRouterConfigured: boolean
    imageGenerationConfigured?: boolean
    adminAuthConfigured?: boolean
    supabaseAuthConfigured?: boolean
  }
  security?: {
    corsOrigins: string[]
    authMode: 'supabase-jwt' | 'local-dev-header'
    adminGuard: 'api-key' | 'disabled'
    avatarStorage: 'local' | 'supabase'
    avatarStorageAccess?: 'local' | 'public' | 'signed'
    signedUrlExpiresIn?: number | null
  }
  securityPosture?: Record<
    'confidentiality' | 'integrity' | 'availability' | 'authentication' | 'authorization' | 'accounting',
    {
      ok: boolean
      detail: string
    }
  >
  knowledge?: {
    structured?: {
      ok: boolean
      fileCount: number
      missing: string[]
      errors: string[]
      files: Array<{
        file: string
        ok: boolean
        id?: string
        schemaVersion?: number
        updatedAt?: string
        errors: string[]
      }>
    }
  }
  env?: {
    mode: 'production' | 'development'
    missingRequired: string[]
    missingRecommended: string[]
    invalid?: string[]
  }
  databaseError: string | null
  timestamp: string
  model?: {
    name: string
    inputCostPer1M: number
    outputCostPer1M: number
    temperature?: number
    maxOutputTokens?: number
    minRoleplayReplyChars?: number
    promptBudgetTokens?: number
    promptHistoryMaxMessages?: number
    maxInputChars: number
    minTokenBalanceForChat: number
    providerRetry?: {
      chatAttempts: number
      chatDelayMs: number
      creatorDraftAttempts: number
      creatorDraftDelayMs: number
    }
    chatProvider?: {
      configured: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      liveSmokeCommand?: string
      localFallbackEnabled?: boolean
      forcedLocal?: boolean
      activeRuntimeProvider?: 'local' | 'openrouter' | string
      localModel?: string
    }
    imageGeneration?: {
      configured: boolean
      liveVerified?: boolean
      productionReady?: boolean
      status?: 'missing_provider' | 'needs_live_smoke' | 'verified'
      model: string
      liveSmokeCommand?: string
    }
  }
}

export type UsageSummary = {
  user: {
    id: string
    email: string
    username: string | null
    tokenBalance: number
    role: 'USER' | 'ADMIN'
  }
  contentSettings?: ContentSettings
  usage: {
    totalTokens: number
    totalCost: string
    requestCount: number
    recent: Array<{
      id: string
      tokens: number
      modelName: string | null
      cost: string | null
      createdAt: string
    }>
    byModel: Array<{
      modelName: string | null
      tokens: number
      cost: string
      requestCount: number
    }>
    daily: Array<{
      date: string
      tokens: number
      cost: string
      requestCount: number
    }>
    estimate: {
      averageTokensPerRequest: number
      averageCostPerRequest: string
      estimatedRemainingRequests: number | null
    }
  }
  wallet?: {
    transactions: Array<{
      id: string
      type:
        | 'CHAT_USAGE'
        | 'IMAGE_GENERATION'
        | 'ADMIN_ADJUSTMENT'
        | 'PROMOTION'
        | 'PURCHASE'
        | 'REFUND'
        | 'DAILY_LOGIN'
        | 'ACHIEVEMENT'
        | 'PENALTY'
        | 'EXPIRY'
      amount: number
      balanceAfter: number
      reason: string | null
      createdAt: string
    }>
  }
}

export type ContentSettings = {
  isAdult: boolean
  maxRating: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
  adultVerifiedAt: string | null
}

export type UserPersona = {
  persona: string
  updatedAt: string | null
  maxChars: number
}

export type ProviderKeyMetadata = {
  provider: string
  keyHint: string | null
  createdAt: string
  updatedAt: string
}

export type PromptInspectorSection = {
  index: number
  title: string
  chars: number
  estimatedTokens: number
  fingerprint: string
  preview: string
  content: string
}

export type PromptInspectorSnapshot = {
  generatedAt: string
  character: {
    id: string | null
    name: string | null
  }
  redacted: true
  prompt: string
  totals: {
    chars: number
    estimatedTokens: number
    sectionCount: number
  }
  sections: PromptInspectorSection[]
  retrieval: {
    loreCount: number
    lore: Array<{
      keyword: string
      aliases: string[]
      priority: number
      preview: string
    }>
  }
  warnings: string[]
}

export type PromptInspectorDiff = {
  previousEstimatedTokens: number
  currentEstimatedTokens: number
  estimatedTokenDelta: number
  charDelta: number
  changedSections: Array<{
    index: number
    title: string
    status: 'added' | 'removed' | 'changed'
    estimatedTokenDelta: number
    charDelta: number
  }>
}

export type PromptInspectorResponse = {
  snapshot: PromptInspectorSnapshot
  diff?: PromptInspectorDiff
  previousSnapshot?: PromptInspectorSnapshot
}

export type EvalCheck = {
  label: string
  status: 'pass' | 'fail'
  detail: string
}

export type EvalScenarioResult = {
  id: string
  title: string
  estimatedTokens: number
  passed: boolean
  failures: string[]
  checks: EvalCheck[]
}

export type LocalEvalRun = {
  generatedAt: string
  suite: {
    schemaVersion: number
    name: string
    updatedAt: string | null
    description: string | null
  }
  passed: boolean
  scenarioCount: number
  passCount: number
  failCount: number
  totalEstimatedTokens: number
  maxEstimatedTokens: number
  failures: string[]
  results: EvalScenarioResult[]
}

export type AdminProcessMiningSummary = {
  generatedAt: string
  days: number
  windowStart: string
  eventCounts: Array<{ eventName: string; count: number }>
  funnel: {
    characterImpressions: number
    characterDetailViews: number
    chatStarts: number
    chatTurns: number
    firstReplies: number
    reports: number
    uniqueChats: number
    uniqueCharacters: number
  }
  contextSnapshots: {
    count: number
    latest: Array<{
      id: string
      chatId: string | null
      characterId: string | null
      modelRoute: string
      replyProfile: string
      modelName: string | null
      promptHash: string
      promptTokensEstimate: number
      loreCount: number
      createdAt: string
    }>
  }
  recentEvents: Array<{
    id: string
    eventName: string
    source: string
    route: string | null
    entityType: string | null
    entityId: string | null
    chatId: string | null
    characterId: string | null
    createdAt: string
  }>
}

export type FrontendAnalyticsEventName =
  | 'marketplace_view'
  | 'character_impression'
  | 'character_detail_view'
  | 'wallet_view'
  | 'creator_opened'
  | 'creator_draft_generated'
  | 'creator_publish'
  | 'ai_creator_opened'
  | 'ai_creator_generate_started'
  | 'report_opened'

export type FrontendAnalyticsEventInput = {
  eventName: FrontendAnalyticsEventName
  route?: string
  entityType?: string
  entityId?: string
  chatId?: string
  characterId?: string
  metadata?: Record<string, unknown>
}

export function apiRequestTimeoutMs(path: string, init?: RequestInit) {
  const method = (init?.method ?? 'GET').toUpperCase()
  if (path === '/chat' || path === '/creator/ai-draft') return 60_000
  if (method === 'GET') return 5_000
  return 12_000
}

export function apiUploadTimeoutMs() {
  return 60_000
}

export function apiStreamConnectTimeoutMs() {
  return 60_000
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const timeoutMs = apiRequestTimeoutMs(path, init)
  const controller = init?.signal ? null : new AbortController()
  const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    signal: init?.signal ?? controller?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
  }).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })

  if (!response.ok) {
    const payload = await readErrorPayload(response)
    throw new ApiError(path, response.status, payload)
  }

  return readApiJson<T>(path, response)
}

export type CharacterListFilters = {
  view?: 'public' | 'admin'
  q?: string
  tag?: string
  status?: Character['status'] | ''
  visibility?: Character['visibility'] | ''
  sort?: 'popular' | 'newest' | 'quality' | 'viewed' | 'favorited'
  favoriteOnly?: boolean
  maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
  limit?: number
}

export async function fetchCharacters(filters: CharacterListFilters = { view: 'public' }) {
  const params = new URLSearchParams()
  params.set('view', filters.view ?? 'public')
  if (filters.q?.trim()) params.set('q', filters.q.trim())
  if (filters.tag?.trim()) params.set('tag', filters.tag.trim())
  if (filters.status) params.set('status', filters.status)
  if (filters.visibility) params.set('visibility', filters.visibility)
  if (filters.sort) params.set('sort', filters.sort)
  if (filters.favoriteOnly) params.set('favoriteOnly', 'true')
  if (filters.maxRating) params.set('maxRating', filters.maxRating)
  if (filters.limit) params.set('limit', String(filters.limit))

  const data = await requestJson<{ characters?: Character[] }>(`/characters?${params.toString()}`)
  return { ...data, characters: data.characters?.map(normalizeCharacterMedia) }
}

export async function reportGenerationOutput(generationOutputId: string, reason: string, details?: string) {
  return requestJson<{ report: Report }>('/reports', {
    method: 'POST',
    body: JSON.stringify({
      targetType: 'GENERATION_OUTPUT',
      generationOutputId,
      reason,
      details,
    }),
  })
}

export async function fetchCharacter(characterId: string) {
  const data = await requestJson<{ character: Character }>(`/characters/${characterId}`)
  return { ...data, character: normalizeCharacterMedia(data.character) }
}

export async function fetchHealthStatus() {
  return requestJson<HealthStatus>('/health')
}

export async function fetchUsageSummary() {
  return requestJson<UsageSummary>('/me/usage')
}

export async function fetchContentSettings() {
  return requestJson<{ contentSettings: ContentSettings }>('/me/content-settings')
}

export async function updateContentSettings(input: { isAdult: boolean; maxRating?: ContentSettings['maxRating'] }) {
  return requestJson<{ contentSettings: ContentSettings }>('/me/content-settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function fetchUserPersona() {
  return requestJson<{ persona: UserPersona }>('/me/persona')
}

export async function updateUserPersona(persona: string) {
  return requestJson<{ persona: UserPersona }>('/me/persona', {
    method: 'PATCH',
    body: JSON.stringify({ persona }),
  })
}

export async function fetchProviderKeys() {
  return requestJson<{ keys: ProviderKeyMetadata[] }>('/me/provider-keys')
}

export async function saveProviderKey(provider: string, apiKey: string) {
  return requestJson<{ key: ProviderKeyMetadata }>(`/me/provider-keys/${encodeURIComponent(provider)}`, {
    method: 'PUT',
    body: JSON.stringify({ apiKey }),
  })
}

export async function deleteProviderKey(provider: string) {
  return requestJson<{ deleted: boolean; provider: string }>(`/me/provider-keys/${encodeURIComponent(provider)}`, {
    method: 'DELETE',
  })
}

export async function inspectAdminPrompt(input: {
  characterId: string
  message: string
  chatId?: string
  compareWithMessage?: string
  includePreviousSnapshot?: boolean
  includeSavedPersona?: boolean
  runtimeNote?: string
  userPersona?: string
}) {
  return requestJson<PromptInspectorResponse>('/admin/prompt-inspector', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchAdminLocalEvals() {
  return requestJson<LocalEvalRun>('/admin/evals/local')
}

export async function fetchAdminProcessMining(days = 7) {
  const params = new URLSearchParams({ days: String(days) })
  return requestJson<AdminProcessMiningSummary>(`/admin/process-mining?${params.toString()}`)
}

export async function trackAnalyticsEvent(input: FrontendAnalyticsEventInput) {
  return requestJson<{ ok: boolean; eventId: string }>('/analytics/events', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export type RelationshipPreset = {
  id: string
  name: string
  description: string
  tags: string[]
  surfaces?: Array<'contract' | 'creator'>
}

export type RelationshipPreview = {
  seed: ChatRuntimeState['relationshipState']
  turns: Array<{
    turn: number
    message: string
    status: string
    tier: string
    tone: string
    stats: ChatRuntimeState['relationshipState']['normalized']
    events: ChatRuntimeState['relationshipState']['events']
  }>
  finalState: ChatRuntimeState['relationshipState']
  validationIssues: Array<{
    level: 'warning' | 'danger'
    code: string
    message: string
  }>
}

export async function fetchRelationshipPresets(surface?: 'contract' | 'creator') {
  const params = new URLSearchParams()
  if (surface) params.set('surface', surface)
  const query = params.toString()
  return requestJson<{ presets: RelationshipPreset[] }>(`/relationship/presets${query ? `?${query}` : ''}`)
}

export async function previewRelationship(tags: string[], messages?: string[]) {
  return requestJson<{ preview: RelationshipPreview }>('/relationship/preview', {
    method: 'POST',
    body: JSON.stringify({ tags, messages }),
  })
}

export type CharacterInput = {
  name: string
  avatarUrl: string | null
  coverUrl?: string | null
  tagline: string | null
  description: string | null
  biography: string | null
  scenario: string | null
  systemPrompt: string
  compactPrompt: string | null
  characterAnchor: string | null
  constraints: string | null
  greeting: string | null
  tags: string[]
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE'
  status: 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED'
}

export type CreatorAiDraftFields = {
  name: string
  tagline: string
  description: string
  biography: string
  scenario: string
  systemPrompt: string
  compactPrompt: string
  characterAnchor: string
  constraints: string
  greeting: string
  tags: string
}

export type CreatorAiDraftResponse = {
  draft: CreatorAiDraftFields
  image: {
    url: string
    provider: 'configured' | 'placeholder'
    prompt: string
    note: string
  }
  source: 'ai' | 'fallback'
  modelName: string
  warnings: string[]
}

export type GenerationJobOutput = {
  id: string
  jobId?: string
  ownerId?: string
  kind: 'image' | 'video'
  url: string | null
  visibility: 'private' | 'public'
  isFavorite: boolean
  createdAt: string
  updatedAt?: string
}

export type GenerationJob = {
  id: string
  ownerId: string
  templateId: string
  status: 'blocked' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  source: string
  failureCode: string
  message: string
  debit: {
    charged: boolean
    amount: number
    reason: string
  }
  input: {
    prompt: string
    imageInputCount: number
    videoInputCount: number
  }
  persisted?: boolean
  createdAt?: string
  updatedAt?: string
  outputs?: GenerationJobOutput[]
}

export type GenerationInputMetadata = {
  name?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  durationSeconds?: number | null
}

export type CreateGenerationJobInput = {
  templateId: string
  prompt?: string | null
  imageInputs?: string[]
  videoInputs?: string[]
  imageInputMetadata?: GenerationInputMetadata[]
  videoInputMetadata?: GenerationInputMetadata[]
}

export async function generateCreatorAiDraft(input: {
  brief?: string
  imagePrompt?: string
  current?: Partial<CreatorAiDraftFields>
  imageOnly?: boolean
  imageStyle?: string
}) {
  return requestJson<CreatorAiDraftResponse>('/creator/ai-draft', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchGenerationJobs(limit = 20) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  return requestJson<{
    jobs: GenerationJob[]
    persisted: boolean
    persistenceWarning?: string
  }>(`/generation/jobs?${params.toString()}`)
}

export async function createGenerationJob(input: CreateGenerationJobInput) {
  return requestJson<{
    job: GenerationJob
  }>('/generation/jobs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchGenerationJob(jobId: string) {
  return requestJson<{
    job: GenerationJob
    persisted: boolean
  }>(`/generation/jobs/${jobId}`)
}

export async function retryGenerationJob(jobId: string) {
  return requestJson<{
    job: GenerationJob
    persisted: boolean
    persistenceWarning?: string
  }>(`/generation/jobs/${jobId}/retry`, {
    method: 'POST',
  })
}

export async function cancelGenerationJob(jobId: string) {
  return requestJson<{
    job: GenerationJob
    persisted: boolean
    persistenceWarning?: string
  }>(`/generation/jobs/${jobId}/cancel`, {
    method: 'POST',
  })
}

export async function favoriteGenerationOutput(outputId: string) {
  return requestJson<{
    output: GenerationJobOutput
    persisted: boolean
    persistenceWarning?: string
  }>(`/generation/outputs/${outputId}/favorite`, {
    method: 'POST',
  })
}

export async function unfavoriteGenerationOutput(outputId: string) {
  return requestJson<{
    output: GenerationJobOutput
    persisted: boolean
    persistenceWarning?: string
  }>(`/generation/outputs/${outputId}/favorite`, {
    method: 'DELETE',
  })
}

export async function fetchGenerationOutputDownload(outputId: string) {
  return requestJson<{
    download: {
      outputId: string
      kind: 'image' | 'video'
      access: 'direct' | 'public' | 'signed'
      url: string
      expiresIn: number | null
    }
    persisted: boolean
  }>(`/generation/outputs/${outputId}/download`)
}

export type GenerationOutputCreatorReference = {
  target: 'character-image' | 'cover'
  outputId: string
  jobId: string
  kind: 'image' | 'video'
  url: string
  access: 'direct' | 'public' | 'signed'
  expiresIn: number | null
  visibility: 'private' | 'public' | 'unlisted' | string
  prompt?: string
  templateId?: string
  mode?: string
  draftPatch: Record<string, unknown>
}

export async function useGenerationOutputAsCharacterImage(outputId: string) {
  return requestJson<{
    reference: GenerationOutputCreatorReference
    persisted: boolean
  }>(`/generation/outputs/${outputId}/use-as-character-image`, {
    method: 'POST',
  })
}

export async function useGenerationOutputAsCover(outputId: string) {
  return requestJson<{
    reference: GenerationOutputCreatorReference
    persisted: boolean
  }>(`/generation/outputs/${outputId}/use-as-cover`, {
    method: 'POST',
  })
}

export async function deleteGenerationOutput(outputId: string) {
  return requestJson<{
    ok: boolean
    deleted: boolean
    persisted: boolean
  }>(`/generation/outputs/${outputId}`, {
    method: 'DELETE',
  })
}

export async function publishGenerationOutput(outputId: string) {
  return requestJson<{
    output: GenerationJobOutput
    persisted: boolean
  }>(`/generation/gallery/${outputId}/publish`, {
    method: 'POST',
  })
}

export async function unpublishGenerationOutput(outputId: string) {
  return requestJson<{
    output: GenerationJobOutput
    persisted: boolean
  }>(`/generation/gallery/${outputId}`, {
    method: 'DELETE',
  })
}

export async function fetchPublicGallery(limit = 20) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  return requestJson<{
    outputs: Array<GenerationJobOutput & { prompt?: string, templateId?: string, mode?: string, brief?: string }>
    persisted: boolean
  }>(`/generation/gallery?${params.toString()}`)
}

export async function fetchPublicGalleryItem(outputId: string) {
  return requestJson<{
    output: GenerationJobOutput & { prompt?: string, templateId?: string, mode?: string, brief?: string }
    persisted: boolean
  }>(`/generation/gallery/${outputId}`)
}

export async function fetchCreatorDraft() {
  return requestJson<{ draft: unknown }>('/creator/draft')
}

export async function updateCreatorDraft(payload: unknown) {
  return requestJson<{ ok: boolean }>('/creator/draft', {
    method: 'PUT',
    body: JSON.stringify({ payload }),
  })
}

export async function createCharacter(input: CharacterInput) {
  const data = await requestJson<{ character: Character }>('/characters', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return { ...data, character: normalizeCharacterMedia(data.character) }
}

export async function uploadAvatar(file: File, timeoutMs = apiUploadTimeoutMs()) {
  const form = new FormData()
  form.append('file', file)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${API_BASE_URL}/uploads/avatar`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
      signal: controller.signal,
    })

    if (!response.ok) {
      const payload = await readErrorPayload(response)
      throw new ApiError('/uploads/avatar', response.status, payload)
    }

    const data = await readApiJson<{ url: string; filename: string; provider: 'local' | 'supabase'; size: number; contentType: string }>('/uploads/avatar', response)
    return { ...data, url: normalizeBackendMediaUrl(data.url) ?? data.url }
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new ApiError('/uploads/avatar', 408, { message: 'อัปโหลดรูปใช้เวลานานเกินไป กรุณาลองใหม่' })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function setCharacterFavorite(characterId: string, favorite: boolean) {
  const data = await requestJson<{ character: Character }>(`/characters/${characterId}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ favorite }),
  })
  return { ...data, character: normalizeCharacterMedia(data.character) }
}

export async function trackCharacterView(characterId: string) {
  const data = await requestJson<{ character: Character }>(`/characters/${characterId}/view`, {
    method: 'POST',
  })
  return { ...data, character: normalizeCharacterMedia(data.character) }
}

export async function fetchChats(options: { archived?: boolean } = {}) {
  const params = new URLSearchParams()
  if (options.archived) params.set('archived', 'true')
  const query = params.toString()
  const data = await requestJson<{ chats?: ChatSummary[] }>(`/chats${query ? `?${query}` : ''}`)
  return { ...data, chats: data.chats?.map(normalizeChatSummaryMedia) }
}

export async function fetchChatMessages(chatId: string, options: { limit?: number } = {}) {
  const params = new URLSearchParams()
  if (options.limit !== undefined) params.set('limit', String(options.limit))
  const query = params.toString()
  const data = await requestJson<{ chat?: SavedChat }>(`/chats/${chatId}/messages${query ? `?${query}` : ''}`)
  return { ...data, chat: data.chat ? normalizeSavedChatMedia(data.chat) : data.chat }
}

export async function updateChatWorldState(chatId: string, input: WorldStateInput) {
  return requestJson<{ chatId: string; worldState: WorldState }>(`/chats/${chatId}/world-state`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function archiveChat(chatId: string) {
  return requestJson<{ ok: boolean }>(`/chats/${chatId}/archive`, {
    method: 'PATCH',
  })
}

export async function restoreChat(chatId: string) {
  return requestJson<{ ok: boolean }>(`/chats/${chatId}/restore`, {
    method: 'PATCH',
  })
}

export async function deleteChat(chatId: string) {
  return requestJson<{ ok: boolean }>(`/chats/${chatId}`, {
    method: 'DELETE',
  })
}

export async function updateChatTitle(chatId: string, title: string) {
  return requestJson<{ chat: { id: string; title: string } }>(`/chats/${chatId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
}

export type ReportTargetType = 'CHARACTER' | 'MESSAGE' | 'GENERATION_OUTPUT'
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED'
export type ReportAdminAction = 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE' | 'HIDE_GENERATION_OUTPUT'
export type AdminAuditAction =
  | 'REPORT_STATUS_UPDATE'
  | 'HIDE_CHARACTER'
  | 'ARCHIVE_MESSAGE'
  | 'HIDE_GENERATION_OUTPUT'
  | 'TOKEN_ADJUSTMENT'

export type AdminAuditLog = {
  id: string
  action: AdminAuditAction
  targetType: string
  targetId: string
  metadata: Record<string, unknown> | null
  actorUserId: string | null
  actorUser?: {
    id: string
    email: string | null
    username: string | null
  } | null
  createdAt: string
}

export type ReportSummary = {
  id: string
  targetType: ReportTargetType
  reason: string
  details: string | null
  status: ReportStatus
  reporterId?: string
  characterId: string | null
  messageId: string | null
  generationOutputId?: string | null
  character?: Pick<Character, 'id' | 'name' | 'status' | 'visibility'> | null
  message?: {
    id: string
    role: ChatRole
    content: string
    chatId: string
    deletedAt?: string | null
  } | null
  generationOutput?: {
    id: string
    kind: 'image' | 'video'
    url: string | null
    visibility: 'private' | 'public' | string
  } | null
  reporter?: {
    id: string
    email: string | null
    username: string | null
  } | null
  reviewedAt?: string | null
  createdAt: string
  updatedAt?: string
}

export async function createReport(input: {
  targetType: ReportTargetType
  characterId?: string
  messageId?: string
  generationOutputId?: string
  reason: string
  details?: string
  metadata?: Record<string, unknown>
}) {
  return requestJson<{ report: ReportSummary }>('/reports', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function fetchAdminReports(filters: {
  status?: ReportStatus | ''
  targetType?: ReportTargetType | ''
  limit?: number
} = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  if (filters.targetType) params.set('targetType', filters.targetType)
  if (filters.limit) params.set('limit', String(filters.limit))
  const query = params.toString()
  return requestJson<{ reports: ReportSummary[] }>(`/admin/reports${query ? `?${query}` : ''}`)
}

export async function fetchAdminAuditLogs(limit = 40) {
  return requestJson<{ logs: AdminAuditLog[] }>(`/admin/audit-logs?limit=${limit}`)
}

export async function updateAdminReportStatus(reportId: string, status: ReportStatus) {
  return requestJson<{ report: ReportSummary }>(`/admin/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function applyAdminReportAction(reportId: string, action: ReportAdminAction) {
  return requestJson<{
    action: ReportAdminAction
    report: ReportSummary
  }>(`/admin/reports/${reportId}/actions`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  })
}

export async function adjustAdminUserTokens(userId: string, amount: number, reason?: string) {
  return requestJson<{
    user: UsageSummary['user']
    adjustment: number
    transaction?: NonNullable<UsageSummary['wallet']>['transactions'][number]
  }>(`/admin/users/${userId}/tokens`, {
    method: 'PATCH',
    body: JSON.stringify({ amount, reason }),
  })
}

export async function sendChatMessage(input: {
  message: string
  characterId: string
  chatId: string | null
  relationshipSeed?: string
  userPersona?: string
  modelRoute?: string
  replyProfile?: string
  responseDepth?: 'quick' | 'balanced' | 'deep' | 'cinematic'
  maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  return requestJson<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ ...input, chatId: input.chatId ?? undefined }),
  })
}

export async function streamChatMessage(
  input: {
    message: string
    characterId: string
    chatId: string | null
    relationshipSeed?: string
    userPersona?: string
    modelRoute?: string
    replyProfile?: string
    responseDepth?: 'quick' | 'balanced' | 'deep' | 'cinematic'
    maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  },
  onEvent: (event: ChatStreamEvent) => void,
  options: { timeoutMs?: number } = {},
) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? apiStreamConnectTimeoutMs())
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({ ...input, chatId: input.chatId ?? undefined }),
      signal: controller.signal,
    })
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new ApiError('/chat/stream', 408, { message: 'เชื่อมต่อสตรีมแชทใช้เวลานานเกินไป กรุณาลองใหม่' })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
  }

  if (!response.ok || !response.body) {
    const payload = await readErrorPayload(response)
    throw new ApiError('/chat/stream', response.status, payload)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let terminalEventReceived = false

  const emitEvent = (rawEvent: string) => {
    const line = rawEvent
      .split('\n')
      .find((item) => item.startsWith('data: '))

    if (!line) return
    const event = parseChatStreamEvent(line.slice(6))
    onEvent(event)
    if (event.type === 'done' || event.type === 'error') terminalEventReceived = true
  }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      buffer = buffer.replace(/\r\n/g, '\n')
      const events = buffer.split('\n\n')
      buffer = events.pop() ?? ''

      for (const rawEvent of events) emitEvent(rawEvent)
      if (terminalEventReceived) break
    }

    if (!terminalEventReceived) {
      buffer += decoder.decode()
      buffer = buffer.replace(/\r\n/g, '\n')
      for (const rawEvent of buffer.split('\n\n').filter((event) => event.trim())) {
        emitEvent(rawEvent)
        if (terminalEventReceived) break
      }
    }
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw malformedChatStreamError()
  } finally {
    if (terminalEventReceived) await reader.cancel().catch(() => undefined)
    reader.releaseLock()
  }
}
