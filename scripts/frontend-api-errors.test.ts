import { describe, expect, test } from 'bun:test'
import { ApiError } from '../apps/frontend/src/lib/api'

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
})
