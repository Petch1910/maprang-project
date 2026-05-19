import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')
const selfFile = relative(root, import.meta.path)
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'uploads', '.vite'])
const ignoredFiles = new Set(['.env'])
const checkedExtensions = new Set(['.md', '.ts', '.tsx', '.js', '.json', '.yml', '.yaml', '.example', '.Dockerfile'])

const secretPatterns = [
  { name: 'OpenRouter key', pattern: /sk-or-v1-[A-Za-z0-9_-]{16,}/ },
  { name: 'OpenAI project key', pattern: /sk-proj-[A-Za-z0-9_-]{16,}/ },
  { name: 'JWT-like key', pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/ },
  { name: 'Private key block', pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: 'GitHub token', pattern: /\b(?:gh[pousr]_[A-Za-z0-9_]{36,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
  { name: 'Google API key', pattern: /\bAIza[A-Za-z0-9_-]{35}\b/ },
  { name: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: 'Known Supabase project ref', pattern: /rkkdpnvoxghqydozvron/ },
  { name: 'Known generated admin key', pattern: /920961fd9669ce7d8aaf1bf7d81450e404d3756f1ff8e64d6e5c5ed535806fc0/ },
]

function shouldCheck(path: string) {
  const normalized = path.replaceAll('\\', '/')
  if (normalized.endsWith('.env')) return false
  if (relative(root, path) === selfFile) return false
  if (normalized.includes('/.env')) return true
  const dot = normalized.lastIndexOf('.')
  const extension = dot >= 0 ? normalized.slice(dot) : ''
  return checkedExtensions.has(extension) || normalized.endsWith('Dockerfile')
}

async function walk(dir: string, files: string[] = []) {
  for (const entry of await readdir(dir)) {
    if (ignoredDirs.has(entry)) continue
    const path = join(dir, entry)
    const info = await stat(path)
    if (info.isDirectory()) {
      await walk(path, files)
    } else if (!ignoredFiles.has(entry) && shouldCheck(path)) {
      files.push(path)
    }
  }
  return files
}

const findings: Array<{ file: string; name: string }> = []
for (const file of await walk(root)) {
  const content = await readFile(file, 'utf8').catch(() => '')
  for (const secret of secretPatterns) {
    if (secret.pattern.test(content)) {
      findings.push({ file: relative(root, file), name: secret.name })
    }
  }
}

if (findings.length > 0) {
  console.error('Potential committed secrets found:')
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.name}`)
  }
  process.exit(1)
}

console.log('No obvious committed secrets found.')
