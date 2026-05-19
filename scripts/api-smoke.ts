import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { apiBaseUrl, readJson, smokeAuthHeaders } from './smoke-helpers'

type ApiSmokeStatus = 'pass' | 'warn' | 'fail' | 'skip'

type ApiSmokeResult = {
  name: string
  status: ApiSmokeStatus
  detail: string
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
  }
}

const live = process.argv.includes('--live')
const requireLiveImage = process.argv.includes('--require-live-image')
const requireAdmin = process.argv.includes('--require-admin')
const results: ApiSmokeResult[] = []

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
    record(name, 'fail', error instanceof Error ? error.message : String(error))
  }
}

async function warnable(name: string, fn: () => Promise<{ ok: boolean; detail: string }>) {
  try {
    const result = await fn()
    record(name, result.ok ? 'pass' : 'warn', result.detail)
  } catch (error) {
    record(name, 'fail', error instanceof Error ? error.message : String(error))
  }
}

await check('GET /health', async () => {
  healthStatus = await readJson<HealthSmokePayload>('/health')
  if (!healthStatus.ok) throw new Error('health ok=false')
  if (!healthStatus.checks?.databaseConnected) throw new Error('databaseConnected=false')
  if (typeof healthStatus.model?.promptBudgetTokens !== 'number') throw new Error('missing promptBudgetTokens')
  if (typeof healthStatus.model?.promptHistoryMaxMessages !== 'number') throw new Error('missing promptHistoryMaxMessages')
  return 'backend and database ready'
})

await warnable('GET /ready', async () => {
  const readyResponse = await readReadyPayload()
  const ready = readyResponse.payload
  if (!readyResponse.ok || !ready.ok || ready.readiness?.status !== 'ready') {
    const failures = ready.readiness?.failures ?? []
    const reason = failures.join(', ') || `status ${readyResponse.status}`
    if (live && isOnlyLiveVerificationFailure(failures)) {
      return {
        ok: false,
        detail: `readiness is waiting for live provider verification; continuing provider smoke so verification flags can be set after success (${reason})`,
      }
    }
    throw new Error(`not ready: ${reason}`)
  }
  return { ok: true, detail: 'readiness gate ready' }
})

const characters = await runRequired('GET /characters', async () => {
  const payload = await readJson<{ characters?: Array<{ id: string; name: string }> }>('/characters?view=admin&limit=10', {
    headers: authHeaders,
  })
  if (!payload.characters?.length) throw new Error('no characters returned')
  return payload.characters
})

const primaryCharacter = characters.find((character) => character.name.includes('MIKA')) ?? characters[0]

await check('GET /characters/:id', async () => {
  const payload = await readJson<{ character?: { id: string; name: string } }>(`/characters/${primaryCharacter.id}`, {
    headers: authHeaders,
  })
  if (payload.character?.id !== primaryCharacter.id) throw new Error('wrong character returned')
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
  if (typeof payload.user?.tokenBalance !== 'number') throw new Error('missing tokenBalance')
  if (typeof payload.usage?.totalCost !== 'string') throw new Error('missing totalCost')
  if (!Array.isArray(payload.usage.byModel)) throw new Error('missing usage byModel')
  if (!Array.isArray(payload.usage.daily) || payload.usage.daily.length !== 7) throw new Error('missing 7 day usage trend')
  if (typeof payload.usage.estimate?.averageTokensPerRequest !== 'number') throw new Error('missing usage estimate')
  return `tokenBalance=${payload.user.tokenBalance}, cost=${payload.usage.totalCost}, transactions=${payload.wallet?.transactions?.length ?? 0}`
})

await check('GET /me/content-settings', async () => {
  const payload = await readJson<{ contentSettings?: { maxRating?: string } }>('/me/content-settings', {
    headers: authHeaders,
  })
  if (!payload.contentSettings?.maxRating) throw new Error('missing content settings')
  return payload.contentSettings.maxRating
})

await check('GET/PATCH /me/persona', async () => {
  const current = await readJson<{ persona?: { persona?: string; updatedAt?: string | null; maxChars?: number } }>('/me/persona', {
    headers: authHeaders,
  })
  if (typeof current.persona?.persona !== 'string') throw new Error('missing persona payload')

  const marker = `API smoke persona ${Date.now()}`
  const saved = await readJson<{ persona?: { persona?: string; updatedAt?: string | null; maxChars?: number } }>('/me/persona', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ persona: marker }),
  })
  if (saved.persona?.persona !== marker) throw new Error('persona was not saved')
  if (!saved.persona.updatedAt) throw new Error('persona updatedAt missing')

  await readJson<{ persona?: { persona?: string } }>('/me/persona', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ persona: current.persona.persona }),
  })

  return `maxChars=${saved.persona.maxChars ?? 'unknown'}`
})

