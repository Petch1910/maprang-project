import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { spawn } from 'node:child_process'

const root = join(import.meta.dir, '..')
const defaultBackupDir = join(root, 'backups')

export type LocalDbToolMode = 'backup' | 'restore'

export type LocalDbToolOptions = {
  mode: LocalDbToolMode
  file?: string
  backupDir?: string
  confirmRestore?: boolean
  database?: string
  user?: string
  service?: string
}

export type LocalDbCommandPlan = {
  mode: LocalDbToolMode
  file: string
  command: string
  args: string[]
  destructive: boolean
}

function timestampForFilename(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function valueAfter(args: string[], name: string) {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function stripBunSeparator(args: string[]) {
  return args.filter((arg) => arg !== '--')
}

export function parseLocalDbToolArgs(rawArgs: string[]): LocalDbToolOptions {
  const args = stripBunSeparator(rawArgs)
  const mode = args[0] === 'restore' ? 'restore' : 'backup'
  const positionalFile = args.find((arg, index) => index > 0 && !arg.startsWith('--'))

  return {
    mode,
    file: valueAfter(args, '--file') ?? positionalFile,
    backupDir: valueAfter(args, '--backup-dir'),
    confirmRestore: args.includes('--confirm-restore'),
    database: valueAfter(args, '--database'),
    user: valueAfter(args, '--user'),
    service: valueAfter(args, '--service'),
  }
}

export function buildLocalDbCommandPlan(options: LocalDbToolOptions, date = new Date()): LocalDbCommandPlan {
  const database = options.database ?? 'maprang_local'
  const user = options.user ?? 'admin'
  const service = options.service ?? 'postgres'
  const backupDir = options.backupDir ? resolve(root, options.backupDir) : defaultBackupDir
  const file =
    options.file ??
    join(backupDir, `maprang-local-${timestampForFilename(date)}.dump`)

  if (options.mode === 'restore') {
    return {
      mode: 'restore',
      file: resolve(root, file),
      command: 'docker',
      args: ['compose', 'exec', '-T', service, 'pg_restore', '-U', user, '-d', database, '--clean', '--if-exists', '--no-owner'],
      destructive: true,
    }
  }

  return {
    mode: 'backup',
    file: resolve(root, file),
    command: 'docker',
    args: ['compose', 'exec', '-T', service, 'pg_dump', '-U', user, '-d', database, '-Fc'],
    destructive: false,
  }
}

async function runBackup(plan: LocalDbCommandPlan) {
  await mkdir(dirname(plan.file), { recursive: true })

  await new Promise<void>((resolvePromise, reject) => {
    console.log(`สำรองฐานข้อมูล local ไปที่ ${plan.file}`)
    const child = spawn(plan.command, plan.args, {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    if (!child.stdout) {
      reject(new Error('ไม่สามารถอ่าน stdout จาก pg_dump ได้'))
      return
    }
    const output = createWriteStream(plan.file)
    child.stdout.pipe(output)
    child.on('error', reject)
    output.on('error', reject)
    child.on('exit', (code) => {
      output.end()
      if (code === 0) resolvePromise()
      else reject(new Error(`pg_dump failed with exit code ${code}`))
    })
  })
}

async function runRestore(plan: LocalDbCommandPlan, confirmRestore?: boolean) {
  if (!confirmRestore) {
    throw new Error('restore ต้องใส่ --confirm-restore เพราะคำสั่งนี้ล้างและเขียนทับ local database')
  }

  await new Promise<void>((resolvePromise, reject) => {
    console.log(`กู้คืนฐานข้อมูล local จาก ${plan.file}`)
    const child = spawn(plan.command, plan.args, {
      cwd: root,
      shell: process.platform === 'win32',
      stdio: ['pipe', 'inherit', 'inherit'],
    })
    if (!child.stdin) {
      reject(new Error('ไม่สามารถส่ง dump เข้า pg_restore ได้'))
      return
    }
    createReadStream(plan.file).pipe(child.stdin)
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`pg_restore failed with exit code ${code}`))
    })
  })
}

export async function runLocalDbTool(args: string[]) {
  const options = parseLocalDbToolArgs(args)
  const plan = buildLocalDbCommandPlan(options)

  if (plan.mode === 'restore') await runRestore(plan, options.confirmRestore)
  else await runBackup(plan)

  console.log(`เสร็จ - ${plan.mode === 'backup' ? 'สำรอง' : 'กู้คืน'} local database`)
}

if (import.meta.main) {
  try {
    await runLocalDbTool(Bun.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'จัดการ local database ไม่สำเร็จ')
    process.exit(1)
  }
}
