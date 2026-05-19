import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

type Check = {
  name: string
  run: () => Promise<void>
}

const requiredFiles = [
  'AGENTS.md',
  'agent.md',
  'DEPLOY_RENDER.md',
  'DEPLOYMENT_QA.md',
  'PRODUCTION_SETUP.md',
  'ROUTE_MENU_AUDIT.md',
  'SECURITY_CHECKLIST.md',
  'STAGING_RUNBOOK.md',
  'knowledge/README.md',
  'knowledge/raw/README.md',
  'knowledge/wiki/INDEX.md',
  'knowledge/structured/chat-style-guide.json',
  'knowledge/structured/creator-guides.json',
  'knowledge/structured/relationship-rules.json',
  'knowledge/structured/scene-rules.json',
  'knowledge/structured/content-policy.json',
  'evals/README.md',
  'evals/golden-roleplay.json',
  'evals/promptfoo.roleplay.yaml',
  'evals/promptfoo-templates/roleplay-context.txt',
  'memory/README.md',
  'memory/working-context.md',
  'memory/deploy-blockers.md',
  'memory/qa-status.md',
  '.github/workflows/production-smoke.yml',
  'apps/backend/Dockerfile',
  'apps/backend/.env.production.example',
  'apps/backend/prisma/schema.prisma',
  'apps/frontend/.env.production.example',
  'apps/frontend/Dockerfile',
  'scripts/deploy-env-doctor.ts',
  'scripts/deploy-env-doctor-self-test.ts',
  'scripts/eval-local.ts',
  'scripts/knowledge-audit.ts',
  'scripts/memory-audit.ts',
  'scripts/route-menu-doc-check.ts',
  'scripts/supabase-storage-setup.ts',
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
    name: 'agent handoff guide is available',
    run: async () => {
      const agentEntry = await readRepoFile('AGENTS.md')
      const agentGuide = await readRepoFile('agent.md')
      requireIncludes(
        agentEntry,
        [
          'agent.md',
          'Scope',
          'When The User Says "ทำต่อ"',
          'memory/working-context.md',
          'memory/deploy-blockers.md',
          'Minimum Checks',
          'bun run predeploy:check',
          'bun run secrets:check',
          'git diff --check',
          'Commit And Push',
          'git status --short',
          'Do not commit secrets',
        ],
        'AGENTS.md',
      )
      requireIncludes(
        agentGuide,
        [
          'Maprang AI Agent Guide',
          'Current Status',
          'Product Direction',
          'Safety And Content Rules',
          'Core Systems To Protect',
          'Relationship Engine',
          'Scene Runtime',
          'Prompt/Context Engine',
          'QA Commands',
          'Production Blockers',
          'Definition Of Done',
        ],
        'agent.md',
      )
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
          'CHAT_PROVIDER_LIVE_VERIFIED=0',
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=320',
          'CHAT_PROVIDER_RETRY_ATTEMPTS=2',
          'CREATOR_DRAFT_RETRY_ATTEMPTS=3',
          'CORS_ORIGINS=',
          'ADMIN_API_KEY=',
          'SUPABASE_URL=',
          'SUPABASE_JWT_ISSUER=',
          'SUPABASE_ANON_KEY=',
          'SUPABASE_SERVICE_ROLE_KEY=',
          'STORAGE_PROVIDER=supabase',
          'SUPABASE_STORAGE_BUCKET=avatars',
          'SUPABASE_STORAGE_ACCESS=signed',
          'SUPABASE_SIGNED_URL_EXPIRES_IN=3600',
          'IMAGE_GENERATION_API_KEY=',
          'IMAGE_GENERATION_MODEL=gpt-image-1.5',
          'IMAGE_GENERATION_LIVE_VERIFIED=0',
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
      requireIncludes(backend, ['COPY knowledge ./knowledge', 'RUN bunx prisma generate', 'EXPOSE 3000', 'CMD ["bun", "run", "start"]'], 'apps/backend/Dockerfile')
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
        '20260508210300_add_creator_draft',
        '20260509093000_add_user_persona',
        '20260513103000_add_lore_parent_index',
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
          'SMOKE_IMAGE_LIVE=1',
          'SUPABASE_ANON_KEY',
          'SUPABASE_STORAGE_ACCESS=signed',
          'bun run supabase:storage:setup',
          'IMAGE_GENERATION_API_KEY or OPENAI_API_KEY',
          'private bucket with `SUPABASE_STORAGE_ACCESS=signed`',
          '/ready',
        ],
        'PRODUCTION_SETUP.md',
      )
      requireIncludes(
        render,
        [
          'Health check path: `/ready`',
          'bunx prisma migrate deploy',
          'SUPABASE_ANON_KEY',
          'SUPABASE_STORAGE_ACCESS=signed',
          'IMAGE_GENERATION_API_KEY',
          'imageGenerationConfigured=true',
        ],
        'DEPLOY_RENDER.md',
      )
    },
  },
  {
    name: 'QA scripts cover seed and Playwright e2e smoke',
    run: async () => {
      const content = await readRepoFile('package.json')
      const frontendPackage = await readRepoFile('apps/frontend/package.json')
      const packageJson = JSON.parse(content) as { scripts?: Record<string, string> }
      requireIncludes(
        content,
        [
          '"api:audit"',
          '"route-menu:audit"',
          '"memory:audit"',
          '"knowledge:audit"',
          '"eval:local"',
          '"eval:promptfoo"',
          '"security:audit"',
          '"api:smoke"',
          '"api:smoke:live"',
          '"deploy:doctor"',
          '"deploy:doctor:self-test"',
          '"qa:seed"',
          '"e2e:smoke"',
          '"qa:full"',
          '"staging:check"',
          '"staging:verify"',
          '"smoke:image"',
          '"smoke:image:live"',
          '"supabase:storage:setup"',
          '"supabase:storage:check"',
          '"production:check"',
          '@playwright/test',
        ],
        'package.json',
      )
      const smokeLive = packageJson.scripts?.['smoke:live'] ?? ''
      const qaLive = packageJson.scripts?.['qa:live'] ?? ''
      const stagingCheck = packageJson.scripts?.['staging:check'] ?? ''
      const stagingVerify = packageJson.scripts?.['staging:verify'] ?? ''
      const productionCheck = packageJson.scripts?.['production:check'] ?? ''
      if (smokeLive.includes('smoke:chat')) {
        throw new Error('package.json smoke:live should use api:smoke:live once instead of calling smoke:chat separately')
      }
      if (qaLive.includes('smoke:chat') || qaLive.includes('smoke:image')) {
        throw new Error('package.json qa:live should not duplicate provider calls outside api:smoke:live')
      }
      if (!stagingCheck.includes('qa:full') || !stagingCheck.includes('supabase:storage:check') || !stagingCheck.includes('--require-admin')) {
        throw new Error('package.json staging:check must cover qa:full, Supabase storage, and admin API smoke')
      }
      if (
        !stagingVerify.includes('bun scripts/smoke-doctor.ts --strict-staging') ||
        !stagingVerify.includes('supabase:storage:check') ||
        !stagingVerify.includes('smoke:ready') ||
        !stagingVerify.includes('--require-admin')
      ) {
        throw new Error('package.json staging:verify must require strict staging smoke doctor, Supabase storage, readiness, and admin API smoke')
      }
      if (!productionCheck.includes('supabase:storage:check')) {
        throw new Error('package.json production:check must verify Supabase signed avatar storage')
      }
      if (!productionCheck.includes('--require-admin')) {
        throw new Error('package.json production:check must require admin smoke checks')
      }
      requireIncludes(
        frontendPackage,
        ['frontend-static-audit.ts', 'frontend-route-audit.ts', 'check-frontend-bundles.ts'],
        'apps/frontend/package.json',
      )
    },
  },
  {
    name: 'project memory vault is available',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const readme = await readRepoFile('README.md')
      const memoryReadme = await readRepoFile('memory/README.md')
      const workingContext = await readRepoFile('memory/working-context.md')
      const deployBlockers = await readRepoFile('memory/deploy-blockers.md')
      requireIncludes(packageJson, ['"memory:audit"', 'bun scripts/memory-audit.ts', 'bun run memory:audit'], 'package.json')
      requireIncludes(readme, ['memory/README.md', 'Project Memory'], 'README.md')
      requireIncludes(memoryReadme, ['Never store secrets', 'Update Protocol', 'Working Context', 'Deploy Blockers'], 'memory/README.md')
      requireIncludes(workingContext, ['Current Local Status', 'Current Production Status'], 'memory/working-context.md')
      requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED'], 'memory/deploy-blockers.md')
    },
  },
  {
    name: 'project knowledge layer is available',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const readme = await readRepoFile('README.md')
      const knowledgeReadme = await readRepoFile('knowledge/README.md')
      const wikiIndex = await readRepoFile('knowledge/wiki/INDEX.md')
      const backendKnowledge = await readRepoFile('apps/backend/src/knowledge.service.ts')
      requireIncludes(packageJson, ['"knowledge:audit"', 'bun scripts/knowledge-audit.ts', 'bun run knowledge:audit'], 'package.json')
      requireIncludes(readme, ['Knowledge Layer', 'knowledge/README.md', 'bun run knowledge:audit'], 'README.md')
      requireIncludes(knowledgeReadme, ['Runtime Usage', 'Structured Packs', 'Never store secrets'], 'knowledge/README.md')
      requireIncludes(wikiIndex, ['Maprang Product', 'Relationship Engine', 'Creator Studio', 'Production Deploy'], 'knowledge/wiki/INDEX.md')
      requireIncludes(
        backendKnowledge,
        ['buildChatKnowledgePrompt', 'buildCreatorKnowledgePrompt', 'structuredKnowledgeHealth'],
        'apps/backend/src/knowledge.service.ts',
      )
    },
  },
  {
    name: 'project eval foundation is available',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const readme = await readRepoFile('README.md')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const evalReadme = await readRepoFile('evals/README.md')
      const golden = await readRepoFile('evals/golden-roleplay.json')
      const ciWorkflow = await readRepoFile('.github/workflows/ci.yml')
      requireIncludes(packageJson, ['"eval:local"', 'bun scripts/eval-local.ts', '"eval:promptfoo"'], 'package.json')
      requireIncludes(readme, ['Evaluation Layer', 'bun run eval:local', 'evals/golden-roleplay.json'], 'README.md')
      requireIncludes(deploymentQa, ['bun run eval:local', 'deterministic prompt assembly'], 'DEPLOYMENT_QA.md')
      requireIncludes(evalReadme, ['Golden Dataset', 'Promptfoo', 'No secrets'], 'evals/README.md')
      requireIncludes(
        golden,
        ['roleplay-depth-and-knowledge', 'prompt-injection-defense', 'relationship-scene-continuity'],
        'evals/golden-roleplay.json',
      )
      requireIncludes(ciWorkflow, ['bun run eval:local'], '.github/workflows/ci.yml')
    },
  },
  {
    name: 'deployment QA covers relationship contracts',
    run: async () => {
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const routeMenuAudit = await readRepoFile('apps/frontend/src/lib/routeMenuAudit.ts')
      const e2eSmoke = await readRepoFile('tests/e2e/maprang-smoke.spec.ts')
      requireIncludes(
        deploymentQa,
        [
          '/relationship/presets?surface=contract',
          'safe-family-bond',
          'relationship_seed=<selected-id>',
          'relationship preset picker',
        ],
        'DEPLOYMENT_QA.md',
      )
      requireIncludes(routeMenuAudit, ['Relationship Contract', 'relationship_seed'], 'apps/frontend/src/lib/routeMenuAudit.ts')
      requireIncludes(e2eSmoke, ['character-seed-rival', 'relationship_seed=rival'], 'tests/e2e/maprang-smoke.spec.ts')
    },
  },
  {
    name: 'local smoke cannot hide live image verification',
    run: async () => {
      const packageJsonContent = await readRepoFile('package.json')
      const packageJson = JSON.parse(packageJsonContent) as { scripts?: Record<string, string> }
      const apiSmoke = await readRepoFile('scripts/api-smoke.ts')

      requireIncludes(
        apiSmoke,
        ['const live = process.argv.includes(\'--live\')', 'const requireLiveImage = process.argv.includes(\'--require-live-image\')', 'imageOnly: !live', 'skipImageProvider: !live', 'if (requireLiveImage) throw new Error(issue)'],
        'scripts/api-smoke.ts',
      )
      if (apiSmoke.includes('skipImageProvider: true')) {
        throw new Error('scripts/api-smoke.ts must only skip the image provider through skipImageProvider: !live')
      }
      if (!packageJson.scripts?.['api:smoke:live']?.includes('--live --require-live-image')) {
        throw new Error('package.json api:smoke:live must require a real live image provider check')
      }
      if (!packageJson.scripts?.['production:check']?.includes('bun scripts/smoke-doctor.ts --strict-production')) {
        throw new Error('package.json production:check must run smoke-doctor in strict production mode')
      }
      if (!packageJson.scripts?.['staging:verify']?.includes('bun scripts/smoke-doctor.ts --strict-staging')) {
        throw new Error('package.json staging:verify must run smoke-doctor in strict staging mode')
      }
    },
  },
  {
    name: 'security checklist and audit script are available',
    run: async () => {
      const checklist = await readRepoFile('SECURITY_CHECKLIST.md')
      const packageJson = await readRepoFile('package.json')
      requireIncludes(
        checklist,
        ['SQL Injection', 'Broken Access Control', 'Prompt Control', 'bun run security:audit', 'Production Must-Pass'],
        'SECURITY_CHECKLIST.md',
      )
      requireIncludes(packageJson, ['"security:audit"', 'backend-security-audit.ts', '"api:audit"', 'api-route-audit.ts'], 'package.json')
    },
  },
  {
    name: 'route/menu audit and staging runbook are available',
    run: async () => {
      const audit = await readRepoFile('ROUTE_MENU_AUDIT.md')
      const staging = await readRepoFile('STAGING_RUNBOOK.md')
      requireIncludes(
        audit,
        ['/admin/health', 'Route/Menu Audit', 'bun run route-menu:audit', 'bun run e2e:smoke', 'Creator Studio', 'Moderation'],
        'ROUTE_MENU_AUDIT.md',
      )
      requireIncludes(
        staging,
        [
          'Supabase Staging',
          'SUPABASE_STORAGE_ACCESS=signed',
          'bun run supabase:storage:setup',
          'Render',
          'Railway',
          'E2E_BASE_URL',
          '/ready',
          'bun run staging:verify',
        ],
        'STAGING_RUNBOOK.md',
      )
    },
  },
  {
    name: 'production smoke workflow is available',
    run: async () => {
      const workflow = await readRepoFile('.github/workflows/production-smoke.yml')
      const ciWorkflow = await readRepoFile('.github/workflows/ci.yml')
      requireIncludes(
        workflow,
        [
          'workflow_dispatch',
          'SMOKE_API_BASE_URL',
          'SMOKE_ADMIN_API_KEY',
          'SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT',
          'SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          '--require-admin',
          'bun install --frozen-lockfile',
          'bun scripts/smoke-doctor.ts --strict-production',
          'bun run supabase:storage:check',
          'bun scripts/api-smoke.ts --require-admin',
          'bun scripts/api-smoke.ts --live --require-live-image --require-admin',
          'bun run smoke:image:live',
          'bun run smoke:ready',
          'bun run smoke:local',
          'bun run smoke:image',
        ],
        '.github/workflows/production-smoke.yml',
      )
      requireIncludes(
        ciWorkflow,
        [
          'bun run predeploy:check',
          'bun run deploy:doctor:self-test',
          'bun run memory:audit',
          'bun run knowledge:audit',
          'bun run eval:local',
        ],
        '.github/workflows/ci.yml',
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
