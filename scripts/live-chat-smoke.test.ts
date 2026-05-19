import { describe, expect, test } from 'bun:test'
import {
  assertSmokeUserHasTokenBalance,
  buildLiveChatSmokePayload,
  findMatchingChatDebit,
  selectLiveChatSmokeCharacter,
  validateLiveChatSmokeResponse,
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
    expect(() => assertSmokeUserHasTokenBalance(999, 1000)).toThrow('Top up the smoke user')
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
    ).toThrow('before setting CHAT_PROVIDER_LIVE_VERIFIED=1')
  })

  test('rejects incomplete or too-short live chat responses', () => {
    expect(() => validateLiveChatSmokeResponse({ reply: 'hello', usage: { totalTokens: 42 } }, 320)).toThrow(
      'did not create a chat id',
    )
    expect(() => validateLiveChatSmokeResponse({ reply: 'hello', chatId: 'chat-1', usage: { totalTokens: 42 } }, 320)).toThrow(
      'too short',
    )
  })

  test('matches wallet debit and formats success payload', () => {
    const chat = validateLiveChatSmokeResponse(
      {
        reply: 'ก'.repeat(340),
        chatId: 'chat-1',
        usage: { totalTokens: 88, modelName: 'openrouter/test-model' },
      },
      320,
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
        minRoleplayReplyChars: 320,
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
      replyChars: 340,
      minRoleplayReplyChars: 320,
      nextStep: 'Set CHAT_PROVIDER_LIVE_VERIFIED=1 in this target environment, then rerun production:check.',
      replyPreview: 'ก'.repeat(120),
    })
  })
})
