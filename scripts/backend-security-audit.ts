import { readFile, readdir } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')
const scannedDirs = ['apps/backend/src', 'apps/backend/prisma']

type Finding = {
  file: string
  line: number
  message: string
}

async function collectSourceFiles(dir: string): Promise<string[]> {
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

const findings: Finding[] = []
const files = (await Promise.all(scannedDirs.map((dir) => collectSourceFiles(join(root, dir))))).flat()
const adminRoutePattern =
  /\.(get|post|patch|put|delete)\(\s*(?:\r?\n\s*)?(['"`])\/admin\b[^'"`]*\2[\s\S]*?(?=\r?\n\s*\.(?:get|post|patch|put|delete)\(|\s*$)/g

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

for (const file of files) {
  const content = await readFile(file, 'utf8')
  const relativeFile = relative(root, file).replaceAll('\\', '/')
  for (const item of patterns) {
    for (const match of content.matchAll(item.pattern)) {
      findings.push({
        file: relativeFile,
        line: lineFor(content, match.index ?? 0),
        message: item.message,
      })
    }
  }

  for (const match of content.matchAll(adminRoutePattern)) {
    if (match[0].includes('requireAdminApiKey')) continue
    findings.push({
      file: relativeFile,
      line: lineFor(content, match.index ?? 0),
      message: 'admin route is missing requireAdminApiKey guard in the route handler block.',
    })
  }
}

if (findings.length > 0) {
  console.error('Backend security audit failed:')
  for (const finding of findings) console.error(`- ${finding.file}:${finding.line} ${finding.message}`)
  process.exit(1)
}

console.log('ok - backend security audit passed')
