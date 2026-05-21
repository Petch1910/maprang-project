import { describe, expect, test } from 'bun:test'
import {
  ApiError,
  fetchCharacters,
  logUnexpectedError,
  parseChatStreamEvent,
  safeBrowserErrorSummary,
  safeApiUserMessage,
  streamChatMessage,
  type ChatStreamEvent,
} from '../apps/frontend/src/lib/api'
import { safeErrorTextForClassification } from '../apps/frontend/src/lib/safeError'

describe('frontend API errors', () => {
  test('sanitizes frontend error text before classification', () => {
    const openRouterKey = `sk-or-v1-${'1234567890abcdef'.repeat(2)}`
    const databaseUrl = 'postgresql://user:secret-password@db.example.com:5432/maprang?sslmode=require'
    const jwtLikeValue = `eyJ${'a'.repeat(16)}.eyJ${'b'.repeat(16)}.${'c'.repeat(16)}`
    const message = safeErrorTextForClassification(
      new Error(`admin_unauthorized ${openRouterKey} ${databaseUrl} ${jwtLikeValue}`),
    )

    expect(message).toContain('admin_unauthorized')
    expect(message).toContain('[redacted]')
    expect(message).not.toContain(openRouterKey.toLowerCase())
    expect(message).not.toContain('secret-password')
    expect(message).not.toContain(jwtLikeValue)
  })

  test('prefers backend Thai user messages over machine-readable codes', () => {
    const error = new ApiError('/chat', 429, {
      error: 'rate_limited',
      message: 'ส่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
    })

    expect(error.message).toBe('ส่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่')
    expect(error.payload).toEqual({
      error: 'rate_limited',
      message: 'ส่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่',
    })
  })

  test('does not surface raw backend error codes when message is missing', () => {
    const error = new ApiError('/characters', 503, {
      error: 'database_not_configured',
    })

    expect(error.message).toBe('คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่ (สถานะ 503)')
    expect(error.message).not.toContain('database_not_configured')
  })

  test('does not surface raw technical backend messages even when message exists', () => {
    expect(safeApiUserMessage('ส่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่')).toBe('ส่งถี่เกินไป กรุณารอสักครู่แล้วลองใหม่')
    expect(safeApiUserMessage('Cannot read properties of undefined')).toBe('')
    expect(safeApiUserMessage('PrismaClientKnownRequestError: ECONNREFUSED')).toBe('')
    expect(safeApiUserMessage('TypeError: fetch failed')).toBe('')

    const error = new ApiError('/chat', 500, {
      error: 'unknown_error',
      message: 'Cannot read properties of undefined',
    })

    expect(error.message).toBe('คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่ (สถานะ 500)')
  })

  test('falls back to Thai copy for non-json error payloads', () => {
    const error = new ApiError('/uploads/avatar', 502, null)

    expect(error.message).toBe('คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่ (สถานะ 502)')
  })

  test('wraps malformed successful JSON responses in a Thai ApiError', async () => {
    const originalFetch = globalThis.fetch

    try {
      globalThis.fetch = (async () =>
        new Response('not-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch

      await expect(fetchCharacters()).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'API ตอบกลับไม่สมบูรณ์ กรุณาลองใหม่',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('parses chat stream events split across network chunks', async () => {
    const originalFetch = globalThis.fetch
    const encoder = new TextEncoder()
    const events: ChatStreamEvent[] = []

    try {
      globalThis.fetch = (async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"type":"delta","content":"สวัสดี"}\n'))
              controller.enqueue(
                encoder.encode(
                  '\ndata: {"type":"done","chatId":"550e8400-e29b-41d4-a716-446655440000","usage":{"totalTokens":0,"cost":0,"modelName":"test-model","contextLoreCount":0,"tokenBalance":42}}\n\n',
                ),
              )
              controller.close()
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )) as typeof fetch

      await streamChatMessage(
        {
          message: 'ทดสอบสตรีม',
          characterId: '550e8400-e29b-41d4-a716-446655440001',
          chatId: null,
          history: [],
        },
        (event) => events.push(event),
      )
    } finally {
      globalThis.fetch = originalFetch
    }

    expect(events).toEqual([
      { type: 'delta', content: 'สวัสดี' },
      {
        type: 'done',
        chatId: '550e8400-e29b-41d4-a716-446655440000',
        usage: {
          totalTokens: 0,
          cost: 0,
          modelName: 'test-model',
          contextLoreCount: 0,
          tokenBalance: 42,
        },
      },
    ])
  })

  test('wraps malformed chat stream events in a Thai ApiError', async () => {
    expect(() => parseChatStreamEvent('not-json')).toThrow('สตรีมแชทขัดข้อง กรุณาลองใหม่')
    expect(() => parseChatStreamEvent('{"content":"no type"}')).toThrow('สตรีมแชทขัดข้อง กรุณาลองใหม่')

    const originalFetch = globalThis.fetch
    const encoder = new TextEncoder()

    try {
      globalThis.fetch = (async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: not-json\n\n'))
              controller.close()
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )) as typeof fetch

      await expect(
        streamChatMessage(
          {
            message: 'ทดสอบสตรีม',
            characterId: '550e8400-e29b-41d4-a716-446655440001',
            chatId: null,
            history: [],
          },
          () => {},
        ),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'สตรีมแชทขัดข้อง กรุณาลองใหม่',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('wraps interrupted chat stream reads in a Thai ApiError', async () => {
    const originalFetch = globalThis.fetch

    try {
      globalThis.fetch = (async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error('provider stream secret failure'))
            },
          }),
          { status: 200, headers: { 'Content-Type': 'text/event-stream' } },
        )) as typeof fetch

      await expect(
        streamChatMessage(
          {
            message: 'ทดสอบสตรีม',
            characterId: '550e8400-e29b-41d4-a716-446655440001',
            chatId: null,
            history: [],
          },
          () => {},
        ),
      ).rejects.toMatchObject({
        name: 'ApiError',
        status: 502,
        message: 'สตรีมแชทขัดข้อง กรุณาลองใหม่',
      })
    } finally {
      globalThis.fetch = originalFetch
    }
  })

  test('summarizes browser errors before logging', () => {
    expect(safeBrowserErrorSummary(new Error('secret-like-url https://example.invalid?token=leak'))).toEqual({
      name: 'Error',
    })
    expect(safeBrowserErrorSummary('plain failure')).toEqual({ type: 'string' })

    const originalConsoleError = console.error
    const calls: unknown[][] = []
    try {
      console.error = (...args: unknown[]) => {
        calls.push(args)
      }

      logUnexpectedError('โหลดข้อมูลไม่สำเร็จ:', new Error('secret-like-url https://example.invalid?token=leak'))
      logUnexpectedError('api error should stay quiet', new ApiError('/chat', 500, { message: 'หลังบ้านไม่พร้อม' }))
    } finally {
      console.error = originalConsoleError
    }

    expect(calls).toEqual([['โหลดข้อมูลไม่สำเร็จ:', { name: 'Error' }]])
  })
})