await check('GET /relationship/presets', async () => {
  const payload = await readJson<{ presets?: unknown[] }>('/relationship/presets')
  if (payload.presets?.length !== 24) throw new Error(`all presets expected 24, got ${payload.presets?.length ?? 0}`)
  const contractPayload = await readJson<{ presets?: Array<{ id?: string; surfaces?: string[] }> }>('/relationship/presets?surface=contract')
  const creatorPayload = await readJson<{ presets?: Array<{ id?: string; surfaces?: string[] }> }>('/relationship/presets?surface=creator')
  if (contractPayload.presets?.length !== 19) throw new Error(`contract presets expected 19, got ${contractPayload.presets?.length ?? 0}`)
  if (creatorPayload.presets?.length !== 24) throw new Error(`creator presets expected 24, got ${creatorPayload.presets?.length ?? 0}`)
  if (!contractPayload.presets.some((preset) => preset.id === 'soulmate')) throw new Error('contract presets missing soulmate')
  if (contractPayload.presets.some((preset) => preset.id === 'safe-family-bond')) throw new Error('contract presets include creator-only preset')
  if (!creatorPayload.presets.some((preset) => preset.id === 'safe-family-bond')) throw new Error('creator presets missing safe-family-bond')
  if (!contractPayload.presets.every((preset) => preset.surfaces?.includes('contract'))) throw new Error('contract preset surface missing')
  if (!creatorPayload.presets.every((preset) => preset.surfaces?.includes('creator'))) throw new Error('creator preset surface missing')
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
  if (!payload.preview?.turns?.length) throw new Error('preview returned no turns')
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
  if (!payload.seed?.route) throw new Error('missing relationship seed route')
  if (!Array.isArray(payload.issues)) throw new Error('missing relationship validation issues')
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
    if (!characterId) throw new Error('character create did not return id')
    createdCharacterIds.push(characterId)

    const loaded = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}`, { headers: authHeaders })
    if (loaded.character?.id !== characterId) throw new Error('created character could not be loaded')

    const patchedTagline = `แก้ไขโดย API smoke ${marker}`
    const patched = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        tagline: patchedTagline,
        tags: ['api-smoke', 'thai', 'slow-burn', 'scene-ready'],
      }),
    })
    if (patched.character?.tagline !== patchedTagline) throw new Error('character patch did not persist tagline')
    if (!patched.character.tags?.includes('scene-ready')) throw new Error('character patch did not persist tags')

    const viewed = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/view`, {
      method: 'POST',
      headers: authHeaders,
    })
    if (typeof viewed.character?.viewCount !== 'number') throw new Error('view endpoint did not return viewCount')

    const favorited = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ favorite: true }),
    })
    if (!favorited.character?.isFavorite) throw new Error('favorite endpoint did not mark character as favorite')

    const unfavorited = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/favorite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({ favorite: false }),
    })
    if (unfavorited.character?.isFavorite) throw new Error('favorite endpoint did not remove favorite')

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
    if (!createdLoreId) throw new Error('lore create did not return id')

    const patchedLore = await readJson<{ loreEntry?: SmokeLoreEntry }>(`/lore/${createdLoreId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        content: 'Lore ชั่วคราวถูกแก้ไขแล้วโดย API smoke',
        priority: 4,
      }),
    })
    if (patchedLore.loreEntry?.priority !== 4) throw new Error('lore patch did not persist priority')

    const deletedLore = await readJson<{ ok?: boolean }>(`/lore/${createdLoreId}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    if (!deletedLore.ok) throw new Error('lore delete endpoint returned ok=false')
    createdLoreId = null

    const duplicated = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/duplicate`, {
      method: 'POST',
      headers: authHeaders,
    })
    const duplicatedId = duplicated.character?.id
    if (!duplicatedId || duplicatedId === characterId) throw new Error('duplicate endpoint did not return a new character id')
    createdCharacterIds.push(duplicatedId)

    const reset = await readJson<{ character?: SmokeCharacter }>(`/characters/${characterId}/reset-prompt`, {
      method: 'POST',
      headers: authHeaders,
    })
    if (reset.character?.id !== characterId) throw new Error('reset prompt returned the wrong character')
    if (!reset.character.systemPrompt) throw new Error('reset prompt did not return systemPrompt')

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
  const payload = await readJson<{
    source?: string
    draft?: { name?: string; greeting?: string }
    image?: { provider?: string; note?: string }
    warnings?: string[]
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
  if (!payload.draft?.name || !payload.draft.greeting) throw new Error('draft missing required text fields')
  const imageProvider = payload.image?.provider ?? 'missing'
  const detail = `source=${payload.source ?? 'unknown'}, image=${imageProvider}`
  if (imageProvider !== 'configured') {
    const issue = creatorImageIssue(payload)
    if (requireLiveImage) throw new Error(issue)
    if (!live) {
      return {
        ok: true,
        detail: `${detail}; provider skipped for local smoke`,
      }
    }
    return {
      ok: false,
      detail: `${detail}; ${issue}`,
    }
  }
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
      message: 'chat validation smoke should never call the live provider',
      history: [],
    }),
  })

  if (!payload.reply?.includes('Invalid character id')) throw new Error('chat validation did not return invalid character id')
  if (payload.chatId !== null && payload.chatId !== undefined) throw new Error('chat validation should not return a chatId')
  if ((payload.usage?.totalTokens ?? 0) !== 0) throw new Error('chat validation path should not use tokens')
  if (payload.usage?.providerFailure) throw new Error(`chat validation path returned provider failure: ${payload.usage.providerFailure.code}`)
  return 'invalid character id rejected before provider call'
})

if (live) {
  await check('POST /chat', async () => {
    const minSmokeTokenBalance = parseMinSmokeTokenBalance()
    const wallet = await readJson<{ user?: { tokenBalance?: number } }>('/me/usage', { headers: authHeaders })
    if ((wallet.user?.tokenBalance ?? 0) < minSmokeTokenBalance) {
      throw new Error(
        `Smoke user has ${wallet.user?.tokenBalance ?? 0} tokens, below SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=${minSmokeTokenBalance}. Top up the smoke user before running live API smoke.`,
      )
    }

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
    if (!payload.reply) throw new Error('chat provider returned empty reply')
    if (payload.usage?.providerFailure) {
      throw new Error(providerFailureIssue(payload.usage.providerFailure))
    }
    if (!payload.chatId) throw new Error('missing chatId')
    if (!payload.usage?.totalTokens) throw new Error('missing token usage')
    const minRoleplayReplyChars = Math.max(320, healthStatus?.model?.minRoleplayReplyChars ?? 320)
    if (payload.reply.length < minRoleplayReplyChars) {
      throw new Error(`reply too short for roleplay QA; expected at least ${minRoleplayReplyChars} chars: ${payload.reply}`)
    }
    return `chatId=${payload.chatId}, tokens=${payload.usage.totalTokens}, minBalance=${minSmokeTokenBalance}, replyChars=${payload.reply.length}, minRoleplayReplyChars=${minRoleplayReplyChars}`
  })
} else {
  record('POST /chat', 'skip', 'live model call skipped; run `bun run api:smoke:live`')
}

await check('POST /chat/stream', async () => {
  const events = await readStreamEvents('/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      characterId: "' OR 1=1 --",
      message: 'stream validation smoke should never call the live provider',
      history: [],
    }),
  })

  const delta = events.find((event): event is Extract<StreamSmokeEvent, { type: 'delta' }> => event.type === 'delta')
  const done = events.find((event): event is Extract<StreamSmokeEvent, { type: 'done' }> => event.type === 'done')
  if (!delta?.content?.includes('Invalid character id')) throw new Error('stream did not return validation delta')
  if (!done) throw new Error('stream did not return done event')
  if ((done.usage?.totalTokens ?? 0) !== 0) throw new Error('stream validation path should not use tokens')
  if (done.usage?.providerFailure) throw new Error(`stream validation path returned provider failure: ${done.usage.providerFailure.code}`)
  return `${events.length} SSE events, validation path uncharged`
})

const activeChats = await runRequired('GET /chats', async () => {
  const payload = await readJson<{ chats?: ChatSummary[] }>('/chats', { headers: authHeaders })
  if (!payload.chats) throw new Error('missing chats array')
  return payload.chats
})

await check('GET /chats?archived=true', async () => {
  const payload = await readJson<{ chats?: ChatSummary[] }>('/chats?archived=true', { headers: authHeaders })
  if (!payload.chats) throw new Error('missing archived chats array')
  return `${payload.chats.length} archived chats`
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
      if (renamed.chat?.id !== chat.id || renamed.chat.title !== smokeTitle) throw new Error('chat title was not updated')

      const restoredTitle = await readJson<{ chat?: { id?: string; title?: string | null } }>(`/chats/${chat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ title: originalTitle }),
      })
      if (restoredTitle.chat?.id !== chat.id || restoredTitle.chat.title !== originalTitle) {
        throw new Error('chat title was not restored')
      }
      titleRestored = true

      const archived = await readJson<{ ok?: boolean }>(`/chats/${chat.id}/archive`, {
        method: 'PATCH',
        headers: authHeaders,
      })
      if (!archived.ok) throw new Error('archive endpoint returned ok=false')
      chatArchived = true

      const archivedList = await readJson<{ chats?: ChatSummary[] }>('/chats?archived=true', { headers: authHeaders })
      const archivedChat = archivedList.chats?.find((item) => item.id === chat.id)
      if (!archivedChat?.isArchived) throw new Error('archived chat was not returned by archived list')

      const restored = await readJson<{ ok?: boolean }>(`/chats/${chat.id}/restore`, {
        method: 'PATCH',
        headers: authHeaders,
      })
      if (!restored.ok) throw new Error('restore endpoint returned ok=false')
      chatArchived = false

      const activeList = await readJson<{ chats?: ChatSummary[] }>('/chats', { headers: authHeaders })
      if (!activeList.chats?.some((item) => item.id === chat.id && !item.isArchived)) {
        throw new Error('restored chat was not returned by active list')
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

    return 'rename, archive, and restore worked'
  })

  await check('GET /chats/:id/messages', async () => {
    const payload = await readJson<{ chat?: { id?: string; messages?: unknown[] } }>(`/chats/${activeChats[0].id}/messages`, {
      headers: authHeaders,
    })
    if (payload.chat?.id !== activeChats[0].id) throw new Error('wrong chat returned')
    if (!Array.isArray(payload.chat.messages)) throw new Error('missing messages array')
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
        sceneNotes: ['API smoke should persist world state without changing messages.'],
      }),
    })
    if (patchPayload.chatId !== activeChats[0].id) throw new Error('world state patch returned wrong chat')
    if (patchPayload.worldState?.location !== location) throw new Error('world state location was not patched')
    if (!patchPayload.worldState.sceneNotes?.length) throw new Error('world state notes were not patched')

    const getPayload = await readJson<{
      chatId?: string
      worldState?: { location?: string; mood?: string }
    }>(`/chats/${activeChats[0].id}/world-state`, {
      headers: authHeaders,
    })
    if (getPayload.chatId !== activeChats[0].id) throw new Error('world state get returned wrong chat')
    if (getPayload.worldState?.location !== location) throw new Error('world state get did not return patched location')
    return getPayload.worldState.mood ?? 'world-state-updated'
  })
} else {
  record('GET /chats/:id/messages', 'skip', 'no active chats returned')
  record('PATCH/GET /chats/:id/world-state', 'skip', 'no active chats returned')
}

