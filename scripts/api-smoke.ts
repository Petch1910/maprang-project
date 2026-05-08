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
}

const live = process.argv.includes('--live')
const requireLiveImage = process.argv.includes('--require-live-image')
const results: ApiSmokeResult[] = []

const authHeaders = smokeAuthHeaders()
const adminKey = await loadAdminKey()
const adminHeaders = adminKey ? { ...authHeaders, 'x-admin-key': adminKey } : null

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
  const health = await readJson<{ ok: boolean; checks?: { databaseConnected?: boolean } }>('/health')
  if (!health.ok) throw new Error('health ok=false')
  if (!health.checks?.databaseConnected) throw new Error('databaseConnected=false')
  return 'backend and database ready'
})

await check('GET /ready', async () => {
  const ready = await readJson<{ ok: boolean; readiness?: { status?: string; failures?: string[] } }>('/ready')
  if (!ready.ok || ready.readiness?.status !== 'ready') {
    throw new Error(`not ready: ${(ready.readiness?.failures ?? []).join(', ') || 'unknown failure'}`)
  }
  return 'readiness gate ready'
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
  const payload = await readJson<{ user?: { tokenBalance?: number }; wallet?: { transactions?: unknown[] } }>('/me/usage', {
    headers: authHeaders,
  })
  if (typeof payload.user?.tokenBalance !== 'number') throw new Error('missing tokenBalance')
  return `tokenBalance=${payload.user.tokenBalance}, transactions=${payload.wallet?.transactions?.length ?? 0}`
})

await check('GET /me/content-settings', async () => {
  const payload = await readJson<{ contentSettings?: { maxRating?: string } }>('/me/content-settings', {
    headers: authHeaders,
  })
  if (!payload.contentSettings?.maxRating) throw new Error('missing content settings')
  return payload.contentSettings.maxRating
})

await check('GET /relationship/presets', async () => {
  const payload = await readJson<{ presets?: unknown[] }>('/relationship/presets')
  if (!payload.presets?.length) throw new Error('no presets returned')
  return `${payload.presets.length} presets`
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
    return {
      ok: false,
      detail: `${detail}; ${issue}`,
    }
  }
  return { ok: true, detail }
})

if (live) {
  await check('POST /chat', async () => {
    const wallet = await readJson<{ user?: { tokenBalance?: number } }>('/me/usage', { headers: authHeaders })
    if ((wallet.user?.tokenBalance ?? 0) < 1) throw new Error('smoke user has no tokens')

    const payload = await readJson<{ reply?: string; chatId?: string; usage?: { totalTokens?: number } }>('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        characterId: primaryCharacter.id,
        relationshipSeed: 'stranger',
        maxRating: 'restricted_18',
        history: [],
        message:
          'ฉันนั่งลงตรงข้ามเธอ แล้วถามเบาๆว่า วันนี้ดูเหนื่อยนะ เกิดอะไรขึ้นหรือเปล่า ช่วยตอบเป็นฉากสั้นๆ 2 ย่อหน้า',
      }),
    })
    if (!payload.reply || payload.reply.includes('temporarily unavailable')) throw new Error('chat provider returned fallback')
    if (!payload.chatId) throw new Error('missing chatId')
    if (!payload.usage?.totalTokens) throw new Error('missing token usage')
    if (payload.reply.length < 80) throw new Error(`reply too short: ${payload.reply}`)
    return `chatId=${payload.chatId}, tokens=${payload.usage.totalTokens}, replyChars=${payload.reply.length}`
  })
} else {
  record('POST /chat', 'skip', 'live model call skipped; run `bun run api:smoke:live`')
}

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
  await check('GET /chats/:id/messages', async () => {
    const payload = await readJson<{ chat?: { id?: string; messages?: unknown[] } }>(`/chats/${activeChats[0].id}/messages`, {
      headers: authHeaders,
    })
    if (payload.chat?.id !== activeChats[0].id) throw new Error('wrong chat returned')
    if (!Array.isArray(payload.chat.messages)) throw new Error('missing messages array')
    return `${payload.chat.messages.length} messages`
  })
} else {
  record('GET /chats/:id/messages', 'skip', 'no active chats returned')
}

await check('GET /characters/:id/lore', async () => {
  const payload = await readJson<{ loreEntries?: unknown[] }>(`/characters/${primaryCharacter.id}/lore`, {
    headers: authHeaders,
  })
  if (!payload.loreEntries) throw new Error('missing loreEntries array')
  return `${payload.loreEntries.length} lore entries`
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
  if (payload.contentSettings?.maxRating !== current.contentSettings.maxRating) {
    throw new Error(`content setting changed unexpectedly: ${payload.contentSettings?.maxRating}`)
  }
  return payload.contentSettings.maxRating
})

if (adminHeaders) {
  await check('GET /admin/summary', async () => {
    const payload = await readJson<{ totals?: { users?: number; characters?: number } }>('/admin/summary', {
      headers: adminHeaders,
    })
    if (typeof payload.totals?.users !== 'number') throw new Error('missing admin totals')
    return `users=${payload.totals.users}, characters=${payload.totals.characters ?? 0}`
  })

  await check('GET /admin/reports', async () => {
    const payload = await readJson<{ reports?: unknown[] }>('/admin/reports?limit=5', { headers: adminHeaders })
    if (!payload.reports) throw new Error('missing reports array')
    return `${payload.reports.length} reports`
  })

  await check('GET /admin/audit-logs', async () => {
    const payload = await readJson<{ logs?: unknown[] }>('/admin/audit-logs?limit=5', { headers: adminHeaders })
    if (!payload.logs) throw new Error('missing audit logs array')
    return `${payload.logs.length} logs`
  })
} else {
  record('GET /admin/summary', 'skip', 'SMOKE_ADMIN_API_KEY or local ADMIN_API_KEY was not available')
  record('GET /admin/reports', 'skip', 'SMOKE_ADMIN_API_KEY or local ADMIN_API_KEY was not available')
  record('GET /admin/audit-logs', 'skip', 'SMOKE_ADMIN_API_KEY or local ADMIN_API_KEY was not available')
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

function creatorImageIssue(payload: { image?: { note?: string }; warnings?: string[] }) {
  const warnings = payload.warnings?.filter(Boolean).join('; ')
  return warnings || payload.image?.note || 'image provider did not return a generated image'
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
