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
const rawRouteErrorResponsePattern = /return\s+\{(?=[^}]*\berror\s*:)(?![^}]*\bmessage\s*:)[^}]*\}/g
const rawRouteErrorLogPattern = /console\.(?:error|warn)\([^)\n]*,\s*error\b/g
const rawRouteErrorThrowPattern = /throw\s+error\b/g
const routeErrorMessagesBlockPattern = /routeErrorMessages:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\n\s*\}/m
const routeErrorMessageKeyPattern = /^\s*([a-z0-9_]+):/gm
const routeErrorResponseCallPattern = /\brouteErrorResponse\(\s*(['"`])([a-z0-9_]+)\1\s*\)/g

const patterns = [
  {
    pattern: /\.\$queryRawUnsafe\s*\(/g,
    message: 'ห้ามใช้ Prisma $queryRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $queryRaw พร้อม parameters.',
  },
  {
    pattern: /\.\$executeRawUnsafe\s*\(/g,
    message: 'ห้ามใช้ Prisma $executeRawUnsafe; ให้ใช้ Prisma query builders หรือ tagged $executeRaw พร้อม parameters.',
  },
  {
    pattern: /\bPrisma\.raw\s*\(/g,
    message: 'ห้ามใช้ Prisma.raw เพราะอาจข้าม parameterization.',
  },
  {
    pattern: /\.\$queryRaw(?:<[^>]+>)?\s*\(/g,
    message: 'ห้ามใช้ Prisma $queryRaw แบบ function call; ให้ใช้ tagged template parameterization.',
  },
  {
    pattern: /\.\$executeRaw(?:<[^>]+>)?\s*\(/g,
    message: 'ห้ามใช้ Prisma $executeRaw แบบ function call; ให้ใช้ tagged template parameterization.',
  },
  {
    pattern: /console\.(?:error|warn)\([^)\n]*providerFailure[^)\n]*,\s*error\b/g,
    message: 'ห้าม log raw provider error คู่กับ providerFailure; ให้ log เฉพาะผล classify เพื่อกัน secret หลุดใน log.',
  },
  {
    pattern: /console\.error\(\s*error\s*\)/g,
    message: 'ห้าม log raw error object ตรงๆ; ให้สรุป error แบบปลอดภัยก่อนเขียน log.',
  },
  {
    pattern: /\bdetail\s*:\s*error\s+instanceof\s+Error\s*\?\s*error\.message\b/g,
    message: 'route response ห้ามส่ง raw error.message ใน detail; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.',
  },
  {
    pattern: /\bdetail\s*:\s*(?:error\.message|String\(\s*error\s*\))/g,
    message: 'route response ห้ามส่ง raw error detail ตรงๆ; ใช้ safeRouteErrorSummary หรือข้อความที่ควบคุมได้.',
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
      message: 'route ผู้ดูแลยังไม่มี requireAdminApiKey guard ใน block ของ handler.',
    })
  }

  for (const match of content.matchAll(uuidParamRoutePattern)) {
    if (match[0].includes('rejectInvalidUuid')) continue
    findings.push({
      file,
      line: lineFor(content, match.index ?? 0),
      message: 'route ที่มี /:id ยังไม่มี rejectInvalidUuid guard ก่อนเข้าถึงข้อมูล.',
    })
  }

  if (file.endsWith('.routes.ts')) {
    for (const match of content.matchAll(rawRouteErrorLogPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route log raw error object ตรงๆ ไม่ได้; ใช้ safeRouteErrorSummary เพื่อกันข้อมูลลับหลุด log.',
      })
    }

    for (const match of content.matchAll(rawRouteErrorThrowPattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route throw raw error object ตรงๆ ไม่ได้; คืน routeErrorResponse หรือ response ที่ควบคุมข้อความได้.',
      })
    }

    for (const match of content.matchAll(rawRouteErrorResponsePattern)) {
      findings.push({
        file,
        line: lineFor(content, match.index ?? 0),
        message: 'route error response ยังไม่มี message แบบ Thai-first; ใช้ routeErrorResponse หรือใส่ message.',
      })
    }
  }

  return findings
}

export function collectKnownRouteErrorMessages(routeGuardsContent: string) {
  const block = routeGuardsContent.match(routeErrorMessagesBlockPattern)?.[1] ?? ''
  return new Set([...block.matchAll(routeErrorMessageKeyPattern)].map((match) => match[1] ?? '').filter(Boolean))
}

export function collectRouteErrorResponseCodes(content: string) {
  return [...content.matchAll(routeErrorResponseCallPattern)].map((match) => ({
    code: match[2] ?? '',
    index: match.index ?? 0,
  })).filter((item) => item.code)
}

export async function collectBackendSecurityFindings() {
  const files = (await Promise.all(scannedTargets.map((target) => collectSourceFiles(join(root, target))))).flat()
  const findings: BackendSecurityFinding[] = []
  const routeGuardsPath = join(root, 'apps/backend/src/route-guards.ts')
  const routeGuardsContent = await readFile(routeGuardsPath, 'utf8')
  const knownRouteErrors = collectKnownRouteErrorMessages(routeGuardsContent)

  for (const file of files) {
    const content = await readFile(file, 'utf8')
    const relativeFile = relative(root, file).replaceAll('\\', '/')
    findings.push(...collectBackendSecurityFindingsFromSource(relativeFile, content))
    if (!relativeFile.endsWith('route-guards.ts')) {
      for (const call of collectRouteErrorResponseCodes(content)) {
        if (knownRouteErrors.has(call.code)) continue
        findings.push({
          file: relativeFile,
          line: lineFor(content, call.index),
          message: `routeErrorResponse code "${call.code}" ยังไม่มีใน routeErrorMessages.`,
        })
      }
    }
  }

  return findings
}

export async function runBackendSecurityAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const findings = await collectBackendSecurityFindings()

  if (findings.length > 0) {
    writeError('ตรวจ security ระบบหลังบ้านไม่ผ่าน:')
    for (const finding of findings) writeError(`- ${finding.file}:${finding.line} ${finding.message}`)
    return 1
  }

  writeLine('ผ่าน - ตรวจ security ระบบหลังบ้านผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runBackendSecurityAudit())
