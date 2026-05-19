import { describe, expect, test } from 'bun:test'
import {
  encodedPath,
  loadEnvContent,
  normalizeSignedUrl,
  resolveSupabaseStorageConfig,
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
    expect(() => resolveSupabaseStorageConfig({ SUPABASE_SERVICE_ROLE_KEY: 'service-role' })).toThrow('SUPABASE_URL is missing')
    expect(() =>
      resolveSupabaseStorageConfig({
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_STORAGE_ACCESS: 'public',
      }),
    ).toThrow('SUPABASE_STORAGE_ACCESS must be signed')
    expect(() =>
      resolveSupabaseStorageConfig({
        SUPABASE_URL: 'https://project-ref.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'service-role',
        SUPABASE_SIGNED_URL_EXPIRES_IN: '30',
      }),
    ).toThrow('at least 60 seconds')
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
})
