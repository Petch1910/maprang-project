import { access, readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { loadStructuredKnowledge } from '../apps/backend/src/knowledge.service'
import { collectLocalMarkdownLinks, missingIncludes, pathIsInside } from './markdown-audit-helpers'
import { secretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const knowledgeRoot = join(root, 'knowledge')

const requiredFiles = [
  'knowledge/README.md',
  'knowledge/raw/README.md',
  'knowledge/wiki/INDEX.md',
  'knowledge/wiki/maprang-product.md',
  'knowledge/wiki/relationship-engine.md',
  'knowledge/wiki/creator-studio.md',
  'knowledge/wiki/production-deploy.md',
  'knowledge/structured/chat-style-guide.json',
  'knowledge/structured/creator-guides.json',
  'knowledge/structured/relationship-rules.json',
  'knowledge/structured/scene-rules.json',
  'knowledge/structured/content-policy.json',
]

export type KnowledgeAuditResult = {
  ok: boolean
  files: number
  structuredPacks: number
  findings: string[]
}

async function assertFile(path: string) {
  await access(join(root, path))
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

async function walkKnowledgeFiles(dir: string, files: string[] = []) {
  for (const entry of await readdir(dir)) {
    const path = join(dir, entry)
    const info = await stat(path)
    if (info.isDirectory()) {
      await walkKnowledgeFiles(path, files)
    } else if (['.md', '.json'].includes(extname(entry))) {
      files.push(path)
    }
  }
  return files
}

function requireIncludes(content: string, values: string[], file: string, findings: string[]) {
  const missing = missingIncludes(content, values)
  if (missing.length > 0) findings.push(`${file} is missing ${missing.join(', ')}`)
}

export async function collectKnowledgeAuditResult(): Promise<KnowledgeAuditResult> {
  const findings: string[] = []

  for (const file of requiredFiles) {
    await assertFile(file).catch(() => findings.push(`missing required knowledge file: ${file}`))
  }

  const readme = await readRepoFile('knowledge/README.md')
  requireIncludes(
    readme,
    ['Runtime Usage', 'Structured Packs', 'Never store secrets', '[Wiki Index](./wiki/INDEX.md)'],
    'knowledge/README.md',
    findings,
  )

  const wikiIndex = await readRepoFile('knowledge/wiki/INDEX.md')
  requireIncludes(
    wikiIndex,
    ['Maprang Product', 'Relationship Engine', 'Creator Studio', 'Production Deploy'],
    'knowledge/wiki/INDEX.md',
    findings,
  )

  const files = await walkKnowledgeFiles(knowledgeRoot)
  for (const file of files) {
    const relativePath = relative(root, file)
    const content = await readFile(file, 'utf8')

    for (const forbidden of secretPatterns) {
      if (forbidden.pattern.test(content)) {
        findings.push(`${relativePath}: contains ${forbidden.name}`)
      }
    }

    if (file.endsWith('.md')) {
      for (const target of collectLocalMarkdownLinks(content)) {
        const resolved = resolve(dirname(file), target)
        if (!pathIsInside(knowledgeRoot, resolved)) {
          findings.push(`${relativePath}: link escapes knowledge vault: ${target}`)
          continue
        }
        await access(resolved).catch(() => findings.push(`${relativePath}: broken local link: ${target}`))
      }
    }
  }

  const structured = loadStructuredKnowledge({ force: true }).status
  if (!structured.ok) {
    for (const missing of structured.missing) findings.push(`structured knowledge missing: ${missing}`)
    for (const error of structured.errors) findings.push(`structured knowledge invalid: ${error}`)
  }

  return {
    ok: findings.length === 0,
    files: files.length,
    structuredPacks: structured.files.length,
    findings,
  }
}

export async function runKnowledgeAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectKnowledgeAuditResult()
  if (!result.ok) {
    writeError('Knowledge audit failed:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ok - knowledge audit passed (${result.files} knowledge files, ${result.structuredPacks} structured packs)`)
  return 0
}

if (import.meta.main) process.exit(await runKnowledgeAudit())
