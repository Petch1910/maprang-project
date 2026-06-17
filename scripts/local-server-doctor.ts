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
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md ต้องบอกวิธีเปิด local server, migration, QA gate และ Ngrok preview',
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
      detail: 'package.json ต้องมีคำสั่งเปิด local server, สำรอง/กู้คืนฐานข้อมูล local, local QA, Ngrok proxy และ local doctor',
    },
    {
      label: 'QA gate wiring',
      ok:
        input.packageJson.includes('"qa:repo"') &&
        input.packageJson.includes('bun run local:up:test') &&
        input.packageJson.includes('bun run local:db:test') &&
        input.packageJson.includes('bun run local:doctor:test') &&
        input.packageJson.includes('bun run predeploy:check'),
      detail: 'qa:repo ต้องรัน local:up:test, local:db:test, local:doctor:test และ predeploy check',
    },
    {
      label: 'Runtime artifacts ignored',
      ok: includesAll(input.gitignore, ['/runtime/', '/backups/', '*.dump', '*.backup']),
      detail: 'runtime logs, local backups และ database dumps ต้องไม่เข้า source โดยไม่ตั้งใจ',
    },
    {
      label: 'Local database backup',
      ok: includesAll(input.localRunbook, ['bun run local:db:backup', 'bun run local:db:restore', '--confirm-restore', '/backups/', '*.dump']),
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md ต้องบอกวิธี backup/restore ฐานข้อมูล local และบังคับ confirm ก่อน restore',
    },
    {
      label: 'Operator checklist',
      ok:
        includesAll(input.localRunbook, [
          'สถานะงาน Local Server Tasks',
          'Operator checklist',
          'bun run local:up',
          '--backend-port',
          '--frontend-port',
          'firewall',
          '/admin/health',
          'future/external',
        ]) && !input.localRunbook.includes('งานที่ควรทำต่อถ้าเป้าหมายคือ local server'),
      detail: 'docs/LOCAL_SERVER_RUNBOOK.md ต้องแยกงาน local ที่ปิดแล้ว, operator checklist, และ future/external โดยไม่ทิ้งรายการค้างเก่า',
    },
    {
      label: 'Remaining plan target',
      ok: includesAll(input.remainingPlan, ['Local Server, Ngrok Preview, และ Production', 'local server เปิดแล้ว `bun run qa:full` ผ่าน', 'docs/LOCAL_SERVER_RUNBOOK.md']),
      detail: 'แผนหลักต้องแยก local server ออกจาก Ngrok preview และ cloud production',
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
