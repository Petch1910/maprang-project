import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')
const scannedDirs = ['apps/backend/src', 'apps/backend/prisma']

export type BackendSecurityFinding = {
  file: string
  line: number
  message: string
}

export async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(fullPath)
      if (/\.(test|spec)\.(ts|tsx)$/.test(entry.name)) return []
      if (/\.(ts|tsx)$/.test(entry.name)) return [fullPath]
      return []
    }),
  )
  return nested.flat()
}

function lineFor(content: string, index: number) {
  return content.slice(0, index).split(/\r?\n/).length
}

const adminRoutePattern =
  /\.(get|post|patch|put|delete)\(\s*(?:\r?\n\s*)?(['"`])\/admin\b[^'"`]*\2[\s\S]*?(?=\r?\n\s*\.(?:get|post|patch|put|delete)\(|\s*$)/g
const uuidParamRoutePattern =
  /\.(get|post|patch|put|delete)\(\s*(?:\r?\n\s*)?(['"`])\/[^'"`]*\/:id(?:\/[^'"`]*)?\2[\s\S]*?(?=\r?\n\s*\.(?:get|post|patch|put|delete)\(|\s*$)/g

const patterns = [
  {
    pattern: /\.\$queryRawUnsafe\s*\(/g,
    message: 'Prisma $queryRawUnsafe is forbidden; use Prisma query builders or tagged $queryRaw with parameters.',
  },
  {
    pattern: /\.\$executeRawUnsafe\s*\(/g,
    message: 'Prisma $executeRawUnsafe is forbidden; use Prisma query builders or tagged $executeRaw with parameters.',
  },
  {
    pattern: /\bPrisma\.raw\s*\(/g,
    message: 'Prisma.raw is forbidden because it can bypass parameterization.',
  },
  {
    pattern: /\.\$queryRaw(?:<[^>]+>)?\s*\(/g,
    message: 'Prisma $queryRaw function-call form is forbidden; use tagged template parameterization.',
  },
  {
    pattern: /\.\$executeRaw(?:<[^>]+>)?\s*\(/g,
    message: 'Prisma $executeRaw function-call form is forbidden; use tagged template parameterization.',
  },
]

export function collectBackendSecurityFindingsFromSource(file: string, content: string): BackendSecurityFinding[] {
  const findings: BackendSecurityFinding[] = []

  for (const item of patterns) {
    for (const match of content.matchAll(item.pattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: item.message,
      })
    }
  }

  for (const match of content.matchAll(adminRoutePattern)) {
    if (match[0].includes('requireAdminApiKey')) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: 'admin route is missing requireAdminApiKey guard in the route handler block.',
    })
  }

  for (const match of content.matchAll(uuidParamRoutePattern)) {
    if (match[0].includes('rejectInvalidUuid')) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: 'route with /:id is missing rejectInvalidUuid guard before resource access.',
    })
  }

  return findings
}

export async function collectBackendSecurityFindings() {
  const files = (await Promise.all(scannedDirs.map((dir) => collectSourceFiles(join(root, dir))))).flat()
  const findings: BackendSecurityFinding[] = []

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const relativeFile = relative(root, file).replaceAll('\\', '/')
    findings.push(...collectBackendSecurityFindingsFromSource(relativeFile, content))
  }

  return findings
}

export async function runBackendSecurityAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const findings = await collectBackendSecurityFindings()

  if (findings.length > 0) {
    writeError('Backend security audit failed:')
    for (const finding of findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine('ok - backend security audit passed')
  return 0
}

if (import.meta.main) process.exit(await runBackendSecurityAudit())
