import { access, readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'
import ts from 'typescript'

const root = join(import.meta.dir, '..')
const frontendSrc = join(root, 'apps/frontend/src')

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

export function lineFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length
}

export function compact(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

export function jsxAttributeValue(attribute: ts.JsxAttribute) {
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

export function getJsxAttribute(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, sourceFile: ts.SourceFile, name: string) {
  return node.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(sourceFile) === name,
  )
}

export function expressionMayRenderText(expression: ts.Expression) {
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

export function jsxNodeMayRenderText(node: ts.Node): boolean {
  if (ts.isJsxText(node)) return node.getText().replace(/[{}]/g, '').trim().length > 0
  if (ts.isJsxExpression(node) && node.expression) return expressionMayRenderText(node.expression)
  if (ts.isJsxElement(node)) {
    if (node.openingElement.tagName.getText().toLowerCase() === 'svg') return false
    return node.children.some(jsxNodeMayRenderText)
  }
  if (ts.isJsxSelfClosingElement(node)) return false
  return false
}

export function auditButtonsWithAst(content: string, file: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings: Finding[] = []

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
  return findings
}

export const staleTemplateFiles = ['apps/frontend/src/App.css', 'apps/frontend/src/assets/react.svg', 'apps/frontend/src/assets/vite.svg']

export const suspiciousPatterns = [
  { pattern: /href=(["'])#\1/g, message: 'link uses href="#" placeholder' },
  { pattern: /to=(["'])#\1/g, message: 'router link uses to="#" placeholder' },
  { pattern: /to=\{\s*(["'])#\1\s*\}/g, message: 'router link uses to={"#"} placeholder' },
  { pattern: /onClick=\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, message: 'button/link has an empty onClick handler' },
  { pattern: /throw new Error\((["'`])not implemented\1\)/gi, message: 'throws not implemented in frontend source' },
  { pattern: /\bcoming soon\b/gi, message: 'contains coming soon placeholder copy' },
  {
    pattern: /setNote\(\s*error\s+instanceof\s+Error\s*\?\s*error\.message/g,
    message: 'surfaces raw auth/provider error message to users',
  },
  {
    pattern: /state\.error\s*=\s*action\.error\.message/g,
    message: 'surfaces raw Redux async error message to users',
  },
  {
    pattern:
      /const\s+message\s*=\s*[\r\n\s]*payload\s*&&\s*typeof\s+payload\s*===\s*['"]object['"]\s*&&\s*['"]error['"]\s+in\s+payload/g,
    message: 'ApiError should prefer payload.message before payload.error',
  },
  {
    pattern: /const\s+payloadError\s*=\s*[\s\S]{0,240}?payload\.error/g,
    message: 'ApiError should not surface payload.error as user-facing fallback',
  },
  {
    pattern:
      /\b(?:Admin Health|Prompt Inspector|Automated Evals|Prompt diff|Route\/Menu Audit|Production blocker summary|Deploy checklist|Frontend backend URL|Frontend env warnings|Chat live smoke|Chat reply budget|Image provider configured|Image live smoke|Supabase Auth|Signed avatar storage|Production CORS|Cancel chat selection|Select chat|Explore \/ Home|Character Lobby|Relationship Contract|Chat Room|Chat Sidebar|Creator Studio|My Chats|Events Inbox|Profile \/ Persona|Staging Gate|Knowledge pack|Local readiness|Production gates|QA gate|runtime knowledge packs ready|needs check|staging\/future gate|Could not load chats|Could not load characters|failed with status|Teen romance|Mature 18|Restricted 18|prompt-control|prompt\/context|token budget|relationship state|scene state|Deterministic prompt\/context|image provider)\b/g,
    message: 'contains English UI label that should be Thai-first',
  },
  {
    pattern: /(?:production\s+ควรตั้งค่า|Lobby\s+ดูน่ากด|แกน\s+prompt|backend\s+ช่วยร่าง)/g,
    message: 'contains mixed Creator Studio wording that should be Thai-first',
  },
  {
    pattern:
      /(?:backend\s+ยังไม่พร้อมเต็ม|ติดต่อ\s+backend\s+health|health\s+response\s+จาก\s+backend|backend\s+env|hosting\s+secret\s+manager|backend\s+host\s+secrets|waiting\s+for\s+backend\s+health\s+response|ยืนยัน\s+provider\s+จริง|final\s+gate|mobile\s+overflow|backend\/frontend\s+domain|warning\s+ฝั่ง\s+frontend)/g,
    message: 'contains mixed Admin Health wording that should be Thai-first',
  },
  {
    pattern:
      /(?:System\s+prompt|รีเซ็ต\s+prompt|redacted\s+prompt|Redacted\s+final\s+prompt|Runtime\s+note|Persona\s+override|โน้ต\s+runtime|persona\s+ชั่วคราว|prompt\s+snapshot|diff\s+ที่\s+redact|เช็ค\s+backend|admin\s+API|snapshot\s+พรอมป์|diff\s+พรอมป์|(?<!\/)frontend\s+domain)/g,
    message: 'contains mixed prompt/admin tooling wording that should be Thai-first',
  },
  {
    pattern: /(?:ระบบ relationship|anchor ตัวละคร|ยังไม่ได้รัน eval|รัน eval|hook:|ยัง fallback|fallback เป็นภาพ|เหตุผล disabled)/g,
    message: 'contains mixed English UI wording that should be Thai-first',
  },
  {
    pattern:
      /(?:backend\s+จำกัดตามบัญชี|เช็กการเชื่อมต่อ\s+backend|backend\s+จะจำกัดซ้ำตามบัญชี|prompt\s+ไม่ชัด)/g,
    message: 'contains mixed profile/tag helper wording that should be Thai-first',
  },
  { pattern: /\u0e40\u0e23\u0e47\u0e27\s*\u0e46\s*\u0e19\u0e35\u0e49/g, message: 'contains Thai coming-soon placeholder copy' },
  { pattern: /\uFFFD/g, message: 'contains replacement character, likely broken text encoding' },
  { pattern: /[\u0080-\u009F]/g, message: 'contains C1 control character, likely mojibake' },
  {
    pattern: /(?:\u0e40\u0e18[\u2022\u0084\u0081\u0099\u0088]|\u0e40\u0e19[\u20ac\u0089\u0088]|\u0e42\u0e40\u0e18)/g,
    message: 'contains common Thai UTF-8 mojibake sequence',
  },
  { pattern: /(?:\u0e23\u0083|\u0e23\u0082|\u0e23\u00a0\u0e22\u0e18|\u0e23\u00a0\u0e22\u0e19)/g, message: 'contains common UTF-8 mojibake sequence' },
]

export async function auditStaleTemplateFiles(paths = staleTemplateFiles) {
  const findings: Finding[] = []
  await Promise.all(
    paths.map(async (path) => {
      try {
        await access(join(root, path))
        findings.push({
          file: path,
          line: 1,
          message: 'stale Vite starter template file should not be kept in production UI',
        })
      } catch {
        // File is absent, which is what we want.
      }
    }),
  )
  return findings
}

export function auditSuspiciousPatterns(content: string, file: string) {
  const findings: Finding[] = []
  for (const item of suspiciousPatterns) {
    for (const match of content.matchAll(item.pattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: item.message,
      })
    }
  }
  return findings
}

export function auditFrontendSourceFile(content: string, file: string) {
  return [...auditButtonsWithAst(content, file), ...auditSuspiciousPatterns(content, file)]
}

export async function collectFrontendStaticFindings() {
  const sourceFiles = await collectSourceFiles(frontendSrc)
  const findings: Finding[] = await auditStaleTemplateFiles()

  for (const file of sourceFiles) {
    const content = await readFile(file, 'utf8')
    const relativeFile = relative(root, file).replaceAll('\\', '/')
    findings.push(...auditFrontendSourceFile(content, relativeFile))
  }

  return findings
}

export async function runFrontendStaticAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const findings = await collectFrontendStaticFindings()

  if (findings.length > 0) {
    writeError('Frontend static audit failed:')
    for (const finding of findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine('ok - frontend static audit passed')
  return 0
}

if (import.meta.main) process.exit(await runFrontendStaticAudit())
