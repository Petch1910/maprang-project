import { describe, expect, test } from 'bun:test'
import {
  auditFile,
  collectFrontendRouteAuditResult,
  collectRoutesFromApp,
  isCoveredByRoute,
  normalizeStaticPath,
  runFrontendRouteAudit,
} from './frontend-route-audit'

describe('frontend route audit', () => {
  test('collects declared React Router paths and matches dynamic routes', () => {
    const routes = collectRoutesFromApp(`
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/chat/:id" element={<Chat />} />
        <Route path="/characters/:id" element={<Lobby />} />
      </Routes>
    `)

    expect(routes).toEqual(['/', '/chat', '/chat/:id', '/characters/:id'])
    expect(isCoveredByRoute('/chat/abc', routes)).toBe(true)
    expect(isCoveredByRoute('/characters/abc', routes)).toBe(true)
    expect(isCoveredByRoute('/wallet', routes)).toBe(false)
  })

  test('normalizes static paths without accepting external or protocol-relative URLs', () => {
    expect(normalizeStaticPath('/chat/abc?tab=read#top')).toBe('/chat/abc')
    expect(normalizeStaticPath('/chat/')).toBe('/chat')
    expect(normalizeStaticPath('https://example.com/chat')).toBeNull()
    expect(normalizeStaticPath('//cdn.example.com/icon.png')).toBeNull()
  })

  test('reports static links and navigate calls that point to undeclared routes', () => {
    const findings = auditFile(
      `
        export function Fixture() {
          return (
            <>
              <NavLink to="/chat/abc?mode=read">Chat</NavLink>
              <a href="/characters/mika">Lobby</a>
              <a href="https://example.com">External</a>
              <button onClick={() => navigate('/missing')}>Missing</button>
              <NavLink to="/ghost">Ghost</NavLink>
            </>
          )
        }
      `,
      'Fixture.tsx',
      ['/', '/chat/:id', '/characters/:id'],
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'navigate call points to /missing, but App.tsx has no matching Route',
      'to attribute points to /ghost, but App.tsx has no matching Route',
    ])
  })

  test('runs the committed frontend route audit through an importable runner', async () => {
    const result = await collectFrontendRouteAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runFrontendRouteAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.ok).toBe(true)
    expect(result.declaredRoutes.length).toBeGreaterThan(0)
    expect(result.findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ok - frontend route audit passed')
    expect(errors).toEqual([])
  })
})
