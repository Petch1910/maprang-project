import { describe, expect, test } from 'bun:test'
import {
  assertSmokeUserHasTokenBalance,
  buildLiveChatSmokePayload,
  findMatchingChatDebit,
  findMatchingChatDebits,
  formatLiveChatSmokeCaughtError,
  liveChatStreamSmokePrompt,
  liveChatSmokePrompt,
  providerFailureIssue,
  runLiveChatSmoke,
  selectLiveChatSmokeCharacter,
  validateLiveChatSmokeStream,
  validateLiveChatSmokeResponse,
  type LiveChatSmokeJsonReader,
} from './live-chat-smoke'

describe('live chat smoke helpers', () => {
  test('selects the most stable seeded smoke character', () => {
    expect(
      selectLiveChatSmokeCharacter([
        { id: 'first', name: 'Maprang' },
        { id: 'mika', name: 'มิกะ | MIKA' },
      ]),
    ).toEqual({ id: 'mika', name: 'มิกะ | MIKA' })

    expect(selectLiveChatSmokeCharacter([{ id: 'maprang', name: 'Maprang' }])).toEqual({
      id: 'maprang',
      name: 'Maprang',
    })
    expect(selectLiveChatSmokeCharacter([])).toBeNull()
  })

  test('validates smoke token balance before spending provider credits', () => {
    expect(() => assertSmokeUserHasTokenBalance(999, 1000)).toThrow('เติมโทเคนให้ผู้ใช้ smoke')
    expect(assertSmokeUserHasTokenBalance(1000, 1000)).toBeUndefined()
  })

  test('reports provider failures before empty replies', () => {
    const issue = providerFailureIssue({ retryable: false })
    expect(issue).toContain('ไม่ทราบรหัส')
    expect(issue).toContain('ตรวจแชทจริง')
    expect(issue).toContain('การเชื่อมต่อออกไป OpenRouter')
    expect(issue).toContain('log ระบบหลังบ้าน')
    expect(issue).not.toContain('ตรวจ live chat')
    expect(issue).not.toContain('unknown')
    expect(issue).not.toContain('outbound network')
    expect(issue).not.toContain('backend logs')

    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const secretIssue = providerFailureIssue({ retryable: false, userMessage: `quota failed ${fakeDatabaseUrl}` })
    expect(secretIssue).toContain('postgresql://[REDACTED_SECRET]')
    expect(secretIssue).not.toContain('super-secret')

    expect(() =>
      validateLiveChatSmokeResponse(
        {
          usage: {
            providerFailure: {
              code: 'insufficient_quota',
              userMessage: 'quota exceeded',
            },
          },
        },
        320,
      ),
    ).toThrow('ก่อนตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1')
  })

  test('rejects incomplete or too-short live chat responses', () => {
    expect(() => validateLiveChatSmokeResponse({ reply: 'hello', usage: { totalTokens: 42 } }, 420)).toThrow(
      'ไม่ได้สร้าง chat id',
    )
    expect(() => validateLiveChatSmokeResponse({ reply: 'hello', chatId: 'chat-1', usage: { totalTokens: 42 } }, 420)).toThrow(
      'คำตอบแชทจริงสั้นเกินไป',
    )
  })

  test('matches wallet debit and formats success payload', () => {
    const chat = validateLiveChatSmokeResponse(
      {
        reply: 'ก'.repeat(440),
        chatId: 'chat-1',
        usage: { totalTokens: 88, modelName: 'openrouter/test-model' },
      },
      420,
    )
    const debit = findMatchingChatDebit(
      [
        { id: 'other', type: 'ADMIN_ADJUSTMENT', amount: 88, balanceAfter: 1200 },
        { id: 'debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1112 },
      ],
      chat.totalTokens,
    )

    expect(debit?.id).toBe('debit')
    const [chatDebit, streamDebit] = findMatchingChatDebits(
      [
        { id: 'other', type: 'ADMIN_ADJUSTMENT', amount: 88, balanceAfter: 1200 },
        { id: 'debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1112 },
        { id: 'stream-debit', type: 'CHAT_USAGE', amount: -44, balanceAfter: 1068 },
      ],
      [chat.totalTokens, 44],
    )!
    expect(
      buildLiveChatSmokePayload({
        baseUrl: 'https://api.maprang.example',
        characterName: 'มิกะ | MIKA',
        chatId: chat.chatId,
        model: chat.modelName,
        totalTokens: chat.totalTokens,
        chatDebit,
        streamDebit,
        reply: chat.reply,
        minRoleplayReplyChars: 420,
        streamChatId: 'chat-1',
        streamTotalTokens: 44,
        streamReplyChars: 160,
      }),
    ).toEqual({
      ok: true,
      apiBaseUrl: 'https://api.maprang.example',
      character: 'มิกะ | MIKA',
      chatId: 'chat-1',
      model: 'openrouter/test-model',
      totalTokens: 88,
      streamChatId: 'chat-1',
      streamTotalTokens: 44,
      streamReplyChars: 160,
      walletTransactionId: 'debit',
      streamWalletTransactionId: 'stream-debit',
      balanceAfter: 1112,
      streamBalanceAfter: 1068,
      handoffEvidence: {
        'Chat smoke normal chatId': 'chat-1',
        'Chat smoke normal tokens': 88,
        'Chat smoke normal walletTransactionId': 'debit',
        'Chat smoke stream chatId': 'chat-1',
        'Chat smoke stream tokens': 44,
        'Chat smoke stream walletTransactionId': 'stream-debit',
      },
      replyChars: 440,
      minRoleplayReplyChars: 420,
      nextStep: 'ตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 ใน environment เป้าหมายนี้ แล้วรัน production:check ใหม่',
      replyPreview: 'ก'.repeat(120),
    })
  })

  test('requires distinct wallet debits for normal and stream chat', () => {
    expect(
      findMatchingChatDebits(
        [
          { id: 'only-debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1912 },
          { id: 'admin', type: 'ADMIN_ADJUSTMENT', amount: 44, balanceAfter: 1956 },
        ],
        [88, 44],
      ),
    ).toBeNull()

    expect(
      findMatchingChatDebits(
        [
          { id: 'normal-debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1912 },
          { id: 'stream-debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1824 },
        ],
        [88, 88],
      )?.map((transaction) => transaction.id),
    ).toEqual(['normal-debit', 'stream-debit'])
  })

  test('runs live chat smoke through an importable runner without provider calls', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    let usageReadCount = 0
    const reader: LiveChatSmokeJsonReader = async (path, init) => {
      calls.push(path)
      if (path === '/health') {
        return {
          ok: true,
          checks: { databaseConnected: true, openRouterConfigured: true },
          model: { name: 'openrouter/test-model', minRoleplayReplyChars: 420 },
        } as never
      }
      if (path === '/characters?view=admin&limit=10') {
        return { characters: [{ id: 'mika', name: 'มิกะ | MIKA' }] } as never
      }
      if (path === '/me/usage') {
        usageReadCount += 1
        if (usageReadCount === 1) return { user: { tokenBalance: 2000 } } as never
        return {
          wallet: {
            transactions: [
              { id: 'debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1912 },
              { id: 'stream-debit', type: 'CHAT_USAGE', amount: -44, balanceAfter: 1868 },
            ],
          },
        } as never
      }
      if (path === '/chat') {
        const body = JSON.parse(String(init?.body ?? '{}')) as { message?: string }
        expect(body.message).toBe(liveChatSmokePrompt)
        expect(body.message).toContain('ฉันนั่งลงตรงข้ามเธอ')
        expect(body.message).toContain('ฉากโรลเพลย์ภาษาไทย')
        expect(body.message).not.toContain('I sit across from you')
        return {
          reply: 'ก'.repeat(440),
          chatId: 'chat-1',
          usage: { totalTokens: 88, modelName: 'openrouter/test-model' },
        } as never
      }
      throw new Error(`unexpected path ${path}`)
    }

    const exitCode = await runLiveChatSmoke({
      env: { SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT: '1000' },
      apiBaseUrl: 'https://api.maprang.example',
      readJson: reader,
      readStreamEvents: async (path, init) => {
        calls.push(path)
        const body = JSON.parse(String(init.body ?? '{}')) as { chatId?: string; message?: string }
        expect(path).toBe('/chat/stream')
        expect(body.chatId).toBe('chat-1')
        expect(body.message).toBe(liveChatStreamSmokePrompt)
        return [
          { type: 'delta', content: 'ข'.repeat(120) },
          { type: 'done', chatId: 'chat-1', usage: { totalTokens: 44 } },
        ]
      },
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(calls).toEqual(['/health', '/characters?view=admin&limit=10', '/me/usage', '/chat', '/chat/stream', '/me/usage'])
    expect(payload.apiBaseUrl).toBe('https://api.maprang.example')
    expect(payload.walletTransactionId).toBe('debit')
    expect(payload.streamWalletTransactionId).toBe('stream-debit')
    expect(payload.handoffEvidence['Chat smoke normal walletTransactionId']).toBe('debit')
    expect(payload.handoffEvidence['Chat smoke stream walletTransactionId']).toBe('stream-debit')
    expect(payload.streamTotalTokens).toBe(44)
    expect(payload.streamReplyChars).toBe(120)
    expect(errors).toEqual([])
  })

  test('validates live stream chat smoke events', () => {
    expect(
      validateLiveChatSmokeStream([
        { type: 'delta', content: 'ส'.repeat(90) },
        { type: 'done', chatId: 'chat-1', usage: { totalTokens: 33 } },
      ]),
    ).toMatchObject({ chatId: 'chat-1', totalTokens: 33, replyChars: 90 })
    expect(() => validateLiveChatSmokeStream([{ type: 'done', chatId: 'chat-1', usage: { totalTokens: 33 } }])).toThrow(
      'สตรีมแชทจริงคืนคำตอบสั้นเกินไป',
    )
    expect(() =>
      validateLiveChatSmokeStream([
        {
          type: 'done',
          chatId: 'chat-1',
          usage: { totalTokens: 33, providerFailure: { code: 'insufficient_quota' } },
        },
      ]),
    ).toThrow('CHAT_PROVIDER_LIVE_VERIFIED=1')
  })

  test('uses a Thai-first prompt for live roleplay quality smoke', () => {
    expect(liveChatSmokePrompt).toContain('ฉากโรลเพลย์ภาษาไทย')
    expect(liveChatSmokePrompt).toContain('บรรยากาศ')
    expect(liveChatSmokePrompt).toContain('เหลือพื้นที่ให้ฉันตอบต่อ')
    expect(liveChatSmokePrompt).not.toMatch(/\bReply as\b|\bI sit\b|\bfeeling\b|\bpacing\b/)
  })

  test('validates backend root identity before spending chat tokens', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    const reader: LiveChatSmokeJsonReader = async (path) => {
      calls.push(path)
      throw new Error(`unexpected path ${path}`)
    }

    const exitCode = await runLiveChatSmoke({
      env: { SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT: '1000' },
      apiBaseUrl: 'https://api.maprang.example',
      readJson: reader,
      readRootIdentity: async () => ({ ok: true, service: 'wrong-service' }),
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(calls).toEqual([])
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('ชื่อ service ไม่ถูกต้อง')
  })

  test('redacts secret-shaped values from live chat smoke caught errors', async () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    expect(formatLiveChatSmokeCaughtError(new Error(`health failed ${fakeDatabaseUrl}`))).toContain(
      'postgresql://[REDACTED_SECRET]',
    )
    expect(formatLiveChatSmokeCaughtError(new Error(`health failed ${fakeDatabaseUrl}`))).not.toContain('super-secret')

    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runLiveChatSmoke({
      env: { SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT: '1000' },
      apiBaseUrl: 'https://api.maprang.example',
      readJson: async () => {
        throw new Error(`backend failed ${fakeDatabaseUrl}`)
      },
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('postgresql://[REDACTED_SECRET]')
    expect(errors.join('\n')).not.toContain('super-secret')
  })

  test('formats object-shaped live chat smoke errors without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:chat-object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatLiveChatSmokeCaughtError({
      message: `provider failed ${fakeDatabaseUrl}`,
      toString() {
        throw new Error('raw object should not be stringified')
      },
    })

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('chat-object-secret')
    expect(formatLiveChatSmokeCaughtError({ error: 'wallet debit failed' })).toBe('wallet debit failed')
    expect(formatLiveChatSmokeCaughtError({ code: 'ECONNREFUSED' })).toBe('ไม่ทราบสาเหตุ')
  })

  test('returns a failure code without spending chat tokens when balance is too low', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    const reader: LiveChatSmokeJsonReader = async (path) => {
      calls.push(path)
      if (path === '/health') {
        return {
          ok: true,
          checks: { databaseConnected: true, openRouterConfigured: true },
          model: { name: 'openrouter/test-model', minRoleplayReplyChars: 420 },
        } as never
      }
      if (path === '/characters?view=admin&limit=10') {
        return { characters: [{ id: 'mika', name: 'มิกะ | MIKA' }] } as never
      }
      if (path === '/me/usage') return { user: { tokenBalance: 10 } } as never
      throw new Error(`unexpected path ${path}`)
    }

    const exitCode = await runLiveChatSmoke({
      env: { SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT: '1000' },
      readJson: reader,
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(calls).toEqual(['/health', '/characters?view=admin&limit=10', '/me/usage'])
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('เติมโทเคนให้ผู้ใช้ smoke')
    expect(errors.join('\n')).not.toContain('เติม token ให้ smoke user')
  })
})
