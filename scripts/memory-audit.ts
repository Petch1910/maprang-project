import { access, readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, normalize, relative, resolve } from 'node:path'

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
  const missing = values.filter((value) => !content.includes(value))
  if (missing.length > 0) {
    throw new Error(`${file} is missing ${missing.join(', ')}`)
  }
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
  await assertFile(file).catch(() => findings.push(`missing required memory file: ${file}`))
}

const readme = await readRepoFile('memory/README.md')
requireIncludes(
  readme,
  ['Never store secrets', 'Update Protocol', '[Working Context](./working-context.md)', '[Deploy Blockers](./deploy-blockers.md)'],
  'memory/README.md',
)

const workingContext = await readRepoFile('memory/working-context.md')
requireIncludes(workingContext, ['Last updated:', 'Current Goal', 'Current Local Status', 'Current Production Status'], 'memory/working-context.md')

const deployBlockers = await readRepoFile('memory/deploy-blockers.md')
requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED', 'smoke:chat', 'smoke:image:live'], 'memory/deploy-blockers.md')

const qaStatus = await readRepoFile('memory/qa-status.md')
requireIncludes(qaStatus, ['bun run qa:local', 'Backend tests:', 'API smoke:', 'Production Gate'], 'memory/qa-status.md')

const files = await walkMarkdown(memoryRoot)
for (const file of files) {
  const relativePath = relative(root, file)
  const content = await readFile(file, 'utf8')
  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) {
      findings.push(`${relativePath}: contains ${forbidden.name}`)
    }
  }

  for (const target of localMarkdownLinks(content)) {
    const resolved = resolve(dirname(file), target)
    if (!isInside(memoryRoot, resolved)) {
      findings.push(`${relativePath}: link escapes memory vault: ${target}`)
      continue
    }
    await access(resolved).catch(() => findings.push(`${relativePath}: broken local link: ${target}`))
  }
}

if (findings.length > 0) {
  console.error('Memory audit failed:')
  for (const finding of findings) console.error(`- ${finding}`)
  process.exit(1)
}

console.log(`ok - memory audit passed (${files.length} markdown files)`)
