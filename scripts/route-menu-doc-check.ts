import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import ts from 'typescript'
import {
  routeMenuAuditRows,
  routeMenuAuditStatusLabel,
  type RouteMenuAuditRow,
  type RouteMenuAuditStatus,
} from '../apps/frontend/src/lib/routeMenuAudit.ts'

const root = join(import.meta.dir, '..')

export type MarkdownTableRow = {
  area: string
  route: string
  cells: string[]
}

export function stripMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function markdownCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(stripMarkdown)
}

export function collectAuditRows(markdown: string): MarkdownTableRow[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .filter((line) => !line.includes('---'))
    .map(markdownCells)
    .filter((cells) => cells.length >= 6 && cells[1] !== 'Route')
    .map((cells) => ({ area: cells[0], route: cells[1], cells }))
}

export function expectedRouteTokens(route: string) {
  if (route.toLowerCase().startsWith('external')) return ['external']
  return route
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

export function normalizeStaticPath(value: string) {
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  const clean = value.split(/[?#]/, 1)[0]
  return clean === '' ? '/' : clean.replace(/\/+$/, '') || '/'
}

export function routePatternToRegex(routePath: string) {
  if (routePath === '*') return /^\/.*$/
  const normalized = normalizeStaticPath(routePath) ?? routePath
  const segments = normalized.split('/').filter(Boolean)
  if (segments.length === 0) return /^\/$/

  const parts = segments.map((segment) => {
    if (segment.startsWith(':')) {
      return segment.endsWith('?') ? '(?:/[^/]+)?' : '/[^/]+'
    }
    return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
  })

  return new RegExp(`^${parts.join('')}/?$`)
}

export function isCoveredByRoute(path: string, routes: string[]) {
  return routes.some((route) => routePatternToRegex(route).test(path))
}

function jsxAttributeStringValue(attribute: ts.JsxAttribute, sourceFile: ts.SourceFile) {
  const initializer = attribute.initializer
  if (!initializer) return null
  if (ts.isStringLiteral(initializer)) return initializer.text
  if (ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteral(initializer.expression)) {
    return initializer.expression.text
  }
  return null
}

function propertyNameText(name: ts.PropertyName) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name)) return name.text
  return null
}

function expressionStringValue(expression: ts.Expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text
  return null
}

function objectLiteralStringProperty(expression: ts.Expression, propertyName: string) {
  if (!ts.isObjectLiteralExpression(expression)) return null
  const property = expression.properties.find(
    (item): item is ts.PropertyAssignment =>
      ts.isPropertyAssignment(item) && propertyNameText(item.name) === propertyName,
  )
  return property ? expressionStringValue(property.initializer) : null
}

function navigatePathValue(expression: ts.Expression) {
  return expressionStringValue(expression) ?? objectLiteralStringProperty(expression, 'pathname')
}

