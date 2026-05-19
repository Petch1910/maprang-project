import { describe, expect, test } from 'bun:test'
import { auditButtonsWithAst, auditFrontendSourceFile, auditSuspiciousPatterns, lineFor } from './frontend-static-audit'

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
})
