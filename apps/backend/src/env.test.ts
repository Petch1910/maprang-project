import { afterEach, describe, expect, test } from 'bun:test'
import { validateRuntimeEnv } from './env'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

function jwtWithRole(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ role })).toString('base64url')
  return `${header}.${payload}.signature`
}

function setCompleteProductionEnv() {
  process.env.NODE_ENV = 'production'
  process.env.DATABASE_URL = 'postgresql://user:pass@db.example.net:5432/maprang?sslmode=require'
  process.env.OPENROUTER_API_KEY = 'sk-or-realistic'
  process.env.CORS_ORIGINS = 'https://app.maprang.example'
  process.env.ADMIN_API_KEY = 'test-admin-key-with-enough-entropy-for-validation'
  process.env.SUPABASE_URL = 'https://maprang-prod.supabase.co'
  process.env.SUPABASE_JWT_ISSUER = 'https://maprang-prod.supabase.co/auth/v1'
  process.env.SUPABASE_SERVICE_ROLE_KEY = jwtWithRole('service_role')
  process.env.STORAGE_PROVIDER = 'supabase'
  process.env.SUPABASE_STORAGE_BUCKET = 'avatars'
  process.env.SUPABASE_STORAGE_ACCESS = 'signed'
  process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = '3600'
  process.env.MODEL_INPUT_COST_PER_1M = '0.1'
  process.env.MODEL_OUTPUT_COST_PER_1M = '0.4'
}

describe('runtime env validation', () => {
  test('treats placeholder values as missing', () => {
    process.env.NODE_ENV = 'development'
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.OPENROUTER_API_KEY = 'replace-with-openrouter-key'
    process.env.CORS_ORIGINS = 'http://localhost:5173'
    process.env.SUPABASE_URL = 'https://your-project.supabase.co'

    const status = validateRuntimeEnv()

    expect(status.missingRequired).toContain('OPENROUTER_API_KEY')
    expect(status.missingRequired).toContain('SUPABASE_URL')
  })

  test('requires production critical values', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DATABASE_URL
    delete process.env.OPENROUTER_API_KEY
    delete process.env.CORS_ORIGINS
    delete process.env.ADMIN_API_KEY
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_JWT_ISSUER
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.STORAGE_PROVIDER
    delete process.env.SUPABASE_STORAGE_BUCKET
    delete process.env.SUPABASE_STORAGE_ACCESS
    delete process.env.SUPABASE_SIGNED_URL_EXPIRES_IN

    expect(() => validateRuntimeEnv()).toThrow('Missing required production env')
  })

  test('rejects production local storage provider', () => {
    setCompleteProductionEnv()
    process.env.STORAGE_PROVIDER = 'local'

    expect(() => validateRuntimeEnv()).toThrow('Invalid production env')
  })

  test('rejects production local cors and weak admin key', () => {
    setCompleteProductionEnv()
    process.env.CORS_ORIGINS = 'http://localhost:5173'
    process.env.ADMIN_API_KEY = 'short'

    expect(() => validateRuntimeEnv()).toThrow('CORS_ORIGINS must use https origins in production')
    expect(() => validateRuntimeEnv()).toThrow('ADMIN_API_KEY must be at least 32 characters')
  })

  test('rejects mismatched Supabase issuer and anon storage key', () => {
    setCompleteProductionEnv()
    process.env.SUPABASE_JWT_ISSUER = 'https://other-project.supabase.co/auth/v1'
    process.env.SUPABASE_SERVICE_ROLE_KEY = jwtWithRole('anon')

    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_JWT_ISSUER must equal SUPABASE_URL + /auth/v1')
    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY must use a service_role key')
  })

  test('rejects provider key and numeric production env mistakes', () => {
    setCompleteProductionEnv()
    process.env.OPENROUTER_API_KEY = 'sk-proj-openai-key'
    process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = 'later'
    process.env.MODEL_INPUT_COST_PER_1M = 'free'

    expect(() => validateRuntimeEnv()).toThrow('OPENROUTER_API_KEY appears to be an OpenAI project key')
    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_SIGNED_URL_EXPIRES_IN must be a positive integer')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_INPUT_COST_PER_1M must be a non-negative number')
  })

  test('accepts complete production env', () => {
    setCompleteProductionEnv()

    const status = validateRuntimeEnv()

    expect(status.mode).toBe('production')
    expect(status.missingRequired).toEqual([])
    expect(status.invalid).toEqual([])
  })
})
