import { describe, expect, test } from 'bun:test'
import {
  activeLocalChatModel,
  buildLocalSmokeSummary,
  formatLocalSmokeCaughtError,
  hasLocalChatRuntime,
  localRoleplayReplyMinimum,
  parseLocalSmokeStreamEvents,
  pickSmokeCharacter,
  runLocalSmoke,
  validateLocalChatStreamSmoke,
  validateLocalChatSmoke,
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
      'URL ที่ไม่ได้มาจากระบบหลังบ้าน',
    )
    expect(() => validateAvatarUpload({ ...upload, access: undefined as never }, 'http://127.0.0.1:3000')).toThrow(
      'ไม่ระบุ storage access',
    )
  })

  test('validates backend root identity before deeper smoke work', () => {
    expect(() => validateBackendRootIdentity({ ok: true, service: 'maprang-backend' })).not.toThrow()
    expect(() => validateBackendRootIdentity({ ok: false, service: 'maprang-backend' })).toThrow('ok=false')
    expect(() => validateBackendRootIdentity({ ok: true, service: 'other-service' })).toThrow('ชื่อ service ไม่ถูกต้อง')
  })

  test('validates local chat runtime, reply length, model, and zero-token usage', () => {
    const health = {
      ok: true,
      checks: { databaseConnected: true, openRouterConfigured: false },
      security: { avatarStorage: 'local' as const },
      model: {
        minRoleplayReplyChars: 450,
        chatProvider: { activeRuntimeProvider: 'local', localModel: 'local/custom-roleplay' },
      },
    }

    expect(hasLocalChatRuntime(health)).toBe(true)
    expect(activeLocalChatModel(health)).toBe('local/custom-roleplay')
    expect(localRoleplayReplyMinimum(health)).toBe(450)
    expect(
      validateLocalChatSmoke(
        {
          chatId: 'chat-1',
          reply: 'ก'.repeat(451),
          usage: { totalTokens: 0, modelName: 'local/custom-roleplay' },
        },
        'local/custom-roleplay',
        450,
      ),
    ).toMatchObject({ chatId: 'chat-1', replyChars: 451, totalTokens: 0, modelName: 'local/custom-roleplay' })

    expect(() =>
      validateLocalChatSmoke(
        {
          chatId: 'chat-1',
          reply: 'สั้น',
          usage: { totalTokens: 0, modelName: 'local/custom-roleplay' },
        },
        'local/custom-roleplay',
        450,
      ),
    ).toThrow('ตอบสั้นเกินไป')
    expect(() =>
      validateLocalChatSmoke(
        {
          chatId: 'chat-1',
          reply: 'ก'.repeat(451),
          usage: { totalTokens: 12, modelName: 'local/custom-roleplay' },
        },
        'local/custom-roleplay',
        450,
      ),
    ).toThrow('ต้องไม่คิดโทเคน')
  })

  test('validates local chat stream events, reply length, model, and zero-token usage', () => {
    const raw = [
      'event: delta',
      `data: ${JSON.stringify({ type: 'delta', content: 'ก'.repeat(230) })}`,
      '',
      `data: ${JSON.stringify({ type: 'delta', content: 'ข'.repeat(230) })}`,
      '',
      `data: ${JSON.stringify({ type: 'done', chatId: 'chat-1', usage: { totalTokens: 0, modelName: 'local/mock-roleplay' } })}`,
      '',
    ].join('\n')
    const events = parseLocalSmokeStreamEvents(raw)

    expect(events).toHaveLength(3)
    expect(validateLocalChatStreamSmoke(events, 'local/mock-roleplay', 420)).toMatchObject({
      chatId: 'chat-1',
      replyChars: 460,
      totalTokens: 0,
      modelName: 'local/mock-roleplay',
      eventCount: 3,
    })
    expect(() => parseLocalSmokeStreamEvents('data: {broken')).toThrow('stream event')
    expect(() =>
      validateLocalChatStreamSmoke(
        [
          { type: 'delta', content: 'สั้น' },
          { type: 'done', chatId: 'chat-1', usage: { totalTokens: 0, modelName: 'local/mock-roleplay' } },
        ],
        'local/mock-roleplay',
        420,
      ),
    ).toThrow('ตอบสั้นเกินไป')
    expect(() =>
      validateLocalChatStreamSmoke(
        [
          { type: 'delta', content: 'ก'.repeat(430) },
          { type: 'done', chatId: 'chat-1', usage: { totalTokens: 1, modelName: 'local/mock-roleplay' } },
        ],
        'local/mock-roleplay',
        420,
      ),
    ).toThrow('ต้องไม่คิดโทเคน')
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
    const streamCalls: string[] = []
    const cleaned: string[] = []
    const reader: LocalSmokeJsonReader = async (path) => {
      calls.push(path)
      if (path === '/') return { ok: true, service: 'maprang-backend' } as never
      if (path === '/health') {
        return {
          ok: true,
          checks: { databaseConnected: true, openRouterConfigured: true },
          security: { avatarStorage: 'local' },
          model: {
            minRoleplayReplyChars: 420,
            chatProvider: { activeRuntimeProvider: 'local', localModel: 'local/mock-roleplay' },
          },
        } as never
      }
      if (path === '/characters?view=admin&limit=10') {
        return { characters: [{ id: 'mika', name: 'มิกะ | MIKA', tags: ['qa'] }] } as never
      }
      if (path === '/characters/mika/lore') return { loreEntries: [{ id: 'lore-1', keyword: 'cafe' }] } as never
      if (path === '/relationship/preview') return { preview: { turns: ['a', 'b'] } } as never
      if (path === '/chat') {
        return {
          chatId: 'chat-1',
          reply: 'ก'.repeat(430),
          usage: { totalTokens: 0, modelName: 'local/mock-roleplay' },
        } as never
      }
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
    const streamReader = async (path: string) => {
      streamCalls.push(path)
      return [
        { type: 'delta' as const, content: 'ก'.repeat(220) },
        { type: 'delta' as const, content: 'ข'.repeat(220) },
        {
          type: 'done' as const,
          chatId: 'chat-1',
          usage: { totalTokens: 0, modelName: 'local/mock-roleplay' },
        },
      ]
    }

    const exitCode = await runLocalSmoke({
      apiBaseUrl: 'http://127.0.0.1:3000',
      isLocalTarget: true,
      readJson: reader,
      readStreamEvents: streamReader,
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      cleanupLocalUpload: async (filename) => {
        cleaned.push(filename)
      },
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    const summary = JSON.parse(lines.join('\n'))
    expect(exitCode).toBe(0)
    expect(calls).toEqual([
      '/',
      '/health',
      '/characters?view=admin&limit=10',
      '/characters/mika/lore',
      '/relationship/preview',
      '/chat',
      '/uploads/avatar',
    ])
    expect(cleaned).toEqual(['avatar.png'])
    expect(summary.character).toBe('มิกะ | MIKA')
    expect(summary.loreCount).toBe(1)
    expect(summary.previewTurns).toBe(2)
    expect(summary.chatModel).toBe('local/mock-roleplay')
    expect(summary.chatReplyChars).toBe(430)
    expect(summary.chatTokens).toBe(0)
    expect(streamCalls).toEqual(['/chat/stream'])
    expect(summary.streamModel).toBe('local/mock-roleplay')
    expect(summary.streamReplyChars).toBe(440)
    expect(summary.streamTokens).toBe(0)
    expect(summary.streamEvents).toBe(3)
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
    expect(errors).toEqual(['ตรวจระบบ local ไม่ผ่าน: ตัวอย่างความสัมพันธ์ไม่คืน turn ทดสอบ'])
  })

  test('redacts secret-shaped values from local smoke caught errors', async () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    expect(formatLocalSmokeCaughtError(new Error(`health failed ${fakeDatabaseUrl}`))).toContain(
      'postgresql://[REDACTED_SECRET]',
    )
    expect(formatLocalSmokeCaughtError(new Error(`health failed ${fakeDatabaseUrl}`))).not.toContain('super-secret')

    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runLocalSmoke({
      readJson: async () => {
        throw new Error(`backend failed ${fakeDatabaseUrl}`)
      },
      authHeaders: () => ({ Authorization: 'Bearer smoke' }),
      writeLine: (line) => lines.push(line),
      writeError: (line) => errors.push(line),
    })

    expect(exitCode).toBe(1)
    expect(lines).toEqual([])
    expect(errors.join('\n')).toContain('postgresql://[REDACTED_SECRET]')
    expect(errors.join('\n')).not.toContain('super-secret')
  })

  test('formats object-shaped local smoke errors without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:local-object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatLocalSmokeCaughtError({
      message: `backend failed ${fakeDatabaseUrl}`,
      toString() {
        throw new Error('raw object should not be stringified')
      },
    })

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('local-object-secret')
    expect(formatLocalSmokeCaughtError({ error: 'relationship preview failed' })).toBe('relationship preview failed')
    expect(formatLocalSmokeCaughtError({ code: 'ECONNREFUSED' })).toBe('ไม่ทราบสาเหตุ')
  })
})
