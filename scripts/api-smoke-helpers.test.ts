import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { creatorImageIssue, isOnlyLiveVerificationFailure, tryParseJson } from './api-smoke-helpers'
import { buildApiSmokeSummary, formatApiSmokeStatus, runApiSmoke, type ApiSmokeResult } from './api-smoke'

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

  test('keeps API smoke diagnostics Thai-first', async () => {
    const apiSmoke = await readRepoFile('scripts/api-smoke.ts')

    expect(apiSmoke).toContain('ยังไม่มี tokenBalance')
    expect(apiSmoke).toContain('readiness รอการยืนยันผู้ให้บริการจริง')
    expect(apiSmoke).toContain('แหล่งร่าง=')
    expect(apiSmoke).toContain('ข้ามผู้ให้บริการสร้างรูปสำหรับ local smoke')
    expect(apiSmoke).toContain('chat validation ไม่ควรคืน chatId')
    expect(apiSmoke).toContain('ไม่ผ่านด้วยสถานะ')
    expect(apiSmoke).toContain('response ว่าง')
    expect(apiSmoke).toContain('formatApiSmokeStatus(result.status)')
    expect(apiSmoke).not.toContain('missing tokenBalance')
    expect(apiSmoke).not.toContain('readiness รอการยืนยัน live provider')
    expect(apiSmoke).not.toContain('provider smoke ต่อเพื่อให้ตั้ง verification flags')
    expect(apiSmoke).not.toContain('source=${payload.source')
    expect(apiSmoke).not.toContain('image=${imageProvider}')
    expect(apiSmoke).not.toContain('ข้าม provider สำหรับ local smoke')
    expect(apiSmoke).not.toContain('chat validation should not return a chatId')
    expect(apiSmoke).not.toContain('failed with ${response.status}')
    expect(apiSmoke).not.toContain('empty response')
    expect(apiSmoke).not.toContain('JSON error payload')
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

  test('imports the API smoke runner without executing the smoke flow', () => {
    expect(typeof runApiSmoke).toBe('function')
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
    })
  })
})
