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
  'RELEASE_HANDOFF.md',
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
  'memory/production/checklist.md',
  '.github/workflows/production-smoke.yml',
  'apps/backend/Dockerfile',
  'apps/backend/.env.production.example',
  'apps/backend/prisma/schema.prisma',
  'apps/frontend/.env.production.example',
  'apps/frontend/Dockerfile',
  'scripts/backend-db-check.test.ts',
  'scripts/deploy-env-doctor.ts',
  'scripts/deploy-env-doctor.test.ts',
  'scripts/deploy-env-doctor-self-test.ts',
  'scripts/deploy-readiness.ts',
  'scripts/deploy-readiness.test.ts',
  'scripts/deploy-status.ts',
  'scripts/deploy-status.test.ts',
  'scripts/eval-local.ts',
  'scripts/eval-local.test.ts',
  'scripts/check-frontend-bundles.test.ts',
  'scripts/knowledge-audit.ts',
  'scripts/markdown-audit-helpers.ts',
  'scripts/markdown-audit-helpers.test.ts',
  'scripts/memory-audit.ts',
  'scripts/api-smoke-helpers.ts',
  'scripts/api-smoke-helpers.test.ts',
  'scripts/api-route-audit.test.ts',
  'scripts/release-handoff-check.ts',
  'scripts/release-handoff-check.test.ts',
  'scripts/frontend-static-audit.test.ts',
  'scripts/frontend-route-audit.test.ts',
  'scripts/route-menu-doc-check.ts',
  'scripts/route-menu-doc-check.test.ts',
  'scripts/import-cycle-audit.ts',
  'scripts/import-cycle-audit.test.ts',
  'scripts/backend-security-audit.test.ts',
  'scripts/smoke-helpers.test.ts',
  'scripts/provider-smoke-guards.test.ts',
  'scripts/smoke-doctor.test.ts',
  'scripts/readiness-smoke.test.ts',
  'scripts/image-smoke.test.ts',
  'scripts/live-chat-smoke.test.ts',
  'scripts/local-smoke.test.ts',
  'scripts/e2e-smoke.test.ts',
  'scripts/check-secrets.test.ts',
  'scripts/secret-patterns.ts',
  'scripts/secret-patterns.test.ts',
  'scripts/supabase-storage-setup.ts',
  'scripts/supabase-storage-setup.test.ts',
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

function forbidIncludes(content: string, values: string[], file: string) {
  const present = values.filter((value) => content.includes(value))
  if (present.length > 0) {
    throw new Error(`${file} contains stale text ${present.join(', ')}`)
  }
}

