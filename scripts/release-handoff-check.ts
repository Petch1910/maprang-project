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

export type ReleaseHandoffCheckResult = {
  ok: boolean
  requireFilled: boolean
  findings: string[]
}

export function checkReleaseHandoffContent(content: string, options: { requireFilled?: boolean } = {}) {
  const findings: string[] = []

  for (const section of requiredSections) {
    if (!content.includes(section)) findings.push(`ยังไม่มี section: ${section}`)
  }

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) findings.push(`พบ ${forbidden.name}`)
  }

  if (options.requireFilled) {
    const blankFields = content
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter(({ line }) => line.startsWith('- ') && /:\s*$/.test(line))
    for (const field of blankFields) findings.push(`บรรทัด ${field.index} ยังว่างอยู่: ${field.line}`)
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
