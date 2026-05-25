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
  process.env.DATABASE_URL = 'postgresql://maprang_app:prod-secret@db.example.net:5432/maprang?sslmode=require'
  process.env.OPENROUTER_API_KEY = 'sk-or-realistic'
  process.env.CORS_ORIGINS = 'https://app.maprang.example'
  process.env.ADMIN_API_KEY = 'test-admin-key-with-enough-entropy-for-validation'
  process.env.SUPABASE_URL = 'https://maprang-prod.supabase.co'
  process.env.SUPABASE_JWT_ISSUER = 'https://maprang-prod.supabase.co/auth/v1'
  process.env.SUPABASE_ANON_KEY = jwtWithRole('anon')
  process.env.SUPABASE_SERVICE_ROLE_KEY = jwtWithRole('service_role')
  process.env.STORAGE_PROVIDER = 'supabase'
  process.env.SUPABASE_STORAGE_BUCKET = 'avatars'
  process.env.SUPABASE_STORAGE_ACCESS = 'signed'
  process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = '3600'
  process.env.IMAGE_GENERATION_API_KEY = 'sk-proj-image-key'
  process.env.IMAGE_GENERATION_MODEL = 'gpt-image-1.5'
  process.env.IMAGE_GENERATION_SIZE = '1024x1536'
  process.env.IMAGE_GENERATION_OUTPUT_FORMAT = 'webp'
  process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION = '85'
  process.env.MODEL_INPUT_COST_PER_1M = '0.1'
  process.env.MODEL_OUTPUT_COST_PER_1M = '0.4'
  process.env.MODEL_TEMPERATURE = '0.85'
  process.env.MODEL_MAX_OUTPUT_TOKENS = '1600'
  process.env.MODEL_MIN_ROLEPLAY_REPLY_CHARS = '420'
  process.env.PROMPT_BUDGET_TOKENS = '6000'
  process.env.PROMPT_HISTORY_MAX_MESSAGES = '12'
  process.env.CHAT_PROVIDER_RETRY_ATTEMPTS = '2'
  process.env.CHAT_PROVIDER_RETRY_DELAY_MS = '350'
  process.env.CREATOR_DRAFT_RETRY_ATTEMPTS = '3'
  process.env.CREATOR_DRAFT_RETRY_DELAY_MS = '350'
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
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.SUPABASE_PUBLISHABLE_KEY
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.STORAGE_PROVIDER
    delete process.env.SUPABASE_STORAGE_BUCKET
    delete process.env.SUPABASE_STORAGE_ACCESS
    delete process.env.SUPABASE_SIGNED_URL_EXPIRES_IN
    delete process.env.IMAGE_GENERATION_API_KEY
    delete process.env.OPENAI_API_KEY

    expect(() => validateRuntimeEnv()).toThrow('ขาด production env ที่จำเป็น')
  })

  test('rejects production local storage provider', () => {
    setCompleteProductionEnv()
    process.env.STORAGE_PROVIDER = 'local'

    expect(() => validateRuntimeEnv()).toThrow('production env ไม่ถูกต้อง')
  })

  test('rejects production local cors and weak admin key', () => {
    setCompleteProductionEnv()
    process.env.CORS_ORIGINS = 'http://localhost:5173'
    process.env.ADMIN_API_KEY = 'short'

    expect(() => validateRuntimeEnv()).toThrow('CORS_ORIGINS ต้องเป็น https origin ใน production')
    expect(() => validateRuntimeEnv()).toThrow('ADMIN_API_KEY ต้องยาวอย่างน้อย 32 ตัวอักษร')
  })

  test('rejects production loopback cors origins beyond localhost', () => {
    setCompleteProductionEnv()
    process.env.CORS_ORIGINS = 'https://0.0.0.0:5173'

    expect(() => validateRuntimeEnv()).toThrow('0.0.0.0')

    setCompleteProductionEnv()
    process.env.CORS_ORIGINS = 'https://[::1]:5173'

    expect(() => validateRuntimeEnv()).toThrow('::1')
  })

  test('rejects production CORS origins with path query or hash', () => {
    setCompleteProductionEnv()
    process.env.CORS_ORIGINS = 'https://app.maprang.example/app?from=deploy#top'

    expect(() => validateRuntimeEnv()).toThrow('CORS_ORIGINS ต้องเป็น origin เท่านั้น ห้ามมี path/query/hash ใน production')
  })

  test('rejects mismatched Supabase issuer and anon storage key', () => {
    setCompleteProductionEnv()
    process.env.SUPABASE_JWT_ISSUER = 'https://other-project.supabase.co/auth/v1'
    process.env.SUPABASE_SERVICE_ROLE_KEY = jwtWithRole('anon')

    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_JWT_ISSUER ต้องเท่ากับ SUPABASE_URL + /auth/v1')
    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_SERVICE_ROLE_KEY ต้องใช้ key role service_role')
  })

  test('rejects provider key and numeric production env mistakes', () => {
    setCompleteProductionEnv()
    process.env.OPENROUTER_API_KEY = 'sk-proj-openai-key'
    process.env.SUPABASE_SIGNED_URL_EXPIRES_IN = 'later'
    process.env.MODEL_INPUT_COST_PER_1M = 'free'
    process.env.SUPABASE_STORAGE_ACCESS = 'public'
    process.env.IMAGE_GENERATION_API_KEY = 'sk-or-test-image-key'
    process.env.IMAGE_GENERATION_SIZE = 'large'
    process.env.IMAGE_GENERATION_OUTPUT_FORMAT = 'gif'
    process.env.IMAGE_GENERATION_OUTPUT_COMPRESSION = '101'
    process.env.MODEL_TEMPERATURE = '3'
    process.env.MODEL_MAX_OUTPUT_TOKENS = '64'
    process.env.MODEL_MIN_ROLEPLAY_REPLY_CHARS = 'soon'
    process.env.PROMPT_BUDGET_TOKENS = '100'
    process.env.PROMPT_HISTORY_MAX_MESSAGES = '100'
    process.env.CHAT_PROVIDER_RETRY_ATTEMPTS = '0'
    process.env.CHAT_PROVIDER_RETRY_DELAY_MS = 'later'
    process.env.CREATOR_DRAFT_RETRY_ATTEMPTS = '10'
    process.env.CREATOR_DRAFT_RETRY_DELAY_MS = '-1'

    expect(() => validateRuntimeEnv()).toThrow('OPENROUTER_API_KEY ดูเหมือนเป็น OpenAI project key')
    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_SIGNED_URL_EXPIRES_IN ต้องเป็นจำนวนเต็มบวก')
    expect(() => validateRuntimeEnv()).toThrow('SUPABASE_STORAGE_ACCESS ต้องเป็น signed ใน production')
    expect(() => validateRuntimeEnv()).toThrow('IMAGE_GENERATION_API_KEY ดูเหมือนเป็น OpenRouter key')
    expect(() => validateRuntimeEnv()).toThrow('IMAGE_GENERATION_SIZE ต้องใช้รูปแบบ WIDTHxHEIGHT')
    expect(() => validateRuntimeEnv()).toThrow('IMAGE_GENERATION_OUTPUT_FORMAT ต้องเป็น png, jpeg, หรือ webp')
    expect(() => validateRuntimeEnv()).toThrow('IMAGE_GENERATION_OUTPUT_COMPRESSION ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 100')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_INPUT_COST_PER_1M ต้องเป็นตัวเลข 0 หรือมากกว่า')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_TEMPERATURE ต้องอยู่ระหว่าง 0 ถึง 2')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_MAX_OUTPUT_TOKENS ต้องเป็นจำนวนเต็มตั้งแต่ 128 ถึง 2400')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 1200')
    expect(() => validateRuntimeEnv()).toThrow('PROMPT_BUDGET_TOKENS ต้องเป็นจำนวนเต็มตั้งแต่ 1200 ถึง 20000')
    expect(() => validateRuntimeEnv()).toThrow('PROMPT_HISTORY_MAX_MESSAGES ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 40')
    expect(() => validateRuntimeEnv()).toThrow('CHAT_PROVIDER_RETRY_ATTEMPTS ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5')
    expect(() => validateRuntimeEnv()).toThrow('CHAT_PROVIDER_RETRY_DELAY_MS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 5000')
    expect(() => validateRuntimeEnv()).toThrow('CREATOR_DRAFT_RETRY_ATTEMPTS ต้องเป็นจำนวนเต็มตั้งแต่ 1 ถึง 5')
    expect(() => validateRuntimeEnv()).toThrow('CREATOR_DRAFT_RETRY_DELAY_MS ต้องเป็นจำนวนเต็มตั้งแต่ 0 ถึง 5000')
  })

  test('rejects production roleplay reply budget below baseline', () => {
    setCompleteProductionEnv()
    process.env.MODEL_MAX_OUTPUT_TOKENS = '1199'
    process.env.MODEL_MIN_ROLEPLAY_REPLY_CHARS = '319'

    expect(() => validateRuntimeEnv()).toThrow('MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production')
    expect(() => validateRuntimeEnv()).toThrow('MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production')
  })

  test('rejects placeholder and local production database URLs', () => {
    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require'

    expect(() => validateRuntimeEnv()).toThrow('ขาด production env ที่จำเป็น: DATABASE_URL')

    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://maprang:secret@localhost:5432/maprang?sslmode=require'

    expect(() => validateRuntimeEnv()).toThrow('DATABASE_URL ห้ามชี้ไป localhost/127.0.0.1/0.0.0.0/::1 ใน production')

    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://maprang:secret@0.0.0.0:5432/maprang?sslmode=require'

    expect(() => validateRuntimeEnv()).toThrow('DATABASE_URL ห้ามชี้ไป localhost/127.0.0.1/0.0.0.0/::1 ใน production')

    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://maprang:secret@[::1]:5432/maprang?sslmode=require'

    expect(() => validateRuntimeEnv()).toThrow('DATABASE_URL ห้ามชี้ไป localhost/127.0.0.1/0.0.0.0/::1 ใน production')

    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://maprang:secret@db.example.net:5432/maprang'

    expect(() => validateRuntimeEnv()).toThrow('DATABASE_URL ต้องมี sslmode=require ใน production')
  })

  test('rejects non-OpenRouter chat keys in production', () => {
    setCompleteProductionEnv()
    process.env.OPENROUTER_API_KEY = 'sk-live-but-not-openrouter'

    expect(() => validateRuntimeEnv()).toThrow('OPENROUTER_API_KEY ต้องเป็น OpenRouter key ที่ขึ้นต้นด้วย sk-or-')
  })

  test('can report production env failures without throwing for health endpoints', () => {
    setCompleteProductionEnv()
    process.env.DATABASE_URL = 'postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require'
    process.env.OPENROUTER_API_KEY = 'sk-proj-openai-key'

    const status = validateRuntimeEnv({ throwOnError: false })

    expect(status.ok).toBe(false)
    expect(status.missingRequired).toContain('DATABASE_URL')
    expect(status.invalid).toContain('OPENROUTER_API_KEY ดูเหมือนเป็น OpenAI project key ไม่ใช่ OpenRouter key')
  })

  test('accepts complete production env', () => {
    setCompleteProductionEnv()

    const status = validateRuntimeEnv()

    expect(status.mode).toBe('production')
    expect(status.missingRequired).toEqual([])
    expect(status.invalid).toEqual([])
  })

  test('accepts publishable key as Supabase auth verification key', () => {
    setCompleteProductionEnv()
    delete process.env.SUPABASE_ANON_KEY
    process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_maprang_test_key'

    expect(validateRuntimeEnv().missingRequired).toEqual([])
  })
})
