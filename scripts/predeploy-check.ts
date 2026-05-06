import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

type Check = {
  name: string
  run: () => Promise<void>
}

const requiredFiles = [
  'DEPLOY_RENDER.md',
  'DEPLOYMENT_QA.md',
  'PRODUCTION_SETUP.md',
  '.github/workflows/production-smoke.yml',
  'apps/backend/Dockerfile',
  'apps/backend/.env.production.example',
  'apps/backend/prisma/schema.prisma',
  'apps/frontend/.env.production.example',
  'apps/frontend/Dockerfile',
]

async function assertFile(path: string) {
  await access(join(root, path))
}

async function readRepoFile(path: string) {
  return readFile(join(root, path), 'utf8')
}

function requireIncludes(content: string, values: string[], file: string) {
  const missing = values.filter((value) => !content.includes(value))
  if (missing.length > 0) {
    throw new Error(`${file} is missing ${missing.join(', ')}`)
  }
}

const checks: Check[] = [
  {
    name: 'required deploy files exist',
    run: async () => {
      await Promise.all(requiredFiles.map(assertFile))
    },
  },
  {
    name: 'backend production env example covers critical settings',
    run: async () => {
      const content = await readRepoFile('apps/backend/.env.production.example')
      requireIncludes(
        content,
        [
          'NODE_ENV=production',
          'DATABASE_URL=',
          'OPENROUTER_API_KEY=',
          'CORS_ORIGINS=',
          'ADMIN_API_KEY=',
          'SUPABASE_URL=',
          'SUPABASE_JWT_ISSUER=',
          'SUPABASE_ANON_KEY=',
          'SUPABASE_SERVICE_ROLE_KEY=',
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
        ],
        'apps/backend/.env.production.example',
      )
    },
  },
  {
    name: 'frontend production env example covers critical settings',
    run: async () => {
      const content = await readRepoFile('apps/frontend/.env.production.example')
      requireIncludes(
        content,
        ['VITE_API_BASE_URL=', 'VITE_SUPABASE_URL=', 'VITE_SUPABASE_ANON_KEY='],
        'apps/frontend/.env.production.example',
      )
    },
  },
  {
    name: 'dockerfiles expose expected services',
    run: async () => {
      const backend = await readRepoFile('apps/backend/Dockerfile')
      const frontend = await readRepoFile('apps/frontend/Dockerfile')
      requireIncludes(backend, ['RUN bunx prisma generate', 'EXPOSE 3000', 'CMD ["bun", "run", "start"]'], 'apps/backend/Dockerfile')
      requireIncludes(frontend, ['bun run build', 'FROM nginx', 'EXPOSE 80'], 'apps/frontend/Dockerfile')
    },
  },
  {
    name: 'required migrations are present',
    run: async () => {
      const migrations = await readdir(join(root, 'apps/backend/prisma/migrations'))
      const required = [
        '20260506113000_reports',
        '20260506123000_admin_audit_logs',
        '20260506160000_token_transactions',
        '20260506173000_user_content_settings',
      ]
      const missing = required.filter((name) => !migrations.includes(name))
      if (missing.length > 0) throw new Error(`missing migration(s): ${missing.join(', ')}`)
    },
  },
  {
    name: 'production docs mention migration, smoke tests, and signed storage',
    run: async () => {
      const setup = await readRepoFile('PRODUCTION_SETUP.md')
      const render = await readRepoFile('DEPLOY_RENDER.md')
      requireIncludes(
        setup,
        [
          'bunx prisma migrate deploy',
          'SMOKE_API_BASE_URL',
          'SMOKE_ADMIN_API_KEY',
          'SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT',
          'SUPABASE_ANON_KEY',
          'SUPABASE_STORAGE_ACCESS=signed',
          '/ready',
        ],
        'PRODUCTION_SETUP.md',
      )
      requireIncludes(
        render,
        ['Health check path: `/ready`', 'bunx prisma migrate deploy', 'SUPABASE_ANON_KEY', 'SUPABASE_STORAGE_ACCESS=signed'],
        'DEPLOY_RENDER.md',
      )
    },
  },
  {
    name: 'production smoke workflow is available',
    run: async () => {
      const workflow = await readRepoFile('.github/workflows/production-smoke.yml')
      requireIncludes(
        workflow,
        [
          'workflow_dispatch',
          'SMOKE_API_BASE_URL',
          'SMOKE_ADMIN_API_KEY',
          'SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT',
          'bun run smoke:ready',
          'bun run smoke:local',
        ],
        '.github/workflows/production-smoke.yml',
      )
    },
  },
]

const results: Array<{ name: string; ok: boolean; error?: string }> = []
for (const check of checks) {
  try {
    await check.run()
    results.push({ name: check.name, ok: true })
  } catch (error) {
    results.push({ name: check.name, ok: false, error: error instanceof Error ? error.message : String(error) })
  }
}

for (const result of results) {
  console.log(`${result.ok ? 'ok' : 'fail'} - ${result.name}${result.error ? `: ${result.error}` : ''}`)
}

if (results.some((result) => !result.ok)) process.exit(1)
