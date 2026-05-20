import { API_BASE_URL } from './env'

export { API_BASE_URL }

export const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const genericApiErrorMessage = 'คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่'

function payloadString(payload: unknown, key: 'message' | 'error') {
  if (!payload || typeof payload !== 'object') return ''
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === 'string' ? value.trim() : ''
}

export class ApiError extends Error {
  path: string
  status: number
  payload: unknown

  constructor(path: string, status: number, payload: unknown) {
    const message = payloadString(payload, 'message') || `${genericApiErrorMessage} (สถานะ ${status})`
    super(message)
    this.name = 'ApiError'
    this.path = path
    this.status = status
    this.payload = payload
  }
}

export function shouldLogUnexpectedError(error: unknown) {
  if (error instanceof ApiError) return false
  if (error instanceof TypeError && error.message === 'Failed to fetch') return false
  if (error instanceof DOMException && error.name === 'AbortError') return false
  if (error && typeof error === 'object') {
    const namedError = error as { name?: unknown; path?: unknown; status?: unknown }
    if (namedError.name === 'ApiError') return false
    if (namedError.name === 'AbortError') return false
    if (typeof namedError.path === 'string' && typeof namedError.status === 'number') return false
  }
  return true
}

function localValue(key: string) {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(key)
}

export function setApiUserId(userId: string) {
  if (typeof window === 'undefined') return
  if (!uuidPattern.test(userId)) return
  window.localStorage.setItem('maprang:userId', userId)
}

export function setAdminApiKey(apiKey: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('maprang:adminKey', apiKey)
}

export function clearAdminApiKey() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('maprang:adminKey')
}

export function setAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem('maprang:accessToken', accessToken)
}

export function clearApiAuth() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem('maprang:accessToken')
  window.localStorage.removeItem('maprang:adminKey')
}

