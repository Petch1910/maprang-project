import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import {
  auditButtonsWithAst,
  auditDisabledControlsWithAst,
  auditFrontendSourceFile,
  auditLinksWithAst,
  auditRawFrontendFetchUsage,
  auditReferencedFrontendModules,
  auditRawResponseTextParsing,
  auditSuspiciousPatterns,
  auditUnmountedFrontendComponents,
  auditUnmountedFrontendPages,
  collectFrontendStaticFindings,
  lineFor,
  runFrontendStaticAudit,
} from './frontend-static-audit'

const englishUiFinding = 'พบ label ภาษาอังกฤษใน UI ที่ควรเป็น Thai-first'
const creatorMixedFinding = 'พบข้อความ Creator Studio ปนอังกฤษที่ควรเป็น Thai-first'
const adminHealthMixedFinding = 'พบข้อความ Admin Health ปนอังกฤษที่ควรเป็น Thai-first'
const promptToolingMixedFinding = 'พบข้อความ prompt/admin tooling ปนอังกฤษที่ควรเป็น Thai-first'
const mixedUiFinding = 'พบข้อความ UI ปนอังกฤษที่ควรเป็น Thai-first'
const profileHelperMixedFinding = 'พบข้อความ profile/tag helper ปนอังกฤษที่ควรเป็น Thai-first'
const knowledgePersonaMixedFinding = 'พบข้อความคลังความรู้หรือตัวตนผู้เล่นปนอังกฤษที่ควรเป็น Thai-first'

