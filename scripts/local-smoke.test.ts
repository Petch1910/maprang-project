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
  validateLocalContentSettings,
  validateLocalAdminModerationSnapshot,
  validateLocalCreatorDraft,
  validateLocalCreatorPreview,
  validateLocalPersona,
  validateLocalUsageSummary,
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

  test('validates local wallet and usage summary shape', () => {
    const payload = {
      user: { tokenBalance: 1200 },
      usage: {
        totalCost: '0.0000',
        byModel: [{ model: 'local/mock-roleplay' }],
        daily: Array.from({ length: 7 }, (_, index) => ({ date: `2026-06-${index + 1}`, tokens: 0 })),
        estimate: { averageTokensPerRequest: 420, estimatedRemainingRequests: 2 },
      },
      wallet: { transactions: [{ id: 'tx-1' }] },
    }

    expect(validateLocalUsageSummary(payload)).toMatchObject({
      tokenBalance: 1200,
      totalCost: '0.0000',
      usageModels: 1,
      usageDailyDays: 7,
      averageTokensPerRequest: 420,
      estimatedRemainingRequests: 2,
      walletTransactions: 1,
    })
    expect(() => validateLocalUsageSummary({ ...payload, user: {} })).toThrow('tokenBalance')
    expect(() => validateLocalUsageSummary({ ...payload, usage: { ...payload.usage, daily: [] } })).toThrow('กราฟ usage 7 วัน')
    expect(() =>
      validateLocalUsageSummary({
        ...payload,
        usage: { ...payload.usage, estimate: { averageTokensPerRequest: 420, estimatedRemainingRequests: 'many' as never } },
      }),
    ).toThrow('estimatedRemainingRequests')
    expect(() => validateLocalUsageSummary({ ...payload, wallet: { transactions: {} as never } })).toThrow('รายการกระเป๋า')
  })

  test('validates local profile content settings and persona shape', () => {
    expect(validateLocalContentSettings({ contentSettings: { isAdult: true, maxRating: 'restricted_18' } })).toMatchObject({
      isAdult: true,
      maxRating: 'restricted_18',
    })
    expect(validateLocalPersona({ persona: { persona: 'ชื่อ: มะปราง', updatedAt: '2026-06-11T00:00:00.000Z', maxChars: 2000 } })).toMatchObject({
      personaChars: 12,
      personaMaxChars: 2000,
      personaUpdated: true,
    })
    expect(() => validateLocalContentSettings({})).toThrow('contentSettings')
    expect(() => validateLocalContentSettings({ contentSettings: { isAdult: 'yes' as never, maxRating: 'teen_romance' } })).toThrow(
      'isAdult',
    )
    expect(() => validateLocalContentSettings({ contentSettings: { isAdult: false, maxRating: 'unknown' } })).toThrow('maxRating')
    expect(() => validateLocalPersona({ persona: { persona: 'ยาวเกิน', updatedAt: null, maxChars: 3 } })).toThrow('ยาวเกิน')
    expect(() => validateLocalPersona({ persona: { persona: '', updatedAt: 123 as never, maxChars: 2000 } })).toThrow('updatedAt')
    expect(() => validateLocalPersona({ persona: { persona: '', updatedAt: null, maxChars: 0 } })).toThrow('maxChars')
  })

  test('validates local moderation reports and audit log snapshot shape', () => {
    expect(validateLocalAdminModerationSnapshot({ reports: [{ id: 'report-1' }] }, { logs: [{ id: 'audit-1' }, { id: 'audit-2' }] })).toMatchObject({
      reports: 1,
      auditLogs: 2,
    })
    expect(() => validateLocalAdminModerationSnapshot({}, { logs: [] })).toThrow('reports array')
    expect(() => validateLocalAdminModerationSnapshot({ reports: [] }, {})).toThrow('audit logs array')
  })

  test('validates local creator AI draft fallback shape', () => {
    const payload = {
      draft: {
        name: 'มิกะ | MIKA',
        greeting: 'มาถึงแล้วเหรอ...',
        tags: 'roleplay, thai, slow-burn',
      },
      image: {
        url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%3E%3C/svg%3E',
        provider: 'placeholder',
        note: 'ข้ามผู้ให้บริการสร้างรูปสำหรับ smoke/dev check',
      },
      source: 'fallback',
      warnings: [],
    }

    expect(validateLocalCreatorDraft(payload)).toMatchObject({
      draftName: 'มิกะ | MIKA',
      draftGreetingChars: 16,
      draftTagChars: 25,
      imageProvider: 'placeholder',
      source: 'fallback',
      warnings: 0,
    })
    expect(() => validateLocalCreatorDraft({ ...payload, draft: { ...payload.draft, name: '' } })).toThrow('ยังไม่มีชื่อ')
    expect(() => validateLocalCreatorDraft({ ...payload, image: { ...payload.image, provider: 'configured' } })).toThrow('placeholder')
    expect(() => validateLocalCreatorDraft({ ...payload, source: 'ai' })).toThrow('fallback')
    expect(() => validateLocalCreatorDraft({ ...payload, warnings: {} as never })).toThrow('warnings')
  })

  test('validates local creator preview simulator shape', () => {
    const payload = {
      preview: {
        reply: 'คำตอบพรีวิวในเครื่องสำหรับลองบทก่อนเผยแพร่ '.repeat(3),
        source: 'local',
        modelName: 'local/preview',
        usage: { promptTokens: 120, completionTokens: 96, totalTokens: 216 },
        prompt: {
          system: 'ตอบเป็นตัวละครภาษาไทยแบบโรลเพลย์',
          user: 'เธอรอนานหรือเปล่า',
          estimatedTokens: 120,
        },
        warnings: ['ใช้คำตอบพรีวิวในเครื่อง'],
      },
    }

    expect(validateLocalCreatorPreview(payload)).toMatchObject({
      replyChars: payload.preview.reply.length,
      source: 'local',
      modelName: 'local/preview',
      promptTokens: 120,
      completionTokens: 96,
      totalTokens: 216,
      estimatedTokens: 120,
      warnings: 1,
    })
    expect(() => validateLocalCreatorPreview({})).toThrow('ยังไม่มี preview')
    expect(() => validateLocalCreatorPreview({ preview: { ...payload.preview, reply: 'สั้น' } })).toThrow('สั้นเกินไป')
    expect(() => validateLocalCreatorPreview({ preview: { ...payload.preview, source: 'ai' } })).toThrow('local source')
    expect(() => validateLocalCreatorPreview({ preview: { ...payload.preview, modelName: 'other' } })).toThrow('local/preview')
    expect(() => validateLocalCreatorPreview({ preview: { ...payload.preview, warnings: {} as never } })).toThrow('warnings')
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
      usage: {
        tokenBalance: 1200,
        totalCost: '0.0000',
        usageModels: 1,
        usageDailyDays: 7,
        averageTokensPerRequest: 420,
        estimatedRemainingRequests: 2,
        walletTransactions: 1,
      },
      contentSettings: {
        isAdult: true,
        maxRating: 'restricted_18',
      },
      persona: {
        personaChars: 12,
        personaMaxChars: 2000,
        personaUpdated: true,
      },
      moderation: {
        reports: 1,
        auditLogs: 2,
      },
      moderationSkippedReason: null,
      creatorDraft: {
        draftName: 'มิกะ | MIKA',
        draftGreetingChars: 16,
        draftTagChars: 25,
        imageProvider: 'placeholder',
        source: 'fallback',
        warnings: 0,
      },
      creatorPreview: {
        replyChars: 144,
        source: 'local',
        modelName: 'local/preview',
        promptTokens: 120,
        completionTokens: 96,
        totalTokens: 216,
        estimatedTokens: 120,
        warnings: 1,
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
      tokenBalance: 1200,
      usageDailyDays: 7,
      walletTransactions: 1,
      contentMaxRating: 'restricted_18',
      contentIsAdult: true,
      personaChars: 12,
      personaMaxChars: 2000,
      personaUpdated: true,
      moderationReports: 1,
      moderationAuditLogs: 2,
      moderationSkippedReason: null,
      creatorDraftName: 'มิกะ | MIKA',
      creatorDraftImageProvider: 'placeholder',
      creatorDraftSource: 'fallback',
      creatorPreviewReplyChars: 144,
      creatorPreviewModel: 'local/preview',
      creatorPreviewSource: 'local',
      creatorPreviewTokens: 216,
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
      if (path === '/me/usage') {
        return {
          user: { tokenBalance: 1200 },
          usage: {
            totalCost: '0.0000',
            byModel: [{ model: 'local/mock-roleplay' }],
            daily: Array.from({ length: 7 }, (_, index) => ({ date: `2026-06-${index + 1}`, tokens: 0 })),
            estimate: { averageTokensPerRequest: 420, estimatedRemainingRequests: 2 },
          },
          wallet: { transactions: [{ id: 'tx-1' }] },
        } as never
      }
      if (path === '/me/content-settings') {
        return { contentSettings: { isAdult: true, maxRating: 'restricted_18' } } as never
      }
      if (path === '/me/persona') {
        return { persona: { persona: 'ชื่อ: มะปราง', updatedAt: '2026-06-11T00:00:00.000Z', maxChars: 2000 } } as never
      }
      if (path === '/admin/reports?limit=5') return { reports: [{ id: 'report-1' }] } as never
      if (path === '/admin/audit-logs?limit=5') return { logs: [{ id: 'audit-1' }, { id: 'audit-2' }] } as never
      if (path === '/creator/ai-draft') {
        return {
          draft: {
            name: 'มิกะ | MIKA',
            greeting: 'มาถึงแล้วเหรอ...',
            tags: 'roleplay, thai, slow-burn',
          },
          image: {
            url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%3E%3C/svg%3E',
            provider: 'placeholder',
            note: 'ข้ามผู้ให้บริการสร้างรูปสำหรับ smoke/dev check',
          },
          source: 'fallback',
          warnings: [],
        } as never
      }
      if (path === '/creator/preview-chat') {
        return {
          preview: {
            reply: 'คำตอบพรีวิวในเครื่องสำหรับลองบทก่อนเผยแพร่ '.repeat(3),
            source: 'local',
            modelName: 'local/preview',
            usage: { promptTokens: 120, completionTokens: 96, totalTokens: 216 },
            prompt: {
              system: 'ตอบเป็นตัวละครภาษาไทยแบบโรลเพลย์',
              user: 'เธอรอนานหรือเปล่า',
              estimatedTokens: 120,
            },
            warnings: ['ใช้คำตอบพรีวิวในเครื่อง'],
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
      authHeaders: () => ({ Authorization: 'Bearer smoke', 'x-admin-key': 'admin-smoke-key' }),
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
      '/me/usage',
      '/me/content-settings',
      '/me/persona',
      '/admin/reports?limit=5',
      '/admin/audit-logs?limit=5',
      '/creator/ai-draft',
      '/creator/preview-chat',
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
    expect(summary.tokenBalance).toBe(1200)
    expect(summary.usageDailyDays).toBe(7)
    expect(summary.walletTransactions).toBe(1)
    expect(summary.contentMaxRating).toBe('restricted_18')
    expect(summary.contentIsAdult).toBe(true)
    expect(summary.personaChars).toBe(12)
    expect(summary.personaMaxChars).toBe(2000)
    expect(summary.personaUpdated).toBe(true)
    expect(summary.moderationReports).toBe(1)
    expect(summary.moderationAuditLogs).toBe(2)
    expect(summary.moderationSkippedReason).toBeNull()
    expect(summary.creatorDraftName).toBe('มิกะ | MIKA')
    expect(summary.creatorDraftImageProvider).toBe('placeholder')
    expect(summary.creatorDraftSource).toBe('fallback')
    expect(summary.creatorPreviewModel).toBe('local/preview')
    expect(summary.creatorPreviewSource).toBe('local')
    expect(summary.creatorPreviewReplyChars).toBeGreaterThanOrEqual(80)
    expect(summary.creatorPreviewTokens).toBe(216)
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
      if (path === '/me/usage') {
        return {
          user: { tokenBalance: 1200 },
          usage: {
            totalCost: '0.0000',
            byModel: [],
            daily: Array.from({ length: 7 }, (_, index) => ({ date: `2026-06-${index + 1}`, tokens: 0 })),
            estimate: { averageTokensPerRequest: 420, estimatedRemainingRequests: 2 },
          },
          wallet: { transactions: [] },
        } as never
      }
      if (path === '/me/content-settings') {
        return { contentSettings: { isAdult: false, maxRating: 'teen_romance' } } as never
      }
      if (path === '/me/persona') {
        return { persona: { persona: '', updatedAt: null, maxChars: 2000 } } as never
      }
      if (path === '/creator/ai-draft') {
        return {
          draft: {
            name: 'มิกะ | MIKA',
            greeting: 'มาถึงแล้วเหรอ...',
            tags: 'roleplay, thai, slow-burn',
          },
          image: {
            url: 'data:image/svg+xml;charset=UTF-8,%3Csvg%3E%3C/svg%3E',
            provider: 'placeholder',
            note: 'ข้ามผู้ให้บริการสร้างรูปสำหรับ smoke/dev check',
          },
          source: 'fallback',
          warnings: [],
        } as never
      }
      if (path === '/creator/preview-chat') {
        return {
          preview: {
            reply: 'คำตอบพรีวิวในเครื่องสำหรับลองบทก่อนเผยแพร่ '.repeat(3),
            source: 'local',
            modelName: 'local/preview',
            usage: { promptTokens: 120, completionTokens: 96, totalTokens: 216 },
            prompt: {
              system: 'ตอบเป็นตัวละครภาษาไทยแบบโรลเพลย์',
              user: 'เธอรอนานหรือเปล่า',
              estimatedTokens: 120,
            },
            warnings: ['ใช้คำตอบพรีวิวในเครื่อง'],
          },
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
