import { describe, expect, test } from 'bun:test'
import { creatorImageIssue, isOnlyLiveVerificationFailure, tryParseJson } from './api-smoke-helpers'
import { buildApiSmokeSummary, runApiSmoke, type ApiSmokeResult } from './api-smoke'

describe('api smoke helpers', () => {
  test('allows live smoke to continue only for live verification readiness failures', () => {
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
        'live smoke ของระบบสร้างรูปยังไม่ได้ยืนยันผ่าน',
      ]),
    ).toBe(true)

    expect(isOnlyLiveVerificationFailure([])).toBe(false)
    expect(isOnlyLiveVerificationFailure(['ฐานข้อมูลยังเชื่อมต่อไม่ได้'])).toBe(false)
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
        'CORS_ORIGINS is empty, local, or non-https',
      ]),
    ).toBe(false)
  })

  test('builds image provider issues with actionable hints', () => {
    expect(creatorImageIssue({ warnings: ['billing_hard_limit_reached'] })).toContain('เพดานวงเงิน')
    expect(creatorImageIssue({ image: { note: '403 invalid api key' } })).toContain(
      'คีย์ฝั่งระบบหลังบ้านสำหรับสร้างรูปที่ถูกต้อง',
    )
    expect(creatorImageIssue({})).toBe('ผู้ให้บริการสร้างรูปไม่ได้คืนรูปที่สร้างเสร็จแล้ว')
  })

  test('parses JSON safely for API smoke response helpers', () => {
    expect(tryParseJson('{"ok":true}')).toEqual({ ok: true })
    expect(tryParseJson('not-json')).toBeNull()
  })

  test('imports the API smoke runner without executing the smoke flow', () => {
    expect(typeof runApiSmoke).toBe('function')
  })

  test('builds API smoke summary counts for automation', () => {
    const results: ApiSmokeResult[] = [
      { name: 'health', status: 'pass', detail: 'ok' },
      { name: 'ready', status: 'warn', detail: 'provider verification pending' },
      { name: 'chat', status: 'skip', detail: 'local mode' },
      { name: 'admin', status: 'fail', detail: 'missing admin key' },
    ]

    expect(
      buildApiSmokeSummary(results, {
        apiBaseUrl: 'https://api.maprang.example',
        live: true,
        requireLiveImage: true,
        requireAdmin: true,
      }),
    ).toEqual({
      ok: false,
      apiBaseUrl: 'https://api.maprang.example',
      live: true,
      requireLiveImage: true,
      requireAdmin: true,
      pass: 1,
      warn: 1,
      skip: 1,
      fail: 1,
    })
  })
})
