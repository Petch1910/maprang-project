import { describe, expect, test } from 'bun:test'
import {
  buildSmokeAuthHeaders,
  formatFetchErrorReason,
  formatPayload,
  smokeApiBaseUrl,
  smokeTargetIsLocal,
  tryParseJson,
  validateBackendRootIdentity,
} from './smoke-helpers'

describe('smoke helpers', () => {
  test('defaults to local backend and local smoke user', () => {
    const env = {}
    expect(smokeApiBaseUrl(env)).toBe('http://127.0.0.1:3000')
    expect(smokeTargetIsLocal(smokeApiBaseUrl(env))).toBe(true)
    expect(buildSmokeAuthHeaders(env)).toEqual({ 'x-user-id': 'dev-user' })
  })

  test('does not impersonate a user by default against deployed targets', () => {
    const env = { SMOKE_API_BASE_URL: 'https://api.example.com' }
    expect(smokeTargetIsLocal(env.SMOKE_API_BASE_URL)).toBe(false)
    expect(buildSmokeAuthHeaders(env)).toEqual({})
  })

  test('prefers explicit smoke auth values and keeps admin key separate', () => {
    const env = {
      SMOKE_API_BASE_URL: 'https://api.example.com',
      SMOKE_USER_ID: 'user-1',
      SMOKE_ACCESS_TOKEN: 'access-token',
      SMOKE_ADMIN_API_KEY: 'admin-key',
    }

    expect(buildSmokeAuthHeaders(env)).toEqual({
      'x-user-id': 'user-1',
      Authorization: 'Bearer access-token',
      'x-admin-key': 'admin-key',
    })
  })

  test('parses JSON payloads and clips non-json fallback output', () => {
    expect(tryParseJson('{"ok":true}')).toEqual({ ok: true })
    expect(tryParseJson('not json')).toBeNull()
    expect(formatPayload({ ok: false }, 'fallback')).toBe('{"ok":false}')
    expect(formatPayload(null, 'x'.repeat(600))).toHaveLength(500)
  })

  test('formats common fetch failures with Thai-first diagnostics', () => {
    expect(formatFetchErrorReason(new Error('Unable to connect. Is the computer able to access the url?'))).toBe(
      'เชื่อมต่อไม่ได้ ตรวจว่า backend เปิดอยู่และพอร์ตถูกต้อง',
    )
    expect(formatFetchErrorReason(new Error('operation timed out'))).toBe(
      'หมดเวลารอการเชื่อมต่อ ตรวจ network หรือ backend',
    )
    expect(formatFetchErrorReason('custom upstream error')).toBe('custom upstream error')
  })

  test('validates backend root identity payloads', () => {
    expect(() => validateBackendRootIdentity({ ok: true, service: 'maprang-backend' })).not.toThrow()
    expect(() => validateBackendRootIdentity({ ok: false, service: 'maprang-backend' })).toThrow('ok=false')
    expect(() => validateBackendRootIdentity({ ok: true, service: 'wrong' })).toThrow('service name ไม่ถูกต้อง')
  })
})
