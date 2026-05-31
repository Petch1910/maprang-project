import { access, readFile, readdir } from 'node:fs/promises'
import { basename, join } from 'node:path'
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

const rawFrontendResponseJsonPattern = /\b[A-Za-z_$][\w$]*(?:\s*\.\s*clone\s*\(\s*\))?\s*\.\s*json\s*\(\s*\)/g
const rawFrontendResponseTextPattern = /\b[A-Za-z_$][\w$]*(?:\s*\.\s*clone\s*\(\s*\))?\s*\.\s*text\s*\(\s*\)/g
const rawFrontendFetchPattern = /\b(?:fetch|window\s*\.\s*fetch|globalThis\s*\.\s*fetch)\s*\(/g
const rawUiErrorThrowPattern = /\bthrow\s*(?:\(\s*)?error\b/g
const rawFrontendResponseJsonMessage =
  'ห้าม parse response.json() ตรงใน frontend source; ให้ใช้ readApiJson/readErrorPayload เพื่อห่อ JSON พังเป็นข้อความไทยก่อน.'
const rawFrontendResponseTextMessage =
  'ห้ามอ่าน response.text() ตรงใน frontend source; ให้ backend/API helper แปลงเป็น ApiError ข้อความไทยที่ควบคุมได้ก่อนถึง UI.'
const rawFrontendFetchMessage =
  'ห้ามเรียก fetch ตรงนอก apps/frontend/src/lib/api.ts; ให้ผ่าน API helper กลางเพื่อคุม auth, error, stream และ diagnostics ให้สม่ำเสมอ.'
const rawUiErrorThrowMessage =
  'หน้า UI ห้าม throw raw error object จาก component/page; ให้คืนผลลัพธ์ที่ควบคุมได้หรือแปลงเป็นข้อความผู้ใช้ก่อน.'
const allowedFrontendResponseJsonReaders = ['readApiJson', 'readErrorPayload']
const allowedFrontendFetchFiles = new Set(['apps/frontend/src/lib/api.ts'])
const frontendUiSurfacePattern = /^apps\/frontend\/src\/(?:components|pages)\//
const allowedUnmountedFrontendComponents = new Map([
  [
    'apps/frontend/src/components/AuthPanel.tsx',
    'AuthPanel ถูกเก็บไว้เป็น safety surface สำหรับ auth-error ระหว่างที่ UI บัญชีหลักถูกรวมไว้หน้าอื่น',
  ],
])
const allowedUnmountedFrontendPages = new Map<string, string>()
const unmountedComponentMessage =
  'component หน้าบ้านไม่ได้ถูก import หรือ mount จาก source อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล'
const unmountedPageMessage =
  'page หน้าบ้านไม่ได้ถูก import หรือ mount จาก App/page อื่น ถ้าตั้งใจเก็บไว้ต้องเพิ่ม allowlist พร้อมเหตุผล'
const unmountedAllowlistMissingMessage =
  'allowlist ของ frontend static audit ชี้ไฟล์ที่ไม่มีอยู่จริงหรือไม่ตรงชนิดที่ตรวจ'
const unmountedAllowlistReasonMessage =
  'allowlist ของ frontend static audit ต้องมีเหตุผลชัดเจน'

function frontendRelativePath(file: string) {
  const normalizedRoot = root.replaceAll('\\', '/')
  const normalizedFile = file.replaceAll('\\', '/')
  if (normalizedFile.startsWith(`${normalizedRoot}/`)) return normalizedFile.slice(normalizedRoot.length + 1)
  return normalizedFile
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function findMatchingBrace(content: string, openingBraceIndex: number) {
  let depth = 0
  for (let index = openingBraceIndex; index < content.length; index += 1) {
    const char = content[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return content.length
}

function isInsideAllowedFrontendResponseJsonReader(content: string, index: number) {
  for (const functionName of allowedFrontendResponseJsonReaders) {
    const functionPattern = new RegExp(`(?:export\\s+)?async\\s+function\\s+${functionName}(?:<[^>]+>)?\\s*\\(`, 'g')
    for (const match of content.matchAll(functionPattern)) {
      const openingBraceIndex = content.indexOf('{', match.index ?? 0)
      if (openingBraceIndex < 0 || openingBraceIndex > index) continue
      const closingBraceIndex = findMatchingBrace(content, openingBraceIndex)
      if (index > openingBraceIndex && index < closingBraceIndex) return true
    }
  }

  return false
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

function jsxAttributeExpression(attribute: ts.JsxAttribute) {
  const initializer = attribute.initializer
  if (!initializer || !ts.isJsxExpression(initializer)) return null
  return initializer.expression ?? null
}

function jsxAttributeIsFalse(attribute: ts.JsxAttribute) {
  const expression = jsxAttributeExpression(attribute)
  const value = jsxAttributeValue(attribute).toLowerCase()
  return expression?.kind === ts.SyntaxKind.FalseKeyword || value === 'false'
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
            message: `ปุ่มไม่มี type ชัดเจน: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
          })
        }
        if (typeAttrs.length > 1) {
          findings.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            message: `ปุ่มมี type ซ้ำ: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
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
              message: `ปุ่มไอคอนล้วนไม่มี aria-label หรือ title: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
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

export function auditDisabledControlsWithAst(content: string, file: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings: Finding[] = []
  const disabledControlTags = new Set(['button', 'input', 'textarea', 'select'])
  const ariaDisabledControlTags = new Set(['button', 'a', 'Link', 'NavLink', 'input', 'textarea', 'select', 'label'])

  function hasDisabledReason(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement) {
    const title = getJsxAttribute(node, sourceFile, 'title')
    const ariaLabel = getJsxAttribute(node, sourceFile, 'aria-label')
    return Boolean((title && jsxAttributeValue(title)) || (ariaLabel && jsxAttributeValue(ariaLabel)))
  }

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      const disabled = getJsxAttribute(node, sourceFile, 'disabled')
      const isNativeDisabledControl = disabledControlTags.has(tagName) && disabled && !jsxAttributeIsFalse(disabled)
      if (isNativeDisabledControl) {
        if (!hasDisabledReason(node)) {
          findings.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            message: `control ที่ disabled ต้องมี title หรือ aria-label บอกเหตุผล: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
          })
        }
      }

      const ariaDisabled = getJsxAttribute(node, sourceFile, 'aria-disabled')
      const isAriaDisabledControl =
        ariaDisabledControlTags.has(tagName) && ariaDisabled && !jsxAttributeIsFalse(ariaDisabled)
      if (isAriaDisabledControl && !isNativeDisabledControl && !hasDisabledReason(node)) {
        findings.push({
          file,
          line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
          message: `control ที่ aria-disabled ต้องมี title หรือ aria-label บอกเหตุผล: ${compact(node.getText(sourceFile)).slice(0, 140)}`,
        })
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return findings
}

export function auditLinksWithAst(content: string, file: string) {
  const sourceFile = ts.createSourceFile(file, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings: Finding[] = []
  const linkLikeTags = new Set(['a', 'Link', 'NavLink'])

  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(sourceFile)
      if (linkLikeTags.has(tagName)) {
        const target = getJsxAttribute(node, sourceFile, 'target')
        const rel = getJsxAttribute(node, sourceFile, 'rel')
        const targetValue = target ? jsxAttributeValue(target) : ''
        const relTokens = rel ? jsxAttributeValue(rel).toLowerCase().split(/\s+/).filter(Boolean) : []

        if (targetValue === '_blank' && (!relTokens.includes('noopener') || !relTokens.includes('noreferrer'))) {
          findings.push({
            file,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1,
            message: `ลิงก์ target="_blank" ต้องมี rel="noopener noreferrer": ${compact(node.getText(sourceFile)).slice(0, 140)}`,
          })
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
  { pattern: /href\s*=\s*(["'])#\1/g, message: 'ลิงก์ใช้ href="#" เป็นค่าตัวอย่างที่กดแล้วตัน' },
  { pattern: /href\s*=\s*\{\s*(["'`])#\1\s*\}/g, message: 'ลิงก์ใช้ href={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน' },
  { pattern: /to\s*=\s*(["'])#\1/g, message: 'ลิงก์ Router ใช้ to="#" เป็นค่าตัวอย่างที่กดแล้วตัน' },
  { pattern: /to\s*=\s*\{\s*(["'`])#\1\s*\}/g, message: 'ลิงก์ Router ใช้ to={"#"} เป็นค่าตัวอย่างที่กดแล้วตัน' },
  { pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, message: 'ปุ่มหรือลิงก์มี onClick ว่างเปล่า' },
  { pattern: /onClick\s*=\s*\{\s*async\s*\(\)\s*=>\s*\{\s*\}\s*\}/g, message: 'ปุ่มหรือลิงก์มี onClick async ว่างเปล่า' },
  { pattern: /onClick\s*=\s*\{\s*\(\)\s*=>\s*undefined\s*\}/g, message: 'ปุ่มหรือลิงก์มี onClick คืน undefined' },
  { pattern: /throw\s+new\s+Error\s*\(\s*(["'`])not implemented\1\s*\)/gi, message: 'frontend source ยังโยน not implemented' },
  { pattern: /\bcoming soon\b/gi, message: 'พบข้อความ coming soon แบบข้อความรอทำ' },
  {
    pattern: /dangerouslySetInnerHTML\s*=/g,
    message: 'ห้ามใช้ dangerouslySetInnerHTML ใน frontend source ก่อนมี sanitizer และ review ชัดเจน',
  },
  {
    pattern: /\.\s*innerHTML\s*=/g,
    message: 'ห้ามเขียน innerHTML โดยตรงใน frontend source',
  },
  {
    pattern: /\bsrcDoc\s*=|\bsrcdoc\s*=/g,
    message: 'ห้ามฝัง HTML ผ่าน iframe srcDoc/srcdoc ใน frontend source ก่อนมี sanitizer และ sandbox policy ชัดเจน',
  },
  {
    pattern: /\bdocument\s*\.\s*cookie\b/g,
    message: 'ห้ามอ่านหรือเขียน document.cookie ตรงใน frontend source; ให้ใช้ auth/storage helper ที่ควบคุมได้',
  },
  {
    pattern: /\b(?:(?:window|globalThis)\s*\.\s*)?location\s*\.\s*(?:href|assign|replace)\s*(?:=|\()/g,
    message: 'ห้าม redirect ด้วย location.href/assign/replace ตรงใน frontend source; ให้ใช้ router หรือลิงก์ที่ตรวจสอบได้',
  },
  {
    pattern: /\beval\s*\(/g,
    message: 'ห้ามใช้ eval() ใน frontend source',
  },
  {
    pattern: /\bnew\s+Function\s*\(/g,
    message: 'ห้ามใช้ new Function() ใน frontend source',
  },
  {
    pattern: /\b(?:window|globalThis)\s*\.\s*open\s*\(/g,
    message: 'ห้ามใช้ window.open() ใน frontend source; ใช้ลิงก์พร้อม rel="noopener noreferrer" แทน',
  },
  {
    pattern: /\b(?:href|to)\s*=\s*(["'])\s*(?:javascript:|vbscript:|data:text\/html)[^"']*\1/gi,
    message: 'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
  },
  {
    pattern: /\b(?:href|to)\s*=\s*\{\s*(["'`])\s*(?:javascript:|vbscript:|data:text\/html)[\s\S]*?\1\s*\}/gi,
    message: 'ห้ามใช้ลิงก์ protocol ที่รันโค้ดหรือ HTML ตรงใน frontend source',
  },
  {
    pattern: /console\.(?:error|warn)\s*\([\s\S]*?,\s*error\b[\s\S]*?\)/g,
    message: 'frontend source ห้าม log raw error object; ใช้ logUnexpectedError หรือ summary ที่ปลอดภัย',
  },
  {
    pattern: /\berror\s*\.\s*message\s*\.\s*toLowerCase\s*\(\s*\)|\bString\s*\(\s*error\s*\)\s*\.\s*toLowerCase\s*\(\s*\)/g,
    message: 'frontend source ห้าม lower-case raw error message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
  },
  {
    pattern: /\/[^/\n]+\/[gimsuyd]*\.test\(\s*error\s*\.\s*message\s*\)|error\s*\.\s*message\s*\.\s*match\s*\(/g,
    message: 'frontend source ห้ามใช้ regex กับ raw error.message เพื่อ classify โดยตรง; ให้ผ่าน helper ที่ sanitize หรือแปลงเป็นข้อความที่ควบคุมได้ก่อน',
  },
  {
    pattern: /setNote\s*\(\s*error\s+instanceof\s+Error\s*\?\s*error\s*\.\s*message/g,
    message: 'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
  },
  {
    pattern: /state\s*\.\s*error\s*=\s*action\s*\.\s*error\s*\.\s*message/g,
    message: 'พบข้อความ error ดิบจาก Redux async ที่อาจแสดงให้ผู้ใช้เห็น',
  },
  {
    pattern:
      /const\s+message\s*=\s*[\r\n\s]*payload\s*&&\s*typeof\s+payload\s*===\s*['"]object['"]\s*&&\s*['"]error['"]\s+in\s+payload/g,
    message: 'ApiError ต้องใช้ payload.message ก่อน payload.error',
  },
  {
    pattern: /const\s+payloadError\s*=\s*[\s\S]{0,240}?payload\.error/g,
    message: 'ApiError ห้ามแสดง payload.error เป็น fallback ให้ผู้ใช้',
  },
  {
    pattern:
      /\b(?:Admin Health|Prompt Inspector|Automated Evals|Prompt diff|Route\/Menu Audit|Production blocker summary|Deploy checklist|Frontend backend URL|Frontend env warnings|Chat live smoke|Chat reply budget|Image provider configured|Image live smoke|Supabase Auth|Signed avatar storage|Production CORS|Cancel chat selection|Select chat|Explore \/ Home|Character Lobby|Relationship Contract|Chat Room|Chat Sidebar|Creator Studio|My Chats|Events Inbox|Profile \/ Persona|Staging Gate|Knowledge pack|Local readiness|Production gates|QA gate|runtime knowledge packs ready|needs check|staging\/future gate|Could not load chats|Could not load characters|failed with status|Teen romance|Mature 18|Restricted 18|prompt-control|prompt\/context|token budget|relationship state|scene state|Deterministic prompt\/context|image provider)\b/g,
    message: 'พบ label ภาษาอังกฤษใน UI ที่ควรเป็น Thai-first',
  },
  {
    pattern: /(?:production\s+ควรตั้งค่า|Lobby\s+ดูน่ากด|แกน\s+prompt|backend\s+ช่วยร่าง|roleplay,\s*thai|AI\s+roleplay\s+ภาษาไทย|roleplay\s+ภาษาไทย)/g,
    message: 'พบข้อความ Creator Studio ปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern:
      /(?:backend\s+ยังไม่พร้อมเต็ม|ติดต่อ\s+backend\s+health|health\s+response\s+จาก\s+backend|backend\s+env|hosting\s+secret\s+manager|backend\s+host\s+secrets|waiting\s+for\s+backend\s+health\s+response|ยืนยัน\s+provider\s+จริง|final\s+gate|mobile\s+overflow|backend\/frontend\s+domain|warning\s+ฝั่ง\s+frontend|usage\.providerFailure|รหัส\s+providerFailure|ถ้าได้\s+providerFailure|billing\/quota\s+limit|local\/dev\s+ยังไม่บังคับ|production\/staging|staging\/production|staging\s*\/\s*production|ยืนยัน\s+live\s+chat|ทดสอบ\s+live\s+chat|ยังทดสอบ\s+live\s+chat|ยืนยัน\s+live\s+image|ทดสอบ\s+live\s+image|browser\s+smoke|blocker\s+production|production\s+smoke|production\s+gate|ก่อน\s+production|build\s+production)/g,
    message: 'พบข้อความ Admin Health ปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern:
      /(?:System\s+prompt|รีเซ็ต\s+prompt|redacted\s+prompt|Redacted\s+final\s+prompt|Runtime\s+note|Persona\s+override|โน้ต\s+runtime|persona\s+ชั่วคราว|prompt\s+snapshot|diff\s+ที่\s+redact|เช็ค\s+backend|admin\s+API|snapshot\s+พรอมป์|diff\s+พรอมป์|(?<!\/)frontend\s+domain)/g,
    message: 'พบข้อความ prompt/admin tooling ปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern:
      /(?:Lorebook|Lore\s+ที่ใช้|Lore\s+ที่ดึงมาใช้|lore\s+ที่ดึงมาใช้|ไม่มี\s+lore|กำลังโหลด\s+lore|เพิ่ม\s+lore|แก้\s+lore|บันทึก\s+lore|อัปเดต\s+lore|รายละเอียด\s+lore|Persona\s+ชั่วคราว|แนบ\s+persona|persona\s+ที่บันทึกไว้|visual\s+cue|persona\s+expression|placeholder=(["'])(?:keyword|aliases|priority)\b)/g,
    message: 'พบข้อความคลังความรู้หรือตัวตนผู้เล่นปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern: /(?:ระบบ relationship|anchor ตัวละคร|ยังไม่ได้รัน eval|รัน eval|hook:|ยัง fallback|fallback เป็นภาพ|เหตุผล disabled)/g,
    message: 'พบข้อความ UI ปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern:
      /(?:backend\s+จำกัดตามบัญชี|เช็กการเชื่อมต่อ\s+backend|backend\s+จะจำกัดซ้ำตามบัญชี|prompt\s+ไม่ชัด)/g,
    message: 'พบข้อความ profile/tag helper ปนอังกฤษที่ควรเป็น Thai-first',
  },
  {
    pattern: /ยังไม่ใช่ปุ่มในแอปเครื่องนี้/g,
    message: 'พบข้อความ staging checklist ที่กำกวมเหมือนปุ่มปลอม',
  },
  { pattern: /\u0e40\u0e23\u0e47\u0e27\s*\u0e46\s*\u0e19\u0e35\u0e49/g, message: 'พบข้อความไทยแนวเร็วๆนี้ที่เป็นข้อความรอทำ' },
  { pattern: /\uFFFD/g, message: 'พบ replacement character อาจเป็น encoding เสีย' },
  { pattern: /[\u0080-\u009F]/g, message: 'พบ C1 control character อาจเป็น mojibake' },
  {
    pattern: /(?:\u0e40\u0e18[\u2022\u0084\u0081\u0099\u0088]|\u0e40\u0e19[\u20ac\u0089\u0088]|\u0e42\u0e40\u0e18)/g,
    message: 'พบลำดับตัวอักษรไทยที่มักเป็น UTF-8 mojibake',
  },
  { pattern: /(?:\u0e23\u0083|\u0e23\u0082|\u0e23\u00a0\u0e22\u0e18|\u0e23\u00a0\u0e22\u0e19)/g, message: 'พบลำดับตัวอักษรที่มักเป็น UTF-8 mojibake' },
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
          message: 'พบไฟล์ starter template ของ Vite ที่ไม่ควรอยู่ใน production UI',
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

export function auditRawResponseJsonParsing(content: string, file: string) {
  const findings: Finding[] = []
  for (const match of content.matchAll(rawFrontendResponseJsonPattern)) {
    if (isInsideAllowedFrontendResponseJsonReader(content, match.index ?? 0)) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawFrontendResponseJsonMessage,
    })
  }
  return findings
}

export function auditRawResponseTextParsing(content: string, file: string) {
  const findings: Finding[] = []
  for (const match of content.matchAll(rawFrontendResponseTextPattern)) {
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawFrontendResponseTextMessage,
    })
  }
  return findings
}

export function auditRawFrontendFetchUsage(content: string, file: string) {
  if (allowedFrontendFetchFiles.has(file)) return []
  const findings: Finding[] = []
  for (const match of content.matchAll(rawFrontendFetchPattern)) {
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawFrontendFetchMessage,
    })
  }
  return findings
}

export function auditRawUiErrorThrows(content: string, file: string) {
  if (!frontendUiSurfacePattern.test(file)) return []
  const findings: Finding[] = []
  for (const match of content.matchAll(rawUiErrorThrowPattern)) {
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: rawUiErrorThrowMessage,
    })
  }
  return findings
}

export function auditFrontendSourceFile(content: string, file: string) {
  return [
    ...auditButtonsWithAst(content, file),
    ...auditDisabledControlsWithAst(content, file),
    ...auditLinksWithAst(content, file),
    ...auditSuspiciousPatterns(content, file),
    ...auditRawFrontendFetchUsage(content, file),
    ...auditRawUiErrorThrows(content, file),
    ...auditRawResponseJsonParsing(content, file),
    ...auditRawResponseTextParsing(content, file),
  ]
}

export async function auditUnmountedFrontendComponents(
  sourceFiles?: string[],
  readText: (file: string) => Promise<string> = (file) => readFile(file, 'utf8'),
) {
  const resolvedSourceFiles = sourceFiles ?? (await collectSourceFiles(frontendSrc))
  const frontendFiles = await Promise.all(
    resolvedSourceFiles.map(async (file) => ({
      file,
      relativeFile: frontendRelativePath(file),
      content: await readText(file),
    })),
  )

  return auditReferencedFrontendModules(
    frontendFiles,
    /^apps\/frontend\/src\/components\/[^/]+\.tsx$/,
    allowedUnmountedFrontendComponents,
    unmountedComponentMessage,
  )
}

export async function auditUnmountedFrontendPages(
  sourceFiles?: string[],
  readText: (file: string) => Promise<string> = (file) => readFile(file, 'utf8'),
) {
  const resolvedSourceFiles = sourceFiles ?? (await collectSourceFiles(frontendSrc))
  const frontendFiles = await Promise.all(
    resolvedSourceFiles.map(async (file) => ({
      file,
      relativeFile: frontendRelativePath(file),
      content: await readText(file),
    })),
  )

  return auditReferencedFrontendModules(
    frontendFiles,
    /^apps\/frontend\/src\/pages\/[^/]+\.tsx$/,
    allowedUnmountedFrontendPages,
    unmountedPageMessage,
  )
}

export function auditReferencedFrontendModules(
  frontendFiles: Array<{ file: string; relativeFile: string; content: string }>,
  targetPattern: RegExp,
  allowlist: Map<string, string>,
  message: string,
) {
  const findings: Finding[] = []
  const targetFiles = frontendFiles.filter((entry) => targetPattern.test(entry.relativeFile))
  const targetFileSet = new Set(targetFiles.map((entry) => entry.relativeFile))
  const validAllowlistEntries = new Set<string>()

  for (const [relativeFile, reason] of allowlist) {
    const hasMatchingTarget = targetPattern.test(relativeFile) && targetFileSet.has(relativeFile)
    const hasReason = compact(reason).length >= 12

    if (!hasMatchingTarget) {
      findings.push({
        file: relativeFile,
        line: 1,
        message: unmountedAllowlistMissingMessage,
      })
    }

    if (!hasReason) {
      findings.push({
        file: relativeFile,
        line: 1,
        message: unmountedAllowlistReasonMessage,
      })
    }

    if (hasMatchingTarget && hasReason) validAllowlistEntries.add(relativeFile)
  }

  for (const target of targetFiles) {
    if (validAllowlistEntries.has(target.relativeFile)) continue
    const moduleName = basename(target.relativeFile, '.tsx')
    const moduleUsage = new RegExp(`\\b${escapeRegExp(moduleName)}\\b`)
    const isMounted = frontendFiles.some(
      (entry) => entry.relativeFile !== target.relativeFile && moduleUsage.test(entry.content),
    )
    if (!isMounted) {
      findings.push({
        file: target.relativeFile,
        line: 1,
        message,
      })
    }
  }

  return findings
}

export async function collectFrontendStaticFindings() {
  const sourceFiles = await collectSourceFiles(frontendSrc)
  const findings: Finding[] = await auditStaleTemplateFiles()
  findings.push(...(await auditUnmountedFrontendComponents(sourceFiles)))
  findings.push(...(await auditUnmountedFrontendPages(sourceFiles)))

  for (const file of sourceFiles) {
    const content = await readFile(file, 'utf8')
    const relativeFile = frontendRelativePath(file)
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
    writeError('ตรวจ static หน้าบ้านไม่ผ่าน:')
    for (const finding of findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine('ผ่าน - ตรวจ static หน้าบ้านผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runFrontendStaticAudit())
