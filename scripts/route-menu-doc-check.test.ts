import { describe, expect, test } from 'bun:test'
import type { RouteMenuAuditRow, RouteMenuAuditStatus } from '../apps/frontend/src/lib/routeMenuAudit.ts'
import {
  auditRouteMenuDocumentation,
  collectAuditRows,
  collectRouteMenuDocCheckResult,
  runRouteMenuDocCheck,
} from './route-menu-doc-check'

function row(overrides: Partial<RouteMenuAuditRow> = {}): RouteMenuAuditRow {
  return {
    area: 'Home',
    route: '/',
    control: 'open home',
    result: 'home renders',
    disabledReason: 'none',
    emptyState: 'empty home copy',
    status: 'ready',
    ...overrides,
  }
}

const okStatusLabel = (status: RouteMenuAuditStatus) => `status: ${status}`

describe('route menu doc check', () => {
  test('collects markdown audit rows and strips inline markdown', () => {
    const rows = collectAuditRows(`
      | พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | Disabled/Guard | Empty state |
      | --- | --- | --- | --- | --- | --- |
      | **Home** | \`/\` | open | renders | none | helpful |
    `)

    expect(rows).toEqual([
      {
        area: 'Home',
        route: '/',
        cells: ['Home', '/', 'open', 'renders', 'none', 'helpful'],
      },
    ])
  })

  test('passes when documented rows, routes, navigation, and preloads align', () => {
    const findings = auditRouteMenuDocumentation({
      markdown: `
        | พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | Disabled/Guard | Empty state |
        | --- | --- | --- | --- | --- | --- |
        | Home | / | open | renders | none | helpful |
        | Chat | /chat | open chat | renders chat | none | no chats copy |
      `,
      appContent: `
        const routePreloads = {
          '/': () => import('./Home'),
          '/chat': () => import('./Chat'),
        }
        const navItems = [{ to: '/' }, { to: '/chat' }]
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chat" element={<Chat />} />
        </Routes>
      `,
      rows: [row(), row({ area: 'Chat', route: '/chat', control: 'open chat', result: 'chat renders' })],
      minRows: 2,
      requiredSnippets: [],
      statusLabel: okStatusLabel,
    })

    expect(findings).toEqual([])
  })

  test('reports missing navigation coverage, empty fields, and weak status labels', () => {
    const findings = auditRouteMenuDocumentation({
      markdown: `
        | พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | Disabled/Guard | Empty state |
        | --- | --- | --- | --- | --- | --- |
        | Home | / | open | renders | none | helpful |
      `,
      appContent: `
        const routePreloads = {
          '/': () => import('./Home'),
        }
        const navItems = [{ to: '/' }, { to: '/ghost' }]
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      `,
      rows: [row({ control: '' })],
      minRows: 1,
      requiredSnippets: [],
      statusLabel: (status) => status,
    })

    expect(findings).toEqual(
      expect.arrayContaining([
        'navigation path /ghost ไม่มี Route ที่ตรงกันใน App.tsx',
        'navigation path /ghost ยังไม่มีใน routeMenuAuditRows',
        'navigation path /ghost ยังไม่มีใน routePreloads',
        'routeMenuAuditRows "Home" มี control ว่าง',
        'routeMenuAuditStatusLabel("ready") ยังไม่มี label ที่ผู้ใช้อ่านรู้เรื่อง',
      ]),
    )
  })

  test('reports stale mixed-language copy in route menu documentation', () => {
    const findings = auditRouteMenuDocumentation({
      markdown: `
        | พื้นที่ | Route | ปุ่ม/เมนู | ผลลัพธ์จริง | เงื่อนไขปิดปุ่ม/Guard | สถานะว่าง |
        | --- | --- | --- | --- | --- | --- |
        | Home | / | รัน eval | ตรวจ prompt-control และ token budget | ปุ่ม disabled เมื่อยังไม่พร้อม | helpful |
      `,
      appContent: `
        const routePreloads = { '/': () => import('./Home') }
        const navItems = [{ to: '/' }]
        <Routes><Route path="/" element={<Home />} /></Routes>
      `,
      rows: [row()],
      minRows: 1,
      requiredSnippets: [],
      statusLabel: okStatusLabel,
    })

    expect(findings).toEqual(
      expect.arrayContaining([
        'ROUTE_MENU_AUDIT.md ยังมีข้อความปนภาษาที่ล้าสมัย "รัน eval"',
        'ROUTE_MENU_AUDIT.md ยังมีข้อความปนภาษาที่ล้าสมัย "prompt-control"',
        'ROUTE_MENU_AUDIT.md ยังมีข้อความปนภาษาที่ล้าสมัย "token budget"',
        'ROUTE_MENU_AUDIT.md ยังมีข้อความปนภาษาที่ล้าสมัย " disabled "',
      ]),
    )
  })

  test('runs the committed route/menu doc check through an importable runner', async () => {
    const result = await collectRouteMenuDocCheckResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runRouteMenuDocCheck((line) => lines.push(line), (line) => errors.push(line))

    expect(result.auditedSurfaces).toBeGreaterThan(0)
    expect(result.findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ok - route/menu document check ผ่านแล้ว')
    expect(errors).toEqual([])
  })
})
