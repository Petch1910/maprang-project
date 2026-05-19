import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { secretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const file = join(root, 'RELEASE_HANDOFF.md')

const requiredSections = [
  'Release Handoff Template',
  'Release Identity',
  'Deployed URLs',
  'Database And Migrations',
  'Auth, Storage, And CORS',
  'AI Provider Verification',
  'QA Gates',
  'Admin Checks',
  'Known Limitations',
  'Release Decision',
]

const forbiddenPatterns = [
  ...secretPatterns,
  { name: 'raw access token', pattern: /\b(access|refresh|service)[_-]?token\s*:\s*\S{16,}/i },
]

export function checkReleaseHandoffContent(content: string, options: { requireFilled?: boolean } = {}) {
  const findings: string[] = []

  for (const section of requiredSections) {
    if (!content.includes(section)) findings.push(`missing section: ${section}`)
  }

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) findings.push(`contains ${forbidden.name}`)
  }

  if (options.requireFilled) {
    const blankFields = content
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter(({ line }) => line.startsWith('- ') && /:\s*$/.test(line))
    for (const field of blankFields) findings.push(`line ${field.index} is still blank: ${field.line}`)
  }

  return findings
}

if (import.meta.main) {
  const requireFilled = process.argv.includes('--filled')
  const findings = checkReleaseHandoffContent(await readFile(file, 'utf8'), { requireFilled })

  if (findings.length > 0) {
    console.error('Release handoff check failed:')
    for (const finding of findings) console.error(`- ${finding}`)
    process.exit(1)
  }

  console.log(`ok - release handoff is ${requireFilled ? 'filled and ' : ''}safe to commit`)
}
