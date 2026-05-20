import { describe, expect, test } from 'bun:test'
import { providerFailureHint, shouldRunLiveImageSmoke } from './image-smoke'
import { parseMinSmokeTokenBalance, providerFailureIssue } from './live-chat-smoke'

describe('provider smoke guard helpers', () => {
  test('validates live chat minimum token balance config', () => {
    expect(parseMinSmokeTokenBalance('1000')).toBe(1000)
    expect(() => parseMinSmokeTokenBalance('0')).toThrow('จำนวนเต็มบวก')
    expect(() => parseMinSmokeTokenBalance('1.5')).toThrow('จำนวนเต็มบวก')
  })

  test('formats provider failure messages without allowing verification flags too early', () => {
    expect(providerFailureIssue({ code: 'rate_limit', retryable: true, userMessage: 'try later' })).toContain(
      'ลองใหม่ได้หลัง cooldown',
    )
    expect(providerFailureIssue({ code: 'invalid_key', retryable: false })).toContain(
      'ก่อนตั้ง CHAT_PROVIDER_LIVE_VERIFIED=1',
    )
  })

  test('detects explicit live image smoke opt-in sources', () => {
    expect(shouldRunLiveImageSmoke(['bun', 'script'], {})).toBe(false)
    expect(shouldRunLiveImageSmoke(['bun', 'script', '--live'], {})).toBe(true)
    expect(shouldRunLiveImageSmoke(['bun', 'script', '--require-live-image'], {})).toBe(true)
    expect(shouldRunLiveImageSmoke(['bun', 'script'], { SMOKE_IMAGE_LIVE: 'yes' })).toBe(true)
  })

  test('maps image provider failures to actionable fixes', () => {
    expect(providerFailureHint('billing_hard_limit_reached')).toContain('เพดานวงเงิน')
    expect(providerFailureHint('insufficient_quota')).toContain('เครดิต/โควตา')
    expect(providerFailureHint('403 invalid api key')).toContain('คีย์ฝั่งระบบหลังบ้านสำหรับสร้างรูปที่ถูกต้อง')
    expect(providerFailureHint('model unavailable')).toContain('IMAGE_GENERATION_MODEL')
    expect(providerFailureHint('temporary upstream error')).toBe('')
  })
})
