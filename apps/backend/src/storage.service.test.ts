import { describe, expect, test } from 'bun:test'
import {
  avatarExtension,
  avatarStorageMessages,
  avatarUrl,
  normalizeSupabaseSignedUrl,
  readSupabaseSignedUrlPayload,
  readStorageObjectSignedUrlPayload,
  safeAvatarFilename,
  safeStorageObjectPath,
  supabaseStorageAccess,
} from './storage.service'

describe('storage service', () => {
  test('normalizes supported avatar extensions', () => {
    expect(avatarExtension(new File(['image'], 'avatar.jpeg', { type: 'image/jpeg' }))).toBe('.jpg')
    expect(avatarExtension(new File(['image'], 'avatar.webp', { type: 'image/webp' }))).toBe('.webp')
  })

  test('rejects unsupported avatar types even when the filename looks safe', () => {
    expect(avatarExtension(new File(['text'], 'avatar.png', { type: 'text/plain' }))).toBeNull()
  })

  test('accepts only generated-looking avatar filenames', () => {
    expect(safeAvatarFilename('550e8400-e29b-41d4-a716-446655440000.png')).toBe('550e8400-e29b-41d4-a716-446655440000.png')
    expect(safeAvatarFilename('../avatar.png')).toBeNull()
    expect(safeAvatarFilename('avatar.svg')).toBeNull()
  })

  test('accepts only safe storage object paths', () => {
    expect(safeStorageObjectPath('avatars/generated/image.png')).toBe('avatars/generated/image.png')
    expect(safeStorageObjectPath('/avatars/generated/image.png')).toBe('avatars/generated/image.png')
    expect(safeStorageObjectPath('../secret.png')).toBeNull()
    expect(safeStorageObjectPath('avatars\\secret.png')).toBeNull()
    expect(safeStorageObjectPath('https://example.com/image.png')).toBeNull()
  })

  test('uses stable backend avatar URLs', () => {
    expect(avatarUrl('https://api.example.com', '550e8400-e29b-41d4-a716-446655440000.png')).toBe(
      'https://api.example.com/uploads/avatars/550e8400-e29b-41d4-a716-446655440000.png',
    )
  })

  test('defaults Supabase storage access to signed URLs', () => {
    expect(supabaseStorageAccess).toBe('signed')
  })

  test('normalizes Supabase signed URL response paths', () => {
    const supabaseUrl = 'https://example.supabase.co'
    expect(normalizeSupabaseSignedUrl(supabaseUrl, 'https://cdn.example.com/avatar.png')).toBe('https://cdn.example.com/avatar.png')
    expect(normalizeSupabaseSignedUrl(supabaseUrl, '/storage/v1/object/sign/avatars/a.png?token=abc')).toBe(
      'https://example.supabase.co/storage/v1/object/sign/avatars/a.png?token=abc',
    )
    expect(normalizeSupabaseSignedUrl(supabaseUrl, '/object/sign/avatars/a.png?token=abc')).toBe(
      'https://example.supabase.co/storage/v1/object/sign/avatars/a.png?token=abc',
    )
  })

  test('keeps Supabase storage failure messages Thai-first', () => {
    expect(avatarStorageMessages.fileRequired).toContain('แนบไฟล์รูปตัวละคร')
    expect(avatarStorageMessages.typeNotSupported).toContain('JPG')
    expect(avatarStorageMessages.tooLarge(2 * 1024 * 1024)).toContain('2 MB')
    expect(avatarStorageMessages.notFound).toContain('ไม่พบรูปตัวละคร')
    expect(avatarStorageMessages.notConfigured).toContain('ยังไม่ได้ตั้งค่า')
    expect(avatarStorageMessages.uploadFailed(502)).toContain('อัปโหลดรูปตัวละคร')
    expect(avatarStorageMessages.signedUrlFailed(500)).toContain('signed URL')
    expect(avatarStorageMessages.signedUrlMissing).toContain('signed URL')
    expect(avatarStorageMessages.signedUrlMalformed).toContain('signed URL')
    expect(avatarStorageMessages.unavailable).toContain('พื้นที่เก็บรูปตัวละคร')
  })

  test('wraps malformed Supabase signed URL payloads in Thai-first errors', async () => {
    await expect(readSupabaseSignedUrlPayload(new Response('not-json', { status: 200 }))).rejects.toThrow(
      'Supabase ส่งข้อมูล signed URL ของรูปตัวละครไม่ถูกต้อง',
    )
    await expect(readStorageObjectSignedUrlPayload(new Response('not-json', { status: 200 }))).rejects.toThrow(
      'Supabase ส่งข้อมูล signed URL ของไฟล์ไม่ถูกต้อง',
    )
  })
})
