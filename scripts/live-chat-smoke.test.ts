import { describe, expect, test } from 'bun:test'
import {
  assertSmokeUserHasTokenBalance,
  buildLiveChatSmokePayload,
  findMatchingChatDebit,
  runLiveChatSmoke,
  selectLiveChatSmokeCharacter,
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
    expect(() => assertSmokeUserHasTokenBalance(999, 1000)).toThrow('เติม token ให้ smoke user')
    expect(assertSmokeUserHasTokenBalance(1000, 1000)).toBeUndefined()
  })

  test('reports provider failures before empty replies', () => {
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
      'สั้นเกินไป',
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
    expect(
      buildLiveChatSmokePayload({
        baseUrl: 'https://api.maprang.example',
        characterName: 'มิกะ | MIKA',
        chatId: chat.chatId,
        model: chat.modelName,
        totalTokens: chat.totalTokens,
        chatDebit: debit!,
        reply: chat.reply,
        minRoleplayReplyChars: 420,
      }),
    ).toEqual({
      ok: true,
      apiBaseUrl: 'https://api.maprang.example',
      character: 'มิกะ | MIKA',
      chatId: 'chat-1',
      model: 'openrouter/test-model',
      totalTokens: 88,
      walletTransactionId: 'debit',
      balanceAfter: 1112,
      replyChars: 440,
      minRoleplayReplyChars: 420,
      nextStep: 'ตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1 ใน target environment นี้ แล้วรัน production:check ใหม่',
      replyPreview: 'ก'.repeat(120),
    })
  })

  test('runs live chat smoke through an importable runner without provider calls', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    let usageReadCount = 0
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
      if (path === '/me/usage') {
        usageReadCount += 1
        if (usageReadCount === 1) return { user: { tokenBalance: 2000 } } as never
        return { wallet: { transactions: [{ id: 'debit', type: 'CHAT_USAGE', amount: -88, balanceAfter: 1912 }] } } as never
      }
      if (path === '/chat') {
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
      readRootIdentity: async () => ({ ok: true, service: 'maprang-backend' }),
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const payload = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(calls).toEqual(['/health', '/characters?view=admin&limit=10', '/me/usage', '/chat', '/me/usage'])
    expect(payload.apiBaseUrl).toBe('https://api.maprang.example')
    expect(payload.walletTransactionId).toBe('debit')
    expect(errors).toEqual([])
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
    expect(errors.join('\n')).toContain('เติม token ให้ smoke user')
  })
})