const checks: Check[] = [
  {
    name: 'required deploy files exist',
    run: async () => {
      await Promise.all(requiredFiles.map(assertFile))
      const gitignore = await readRepoFile('.gitignore')
      requireIncludes(gitignore, ['.env.*', '!.env.example', '!.env.production.example'], '.gitignore')
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
          'Continue Requests',
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
          'bun run import-cycle:audit',
          'Production Blockers',
          'Definition Of Done',
          'Backend URL เป็น deployed HTTPS URL จริง',
          '`CORS_ORIGINS` เป็น frontend HTTPS domain จริง',
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
          'MODEL_MIN_ROLEPLAY_REPLY_CHARS=420',
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
    name: 'roleplay depth prompt guidance matches production defaults',
    run: async () => {
      const contextService = await readRepoFile('apps/backend/src/context.service.ts')
      const chatService = await readRepoFile('apps/backend/src/chat.service.ts')
      const chatStyleGuide = await readRepoFile('knowledge/structured/chat-style-guide.json')
      const backendEnv = await readRepoFile('apps/backend/src/env.ts')
      const backendEnvTest = await readRepoFile('apps/backend/src/env.test.ts')
      requireIncludes(
        contextService,
        ['write 4-6 short paragraphs', 'at least 5 complete sentences', '8-14 sentences'],
        'apps/backend/src/context.service.ts',
      )
      requireIncludes(chatService, ['3-5 short paragraphs'], 'apps/backend/src/chat.service.ts')
      requireIncludes(
        chatStyleGuide,
        ['write 4-6 short paragraphs', 'at least 5 complete sentences', '8-14 sentences'],
        'knowledge/structured/chat-style-guide.json',
      )
      forbidIncludes(
        contextService,
        ['write 3-6 short paragraphs', 'at least 4 complete sentences', '7-12 sentences'],
        'apps/backend/src/context.service.ts',
      )
      forbidIncludes(chatService, ['2-4 short paragraphs'], 'apps/backend/src/chat.service.ts')
      forbidIncludes(
        chatStyleGuide,
        ['write 3-6 short paragraphs', 'at least 4 complete sentences', '7-12 sentences'],
        'knowledge/structured/chat-style-guide.json',
      )
      requireIncludes(
        backendEnv,
        ['MODEL_MAX_OUTPUT_TOKENS must be at least 1200 for production roleplay replies', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS must be at least 320 for production roleplay replies'],
        'apps/backend/src/env.ts',
      )
      requireIncludes(
        backendEnvTest,
        ['rejects production roleplay reply budget below baseline', 'MODEL_MAX_OUTPUT_TOKENS must be at least 1200 for production roleplay replies', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS must be at least 320 for production roleplay replies'],
        'apps/backend/src/env.test.ts',
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
          'RELEASE_HANDOFF.md',
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
          'CORS_ORIGINS=https://<frontend-domain>',
          'Do not include localhost, `http://` origins, wildcard origins, or the backend URL',
          'VITE_API_BASE_URL=https://<backend-domain>',
        ],
        'DEPLOY_RENDER.md',
      )
    },
  },
  {
    name: 'release handoff template is available',
    run: async () => {
      const handoff = await readRepoFile('RELEASE_HANDOFF.md')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const readme = await readRepoFile('README.md')
      const packageJson = await readRepoFile('package.json')
      const script = await readRepoFile('scripts/release-handoff-check.ts')
      const test = await readRepoFile('scripts/release-handoff-check.test.ts')
      const checkSecrets = await readRepoFile('scripts/check-secrets.ts')
      const checkSecretsTest = await readRepoFile('scripts/check-secrets.test.ts')
      const secretPatterns = await readRepoFile('scripts/secret-patterns.ts')
      const secretPatternsTest = await readRepoFile('scripts/secret-patterns.test.ts')
      requireIncludes(
        handoff,
        [
          'Release Handoff Template',
          'Do not paste secrets',
          'Deployed URLs',
          'Database And Migrations',
          'Auth, Storage, And CORS',
          'AI Provider Verification',
          'QA Gates',
          'Admin Checks',
          'Known Limitations',
          'Release Decision',
        ],
        'RELEASE_HANDOFF.md',
      )
      requireIncludes(
        readme,
        ['RELEASE_HANDOFF.md', 'bun run production:check', 'before sending real users', 'secret-pattern regression tests', 'tracked `.env`'],
        'README.md',
      )
      requireIncludes(deploymentQa, ['bun run secrets:patterns:test', 'secrets/secret-pattern/memory', 'Real `.env`'], 'DEPLOYMENT_QA.md')
      requireIncludes(packageJson, ['"release:handoff:check"', 'bun scripts/release-handoff-check.ts'], 'package.json')
      requireIncludes(packageJson, ['"release:handoff:test"', 'bun test scripts/release-handoff-check.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"secrets:patterns:test"', 'bun test scripts/secret-patterns.test.ts'], 'package.json')
      requireIncludes(
        script,
        ['checkReleaseHandoffContent', 'collectReleaseHandoffCheckResult', 'runReleaseHandoffCheck', '--filled', 'forbiddenPatterns', 'Release handoff check failed'],
        'scripts/release-handoff-check.ts',
      )
      requireIncludes(
        test,
        ['accepts a filled release handoff', 'secret-shaped values', 'contains GitHub token', 'requireFilled: true', 'importable runner'],
        'scripts/release-handoff-check.test.ts',
      )
      requireIncludes(
        checkSecrets,
        ['collectSecretFindings', 'runSecretsCheck', 'SecretFinding', 'if (import.meta.main) process.exit(await runSecretsCheck())'],
        'scripts/check-secrets.ts',
      )
      requireIncludes(
        checkSecretsTest,
        ['tracked real env files', 'runs the committed secret scan through an importable runner'],
        'scripts/check-secrets.test.ts',
      )
      requireIncludes(secretPatterns, ['GitHub token', 'Google API key', 'Slack token', 'Private key block'], 'scripts/secret-patterns.ts')
      requireIncludes(secretPatternsTest, ['repo scan allows placeholder docs', 'handoff and memory scans inherit repo secret coverage'], 'scripts/secret-patterns.test.ts')
    },
  },
  {
    name: 'QA scripts cover seed and Playwright e2e smoke',
    run: async () => {
      const content = await readRepoFile('package.json')
      const frontendPackage = await readRepoFile('apps/frontend/package.json')
      const importCycleAudit = await readRepoFile('scripts/import-cycle-audit.ts')
      const importCycleAuditTest = await readRepoFile('scripts/import-cycle-audit.test.ts')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const packageJson = JSON.parse(content) as { scripts?: Record<string, string> }
      requireIncludes(
        content,
        [
          '"api:audit"',
          '"backend:check:db:test"',
          '"route-menu:audit"',
          '"memory:audit"',
          '"knowledge:audit"',
          '"vault:audit:test"',
          '"eval:local"',
          '"eval:local:test"',
          '"eval:promptfoo"',
          '"security:audit"',
          '"security:audit:test"',
          '"import-cycle:audit"',
          '"import-cycle:audit:test"',
          '"api:audit:test"',
          '"api:smoke:test"',
          '"frontend:bundle:test"',
          '"frontend:static:audit:test"',
          '"frontend:route:audit:test"',
          '"route-menu:audit:test"',
          '"smoke:helpers:test"',
          '"provider:smoke:guards:test"',
          '"smoke:doctor:test"',
          '"smoke:ready:test"',
          '"smoke:image:test"',
          '"smoke:chat:test"',
          '"smoke:local:test"',
          '"e2e:smoke:test"',
          '"api:smoke"',
          '"api:smoke:live"',
          '"deploy:status"',
          '"deploy:status:test"',
          '"deploy:readiness:test"',
          '"deploy:doctor"',
          '"deploy:doctor:test"',
          '"deploy:doctor:self-test"',
          '"release:handoff:check"',
          '"release:handoff:test"',
          '"secrets:check:test"',
          '"secrets:patterns:test"',
          '"qa:seed"',
          '"e2e:smoke"',
          '"qa:full"',
          '"staging:check"',
          '"staging:verify"',
          '"smoke:image"',
          '"smoke:image:live"',
          '"supabase:storage:setup"',
          '"supabase:storage:check"',
          '"supabase:storage:test"',
          '"production:check"',
          '@playwright/test',
        ],
        'package.json',
      )
      requireIncludes(
        importCycleAudit,
        ["node.expression.text === 'require'", 'extractRelativeImports'],
        'scripts/import-cycle-audit.ts',
      )
      requireIncludes(
        importCycleAuditTest,
        ["require('./legacy-helper')", "import legacy = require('./legacy-module')"],
        'scripts/import-cycle-audit.test.ts',
      )
      requireIncludes(deploymentQa, ['TypeScript import-equals `require()`', 'CommonJS `require()`', 'import-cycle:audit'], 'DEPLOYMENT_QA.md')
      const smokeLive = packageJson.scripts?.['smoke:live'] ?? ''
      const qaLive = packageJson.scripts?.['qa:live'] ?? ''
      const qaLocal = packageJson.scripts?.['qa:local'] ?? ''
      const stagingCheck = packageJson.scripts?.['staging:check'] ?? ''
      const stagingVerify = packageJson.scripts?.['staging:verify'] ?? ''
      const productionCheck = packageJson.scripts?.['production:check'] ?? ''
      if (smokeLive.includes('smoke:chat')) {
        throw new Error('package.json smoke:live should use api:smoke:live once instead of calling smoke:chat separately')
      }
      if (qaLive.includes('smoke:chat') || qaLive.includes('smoke:image')) {
        throw new Error('package.json qa:live should not duplicate provider calls outside api:smoke:live')
      }
      if (!qaLocal.includes('secrets:patterns:test')) {
        throw new Error('package.json qa:local must run secrets:patterns:test so shared secret pattern regressions are caught')
      }
      if (!qaLocal.includes('secrets:check:test')) {
        throw new Error('package.json qa:local must run secrets:check:test so committed secret scan path regressions are caught')
      }
      if (!qaLocal.includes('vault:audit:test')) {
        throw new Error('package.json qa:local must run vault:audit:test so memory/knowledge audit helper regressions are caught')
      }
      if (!qaLocal.includes('eval:local:test')) {
        throw new Error('package.json qa:local must run eval:local:test so local eval output regressions are caught')
      }
      if (!qaLocal.includes('security:audit:test')) {
        throw new Error('package.json qa:local must run security:audit:test so backend security audit regressions are caught')
      }
      if (!qaLocal.includes('import-cycle:audit') || !qaLocal.includes('import-cycle:audit:test')) {
        throw new Error('package.json qa:local must run import-cycle audit and its regression test so architecture cycles are caught')
      }
      if (!qaLocal.includes('api:audit:test')) {
        throw new Error('package.json qa:local must run api:audit:test so route audit regressions are caught')
      }
      if (!qaLocal.includes('api:smoke:test')) {
        throw new Error('package.json qa:local must run api:smoke:test so API smoke helper regressions are caught')
      }
      if (!qaLocal.includes('frontend:bundle:test')) {
        throw new Error('package.json qa:local must run frontend:bundle:test so bundle budget regressions are caught')
      }
      if (!qaLocal.includes('frontend:static:audit:test')) {
        throw new Error('package.json qa:local must run frontend:static:audit:test so frontend static audit regressions are caught')
      }
      if (!qaLocal.includes('frontend:route:audit:test')) {
        throw new Error('package.json qa:local must run frontend:route:audit:test so frontend route audit regressions are caught')
      }
      if (!qaLocal.includes('route-menu:audit:test')) {
        throw new Error('package.json qa:local must run route-menu:audit:test so route/menu doc regressions are caught')
      }
      if (!qaLocal.includes('smoke:helpers:test')) {
        throw new Error('package.json qa:local must run smoke:helpers:test so smoke auth/url regressions are caught')
      }
      if (!qaLocal.includes('provider:smoke:guards:test')) {
        throw new Error('package.json qa:local must run provider:smoke:guards:test so provider smoke guard regressions are caught')
      }
      if (!qaLocal.includes('smoke:doctor:test')) {
        throw new Error('package.json qa:local must run smoke:doctor:test so smoke doctor blocker output regressions are caught')
      }
      if (!qaLocal.includes('smoke:ready:test')) {
        throw new Error('package.json qa:local must run smoke:ready:test so readiness smoke output regressions are caught')
      }
      if (!qaLocal.includes('smoke:image:test')) {
        throw new Error('package.json qa:local must run smoke:image:test so image smoke fallback regressions are caught')
      }
      if (!qaLocal.includes('smoke:chat:test')) {
        throw new Error('package.json qa:local must run smoke:chat:test so live chat smoke validation regressions are caught')
      }
      if (!qaLocal.includes('smoke:local:test')) {
        throw new Error('package.json qa:local must run smoke:local:test so local smoke helper regressions are caught')
      }
      if (!qaLocal.includes('e2e:smoke:test')) {
        throw new Error('package.json qa:local must run e2e:smoke:test so browser smoke command regressions are caught')
      }
      if (!qaLocal.includes('backend:check:db:test')) {
        throw new Error('package.json qa:local must run backend:check:db:test so DB-required backend check planning is caught')
      }
      if (!qaLocal.includes('supabase:storage:test')) {
        throw new Error('package.json qa:local must run supabase:storage:test so signed storage helper regressions are caught')
      }
      if (!qaLocal.includes('deploy:status:test')) {
        throw new Error('package.json qa:local must run deploy:status:test so deploy status output regressions are caught')
      }
      if (!qaLocal.includes('deploy:doctor:test')) {
        throw new Error('package.json qa:local must run deploy:doctor:test so deploy env helper regressions are caught')
      }
      if (!stagingCheck.includes('qa:full') || !stagingCheck.includes('supabase:storage:check') || !stagingCheck.includes('--require-admin')) {
        throw new Error('package.json staging:check must cover qa:full, Supabase storage, and admin API smoke')
      }
      if (
        !stagingVerify.includes('bun scripts/smoke-doctor.ts --strict-staging') ||
        !stagingVerify.includes('bun run deploy:status') ||
        !stagingVerify.includes('supabase:storage:check') ||
        !stagingVerify.includes('smoke:ready') ||
        !stagingVerify.includes('--require-admin')
      ) {
        throw new Error('package.json staging:verify must print deploy status, require strict staging smoke doctor, Supabase storage, readiness, and admin API smoke')
      }
      if (!productionCheck.includes('bun run deploy:status')) {
        throw new Error('package.json production:check must print deploy status before strict production gates')
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
      const productionChecklist = await readRepoFile('memory/production/checklist.md')
      const memoryAudit = await readRepoFile('scripts/memory-audit.ts')
      requireIncludes(packageJson, ['"memory:audit"', 'bun scripts/memory-audit.ts', 'bun run memory:audit'], 'package.json')
      requireIncludes(packageJson, ['"vault:audit:test"', 'bun test scripts/markdown-audit-helpers.test.ts'], 'package.json')
      requireIncludes(readme, ['memory/README.md', 'Project Memory'], 'README.md')
      requireIncludes(memoryReadme, ['Never store secrets', 'Update Protocol', 'Working Context', 'Deploy Blockers'], 'memory/README.md')
      requireIncludes(workingContext, ['Current Local Status', 'Current Production Status'], 'memory/working-context.md')
      requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED'], 'memory/deploy-blockers.md')
      requireIncludes(
        productionChecklist,
        ['bun run deploy:doctor', 'bun run deploy:status', 'bun run api:smoke:live', 'Do not point `qa:local`'],
        'memory/production/checklist.md',
      )
      requireIncludes(
        await readRepoFile('scripts/markdown-audit-helpers.test.ts'),
        ['collects only local markdown links', 'checks whether a resolved path stays inside a vault', 'runs the memory audit through an importable runner', 'runs the knowledge audit through an importable runner'],
        'scripts/markdown-audit-helpers.test.ts',
      )
      requireIncludes(
        memoryAudit,
        ['collectMemoryAuditResult', 'runMemoryAudit', 'MemoryAuditResult', 'if (import.meta.main) process.exit(await runMemoryAudit())'],
        'scripts/memory-audit.ts',
      )
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
      const knowledgeAudit = await readRepoFile('scripts/knowledge-audit.ts')
      requireIncludes(packageJson, ['"knowledge:audit"', 'bun scripts/knowledge-audit.ts', 'bun run knowledge:audit'], 'package.json')
      requireIncludes(readme, ['Knowledge Layer', 'knowledge/README.md', 'bun run knowledge:audit'], 'README.md')
      requireIncludes(knowledgeReadme, ['Runtime Usage', 'Structured Packs', 'Never store secrets'], 'knowledge/README.md')
      requireIncludes(wikiIndex, ['Maprang Product', 'Relationship Engine', 'Creator Studio', 'Production Deploy'], 'knowledge/wiki/INDEX.md')
      requireIncludes(
        backendKnowledge,
        ['buildChatKnowledgePrompt', 'buildCreatorKnowledgePrompt', 'structuredKnowledgeHealth'],
        'apps/backend/src/knowledge.service.ts',
      )
      requireIncludes(
        knowledgeAudit,
        ['collectKnowledgeAuditResult', 'runKnowledgeAudit', 'KnowledgeAuditResult', 'if (import.meta.main) process.exit(await runKnowledgeAudit())'],
        'scripts/knowledge-audit.ts',
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
      requireIncludes(
        packageJson,
        ['"eval:local"', 'bun scripts/eval-local.ts', '"eval:local:test"', 'bun test scripts/eval-local.test.ts', '"eval:promptfoo"'],
        'package.json',
      )
      requireIncludes(readme, ['Evaluation Layer', 'bun run eval:local', 'evals/golden-roleplay.json'], 'README.md')
      requireIncludes(deploymentQa, ['bun run eval:local', 'deterministic prompt assembly'], 'DEPLOYMENT_QA.md')
      requireIncludes(evalReadme, ['Golden Dataset', 'Promptfoo', 'No secrets'], 'evals/README.md')
      requireIncludes(
        golden,
        ['roleplay-depth-and-knowledge', 'prompt-injection-defense', 'relationship-scene-continuity'],
        'evals/golden-roleplay.json',
      )
      requireIncludes(ciWorkflow, ['bun run eval:local', 'bun run eval:local:test'], '.github/workflows/ci.yml')
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
      requireIncludes(routeMenuAudit, ['สัญญาความสัมพันธ์', 'relationship_seed'], 'apps/frontend/src/lib/routeMenuAudit.ts')
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
        ['const argv = options.argv ?? process.argv', "const live = argv.includes('--live')", "const requireLiveImage = argv.includes('--require-live-image')", 'imageOnly: !live', 'skipImageProvider: !live', 'if (requireLiveImage) throw new Error(issue)'],
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
    name: 'deploy status shares readiness logic',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const smokeDoctor = await readRepoFile('scripts/smoke-doctor.ts')
      const smokeDoctorTest = await readRepoFile('scripts/smoke-doctor.test.ts')
      const deployStatus = await readRepoFile('scripts/deploy-status.ts')
      const deployStatusTest = await readRepoFile('scripts/deploy-status.test.ts')
      const deployReadiness = await readRepoFile('scripts/deploy-readiness.ts')
      const deployEnvDoctor = await readRepoFile('scripts/deploy-env-doctor.ts')
      const deployEnvDoctorTest = await readRepoFile('scripts/deploy-env-doctor.test.ts')
      const deployEnvDoctorSelfTest = await readRepoFile('scripts/deploy-env-doctor-self-test.ts')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const readme = await readRepoFile('README.md')
      const stagingRunbook = await readRepoFile('STAGING_RUNBOOK.md')
      requireIncludes(packageJson, ['"deploy:status"', 'bun scripts/deploy-status.ts'], 'package.json')
      requireIncludes(packageJson, ['"smoke:doctor:test"', 'bun test scripts/smoke-doctor.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"deploy:status:test"', 'bun test scripts/deploy-status.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"deploy:readiness:test"', 'bun test scripts/deploy-readiness.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"deploy:doctor:test"', 'bun test scripts/deploy-env-doctor.test.ts'], 'package.json')
      requireIncludes(
        smokeDoctor,
        [
          'evaluateDeployReadiness',
          'buildHealthRows',
          'buildNextDeploySteps',
          'healthFailures',
          'validateBackendRootIdentity',
          'SmokeDoctorRunnerOptions',
          'nextSteps:',
        ],
        'scripts/smoke-doctor.ts',
      )
      requireIncludes(
        smokeDoctorTest,
        [
          'buildSmokeDoctorReport',
          'validates backend root identity before health checks',
          'runs smoke doctor through an importable runner',
          'strict staging gate fails',
          'backend health failures',
          'warns when roleplay reply budget passes baseline but is below recommendation',
          'does not duplicate recommendation warning when roleplay reply budget is below baseline',
        ],
        'scripts/smoke-doctor.test.ts',
      )
      requireIncludes(
        deployStatus,
        [
          'evaluateDeployReadiness',
          'buildNextDeploySteps',
          '--json',
          'stagingBlockerCount',
          'productionBlockerCount',
          'Maprang Deploy Status',
          'DeployStatusRunnerOptions',
          'validateBackendRootIdentity',
          'readRootIdentity',
          'if (import.meta.main) process.exit(await runDeployStatus())',
        ],
        'scripts/deploy-status.ts',
      )
      requireIncludes(
        deployStatusTest,
        [
          'buildDeployStatusPayload',
          'formatDeployStatusText',
          'top-level readiness counts',
          'local URL and CORS blockers',
          'surfaces invalid roleplay reply budget env in JSON and text readiness output',
          'validates backend root identity before health status',
          'runs deploy status JSON through an importable runner',
        ],
        'scripts/deploy-status.test.ts',
      )
      requireIncludes(
        deployReadiness,
        ['evaluateDeployReadiness', 'buildNextDeploySteps', 'chat provider live smoke is not marked verified', 'RELEASE_HANDOFF.md'],
        'scripts/deploy-readiness.ts',
      )
      requireIncludes(
        deployEnvDoctor,
        [
          'runDeployEnvDoctor',
          'writeLine',
          'DeployEnvDoctorResult',
          'findings: [...findings]',
          'auditIntegerRangeWithRecommendedMin',
          'auditPreferredIntegerMin',
          'production roleplay replies',
        ],
        'scripts/deploy-env-doctor.ts',
      )
      requireIncludes(
        deployEnvDoctorTest,
        [
          'runDeployEnvDoctor',
          'importable function without exiting',
          'Supabase URL match',
          'fails production env when roleplay reply budget is below baseline',
          'warns when production env uses baseline roleplay reply budget below richer recommendation',
          'should be at least 1200 for production roleplay replies',
          'should be at least 320 for production roleplay replies',
          'recommended is 1600 for richer roleplay replies',
          'imports the deploy doctor self-test without executing it',
        ],
        'scripts/deploy-env-doctor.test.ts',
      )
      requireIncludes(
        deployEnvDoctorSelfTest,
        ['DeployEnvDoctorSelfTestOptions', 'runDeployEnvDoctorSelfTest', 'if (import.meta.main)'],
        'scripts/deploy-env-doctor-self-test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/deploy-readiness.test.ts'),
        [
          'separates staging blockers from live provider verification blockers',
          'passes a production-ready health payload',
          'turns production roleplay reply budget env errors into blockers',
          'MODEL_MAX_OUTPUT_TOKENS must be at least 1200 for production roleplay replies',
        ],
        'scripts/deploy-readiness.test.ts',
      )
      requireIncludes(deploymentQa, ['bun run deploy:status', 'bun scripts/deploy-status.ts --json'], 'DEPLOYMENT_QA.md')
      requireIncludes(readme, ['bun run deploy:status', '`staging:verify` prints', 'stagingBlockerCount', 'blocker summary and next steps'], 'README.md')
      requireIncludes(stagingRunbook, ['bun run deploy:status', 'bun run staging:verify', 'bun run production:check'], 'STAGING_RUNBOOK.md')
    },
  },
  {
    name: 'security checklist and audit script are available',
    run: async () => {
      const checklist = await readRepoFile('SECURITY_CHECKLIST.md')
      const packageJson = await readRepoFile('package.json')
      const securityAudit = await readRepoFile('scripts/backend-security-audit.ts')
      const promptInspector = await readRepoFile('apps/backend/src/prompt-inspector.service.ts')
      const promptInspectorTest = await readRepoFile('apps/backend/src/prompt-inspector.service.test.ts')
      requireIncludes(
        checklist,
        ['SQL Injection', 'Broken Access Control', 'Prompt Control', 'bun run security:audit', 'requireAdminApiKey', 'retrieved lore preview', 'Production Must-Pass'],
        'SECURITY_CHECKLIST.md',
      )
      requireIncludes(
        packageJson,
        [
          '"backend:check:db:test"',
          'backend-db-check.test.ts',
          '"supabase:storage:test"',
          'supabase-storage-setup.test.ts',
          '"security:audit"',
          'backend-security-audit.ts',
          '"api:audit"',
          'api-route-audit.ts',
          '"api:audit:test"',
          'api-route-audit.test.ts',
          '"api:smoke:test"',
          'api-smoke-helpers.test.ts',
          '"frontend:bundle:test"',
          'check-frontend-bundles.test.ts',
          '"frontend:static:audit:test"',
          'frontend-static-audit.test.ts',
          '"frontend:route:audit:test"',
          'frontend-route-audit.test.ts',
          '"route-menu:audit:test"',
          'route-menu-doc-check.test.ts',
          '"smoke:helpers:test"',
          'smoke-helpers.test.ts',
          '"provider:smoke:guards:test"',
          'provider-smoke-guards.test.ts',
          '"smoke:doctor:test"',
          'smoke-doctor.test.ts',
          '"smoke:ready:test"',
          'readiness-smoke.test.ts',
          '"smoke:image:test"',
          'image-smoke.test.ts',
          '"smoke:chat:test"',
          'live-chat-smoke.test.ts',
          '"smoke:local:test"',
          'local-smoke.test.ts',
        ],
        'package.json',
      )
      requireIncludes(
        await readRepoFile('scripts/backend-db-check.test.ts'),
        ['DB availability before requiring DB-backed backend tests', 'REQUIRE_DB_TESTS', 'runs the DB check command plan through an importable runner'],
        'scripts/backend-db-check.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/backend-db-check.ts'),
        ['runBackendDbCheck', 'BackendDbCommandRunner', 'if (import.meta.main) process.exit(await runBackendDbCheck())'],
        'scripts/backend-db-check.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/supabase-storage-setup.test.ts'),
        [
          'validates production signed storage config',
          'normalizes signed URL response paths',
          'runs Supabase storage setup through an importable runner',
        ],
        'scripts/supabase-storage-setup.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/supabase-storage-setup.ts'),
        ['SupabaseStorageSetupRunnerOptions', 'runSupabaseStorageSetup', 'if (import.meta.main) process.exit(await runSupabaseStorageSetup())'],
        'scripts/supabase-storage-setup.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/local-smoke.test.ts'),
        ['prefers MIKA', 'validates backend root identity before deeper smoke work', 'validates avatar upload shape', 'formats local smoke summary', 'runs local smoke through an importable runner'],
        'scripts/local-smoke.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/local-smoke.ts'),
        ['validateBackendRootIdentity', 'LocalSmokeRunnerOptions', 'runLocalSmoke', 'if (import.meta.main) process.exit(await runLocalSmoke())'],
        'scripts/local-smoke.ts',
      )
      requireIncludes(
        securityAudit,
        [
          'apps/backend/index.ts',
          'scannedTargets',
          'adminRoutePattern',
          'admin route is missing requireAdminApiKey guard',
          'uuidParamRoutePattern',
          'route with /:id is missing rejectInvalidUuid guard',
          'runBackendSecurityAudit',
          '$queryRawUnsafe',
        ],
        'scripts/backend-security-audit.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/backend-security-audit.test.ts'),
        [
          'collects direct source-file targets and skips test fixtures',
          'catches unsafe raw SQL helpers',
          'allows tagged raw SQL parameterization',
          'catches admin routes without admin api key guards',
          'catches resource id routes without UUID guards',
          'runs the committed backend security audit through an importable runner',
        ],
        'scripts/backend-security-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-route-audit.test.ts'),
        ['collects backend index and route files automatically', 'discovers Elysia routes from source', 'reports missing, stale, and weak coverage entries', 'covers the backend root identity route', 'runs the committed API route audit through an importable runner'],
        'scripts/api-route-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-route-audit.ts'),
        ['collectRouteFiles', 'apps/backend/index.ts', "'GET /'", 'runApiRouteAudit', 'writeLine', 'writeError', 'if (import.meta.main) process.exit(await runApiRouteAudit())'],
        'scripts/api-route-audit.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-smoke-helpers.test.ts'),
        ['allows live smoke to continue only for live verification readiness failures', 'imports the API smoke runner without executing the smoke flow', 'builds API smoke summary counts for automation'],
        'scripts/api-smoke-helpers.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-smoke.ts'),
        ['GET /', 'validateBackendRootIdentity', 'ApiSmokeRunnerOptions', 'buildApiSmokeSummary', 'runApiSmoke', 'if (import.meta.main) process.exit(await runApiSmoke())'],
        'scripts/api-smoke.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/check-frontend-bundles.test.ts'),
        ['passes when main, chat, and lazy chunks stay under budget', 'reports missing split chunks', 'runs the bundle budget checker through an importable runner'],
        'scripts/check-frontend-bundles.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/check-frontend-bundles.ts'),
        ['runFrontendBundleCheck', 'writeLine', 'writeError', 'if (import.meta.main) process.exit(await runFrontendBundleCheck())'],
        'scripts/check-frontend-bundles.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-static-audit.test.ts'),
        [
          'reports buttons without explicit type',
          'reports placeholder links',
          'reports Thai placeholder and mojibake text regressions',
          'reports English UI label regressions for Thai-first surfaces',
          'reports mixed English debug copy regressions for Thai-first surfaces',
          'Relationship Contract',
          'prompt-control',
          'ยัง fallback',
          'เหตุผล disabled',
          'runs the committed frontend static audit through an importable runner',
        ],
        'scripts/frontend-static-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-route-audit.test.ts'),
        ['collects declared React Router paths', 'reports static links and navigate calls', 'runs the committed frontend route audit through an importable runner'],
        'scripts/frontend-route-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-static-audit.ts'),
        [
          'collectFrontendStaticFindings',
          'Relationship Contract',
          'prompt-control',
          'ระบบ relationship',
          'ยัง fallback',
          'เหตุผล disabled',
          'runFrontendStaticAudit',
          'if (import.meta.main) process.exit(await runFrontendStaticAudit())',
        ],
        'scripts/frontend-static-audit.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-route-audit.ts'),
        ['collectFrontendRouteAuditResult', 'runFrontendRouteAudit', 'if (import.meta.main) process.exit(await runFrontendRouteAudit())'],
        'scripts/frontend-route-audit.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/route-menu-doc-check.test.ts'),
        [
          'passes when documented rows, routes, navigation, and preloads align',
          'reports missing navigation coverage',
          'reports stale mixed-language copy in route menu documentation',
          'runs the committed route/menu doc check through an importable runner',
        ],
        'scripts/route-menu-doc-check.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/route-menu-doc-check.ts'),
        ['defaultForbiddenSnippets', 'collectRouteMenuDocCheckResult', 'runRouteMenuDocCheck', 'if (import.meta.main) process.exit(await runRouteMenuDocCheck())'],
        'scripts/route-menu-doc-check.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/smoke-helpers.test.ts'),
        ['defaults to local backend', 'does not impersonate a user by default against deployed targets', 'validates backend root identity payloads'],
        'scripts/smoke-helpers.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/smoke-helpers.ts'),
        ['validateBackendRootIdentity', 'maprang-backend'],
        'scripts/smoke-helpers.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/provider-smoke-guards.test.ts'),
        ['formats provider failure messages', 'maps image provider failures to actionable fixes'],
        'scripts/provider-smoke-guards.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/readiness-smoke.test.ts'),
        [
          'summarizes a ready payload',
          'keeps readiness failures visible',
          'validates backend root identity before readiness',
          'runs readiness smoke through an importable runner',
        ],
        'scripts/readiness-smoke.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/readiness-smoke.ts'),
        [
          'ReadinessSmokeRunnerOptions',
          'readBackendRootIdentity',
          'validateBackendRootIdentity',
          'runReadinessSmoke',
          'if (import.meta.main) process.exit(await runReadinessSmoke())',
        ],
        'scripts/readiness-smoke.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/image-smoke.test.ts'),
        [
          'builds skipped live-image payload',
          'reports placeholder, missing URL, and SVG placeholder failures',
          'validates backend root identity before image provider checks',
          'runs skipped image smoke through an importable runner',
        ],
        'scripts/image-smoke.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/image-smoke.ts'),
        ['ImageSmokeRunnerOptions', 'validateBackendRootIdentity', 'runImageSmoke', 'if (import.meta.main) process.exit(await runImageSmoke())'],
        'scripts/image-smoke.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/live-chat-smoke.test.ts'),
        [
          'validates smoke token balance',
          'matches wallet debit',
          'validates backend root identity before spending chat tokens',
          'runs live chat smoke through an importable runner',
        ],
        'scripts/live-chat-smoke.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/live-chat-smoke.ts'),
        ['LiveChatSmokeRunnerOptions', 'validateBackendRootIdentity', 'runLiveChatSmoke', 'if (import.meta.main) process.exit(await runLiveChatSmoke())'],
        'scripts/live-chat-smoke.ts',
      )
      requireIncludes(
        promptInspector,
        ['redactLoreForInspector', 'retrievalRedactionCount', 'redactedLore.map'],
        'apps/backend/src/prompt-inspector.service.ts',
      )
      requireIncludes(
        promptInspectorTest,
        ['fakeDatabaseUrl', 'retrieval.lore', 'not.toContain(fakeDatabaseUrl)'],
        'apps/backend/src/prompt-inspector.service.test.ts',
      )
    },
  },
  {
    name: 'route/menu audit and staging runbook are available',
    run: async () => {
      const audit = await readRepoFile('ROUTE_MENU_AUDIT.md')
      const staging = await readRepoFile('STAGING_RUNBOOK.md')
      const readme = await readRepoFile('README.md')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const productionSetup = await readRepoFile('PRODUCTION_SETUP.md')
      const e2eSmoke = await readRepoFile('tests/e2e/maprang-smoke.spec.ts')
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
          'https://',
        ],
        'STAGING_RUNBOOK.md',
      )
      requireIncludes(readme, ['local/non-https CORS', 'backend root identity'], 'README.md')
      requireIncludes(deploymentQa, ['local/non-https CORS', 'backend root identity'], 'DEPLOYMENT_QA.md')
      requireIncludes(productionSetup, ['local/non-https CORS origins', 'CORS is local or non-https', 'local/non-https CORS'], 'PRODUCTION_SETUP.md')
      forbidIncludes(
        await readRepoFile('ROUTE_MENU_AUDIT.md'),
        ['รัน eval', 'prompt-control', 'token budget', 'accordion', ' disabled '],
        'ROUTE_MENU_AUDIT.md',
      )
      requireIncludes(
        await readRepoFile('DEPLOY_RENDER.md'),
        ['CORS_ORIGINS=https://<frontend-domain>', 'Do not include localhost, `http://` origins, wildcard origins, or the backend URL'],
        'DEPLOY_RENDER.md',
      )
      requireIncludes(await readRepoFile('STAGING_RUNBOOK.md'), ['local/non-https CORS', 'frontend HTTPS origin'], 'STAGING_RUNBOOK.md')
      requireIncludes(
        e2eSmoke,
        ['ตรวจเส้นทาง/เมนู', 'ตรวจพรอมป์ก่อนยิงโมเดล', 'ทดสอบคุณภาพพรอมป์และบริบท', 'สรุป blocker production', 'เช็กลิสต์ deploy', 'แถบแชท'],
        'tests/e2e/maprang-smoke.spec.ts',
      )
      requireIncludes(e2eSmoke, ['expectBackendRootIdentity', 'maprang-backend'], 'tests/e2e/maprang-smoke.spec.ts')
      forbidIncludes(
        e2eSmoke,
        ['Production blocker summary', 'Deploy checklist', 'Chat Sidebar', 'Prompt Inspector', 'Automated Evals', 'prompt/context'],
        'tests/e2e/maprang-smoke.spec.ts',
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
          'bun run predeploy:check',
          'bun run secrets:check',
          'bun run secrets:check:test',
          'bun run secrets:patterns:test',
          'bun run memory:audit',
          'bun run knowledge:audit',
          'bun run vault:audit:test',
          'bun run eval:local',
          'bun run eval:local:test',
          'bun run security:audit',
          'bun run security:audit:test',
          'bun run import-cycle:audit',
          'bun run import-cycle:audit:test',
          'bun run api:audit',
          'bun run api:audit:test',
          'bun run api:smoke:test',
          'bun run frontend:bundle:test',
          'bun run frontend:static:audit:test',
          'bun run frontend:route:audit:test',
          'bun run route-menu:audit',
          'bun run route-menu:audit:test',
          'bun run smoke:helpers:test',
          'bun run provider:smoke:guards:test',
          'bun run smoke:doctor:test',
          'bun run smoke:ready:test',
          'bun run smoke:image:test',
          'bun run smoke:chat:test',
          'bun run smoke:local:test',
          'bun run e2e:smoke:test',
          'bun run backend:check:db:test',
          'bun run supabase:storage:test',
          'bun run release:handoff:check',
          'bun run release:handoff:test',
          'bun run deploy:readiness:test',
          'bun run deploy:status:test',
          'bun run deploy:doctor:test',
          'bun run deploy:doctor:self-test',
          'bun run deploy:status',
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
          'bun run secrets:check:test',
          'bun run secrets:patterns:test',
          'bun run vault:audit:test',
          'bun run deploy:doctor:test',
          'bun run deploy:doctor:self-test',
          'bun run memory:audit',
          'bun run knowledge:audit',
          'bun run eval:local',
          'bun run eval:local:test',
          'bun run security:audit',
          'bun run security:audit:test',
          'bun run import-cycle:audit',
          'bun run import-cycle:audit:test',
          'bun run api:audit',
          'bun run api:audit:test',
          'bun run api:smoke:test',
          'bun run frontend:bundle:test',
          'bun run frontend:static:audit:test',
          'bun run frontend:route:audit:test',
          'bun run route-menu:audit',
          'bun run route-menu:audit:test',
          'bun run smoke:helpers:test',
          'bun run provider:smoke:guards:test',
          'bun run smoke:doctor:test',
          'bun run smoke:ready:test',
          'bun run smoke:image:test',
          'bun run smoke:chat:test',
          'bun run smoke:local:test',
          'bun run e2e:smoke:test',
          'bun run backend:check:db:test',
          'bun run supabase:storage:test',
          'bun run release:handoff:check',
          'bun run release:handoff:test',
          'bun run deploy:readiness:test',
          'bun run deploy:status:test',
          'bun run deploy:doctor:test',
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
