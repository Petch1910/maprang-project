import { describe, expect, test } from 'bun:test'
import {
  buildLocalSmokeSummary,
  pickSmokeCharacter,
  runLocalSmoke,
  validateAvatarUpload,
  type LocalSmokeJsonReader,
} from './local-smoke'
import { validateBackendRootIdentity } from './smoke-helpers'

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
      'content type ไม่ถูกต้อง',
    )
    expect(() => validateAvatarUpload({ ...upload, url: 'https://cdn.example.com/avatar.png' }, 'http://127.0.0.1:3000')).toThrow(
      'URL ที่ไม่ได้มาจาก backend',
    )
    expect(() => validateAvatarUpload({ ...upload, access: undefined as never }, 'http://127.0.0.1:3000')).toThrow(
      'ไม่ระบุ storage access',
    )
  })

  test('validates backend root identity before deeper smoke work', () => {
    expect(() => validateBackendRootIdentity({ ok: true, service: 'maprang-backend' })).not.toThrow()
    expect(() => validateBackendRootIdentity({ ok: false, service: 'maprang-backend' })).toThrow('ok=false')
    expect(() => validateBackendRootIdentity({ ok: true, service: 'other-service' })).toThrow('unexpected service name')
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

  test('runs local smoke through an importable runner without touching storage', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const calls: string[] = []
    const cleaned: string[] = []
    const reader: LocalSmokeJsonReader = async (path) => {
      calls.push(path)
      if (path === '/') return { ok: true, service: 'maprang-backend' } as never
      if (path === '/health') {
        return {
          ok: true,
          checks: { databaseConnected: true, openRouterConfigured: true },
          security: { avatarStorage: 'local' },
        } as never
      }
      if (path === '/characters?view=admin&limit=10') {
        return { characters: [{ id: 'mika', name: 'มิกะ | MIKA', tags: ['qa'] }] } as never
      }
      if (path === '/characters/mika/lore') return { loreEntries: [{ id: 'lore-1', keyword: 'cafe' }] } as never
      if (path === '/relationship/preview') return { preview: { turns: ['a', 'b'] } } as never
      if (path === '/uploads/avatar') {
        return {
          url: 'http://127.0.0.1:3000/uploads/avatars/avatar.png',
          filename: 'avatar.png',
          provider: 'local',
          access: 'local',
          contentType: 'image/png',
        } as never
      }
      throw new Error(`unexpected path ${path}`)
    }

    const exitCode = await runLocalSmoke({
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalTarget: true,
      readJson: reader,
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      cleanupLocalUpload: async (filename) => {
        cleaned.push(filename)
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const summary = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(calls).toEqual(['/', '/health', '/characters?view=admin&limit=10', '/characters/mika/lore', '/relationship/preview', '/uploads/avatar'])
    expect(cleaned).toEqual(['avatar.png'])
    expect(summary.character).toBe('มิกะ | MIKA')
    expect(summary.loreCount).toBe(1)
    expect(summary.previewTurns).toBe(2)
    expect(errors).toEqual([])
  })

  test('returns a failure code when local smoke has no preview turns', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const reader: LocalSmokeJsonReader = async (path) => {
      if (path === '/') return { ok: true, service: 'maprang-backend' } as never
      if (path === '/health') {
        return {
          ok: true,
          checks: { databaseConnected: true, openRouterConfigured: true },
          security: { avatarStorage: 'supabase' },
        } as never
      }
      if (path === '/characters?view=admin&limit=10') {
        return { characters: [{ id: 'mika', name: 'มิกะ | MIKA', tags: ['qa'] }] } as never
      }
      if (path === '/characters/mika/lore') return { loreEntries: [] } as never
      if (path === '/relationship/preview') return { preview: { turns: [] } } as never
      throw new Error(`unexpected path ${path}`)
    }

    const exitCode = await runLocalSmoke({
      readJson: reader,
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors).toEqual(['ตรวจระบบ local ไม่ผ่าน: Relationship preview ไม่คืน turn ทดสอบ'])
  })
})
