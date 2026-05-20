import { describe, expect, test } from 'bun:test'
import { evaluateFrontendBundleBudgets, formatKb, runFrontendBundleCheck } from './check-frontend-bundles'

describe('frontend bundle budget check', () => {
  test('passes when main, chat, and lazy chunks stay under budget', () => {
    const result = evaluateFrontendBundleBudgets([
      { file: 'index-abc123.js', bytes: 300 * 1024 },
      { file: 'ChatRoomPage-def456.js', bytes: 220 * 1024 },
      { file: 'WalletPage-ghi789.js', bytes: 40 * 1024 },
    ])

    expect(result.failures).toEqual([])
    expect(result.mainIndex?.file).toBe('index-abc123.js')
    expect(result.chatRoom?.file).toBe('ChatRoomPage-def456.js')
    expect(result.largest.map((item) => item.file)).toEqual(['index-abc123.js', 'ChatRoomPage-def456.js', 'WalletPage-ghi789.js'])
  })

  test('reports missing split chunks and oversized bundles', () => {
    const result = evaluateFrontendBundleBudgets(
      [
        { file: 'index-too-big.js', bytes: 120 * 1024 },
        { file: 'Everything-huge.js', bytes: 160 * 1024 },
      ],
      { mainIndexKb: 100, chatRoomKb: 80, anyChunkKb: 150 },
    )

    expect(result.failures).toEqual([
      'main index bundle มีขนาด 120.0KB, ต้องไม่เกิน 100KB',
      'ไม่พบ ChatRoomPage chunk; โค้ด chat/workspace อาจถูกรวมเข้า main bundle',
      'พบ frontend chunk ที่ใหญ่เกินกำหนด: Everything-huge.js 160.0KB',
    ])
  })

  test('formats kilobytes for human-readable logs', () => {
    expect(formatKb(1536)).toBe('1.5KB')
  })

  test('runs the bundle budget checker through an importable runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runFrontendBundleCheck(
      (line) => lines.push(line),
      (line) => errors.push(line),
      async () => [
        { file: 'index-abc123.js', bytes: 300 * 1024 },
        { file: 'ChatRoomPage-def456.js', bytes: 220 * 1024 },
        { file: 'WalletPage-ghi789.js', bytes: 40 * 1024 },
      ],
    )

    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('งบขนาด bundle ฝั่ง frontend:')
    expect(lines.at(-1)).toBe('ผ่าน - frontend bundle budget ผ่านแล้ว')
    expect(errors).toEqual([])
  })

  test('prints Thai-first failure prefixes from the runner', async () => {
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runFrontendBundleCheck(
      (line) => lines.push(line),
      (line) => errors.push(line),
      async () => [{ file: 'Everything-huge.js', bytes: 700 * 1024 }],
    )

    expect(exitCode).toBe(1)
    expect(lines[0]).toBe('งบขนาด bundle ฝั่ง frontend:')
    expect(errors.every((line) => line.startsWith('ไม่ผ่าน - '))).toBe(true)
  })
})
