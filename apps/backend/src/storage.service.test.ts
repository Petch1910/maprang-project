import { describe, expect, test } from 'bun:test'
import { avatarExtension, avatarUrl, safeAvatarFilename, supabaseStorageAccess } from './storage.service'

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

  test('uses stable backend avatar URLs', () => {
    expect(avatarUrl('https://api.example.com', '550e8400-e29b-41d4-a716-446655440000.png')).toBe(
      'https://api.example.com/uploads/avatars/550e8400-e29b-41d4-a716-446655440000.png',
    )
  })

  test('defaults Supabase storage access to signed URLs', () => {
    expect(supabaseStorageAccess).toBe('signed')
  })
})
