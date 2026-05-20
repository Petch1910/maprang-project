import { describe, expect, test } from 'bun:test'
import {
  auditButtonsWithAst,
  auditFrontendSourceFile,
  auditSuspiciousPatterns,
  collectFrontendStaticFindings,
  lineFor,
  runFrontendStaticAudit,
} from './frontend-static-audit'

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
      expect.stringContaining('button is missing an explicit type'),
      expect.stringContaining('icon-only button is missing aria-label or title'),
    ])
  })

  test('reports placeholder links, empty handlers, and not implemented errors', () => {
    const findings = auditSuspiciousPatterns(
      `
        <a href="#">Placeholder</a>
        <NavLink to={"#"}>Placeholder</NavLink>
        <button type="button" onClick={() => {}}>No-op</button>
        throw new Error('not implemented')
        setNote(error instanceof Error ? error.message : 'เข้าสู่ระบบไม่สำเร็จ')
        state.error = action.error.message
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'link uses href="#" placeholder',
      'router link uses to={"#"} placeholder',
      'button/link has an empty onClick handler',
      'throws not implemented in frontend source',
      'surfaces raw auth/provider error message to users',
      'surfaces raw Redux async error message to users',
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
        'contains Thai coming-soon placeholder copy',
        'contains replacement character, likely broken text encoding',
        'contains C1 control character, likely mojibake',
        'contains common Thai UTF-8 mojibake sequence',
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

    expect(findings.map((finding) => finding.message)).toEqual([
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
    ])
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
      ].join('\n'),
      'MixedEnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains mixed Creator Studio wording that should be Thai-first',
      'contains mixed Creator Studio wording that should be Thai-first',
      'contains mixed Creator Studio wording that should be Thai-first',
      'contains mixed Creator Studio wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
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
      ].join('\n'),
      'AdminHealthFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 12 }, () => 'contains mixed Admin Health wording that should be Thai-first'),
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
      Array.from({ length: 15 }, () => 'contains mixed prompt/admin tooling wording that should be Thai-first'),
    )
  })

  test('reports mixed profile and tag helper wording regressions', () => {
    const findings = auditSuspiciousPatterns(
      [
        '<p>เปิดโหมดผู้ใหญ่สำหรับเนื้อเรื่องจำลอง/สมมุติ และให้ backend จำกัดตามบัญชี</p>',
        '<p>บันทึกโหมดคอนเทนต์ไม่ได้ กรุณาเช็กการเชื่อมต่อ backend</p>',
        '<p>โดย backend จะจำกัดซ้ำตามบัญชี</p>',
        '<p>พฤติกรรมบอทอาจแกว่งถ้า prompt ไม่ชัด</p>',
      ].join('\n'),
      'ProfileTagFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      Array.from({ length: 4 }, () => 'contains mixed profile/tag helper wording that should be Thai-first'),
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
        expect.stringContaining('button is missing an explicit type'),
        expect.stringContaining('icon-only button is missing aria-label or title'),
        'button/link has an empty onClick handler',
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
    expect(lines[0]).toBe('ok - frontend static audit passed')
    expect(errors).toEqual([])
  })
})