await check('GET /characters/:id/lore', async () => {
  const payload = await readJson<{ loreEntries?: unknown[] }>(`/characters/${primaryCharacter.id}/lore`, {
    headers: authHeaders,
  })
  if (!payload.loreEntries) throw new Error('missing loreEntries array')
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
  if (payload.status !== 400 || payload.payload.error !== 'invalid_character_id') {
    throw new Error(`expected invalid_character_id 400, got ${payload.status} ${payload.payload.error ?? 'unknown'}`)
  }
  return 'SQL-like report character id rejected before persistence'
})

await check('PATCH /me/content-settings', async () => {
  const current = await readJson<{ contentSettings?: { isAdult?: boolean; maxRating?: string } }>('/me/content-settings', {
    headers: authHeaders,
  })
  if (!current.contentSettings?.maxRating) throw new Error('missing current content settings')

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
    throw new Error(`content setting changed unexpectedly: ${nextMaxRating}`)
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
  if (saved.draft?.creatorBrief !== marker) throw new Error('creator draft was not saved')

  await readJson<{ ok: boolean }>('/creator/draft', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({ payload: null }),
  })

  const cleared = await readJson<{ draft?: unknown | null }>('/creator/draft', {
    headers: authHeaders,
  })
  if (cleared.draft !== null) throw new Error('creator draft was not cleared')

  return 'saved and cleared'
})

