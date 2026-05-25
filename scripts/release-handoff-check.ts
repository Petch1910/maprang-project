import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { secretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const file = join(root, 'RELEASE_HANDOFF.md')

const requiredSections = [
  'แม่แบบส่งมอบ release',
  'ตัวตนของ release',
  'ลิงก์ที่ deploy แล้ว (Deployed URLs)',
  'ฐานข้อมูลและ migrations',
  'ระบบ auth/storage และ CORS (Auth, Storage และ CORS)',
  'การยืนยันผู้ให้บริการ AI',
  'เกต QA (QA gates)',
  'การตรวจฝั่งผู้ดูแล',
  'ข้อจำกัดที่ยังรู้ก่อนปล่อย',
  'การตัดสินใจปล่อย',
]

const forbiddenPatterns = [
  ...secretPatterns,
  { name: 'raw access token', pattern: /\b(access|refresh|service)[_-]?token\s*:\s*\S{16,}/i },
]

const forbiddenCopySnippets = ['ผู้ให้บริการ avatar storage', 'รูปแบบการเข้าถึง avatar storage']

const requiredQaGateSnippets = ['`bun run frontend:env:test`', '`bun run frontend:storage:test`', '`bun run frontend:clipboard:test`']

export type ReleaseHandoffCheckResult = {
  ok: boolean
  requireFilled: boolean
  findings: string[]
}

function fieldValue(content: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function looksLikeDeployedHttpsUrl(value: string) {
  const normalized = value.toLowerCase()
  return (
    normalized.startsWith('https://') &&
    !normalized.includes('localhost') &&
    !normalized.includes('127.0.0.1') &&
    !normalized.includes('<') &&
    !normalized.includes('>')
  )
}

function validateFilledReleaseHandoffUrls(content: string, findings: string[]) {
  for (const label of ['Frontend URL', 'Backend URL', 'Health URL', 'Ready URL']) {
    const value = fieldValue(content, label)
    if (value && !looksLikeDeployedHttpsUrl(value)) findings.push(`URL ใน release handoff ต้องเป็น https deployed URL: ${label}`)
  }

  const corsOrigins = fieldValue(content, 'CORS origins').toLowerCase()
  if (corsOrigins && (!corsOrigins.includes('https://') || corsOrigins.includes('http://') || corsOrigins.includes('localhost') || corsOrigins.includes('127.0.0.1') || corsOrigins.includes('*'))) {
    findings.push('CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น')
  }
}

function validateProductionVerificationFlags(content: string, findings: string[]) {
  const environment = fieldValue(content, 'Environment').toLowerCase()
  if (!environment.includes('production')) return

  if (!/`CHAT_PROVIDER_LIVE_VERIFIED`:\s*1\b/.test(content)) {
    findings.push('production release handoff ต้องมี CHAT_PROVIDER_LIVE_VERIFIED=1')
  }
  if (!/`IMAGE_GENERATION_LIVE_VERIFIED`:\s*1\b/.test(content)) {
    findings.push('production release handoff ต้องมี IMAGE_GENERATION_LIVE_VERIFIED=1')
  }
}

export function checkReleaseHandoffContent(content: string, options: { requireFilled?: boolean } = {}) {
  const findings: string[] = []

  for (const section of requiredSections) {
    if (!content.includes(section)) findings.push(`ยังไม่มี section: ${section}`)
  }

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) findings.push(`พบ ${forbidden.name}`)
  }

  for (const snippet of forbiddenCopySnippets) {
    if (content.includes(snippet)) findings.push(`พบข้อความส่งมอบที่ยังใช้คำเก่า: ${snippet}`)
  }

  for (const snippet of requiredQaGateSnippets) {
    if (!content.includes(snippet)) findings.push(`เธขเธฑเธเนเธกเนเธกเธต QA gate: ${snippet}`)
  }

  if (options.requireFilled) {
    const blankFields = content
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter(({ line }) => line.startsWith('- ') && /:\s*$/.test(line))
    for (const field of blankFields) findings.push(`บรรทัด ${field.index} ยังว่างอยู่: ${field.line}`)
    validateFilledReleaseHandoffUrls(content, findings)
    validateProductionVerificationFlags(content, findings)
  }

  return findings
}

export async function collectReleaseHandoffCheckResult(requireFilled = false): Promise<ReleaseHandoffCheckResult> {
  const findings = checkReleaseHandoffContent(await readFile(file, 'utf8'), { requireFilled })
  return { ok: findings.length === 0, requireFilled, findings }
}

export async function runReleaseHandoffCheck(
  argv = process.argv.slice(2),
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectReleaseHandoffCheckResult(argv.includes('--filled'))
  if (!result.ok) {
    writeError('ตรวจเอกสารส่งมอบ release ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - ตรวจเอกสารส่งมอบ release ${result.requireFilled ? 'กรอกครบและ' : ''}ปลอดภัยต่อการ commit`)
  return 0
}

if (import.meta.main) process.exit(await runReleaseHandoffCheck())
