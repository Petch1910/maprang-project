import { apiBaseUrl, readJson, smokeAuthHeaders } from './smoke-helpers'

const minSmokeTokenBalance = parseMinSmokeTokenBalance()

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
}>('/characters?view=admin&limit=10', {
  headers: smokeAuthHeaders(),
})

const smokeCharacter =
  characters.characters?.find((character) => character.name.includes('MIKA')) ??
  characters.characters?.find((character) => character.name === 'Maprang') ??
  characters.characters?.[0]
if (!smokeCharacter) throw new Error('Seeded smoke character was not found')

const walletBefore = await readJson<{
  user: { tokenBalance: number }
}>('/me/usage', {
  headers: smokeAuthHeaders(),
})

if (walletBefore.user.tokenBalance < minSmokeTokenBalance) {
  throw new Error(
    `Smoke user has ${walletBefore.user.tokenBalance} tokens, below SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=${minSmokeTokenBalance}. Top up the smoke user before running live chat smoke.`,
  )
}

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
    characterId: smokeCharacter.id,
    relationshipSeed: 'stranger',
    maxRating: 'restricted_18',
    history: [],
    message:
      'ฉันนั่งลงตรงข้ามเธอ แล้วถามเบาๆว่า วันนี้ดูเหนื่อยนะ เกิดอะไรขึ้นหรือเปล่า ช่วยตอบเป็นฉากสั้นๆ 2 ย่อหน้า',
  }),
})

if (!chat.reply) {
  throw new Error('Live chat did not return an AI reply: empty reply')
}

if (chat.reply.includes('temporarily unavailable')) {
  throw new Error(
    `Live chat reached the backend, but the AI provider path returned the fallback message. Check outbound network access to OpenRouter, OPENROUTER_API_KEY, and backend logs. Reply: ${chat.reply}`,
  )
}

if (!chat.chatId) throw new Error('Live chat did not create a chat id')
if (!chat.usage?.totalTokens) throw new Error('Live chat did not return token usage')
if (chat.reply.length < 80) {
  throw new Error(`Live chat reply is too short for roleplay QA. Reply: ${chat.reply}`)
}

const walletAfter = await readJson<{
  wallet?: {
    transactions?: Array<{
      id: string
      type: string
      amount: number
      balanceAfter: number
    }>
  }
}>('/me/usage', {
  headers: smokeAuthHeaders(),
})

const chatDebit = walletAfter.wallet?.transactions?.find(
  (transaction) => transaction.type === 'CHAT_USAGE' && transaction.amount === -chat.usage!.totalTokens,
)

if (!chatDebit) {
  throw new Error('Live chat returned token usage, but no matching CHAT_USAGE wallet transaction was found')
}

console.log(
  JSON.stringify(
    {
      ok: true,
      apiBaseUrl,
      character: smokeCharacter.name,
      model: chat.usage.modelName ?? health.model?.name ?? null,
      totalTokens: chat.usage.totalTokens,
      walletTransactionId: chatDebit.id,
      balanceAfter: chatDebit.balanceAfter,
      replyChars: chat.reply.length,
      replyPreview: chat.reply.slice(0, 120),
    },
    null,
    2,
  ),
)

function parseMinSmokeTokenBalance() {
  const rawValue = process.env.SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT ?? '1000'
  const value = Number(rawValue)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT must be a positive integer. Received: ${rawValue}`)
  }

  return value
}