if (adminHeaders) {
  await check('GET /admin/summary', async () => {
    const payload = await readJson<{ totals?: { users?: number; characters?: number } }>('/admin/summary', {
      headers: adminHeaders,
    })
    if (typeof payload.totals?.users !== 'number') throw new Error('missing admin totals')
    return `users=${payload.totals.users}, characters=${payload.totals.characters ?? 0}`
  })

  await check('PATCH /admin/users/:id/tokens validation', async () => {
    const payload = await readExpectedError('/admin/users/not-a-uuid/tokens', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ amount: 1, reason: 'non-mutating smoke validation' }),
    })
    if (payload.status !== 400 || payload.payload.error !== 'invalid_user_id') {
      throw new Error(`expected invalid_user_id 400, got ${payload.status} ${payload.payload.error ?? 'unknown'}`)
    }
    return 'invalid admin wallet user id rejected before mutation'
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
    if (!payload.snapshot?.redacted) throw new Error('prompt inspector did not return a redacted snapshot')
    if (!payload.snapshot.prompt?.includes('Platform prompt-control policy')) throw new Error('missing prompt-control policy')
    if (!payload.snapshot.sections?.some((section) => section.title === 'Runtime memory')) {
      throw new Error('missing runtime memory section')
    }
    if (!payload.snapshot.totals?.estimatedTokens || !payload.snapshot.totals.sectionCount) {
      throw new Error('missing prompt totals')
    }
    if (!payload.diff || !Array.isArray(payload.diff.changedSections)) throw new Error('missing prompt diff')
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
    if (!payload.passed) throw new Error(`local eval did not pass; failCount=${payload.failCount ?? 'unknown'}`)
    if (!payload.scenarioCount || !payload.results?.length) throw new Error('missing local eval scenarios')
    if (!payload.results.some((result) => result.id === 'prompt-injection-defense' && result.passed)) {
      throw new Error('missing prompt injection eval result')
    }
    return `${payload.passCount ?? payload.results.length}/${payload.scenarioCount} scenarios`
  })

  await check('GET /admin/reports', async () => {
    const payload = await readJson<{ reports?: unknown[] }>('/admin/reports?limit=5', { headers: adminHeaders })
    if (!payload.reports) throw new Error('missing reports array')
    return `${payload.reports.length} reports`
  })

  await check('PATCH/POST /admin/reports validation', async () => {
    const patch = await readExpectedError('/admin/reports/not-a-uuid', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ status: 'REVIEWED' }),
    })
    if (patch.status !== 400 || patch.payload.error !== 'invalid_report_id') {
      throw new Error(`PATCH invalid id expected invalid_report_id 400, got ${patch.status} ${patch.payload.error ?? 'unknown'}`)
    }

    const action = await readExpectedError('/admin/reports/not-a-uuid/actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...adminHeaders },
      body: JSON.stringify({ action: 'ARCHIVE_MESSAGE' }),
    })
    if (action.status !== 400 || action.payload.error !== 'invalid_report_id') {
      throw new Error(`POST action invalid id expected invalid_report_id 400, got ${action.status} ${action.payload.error ?? 'unknown'}`)
    }

    return 'invalid admin report ids rejected before mutation'
  })

  await check('GET /admin/audit-logs', async () => {
    const payload = await readJson<{ logs?: unknown[] }>('/admin/audit-logs?limit=5', { headers: adminHeaders })
    if (!payload.logs) throw new Error('missing audit logs array')
    return `${payload.logs.length} logs`
  })
} else {
  const status: ApiSmokeStatus = requireAdmin ? 'fail' : 'skip'
  const detail = 'SMOKE_ADMIN_API_KEY or local ADMIN_API_KEY was not available'
  record('GET /admin/summary', status, detail)
  record('PATCH /admin/users/:id/tokens validation', status, detail)
  record('POST /admin/prompt-inspector', status, detail)
  record('GET /admin/evals/local', status, detail)
  record('GET /admin/reports', status, detail)
  record('PATCH/POST /admin/reports validation', status, detail)
  record('GET /admin/audit-logs', status, detail)
}

