import { describe, expect, test } from 'bun:test'
import { creatorImageIssue, isOnlyLiveVerificationFailure, tryParseJson } from './api-smoke-helpers'
import { buildApiSmokeSummary, runApiSmoke, type ApiSmokeResult } from './api-smoke'

describe('api smoke helpers', () => {
  test('allows live smoke to continue only for live verification readiness failures', () => {
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของ chat provider ยังไม่ผ่านการยืนยัน',
        'live smoke ของ image generation ยังไม่ผ่านการยืนยัน',
      ]),
    ).toBe(true)

    expect(isOnlyLiveVerificationFailure([])).toBe(false)
    expect(isOnlyLiveVerificationFailure(['ฐานข้อมูลยังเชื่อมต่อไม่ได้'])).toBe(false)
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของ chat provider ยังไม่ผ่านการยืนยัน',
        'CORS_ORIGINS is empty, local, or non-https',
      ]),
    ).toBe(false)
  })

  test('builds image provider issues with actionable hints', () => {
    expect(creatorImageIssue({ warnings: ['billing_hard_limit_reached'] })).toContain('billing limit')
    expect(creatorImageIssue({ image: { note: '403 invalid api key' } })).toContain('valid backend-only image provider key')
    expect(creatorImageIssue({})).toBe('image provider did not return a generated image')
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
