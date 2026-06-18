import { spawn, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

export type LocalServerStartupOptions = {
  skipDocker?: boolean
  skipMigrate?: boolean
  skipSeed?: boolean
  backendHost?: string
  backendPort?: number
  frontendHost?: string
  frontendPort?: number
}

export type LocalServerCommand = {
  label: string
  cwd: string
  command: string
  args: string[]
  env?: Record<string, string>
  longRunning?: boolean
}

export type LocalServerStartupPlan = {
  setup: LocalServerCommand[]
  services: LocalServerCommand[]
  urls: {
    backend: string
    frontend: string
  }
}

function numberOption(value: string | undefined, fallback: number) {
  if (!value) return fallback
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export function parseLocalServerStartupArgs(args: string[]): LocalServerStartupOptions {
  const valueAfter = (name: string) => {
    const index = args.indexOf(name)
    return index >= 0 ? args[index + 1] : undefined
  }

  return {
    skipDocker: args.includes('--skip-docker'),
    skipMigrate: args.includes('--skip-migrate'),
    skipSeed: args.includes('--skip-seed'),
    backendHost: valueAfter('--backend-host') ?? '127.0.0.1',
    backendPort: numberOption(valueAfter('--backend-port'), 3001),
    frontendHost: valueAfter('--frontend-host') ?? '127.0.0.1',
    frontendPort: numberOption(valueAfter('--frontend-port'), 5173),
  }
}

export function buildLocalServerStartupPlan(options: LocalServerStartupOptions = {}): LocalServerStartupPlan {
  const backendHost = options.backendHost ?? '127.0.0.1'
  const backendPort = options.backendPort ?? 3001
  const frontendHost = options.frontendHost ?? '127.0.0.1'
  const frontendPort = options.frontendPort ?? 5173
  const backendUrl = `http://${backendHost}:${backendPort}`
  const frontendUrl = `http://${frontendHost}:${frontendPort}`

  const setup: LocalServerCommand[] = []
  if (!options.skipDocker) {
    setup.push({
      label: 'Start PostgreSQL',
      cwd: root,
      command: 'docker',
      args: ['compose', 'up', '-d', 'postgres'],
    })
  }
  if (!options.skipMigrate) {
    setup.push({
      label: 'Run Prisma migrations',
      cwd: join(root, 'apps/backend'),
      command: 'bunx',
      args: ['prisma', 'migrate', 'deploy'],
    })
  }
  if (!options.skipSeed) {
    setup.push({
      label: 'Seed local QA data',
      cwd: root,
      command: 'bun',
      args: ['run', 'qa:seed'],
    })
  }

  return {
    setup,
    services: [
      {
        label: 'Backend local server',
        cwd: join(root, 'apps/backend'),
        command: 'bun',
        args: ['run', 'start'],
        env: {
          HOST: backendHost,
          PORT: String(backendPort),
          LOCAL_CHAT_PROVIDER: '1',
          CHAT_PROVIDER: 'local',
          LOCAL_CHAT_MODEL_NAME: 'local/mock-roleplay',
        },
        longRunning: true,
      },
      {
        label: 'Frontend local server',
        cwd: join(root, 'apps/frontend'),
        command: 'bun',
        args: ['run', 'dev', '--', '--host', frontendHost, '--port', String(frontendPort)],
        env: {
          VITE_API_BASE_URL: backendUrl,
        },
        longRunning: true,
      },
    ],
    urls: {
      backend: backendUrl,
      frontend: frontendUrl,
    },
  }
}

function formatCommand(command: LocalServerCommand) {
  const envPrefix = command.env
    ? `${Object.entries(command.env)
        .map(([key, value]) => `${key}=${value}`)
        .join(' ')} `
    : ''
  return `${envPrefix}${command.command} ${command.args.join(' ')}`
}

function runOneShot(command: LocalServerCommand) {
  return new Promise<void>((resolve, reject) => {
    console.log(`รัน - ${command.label}: ${formatCommand(command)}`)
    const child = spawn(command.command, command.args, {
      cwd: command.cwd,
      env: { ...process.env, ...command.env },
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command.label} failed with exit code ${code}`))
    })
    child.on('error', reject)
  })
}

function startService(command: LocalServerCommand) {
  console.log(`เปิด - ${command.label}: ${formatCommand(command)}`)
  return spawn(command.command, command.args, {
    cwd: command.cwd,
    env: { ...process.env, ...command.env },
    shell: process.platform === 'win32',
    stdio: 'inherit',
  })
}

async function runLocalServerStartup(args: string[]) {
  const plan = buildLocalServerStartupPlan(parseLocalServerStartupArgs(args))

  for (const command of plan.setup) {
    await runOneShot(command)
  }

  const children: ChildProcess[] = plan.services.map(startService)
  console.log(`พร้อมเปิดใช้งาน: frontend ${plan.urls.frontend}`)
  console.log(`backend: ${plan.urls.backend}`)
  console.log('กด Ctrl+C เพื่อปิด backend/frontend ที่เปิดจากคำสั่งนี้')

  await new Promise<void>((resolve, reject) => {
    let settled = false
    const stop = () => {
      for (const child of children) child.kill()
      if (!settled) {
        settled = true
        resolve()
      }
    }
    process.once('SIGINT', stop)
    process.once('SIGTERM', stop)
    for (const child of children) {
      child.on('exit', (code) => {
        if (!settled && code && code !== 0) {
          settled = true
          for (const other of children) if (other !== child) other.kill()
          reject(new Error(`local service exited with code ${code}`))
        }
      })
      child.on('error', (error) => {
        if (!settled) {
          settled = true
          for (const other of children) if (other !== child) other.kill()
          reject(error)
        }
      })
    }
  })
}

if (import.meta.main) {
  try {
    await runLocalServerStartup(Bun.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'เปิด local server ไม่สำเร็จ')
    process.exit(1)
  }
}
