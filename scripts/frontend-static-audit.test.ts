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
      `,
      'Fixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'link uses href="#" placeholder',
      'router link uses to={"#"} placeholder',
      'button/link has an empty onClick handler',
      'throws not implemented in frontend source',
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
      ].join('\n'),
      'MixedEnglishUiFixture.tsx',
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains English UI label that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
      'contains mixed English UI wording that should be Thai-first',
    ])
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
