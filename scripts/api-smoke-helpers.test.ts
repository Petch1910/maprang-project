import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  assertMachineReadableErrorCode,
  creatorImageIssue,
  formatApiSmokeCaughtError,
  formatApiSmokeDiagnostic,
  isMachineReadableErrorCode,
  isOnlyLiveVerificationFailure,
  parseApiSmokeStreamEvents,
  tryParseJson,
} from './api-smoke-helpers'
import {
  buildApiSmokeSummary,
  formatApiSmokeStatus,
  normalizeApiSmokeAdminKey,
  parseApiSmokeAdminKeyLine,
  runApiSmoke,
  type ApiSmokeResult,
} from './api-smoke'

const root = join(import.meta.dir, '..')

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

describe('api smoke helpers', () => {
  test('formats API smoke result statuses in Thai', () => {
    expect(formatApiSmokeStatus('pass')).toBe('ผ่าน')
    expect(formatApiSmokeStatus('warn')).toBe('เตือน')
    expect(formatApiSmokeStatus('fail')).toBe('ไม่ผ่าน')
    expect(formatApiSmokeStatus('skip')).toBe('ข้าม')
  })

  test('normalizes quoted admin key values like dotenv before admin smoke requests', () => {
    expect(normalizeApiSmokeAdminKey(' "quoted-admin-key" ')).toBe('quoted-admin-key')
    expect(normalizeApiSmokeAdminKey(" 'single-quoted-admin-key' ")).toBe('single-quoted-admin-key')
    expect(normalizeApiSmokeAdminKey('plain-admin-key')).toBe('plain-admin-key')
    expect(normalizeApiSmokeAdminKey('   ')).toBeNull()

    expect(parseApiSmokeAdminKeyLine('ADMIN_API_KEY="quoted-admin-key"')).toBe('quoted-admin-key')
    expect(parseApiSmokeAdminKeyLine("  ADMIN_API_KEY='single-quoted-admin-key'  ")).toBe(
      'single-quoted-admin-key',
    )
    expect(parseApiSmokeAdminKeyLine('OPENROUTER_API_KEY="not-admin"')).toBeNull()
  })

  test('keeps API smoke diagnostics Thai-first', async () => {
    const apiSmoke = await readRepoFile('scripts/api-smoke.ts')

    expect(apiSmoke).toContain('ยังไม่มี tokenBalance')
    expect(apiSmoke).toContain('readiness รอการยืนยันผู้ให้บริการจริง')
    expect(apiSmoke).toContain('จะรันทดสอบผู้ให้บริการต่อเพื่อให้ตั้งค่า flag หลังผ่านจริง')
    expect(apiSmoke).toContain('โทเคนคงเหลือ=')
    expect(apiSmoke).toContain('แหล่งร่าง=')
    expect(apiSmoke).toContain("'Image smoke provider': provider")
    expect(apiSmoke).toContain("'Image smoke source': source")
    expect(apiSmoke).toContain("'Image smoke urlKind': urlKind")
    expect(apiSmoke).toContain("'Image smoke elapsedMs': elapsedMs")
    expect(apiSmoke).toContain('handoffEvidence')
    expect(apiSmoke).toContain('apiImageSmokeEvidence(payload, imageElapsedMs)')
    expect(apiSmoke).toContain('liveImageDraftFailure(payload)')
    expect(apiSmoke).toContain('source ของ live image smoke ต้องเป็น ai')
    expect(apiSmoke).toContain('ข้ามผู้ให้บริการสร้างรูปสำหรับการตรวจในเครื่อง')
    expect(apiSmoke).toContain('chat validation ไม่ควรคืน chatId')
    expect(apiSmoke).toContain('เส้นทางตรวจ validation ของแชทไม่ควรใช้โทเคน')
    expect(apiSmoke).toContain('POST /chat local mock')
    expect(apiSmoke).toContain('POST /chat/stream local mock')
    expect(apiSmoke).toContain('local chat mock ต้องไม่คิดโทเคน')
    expect(apiSmoke).toContain('local chat stream ต้องไม่คิดโทเคน')
    expect(apiSmoke).toContain('local/mock-roleplay')
    expect(apiSmoke).toContain('สตรีมไม่คืน validation delta ภาษาไทย')
    expect(apiSmoke).toContain('เส้นทางตรวจ validation ของสตรีมไม่ควรใช้โทเคน')
    expect(apiSmoke).toContain('event จากสตรีม')
    expect(apiSmoke).toContain('POST /chat/stream live')
    expect(apiSmoke).toContain('validateLiveChatSmokeStream(events)')
    expect(apiSmoke).toContain('findMatchingChatDebits')
    expect(apiSmoke).toContain('walletDebits=')
    expect(apiSmoke).toContain('CHAT_USAGE')
    expect(apiSmoke).toContain('chatId: liveChatId')
    expect(apiSmoke).toContain('apiChatSmokeEvidence({')
    expect(apiSmoke).toContain('formatApiHandoffEvidence(chatEvidence)')
    expect(apiSmoke).toContain("'Chat smoke normal chatId': normalChatId")
    expect(apiSmoke).toContain("'Chat smoke normal tokens': normalTokens")
    expect(apiSmoke).toContain("'Chat smoke normal walletTransactionId': normalDebit.id")
    expect(apiSmoke).toContain("'Chat smoke stream chatId': streamChatId")
    expect(apiSmoke).toContain("'Chat smoke stream tokens': streamTokens")
    expect(apiSmoke).toContain("'Chat smoke stream walletTransactionId': streamDebit.id")
    expect(apiSmoke).toContain('deltaChars=')
    expect(apiSmoke).toContain('ข้ามการเรียกโมเดลจริง')
    expect(apiSmoke).toContain('ตรวจ eval ในเครื่องไม่ผ่าน')
    expect(apiSmoke).toContain('ยังไม่มีสถานการณ์ eval ในเครื่อง')
    expect(apiSmoke).toContain('ยังไม่มีค่าจัดระดับเนื้อหา')
    expect(apiSmoke).toContain('ยังไม่มีข้อมูลตัวตนผู้เล่น')
    expect(apiSmoke).toContain('ตัวอย่างความสัมพันธ์ไม่คืน turn')
    expect(apiSmoke).toContain('ตัวตรวจพรอมป์ไม่คืน snapshot ที่ปิดข้อมูลลับ')
    expect(apiSmoke).toContain('ยังไม่มีรายการ audit log')
    expect(apiSmoke).toContain('ไม่ผ่านด้วยสถานะ')
    expect(apiSmoke).toContain('formatApiSmokeCaughtError(error)')
    expect(apiSmoke).toContain('formatApiSmokeDiagnostic(raw)')
    expect(apiSmoke).toContain('formatApiSmokeStatus(result.status)')
    expect(apiSmoke).toContain('parseApiSmokeStreamEvents<StreamSmokeEvent>(raw, path)')
    expect(apiSmoke).not.toContain('tokenBalance=${payload.user.tokenBalance}')
    expect(apiSmoke).not.toContain('cost=${payload.usage.totalCost}')
    expect(apiSmoke).not.toContain('transactions=${payload.wallet')
    expect(apiSmoke).not.toContain('missing tokenBalance')
    expect(apiSmoke).not.toContain('readiness รอการยืนยัน live provider')
    expect(apiSmoke).not.toContain('provider smoke ต่อเพื่อให้ตั้ง verification flags')
    expect(apiSmoke).not.toContain('จะรัน smoke ผู้ให้บริการต่อเพื่อให้ตั้งค่า verification')
    expect(apiSmoke).not.toContain('source=${payload.source')
    expect(apiSmoke).not.toContain('image=${imageProvider}')
    expect(apiSmoke).not.toContain('ข้าม provider สำหรับ local smoke')
    expect(apiSmoke).not.toContain('ข้ามผู้ให้บริการสร้างรูปสำหรับ local smoke')
    expect(apiSmoke).not.toContain('ข้าม live model call')
    expect(apiSmoke).not.toContain('local eval ไม่ผ่าน')
    expect(apiSmoke).not.toContain('ยังไม่มี local eval scenarios')
    expect(apiSmoke).not.toContain('ยังไม่มี content settings')
    expect(apiSmoke).not.toContain('ยังไม่มี persona payload')
    expect(apiSmoke).not.toContain('relationship preview ไม่คืน turn')
    expect(apiSmoke).not.toContain('prompt inspector ไม่คืน redacted snapshot')
    expect(apiSmoke).not.toContain('ยังไม่มี audit logs array')
    expect(apiSmoke).not.toContain('chat validation should not return a chatId')
    expect(apiSmoke).not.toContain('chat validation path ไม่ควรใช้ token')
    expect(apiSmoke).not.toContain('stream ไม่คืน validation delta ภาษาไทย')
    expect(apiSmoke).not.toContain('stream ไม่คืน done event')
    expect(apiSmoke).not.toContain('stream validation path ไม่ควรใช้ token')
    expect(apiSmoke).not.toContain('SSE events')
    expect(apiSmoke).not.toContain('failed with ${response.status}')
    expect(apiSmoke).not.toContain('error instanceof Error ? error.message : String(error)')
    expect(apiSmoke).not.toContain('empty response')
    expect(apiSmoke).not.toContain('raw.slice(0, 500)')
    expect(apiSmoke).not.toContain('JSON error payload')
    expect(apiSmoke).not.toContain("JSON.parse(line.slice('data: '.length))")
    expect(apiSmoke).not.toContain("maxChars=${saved.persona.maxChars ?? 'unknown'}")
    expect(apiSmoke).not.toContain("payload.image?.provider ?? 'missing'")
    expect(apiSmoke).not.toContain('result.status.toUpperCase()')
  })

  test('allows live smoke to continue only for live verification readiness failures', () => {
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
        'live smoke ของระบบสร้างรูปยังไม่ได้ยืนยันผ่าน',
      ]),
    ).toBe(true)

    expect(isOnlyLiveVerificationFailure([])).toBe(false)
    expect(isOnlyLiveVerificationFailure(['ฐานข้อมูลยังเชื่อมต่อไม่ได้'])).toBe(false)
    expect(
      isOnlyLiveVerificationFailure([
        'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน',
        'CORS_ORIGINS is empty, local, or non-https',
      ]),
    ).toBe(false)
  })

  test('validates machine-readable API smoke error codes', () => {
    expect(isMachineReadableErrorCode('invalid_chat_id')).toBe(true)
    expect(isMachineReadableErrorCode('unknown_error')).toBe(true)
    expect(isMachineReadableErrorCode('invalid-chat-id')).toBe(false)
    expect(isMachineReadableErrorCode('InvalidChatId')).toBe(false)
    expect(isMachineReadableErrorCode('รหัสแชทไม่ถูกต้อง')).toBe(false)
    expect(isMachineReadableErrorCode('Cannot read properties of undefined')).toBe(false)
    expect(isMachineReadableErrorCode(`x${'a'.repeat(80)}`)).toBe(false)

    expect(() => assertMachineReadableErrorCode({ error: 'invalid_chat_id' }, 'DELETE /chats/:id')).not.toThrow()
    expect(() => assertMachineReadableErrorCode({ error: 'รหัสแชทไม่ถูกต้อง' }, 'DELETE /chats/:id')).toThrow('machine-readable')
    expect(() => assertMachineReadableErrorCode({ message: 'no code' }, 'DELETE /chats/:id')).toThrow('machine-readable')
  })

  test('builds image provider issues with actionable hints', () => {
    expect(creatorImageIssue({ warnings: ['billing_hard_limit_reached'] })).toContain('เพดานวงเงิน')
    expect(creatorImageIssue({ image: { note: '403 invalid api key' } })).toContain(
      'คีย์ฝั่งระบบหลังบ้านสำหรับสร้างรูปที่ถูกต้อง',
    )
    expect(creatorImageIssue({})).toBe('ผู้ให้บริการสร้างรูปไม่ได้คืนรูปที่สร้างเสร็จแล้ว')
  })

  test('parses JSON safely for API smoke response helpers', () => {
    expect(tryParseJson('{"ok":true}')).toEqual({ ok: true })
    expect(tryParseJson('not-json')).toBeNull()
  })

  test('redacts secret-shaped values from API smoke diagnostics', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    expect(formatApiSmokeDiagnostic(`upstream failed ${fakeDatabaseUrl}`)).toContain('postgresql://[REDACTED_SECRET]')
    expect(formatApiSmokeDiagnostic(`upstream failed ${fakeDatabaseUrl}`)).not.toContain('super-secret')
    expect(formatApiSmokeCaughtError(new Error(`caught ${fakeDatabaseUrl}`))).toContain('postgresql://[REDACTED_SECRET]')
    expect(formatApiSmokeCaughtError(new Error(`caught ${fakeDatabaseUrl}`))).not.toContain('super-secret')
    expect(formatApiSmokeDiagnostic('')).toBe('response ว่าง')
    expect(formatApiSmokeCaughtError('')).toBe('ไม่ทราบสาเหตุ')
  })

  test('formats object-shaped API smoke errors without stringifying raw objects', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:api-object-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatApiSmokeCaughtError({
      message: `fetch failed ${fakeDatabaseUrl}`,
      toString() {
        throw new Error('raw object should not be stringified')
      },
    })

    expect(message).toContain('postgresql://[REDACTED_SECRET]')
    expect(message).not.toContain('api-object-secret')
    expect(formatApiSmokeCaughtError({ error: 'gateway timeout' })).toBe('gateway timeout')
    expect(formatApiSmokeCaughtError({ code: 'ECONNRESET' })).toBe('ไม่ทราบสาเหตุ')
  })

  test('parses API smoke stream events with Thai diagnostics', () => {
    expect(parseApiSmokeStreamEvents('data: {"type":"delta","content":"สวัสดี"}\n\ndata: {"type":"done"}\n', '/chat/stream')).toEqual([
      { type: 'delta', content: 'สวัสดี' },
      { type: 'done' },
    ])
    expect(() => parseApiSmokeStreamEvents('data: not-json\n', '/chat/stream')).toThrow('คืน data event ที่ไม่ใช่ JSON')
    expect(() => parseApiSmokeStreamEvents('event: done\n', '/chat/stream')).toThrow('ไม่คืน SSE data event')
  })

  test('imports the API smoke runner without executing the smoke flow', () => {
    expect(typeof runApiSmoke).toBe('function')
  })

  test('API smoke rejects unsafe target URLs before network work', async () => {
    const lines: string[] = []
    const warnings: string[] = []
    const exitCode = await runApiSmoke({
      argv: ['bun', 'scripts/api-smoke.ts', '--require-admin'],
      apiBaseUrl: 'https://smoke-user:smoke-pass@api.example.com/v1',
      writeLine: (line) => lines.push(line),
      writeWarn: (line) => warnings.push(line),
    })

    const output = lines.join('\n')
    const summary = JSON.parse(lines.at(-1) ?? '{}')
    expect(exitCode).toBe(1)
    expect(output).toContain('credential/userinfo')
    expect(output).toContain('path/query/hash')
    expect(output).not.toContain('smoke-pass')
    expect(summary.apiBaseUrl).toBe('https://[REDACTED_USERINFO]@api.example.com/v1')
    expect(summary.fail).toBe(1)
    expect(warnings).toEqual([])
  })

  test('builds API smoke summary counts for automation', () => {
    const results: ApiSmokeResult[] = [
      { name: 'health', status: 'pass', detail: 'ok' },
      { name: 'ready', status: 'warn', detail: 'provider verification pending' },
      { name: 'chat', status: 'skip', detail: 'local mode' },
      { name: 'admin', status: 'fail', detail: 'missing admin key' },
    ]

    expect(
      buildApiSmokeSummary(results, {
        apiBaseUrl: 'https://api.maprang.example',
        live: true,
        requireLiveImage: true,
        requireAdmin: true,
        handoffEvidence: {},
      }),
    ).not.toHaveProperty('handoffEvidence')

    expect(
      buildApiSmokeSummary(results, {
        apiBaseUrl: 'https://api.maprang.example',
        live: true,
        requireLiveImage: true,
        requireAdmin: true,
        handoffEvidence: {
          'Chat smoke normal walletTransactionId': 'wallet-chat-normal-001',
          'Image smoke provider': 'configured',
        },
      }),
    ).not.toHaveProperty('handoffEvidence')

    expect(
      buildApiSmokeSummary(results, {
        apiBaseUrl: 'https://api.maprang.example',
        live: true,
        requireLiveImage: true,
        requireAdmin: true,
        handoffEvidence: {
          'Chat smoke normal chatId': 'chat-normal-001',
          'Chat smoke normal tokens': 0,
          'Chat smoke normal walletTransactionId': 'wallet-chat-normal-001',
          'Chat smoke stream chatId': 'chat-stream-001',
          'Chat smoke stream tokens': 98,
          'Chat smoke stream walletTransactionId': 'wallet-chat-stream-001',
          'Image smoke provider': 'configured',
          'Image smoke source': 'ai',
          'Image smoke urlKind': 'remote-or-upload-url',
          'Image smoke elapsedMs': 250,
        },
      }),
    ).not.toHaveProperty('handoffEvidence')

    expect(
      buildApiSmokeSummary(results, {
        apiBaseUrl: 'https://api.maprang.example',
        live: true,
        requireLiveImage: true,
        requireAdmin: true,
        handoffEvidence: {
          'Chat smoke normal chatId': 'chat-normal-001',
          'Chat smoke normal tokens': 145,
          'Chat smoke normal walletTransactionId': 'wallet-chat-normal-001',
          'Chat smoke stream chatId': 'chat-stream-001',
          'Chat smoke stream tokens': 98,
          'Chat smoke stream walletTransactionId': 'wallet-chat-stream-001',
          'Image smoke provider': 'configured',
          'Image smoke source': 'ai',
          'Image smoke urlKind': 'remote-or-upload-url',
          'Image smoke elapsedMs': 250,
        },
      }),
    ).toEqual({
      ok: false,
      apiBaseUrl: 'https://api.maprang.example',
      live: true,
      requireLiveImage: true,
      requireAdmin: true,
      pass: 1,
      warn: 1,
      skip: 1,
      fail: 1,
      handoffEvidence: {
        'Chat smoke normal chatId': 'chat-normal-001',
        'Chat smoke normal tokens': 145,
        'Chat smoke normal walletTransactionId': 'wallet-chat-normal-001',
        'Chat smoke stream chatId': 'chat-stream-001',
        'Chat smoke stream tokens': 98,
        'Chat smoke stream walletTransactionId': 'wallet-chat-stream-001',
        'Image smoke provider': 'configured',
        'Image smoke source': 'ai',
        'Image smoke urlKind': 'remote-or-upload-url',
        'Image smoke elapsedMs': 250,
      },
    })
  })
})
