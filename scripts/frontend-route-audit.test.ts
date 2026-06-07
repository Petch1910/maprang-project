import { describe, expect, test } from 'bun:test'
import {
  auditFile,
  auditRoutePreloads,
  collectFrontendRouteAuditResult,
  collectRoutePreloadPaths,
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

  test('collects declared React Router paths from route constants', () => {
    const routes = collectRoutesFromApp(`
      const routePaths = {
        home: '/',
        chat: '/chat/:id',
      } as const;

      <Routes>
        <Route path={routePaths.home} element={<Home />} />
        <Route path={routePaths['chat']} element={<Chat />} />
      </Routes>
    `)

    expect(routes).toEqual(['/', '/chat/:id'])
  })

  test('collects route preload paths from App routePreloads', () => {
    expect(
      collectRoutePreloadPaths(`
        const routePaths = {
          events: '/events',
        } as const
        const routePreloads = ({
          '/': loadHome,
          '/admin/health': loadAdminHealth,
          [routePaths.events]: loadEvents,
          '/chat': loadChat,
        } satisfies Record<string, unknown>)
      `).map((entry) => entry.path),
    ).toEqual(['/', '/admin/health', '/events', '/chat'])
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
              <button onClick={() => navigate({ pathname: '/ghost-object' })}>Missing object</button>
              <NavLink to="/ghost">Ghost</NavLink>
            </>
          )
        }
      `,
      'Fixture.tsx',
      ['/', '/chat/:id', '/characters/:id'],
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'คำสั่ง navigate ชี้ไปที่ /missing แต่ App.tsx ไม่มี Route ที่ตรงกัน',
      'คำสั่ง navigate ชี้ไปที่ /ghost-object แต่ App.tsx ไม่มี Route ที่ตรงกัน',
      'ค่า to ชี้ไปที่ /ghost แต่ App.tsx ไม่มี Route ที่ตรงกัน',
    ])
  })

  test('reports route constants that point to undeclared routes', () => {
    const findings = auditFile(
      `
        const routePaths = {
          ghostFromJsx: '/ghost-jsx',
          ghostFromObject: '/ghost-object-literal',
          ghostFromNavigate: '/ghost-navigate',
          ghostFromNavigateObject: '/ghost-navigate-object',
        } as const
        const navItems = [{ to: routePaths.ghostFromObject }]

        export function Fixture() {
          return (
            <>
              <NavLink to={routePaths.ghostFromJsx}>Ghost constant</NavLink>
              <button onClick={() => navigate(routePaths.ghostFromNavigate)}>Missing constant</button>
              <button onClick={() => navigate({ pathname: routePaths['ghostFromNavigateObject'] })}>Missing object</button>
            </>
          )
        }
      `,
      'Fixture.tsx',
      ['/'],
    )

    expect(findings.map((finding) => finding.message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/ghost-object-literal'),
        expect.stringContaining('/ghost-jsx'),
        expect.stringContaining('/ghost-navigate'),
        expect.stringContaining('/ghost-navigate-object'),
      ]),
    )
  })

  test('reports object literal navigation paths that point to undeclared routes', () => {
    const findings = auditFile(
      `
        const navItems = [
          { label: 'Chat', to: '/chat' },
          { label: 'Ghost', to: '/ghost' },
          { label: 'External', href: 'https://example.com' },
        ]
      `,
      'Fixture.tsx',
      ['/', '/chat'],
    )

    expect(findings.map((finding) => finding.message)).toEqual([
      'ค่า to ใน object ชี้ไปที่ /ghost แต่ App.tsx ไม่มี Route ที่ตรงกัน',
    ])
  })

  test('reports route preload paths that point to undeclared routes', () => {
    const findings = auditRoutePreloads(
      `
        const routePreloads = {
          '/': loadHome,
          '/ghost': loadGhost,
        };
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      `,
      'apps/frontend/src/App.tsx',
      ['/'],
    )

    expect(findings).toEqual([
      {
        file: 'apps/frontend/src/App.tsx',
        line: 4,
        message: 'routePreloads ชี้ไปที่ /ghost แต่ App.tsx ไม่มี Route ที่ตรงกัน',
      },
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
    expect(lines[0]).toContain('ผ่าน - frontend route audit ผ่านแล้ว')
    expect(lines[0]).toContain('รายการ')
    expect(lines[0]).not.toContain(' routes')
    expect(errors).toEqual([])
  })
})
