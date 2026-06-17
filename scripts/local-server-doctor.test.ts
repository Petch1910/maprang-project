import { describe, expect, test } from 'bun:test'
import { collectLocalServerDoctorChecks, formatLocalServerDoctorReport } from './local-server-doctor'

const validInput = {
  packageJson: JSON.stringify({
    scripts: {
      'qa:full': 'bun run qa:local && bun run e2e:smoke && bun run qa:seed',
      'qa:local': 'bun run qa:repo && bun run qa:seed && bun run smoke:doctor && bun run smoke:local && bun run api:smoke',
      'qa:repo': 'bun run local:up:test && bun run local:db:test && bun run local:doctor:test && bun run predeploy:check',
      'ngrok:proxy': 'bun scripts/ngrok-staging-proxy.ts',
      'local:up': 'bun scripts/local-server-up.ts',
      'local:up:test': 'bun test scripts/local-server-up.test.ts',
      'local:db:backup': 'bun scripts/local-db-backup.ts backup',
      'local:db:restore': 'bun scripts/local-db-backup.ts restore',
      'local:db:test': 'bun test scripts/local-db-backup.test.ts',
      'local:doctor': 'bun scripts/local-server-doctor.ts',
      'local:doctor:test': 'bun test scripts/local-server-doctor.test.ts',
    },
  }),
  gitignore: ['/runtime/', '/backups/', '*.dump', '*.backup'].join('\n'),
  localRunbook: [
    'bun run qa:full',
    'docker compose up -d postgres',
    'bunx prisma migrate deploy',
    'bun run ngrok:proxy',
    'bun run local:db:backup',
    'bun run local:db:restore',
    '--confirm-restore',
    '/backups/',
    '*.dump',
    'สถานะงาน Local Server Tasks',
    'Operator checklist',
    'bun run local:up',
    '--backend-port',
    '--frontend-port',
    'firewall',
    '/admin/health',
    'future/external',
  ].join('\n'),
  remainingPlan: ['Local Server, Ngrok Preview, และ Production', 'local server เปิดแล้ว `bun run qa:full` ผ่าน', 'docs/LOCAL_SERVER_RUNBOOK.md'].join('\n'),
}

describe('local server doctor', () => {
  test('passes complete local server wiring', () => {
    const checks = collectLocalServerDoctorChecks(validInput)
    expect(checks.every((check) => check.ok)).toBe(true)
    expect(formatLocalServerDoctorReport(checks)).toContain('7/7 passed')
    expect(formatLocalServerDoctorReport(checks)).toContain('bun run qa:full')
  })

  test('flags missing runtime artifact ignores', () => {
    const checks = collectLocalServerDoctorChecks({ ...validInput, gitignore: '/runtime/' })
    expect(checks.find((check) => check.label === 'Runtime artifacts ignored')?.ok).toBe(false)
    expect(formatLocalServerDoctorReport(checks)).toContain('FAIL Runtime artifacts ignored')
  })

  test('flags stale plan target', () => {
    const checks = collectLocalServerDoctorChecks({ ...validInput, remainingPlan: 'Staging และ Production' })
    expect(checks.find((check) => check.label === 'Remaining plan target')?.ok).toBe(false)
  })

  test('flags stale local server task backlog wording', () => {
    const checks = collectLocalServerDoctorChecks({
      ...validInput,
      localRunbook: `${validInput.localRunbook}\nงานที่ควรทำต่อถ้าเป้าหมายคือ local server`,
    })
    expect(checks.find((check) => check.label === 'Operator checklist')?.ok).toBe(false)
  })
})
