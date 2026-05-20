import { access, readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { collectLocalMarkdownLinks, missingIncludes, pathIsInside } from './markdown-audit-helpers'
import { secretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const memoryRoot = join(root, 'memory')

const requiredFiles = [
  'memory/README.md',
  'memory/working-context.md',
  'memory/project-maprang.md',
  'memory/deploy-blockers.md',
  'memory/qa-status.md',
  'memory/inbox.md',
  'memory/decisions/index.md',
  'memory/ui-ux/current-direction.md',
  'memory/api-backend/current-direction.md',
  'memory/production/checklist.md',
]

export type MemoryAuditResult = {
  ok: boolean
  files: number
  findings: string[]
}

async function assertFile(path: string) {
  await access(join(root, path))
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

async function walkMarkdown(dir: string, files: string[] = []) {
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry)
    const info = await stat(path)
    if (info.isDirectory()) {
      await walkMarkdown(path, files)
    } else if (entry.endsWith('.md')) {
      files.push(path)
    }
  }
  return files
}

function requireIncludes(content: string, values: string[], file: string) {
  const missing = missingIncludes(content, values)
  if (missing.length > 0) {
    throw new Error(`${file} ยังไม่มี ${missing.join(', ')}`)
  }
}

export async function collectMemoryAuditResult(): Promise<MemoryAuditResult> {
  const findings: string[] = []

  for (const file of requiredFiles) {
    await assertFile(file).catch(() => findings.push(`ยังไม่มี memory file ที่จำเป็น: ${file}`))
  }

  const readme = await readRepoFile('memory/README.md')
  requireIncludes(
    readme,
    ['ห้ามเก็บ secrets', 'ขั้นตอนอัปเดต', '[บริบทงานปัจจุบัน](./working-context.md)', '[ตัวกั้นก่อน deploy](./deploy-blockers.md)'],
    'memory/README.md',
  )

  const workingContext = await readRepoFile('memory/working-context.md')
  requireIncludes(workingContext, ['Last updated:', 'Current Goal', 'Current Local Status', 'สถานะ production ปัจจุบัน'], 'memory/working-context.md')

  const deployBlockers = await readRepoFile('memory/deploy-blockers.md')
  requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED', 'smoke:chat', 'smoke:image:live'], 'memory/deploy-blockers.md')

  const qaStatus = await readRepoFile('memory/qa-status.md')
  requireIncludes(qaStatus, ['bun run qa:local', 'Backend tests:', 'API smoke:', 'Production Gate'], 'memory/qa-status.md')

  const files = await walkMarkdown(memoryRoot)
  for (const file of files) {
    const relativePath = relative(root, file)
    const content = await readFile(file, 'utf8')
    for (const forbidden of secretPatterns) {
      if (forbidden.pattern.test(content)) {
        findings.push(`${relativePath}: พบ ${forbidden.name}`)
      }
    }

    for (const target of collectLocalMarkdownLinks(content)) {
      const resolved = resolve(dirname(file), target)
      if (!pathIsInside(memoryRoot, resolved)) {
        findings.push(`${relativePath}: link ออกนอก memory vault: ${target}`)
        continue
      }
      await access(resolved).catch(() => findings.push(`${relativePath}: local link เสีย: ${target}`))
    }
  }

  return { ok: findings.length === 0, files: files.length, findings }
}

export async function runMemoryAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectMemoryAuditResult()
  if (!result.ok) {
    writeError('Memory audit ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - memory audit ผ่านแล้ว (${result.files} markdown files)`)
  return 0
}

if (import.meta.main) process.exit(await runMemoryAudit())
