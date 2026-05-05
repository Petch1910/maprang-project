import { apiBaseUrl, readJson, smokeAuthHeaders } from './smoke-helpers'

const health = await readJson<{
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  model?: { name: string }
}>('/health')

if (!health.ok || !health.checks.databaseConnected) {
  throw new Error('Backend health check failed')
}

if (!health.checks.openRouterConfigured) {
  throw new Error('OpenRouter is not configured on the backend')
}

const characters = await readJson<{
  characters?: Array<{ id: string; name: string }>
}>('/characters?view=admin&q=Maprang&limit=5', {
  headers: smokeAuthHeaders(),
})

const maprang = characters.characters?.find((character) => character.name === 'Maprang')
if (!maprang) throw new Error('Seeded Maprang character was not found')

const chat = await readJson<{
  reply?: string
  chatId?: string | null
  usage?: { totalTokens?: number; modelName?: string }
}>('/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...smokeAuthHeaders(),
  },
  body: JSON.stringify({
    characterId: maprang.id,
    message: 'Reply with a very short Thai greeting.',
  }),
})

if (!chat.reply || chat.reply.includes('temporarily unavailable')) {
  throw new Error(`Live chat did not return an AI reply: ${chat.reply ?? 'empty reply'}`)
}

if (!chat.chatId) throw new Error('Live chat did not create a chat id')
if (!chat.usage?.totalTokens) throw new Error('Live chat did not return token usage')

console.log(
  JSON.stringify(
    {
      ok: true,
      apiBaseUrl,
      character: maprang.name,
      model: chat.usage.modelName ?? health.model?.name ?? null,
      totalTokens: chat.usage.totalTokens,
      replyPreview: chat.reply.slice(0, 120),
    },
    null,
    2,
  ),
)
