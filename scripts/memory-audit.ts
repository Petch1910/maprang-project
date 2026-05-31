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

function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}

export function missingDecisionIndexEntries(decisionFilePaths: string[], indexContent: string) {
  return decisionFilePaths
    .map(normalizePath)
    .filter((path) => path.startsWith('memory/decisions/'))
    .filter((path) => path !== 'memory/decisions/index.md')
    .filter((path) => /\/\d{4}-.+\.md$/.test(path))
    .map((path) => path.slice(path.lastIndexOf('/') + 1))
    .filter((filename) => !indexContent.includes(`./${filename}`))
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
  requireIncludes(
    workingContext,
    [
      'Last updated:',
      'เป้าหมายปัจจุบัน',
      'สถานะ local ปัจจุบัน',
      'สถานะ production ปัจจุบัน',
      'Route/Menu Audit',
      'needs-staging',
      'future',
      '/path',
      'stale documented rows',
      'routeMenuAuditRows',
      'API route audit',
      'admin-smoke',
      'live-smoke',
      'POST /chat/stream',
      'live-provider coverage addendum',
      'manual-production',
      '0023-guard-dangerous-frontend-link-protocols.md',
      'memory audit 33 Markdown files',
      'frontend static audit allowlist guard',
      'AuthError response helper guard',
      'raw UI error throw guard',
      'cross-window messaging guard',
      'backend raw route return guard',
      'aria-disabled reason guard',
      'placeholder-link guard',
      'no-op handler guard',
      'no-op submit guard',
      'dangerous link protocol guard',
    ],
    'memory/working-context.md',
  )

  const deployBlockers = await readRepoFile('memory/deploy-blockers.md')
  requireIncludes(
    deployBlockers,
    [
      'CHAT_PROVIDER_LIVE_VERIFIED',
      'IMAGE_GENERATION_LIVE_VERIFIED',
      'smoke:chat',
      'smoke:image:live',
      'Route/Menu Audit guard',
      'STAGING_RUNBOOK.md',
      '/admin/health',
      '/path',
      'stale documented rows',
      'routeMenuAuditRows',
      'API route audit',
      'weak coverage',
      'admin-smoke',
      'live-smoke',
      'POST /chat/stream',
      'decision `0023` dangerous link protocol contract',
      'AuthError response helper guard',
      'raw UI error throw guard',
      'cross-window messaging guard',
      'backend raw route return guard',
      'memory audit ครอบ 33 Markdown files',
      'frontend static audit allowlist guard',
      'aria-disabled reason guard',
      'placeholder-link guard',
      'no-op handler guard',
      'no-op submit guard',
      'dangerous link protocol guard',
      'handoffEvidence',
      'Chat smoke normal chatId',
      'Chat smoke normal tokens',
      'Chat smoke normal walletTransactionId',
      'Chat smoke stream chatId',
      'Chat smoke stream tokens',
      'Chat smoke stream walletTransactionId',
      'Image smoke provider',
      'Image smoke source',
      'Image smoke urlKind',
      'Image smoke elapsedMs',
      'positive token/elapsed values',
    ],
    'memory/deploy-blockers.md',
  )

  const qaStatus = await readRepoFile('memory/qa-status.md')
  requireIncludes(
    qaStatus,
    [
      'bun run qa:local',
      'Backend tests:',
      'API smoke:',
      'Gate production',
      'route/menu status evidence',
      'predeploy route/menu status evidence',
      'API route coverage quality guard',
      'stream live-provider handoff wording pass',
      'POST /chat/stream',
      'weak-coverage reason diagnostics',
      'stale documented-row guard',
      'routeMenuAuditRows',
      'frontend dangerous protocol decision pass',
      'AuthError response helper guard',
      'raw UI error throw guard',
      'cross-window messaging guard',
      'backend raw route return guard',
      'memory audit 33 Markdown files',
      'frontend static audit allowlist guard',
      'aria-disabled reason guard',
      'placeholder-link guard',
      'no-op handler guard',
      'no-op submit guard',
      'dangerous link protocol guard',
    ],
    'memory/qa-status.md',
  )

  const productionChecklist = await readRepoFile('memory/production/checklist.md')
  requireIncludes(
    productionChecklist,
    [
      'decision `0023` dangerous link protocol contract',
      'AuthError response helper guard',
      'raw UI error throw guard',
      'cross-window messaging guard',
      'backend raw route return guard',
      'memory audit 33 Markdown files',
      'docs command audit 341 refs',
      'frontend static audit allowlist guard',
      'aria-disabled reason guard',
      'placeholder-link guard',
      'no-op handler guard',
      'no-op submit guard',
      'dangerous link protocol guard',
    ],
    'memory/production/checklist.md',
  )

  const files = await walkMarkdown(memoryRoot)
  const relativeMemoryFiles = files.map((file) => normalizePath(relative(root, file)))
  const decisionIndex = await readRepoFile('memory/decisions/index.md')
  for (const filename of missingDecisionIndexEntries(relativeMemoryFiles, decisionIndex)) {
    findings.push(`memory/decisions/index.md: decision file ยังไม่ถูกลิงก์: ${filename}`)
  }

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
    writeError('ตรวจ memory ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - memory audit ผ่านแล้ว (${result.files} ไฟล์ Markdown)`)
  return 0
}

if (import.meta.main) process.exit(await runMemoryAudit())
