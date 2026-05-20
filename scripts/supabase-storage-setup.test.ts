import { describe, expect, test } from 'bun:test'
import {
  encodedPath,
  loadEnvContent,
  normalizeSignedUrl,
  resolveSupabaseStorageConfig,
  runSupabaseStorageSetup,
  type SupabaseStorageOperations,
} from './supabase-storage-setup'

describe('Supabase storage setup helpers', () => {
  test('loads env content without overwriting existing values', () => {
    const env: Record<string, string | undefined> = {
      SUPABASE_STORAGE_BUCKET: 'existing',
    }

    loadEnvContent(
      [
        '# comment',
        'SUPABASE_URL="https://project-ref.supabase.co"',
        'SUPABASE_STORAGE_BUCKET=avatars',
        "SUPABASE_SERVICE_ROLE_KEY='service-role'",
      ].join('\n'),
      env,
    )

    expect(env.SUPABASE_URL).toBe('https://project-ref.supabase.co')
    expect(env.SUPABASE_STORAGE_BUCKET).toBe('existing')
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe('service-role')
  })

  test('validates production signed storage config', () => {
    const config = resolveSupabaseStorageConfig(
      {
        SUPABASE_URL: 'https://project-ref.supabase.co/',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_STORAGE_ACCESS: 'signed',
        SUPABASE_SIGNED_URL_EXPIRES_IN: '3600',
      },
      ['bun', 'script', '--check'],
    )

    expect(config.checkOnly).toBe(true)
    expect(config.bucket).toBe('avatars')
    expect(config.supabaseUrl).toBe('https://project-ref.supabase.co')
    expect(config.authHeaders.Authorization).toBe('Bearer service-role')
  })

  test('rejects unsafe storage config before network calls', () => {
    expect(() => resolveSupabaseStorageConfig({ SUPABASE_SERVICE_ROLE_KEY: 'service-role' })).toThrow('SUPABASE_URL ยังไม่ได้ตั้งค่า')
    expect(() => resolveSupabaseStorageConfig({ SUPABASE_URL: 'https://project-ref.supabase.co' })).toThrow(
      'SUPABASE_SERVICE_ROLE_KEY ยังไม่ได้ตั้งค่า',
    )
    expect(() =>
      resolveSupabaseStorageConfig({
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_STORAGE_ACCESS: 'public',
      }),
    ).toThrow('SUPABASE_STORAGE_ACCESS ต้องเป็น signed')
    expect(() =>
      resolveSupabaseStorageConfig({
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_SIGNED_URL_EXPIRES_IN: '30',
      }),
    ).toThrow('ไม่น้อยกว่า 60 วินาที')
  })

  test('normalizes signed URL response paths and encoded object paths', () => {
    const baseUrl = 'https://project-ref.supabase.co/'

    expect(encodedPath('avatars/smoke file.png')).toBe('avatars/smoke%20file.png')
    expect(normalizeSignedUrl('https://cdn.example.com/object.png', baseUrl)).toBe('https://cdn.example.com/object.png')
    expect(normalizeSignedUrl('/storage/v1/object/sign/avatars/file.png', baseUrl)).toBe(
      'https://project-ref.supabase.co/storage/v1/object/sign/avatars/file.png',
    )
    expect(normalizeSignedUrl('/object/sign/avatars/file.png', baseUrl)).toBe(
      'https://project-ref.supabase.co/storage/v1/object/sign/avatars/file.png',
    )
    expect(normalizeSignedUrl('object/sign/avatars/file.png', baseUrl)).toBe(
      'https://project-ref.supabase.co/storage/v1/object/sign/avatars/file.png',
    )
  })

  test('runs Supabase storage setup through an importable runner without network calls', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    const operations: SupabaseStorageOperations = {
      getBucket: async () => {
        calls.push('getBucket')
        return { exists: true, public: false }
      },
      createBucket: async () => {
        calls.push('createBucket')
      },
      updateBucketPrivate: async () => {
        calls.push('updateBucketPrivate')
      },
      uploadSmokeImage: async (_config, objectPath) => {
        calls.push(`upload:${objectPath}`)
      },
      createSignedUrl: async (_config, objectPath) => {
        calls.push(`sign:${objectPath}`)
        return 'https://project-ref.supabase.co/storage/v1/object/sign/avatars/smoke.png'
      },
      verifySignedUrl: async (signedUrl) => {
        calls.push(`verify:${signedUrl}`)
      },
      deleteObject: async (_config, objectPath) => {
        calls.push(`delete:${objectPath}`)
      },
    }

    const exitCode = await runSupabaseStorageSetup(
      {
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_STORAGE_ACCESS: 'signed',
        SUPABASE_SIGNED_URL_EXPIRES_IN: '3600',
      },
      ['bun', 'script', '--check'],
      {
        loadEnvFiles: false,
        operations,
        now: () => 1234,
        writeLine: (line) => lines.push(line),
        writeError: (line) => errors.push(line),
      },
    )

    const payload = JSON.parse(lines.at(-1) ?? '{}')
    expect(exitCode).toBe(0)
    expect(calls).toEqual([
      'getBucket',
      'getBucket',
      'getBucket',
      'upload:avatars/smoke-1234.png',
      'sign:avatars/smoke-1234.png',
      'verify:https://project-ref.supabase.co/storage/v1/object/sign/avatars/smoke.png',
      'delete:avatars/smoke-1234.png',
    ])
    expect(lines[0]).toBe('bucket: avatars')
    expect(payload.ok).toBe(true)
    expect(payload.access).toBe('signed')
    expect(errors).toEqual([])
  })

  test('returns a failure code when check mode finds a public bucket', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const operations: SupabaseStorageOperations = {
      getBucket: async () => ({ exists: true, public: true }),
      createBucket: async () => {},
      updateBucketPrivate: async () => {},
      uploadSmokeImage: async () => {},
      createSignedUrl: async () => 'https://project-ref.supabase.co/signed',
      verifySignedUrl: async () => {},
      deleteObject: async () => {},
    }

    const exitCode = await runSupabaseStorageSetup(
      {
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_STORAGE_ACCESS: 'signed',
      },
      ['bun', 'script', '--check'],
      {
        loadEnvFiles: false,
        operations,
        writeLine: (line) => lines.push(line),
        writeError: (line) => errors.push(line),
      },
    )

    expect(exitCode).toBe(1)
    expect(lines).toEqual(['bucket: avatars'])
    expect(errors.join('\n')).toContain('ก่อน production ต้องใช้ private bucket พร้อม signed URL')
  })
})
