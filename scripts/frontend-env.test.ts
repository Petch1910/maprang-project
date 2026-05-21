import { describe, expect, test } from 'bun:test'
import { supabaseJwtRole } from '../apps/frontend/src/lib/env'

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url')
  return `${header}.${payload}.signature`
}

describe('frontend env helpers', () => {
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
