import { describe, expect, test } from 'bun:test'
import { isLocalOrPlaceholderUrl, supabaseJwtRole } from '../apps/frontend/src/lib/env'

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('frontend env helpers', () => {
  test('detects local and placeholder frontend URLs', () => {
    expect(isLocalOrPlaceholderUrl('http://localhost:3000')).toBe(true)
    expect(isLocalOrPlaceholderUrl('http://127.0.0.1:3000')).toBe(true)
    expect(isLocalOrPlaceholderUrl('http://0.0.0.0:3000')).toBe(true)
    expect(isLocalOrPlaceholderUrl('http://[::1]:3000/health')).toBe(true)
    expect(isLocalOrPlaceholderUrl('https://api.example.com')).toBe(true)
    expect(isLocalOrPlaceholderUrl('https://<backend-domain>')).toBe(true)
    expect(isLocalOrPlaceholderUrl('http://api.maprang.ai')).toBe(true)
    expect(isLocalOrPlaceholderUrl('https://user:pass@api.maprang.ai')).toBe(true)
    expect(isLocalOrPlaceholderUrl('not-a-url')).toBe(true)
    expect(isLocalOrPlaceholderUrl('https://api.maprang.ai')).toBe(false)
  })

  test('decodes Supabase JWT roles from unpadded base64url payloads', () => {
    expect(supabaseJwtRole(jwtWithRole('anon'))).toBe('anon')
    expect(supabaseJwtRole(jwtWithRole('service_role'))).toBe('service_role')
  })

  test('ignores invalid Supabase JWT role payloads without throwing', () => {
    expect(supabaseJwtRole(undefined)).toBeNull()
    expect(supabaseJwtRole('not-a-jwt')).toBeNull()
    expect(supabaseJwtRole(`eyJ.${Buffer.from('{').toString('base64url')}.signature`)).toBeNull()
  })
})
