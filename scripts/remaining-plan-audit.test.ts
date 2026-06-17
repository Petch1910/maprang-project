import { describe, expect, test } from 'bun:test'
import {
  auditRemainingDevelopmentPlan,
  collectRemainingPlanAuditResult,
  runRemainingPlanAudit,
} from './remaining-plan-audit'

const completePlan = [
  '# แผนงานที่เหลือของ Maprang AI',
  'Latest local gate: `bun run qa:full` ผ่าน',
  '## ระยะที่ 10 Local Server, Ngrok Preview, และ Production',
  '## เกณฑ์ Definition Of Done รวม',
  '- `R0.1` ตรวจไฟล์ทั้งหมด — done locally on 2026-06-17.',
  '- `C1.1` ตรวจ composer — ผ่าน locally on 2026-06-17.',
  '- `CR2.1` ตรวจ creator readiness — เสร็จ locally on 2026-06-17.',
  '- `A5.6` live provider gallery reuse — future/external.',
  '- `W6.4` server encrypted BYOK vault — done locally on 2026-06-17.',
  '- `D10.1` deploy backend HTTPS URL จริง — future/external.',
].join('\n')

describe('remaining development plan audit', () => {
  test('accepts closed local tasks and explicit future/external tasks', () => {
    const result = auditRemainingDevelopmentPlan({ plan: completePlan })

    expect(result.findings).toEqual([])
    expect(result.checkedTasks).toBe(6)
    expect(result.localTasks).toBe(4)
    expect(result.externalTasks).toBe(2)
  })

  test('flags local tasks without done evidence', () => {
    const result = auditRemainingDevelopmentPlan({
      plan: completePlan.replace('— done locally on 2026-06-17.', 'ต้องตรวจต่อ'),
    })

    expect(result.findings).toContain(
      'docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md:5 R0.1 is a local/repo-owned task without done evidence',
    )
  })

  test('flags external tasks without future/external state', () => {
    const result = auditRemainingDevelopmentPlan({
      plan: completePlan.replace('`D10.1` deploy backend HTTPS URL จริง — future/external.', '`D10.1` deploy backend HTTPS URL จริง — pending.'),
    })

    expect(result.findings).toContain(
      'docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md:10 D10.1 is external but is not marked future/external',
    )
  })

  test('requires source-of-truth snippets for local and deploy gates', () => {
    const result = auditRemainingDevelopmentPlan({
      plan: completePlan.replace('Local Server, Ngrok Preview', 'Local Server และ Production'),
    })

    expect(result.findings).toContain(
      'docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md missing required snippet: Local Server, Ngrok Preview',
    )
  })

  test('runs the committed remaining plan audit through an importable runner', async () => {
    const result = await collectRemainingPlanAuditResult()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runRemainingPlanAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(result.checkedTasks).toBeGreaterThan(0)
    expect(result.findings).toEqual([])
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ผ่าน - ตรวจ remaining development plan แล้ว')
    expect(errors).toEqual([])
  })
})