export function collectDeclaredRoutes(appContent: string) {
  const sourceFile = ts.createSourceFile('App.tsx', appContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const routes: string[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === 'Route') {
        const pathAttribute = node.attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'path',
        )
        const path = pathAttribute ? jsxAttributeStringValue(pathAttribute, sourceFile) : null
        if (path) routes.push(path)
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return routes
}

export function collectStaticNavigationPaths(appContent: string) {
  const sourceFile = ts.createSourceFile('App.tsx', appContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const paths = new Set<string>()

  function addPath(value: string | null) {
    const path = value ? normalizeStaticPath(value) : null
    if (path) paths.add(path)
  }

  function visit(node: ts.Node) {
    if (ts.isPropertyAssignment(node)) {
      const name = propertyNameText(node.name)
      if (name === 'to' || name === 'href') addPath(expressionStringValue(node.initializer))
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue
        const name = attribute.name.getText(sourceFile)
        if (name === 'to' || name === 'href') addPath(jsxAttributeStringValue(attribute, sourceFile))
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'navigate' &&
      node.arguments[0]
    ) {
      addPath(navigatePathValue(node.arguments[0]))
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...paths].sort()
}

export function collectRoutePreloadPaths(appContent: string) {
  const sourceFile = ts.createSourceFile('App.tsx', appContent, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const paths: string[] = []

  function unwrapObjectLiteral(expression: ts.Expression): ts.Expression {
    let current = expression
    while (
      ts.isParenthesizedExpression(current) ||
      ts.isAsExpression(current) ||
      ts.isTypeAssertionExpression(current) ||
      current.kind === ts.SyntaxKind.SatisfiesExpression
    ) {
      current = (current as { expression: ts.Expression }).expression
    }
    return current
  }

  function visit(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === 'routePreloads' && node.initializer) {
      const initializer = unwrapObjectLiteral(node.initializer)
      if (ts.isObjectLiteralExpression(initializer)) {
        for (const property of initializer.properties) {
          if (!ts.isPropertyAssignment(property)) continue
          const rawPath = propertyNameText(property.name)
          const path = rawPath ? normalizeStaticPath(rawPath) : null
          if (path) paths.push(path)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return [...new Set(paths)].sort()
}

export function findDocumentedRow(rows: MarkdownTableRow[], area: string) {
  const target = area.toLowerCase()
  return rows.find((row) => {
    const documented = row.area.toLowerCase()
    return documented === target || documented.includes(target) || target.includes(documented)
  })
}

export function uniqueKeys(values: string[]) {
  return new Set(values).size === values.length
}

const defaultRequiredSnippets = [
  'Route/Menu Audit',
  '/admin/health',
  'bun run route-menu:audit',
  'bun run e2e:smoke',
  'bun run qa:full',
  'frontend-route-audit.ts',
  'ยังโหลดรายการแชทไม่ได้',
  'รีเฟรชรายการ',
  'skeleton ในรางตัวละคร/เล่นต่อ',
  'ตัวตนผู้เล่นบันทึกอัตโนมัติและไม่ล็อกการพิมพ์',
  'กำลังโหลดกล่องอีเวนต์',
  'ถ้าไม่มีฉากจะแนะนำให้กลับไปคุยในห้องแชท',
  'กำลังโหลดรายการแชทในแถบข้าง',
  'เลือกแชทอย่างน้อย 1 รายการก่อนจัดการ',
  'ปุ่มรีเฟรชหัวหน้าและการ์ดสถานะระบบ',
  'ลิงก์ตรวจพรอมป์/ชุดทดสอบยังเปิดได้',
  'กำลังโหลดรายการแชท',
  'ไม่มีแชทให้เลือกในตัวกรองนี้',
  'กำลังจัดการแชทนี้',
]

const defaultForbiddenSnippets = [
  'รัน eval',
  'prompt-control',
  'token budget',
  'accordion',
  ' disabled ',
  'Automated route smoke',
  'desktop/mobile',
  'browser console',
  'page error',
  'horizontal overflow',
  'handler ว่าง',
  'ข้อความ placeholder',
  'text encoding',
  'mojibake',
]

export type RouteMenuAuditCheckOptions = {
  markdown: string
  appContent: string
  rows?: RouteMenuAuditRow[]
  minRows?: number
  requiredSnippets?: string[]
  forbiddenSnippets?: string[]
  statusLabel?: (status: RouteMenuAuditStatus) => string | undefined
}

export type RouteMenuDocCheckResult = {
  auditedSurfaces: number
  findings: string[]
}

export function auditRouteMenuDocumentation({
  markdown,
  appContent,
  rows = routeMenuAuditRows,
  minRows = 10,
  requiredSnippets = defaultRequiredSnippets,
  forbiddenSnippets = defaultForbiddenSnippets,
  statusLabel = routeMenuAuditStatusLabel,
}: RouteMenuAuditCheckOptions) {
  const documentedRows = collectAuditRows(markdown)
  const declaredRoutes = collectDeclaredRoutes(appContent)
  const navigationPaths = collectStaticNavigationPaths(appContent)
  const preloadPaths = collectRoutePreloadPaths(appContent)
  const findings: string[] = []

  if (rows.length < minRows) {
    findings.push(`routeMenuAuditRows มีจำนวนแถวน้อยเกินไป (${rows.length} แถว)`)
  }

  const auditKeys = rows.map((row) => `${row.area}::${row.route}`)
  if (!uniqueKeys(auditKeys)) {
    findings.push('routeMenuAuditRows มี area/route ซ้ำ')
  }

  if (declaredRoutes.length === 0) {
    findings.push('App.tsx ยังไม่มี <Route path="..."> ให้ตรวจ')
  }

  if (navigationPaths.length === 0) {
    findings.push('App.tsx ไม่มี static NavLink/nav item paths ให้ตรวจ')
  }

  const auditedRouteTokens = rows.flatMap((row) => expectedRouteTokens(row.route)).filter((token) => token.startsWith('/'))
  for (const path of navigationPaths) {
    if (!isCoveredByRoute(path, declaredRoutes)) {
      findings.push(`navigation path ${path} ไม่มี Route ที่ตรงกันใน App.tsx`)
    }
    if (!isCoveredByRoute(path, auditedRouteTokens)) {
      findings.push(`navigation path ${path} ยังไม่มีใน routeMenuAuditRows`)
    }
    if (!preloadPaths.includes(path)) {
      findings.push(`navigation path ${path} ยังไม่มีใน routePreloads`)
    }
  }

  for (const row of rows) {
    const documented = findDocumentedRow(documentedRows, row.area)
    if (!documented) {
      findings.push(`ROUTE_MENU_AUDIT.md ยังไม่มีพื้นที่ "${row.area}"`)
      continue
    }

    for (const token of expectedRouteTokens(row.route)) {
      if (!documented.route.includes(token)) {
        findings.push(`ROUTE_MENU_AUDIT.md แถว "${row.area}" ยังไม่มี route token "${token}"`)
      }
      if (token.startsWith('/') && !isCoveredByRoute(token, declaredRoutes)) {
        findings.push(`routeMenuAuditRows "${row.area}" อ้างถึง ${token} แต่ App.tsx ไม่มี Route ที่ตรงกัน`)
      }
    }

    for (const field of ['control', 'result', 'disabledReason', 'emptyState'] as const) {
      if (!row[field].trim()) {
        findings.push(`routeMenuAuditRows "${row.area}" มี ${field} ว่าง`)
      }
    }
  }

  const statusValues: RouteMenuAuditStatus[] = ['ready', 'guarded', 'needs-staging', 'future']
  for (const status of statusValues) {
    const label = statusLabel(status)
    if (!label || label === status) {
      findings.push(`routeMenuAuditStatusLabel("${status}") ยังไม่มี label ที่ผู้ใช้อ่านรู้เรื่อง`)
    }
  }

  for (const snippet of requiredSnippets) {
    if (!markdown.includes(snippet)) {
      findings.push(`ROUTE_MENU_AUDIT.md ยังไม่มี "${snippet}"`)
    }
  }

  for (const snippet of forbiddenSnippets) {
    if (markdown.includes(snippet)) {
      findings.push(`ROUTE_MENU_AUDIT.md ยังมีข้อความปนภาษาที่ล้าสมัย "${snippet}"`)
    }
  }

  return findings
}

export async function collectRouteMenuDocCheckResult(): Promise<RouteMenuDocCheckResult> {
  const markdown = await readFile(join(root, 'ROUTE_MENU_AUDIT.md'), 'utf8')
  const appContent = await readFile(join(root, 'apps/frontend/src/App.tsx'), 'utf8')
  const findings = auditRouteMenuDocumentation({ markdown, appContent })

  return {
    auditedSurfaces: routeMenuAuditRows.length,
    findings,
  }
}

export async function runRouteMenuDocCheck(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectRouteMenuDocCheckResult()

  if (result.findings.length > 0) {
    writeError('ตรวจเอกสาร route/menu ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - ตรวจเอกสาร route/menu ผ่านแล้ว (${result.auditedSurfaces} พื้นที่)`)
  return 0
}

if (import.meta.main) process.exit(await runRouteMenuDocCheck())
