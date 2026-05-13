import { apiBaseUrl, readJson, smokeAuthHeaders } from './smoke-helpers'

const minSmokeTokenBalance = parseMinSmokeTokenBalance()

const health = await readJson<{
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  model?: { name: string; minRoleplayReplyChars?: number }
}>('/health')
const minRoleplayReplyChars = Math.max(320, health.model?.minRoleplayReplyChars ?? 320)

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
  usage?: {
    totalTokens?: number
    modelName?: string
    providerFailure?: { code?: string; retryable?: boolean; userMessage?: string }
  }
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
      'ฉันนั่งลงตรงข้ามเธอแล้ววางแก้วชาไว้ใกล้มือเธอ ก่อนถามเบาๆว่า วันนี้ดูเหนื่อยนะ เกิดอะไรขึ้นหรือเปล่า เล่าเป็นฉากโรลเพลย์ที่มีบรรยากาศ ความรู้สึก และจังหวะให้ฉันตอบต่อ',
  }),
})

if (!chat.reply) {
  throw new Error('Live chat did not return an AI reply: empty reply')
}

if (chat.usage?.providerFailure) {
  throw new Error(providerFailureIssue(chat.usage.providerFailure))
}

if (!chat.chatId) throw new Error('Live chat did not create a chat id')
if (!chat.usage?.totalTokens) throw new Error('Live chat did not return token usage')
if (chat.reply.length < minRoleplayReplyChars) {
  throw new Error(`Live chat reply is too short for roleplay QA. Expected at least ${minRoleplayReplyChars} characters. Reply: ${chat.reply}`)
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
      chatId: chat.chatId,
      model: chat.usage.modelName ?? health.model?.name ?? null,
      totalTokens: chat.usage.totalTokens,
      walletTransactionId: chatDebit.id,
      balanceAfter: chatDebit.balanceAfter,
      replyChars: chat.reply.length,
      minRoleplayReplyChars,
      nextStep: 'Set CHAT_PROVIDER_LIVE_VERIFIED=1 in this target environment, then rerun production:check.',
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

function providerFailureIssue(failure: { code?: string; retryable?: boolean; userMessage?: string }) {
  const userMessage = failure.userMessage ? ` Message: ${failure.userMessage}` : ''
  const retry = failure.retryable ? ' Retryable after cooldown.' : ' Requires configuration/quota/admin fix.'
  return `Live chat reached the backend, but the AI provider returned ${failure.code ?? 'unknown'}.${retry}${userMessage} Check outbound network access to OpenRouter, OPENROUTER_API_KEY, provider credits/quota, rate limits, model access, and backend logs before setting CHAT_PROVIDER_LIVE_VERIFIED=1.`
}
