import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import {
  routeMenuAuditRows,
  routeMenuAuditStatusLabel,
  type RouteMenuAuditStatus,
} from '../apps/frontend/src/lib/routeMenuAudit.ts'

const root = join(import.meta.dir, '..')

type MarkdownTableRow = {
  area: string
  route: string
  cells: string[]
}

function stripMarkdown(value: string) {
  return value
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

function markdownCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(stripMarkdown)
}

function collectAuditRows(markdown: string): MarkdownTableRow[] {
  return markdown
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .filter((line) => !line.includes('---'))
    .map(markdownCells)
    .filter((cells) => cells.length >= 6 && cells[1] !== 'Route')
    .map((cells) => ({ area: cells[0], route: cells[1], cells }))
}

function expectedRouteTokens(route: string) {
  if (route.toLowerCase().startsWith('external')) return ['external']
  return route
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function normalizeStaticPath(value: string) {
  if (!value.startsWith('/')) return null
  if (value.startsWith('//')) return null
  const clean = value.split(/[?#]/, 1)[0]
  return clean === '' ? '/' : clean.replace(/\/+$/, '') || '/'
}

function routePatternToRegex(routePath: string) {
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

function isCoveredByRoute(path: string, routes: string[]) {
  return routes.some((route) => routePatternToRegex(route).test(path))
}

function collectDeclaredRoutes(appContent: string) {
  return appContent
    .split(/\r?\n/)
    .filter((line) => line.includes('<Route'))
    .map((line) => line.match(/\bpath=(["'])(.*?)\1/)?.[2])
    .filter((route): route is string => Boolean(route))
}

function collectStaticNavigationPaths(appContent: string) {
  const paths = new Set<string>()

  for (const match of appContent.matchAll(/\bto:\s*(["'])(\/[^"']*)\1/g)) {
    const path = normalizeStaticPath(match[2])
    if (path) paths.add(path)
  }

  for (const match of appContent.matchAll(/\bto=(["'])(\/[^"']*)\1/g)) {
    const path = normalizeStaticPath(match[2])
    if (path) paths.add(path)
  }

  return [...paths].sort()
}

function collectRoutePreloadPaths(appContent: string) {
  const block = appContent.match(/const routePreloads[\s\S]*?\n}\n/)?.[0] ?? ''
  return [...block.matchAll(/(["'])(\/[^"']*)\1\s*:/g)]
    .map((match) => normalizeStaticPath(match[2]))
    .filter((path): path is string => Boolean(path))
    .sort()
}

function findDocumentedRow(rows: MarkdownTableRow[], area: string) {
  const target = area.toLowerCase()
  return rows.find((row) => {
    const documented = row.area.toLowerCase()
    return documented === target || documented.includes(target) || target.includes(documented)
  })
}

function uniqueKeys(values: string[]) {
  return new Set(values).size === values.length
}

const markdown = await readFile(join(root, 'ROUTE_MENU_AUDIT.md'), 'utf8')
const appContent = await readFile(join(root, 'apps/frontend/src/App.tsx'), 'utf8')
const documentedRows = collectAuditRows(markdown)
const declaredRoutes = collectDeclaredRoutes(appContent)
const navigationPaths = collectStaticNavigationPaths(appContent)
const preloadPaths = collectRoutePreloadPaths(appContent)
const findings: string[] = []

if (routeMenuAuditRows.length < 10) {
  findings.push(`routeMenuAuditRows looks too small (${routeMenuAuditRows.length} rows)`)
}

const auditKeys = routeMenuAuditRows.map((row) => `${row.area}::${row.route}`)
if (!uniqueKeys(auditKeys)) {
  findings.push('routeMenuAuditRows contains duplicate area/route entries')
}

if (declaredRoutes.length === 0) {
  findings.push('App.tsx has no declared <Route path="..."> entries')
}

if (navigationPaths.length === 0) {
  findings.push('App.tsx has no static NavLink/nav item paths to audit')
}

const auditedRouteTokens = routeMenuAuditRows.flatMap((row) => expectedRouteTokens(row.route)).filter((token) => token.startsWith('/'))
for (const path of navigationPaths) {
  if (!isCoveredByRoute(path, declaredRoutes)) {
    findings.push(`navigation path ${path} has no matching App.tsx Route`)
  }
  if (!isCoveredByRoute(path, auditedRouteTokens)) {
    findings.push(`navigation path ${path} is missing from routeMenuAuditRows`)
  }
  if (!preloadPaths.includes(path)) {
    findings.push(`navigation path ${path} is missing from routePreloads`)
  }
}

for (const row of routeMenuAuditRows) {
  const documented = findDocumentedRow(documentedRows, row.area)
  if (!documented) {
    findings.push(`ROUTE_MENU_AUDIT.md is missing area "${row.area}"`)
    continue
  }

  for (const token of expectedRouteTokens(row.route)) {
    if (!documented.route.includes(token)) {
      findings.push(`ROUTE_MENU_AUDIT.md row "${row.area}" is missing route token "${token}"`)
    }
    if (token.startsWith('/') && !isCoveredByRoute(token, declaredRoutes)) {
      findings.push(`routeMenuAuditRows "${row.area}" references ${token}, but App.tsx has no matching Route`)
    }
  }

  for (const field of ['control', 'result', 'disabledReason', 'emptyState'] as const) {
    if (!row[field].trim()) {
      findings.push(`routeMenuAuditRows "${row.area}" has an empty ${field}`)
    }
  }
}

const statusValues: RouteMenuAuditStatus[] = ['ready', 'guarded', 'needs-staging', 'future']
for (const status of statusValues) {
  const label = routeMenuAuditStatusLabel(status)
  if (!label || label === status) {
    findings.push(`routeMenuAuditStatusLabel("${status}") is missing a user-facing label`)
  }
}

const requiredSnippets = [
  'Route/Menu Audit',
  '/admin/health',
  'bun run route-menu:audit',
  'bun run e2e:smoke',
  'bun run qa:full',
  'frontend-route-audit.ts',
]

for (const snippet of requiredSnippets) {
  if (!markdown.includes(snippet)) {
    findings.push(`ROUTE_MENU_AUDIT.md is missing "${snippet}"`)
  }
}

if (findings.length > 0) {
  console.error('Route/menu document check failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`ok - route/menu document check passed (${routeMenuAuditRows.length} audited surfaces)`)
