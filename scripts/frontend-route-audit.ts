import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = join(import.meta.dir, '..')
const frontendSrc = join(root, 'apps/frontend/src')
const appFile = join(frontendSrc, 'App.tsx')

export type Finding = {
  file: string
  line: number
  message: string
}

export type FrontendRouteAuditResult = {
  ok: boolean
  declaredRoutes: string[]
  findings: Finding[]
  failure?: string
}

export async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(fullPath)
      if (/\.(tsx|ts)$/.test(entry.name)) return [fullPath]
      return []
    }),
  )
  return nested.flat()
}

export function sourcePosition(sourceFile: ts.SourceFile, node: ts.Node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1
}

export function attributeStringValue(attribute: ts.JsxAttribute, sourceFile: ts.SourceFile) {
  const initializer = attribute.initializer
  if (!initializer) return null
  if (ts.isStringLiteral(initializer)) return initializer.text
  if (ts.isJsxExpression(initializer) && initializer.expression && ts.isStringLiteral(initializer.expression)) {
    return initializer.expression.text
  }
  return null
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

export function collectRoutesFromApp(content: string) {
  const sourceFile = ts.createSourceFile(appFile, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const routes: string[] = []

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === 'Route') {
        const pathAttr = node.attributes.properties.find(
          (attribute): attribute is ts.JsxAttribute =>
            ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'path',
        )
        const value = pathAttr ? attributeStringValue(pathAttr, sourceFile) : null
        if (value) routes.push(value)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return routes
}

export function auditFile(content: string, file: string, declaredRoutes: string[]) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings: Finding[] = []

  function checkPath(rawPath: string, node: ts.Node, context: string) {
    const path = normalizeStaticPath(rawPath)
    if (!path) return
    if (!isCoveredByRoute(path, declaredRoutes)) {
      findings.push({
        file,
        line: sourcePosition(sourceFile, node),
        message: `${context} ชี้ไปที่ ${path} แต่ App.tsx ไม่มี Route ที่ตรงกัน`,
      })
    }
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute)) continue
        const name = attribute.name.getText(sourceFile)
        if (name !== 'to' && name !== 'href') continue
        const value = attributeStringValue(attribute, sourceFile)
        if (value) checkPath(value, attribute, `attribute ${name}`)
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'navigate' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      checkPath(node.arguments[0].text, node.arguments[0], 'คำสั่ง navigate')
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return findings
}

export async function collectFrontendRouteAuditResult(): Promise<FrontendRouteAuditResult> {
  const appContent = await readFile(appFile, 'utf8')
  const declaredRoutes = collectRoutesFromApp(appContent)
  if (declaredRoutes.length === 0) {
    return {
      ok: false,
      declaredRoutes,
      findings: [],
      failure: 'Frontend route audit ไม่ผ่าน: ไม่พบ <Route path="..."> ใน App.tsx',
    }
  }

  const sourceFiles = await collectSourceFiles(frontendSrc)
  const findings = (
    await Promise.all(
      sourceFiles.map(async (file) => {
        const content = await readFile(file, 'utf8')
        return auditFile(content, relative(root, file).replaceAll('\\', '/'), declaredRoutes)
      }),
    )
  ).flat()

  return {
    ok: findings.length === 0,
    declaredRoutes,
    findings,
  }
}

export async function runFrontendRouteAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectFrontendRouteAuditResult()

  if (!result.ok) {
    if (result.failure) {
      writeError(result.failure)
      return 1
    }

    writeError('Frontend route audit ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine(`ok - frontend route audit ผ่านแล้ว (${result.declaredRoutes.length} routes)`)
  return 0
}

if (import.meta.main) process.exit(await runFrontendRouteAudit())
