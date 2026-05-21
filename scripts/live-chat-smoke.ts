import {
  apiBaseUrl,
  formatDiagnosticText,
  formatUnknownDiagnosticText,
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
    throw new Error(`SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT ต้องเป็นจำนวนเต็มบวก ค่าที่ได้รับ: ${rawValue}`)
  }

  return value
}

export function providerFailureIssue(failure: ProviderFailure) {
  const safeUserMessage = failure.userMessage ? formatDiagnosticText(failure.userMessage, 300) : ''
  const userMessage = safeUserMessage ? ` ข้อความจากผู้ให้บริการ: ${safeUserMessage}` : ''
  const retry = failure.retryable ? ' ลองใหม่ได้หลังช่วงพัก' : ' ต้องแก้การตั้งค่า, โควตา หรือสิทธิ์ผู้ดูแลก่อน'
  const code = failure.code ?? 'ไม่ทราบรหัส'
  return `ตรวจแชทจริงติดต่อระบบหลังบ้านได้แล้ว แต่ผู้ให้บริการ AI คืน ${code}.${retry}${userMessage} ตรวจการเชื่อมต่อออกไป OpenRouter, OPENROUTER_API_KEY, เครดิต/โควตาของผู้ให้บริการ, ข้อจำกัดอัตราการเรียก, สิทธิ์เข้าถึงโมเดล, และ log ระบบหลังบ้านก่อนตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1`
}

export function formatLiveChatSmokeCaughtError(error: unknown) {
  return formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
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
      `ผู้ใช้ smoke มี ${tokenBalance} token ซึ่งต่ำกว่า SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT=${minSmokeTokenBalance} เติมโทเคนให้ผู้ใช้ smoke ก่อนรันทดสอบแชทจริง`,
    )
  }
}

export function validateLiveChatSmokeResponse(chat: LiveChatSmokeResponse, minRoleplayReplyChars: number) {
  if (chat.usage?.providerFailure) {
    throw new Error(providerFailureIssue(chat.usage.providerFailure))
  }

  if (!chat.reply) {
    throw new Error('ตรวจแชทจริงไม่ได้คืนคำตอบ AI: reply ว่าง')
  }

  if (!chat.chatId) throw new Error('ตรวจแชทจริงไม่ได้สร้าง chat id')
  if (!chat.usage?.totalTokens) throw new Error('ตรวจแชทจริงไม่ได้คืนข้อมูลโทเคนที่ใช้')
  if (chat.reply.length < minRoleplayReplyChars) {
    throw new Error(`คำตอบแชทจริงสั้นเกินไปสำหรับ QA บทบาทสมมุติ ต้องมีอย่างน้อย ${minRoleplayReplyChars} ตัวอักษร ตัวอย่างคำตอบ: ${chat.reply}`)
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
    nextStep: 'ตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 ใน environment เป้าหมายนี้ แล้วรัน production:check ใหม่',
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
      throw new Error('health check ของระบบหลังบ้านไม่ผ่าน')
    }

    if (!health.checks.openRouterConfigured) {
      throw new Error('ยังไม่ได้ตั้งค่า OpenRouter บนระบบหลังบ้าน')
    }

    const characters = await jsonReader<{
      characters?: LiveChatSmokeCharacter[]
    }>('/characters?view=admin&limit=10', {
      headers: authHeaders(),
    })

    const smokeCharacter = selectLiveChatSmokeCharacter(characters.characters ?? [])
    if (!smokeCharacter) throw new Error('ไม่พบตัวละคร seed สำหรับ smoke')

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
      throw new Error('ตรวจแชทจริงคืนข้อมูลโทเคนที่ใช้แล้ว แต่ไม่พบรายการ wallet แบบ CHAT_USAGE ที่ตรงกัน')
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
    const message = formatLiveChatSmokeCaughtError(error)
    writeError(`ตรวจแชทจริงไม่ผ่าน: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runLiveChatSmoke())
