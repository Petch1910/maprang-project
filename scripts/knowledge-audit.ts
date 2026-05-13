import { access, readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, normalize, relative, resolve } from 'node:path'
import { loadStructuredKnowledge } from '../apps/backend/src/knowledge.service'

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

const forbiddenPatterns = [
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9_-]{16,}/ },
  { name: 'OpenAI project key', pattern: /sk-proj-[A-Za-z0-9_-]{16,}/ },
  { name: 'JWT-like key', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Postgres URL with password', pattern: /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]+@/i },
  { name: 'Supabase service role value', pattern: /service_role[^\n]{20,}/i },
]

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
  const missing = values.filter((value) => !content.includes(value))
  if (missing.length > 0) findings.push(`${file} is missing ${missing.join(', ')}`)
}

function localMarkdownLinks(content: string) {
  const links: string[] = []
  const linkPattern = /\[[^\]]+\]\(([^)]+)\)/g
  for (const match of content.matchAll(linkPattern)) {
    const target = match[1]?.trim()
    if (!target || target.startsWith('http://') || target.startsWith('https://') || target.startsWith('#')) continue
    if (target.startsWith('mailto:') || target.includes('://')) continue
    links.push(target.split('#')[0] ?? target)
  }
  return links
}

function isInside(parent: string, child: string) {
  const normalizedParent = normalize(parent)
  const normalizedChild = normalize(child)
  return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}\\`) || normalizedChild.startsWith(`${normalizedParent}/`)
}

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

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      findings.push(`${relativePath}: contains ${forbidden.name}`)
    }
  }

  if (file.endsWith('.md')) {
    for (const target of localMarkdownLinks(content)) {
      const resolved = resolve(dirname(file), target)
      if (!isInside(knowledgeRoot, resolved)) {
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

if (findings.length > 0) {
  console.error('Knowledge audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`ok - knowledge audit passed (${files.length} knowledge files, ${structured.files.length} structured packs)`)
