import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

type PackageContext = 'root' | 'apps/backend' | 'apps/frontend'

const packageFiles: Record<PackageContext, string> = {
  root: 'package.json',
  'apps/backend': 'apps/backend/package.json',
  'apps/frontend': 'apps/frontend/package.json',
}

const auditedMarkdownFiles = [
  'README.md',
  'AGENTS.md',
  'agent.md',
  'ABUSE_QA_CHECKLIST.md',
  'DEPLOY_RENDER.md',
  'DEPLOYMENT_QA.md',
  'PRODUCTION_SETUP.md',
  'RELEASE_HANDOFF.md',
  'ROUTE_MENU_AUDIT.md',
  'SECURITY_CHECKLIST.md',
  'STAGING_RUNBOOK.md',
  'apps/backend/README.md',
  'apps/frontend/README.md',
  'evals/README.md',
  'knowledge/README.md',
]

export type CommandReference = {
  file: string
  line: number
  script: string
  context: PackageContext
  text: string
}

export type CommandAuditResult = {
  checkedReferences: number
  findings: string[]
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

function defaultContextForFile(file: string): PackageContext {
  if (file.startsWith('apps/backend/')) return 'apps/backend'
  if (file.startsWith('apps/frontend/')) return 'apps/frontend'
  return 'root'
}

function contextFromCd(line: string): PackageContext | null {
  if (/\bcd\s+apps[\\/]backend\b/.test(line)) return 'apps/backend'
  if (/\bcd\s+apps[\\/]frontend\b/.test(line)) return 'apps/frontend'
  if (/\bcd\s+\.\.[\\/]\.\./.test(line)) return 'root'
  if (/\bcd\s+["']?\$GITHUB_WORKSPACE["']?/.test(line)) return 'root'
  return null
}

function inferLineContext(file: string, lines: string[], index: number, current: PackageContext) {
  const line = lines[index]
  if (line.includes('repo root')) return 'root'

  const cdContext = contextFromCd(line)
  if (cdContext) return cdContext

  if (file === 'DEPLOY_RENDER.md' && line.includes('Build command:')) {
    const previous = lines.slice(Math.max(0, index - 5), index).join('\n')
    if (previous.includes('Root directory: `apps/frontend`')) return 'apps/frontend'
    if (previous.includes('Dockerfile path: `apps/backend/Dockerfile`')) return 'apps/backend'
  }

  return current
}

export function collectBunRunReferences(file: string, content: string): CommandReference[] {
  const lines = content.split(/\r?\n/)
  const references: CommandReference[] = []
  let context = defaultContextForFile(file)
  let inFence = false

  lines.forEach((line, index) => {
    if (/^\s*```/.test(line)) {
      inFence = !inFence
      if (!inFence) context = defaultContextForFile(file)
      return
    }

    const lineContext = inferLineContext(file, lines, index, inFence ? context : defaultContextForFile(file))
    if (inFence) context = lineContext

    for (const match of line.matchAll(/\bbun\s+run\s+([A-Za-z0-9:_-]+)/g)) {
      references.push({
        file,
        line: index + 1,
        script: match[1],
        context: lineContext,
        text: line.trim(),
      })
    }
  })

  return references
}

async function loadPackageScripts() {
  const entries = await Promise.all(
    (Object.entries(packageFiles) as Array<[PackageContext, string]>).map(async ([context, path]) => {
      const packageJson = JSON.parse(await readRepoFile(path)) as { scripts?: Record<string, string> }
      return [context, new Set(Object.keys(packageJson.scripts ?? {}))] as const
    }),
  )

  return Object.fromEntries(entries) as Record<PackageContext, Set<string>>
}

export async function collectDocsCommandAuditResult(
  files = auditedMarkdownFiles,
): Promise<CommandAuditResult> {
  const packageScripts = await loadPackageScripts()
  const references = (
    await Promise.all(files.map(async (file) => collectBunRunReferences(file, await readRepoFile(file))))
  ).flat()

  const findings = references
    .filter((reference) => !packageScripts[reference.context].has(reference.script))
    .map(
      (reference) =>
        `${reference.file}:${reference.line} อ้าง \`bun run ${reference.script}\` ใน context \`${reference.context}\` แต่ package นั้นไม่มี script นี้`,
    )

  return {
    checkedReferences: references.length,
    findings,
  }
}

export async function runDocsCommandAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectDocsCommandAuditResult()

  if (result.findings.length > 0) {
    writeError('ตรวจคำสั่งในเอกสารไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - ตรวจคำสั่งในเอกสารแล้ว (${result.checkedReferences} references)`)
  return 0
}

if (import.meta.main) process.exit(await runDocsCommandAudit())
