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
  '- E2E_BASE_URL: https://app.maprang.example',
  '- E2E_API_BASE_URL: https://api.maprang.example',
  '- `bun run frontend:env:test`: pass',
  '- `bun run frontend:storage:test`: pass',
  '- `bun run frontend:clipboard:test`: pass',
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

  test('accepts multiple frontend CORS origins', () => {
    const multiOrigin = filledHandoff.replace('CORS origins: https://app.maprang.example', 'CORS origins: https://app.maprang.example, https://www.maprang.example')

    expect(checkReleaseHandoffContent(multiOrigin, { requireFilled: true })).toEqual([])
  })

  test('allows the empty template unless filled mode is required', () => {
    const template = filledHandoff.replace('2026-05-19', '').replace('abc1234', '')

    expect(checkReleaseHandoffContent(template)).toEqual([])
    expect(checkReleaseHandoffContent(template, { requireFilled: true })).toEqual(
      expect.arrayContaining(['บรรทัด 4 ยังว่างอยู่: - วันที่ release:', 'บรรทัด 5 ยังว่างอยู่: - Git commit:']),
    )
  })

  test('rejects local or insecure filled release URLs', () => {
    const unsafe = filledHandoff
      .replace('https://app.maprang.example', 'http://localhost:5173')
      .replaceAll('https://api.maprang.example', 'http://127.0.0.1:3000')
      .replace('CORS origins: https://app.maprang.example', 'CORS origins: http://localhost:5173,*')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'URL ใน release handoff ต้องเป็น https deployed URL: Frontend URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Backend URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Health URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Ready URL',
        'CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น',
      ]),
    )
  })

  test('rejects loopback deployed URLs even when they use https', () => {
    const unsafe = filledHandoff
      .replace('https://app.maprang.example', 'https://0.0.0.0:5173')
      .replaceAll('https://api.maprang.example', 'https://[::1]:3000')
      .replace('CORS origins: https://app.maprang.example', 'CORS origins: https://0.0.0.0:5173')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'URL ใน release handoff ต้องเป็น https deployed URL: Frontend URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Backend URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Health URL',
        'URL ใน release handoff ต้องเป็น https deployed URL: Ready URL',
        'CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น',
      ]),
    )
  })

  test('rejects malformed release URLs and backend CORS origins', () => {
    const unsafe = filledHandoff
      .replace('Frontend URL: https://app.maprang.example', 'Frontend URL: https://app maprang.example')
      .replace('CORS origins: https://app.maprang.example', 'CORS origins: https://app.maprang.example/path, https://api.maprang.example, not-a-url')
    const commaOnlyCors = filledHandoff.replace('CORS origins: https://app.maprang.example', 'CORS origins: ,')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'URL ใน release handoff ต้องเป็น https deployed URL: Frontend URL',
        'CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น',
      ]),
    )
    expect(checkReleaseHandoffContent(commaOnlyCors, { requireFilled: true })).toContain('CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น')
  })

  test('requires release URL origins and exact backend health paths', () => {
    const unsafe = filledHandoff
      .replace('Frontend URL: https://app.maprang.example', 'Frontend URL: https://app.maprang.example/app')
      .replace('Backend URL: https://api.maprang.example', 'Backend URL: https://api.maprang.example?debug=1')
      .replace('Health URL: https://api.maprang.example/health', 'Health URL: https://api.maprang.example/health?debug=1')
      .replace('Ready URL: https://api.maprang.example/ready', 'Ready URL: https://other.maprang.example/ready')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'URL ใน release handoff ต้องเป็น deployed origin ไม่มี path/query/hash: Frontend URL',
        'URL ใน release handoff ต้องเป็น deployed origin ไม่มี path/query/hash: Backend URL',
        'Health URL ใน release handoff ต้องชี้ backend origin เดียวกับ Backend URL และใช้ path /health โดยไม่มี query/hash',
        'Ready URL ใน release handoff ต้องชี้ backend origin เดียวกับ Backend URL และใช้ path /ready โดยไม่มี query/hash',
      ]),
    )
  })

  test('rejects credential-bearing deployed URLs', () => {
    const unsafe = filledHandoff.replace('Backend URL: https://api.maprang.example', 'Backend URL: https://release-user:release-pass@api.maprang.example')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toContain('URL ใน release handoff ต้องเป็น https deployed URL: Backend URL')
  })

  test('requires live provider verification flags for production handoff', () => {
    const unsafe = filledHandoff
      .replace('- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 1', '- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 0')
      .replace('- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 1', '- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 0')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมี CHAT_PROVIDER_LIVE_VERIFIED=1',
        'production release handoff ต้องมี IMAGE_GENERATION_LIVE_VERIFIED=1',
      ]),
    )
  })

  test('requires production QA gates to pass for production handoff', () => {
    const unsafe = filledHandoff
      .replace('- `bun run qa:local`: pass', '- `bun run qa:local`: fail')
      .replace('- `bun run e2e:smoke`: pass', '- `bun run e2e:smoke`: fail')
      .replace('- `bun run staging:verify`: pass', '- `bun run staging:verify`: fail')
      .replace('- `bun run production:check`: pass', '- `bun run production:check`: fail')
      .replace('- GitHub Production Smoke run: pass', '- GitHub Production Smoke run: fail')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมีผล QA ผ่าน: `bun run qa:local`',
        'production release handoff ต้องมีผล QA ผ่าน: `bun run e2e:smoke`',
        'production release handoff ต้องมีผล QA ผ่าน: `bun run staging:verify`',
        'production release handoff ต้องมีผล QA ผ่าน: `bun run production:check`',
        'production release handoff ต้องมีผล QA ผ่าน: GitHub Production Smoke run',
      ]),
    )
  })

  test('requires staging QA gates to pass for staging handoff', () => {
    const unsafe = filledHandoff
      .replace('- Environment: production', '- Environment: staging')
      .replace('- `bun run qa:local`: pass', '- `bun run qa:local`: fail')
      .replace('- `bun run e2e:smoke`: pass', '- `bun run e2e:smoke`: fail')
      .replace('- `bun run staging:verify`: pass', '- `bun run staging:verify`: fail')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run qa:local`',
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run e2e:smoke`',
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run staging:verify`',
      ]),
    )
  })

  test('reports missing core production QA gate rows', () => {
    const stale = filledHandoff
      .replace('- `bun run qa:local`: pass\n', '')
      .replace('- `bun run e2e:smoke`: pass\n', '')
      .replace('- `bun run staging:verify`: pass\n', '')
      .replace('- `bun run production:check`: pass\n', '')
      .replace('- GitHub Production Smoke run: pass\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี QA gate: `bun run qa:local`',
        'ยังไม่มี QA gate: `bun run e2e:smoke`',
        'ยังไม่มี QA gate: `bun run staging:verify`',
        'ยังไม่มี QA gate: `bun run production:check`',
        'ยังไม่มี QA gate: GitHub Production Smoke run',
      ]),
    )
  })

  test('requires QA gates as release handoff field rows', () => {
    const stale = filledHandoff.replace('- `bun run qa:local`: pass\n', '- QA note: rerun `bun run qa:local` before release\n')

    expect(checkReleaseHandoffContent(stale)).toContain('ยังไม่มี QA gate: `bun run qa:local`')
  })

  test('requires production e2e smoke targets to match deployed origins', () => {
    const unsafe = filledHandoff
      .replace('- E2E_BASE_URL: https://app.maprang.example', '- E2E_BASE_URL: http://127.0.0.1:5173')
      .replace('- E2E_API_BASE_URL: https://api.maprang.example', '- E2E_API_BASE_URL: https://api.other.example/path')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมี E2E_BASE_URL เป็น frontend deployed origin เดียวกับ Frontend URL',
        'production release handoff ต้องมี E2E_API_BASE_URL เป็น backend deployed origin เดียวกับ Backend URL',
      ]),
    )
  })

  test('requires staging e2e smoke targets to match deployed origins', () => {
    const unsafe = filledHandoff
      .replace('- Environment: production', '- Environment: staging')
      .replace('- E2E_BASE_URL: https://app.maprang.example', '- E2E_BASE_URL: https://app.maprang.example/app')
      .replace('- E2E_API_BASE_URL: https://api.maprang.example', '- E2E_API_BASE_URL: http://127.0.0.1:3000')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมี E2E_BASE_URL เป็น frontend deployed origin เดียวกับ Frontend URL',
        'staging release handoff ต้องมี E2E_API_BASE_URL เป็น backend deployed origin เดียวกับ Backend URL',
      ]),
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

  test('reports missing critical release handoff fields', () => {
    const stale = filledHandoff
      .replace('- Environment: production\n', '')
      .replace('- Frontend URL: https://app.maprang.example\n', '')
      .replace('- Backend URL: https://api.maprang.example\n', '')
      .replace('- CORS origins: https://app.maprang.example\n', '')
      .replace('- Go / no-go: go\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี field ใน release handoff: Environment',
        'ยังไม่มี field ใน release handoff: Frontend URL',
        'ยังไม่มี field ใน release handoff: Backend URL',
        'ยังไม่มี field ใน release handoff: CORS origins',
        'ยังไม่มี field ใน release handoff: Go / no-go',
      ]),
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

  test('reports missing frontend state QA gates', () => {
    const stale = filledHandoff
      .replace('- E2E_BASE_URL: https://app.maprang.example\n', '')
      .replace('- E2E_API_BASE_URL: https://api.maprang.example\n', '')
      .replace('- `bun run frontend:env:test`: pass\n', '')
      .replace('- `bun run frontend:storage:test`: pass\n', '')
      .replace('- `bun run frontend:clipboard:test`: pass\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี QA gate: `bun run frontend:env:test`',
        'ยังไม่มี QA gate: `bun run frontend:storage:test`',
        'ยังไม่มี QA gate: `bun run frontend:clipboard:test`',
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
