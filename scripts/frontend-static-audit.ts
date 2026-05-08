import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = join(import.meta.dir, '..')
const frontendSrc = join(root, 'apps/frontend/src')

type Finding = {
  file: string
  line: number
  message: string
}

async function collectSourceFiles(dir: string): Promise<string[]> {
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

function lineFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length
}

function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function jsxAttributeValue(attribute: ts.JsxAttribute) {
  const initializer = attribute.initializer
  if (!initializer) return ''
  if (ts.isStringLiteral(initializer)) return initializer.text.trim()
  if (ts.isJsxExpression(initializer) && initializer.expression) {
    if (ts.isStringLiteral(initializer.expression) || ts.isNoSubstitutionTemplateLiteral(initializer.expression)) {
      return initializer.expression.text.trim()
    }
    return 'dynamic'
  }
  return ''
}

function getJsxAttribute(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile, name: string) {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === name,
  )
}

function expressionMayRenderText(expression: ts.Expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) return expression.text.trim().length > 0
  if (ts.isNumericLiteral(expression)) return true
  if (ts.isIdentifier(expression) || ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) return true
  if (ts.isCallExpression(expression) || ts.isTemplateExpression(expression)) return true
  if (ts.isConditionalExpression(expression)) {
    return expressionMayRenderText(expression.whenTrue) || expressionMayRenderText(expression.whenFalse)
  }
  if (ts.isParenthesizedExpression(expression)) return expressionMayRenderText(expression.expression)
  return false
}

function jsxNodeMayRenderText(node: ts.Node): boolean {
  if (ts.isJsxText(node)) return node.getText().replace(/[{}]/g, '').trim().length > 0
  if (ts.isJsxExpression(node) && node.expression) return expressionMayRenderText(node.expression)
  if (ts.isJsxElement(node)) {
    if (node.openingElement.tagName.getText().toLowerCase() === 'svg') return false
    return node.children.some(jsxNodeMayRenderText)
  }
  if (ts.isJsxSelfClosingElement(node)) return false
  return false
}

function auditButtonsWithAst(content: string, file: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (tagName === 'button') {
        const typeAttrs = node.attributes.properties.filter(
          (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === 'type',
        )
        if (typeAttrs.length === 0) {
          findings.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            message: `button is missing an explicit type: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
          })
        }
        if (typeAttrs.length > 1) {
          findings.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            message: `button has duplicate type attributes: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
          })
        }

        if (ts.isJsxOpeningElement(node)) {
          const hasRenderedText = node.parent.children.some(jsxNodeMayRenderText)
          const ariaLabel = getJsxAttribute(node, sourceFile, 'aria-label')
          const title = getJsxAttribute(node, sourceFile, 'title')
          const hasAccessibleLabel = Boolean(
            (ariaLabel && jsxAttributeValue(ariaLabel)) || (title && jsxAttributeValue(title)),
          )
          if (!hasRenderedText && !hasAccessibleLabel) {
            findings.push({
              file,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
              message: `icon-only button is missing aria-label or title: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
            })
          }
        }
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
}

const sourceFiles = await collectSourceFiles(frontendSrc)
const findings: Finding[] = []

for (const file of sourceFiles) {
  const content = await readFile(file, 'utf8')
  const relativeFile = relative(root, file).replaceAll('\\', '/')

  auditButtonsWithAst(content, relativeFile)

  const suspiciousPatterns = [
    { pattern: /href=(["'])#\1/g, message: 'link uses href="#" placeholder' },
    { pattern: /to=(["'])#\1/g, message: 'router link uses to="#" placeholder' },
    { pattern: /to=\{\s*(["'])#\1\s*\}/g, message: 'router link uses to={"#"} placeholder' },
    { pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, message: 'button/link has an empty onClick handler' },
    { pattern: /throw new Error\((["'`])not implemented\1\)/gi, message: 'throws not implemented in frontend source' },
    { pattern: /\bcoming soon\b/gi, message: 'contains coming soon placeholder copy' },
    { pattern: /เร็วๆ นี้/g, message: 'contains Thai coming-soon placeholder copy' },
  ]

  for (const item of suspiciousPatterns) {
    for (const match of content.matchAll(item.pattern)) {
      findings.push({
        file: relativeFile,
        line: lineFor(content, match.index ?? 0),
        message: item.message,
      })
    }
  }
}

if (findings.length > 0) {
  console.error('Frontend static audit failed:')
  for (const finding of findings) console.error(`- ${finding.file}:${finding.line} ${finding.message}`)
  process.exit(1)
}

console.log('ok - frontend static audit passed')