function authHeaders() {
  const storedUserId = localValue('maprang:userId')
  const userId = storedUserId && uuidPattern.test(storedUserId) ? storedUserId : DEFAULT_USER_ID
  if (storedUserId && storedUserId !== userId) window.localStorage.removeItem('maprang:userId')
  const adminKey = localValue('maprang:adminKey')
  const accessToken = localValue('maprang:accessToken')
  const shouldSendLocalUserId = import.meta.env.DEV || Boolean(adminKey)
  return {
    ...(shouldSendLocalUserId ? { 'x-user-id': userId } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(adminKey ? { 'x-admin-key': adminKey } : {}),
  }
}

export type ChatRole = 'user' | 'assistant' | 'system'

export type ChatMessage = {
  id: string
  role: ChatRole
  content: string
}

export type Character = {
  id: string
  name: string
  avatarUrl: string | null
  tagline: string | null
  description: string | null
  biography: string | null
  scenario: string | null
  systemPrompt: string
  compactPrompt: string | null
  characterAnchor: string | null
  constraints: string | null
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
  tags: string[]
    chatCount: number
    contentRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
  }

export type ChatSummary = {
  id: string
  title: string
  characterId: string
  characterName: string
  lastMessageAt: string
  preview: string
  isArchived?: boolean
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

export type SavedChat = {
  id: string
  title: string | null
  memory: ChatRuntimeState['memory'] | null
  sceneState: ChatRuntimeState['sceneState'] | null
  relationshipState: ChatRuntimeState['relationshipState'] | null
  character: Character
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
      type: 'CHAT_USAGE' | 'ADMIN_ADJUSTMENT' | 'PROMOTION' | 'PURCHASE' | 'REFUND'
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

export type AdminSummary = {
  totals: {
    users: number
    characters: number
    publishedCharacters: number
    reviewCharacters: number
    chats: number
    messages: number
    loreEntries: number
    favorites: number
    usageRequests: number
    tokens: number
    cost: string
    pendingReports?: number
  }
  topCharacters: Array<{
    id: string
    name: string
    status: Character['status']
    visibility: Character['visibility']
    qualityScore: number
    chatCount: number
    viewCount: number
    favoriteCount: number
  }>
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

export type LoreEntry = {
  id: string
  characterId: string
  keyword: string
  aliases: string[]
  content: string
  priority: number
  hierarchyLevel: number
  parentLoreId: string | null
  createdAt: string
  updatedAt: string
}

export type LoreInput = {
  keyword: string
  aliases: string[]
  content: string
  priority: number
  hierarchyLevel: number
  parentLoreId: string | null
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const timeoutMs = path === '/chat' ? 60_000 : 12_000
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
    const payload = await response
      .clone()
      .json()
      .catch(() => null)
    throw new ApiError(path, response.status, payload)
  }

  return response.json() as Promise<T>
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

  return requestJson<{ characters?: Character[] }>(`/characters?${params.toString()}`)
}

export async function fetchCharacter(characterId: string) {
  return requestJson<{ character: Character }>(`/characters/${characterId}`)
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

export async function fetchAdminSummary() {
  return requestJson<AdminSummary>('/admin/summary')
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
  return requestJson<{ character: Character }>('/characters', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateCharacter(characterId: string, input: Partial<CharacterInput>) {
  return requestJson<{ character: Character }>(`/characters/${characterId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteCharacter(characterId: string) {
  return requestJson<{ ok: boolean }>(`/characters/${characterId}`, {
    method: 'DELETE',
  })
}

export async function duplicateCharacter(characterId: string) {
  return requestJson<{ character: Character }>(`/characters/${characterId}/duplicate`, {
    method: 'POST',
  })
}

export async function resetCharacterPrompt(characterId: string) {
  return requestJson<{ character: Character }>(`/characters/${characterId}/reset-prompt`, {
    method: 'POST',
  })
}

export async function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await fetch(`${API_BASE_URL}/uploads/avatar`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })

  if (!response.ok) {
    const payload = await response
      .clone()
      .json()
      .catch(() => null)
    throw new ApiError('/uploads/avatar', response.status, payload)
  }

  return response.json() as Promise<{ url: string; filename: string; provider: 'local' | 'supabase'; size: number; contentType: string }>
}

export async function setCharacterFavorite(characterId: string, favorite: boolean) {
  return requestJson<{ character: Character }>(`/characters/${characterId}/favorite`, {
    method: 'POST',
    body: JSON.stringify({ favorite }),
  })
}

export async function trackCharacterView(characterId: string) {
  return requestJson<{ character: Character }>(`/characters/${characterId}/view`, {
    method: 'POST',
  })
}

export async function fetchLoreEntries(characterId: string) {
  return requestJson<{ loreEntries?: LoreEntry[] }>(`/characters/${characterId}/lore`)
}

export async function createLoreEntry(characterId: string, input: LoreInput) {
  return requestJson<{ loreEntry: LoreEntry }>(`/characters/${characterId}/lore`, {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function updateLoreEntry(loreId: string, input: Partial<LoreInput>) {
  return requestJson<{ loreEntry: LoreEntry }>(`/lore/${loreId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export async function deleteLoreEntry(loreId: string) {
  return requestJson<{ ok: boolean }>(`/lore/${loreId}`, {
    method: 'DELETE',
  })
}

export async function fetchChats(options: { archived?: boolean } = {}) {
  const params = new URLSearchParams()
  if (options.archived) params.set('archived', 'true')
  const query = params.toString()
  return requestJson<{ chats?: ChatSummary[] }>(`/chats${query ? `?${query}` : ''}`)
}

export async function fetchChatMessages(chatId: string) {
  return requestJson<{ chat?: SavedChat }>(`/chats/${chatId}/messages`)
}

export async function fetchChatWorldState(chatId: string) {
  return requestJson<{ chatId: string; worldState: WorldState }>(`/chats/${chatId}/world-state`)
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

export type ReportTargetType = 'CHARACTER' | 'MESSAGE'
export type ReportStatus = 'PENDING' | 'REVIEWED' | 'RESOLVED' | 'REJECTED'
export type ReportAdminAction = 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE'
export type AdminAuditAction = 'REPORT_STATUS_UPDATE' | 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE' | 'TOKEN_ADJUSTMENT'

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
  character?: Pick<Character, 'id' | 'name' | 'status' | 'visibility'> | null
  message?: {
    id: string
    role: ChatRole
    content: string
    chatId: string
    deletedAt?: string | null
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
    maxRating?: 'general' | 'teen_romance' | 'mature_18' | 'restricted_18'
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  },
  onEvent: (event: ChatStreamEvent) => void,
) {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ ...input, chatId: input.chatId ?? undefined }),
  })

  if (!response.ok || !response.body) {
    const payload = await response
      .clone()
      .json()
      .catch(() => null)
    throw new ApiError('/chat/stream', response.status, payload)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const emitEvent = (rawEvent: string) => {
    const line = rawEvent
      .split('\n')
      .find((item) => item.startsWith('data: '))

    if (!line) return
    onEvent(JSON.parse(line.slice(6)) as ChatStreamEvent)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    buffer = buffer.replace(/\r\n/g, '\n')
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) emitEvent(rawEvent)
  }

  buffer += decoder.decode()
  buffer = buffer.replace(/\r\n/g, '\n')
  for (const rawEvent of buffer.split('\n\n').filter((event) => event.trim())) emitEvent(rawEvent)
}
