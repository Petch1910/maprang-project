export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const DEFAULT_USER_ID = '550e8400-e29b-41d4-a716-446655440000'
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ApiError extends Error {
  path: string
  status: number
  payload: unknown

  constructor(path: string, status: number, payload: unknown) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `${path} failed with status ${status}`
    super(message)
    this.name = 'ApiError'
    this.path = path
    this.status = status
    this.payload = payload
  }
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
  return {
    'x-user-id': userId,
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
}

export type ChatSummary = {
  id: string
  title: string
  characterId: string
  characterName: string
  lastMessageAt: string
  preview: string
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
  }
}

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
    adminAuthConfigured?: boolean
    supabaseAuthConfigured?: boolean
  }
  security?: {
    corsOrigins: string[]
    authMode: 'supabase-jwt' | 'local-dev-header'
    adminGuard: 'api-key' | 'disabled'
    avatarStorage: 'local' | 'supabase'
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
    maxInputChars: number
    minTokenBalanceForChat: number
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
  usage: {
    totalTokens: number
    requestCount: number
    recent: Array<{
      id: string
      tokens: number
      modelName: string | null
      cost: string | null
      createdAt: string
    }>
  }
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
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...init?.headers,
    },
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
  if (filters.limit) params.set('limit', String(filters.limit))

  return requestJson<{ characters?: Character[] }>(`/characters?${params.toString()}`)
}

export async function fetchHealthStatus() {
  return requestJson<HealthStatus>('/health')
}

export async function fetchUsageSummary() {
  return requestJson<UsageSummary>('/me/usage')
}

export async function fetchAdminSummary() {
  return requestJson<AdminSummary>('/admin/summary')
}

export type RelationshipPreset = {
  id: string
  name: string
  description: string
  tags: string[]
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

export async function fetchRelationshipPresets() {
  return requestJson<{ presets: RelationshipPreset[] }>('/relationship/presets')
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

export async function fetchChats() {
  return requestJson<{ chats?: ChatSummary[] }>('/chats')
}

export async function fetchChatMessages(chatId: string) {
  return requestJson<{ chat?: SavedChat }>(`/chats/${chatId}/messages`)
}

export async function archiveChat(chatId: string) {
  return requestJson<{ ok: boolean }>(`/chats/${chatId}/archive`, {
    method: 'PATCH',
  })
}

export async function sendChatMessage(input: {
  message: string
  characterId: string
  chatId: string | null
  relationshipSeed?: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  return requestJson<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function streamChatMessage(
  input: {
    message: string
    characterId: string
    chatId: string | null
    relationshipSeed?: string
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
    body: JSON.stringify(input),
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

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''

    for (const rawEvent of events) {
      const line = rawEvent
        .split('\n')
        .find((item) => item.startsWith('data: '))

      if (!line) continue
      onEvent(JSON.parse(line.slice(6)) as ChatStreamEvent)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim().startsWith('data: ')) {
    onEvent(JSON.parse(buffer.trim().slice(6)) as ChatStreamEvent)
  }
}
