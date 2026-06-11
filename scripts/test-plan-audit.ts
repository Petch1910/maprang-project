import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

const testPlanPath = 'docs/MAPRANG_TEST_PLAN.md'

const requiredTestPlanSnippets = [
  'React 19',
  'Vite',
  'Redux Toolkit',
  'Bun',
  'Elysia',
  'Prisma',
  'PostgreSQL',
  'Supabase JWT',
  'Supabase Storage `avatars`',
  'signed URL',
  'local/mock-roleplay',
  'OpenRouter/live provider',
  'fallback image',
  '14',
  '13 product surfaces',
  '`/`',
  '`/characters/:id`',
  '`/chat`, `/chat/:id`',
  '`/chats`',
  '`/create`',
  '`/events`',
  '`/profile`',
  '`/wallet`',
  '`/moderation`',
  '`/admin/health`',
  '`/admin/prompt-inspector`',
  '`/admin/evals`',
  '`*`',
  'local ready',
  'guarded',
  'staging required',
  'production blocker',
  'future',
  'chat composer',
  'message bubble',
  'character card',
  'relationship picker',
  'report dialog',
  'creator readiness/form flow',
  'create draft',
  'AI draft fallback/live flag',
  'chat send local',
  'chat menu actions',
  'report',
  'wallet',
  'moderation',
  'admin health',
  'mobile viewport',
  'bun run secrets:check',
  'bun run docs:commands',
  'bun run test-plan:audit',
  'bun run frontend:static:audit',
  'bun run frontend:route:audit',
  'bun run frontend:components:test',
  'bun run frontend:check',
  'bun run api:audit',
  'bun run backend:check',
  'bun run backend:check:db:test',
  'bun run qa:repo',
  'bun run qa:full',
  'bun run e2e:smoke',
  'bun run staging:verify',
  'bun run production:check',
  'bun run smoke:chat',
  'bun run smoke:image:live',
  'Backend HTTPS origin',
  'Frontend HTTPS origin',
  '`CORS_ORIGINS`',
  'Production `DATABASE_URL`',
  'Supabase Storage bucket `avatars` private + signed URL',
  '`/admin/health`',
]

const requiredRunbookSnippets = [
  'PostgreSQL',
  'Prisma',
  'Bun',
  'local/mock-roleplay',
]

const forbiddenCurrentSourceSnippets = [
  'Hono',
  'Drizzle',
  'CreatorStudioPageNew',
  'componentApi.ts',
  'production is 100% ready',
  '100% production ready',
]

const runbookFiles = ['START_HERE.md', 'RUN_NOW.md', 'HOW_TO_RUN.md']

export type TestPlanAuditInput = {
  testPlan: string
  runbooks: Record<string, string>
}

export type TestPlanAuditResult = {
  checkedFiles: number
  findings: string[]
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

function includesEvery(content: string, snippets: string[]) {
  return snippets.filter((snippet) => !content.includes(snippet))
}

function findForbidden(content: string, snippets: string[]) {
  return snippets.filter((snippet) => content.includes(snippet))
}

export function auditMaprangTestPlan(input: TestPlanAuditInput): TestPlanAuditResult {
  const findings: string[] = []

  for (const snippet of includesEvery(input.testPlan, requiredTestPlanSnippets)) {
    findings.push(`${testPlanPath} missing required source-of-truth snippet: ${snippet}`)
  }

  for (const snippet of findForbidden(input.testPlan, forbiddenCurrentSourceSnippets)) {
    findings.push(`${testPlanPath} still contains stale/current-source-forbidden snippet: ${snippet}`)
  }

  for (const [file, content] of Object.entries(input.runbooks)) {
    for (const snippet of includesEvery(content, requiredRunbookSnippets)) {
      findings.push(`${file} missing current runbook baseline snippet: ${snippet}`)
    }
    for (const snippet of findForbidden(content, forbiddenCurrentSourceSnippets)) {
      findings.push(`${file} still contains stale/current-source-forbidden snippet: ${snippet}`)
    }
  }

  return {
    checkedFiles: 1 + Object.keys(input.runbooks).length,
    findings,
  }
}

export async function collectMaprangTestPlanAuditResult(): Promise<TestPlanAuditResult> {
  const runbooks = Object.fromEntries(
    await Promise.all(runbookFiles.map(async (file) => [file, await readRepoFile(file)] as const)),
  )

  return auditMaprangTestPlan({
    testPlan: await readRepoFile(testPlanPath),
    runbooks,
  })
}

export async function runMaprangTestPlanAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectMaprangTestPlanAuditResult()

  if (result.findings.length > 0) {
    writeError('Maprang test plan audit failed:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - ตรวจ Maprang test plan แล้ว (${result.checkedFiles} files)`)
  return 0
}

if (import.meta.main) {
  process.exit(await runMaprangTestPlanAudit())
}
