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
  '## หลักฐาน build/deploy artifact',
  '- Frontend build artifact: vercel:dpl_frontend_202605250001',
  '- Backend deploy artifact: render:dpl_backend_202605250001',
  '',
  '## ลิงก์ที่ deploy แล้ว (Deployed URLs)',
  '- Frontend URL: https://app.maprang.example',
  '- Backend URL: https://api.maprang.example',
  '- Health URL: https://api.maprang.example/health',
  '- Ready URL: https://api.maprang.example/ready',
  '- Health check result: pass',
  '- Ready check result: pass',
  '',
  '## ฐานข้อมูลและ migrations',
  '- Database host/provider: managed postgres',
  '- คำสั่ง migration: bunx prisma migrate deploy',
  '- ผล migration: pass',
  '- Prisma migration version: 20260513103000_add_lore_parent_index',
  '',
  '## ระบบ auth/storage และ CORS (Auth, Storage และ CORS)',
  '- โหมด auth: supabase-jwt',
  '- Supabase project ref: maprangqa12345678',
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
  '- Chat smoke normal chatId: chat-smoke-normal-001',
  '- Chat smoke normal tokens: 512',
  '- Chat smoke normal walletTransactionId: wallet-chat-normal-001',
  '- Chat smoke stream chatId: chat-smoke-stream-001',
  '- Chat smoke stream tokens: 144',
  '- Chat smoke stream walletTransactionId: wallet-chat-stream-001',
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
  '- GitHub Production Smoke URL: https://github.com/Petch1910/maprang-project/actions/runs/123456789',
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
  '- Rollback action: redeploy previous Render/Vercel deployment and restore previous env version',
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

  test('requires release identity rows as field rows', () => {
    const stale = filledHandoff
      .replace('- วันที่ release: 2026-05-19\n', '- Release note: วันที่ release: 2026-05-19\n')
      .replace('- Git commit: abc1234\n', '')
      .replace('- Branch: main\n', '')
      .replace('- ผู้รับผิดชอบ: release lead\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี release identity field ใน release handoff: วันที่ release',
        'ยังไม่มี release identity field ใน release handoff: Git commit',
        'ยังไม่มี release identity field ใน release handoff: Branch',
        'ยังไม่มี release identity field ใน release handoff: ผู้รับผิดชอบ',
      ]),
    )
  })

  test('requires concrete release identity values in filled handoff', () => {
    const unsafe = filledHandoff
      .replace('- วันที่ release: 2026-05-19', '- วันที่ release: May 19')
      .replace('- Git commit: abc1234', '- Git commit: release-candidate')
      .replace('- Branch: main', '- Branch: <branch>')
      .replace('- ผู้รับผิดชอบ: release lead', '- ผู้รับผิดชอบ: placeholder')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'วันที่ release ใน handoff ต้องเป็นรูปแบบ YYYY-MM-DD',
        'Git commit ใน release handoff ต้องเป็น commit hash 7-40 ตัวอักษร',
        'Branch ใน release handoff ต้องเป็นชื่อ branch จริง',
        'ผู้รับผิดชอบ ใน release handoff ต้องเป็นชื่อผู้รับผิดชอบจริง',
      ]),
    )
  })

  test('requires release artifact rows as field rows', () => {
    const stale = filledHandoff
      .replace('- Frontend build artifact: vercel:dpl_frontend_202605250001\n', '- Artifact note: Frontend build artifact: vercel:dpl_frontend_202605250001\n')
      .replace('- Backend deploy artifact: render:dpl_backend_202605250001\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี artifact field ใน release handoff: Frontend build artifact',
        'ยังไม่มี artifact field ใน release handoff: Backend deploy artifact',
      ]),
    )
  })

  test('requires concrete artifact evidence for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- Frontend build artifact: vercel:dpl_frontend_202605250001', '- Frontend build artifact: latest')
      .replace('- Backend deploy artifact: render:dpl_backend_202605250001', '- Backend deploy artifact: local build')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมี Frontend build artifact ที่ trace ได้จริง ไม่ใช่ placeholder/latest/local build',
        'production release handoff ต้องมี Backend deploy artifact ที่ trace ได้จริง ไม่ใช่ placeholder/latest/local build',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมี Frontend build artifact ที่ trace ได้จริง ไม่ใช่ placeholder/latest/local build',
        'staging release handoff ต้องมี Backend deploy artifact ที่ trace ได้จริง ไม่ใช่ placeholder/latest/local build',
      ]),
    )
  })

  test('requires a concrete release environment in filled handoff', () => {
    const unsafe = filledHandoff.replace('- Environment: production', '- Environment: prod')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toContain('Environment ใน release handoff ต้องเป็น staging หรือ production เท่านั้น')
  })

  test('requires go release decision in filled handoff', () => {
    const unsafe = filledHandoff.replace('- Go / no-go: go', '- Go / no-go: no-go')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toContain('Go / no-go ใน release handoff ต้องเป็น go หลัง QA ผ่านครบก่อนแชร์ handoff')
  })

  test('requires release approval values in filled handoff', () => {
    const unsafe = filledHandoff
      .replace('- ผู้อนุมัติ: release lead', '- ผู้อนุมัติ: placeholder')
      .replace('- หมายเหตุ: ready', '- หมายเหตุ: tbd')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining(['ผู้อนุมัติ ใน release handoff ต้องเป็นชื่อผู้อนุมัติจริง', 'หมายเหตุ ใน release handoff ต้องไม่เป็น placeholder']),
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

  test('requires backend health and ready results to pass for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- Health check result: pass', '- Health check result: fail')
      .replace('- Ready check result: pass', '- Ready check result: warning')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมีผลตรวจ backend ผ่าน: Health check result',
        'production release handoff ต้องมีผลตรวจ backend ผ่าน: Ready check result',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมีผลตรวจ backend ผ่าน: Health check result',
        'staging release handoff ต้องมีผลตรวจ backend ผ่าน: Ready check result',
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

  test('requires live provider verification flags as field rows', () => {
    const unsafe = filledHandoff
      .replace(/^- .*`CHAT_PROVIDER_LIVE_VERIFIED`: 1$/m, '- Provider note: set `CHAT_PROVIDER_LIVE_VERIFIED`: 1 after smoke')
      .replace(/^- .*`IMAGE_GENERATION_LIVE_VERIFIED`: 1$/m, '- Provider note: set `IMAGE_GENERATION_LIVE_VERIFIED`: 1 after smoke')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมี CHAT_PROVIDER_LIVE_VERIFIED=1',
        'production release handoff ต้องมี IMAGE_GENERATION_LIVE_VERIFIED=1',
      ]),
    )
  })

  test('requires production live smoke result rows to pass', () => {
    const unsafe = filledHandoff
      .replace('- ผล live smoke แชท: pass', '- ผล live smoke แชท: fail')
      .replace('- ผล live smoke รูป: pass', '- ผล live smoke รูป: warning')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมีผล live smoke ผ่าน: ผล live smoke แชท',
        'production release handoff ต้องมีผล live smoke ผ่าน: ผล live smoke รูป',
      ]),
    )
  })

  test('requires deployed AI provider evidence to be actionable', () => {
    const productionUnsafe = filledHandoff
      .replace('- โมเดลแชท: google/gemini-2.0-flash-001', '- โมเดลแชท: fallback sample')
      .replace('- คำสั่ง live smoke แชท: bun run smoke:chat', '- คำสั่ง live smoke แชท: bun run api:smoke')
      .replace('- โมเดลสร้างรูป: gpt-image-1.5', '- โมเดลสร้างรูป: not configured')
      .replace('- คำสั่ง live smoke รูป: bun run smoke:image:live', '- คำสั่ง live smoke รูป: bun run smoke:image')
    const stagingUnsafe = productionUnsafe
      .replace('- Environment: production', '- Environment: staging')
      .replace('- ผล live smoke แชท: pass', '- ผล live smoke แชท: fail')
      .replace('- ผล live smoke รูป: pass', '- ผล live smoke รูป: warning')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องระบุโมเดลแชทจริง',
        'production release handoff ต้องใช้คำสั่ง live smoke แชทเป็น bun run smoke:chat หรือ bun run api:smoke:live',
        'production release handoff ต้องระบุโมเดลสร้างรูปจริง',
        'production release handoff ต้องใช้คำสั่ง live smoke รูปเป็น bun run smoke:image:live หรือ bun run api:smoke:live',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องระบุโมเดลแชทจริง',
        'staging release handoff ต้องใช้คำสั่ง live smoke แชทเป็น bun run smoke:chat หรือ bun run api:smoke:live',
        'staging release handoff ต้องระบุโมเดลสร้างรูปจริง',
        'staging release handoff ต้องใช้คำสั่ง live smoke รูปเป็น bun run smoke:image:live หรือ bun run api:smoke:live',
        'staging release handoff ต้องมีผล live smoke ผ่าน: ผล live smoke แชท',
        'staging release handoff ต้องมีผล live smoke ผ่าน: ผล live smoke รูป',
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

  test('requires production smoke workflow URL for production handoff', () => {
    const unsafe = filledHandoff.replace(
      '- GitHub Production Smoke URL: https://github.com/Petch1910/maprang-project/actions/runs/123456789',
      '- GitHub Production Smoke URL: https://github.com/Petch1910/maprang-project/actions?query=smoke',
    )
    const stagingHandoff = unsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(unsafe, { requireFilled: true })).toContain(
      'production release handoff ต้องมี GitHub Production Smoke URL เป็นลิงก์ GitHub Actions run จริง',
    )
    expect(checkReleaseHandoffContent(stagingHandoff, { requireFilled: true })).not.toContain(
      'production release handoff ต้องมี GitHub Production Smoke URL เป็นลิงก์ GitHub Actions run จริง',
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

  test('requires frontend QA gates to pass for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- `bun run frontend:env:test`: pass', '- `bun run frontend:env:test`: fail')
      .replace('- `bun run frontend:storage:test`: pass', '- `bun run frontend:storage:test`: fail')
      .replace('- `bun run frontend:clipboard:test`: pass', '- `bun run frontend:clipboard:test`: fail')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมีผล QA ผ่าน: `bun run frontend:env:test`',
        'production release handoff ต้องมีผล QA ผ่าน: `bun run frontend:storage:test`',
        'production release handoff ต้องมีผล QA ผ่าน: `bun run frontend:clipboard:test`',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run frontend:env:test`',
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run frontend:storage:test`',
        'staging release handoff ต้องมีผล QA ผ่าน: `bun run frontend:clipboard:test`',
      ]),
    )
  })

  test('requires admin verification rows to pass for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- `/admin/health`: pass', '- `/admin/health`: fail')
      .replace('- `/admin/prompt-inspector`: pass', '- `/admin/prompt-inspector`: warning')
      .replace('- `/admin/evals`: pass', '- `/admin/evals`: fail')
      .replace('- รายงาน moderation: pass', '- รายงาน moderation: warning')
      .replace('- audit logs ของผู้ดูแล: pass', '- audit logs ของผู้ดูแล: fail')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/health`',
        'production release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/prompt-inspector`',
        'production release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/evals`',
        'production release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: รายงาน moderation',
        'production release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: audit logs ของผู้ดูแล',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/health`',
        'staging release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/prompt-inspector`',
        'staging release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: `/admin/evals`',
        'staging release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: รายงาน moderation',
        'staging release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: audit logs ของผู้ดูแล',
      ]),
    )
  })

  test('requires admin verification rows as field rows', () => {
    const stale = filledHandoff
      .replace('- `/admin/health`: pass\n', '- Admin note: `/admin/health`: pass\n')
      .replace('- `/admin/prompt-inspector`: pass\n', '')
      .replace('- `/admin/evals`: pass\n', '')
      .replace('- รายงาน moderation: pass\n', '')
      .replace('- audit logs ของผู้ดูแล: pass\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี admin verification ใน release handoff: `/admin/health`',
        'ยังไม่มี admin verification ใน release handoff: `/admin/prompt-inspector`',
        'ยังไม่มี admin verification ใน release handoff: `/admin/evals`',
        'ยังไม่มี admin verification ใน release handoff: รายงาน moderation',
        'ยังไม่มี admin verification ใน release handoff: audit logs ของผู้ดูแล',
      ]),
    )
  })

  test('requires migration evidence to pass for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- คำสั่ง migration: bunx prisma migrate deploy', '- คำสั่ง migration: prisma db push')
      .replace('- ผล migration: pass', '- ผล migration: fail')
      .replace('- Prisma migration version: 20260513103000_add_lore_parent_index', '- Prisma migration version: latest')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องใช้คำสั่ง migration: bunx prisma migrate deploy',
        'production release handoff ต้องมีผล migration ผ่าน',
        'production release handoff ต้องมี Prisma migration version เป็นชื่อ migration จริง',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องใช้คำสั่ง migration: bunx prisma migrate deploy',
        'staging release handoff ต้องมีผล migration ผ่าน',
        'staging release handoff ต้องมี Prisma migration version เป็นชื่อ migration จริง',
      ]),
    )
  })

  test('rejects local or raw database evidence for deployed handoffs', () => {
    const productionUnsafe = filledHandoff.replace('- Database host/provider: managed postgres', '- Database host/provider: postgresql://db.example.com/app')
    const stagingUnsafe = filledHandoff
      .replace('- Environment: production', '- Environment: staging')
      .replace('- Database host/provider: managed postgres', '- Database host/provider: localhost sqlite dev database')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toContain(
      'production release handoff ต้องระบุ Database host/provider เป็น Postgres ที่ deploy แล้ว โดยไม่ใช้ local DB หรือ raw DATABASE_URL',
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toContain(
      'staging release handoff ต้องระบุ Database host/provider เป็น Postgres ที่ deploy แล้ว โดยไม่ใช้ local DB หรือ raw DATABASE_URL',
    )
  })

  test('requires migration evidence rows as field rows', () => {
    const stale = filledHandoff
      .replace('- Database host/provider: managed postgres\n', '- DB note: Database host/provider: managed postgres\n')
      .replace('- คำสั่ง migration: bunx prisma migrate deploy\n', '')
      .replace('- ผล migration: pass\n', '')
      .replace('- Prisma migration version: 20260513103000_add_lore_parent_index\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี migration field ใน release handoff: Database host/provider',
        'ยังไม่มี migration field ใน release handoff: คำสั่ง migration',
        'ยังไม่มี migration field ใน release handoff: ผล migration',
        'ยังไม่มี migration field ใน release handoff: Prisma migration version',
      ]),
    )
  })

  test('requires production-safe auth and storage evidence for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- โหมด auth: supabase-jwt', '- โหมด auth: local-dev')
      .replace('- Supabase project ref: maprangqa12345678', '- Supabase project ref: https://supabase.com/dashboard/project/maprangqa12345678')
      .replace('- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร: supabase', '- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร: local')
      .replace('- รูปแบบการเข้าถึงรูปตัวละคร: signed', '- รูปแบบการเข้าถึงรูปตัวละคร: public')
      .replace('- อายุ signed URL: 3600', '- อายุ signed URL: 86400')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องใช้โหมด auth เป็น supabase-jwt',
        'production release handoff ต้องมี Supabase project ref จริง ไม่ใช่ URL หรือ placeholder',
        'production release handoff ต้องใช้พื้นที่เก็บรูปตัวละครเป็น supabase',
        'production release handoff ต้องใช้รูปตัวละครแบบ signed URL',
        'production release handoff ต้องตั้งอายุ signed URL เป็น 3600',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องใช้โหมด auth เป็น supabase-jwt',
        'staging release handoff ต้องมี Supabase project ref จริง ไม่ใช่ URL หรือ placeholder',
        'staging release handoff ต้องใช้พื้นที่เก็บรูปตัวละครเป็น supabase',
        'staging release handoff ต้องใช้รูปตัวละครแบบ signed URL',
        'staging release handoff ต้องตั้งอายุ signed URL เป็น 3600',
      ]),
    )
  })

  test('requires auth and storage evidence rows as field rows', () => {
    const stale = filledHandoff
      .replace('- โหมด auth: supabase-jwt\n', '- Auth note: โหมด auth: supabase-jwt\n')
      .replace('- Supabase project ref: maprangqa12345678\n', '')
      .replace('- ผู้ให้บริการพื้นที่เก็บรูปตัวละคร: supabase\n', '')
      .replace('- รูปแบบการเข้าถึงรูปตัวละคร: signed\n', '')
      .replace('- อายุ signed URL: 3600\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี auth/storage field ใน release handoff: โหมด auth',
        'ยังไม่มี auth/storage field ใน release handoff: Supabase project ref',
        'ยังไม่มี auth/storage field ใน release handoff: ผู้ให้บริการพื้นที่เก็บรูปตัวละคร',
        'ยังไม่มี auth/storage field ใน release handoff: รูปแบบการเข้าถึงรูปตัวละคร',
        'ยังไม่มี auth/storage field ใน release handoff: อายุ signed URL',
      ]),
    )
  })

  test('requires release blockers and rollback evidence to be actionable', () => {
    const productionUnsafe = filledHandoff
      .replace('- ตัวกั้นที่ยังเปิดอยู่: none', '- ตัวกั้นที่ยังเปิดอยู่: image provider still failing')
      .replace('- ความเสี่ยงโควตาผู้ให้บริการ: monitored', '- ความเสี่ยงโควตาผู้ให้บริการ: unknown')
      .replace('- งาน follow-up ที่ต้องทำมือ: none', '- งาน follow-up ที่ต้องทำมือ: rotate keys after launch')
      .replace('- เงื่อนไข rollback: provider outage', '- เงื่อนไข rollback: none')
      .replace('- Rollback action: redeploy previous Render/Vercel deployment and restore previous env version', '- Rollback action: decide later')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องไม่มีตัวกั้นเปิดอยู่ก่อน go',
        'production release handoff ต้องระบุความเสี่ยงโควตาผู้ให้บริการที่ชัดเจน',
        'production release handoff ต้องไม่มีงาน follow-up ที่ต้องทำมือก่อน go',
        'production release handoff ต้องมีเงื่อนไข rollback ที่ใช้งานได้จริง',
        'production release handoff ต้องมี Rollback action ที่ทำตามได้จริง',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องไม่มีตัวกั้นเปิดอยู่ก่อน go',
        'staging release handoff ต้องระบุความเสี่ยงโควตาผู้ให้บริการที่ชัดเจน',
        'staging release handoff ต้องไม่มีงาน follow-up ที่ต้องทำมือก่อน go',
        'staging release handoff ต้องมีเงื่อนไข rollback ที่ใช้งานได้จริง',
        'staging release handoff ต้องมี Rollback action ที่ทำตามได้จริง',
      ]),
    )
  })

  test('requires release risk rows as field rows', () => {
    const stale = filledHandoff
      .replace('- ตัวกั้นที่ยังเปิดอยู่: none\n', '- Risk note: ตัวกั้นที่ยังเปิดอยู่: none\n')
      .replace('- ความเสี่ยงโควตาผู้ให้บริการ: monitored\n', '')
      .replace('- งาน follow-up ที่ต้องทำมือ: none\n', '')
      .replace('- เงื่อนไข rollback: provider outage\n', '')
      .replace('- Rollback action: redeploy previous Render/Vercel deployment and restore previous env version\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี release risk field ใน release handoff: ตัวกั้นที่ยังเปิดอยู่',
        'ยังไม่มี release risk field ใน release handoff: ความเสี่ยงโควตาผู้ให้บริการ',
        'ยังไม่มี release risk field ใน release handoff: งาน follow-up ที่ต้องทำมือ',
        'ยังไม่มี release risk field ใน release handoff: เงื่อนไข rollback',
        'ยังไม่มี release risk field ใน release handoff: Rollback action',
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
      .replace('- GitHub Production Smoke URL: https://github.com/Petch1910/maprang-project/actions/runs/123456789\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี QA gate: `bun run qa:local`',
        'ยังไม่มี QA gate: `bun run e2e:smoke`',
        'ยังไม่มี QA gate: `bun run staging:verify`',
        'ยังไม่มี QA gate: `bun run production:check`',
        'ยังไม่มี QA gate: GitHub Production Smoke run',
        'ยังไม่มี QA gate: GitHub Production Smoke URL',
      ]),
    )
  })

  test('requires QA gates as release handoff field rows', () => {
    const stale = filledHandoff.replace('- `bun run qa:local`: pass\n', '- QA note: rerun `bun run qa:local` before release\n')

    expect(checkReleaseHandoffContent(stale)).toContain('ยังไม่มี QA gate: `bun run qa:local`')
  })

  test('requires AI provider evidence rows as field rows', () => {
    const stale = filledHandoff
      .replace('- โมเดลแชท: google/gemini-2.0-flash-001\n', '- Provider note: โมเดลแชท: google/gemini-2.0-flash-001\n')
      .replace('- คำสั่ง live smoke แชท: bun run smoke:chat\n', '')
      .replace('- ผล live smoke แชท: pass\n', '')
      .replace('- ค่า `CHAT_PROVIDER_LIVE_VERIFIED`: 1\n', '')
      .replace('- โมเดลสร้างรูป: gpt-image-1.5\n', '')
      .replace('- คำสั่ง live smoke รูป: bun run smoke:image:live\n', '')
      .replace('- ผล live smoke รูป: pass\n', '')
      .replace('- ค่า `IMAGE_GENERATION_LIVE_VERIFIED`: 1\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี AI provider field ใน release handoff: โมเดลแชท',
        'ยังไม่มี AI provider field ใน release handoff: คำสั่ง live smoke แชท',
        'ยังไม่มี AI provider field ใน release handoff: ผล live smoke แชท',
        'ยังไม่มี AI provider field ใน release handoff: ค่า `CHAT_PROVIDER_LIVE_VERIFIED`',
        'ยังไม่มี AI provider field ใน release handoff: โมเดลสร้างรูป',
        'ยังไม่มี AI provider field ใน release handoff: คำสั่ง live smoke รูป',
        'ยังไม่มี AI provider field ใน release handoff: ผล live smoke รูป',
        'ยังไม่มี AI provider field ใน release handoff: ค่า `IMAGE_GENERATION_LIVE_VERIFIED`',
      ]),
    )
  })

  test('requires live chat billing evidence rows as field rows', () => {
    const stale = filledHandoff
      .replace('- Chat smoke normal chatId: chat-smoke-normal-001\n', '- Provider note: Chat smoke normal chatId: chat-smoke-normal-001\n')
      .replace('- Chat smoke normal tokens: 512\n', '')
      .replace('- Chat smoke normal walletTransactionId: wallet-chat-normal-001\n', '')
      .replace('- Chat smoke stream chatId: chat-smoke-stream-001\n', '')
      .replace('- Chat smoke stream tokens: 144\n', '')
      .replace('- Chat smoke stream walletTransactionId: wallet-chat-stream-001\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke normal chatId',
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke normal tokens',
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke normal walletTransactionId',
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke stream chatId',
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke stream tokens',
        'ยังไม่มี live chat evidence field ใน release handoff: Chat smoke stream walletTransactionId',
      ]),
    )
  })

  test('requires concrete live chat billing evidence for deployed handoffs', () => {
    const productionUnsafe = filledHandoff
      .replace('- Chat smoke normal chatId: chat-smoke-normal-001', '- Chat smoke normal chatId: pass')
      .replace('- Chat smoke normal tokens: 512', '- Chat smoke normal tokens: 0')
      .replace('- Chat smoke normal walletTransactionId: wallet-chat-normal-001', '- Chat smoke normal walletTransactionId: pending')
      .replace('- Chat smoke stream chatId: chat-smoke-stream-001', '- Chat smoke stream chatId: <chat-id>')
      .replace('- Chat smoke stream tokens: 144', '- Chat smoke stream tokens: many')
      .replace('- Chat smoke stream walletTransactionId: wallet-chat-stream-001', '- Chat smoke stream walletTransactionId: example-wallet')
    const stagingUnsafe = productionUnsafe.replace('- Environment: production', '- Environment: staging')

    expect(checkReleaseHandoffContent(productionUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'production release handoff ต้องมี Chat smoke normal chatId จาก live smoke จริง',
        'production release handoff ต้องมี Chat smoke normal tokens เป็นจำนวนโทเคนมากกว่า 0',
        'production release handoff ต้องมี Chat smoke normal walletTransactionId จาก wallet CHAT_USAGE จริง',
        'production release handoff ต้องมี Chat smoke stream chatId จาก live smoke จริง',
        'production release handoff ต้องมี Chat smoke stream tokens เป็นจำนวนโทเคนมากกว่า 0',
        'production release handoff ต้องมี Chat smoke stream walletTransactionId จาก wallet CHAT_USAGE จริง',
      ]),
    )
    expect(checkReleaseHandoffContent(stagingUnsafe, { requireFilled: true })).toEqual(
      expect.arrayContaining([
        'staging release handoff ต้องมี Chat smoke normal chatId จาก live smoke จริง',
        'staging release handoff ต้องมี Chat smoke stream walletTransactionId จาก wallet CHAT_USAGE จริง',
      ]),
    )
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
      .replace('maprangqa12345678', `${fakeOpenRouterKey}\n- Debug token: ${fakeGithubToken}\n- Rollback doc: https://release-user:release-pass@deploy.example.com/runbook`)

    expect(checkReleaseHandoffContent(unsafe)).toEqual(
      expect.arrayContaining(['ยังไม่มี section: การตัดสินใจปล่อย', 'พบ OpenRouter key', 'พบ GitHub token', 'พบ URL ที่มี credential/userinfo']),
    )
  })

  test('reports missing critical release handoff fields', () => {
    const stale = filledHandoff
      .replace('- Environment: production\n', '')
      .replace('- Frontend URL: https://app.maprang.example\n', '')
      .replace('- Backend URL: https://api.maprang.example\n', '')
      .replace('- Health check result: pass\n', '')
      .replace('- Ready check result: pass\n', '')
      .replace('- CORS origins: https://app.maprang.example\n', '')
      .replace('- Go / no-go: go\n', '')
      .replace('- ผู้อนุมัติ: release lead\n', '')
      .replace('- หมายเหตุ: ready\n', '')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining([
        'ยังไม่มี field ใน release handoff: Environment',
        'ยังไม่มี field ใน release handoff: Frontend URL',
        'ยังไม่มี field ใน release handoff: Backend URL',
        'ยังไม่มี field ใน release handoff: Health check result',
        'ยังไม่มี field ใน release handoff: Ready check result',
        'ยังไม่มี field ใน release handoff: CORS origins',
        'ยังไม่มี field ใน release handoff: Go / no-go',
        'ยังไม่มี release decision field ใน release handoff: ผู้อนุมัติ',
        'ยังไม่มี release decision field ใน release handoff: หมายเหตุ',
      ]),
    )
  })

  test('requires critical release handoff fields as field rows', () => {
    const stale = filledHandoff
      .replace('- Environment: production\n', '- Release note: Environment: production\n')
      .replace('- Frontend URL: https://app.maprang.example\n', '- Release note: Frontend URL: https://app.maprang.example\n')

    expect(checkReleaseHandoffContent(stale)).toEqual(
      expect.arrayContaining(['ยังไม่มี field ใน release handoff: Environment', 'ยังไม่มี field ใน release handoff: Frontend URL']),
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
