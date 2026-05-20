import { describe, expect, test } from 'bun:test'
import {
  ApiError,
  logUnexpectedError,
  safeBrowserErrorSummary,
  streamChatMessage,
  type ChatStreamEvent,
} from '../apps/frontend/src/lib/api'

describe('frontend API errors', () => {
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

  test('falls back to Thai copy for non-json error payloads', () => {
    const error = new ApiError('/uploads/avatar', 502, null)

    expect(error.message).toBe('คำสั่งนี้ไม่สำเร็จ กรุณาลองใหม่ (สถานะ 502)')
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
