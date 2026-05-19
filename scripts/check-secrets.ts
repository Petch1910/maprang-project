import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { repoSecretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const selfFile = relative(root, import.meta.path)
const ignoredDirs = new Set(['.git', 'node_modules', 'dist', 'uploads', '.vite'])
const ignoredFiles = new Set(['.env'])
const checkedExtensions = new Set(['.md', '.ts', '.tsx', '.js', '.json', '.yml', '.yaml', '.example', '.Dockerfile'])

const committedSecretPatterns = [
  ...repoSecretPatterns,
  { name: 'Known Supabase project ref', pattern: /rkkdpnvoxghqydozvron/ },
  { name: 'Known generated admin key', pattern: /920961fd9669ce7d8aaf1bf7d81450e404d3756f1ff8e64d6e5c5ed535806fc0/ },
]

export type SecretFinding = { file: string; name: string }

export function isUnsafeTrackedEnvPath(path: string) {
  const normalized = path.replaceAll('\\', '/')
  const fileName = normalized.split('/').pop() ?? normalized
  return fileName.startsWith('.env') && !fileName.endsWith('.example')
}

export function shouldCheckSecretPath(
  path: string,
  options: {
    rootDir?: string
    selfRelativePath?: string
  } = {},
) {
  const rootDir = options.rootDir ?? root
  const selfRelativePath = options.selfRelativePath ?? selfFile
  const normalized = path.replaceAll('\\', '/')
  if (isUnsafeTrackedEnvPath(normalized)) return false
  const relativePath = relative(rootDir, path).replaceAll('\\', '/')
  if (relativePath === selfRelativePath.replaceAll('\\', '/')) return false
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
    } else if (!ignoredFiles.has(entry) && shouldCheckSecretPath(path)) {
      files.push(path)
    }
  }
  return files
}

async function gitTrackedFiles() {
  const proc = Bun.spawn(['git', 'ls-files'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`git ls-files failed: ${stderr.trim() || `exit code ${exitCode}`}`)
  }
  return stdout.split(/\r?\n/).filter(Boolean)
}

export async function collectSecretFindings(): Promise<SecretFinding[]> {
  const findings: SecretFinding[] = []
  for (const file of await walk(root)) {
    const content = await readFile(file, 'utf8').catch(() => '')
    for (const secret of committedSecretPatterns) {
      if (secret.pattern.test(content)) {
        findings.push({ file: relative(root, file), name: secret.name })
      }
    }
  }
  for (const file of await gitTrackedFiles()) {
    if (isUnsafeTrackedEnvPath(file)) {
      findings.push({ file, name: 'Tracked env file' })
    }
  }
  return findings
}

export async function runSecretsCheck(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const findings = await collectSecretFindings()
  if (findings.length > 0) {
    writeError('Potential committed secrets found:')
    for (const finding of findings) {
      writeError(`- ${finding.file}: ${finding.name}`)
    }
    return 1
  }

  writeLine('No obvious committed secrets found.')
  return 0
}

if (import.meta.main) process.exit(await runSecretsCheck())
