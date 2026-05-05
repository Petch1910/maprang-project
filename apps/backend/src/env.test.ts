import { afterEach, describe, expect, test } from 'bun:test'
import { validateRuntimeEnv } from './env'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

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
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.net:5432/maprang?sslmode=require'
    process.env.OPENROUTER_API_KEY = 'sk-or-realistic'
    process.env.CORS_ORIGINS = 'https://app.maprang.example'
    process.env.ADMIN_API_KEY = 'test-admin-key-with-enough-entropy-for-validation'
    process.env.SUPABASE_URL = 'https://maprang-prod.supabase.co'
    process.env.SUPABASE_JWT_ISSUER = 'https://maprang-prod.supabase.co/auth/v1'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.STORAGE_PROVIDER = 'local'
    process.env.SUPABASE_STORAGE_BUCKET = 'avatars'
    process.env.SUPABASE_STORAGE_ACCESS = 'signed'
    process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = '3600'

    expect(() => validateRuntimeEnv()).toThrow('Invalid production env')
  })

  test('accepts complete production env', () => {
    process.env.NODE_ENV = 'production'
    process.env.DATABASE_URL = 'postgresql://user:pass@db.example.net:5432/maprang?sslmode=require'
    process.env.OPENROUTER_API_KEY = 'sk-or-realistic'
    process.env.CORS_ORIGINS = 'https://app.maprang.example'
    process.env.ADMIN_API_KEY = 'test-admin-key-with-enough-entropy-for-validation'
    process.env.SUPABASE_URL = 'https://maprang-prod.supabase.co'
    process.env.SUPABASE_JWT_ISSUER = 'https://maprang-prod.supabase.co/auth/v1'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
    process.env.STORAGE_PROVIDER = 'supabase'
    process.env.SUPABASE_STORAGE_BUCKET = 'avatars'
    process.env.SUPABASE_STORAGE_ACCESS = 'signed'
    process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = '3600'

    const status = validateRuntimeEnv()

    expect(status.mode).toBe('production')
    expect(status.missingRequired).toEqual([])
    expect(status.invalid).toEqual([])
  })
})
