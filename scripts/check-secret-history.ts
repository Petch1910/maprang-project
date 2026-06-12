import { repoSecretPatterns } from './secret-patterns'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')

export type SecretHistoryFinding = {
  commit: string
  file: string
  name: string
  change: 'added' | 'removed'
}

type DiffState = {
  commit: string
  file: string
}

function normalizeGitPath(path: string) {
  return path.replace(/^"[ab]\//, '').replace(/"$/, '').replace(/^[ab]\//, '')
}

export function collectSecretHistoryFindingsFromGitLog(output: string) {
  const findings: SecretHistoryFinding[] = []
  const seen = new Set<string>()
  const state: DiffState = { commit: '', file: '<unknown>' }

  for (const line of output.split(/\r?\n/)) {
    if (/^[0-9a-f]{40}$/i.test(line)) {
      state.commit = line
      state.file = '<unknown>'
      continue
    }

    const diffMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line)
    if (diffMatch) {
      state.file = normalizeGitPath(diffMatch[2])
      continue
    }

    if (!/^[+-]/.test(line) || line.startsWith('+++ ') || line.startsWith('--- ')) continue
    const change = line.startsWith('+') ? 'added' : 'removed'
    const content = line.slice(1)

    for (const secret of repoSecretPatterns) {
      secret.pattern.lastIndex = 0
      if (!secret.pattern.test(content)) continue

      const key = `${state.commit}:${state.file}:${secret.name}:${change}`
      if (seen.has(key)) continue
      seen.add(key)
      findings.push({
        commit: state.commit,
        file: state.file,
        name: secret.name,
        change,
      })
    }
  }

  return findings
}

export async function collectSecretHistoryFindings() {
  const proc = Bun.spawn(
    ['git', 'log', '--all', '--full-history', '--no-ext-diff', '--unified=0', '--format=%H', '-p', '--', '.'],
    {
      cwd: root,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  )
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  if (exitCode !== 0) {
    throw new Error(`git history secret scan failed: ${stderr.trim() || `exit code ${exitCode}`}`)
  }
  return collectSecretHistoryFindingsFromGitLog(stdout)
}

export async function runSecretHistoryCheck(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
  collectFindings: () => Promise<SecretHistoryFinding[]> = collectSecretHistoryFindings,
) {
  const findings = await collectFindings()
  if (findings.length === 0) {
    writeLine('ไม่พบ secret pattern ใน Git history')
    return 0
  }

  writeError('พบ secret pattern ใน Git history (ไม่พิมพ์ค่า secret):')
  for (const finding of findings.slice(0, 50)) {
    const shortCommit = finding.commit.slice(0, 12) || '<unknown>'
    writeError(`- ${shortCommit} ${finding.file}: ${finding.name} (${finding.change})`)
  }
  if (findings.length > 50) {
    writeError(`- ...อีก ${findings.length - 50} รายการ`)
  }
  writeError('ให้ rotate/revoke key ที่เคยหลุด และพิจารณา rewrite history ก่อนเปิด repo ให้คนนอกเข้าถึง')
  return 1
}

if (import.meta.main) process.exit(await runSecretHistoryCheck())