for (const result of results) {
  console.log(`${result.status.toUpperCase()} - ${result.name}: ${result.detail}`)
}

const failed = results.filter((result) => result.status === 'fail')
const warned = results.filter((result) => result.status === 'warn')

console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      apiBaseUrl,
      live,
      requireLiveImage,
      requireAdmin,
      pass: results.filter((result) => result.status === 'pass').length,
      warn: warned.length,
      skip: results.filter((result) => result.status === 'skip').length,
      fail: failed.length,
    },
    null,
    2,
  ),
)

if (failed.length > 0) process.exit(1)

async function runRequired<T>(name: string, fn: () => Promise<T>) {
  try {
    const value = await fn()
    record(name, 'pass', 'ok')
    return value
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    record(name, 'fail', message)
    throw new Error(`${name}: ${message}`)
  }
}

async function bestEffort(name: string, fn: () => Promise<unknown>) {
  try {
    await fn()
  } catch (error) {
    console.warn(`Warning: could not ${name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function readStreamEvents(path: string, init: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, init)
  const raw = await response.text()
  if (!response.ok) throw new Error(`${path} failed with ${response.status}: ${raw.slice(0, 500)}`)
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('text/event-stream')) throw new Error(`${path} did not return an event stream: ${contentType}`)

  const events = raw
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data: '))
    .map((line) => JSON.parse(line.slice('data: '.length)) as StreamSmokeEvent)

  if (events.length === 0) throw new Error(`${path} returned no SSE data events`)
  return events
}

async function readReadyPayload() {
  const response = await fetch(`${apiBaseUrl}/ready`)
  const raw = await response.text()
  const payload = raw ? tryParseJson(raw) : null
  if (!payload || typeof payload !== 'object') {
    throw new Error(`/ready did not return JSON: ${raw.slice(0, 500) || 'empty response'}`)
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
    throw new Error(`${path} did not return a JSON error payload: ${raw.slice(0, 500) || 'empty response'}`)
  }

  if (response.ok) throw new Error(`${path} unexpectedly succeeded`)

  return {
    status: response.status,
    payload: parsed as { error?: string },
  }
}

function creatorImageIssue(payload: { image?: { note?: string }; warnings?: string[] }) {
  const warnings = payload.warnings?.filter(Boolean).join('; ')
  const issue = warnings || payload.image?.note || 'image provider did not return a generated image'
  return `${issue}${providerFailureHint(issue)}`
}

function tryParseJson(value: string) {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function providerFailureHint(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('billing_hard_limit_reached') || normalized.includes('billing hard limit')) {
    return ' | Fix: increase or reset the image provider billing limit, then rerun `bun run api:smoke:live`.'
  }
  if (normalized.includes('insufficient_quota') || normalized.includes('quota')) {
    return ' | Fix: add image provider credits/quota, then rerun `bun run api:smoke:live`.'
  }
  if (normalized.includes('401') || normalized.includes('403') || normalized.includes('invalid api key')) {
    return ' | Fix: replace IMAGE_GENERATION_API_KEY/OPENAI_API_KEY with a valid backend-only image provider key.'
  }
  if (normalized.includes('model')) {
    return ' | Fix: check IMAGE_GENERATION_MODEL and whether the provider account can use that image model.'
  }
  return ''
}

function providerFailureIssue(failure: { code?: string; retryable?: boolean; userMessage?: string }) {
  const userMessage = failure.userMessage ? ` Message: ${failure.userMessage}` : ''
  const retry = failure.retryable ? ' Retryable after cooldown.' : ' Requires configuration/quota/admin fix.'
  return `chat provider failure: ${failure.code ?? 'unknown'}.${retry}${userMessage} Fix: check OpenRouter key, provider credits/quota, rate limits, model access, and outbound network before setting CHAT_PROVIDER_LIVE_VERIFIED=1.`
}

function isOnlyLiveVerificationFailure(failures: string[]) {
  return (
    failures.length > 0 &&
    failures.every((failure) => {
      const normalized = failure.toLowerCase()
      return (
        normalized.includes('chat provider live smoke has not been verified') ||
        normalized.includes('image generation live smoke has not been verified')
      )
    })
  )
}

function parseMinSmokeTokenBalance() {
  const rawValue = process.env.SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT ?? '1000'
  const value = Number(rawValue)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT must be a positive integer. Received: ${rawValue}`)
  }

  return value
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
