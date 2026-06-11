import { describe, expect, test } from 'bun:test'
import {
  backendEnvAdminApiKey,
  backendEnvPort,
  buildSmokeAuthHeaders,
  deployedSmokeTargetIssues,
  formatDiagnosticText,
  formatFetchErrorReason,
  formatSmokeTargetDiagnosticText,
  formatSmokeTargetPathDiagnosticText,
  formatUnknownDiagnosticText,
  formatPayload,
  smokeApiBaseUrl,
  smokeAdminApiKey,
  smokeTargetIssuesForDeployedGate,
  smokeTargetIsLocal,
  tryParseJson,
  validateBackendRootIdentity,
} from './smoke-helpers'

describe('smoke helpers', () => {
  test('defaults to local backend and local smoke user', () => {
    const env = {}
    expect(smokeApiBaseUrl(env, '')).toBe('http://127.0.0.1:3000')
    expect(smokeTargetIsLocal(smokeApiBaseUrl(env, ''))).toBe(true)
    expect(smokeTargetIsLocal('http://0.0.0.0:3000')).toBe(true)
    expect(smokeTargetIsLocal('http://[::1]:3000/health')).toBe(true)
    expect(buildSmokeAuthHeaders(env, true, '')).toEqual({ 'x-user-id': 'dev-user' })
  })

  test('resolves local backend port from backend env when SMOKE_API_BASE_URL is omitted', () => {
    const backendEnv = 'DATABASE_URL=postgresql://example\nPORT="3001"\n'

    expect(backendEnvPort(backendEnv)).toBe('3001')
    expect(smokeApiBaseUrl({}, backendEnv)).toBe('http://127.0.0.1:3001')
    expect(smokeApiBaseUrl({ SMOKE_API_BASE_URL: 'https://api.example.com' }, backendEnv)).toBe('https://api.example.com')
  })

  test('resolves local admin smoke key from backend env only for loopback targets', () => {
    const backendEnv = [
      'DATABASE_URL=postgresql://example',
      'ADMIN_API_KEY="backend-local-admin-key"',
      'PORT=3001',
    ].join('\n')

    expect(backendEnvAdminApiKey(backendEnv)).toBe('backend-local-admin-key')
    expect(smokeAdminApiKey({}, true, backendEnv)).toBe('backend-local-admin-key')
    expect(smokeAdminApiKey({}, false, backendEnv)).toBe('')
    expect(buildSmokeAuthHeaders({}, true, backendEnv)).toEqual({
      'x-user-id': 'dev-user',
      'x-admin-key': 'backend-local-admin-key',
    })
    expect(buildSmokeAuthHeaders({ SMOKE_API_BASE_URL: 'https://api.example.com' }, false, backendEnv)).toEqual({})
  })

  test('prefers explicit smoke admin key over backend env', () => {
    const backendEnv = "ADMIN_API_KEY='backend-local-admin-key'\n"

    expect(smokeAdminApiKey({ SMOKE_ADMIN_API_KEY: ' "explicit-admin-key" ' }, true, backendEnv)).toBe(
      'explicit-admin-key',
    )
    expect(buildSmokeAuthHeaders({ SMOKE_ADMIN_API_KEY: 'explicit-admin-key' }, true, backendEnv)['x-admin-key']).toBe(
      'explicit-admin-key',
    )
  })

  test('does not impersonate a user by default against deployed targets', () => {
    const env = { SMOKE_API_BASE_URL: 'https://api.example.com' }
    expect(smokeTargetIsLocal(env.SMOKE_API_BASE_URL)).toBe(false)
    expect(buildSmokeAuthHeaders(env)).toEqual({})
  })

  test('validates deployed smoke targets before strict smoke gates', () => {
    expect(deployedSmokeTargetIssues('https://api.example.com')).toEqual([])
    expect(deployedSmokeTargetIssues('http://api.example.com').join('\n')).toContain('https')
    expect(deployedSmokeTargetIssues('https://localhost:3000').join('\n')).toContain('localhost/loopback')
    expect(deployedSmokeTargetIssues('https://0.0.0.0:3000').join('\n')).toContain('0.0.0.0')
    expect(deployedSmokeTargetIssues('https://[::1]:3000').join('\n')).toContain('::1')
    expect(deployedSmokeTargetIssues('https://smoke-user:smoke-pass@api.example.com').join('\n')).toContain(
      'credential/userinfo',
    )
    expect(deployedSmokeTargetIssues('https://api.example.com/v1?x=1#debug').join('\n')).toContain(
      'path/query/hash',
    )
    expect(deployedSmokeTargetIssues('not-a-url').join('\n')).toContain('URL')
  })

  test('keeps local smoke targets usable while rejecting local userinfo or paths', () => {
    expect(smokeTargetIssuesForDeployedGate('http://127.0.0.1:3000', true)).toEqual([])
    expect(smokeTargetIssuesForDeployedGate('http://127.0.0.1:3000/api', true).join('\n')).toContain(
      'path/query/hash',
    )
    expect(smokeTargetIssuesForDeployedGate('http://smoke-user:smoke-pass@127.0.0.1:3000', true).join('\n')).toContain(
      'credential/userinfo',
    )
    expect(smokeTargetIssuesForDeployedGate('http://api.example.com', false).join('\n')).toContain('https')
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

  test('redacts secret-shaped values from smoke diagnostics', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    expect(formatDiagnosticText(`database=${fakeDatabaseUrl}`, 500)).toContain('postgresql://[REDACTED_SECRET]')
    expect(formatPayload({ detail: fakeDatabaseUrl }, 'fallback')).toContain('postgresql://[REDACTED_SECRET]')
    expect(formatPayload(null, `DATABASE_URL=${fakeDatabaseUrl}`)).toContain('[REDACTED_SECRET]')
    expect(formatFetchErrorReason(new Error(`connection failed ${fakeDatabaseUrl}`))).toContain('postgresql://[REDACTED_SECRET]')
    expect(formatSmokeTargetDiagnosticText('https://smoke-user:smoke-pass@api.example.com', 500)).toBe(
      'https://[REDACTED_USERINFO]@api.example.com/',
    )
    expect(formatSmokeTargetPathDiagnosticText('https://smoke-user:smoke-pass@api.example.com', '/ready', 500)).toBe(
      'https://[REDACTED_USERINFO]@api.example.com/ready',
    )
  })

  test('formats unknown smoke diagnostics without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatUnknownDiagnosticText(
      {
        message: `connection failed ${fakeDatabaseUrl}`,
        toString() {
          throw new Error('raw object should not be stringified')
        },
      },
      500,
    )

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('object-secret')
    expect(formatUnknownDiagnosticText({ error: 'fetch failed' }, 500)).toBe('fetch failed')
    expect(formatUnknownDiagnosticText({ code: 'ECONNREFUSED' }, 500)).toBe('')
  })

  test('formats common fetch failures with Thai-first diagnostics', () => {
    expect(formatFetchErrorReason(new Error('Unable to connect. Is the computer able to access the url?'))).toBe(
      'เชื่อมต่อไม่ได้ ตรวจว่าระบบหลังบ้านเปิดอยู่และพอร์ตถูกต้อง',
    )
    expect(formatFetchErrorReason(new Error('operation timed out'))).toBe(
      'หมดเวลารอการเชื่อมต่อ ตรวจเครือข่ายหรือระบบหลังบ้าน',
    )
    expect(formatFetchErrorReason('custom upstream error')).toBe('custom upstream error')
  })

  test('validates backend root identity payloads', () => {
    expect(() => validateBackendRootIdentity({ ok: true, service: 'maprang-backend' })).not.toThrow()
    expect(() => validateBackendRootIdentity({ ok: false, service: 'maprang-backend' })).toThrow('ok=false')
    expect(() => validateBackendRootIdentity({ ok: true, service: 'wrong' })).toThrow('ชื่อ service ไม่ถูกต้อง')
  })
})
