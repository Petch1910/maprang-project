import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')
const scannedTargets = ['apps/backend/index.ts', 'apps/backend/src', 'apps/backend/prisma']

export type BackendSecurityFinding = {
  file: string
  line: number
  message: string
}

function shouldScanSourceFile(file: string) {
  if (!/\.(ts|tsx)$/.test(file)) return false
  if (/\.(test|spec)\.(ts|tsx)$/.test(file)) return false
  return true
}

export async function collectSourceFiles(target: string): Promise<string[]> {
  const targetStat = await stat(target)
  if (targetStat.isFile()) return shouldScanSourceFile(target) ? [target] : []
  if (!targetStat.isDirectory()) return []

  const entries = await readdir(target, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(target, entry.name)
      if (entry.isDirectory()) return collectSourceFiles(fullPath)
      return shouldScanSourceFile(fullPath) ? [fullPath] : []
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
const rawRouteErrorResponsePattern = /return\s+\{\s*error:\s*(['"`])[a-z0-9_]+\1\s*\}/g

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

  if (file.endsWith('.routes.ts')) {
    for (const match of content.matchAll(rawRouteErrorResponsePattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route error response is missing a Thai-first message; use routeErrorResponse or include message.',
      })
    }
  }

  return findings
}

export async function collectBackendSecurityFindings() {
  const files = (await Promise.all(scannedTargets.map((target) => collectSourceFiles(join(root, target))))).flat()
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