describe('frontend static audit', () => {
  test('reports buttons without explicit type and icon-only labels', () => {
    const findings = auditButtonsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button onClick={save}>Save</button>
              <button type="button"><Icon /></button>
              <button type="button" aria-label="Refresh"><Icon /></button>
              <button type="button">Cancel</button>
            </>
          )
        }
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('ปุ่มไม่มี type ชัดเจน'),
      expect.stringContaining('ปุ่มไอคอนล้วนไม่มี aria-label หรือ title'),
    ])
  })

  test('reports disabled controls without a user-facing reason', () => {
    const findings = auditDisabledControlsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button type="button" disabled={isSaving}>Save</button>
              <input disabled />
              <button type="button" disabled={isSaving} title={saveReason || 'บันทึก'}>Safe</button>
              <input disabled={isLoading} aria-label="โหลดข้อมูลก่อนแก้ไข" />
              <textarea disabled={false} />
            </>
          )
        }
      `,
      'DisabledFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
    ])
  })

  test('reports aria-disabled controls without a user-facing reason', () => {
    const findings = auditDisabledControlsWithAst(
      `
        export function Fixture() {
          return (
            <>
              <button type="button" aria-disabled={isSaving}>Save</button>
              <a href="/wallet" aria-disabled={isLoading}>Wallet</a>
              <Link to="/chat" aria-disabled>Chat</Link>
              <input aria-disabled={isLocked} />
              <label aria-disabled={isUploading}>Upload</label>
              <textarea aria-disabled={isLocked} title={lockReason || 'กำลังล็อกช่องนี้'} />
              <NavLink to="/events" aria-disabled="false">Events</NavLink>
              <select aria-disabled="false"><option>Open</option></select>
              <button type="button" aria-disabled={false}>Open</button>
              <a href="/safe" aria-disabled={isLoading} title={loadReason || 'โหลดข้อมูลก่อน'}>Safe</a>
              <button type="button" disabled={isSaving} aria-disabled={isSaving}>Native disabled already covered</button>
            </>
          )
        }
      `,
      'AriaDisabledFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
      expect.stringContaining('control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล'),
    ])
  })

  test('reports unsafe new-tab links without opener protection', () => {
    const findings = auditLinksWithAst(
      `
        export function Fixture() {
          return (
            <>
              <a href="https://example.com" target="_blank">External</a>
              <a href="https://example.com" target="_blank" rel="noopener noreferrer">Safe</a>
              <a href="https://example.com" target="_self">Same tab</a>
            </>
          )
        }
      `,
      'LinkFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      expect.stringContaining('ลิงก์ target="_blank" ต้องมี rel="noopener noreferrer"'),
    ])
  })

  test('reports unsafe React Router new-tab links without opener protection', () => {
    const findings = auditLinksWithAst(
      `
        export function Fixture() {
          return (
            <>
              <Link to="/profile" target="_blank">Unsafe router link</Link>
              <NavLink to="/profile" target="_blank" rel="noopener noreferrer">Safe router link</NavLink>
            </>
          )
        }
      `,
      'RouterLinkFixture.tsx',
    )

    expect(findings).toHaveLength(1)
    expect(findings[0]?.message).toContain('target="_blank"')
    expect(findings[0]?.message).toContain('rel="noopener noreferrer"')
  })

  test('reports placeholder links, empty handlers, and not implemented errors', () => {
    const findings = auditSuspiciousPatterns(
      `
        <a href="#">Placeholder</a>
        <a href = "#">Spaced placeholder</a>
        <a href={"#"}>Expression placeholder</a>
        <a href={\`#\`}>Template placeholder</a>
        <NavLink to={"#"}>Placeholder</NavLink>
        <NavLink to = {'#'}>Spaced Router placeholder</NavLink>
        <NavLink to={\`#\`}>Template Router placeholder</NavLink>
        <button type="button" onClick={() => {}}>No-op</button>
        <button type="button" onClick = {() => {}}>Spaced no-op</button>
        <button type="button" onClick={async () => {}}>Async no-op</button>
        <button type="button" onClick = {async () => {}}>Spaced async no-op</button>
        <button type="button" onClick={() => undefined}>Undefined no-op</button>
        <button type="button" onClick = {() => undefined}>Spaced undefined no-op</button>
        throw new Error('not implemented')
        throw new Error (\`not implemented\`)
        setNote(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ')
        state.error = action.error.message
        const message =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'fallback'
        const payloadError =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : 'fallback'
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'ลิงก์ใช้ href="#" เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href="#" เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ใช้ href={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน',
      'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick async ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick async ว่างเปล่า',
      'ปุ่มหรือลิงก์มี onClick คืน undefined',
      'ปุ่มหรือลิงก์มี onClick คืน undefined',
      'frontend source ยังโยน not implemented',
      'frontend source ยังโยน not implemented',
      'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
      'พบข้อความ error ดิบจาก Redux async ที่อาจแสดงให้ผู้ใช้เห็น',
      'ApiError ต้องใช้ payload.message ก่อน payload.error',
      'ApiError ห้ามแสดง payload.error เป็น fallback ให้ผู้ใช้',
    ])
  })

  test('reports raw auth error classifier regressions', () => {
    expect(
      auditSuspiciousPatterns(
        `
          const rawAuthMessage = error.message.toLowerCase()
          const rawStringMessage = String(error).toLowerCase()
          const rawRegexMessage = /admin_unauthorized|forbidden/i.test(error.message)
          const rawMatchMessage = error.message.match(/forbidden/i)
        `,
        'AuthFixture.tsx',
      ).map((finding) => finding.message),
    ).toEqual([
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
      'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
    ])
  })

  test('reports risky frontend DOM and code execution patterns', () => {
    const findings = auditSuspiciousPatterns(
      `
        <section dangerouslySetInnerHTML={{ __html: html }} />
        element.innerHTML = html
        eval(userInput)
        const fn = new Function(userInput)
        window.open(url, '_blank')
        <a href="javascript:alert(1)">Bad protocol</a>
        <a href = "vbscript:alert(1)">Bad spaced protocol</a>
        <Link to={'data:text/html,<h1>x</h1>'}>Bad protocol</Link>
        <Link to = {\`javascript:alert(1)\`}>Bad spaced protocol</Link>
        console.error('โหลดข้อมูลไม่สำเร็จ:', error)
      `,
      'RiskyFrontendFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'ห้ามใช้ dangerouslySetInnerHTML ใน frontend source ก่อนมี sanitizer และ review ชัดเจน',
      'ห้ามเขียน innerHTML โดยตรงใน frontend source',
      'ห้ามใช้ eval() ใน frontend source',
      'ห้ามใช้ new Function() ใน frontend source',
      'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
      'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
    ])
  })

  test('reports raw response JSON parsing outside frontend API helpers', () => {
    expect(
      auditFrontendSourceFile(
        `
          async function loadCharacters() {
            const response = await fetch('/characters')
            return response.json()
          }
        `,
        'ApiLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้าม parse response.json() ตรงใน frontend source; ให้ใช้ readApiJson/readErrorPayload เพื่อห่อ JSON พังเป็นข้อความไทยก่อน.')

    expect(
      auditFrontendSourceFile(
        `
          async function readErrorPayload(response: Response) {
            return response.clone().json().catch(() => null)
          }

          async function readApiJson<T>(path: string, response: Response): Promise<T> {
            try {
              return (await response.json()) as T
            } catch {
              throw new ApiError(path, 502, malformedApiJsonPayload)
            }
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])
  })

  test('reports raw response text parsing in frontend source', () => {
    expect(
      auditRawResponseTextParsing(
        `
          async function loadPlainError(response: Response) {
            const raw = await response.text()
            setToast(raw)
          }
        `,
        'ApiTextLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้ามอ่าน response.text() ตรงใน frontend source; ให้ backend/API helper แปลงเป็น ApiError ข้อความไทยที่ควบคุมได้ก่อนถึง UI.')

    expect(
      auditFrontendSourceFile(
        `
          async function loadPlainError(response: Response) {
            return response.clone().text()
          }
        `,
        'ApiTextLeak.ts',
      ).map((finding) => finding.message),
    ).toContain('ห้ามอ่าน response.text() ตรงใน frontend source; ให้ backend/API helper แปลงเป็น ApiError ข้อความไทยที่ควบคุมได้ก่อนถึง UI.')
  })

  test('reports direct frontend fetch outside the central API helper', () => {
    expect(
      auditRawFrontendFetchUsage(
        `
          async function loadCharacters() {
            return fetch('/characters')
          }
        `,
        'apps/frontend/src/pages/ExplorePage.tsx',
      ).map((finding) => finding.message),
    ).toContain('ห้ามเรียก fetch ตรงนอก apps/frontend/src/lib/api.ts; ให้ผ่าน API helper กลางเพื่อคุม auth, error, stream และ diagnostics ให้สม่ำเสมอ.')

    expect(
      auditRawFrontendFetchUsage(
        `
          export async function requestJson(path: string) {
            return fetch(path)
          }
        `,
        'apps/frontend/src/lib/api.ts',
      ),
    ).toEqual([])
  })

  test('reports unmounted frontend components except explicit allowlist entries', async () => {
    const fixtureRoot = join(process.cwd(), 'apps/frontend/src')
    const files = [
      join(fixtureRoot, 'components/DeadPanel.tsx'),
      join(fixtureRoot, 'components/LivePanel.tsx'),
      join(fixtureRoot, 'components/AuthPanel.tsx'),
      join(fixtureRoot, 'pages/LivePage.tsx'),
    ]
    const contents = new Map([
      [files[0], 'export function DeadPanel() { return <section /> }'],
      [files[1], 'export function LivePanel() { return <section /> }'],
      [files[2], 'export function AuthPanel() { return <section /> }'],
      [files[3], "import { LivePanel } from '../components/LivePanel'\nexport function LivePage() { return <LivePanel /> }"],
    ])

    const findings = await auditUnmountedFrontendComponents(files, async (file) => contents.get(file) ?? '')

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/components/DeadPanel.tsx',
        line: 1,
        message:
          'component หน้าบ้านไม่ได้ถูก import หรือ mount จาก source อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
      },
    ])
  })

  test('reports stale or unexplained frontend allowlist entries', () => {
    const files = [
      {
        file: join(process.cwd(), 'apps/frontend/src/components/AllowedBlank.tsx'),
        relativeFile: 'apps/frontend/src/components/AllowedBlank.tsx',
        content: 'export function AllowedBlank() { return <section /> }',
      },
      {
        file: join(process.cwd(), 'apps/frontend/src/pages/LivePage.tsx'),
        relativeFile: 'apps/frontend/src/pages/LivePage.tsx',
        content: "import { AllowedBlank } from '../components/AllowedBlank'\nexport function LivePage() { return <AllowedBlank /> }",
      },
    ]
    const allowlist = new Map([
      ['apps/frontend/src/components/AllowedBlank.tsx', '  '],
      ['apps/frontend/src/components/MissingPanel.tsx', 'เก็บไว้สำหรับทดสอบข้อยกเว้นที่ไฟล์หาย'],
    ])

    const findings = auditReferencedFrontendModules(
      files,
      /^apps\/frontend\/src\/components\/[^/]+\.tsx$/,
      allowlist,
      'component หน้าบ้านไม่ได้ถูก import หรือ mount จาก source อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
    )

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/components/AllowedBlank.tsx',
        line: 1,
        message: 'allowlist ของ frontend static audit ต้องมีเหตุผลชัดเจน',
      },
      {
        file: 'apps/frontend/src/components/MissingPanel.tsx',
        line: 1,
        message: 'allowlist ของ frontend static audit ชี้ไฟล์ที่ไม่มีอยู่จริงหรือไม่ตรงชนิดที่ตรวจ',
      },
    ])
  })

  test('reports unmounted frontend pages that are not wired into routes', async () => {
    const fixtureRoot = join(process.cwd(), 'apps/frontend/src')
    const files = [
      join(fixtureRoot, 'pages/DeadPage.tsx'),
      join(fixtureRoot, 'pages/LivePage.tsx'),
      join(fixtureRoot, 'App.tsx'),
    ]
    const contents = new Map([
      [files[0], 'export function DeadPage() { return <main /> }'],
      [files[1], 'export function LivePage() { return <main /> }'],
      [
        files[2],
        "const loadLivePage = () => import('./pages/LivePage').then((module) => ({ default: module.LivePage }))\n<Route element={<LivePage />} path=\"/live\" />",
      ],
    ])

    const findings = await auditUnmountedFrontendPages(files, async (file) => contents.get(file) ?? '')

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/pages/DeadPage.tsx',
        line: 1,
        message: 'page หน้าบ้านไม่ได้ถูก import หรือ mount จาก App/page อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล',
      },
    ])
  })

  test('reports Thai placeholder and mojibake text regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>เร็วๆ นี้</p>',
        '<p>broken\uFFFDtext</p>',
        '<p>\u0e40\u0e18\u2022\u0e40\u0e19\u0089องเปิดเมนู</p>',
      ].join('\n'),
      'ThaiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        'พบข้อความไทยแนวเร็วๆนี้ที่เป็นข้อความรอทำ',
        'พบ replacement character อาจเป็น encoding เสีย',
        'พบ C1 control character อาจเป็น mojibake',
        'พบลำดับตัวอักษรไทยที่มักเป็น UTF-8 mojibake',
      ]),
    )
  })

  test('reports English UI label regressions for Thai-first surfaces', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>Prompt Inspector</p>',
        '<span>Admin Health</span>',
        '<InfoLine label="Chat reply budget" value="1200 tokens" />',
        '<h3>Relationship Contract</h3>',
        '<p>Production blocker summary</p>',
        '<h2>Deploy checklist</h2>',
        '<p>Knowledge pack needs check</p>',
        '<p>Production gates</p>',
        '<span>staging/future gate</span>',
        '<p>Could not load chats</p>',
        '<p>Could not load characters</p>',
        '<p>/chat failed with status 500</p>',
        '<p>Teen romance</p>',
        '<p>Mature 18+</p>',
        '<p>Restricted 18+</p>',
        '<p>image provider</p>',
        '<button aria-label="Select chat" />',
      ].join('\n'),
      'EnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(Array.from({ length: 18 }, () => englishUiFinding))
  })

  test('reports mixed English debug copy regressions for Thai-first surfaces', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>prompt-control, relationship state, scene state และ token budget</p>',
        '<h1>ทดสอบคุณภาพ prompt/context</h1>',
        '<p>ระบบ relationship สร้างจังหวะของเรื่อง</p>',
        '<p>ยังไม่ได้ตั้ง anchor ตัวละคร</p>',
        '<p>รัน eval</p>',
        '<p>ยังไม่ได้รัน eval</p>',
        '<p>hook: unfinished business</p>',
        '<p>ยัง fallback เป็นภาพตัวอย่าง</p>',
        '<th>เหตุผล disabled</th>',
        '<p>production ควรตั้งค่า image provider จริง</p>',
        '<p>ใส่รูปเพื่อให้หน้าการ์ดและ Lobby ดูน่ากด</p>',
        '<p>มีแกน prompt สำหรับคุมโทนตัวละคร</p>',
        '<p>ให้ backend ช่วยร่างตัวละคร</p>',
        '<input placeholder="roleplay, thai" />',
        '<span>AI roleplay ภาษาไทย</span>',
      ].join('\n'),
      'MixedEnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      ...Array.from({ length: 6 }, () => englishUiFinding),
      ...Array.from({ length: 6 }, () => creatorMixedFinding),
      ...Array.from({ length: 7 }, () => mixedUiFinding),
    ])
  })

  test('reports mixed Admin Health operational copy regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>backend ยังไม่พร้อมเต็ม ต้องดู checklist ด้านล่าง</p>',
        '<p>ติดต่อ backend health ไม่ได้</p>',
        '<p>รอ health response จาก backend</p>',
        '<p>backend env ไม่มีค่า required ที่ขาด</p>',
        '<p>ล็อกค่า env ชุดนี้ไว้ใน hosting secret manager</p>',
        '<p>แก้ backend host secrets แล้วรัน production:check</p>',
        '<p>waiting for backend health response</p>',
        '<p>ยืนยัน provider จริง</p>',
        '<p>พร้อมสำหรับ final gate แล้ว</p>',
        '<p>เช็ค console error และ mobile overflow</p>',
        '<p>production smoke กับ backend/frontend domain จริง</p>',
        '<p>ไม่มี warning ฝั่ง frontend</p>',
        '<p>ถ้าได้ usage.providerFailure ต้องเช็คคีย์</p>',
        '<p>ถ้าได้ providerFailure ต้องเช็คคีย์</p>',
        '<p>ถ้าเจอ billing/quota limit ต้องเพิ่มวงเงิน</p>',
        '<p>local/dev ยังไม่บังคับ</p>',
        '<p>รันกับ production/staging ให้ผ่าน</p>',
        '<p>รันกับ staging/production ให้ผ่าน</p>',
        '<h1>ตรวจความพร้อมก่อน staging / production</h1>',
        '<p>ยืนยัน live chat smoke แล้ว</p>',
        '<p>ยืนยัน live image smoke แล้ว</p>',
        '<p>เช็คด้วย browser smoke</p>',
        '<p>สรุป blocker production</p>',
        '<p>พร้อมสำหรับ production smoke</p>',
        '<p>รัน production gate ซ้ำ</p>',
        '<p>ก่อน production ต้องเช็ค</p>',
        '<p>build production แล้ว</p>',
      ].join('\n'),
      'AdminHealthFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 28 }, () => adminHealthMixedFinding),
    )
  })

  test('reports mixed prompt and admin tooling wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<Field label="System prompt / บุคลิก" />',
        '<button>รีเซ็ต prompt</button>',
        '<p>คัดลอก redacted prompt แล้ว</p>',
        '<p>Redacted final prompt</p>',
        '<span>Runtime note</span>',
        '<span>Persona override</span>',
        '<span>โน้ต runtime</span>',
        '<span>persona ชั่วคราว</span>',
        '<p>ระบบจะแสดง prompt snapshot และ diff ที่ redact แล้ว</p>',
        '<p>ตรวจพรอมป์ไม่สำเร็จ ลองเช็ค backend</p>',
        '<p>เรียก admin API เพื่อตรวจ snapshot พรอมป์และ diff พรอมป์</p>',
        '<p>frontend domain ทดลอง</p>',
      ].join('\n'),
      'PromptToolingFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 15 }, () => promptToolingMixedFinding),
    )
  })

  test('reports mixed lorebook and persona wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>Lorebook</p>',
        '<StatCard label="Lore ที่ใช้" />',
        '<p>Lore ที่ดึงมาใช้</p>',
        '<p>ไม่มี lore ที่ถูกดึงมาใช้</p>',
        '<p>กำลังโหลด lore...</p>',
        '<button>เพิ่ม lore</button>',
        '<button>แก้ lore</button>',
        '<button>บันทึก lore</button>',
        '<input placeholder="keyword เช่น บ้านเกิด" />',
        '<input placeholder="aliases คั่นด้วย comma" />',
        '<input placeholder="priority" />',
        '<span>Persona ชั่วคราว</span>',
        '<span>แนบ persona ที่บันทึกไว้</span>',
        '<input placeholder="เว้นว่างเพื่อใช้ persona ที่บันทึกไว้" />',
        '<p>ชุดนี้ใช้เป็น visual cue ก่อนต่อ persona expression จริง</p>',
      ].join('\n'),
      'KnowledgePersonaFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 16 }, () => knowledgePersonaMixedFinding),
    )
  })

  test('reports mixed profile and tag helper wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>เปิดโหมดผู้ใหญ่สำหรับเนื้อเรื่องจำลอง/สมมุติ และให้ backend จำกัดตามบัญชี</p>',
        '<p>บันทึกโหมดคอนเทนต์ไม่ได้ กรุณาเช็กการเชื่อมต่อ backend</p>',
        '<p>โดย backend จะจำกัดซ้ำตามบัญชี</p>',
        '<p>พฤติกรรมบอทอาจแกว่งถ้า prompt ไม่ชัด</p>',
        '<p>ยังไม่ใช่ปุ่มในแอปเครื่องนี้ เพราะต้องใช้บัญชีและโดเมนจริง</p>',
      ].join('\n'),
      'ProfileTagFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      [
        ...Array.from({ length: 4 }, () => profileHelperMixedFinding),
        'พบข้อความ staging checklist ที่กำกวมเหมือนปุ่มปลอม',
      ],
    )
  })

  test('combines accessibility and placeholder findings with stable line numbers', () => {
    const content = `
      export function Fixture() {
        return <button onClick={() => {}}><Icon /></button>
      }
    `
    const findings = auditFrontendSourceFile(content, 'Fixture.tsx')

    expect(lineFor(content, content.indexOf('<button'))).toBe(3)
    expect(findings.map((finding) => finding.line)).toEqual([3, 3, 3])
    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('ปุ่มไม่มี type ชัดเจน'),
        expect.stringContaining('ปุ่มไอคอนล้วนไม่มี aria-label หรือ title'),
        'ปุ่มหรือลิงก์มี onClick ว่างเปล่า',
      ]),
    )
  })

  test('runs the committed frontend static audit through an importable runner', async () => {
    const findings = await collectFrontendStaticFindings()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runFrontendStaticAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toBe('ผ่าน - ตรวจ static หน้าบ้านผ่านแล้ว')
    expect(errors).toEqual([])
  })
})
