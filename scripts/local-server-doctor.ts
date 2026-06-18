import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

export type LocalServerDoctorInput = {
  packageJson: string
  gitignore: string
  localRunbook: string
  remainingPlan: string
}

export type LocalServerDoctorCheck = {
  label: string
  ok: boolean
  detail: string
}

function includesAll(content: string, values: string[]) {
  return values.every((value) => content.includes(value))
}

export function collectLocalServerDoctorChecks(input: LocalServerDoctorInput): LocalServerDoctorCheck[] {
  return [
    {
      label: 'Local runbook',
      ok: includesAll(input.localRunbook, ['bun run qa:full', 'docker compose up -d postgres', 'bunx prisma migrate deploy', 'bun run ngrok:proxy']),
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md must document local server startup, migration, QA gate, and Ngrok preview',
    },
    {
      label: 'Root scripts',
      ok: includesAll(input.packageJson, [
        '"qa:full"',
        '"qa:local"',
        '"ngrok:proxy"',
        '"local:up"',
        '"local:up:test"',
        '"local:db:backup"',
        '"local:db:restore"',
        '"local:db:test"',
        '"local:doctor"',
        '"local:doctor:test"',
      ]),
      detail: 'package.json must include local server, local database backup/restore, local QA, Ngrok proxy, and local doctor scripts',
    },
    {
      label: 'QA gate wiring',
      ok:
        input.packageJson.includes('"qa:repo"') &&
        input.packageJson.includes('bun run local:up:test') &&
        input.packageJson.includes('bun run local:db:test') &&
        input.packageJson.includes('bun run local:doctor:test') &&
        input.packageJson.includes('bun run predeploy:check'),
      detail: 'qa:repo must run local:up:test, local:db:test, local:doctor:test, and predeploy check',
    },
    {
      label: 'Runtime artifacts ignored',
      ok: includesAll(input.gitignore, ['/runtime/', '/backups/', '*.dump', '*.backup']),
      detail: 'runtime logs, local backups, and database dumps must stay out of source control',
    },
    {
      label: 'Local database backup',
      ok: includesAll(input.localRunbook, ['bun run local:db:backup', 'bun run local:db:restore', '--confirm-restore', '/backups/', '*.dump']),
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md must document local database backup/restore and require restore confirmation',
    },
    {
      label: 'Operator checklist',
      ok:
        includesAll(input.localRunbook, [
          'Completed Local Work',
          'Operator Checklist',
          'bun run local:up',
          '--backend-port',
          '--frontend-port',
          'Docker Desktop',
          '/admin/health',
          'Future / External',
        ]) && !input.localRunbook.includes('work to do next if local server is the target'),
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md must separate completed local work, operator checklist, and future/external work without stale backlog wording',
    },
    {
      label: 'Remaining plan target',
      ok: includesAll(input.remainingPlan, ['Local Server, Ngrok Preview, and Production', 'local server baseline passed `bun run qa:full`', 'docs/LOCAL_SERVER_RUNBOOK.md']),
      detail: 'the main plan must separate local server from Ngrok preview and cloud production',
    },
  ]
}

export function formatLocalServerDoctorReport(checks: LocalServerDoctorCheck[]) {
  const failed = checks.filter((check) => !check.ok)
  const lines = [
    `Maprang local server doctor: ${checks.length - failed.length}/${checks.length} passed`,
    ...checks.map((check) => `${check.ok ? 'PASS' : 'FAIL'} ${check.label}: ${check.detail}`),
  ]
  if (failed.length > 0) {
    lines.push(`Next: fix ${failed.map((check) => check.label).join(', ')} before treating this repo as local-server ready.`)
  } else {
    lines.push('Next: run bun run qa:full for runtime/browser verification, then use Ngrok only when public preview is needed.')
  }
  return lines.join('\n')
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

export async function runLocalServerDoctor() {
  const input: LocalServerDoctorInput = {
    packageJson: await readRepoFile('package.json'),
    gitignore: await readRepoFile('.gitignore'),
    localRunbook: await readRepoFile('docs/LOCAL_SERVER_RUNBOOK.md'),
    remainingPlan: await readRepoFile('docs/MAPRANG_REMAINING_DEVELOPMENT_PLAN.md'),
  }
  const checks = collectLocalServerDoctorChecks(input)
  console.log(formatLocalServerDoctorReport(checks))
  return checks.every((check) => check.ok) ? 0 : 1
}

if (import.meta.main) {
  process.exit(await runLocalServerDoctor())
}
