import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const file = join(root, 'RELEASE_HANDOFF.md')
const requireFilled = process.argv.includes('--filled')

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
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9_-]{16,}/ },
  { name: 'OpenAI project key', pattern: /sk-proj-[A-Za-z0-9_-]{16,}/ },
  { name: 'JWT-like key', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Postgres URL with password', pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'Supabase service role value', pattern: /service_role[^\n]{20,}/i },
  { name: 'raw access token', pattern: /\b(access|refresh|service)[_-]?token\s*:\s*\S{16,}/i },
]

const content = await readFile(file, 'utf8')
const findings: string[] = []

for (const section of requiredSections) {
  if (!content.includes(section)) findings.push(`missing section: ${section}`)
}

for (const forbidden of forbiddenPatterns) {
  if (forbidden.pattern.test(content)) findings.push(`contains ${forbidden.name}`)
}

if (requireFilled) {
  const blankFields = content
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), index: index + 1 }))
    .filter(({ line }) => line.startsWith('- ') && /:\s*$/.test(line))
  for (const field of blankFields) findings.push(`line ${field.index} is still blank: ${field.line}`)
}

if (findings.length > 0) {
  console.error('Release handoff check failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`ok - release handoff is ${requireFilled ? 'filled and ' : ''}safe to commit`)
