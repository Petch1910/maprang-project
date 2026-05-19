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
        message: `${context} points to ${path}, but App.tsx has no matching Route`,
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
        if (value) checkPath(value, attribute, `${name} attribute`)
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'navigate' &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      checkPath(node.arguments[0].text, node.arguments[0], 'navigate call')
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return findings
}

export async function runFrontendRouteAudit() {
  const appContent = await readFile(appFile, 'utf8')
  const declaredRoutes = collectRoutesFromApp(appContent)
  if (declaredRoutes.length === 0) {
    console.error('Frontend route audit failed: no <Route path="..."> entries found in App.tsx')
    process.exit(1)
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

  if (findings.length > 0) {
    console.error('Frontend route audit failed:')
    for (const finding of findings) console.error(`- ${finding.file}:${finding.line} ${finding.message}`)
    process.exit(1)
  }

  console.log(`ok - frontend route audit passed (${declaredRoutes.length} declared routes)`)
}

if (import.meta.main) await runFrontendRouteAudit()
