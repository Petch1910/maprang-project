import { describe, expect, test } from 'bun:test'
import { creatorImageIssue, isOnlyLiveVerificationFailure, tryParseJson } from './api-smoke-helpers'
import { runApiSmoke } from './api-smoke'

describe('api smoke helpers', () => {
  test('allows live smoke to continue only for live verification readiness failures', () => {
    expect(
      isOnlyLiveVerificationFailure([
        'chat provider live smoke has not been verified',
        'image generation live smoke has not been verified',
      ]),
    ).toBe(true)

    expect(isOnlyLiveVerificationFailure([])).toBe(false)
    expect(isOnlyLiveVerificationFailure(['database is not connected'])).toBe(false)
    expect(
      isOnlyLiveVerificationFailure([
        'chat provider live smoke has not been verified',
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
})
