import { describe, expect, test } from 'bun:test'
import { checkReleaseHandoffContent, collectReleaseHandoffCheckResult, runReleaseHandoffCheck } from './release-handoff-check'

const filledHandoff = [
  '# แม่แบบส่งมอบ release',
  '',
  '## ตัวตนของ release',
  '- วันที่ release: 2026-05-19',
  '- Git commit: abc1234',
  '- Branch: main',
  '- ผู้รับผิดชอบ: release lead',
  '- Environment: production',
  '',
  '## ลิงก์ที่ deploy แล้ว (Deployed URLs)',
  '- Frontend URL: https://app.maprang.example',
  '- Backend URL: https://api.maprang.example',
  '- Health URL: https://api.maprang.example/health',
  '- Ready URL: https://api.maprang.example/ready',
  '',
  '## ฐานข้อมูลและ migrations',
  '- Database host/provider: managed postgres',
  '- คำสั่ง migration: bunx prisma migrate deploy',
  '- ผล migration: pass',
  '- Prisma migration version: 20260513103000_add_lore_parent_index',
  '',
  '## ระบบ auth/storage และ CORS (Auth, Storage และ CORS)',
  '- โหมด auth: supabase-jwt',
  '- Supabase project ref: project-ref-only',
  '- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร: supabase',
  '- รูปแบบการเข้าถึงรูปตัวละคร: signed',
  '- อายุ signed URL: 3600',
  '- CORS origins: https://app.maprang.example',
  '',
  '## การยืนยันผู้ให้บริการ AI',
  '- โมเดลแชท: google/gemini-2.0-flash-001',
  '- คำสั่ง live smoke แชท: bun run smoke:chat',
  '- ผล live smoke แชท: pass',
  '- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 1',
  '- โมเดลสร้างรูป: gpt-image-1.5',
  '- คำสั่ง live smoke รูป: bun run smoke:image:live',
  '- ผล live smoke รูป: pass',
  '- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 1',
  '',
  '## เกต QA (QA gates)',
  '- `bun run qa:local`: pass',
  '- `bun run e2e:smoke`: pass',
  '- `bun run staging:verify`: pass',
  '- `bun run production:check`: pass',
  '- GitHub Production Smoke run: pass',
  '',
  '## การตรวจฝั่งผู้ดูแล',
  '- `/admin/health`: pass',
  '- `/admin/prompt-inspector`: pass',
  '- `/admin/evals`: pass',
  '- รายงาน moderation: pass',
  '- audit logs ของผู้ดูแล: pass',
  '',
  '## ข้อจำกัดที่ยังรู้ก่อนปล่อย',
  '- ตัวกั้นที่ยังเปิดอยู่: none',
  '- ความเสี่ยงโควตาผู้ให้บริการ: monitored',
  '- งาน follow-up ที่ต้องทำมือ: none',
  '- เงื่อนไข rollback: provider outage',
  '',
  '## การตัดสินใจปล่อย',
  '- Go / no-go: go',
  '- ผู้อนุมัติ: release lead',
  '- หมายเหตุ: ready',
  '',
].join('\n')

describe('release handoff check', () => {
  test('accepts a filled release handoff', () => {
    expect(checkReleaseHandoffContent(filledHandoff, { requireFilled: true })).toEqual([])
  })

  test('allows the empty template unless filled mode is required', () => {
    const template = filledHandoff.replace('2026-05-19', '').replace('abc1234', '')

    expect(checkReleaseHandoffContent(template)).toEqual([])
    expect(checkReleaseHandoffContent(template, { requireFilled: true })).toEqual(
      expect.arrayContaining(['บรรทัด 4 ยังว่างอยู่: - วันที่ release:', 'บรรทัด 5 ยังว่างอยู่: - Git commit:']),
    )
  })

  test('reports missing sections and secret-shaped values', () => {
    const fakeOpenRouterKey = ['sk', 'or', 'v1', '1234567890abcdef1234567890abcdef'].join('-')
    const fakeGithubToken = `ghp_${'a'.repeat(36)}`
    const unsafe = filledHandoff
      .replace('## การตัดสินใจปล่อย', '## Decision')
      .replace('project-ref-only', `${fakeOpenRouterKey}\n- Debug token: ${fakeGithubToken}`)

    expect(checkReleaseHandoffContent(unsafe)).toEqual(
      expect.arrayContaining(['ยังไม่มี section: การตัดสินใจปล่อย', 'พบ OpenRouter key', 'พบ GitHub token']),
    )
  })

  test('reports stale avatar-storage handoff labels', () => {
    const stale = filledHandoff
      .replace('ผู้ให้บริการพื้นที่เก็บรูปตัวละคร', 'ผู้ให้บริการ avatar storage')
      .replace('รูปแบบการเข้าถึงรูปตัวละคร', 'รูปแบบการเข้าถึง avatar storage')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'พบข้อความส่งมอบที่ยังใช้คำเก่า: ผู้ให้บริการ avatar storage',
        'พบข้อความส่งมอบที่ยังใช้คำเก่า: รูปแบบการเข้าถึง avatar storage',
      ]),
    )
  })

  test('runs the committed handoff template through an importable runner', async () => {
    const result = await collectReleaseHandoffCheckResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runReleaseHandoffCheck([], (line) => lines.push(line), (line) => errors.push(line))

    expect(result.ok).toBe(true)
    expect(result.requireFilled).toBe(false)
    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('ผ่าน - ตรวจเอกสารส่งมอบ release ปลอดภัยต่อการ commit')
    expect(errors).toEqual([])
  })
})
