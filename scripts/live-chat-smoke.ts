import {
  apiBaseUrl,
  readJson,
  smokeAuthHeaders,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'

type ProviderFailure = { code?: string; retryable?: boolean; userMessage?: string }

export type LiveChatSmokeHealthPayload = {
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  model?: { name: string; minRoleplayReplyChars?: number }
}

export type LiveChatSmokeCharacter = {
  id: string
  name: string
}

export type LiveChatSmokeResponse = {
  reply?: string
  chatId?: string | null
  usage?: {
    totalTokens?: number
    modelName?: string
    providerFailure?: ProviderFailure
  }
}

export type LiveChatWalletTransaction = {
  id: string
  type: string
  amount: number
  balanceAfter: number
}

export type LiveChatSmokeJsonReader = <T>(path: string, init?: RequestInit) => Promise<T>

export type LiveChatSmokeRunnerOptions = {
  env?: Record<string, string | undefined>
  apiBaseUrl?: string
  readJson?: LiveChatSmokeJsonReader
  readRootIdentity?: () => Promise<RootIdentityPayload>
  authHeaders?: () => Record<string, string>
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function parseMinSmokeTokenBalance(rawValue = process.env.SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT ?? '1000') {
  const value = Number(rawValue)

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT must be a positive integer. Received: ${rawValue}`)
  }

  return value
}

export function providerFailureIssue(failure: ProviderFailure) {
  const userMessage = failure.userMessage ? ` Message: ${failure.userMessage}` : ''
  const retry = failure.retryable ? ' Retryable after cooldown.' : ' Requires configuration/quota/admin fix.'
  return `Live chat reached the backend, but the AI provider returned ${failure.code ?? 'unknown'}.${retry}${userMessage} Check outbound network access to OpenRouter, OPENROUTER_API_KEY, provider credits/quota, rate limits, model access, and backend logs before setting CHAT_PROVIDER_LIVE_VERIFIED=1.`
}

export function selectLiveChatSmokeCharacter(characters: LiveChatSmokeCharacter[]) {
  return (
    characters.find((character) => character.name.includes('MIKA')) ??
    characters.find((character) => character.name === 'Maprang') ??
    characters[0] ??
    null
  )
}

export function assertSmokeUserHasTokenBalance(tokenBalance: number, minSmokeTokenBalance: number) {
  if (tokenBalance < minSmokeTokenBalance) {
    throw new Error(
      `Smoke user has ${tokenBalance} tokens, below SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=${minSmokeTokenBalance}. Top up the smoke user before running live chat smoke.`,
    )
  }
}

export function validateLiveChatSmokeResponse(chat: LiveChatSmokeResponse, minRoleplayReplyChars: number) {
  if (chat.usage?.providerFailure) {
    throw new Error(providerFailureIssue(chat.usage.providerFailure))
  }

  if (!chat.reply) {
    throw new Error('Live chat did not return an AI reply: empty reply')
  }

  if (!chat.chatId) throw new Error('Live chat did not create a chat id')
  if (!chat.usage?.totalTokens) throw new Error('Live chat did not return token usage')
  if (chat.reply.length < minRoleplayReplyChars) {
    throw new Error(`Live chat reply is too short for roleplay QA. Expected at least ${minRoleplayReplyChars} characters. Reply: ${chat.reply}`)
  }

  return {
    chatId: chat.chatId,
    modelName: chat.usage.modelName ?? null,
    reply: chat.reply,
    replyChars: chat.reply.length,
    totalTokens: chat.usage.totalTokens,
  }
}

export function findMatchingChatDebit(transactions: LiveChatWalletTransaction[] | undefined, totalTokens: number) {
  return transactions?.find((transaction) => transaction.type === 'CHAT_USAGE' && transaction.amount === -totalTokens) ?? null
}

export function buildLiveChatSmokePayload({
  baseUrl = apiBaseUrl,
  characterName,
  chatId,
  model,
  totalTokens,
  chatDebit,
  reply,
  minRoleplayReplyChars,
}: {
  baseUrl?: string
  characterName: string
  chatId: string
  model: string | null
  totalTokens: number
  chatDebit: LiveChatWalletTransaction
  reply: string
  minRoleplayReplyChars: number
}) {
  return {
    ok: true,
    apiBaseUrl: baseUrl,
    character: characterName,
    chatId,
    model,
    totalTokens,
    walletTransactionId: chatDebit.id,
    balanceAfter: chatDebit.balanceAfter,
    replyChars: reply.length,
    minRoleplayReplyChars,
    nextStep: 'Set CHAT_PROVIDER_LIVE_VERIFIED=1 in this target environment, then rerun production:check.',
    replyPreview: reply.slice(0, 120),
  }
}

export async function runLiveChatSmoke(options: LiveChatSmokeRunnerOptions = {}) {
  const env = options.env ?? process.env
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const jsonReader = options.readJson ?? readJson
  const authHeaders = options.authHeaders ?? smokeAuthHeaders
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  try {
    const minSmokeTokenBalance = parseMinSmokeTokenBalance(env.SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT ?? '1000')

    validateBackendRootIdentity(await (options.readRootIdentity ?? (() => jsonReader<RootIdentityPayload>('/')))())

    const health = await jsonReader<LiveChatSmokeHealthPayload>('/health')
    const minRoleplayReplyChars = Math.max(420, health.model?.minRoleplayReplyChars ?? 420)

    if (!health.ok || !health.checks.databaseConnected) {
      throw new Error('Backend health check failed')
    }

    if (!health.checks.openRouterConfigured) {
      throw new Error('OpenRouter is not configured on the backend')
    }

    const characters = await jsonReader<{
      characters?: LiveChatSmokeCharacter[]
    }>('/characters?view=admin&limit=10', {
      headers: authHeaders(),
    })

    const smokeCharacter = selectLiveChatSmokeCharacter(characters.characters ?? [])
    if (!smokeCharacter) throw new Error('Seeded smoke character was not found')

    const walletBefore = await jsonReader<{
      user: { tokenBalance: number }
    }>('/me/usage', {
      headers: authHeaders(),
    })

    assertSmokeUserHasTokenBalance(walletBefore.user.tokenBalance, minSmokeTokenBalance)

    const chat = await jsonReader<LiveChatSmokeResponse>('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        characterId: smokeCharacter.id,
        relationshipSeed: 'stranger',
        maxRating: 'restricted_18',
        history: [],
        message:
          'I sit across from you, set a cup of tea near your hand, and softly ask what has been weighing on you today. Reply as an atmospheric roleplay scene with feeling, pacing, and room for me to answer.',
      }),
    })
    const chatResult = validateLiveChatSmokeResponse(chat, minRoleplayReplyChars)

    const walletAfter = await jsonReader<{
      wallet?: {
        transactions?: LiveChatWalletTransaction[]
      }
    }>('/me/usage', {
      headers: authHeaders(),
    })

    const chatDebit = findMatchingChatDebit(walletAfter.wallet?.transactions, chatResult.totalTokens)

    if (!chatDebit) {
      throw new Error('Live chat returned token usage, but no matching CHAT_USAGE wallet transaction was found')
    }

    writeLine(
      JSON.stringify(
        buildLiveChatSmokePayload({
          baseUrl: currentApiBaseUrl,
          characterName: smokeCharacter.name,
          chatId: chatResult.chatId,
          model: chatResult.modelName ?? health.model?.name ?? null,
          totalTokens: chatResult.totalTokens,
          chatDebit,
          reply: chatResult.reply,
          minRoleplayReplyChars,
        }),
        null,
        2,
      ),
    )
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`Live chat smoke failed: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runLiveChatSmoke())
