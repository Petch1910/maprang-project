import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const remainingPlanPath = 'docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md'

const taskLinePattern = /^-\s+`([A-Z]+\d+\.\d+)`\s+(.+)$/
const externalTaskPattern = /^(?:A5\.6|D10\.\d+)$/
const closedTaskPattern = /\b(?:done|closed|passed)\b|ผ่าน|เสร็จ/i
const futureExternalPattern = /future\/external/i

const requiredSnippets = [
  'bun run qa:full',
  'future/external',
  'Local Server, Ngrok Preview',
  'Definition Of Done',
]

export type RemainingPlanAuditInput = {
  plan: string
}

export type RemainingPlanAuditResult = {
  checkedTasks: number
  localTasks: number
  externalTasks: number
  findings: string[]
}

function isExternalTask(taskId: string) {
  return externalTaskPattern.test(taskId)
}

export function auditRemainingDevelopmentPlan(input: RemainingPlanAuditInput): RemainingPlanAuditResult {
  const findings: string[] = []
  const taskLines = input.plan
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .map(({ line, number }) => ({ match: line.match(taskLinePattern), line, number }))
    .filter((entry): entry is { match: RegExpMatchArray; line: string; number: number } => Boolean(entry.match))

  for (const snippet of requiredSnippets) {
    if (!input.plan.includes(snippet)) {
      findings.push(`${remainingPlanPath} missing required snippet: ${snippet}`)
    }
  }

  if (taskLines.length === 0) {
    findings.push(`${remainingPlanPath} has no machine-readable task lines`)
  }

  let localTasks = 0
  let externalTasks = 0

  for (const { match, line, number } of taskLines) {
    const taskId = match[1]

    if (isExternalTask(taskId)) {
      externalTasks += 1
      if (!futureExternalPattern.test(line)) {
        findings.push(`${remainingPlanPath}:${number} ${taskId} is external but is not marked future/external`)
      }
      continue
    }

    localTasks += 1
    if (!closedTaskPattern.test(line)) {
      findings.push(`${remainingPlanPath}:${number} ${taskId} is a local/repo-owned task without done evidence`)
    }
    if (futureExternalPattern.test(line)) {
      findings.push(`${remainingPlanPath}:${number} ${taskId} is local/repo-owned but is marked future/external`)
    }
  }

  return {
    checkedTasks: taskLines.length,
    localTasks,
    externalTasks,
    findings,
  }
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

export async function collectRemainingPlanAuditResult(): Promise<RemainingPlanAuditResult> {
  return auditRemainingDevelopmentPlan({
    plan: await readRepoFile(remainingPlanPath),
  })
}

export async function runRemainingPlanAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectRemainingPlanAuditResult()

  if (result.findings.length > 0) {
    writeError('ตรวจ remaining development plan ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(
    `ผ่าน - ตรวจ remaining development plan แล้ว (${result.checkedTasks} tasks, ${result.localTasks} local closed, ${result.externalTasks} future/external)`,
  )
  return 0
}

if (import.meta.main) process.exit(await runRemainingPlanAudit())
