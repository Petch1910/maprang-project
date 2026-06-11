import { describe, expect, test } from 'bun:test'
import {
  auditMaprangTestPlan,
  collectMaprangTestPlanAuditResult,
  runMaprangTestPlanAudit,
} from './test-plan-audit'

const completeTestPlan = [
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
].join('\n')

const completeRunbook = 'PostgreSQL\nPrisma\nBun\nlocal/mock-roleplay'

describe('Maprang test plan audit', () => {
  test('rejects source-of-truth plans that drop required product gates', () => {
    const result = auditMaprangTestPlan({
      testPlan: completeTestPlan.replace('bun run production:check', ''),
      runbooks: {
        'START_HERE.md': completeRunbook,
        'RUN_NOW.md': completeRunbook,
        'HOW_TO_RUN.md': completeRunbook,
      },
    })

    expect(result.findings).toContain(
      'docs/MAPRANG_TEST_PLAN.md missing required source-of-truth snippet: bun run production:check',
    )
  })

  test('rejects stale stack and scratch component references', () => {
    const result = auditMaprangTestPlan({
      testPlan: `${completeTestPlan}\nHono\nCreatorStudioPageNew`,
      runbooks: {
        'START_HERE.md': `${completeRunbook}\nDrizzle`,
        'RUN_NOW.md': completeRunbook,
        'HOW_TO_RUN.md': completeRunbook,
      },
    })

    expect(result.findings).toEqual(
      expect.arrayContaining([
        'docs/MAPRANG_TEST_PLAN.md still contains stale/current-source-forbidden snippet: Hono',
        'docs/MAPRANG_TEST_PLAN.md still contains stale/current-source-forbidden snippet: CreatorStudioPageNew',
        'START_HERE.md still contains stale/current-source-forbidden snippet: Drizzle',
      ]),
    )
  })

  test('runs the committed Maprang test plan audit through an importable runner', async () => {
    const result = await collectMaprangTestPlanAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runMaprangTestPlanAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.checkedFiles).toBe(4)
    expect(result.findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - ตรวจ Maprang test plan แล้ว')
    expect(errors).toEqual([])
  })
})
