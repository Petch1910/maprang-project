import { describe, expect, test } from 'bun:test'
import { buildLocalSmokeSummary, pickSmokeCharacter, validateAvatarUpload } from './local-smoke'

describe('local smoke helpers', () => {
  test('prefers MIKA, then Maprang, then the first available character', () => {
    const fallback = { id: '1', name: 'First', tags: [] }
    const maprang = { id: '2', name: 'Maprang', tags: ['platform'] }
    const mika = { id: '3', name: 'มิกะ | MIKA', tags: ['qa'] }

    expect(pickSmokeCharacter([fallback, maprang, mika])).toBe(mika)
    expect(pickSmokeCharacter([fallback, maprang])).toBe(maprang)
    expect(pickSmokeCharacter([fallback])).toBe(fallback)
    expect(pickSmokeCharacter([])).toBeNull()
  })

  test('validates avatar upload shape before cleanup', () => {
    const upload = {
      url: 'http://127.0.0.1:3000/uploads/avatars/avatar.png',
      filename: 'avatar.png',
      provider: 'local' as const,
      access: 'local' as const,
      contentType: 'image/png',
    }

    expect(() => validateAvatarUpload(upload, 'http://127.0.0.1:3000')).not.toThrow()
    expect(() => validateAvatarUpload({ ...upload, contentType: 'text/plain' }, 'http://127.0.0.1:3000')).toThrow(
      'unexpected content type',
    )
    expect(() => validateAvatarUpload({ ...upload, url: 'https://cdn.example.com/avatar.png' }, 'http://127.0.0.1:3000')).toThrow(
      'non-backend URL',
    )
  })

  test('formats local smoke summary fields used by QA logs', () => {
    const summary = buildLocalSmokeSummary({
      apiBaseUrl: 'http://127.0.0.1:3000',
      health: {
        ok: true,
        checks: { databaseConnected: true, openRouterConfigured: true },
        security: { avatarStorage: 'supabase' },
      },
      smokeCharacter: { id: '1', name: 'มิกะ | MIKA', tags: ['qa', 'scene-ready'] },
      loreCount: 2,
      previewTurns: 3,
      upload: {
        url: 'http://127.0.0.1:3000/uploads/avatars/avatar.png',
        filename: 'avatar.png',
        provider: 'supabase',
        access: 'signed',
        contentType: 'image/png',
      },
    })

    expect(summary).toMatchObject({
      ok: true,
      avatarStorage: 'supabase',
      character: 'มิกะ | MIKA',
      loreCount: 2,
      previewTurns: 3,
      uploadAccess: 'signed',
    })
  })
})
