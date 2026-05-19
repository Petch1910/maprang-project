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
  '.github/workflows/production-smoke.yml',
  'apps/backend/Dockerfile',
  'apps/backend/.env.production.example',
  'apps/backend/prisma/schema.prisma',
  'apps/frontend/.env.production.example',
  'apps/frontend/Dockerfile',
  'scripts/deploy-env-doctor.ts',
  'scripts/deploy-env-doctor-self-test.ts',
  'scripts/deploy-readiness.ts',
  'scripts/deploy-readiness.test.ts',
  'scripts/deploy-status.ts',
  'scripts/deploy-status.test.ts',
  'scripts/eval-local.ts',
  'scripts/check-frontend-bundles.test.ts',
  'scripts/knowledge-audit.ts',
  'scripts/markdown-audit-helpers.ts',
  'scripts/markdown-audit-helpers.test.ts',
  'scripts/memory-audit.ts',
  'scripts/api-route-audit.test.ts',
  'scripts/release-handoff-check.ts',
  'scripts/release-handoff-check.test.ts',
  'scripts/frontend-static-audit.test.ts',
  'scripts/frontend-route-audit.test.ts',
  'scripts/route-menu-doc-check.ts',
  'scripts/route-menu-doc-check.test.ts',
  'scripts/backend-security-audit.test.ts',
  'scripts/smoke-helpers.test.ts',
  'scripts/provider-smoke-guards.test.ts',
  'scripts/readiness-smoke.test.ts',
  'scripts/secret-patterns.ts',
  'scripts/secret-patterns.test.ts',
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
      requireIncludes(script, ['checkReleaseHandoffContent', '--filled', 'forbiddenPatterns', 'Release handoff check failed'], 'scripts/release-handoff-check.ts')
      requireIncludes(test, ['accepts a filled release handoff', 'secret-shaped values', 'contains GitHub token', 'requireFilled: true'], 'scripts/release-handoff-check.test.ts')
      requireIncludes(secretPatterns, ['GitHub token', 'Google API key', 'Slack token', 'Private key block'], 'scripts/secret-patterns.ts')
      requireIncludes(secretPatternsTest, ['repo scan allows placeholder docs', 'handoff and memory scans inherit repo secret coverage'], 'scripts/secret-patterns.test.ts')
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
          '"vault:audit:test"',
          '"eval:local"',
          '"eval:promptfoo"',
          '"security:audit"',
          '"security:audit:test"',
          '"api:audit:test"',
          '"frontend:bundle:test"',
          '"frontend:static:audit:test"',
          '"frontend:route:audit:test"',
          '"route-menu:audit:test"',
          '"smoke:helpers:test"',
          '"provider:smoke:guards:test"',
          '"smoke:ready:test"',
          '"api:smoke"',
          '"api:smoke:live"',
          '"deploy:status"',
          '"deploy:status:test"',
          '"deploy:readiness:test"',
          '"deploy:doctor"',
          '"deploy:doctor:self-test"',
          '"release:handoff:check"',
          '"release:handoff:test"',
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
          '"production:check"',
          '@playwright/test',
        ],
        'package.json',
      )
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
      if (!qaLocal.includes('vault:audit:test')) {
        throw new Error('package.json qa:local must run vault:audit:test so memory/knowledge audit helper regressions are caught')
      }
      if (!qaLocal.includes('security:audit:test')) {
        throw new Error('package.json qa:local must run security:audit:test so backend security audit regressions are caught')
      }
      if (!qaLocal.includes('api:audit:test')) {
        throw new Error('package.json qa:local must run api:audit:test so route audit regressions are caught')
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
      if (!qaLocal.includes('smoke:ready:test')) {
        throw new Error('package.json qa:local must run smoke:ready:test so readiness smoke output regressions are caught')
      }
      if (!qaLocal.includes('deploy:status:test')) {
        throw new Error('package.json qa:local must run deploy:status:test so deploy status output regressions are caught')
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
      requireIncludes(packageJson, ['"memory:audit"', 'bun scripts/memory-audit.ts', 'bun run memory:audit'], 'package.json')
      requireIncludes(packageJson, ['"vault:audit:test"', 'bun test scripts/markdown-audit-helpers.test.ts'], 'package.json')
      requireIncludes(readme, ['memory/README.md', 'Project Memory'], 'README.md')
      requireIncludes(memoryReadme, ['Never store secrets', 'Update Protocol', 'Working Context', 'Deploy Blockers'], 'memory/README.md')
      requireIncludes(workingContext, ['Current Local Status', 'Current Production Status'], 'memory/working-context.md')
      requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED'], 'memory/deploy-blockers.md')
      requireIncludes(
        await readRepoFile('scripts/markdown-audit-helpers.test.ts'),
        ['collects only local markdown links', 'checks whether a resolved path stays inside a vault'],
        'scripts/markdown-audit-helpers.test.ts',
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
    name: 'deploy status shares readiness logic',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const smokeDoctor = await readRepoFile('scripts/smoke-doctor.ts')
      const deployStatus = await readRepoFile('scripts/deploy-status.ts')
      const deployStatusTest = await readRepoFile('scripts/deploy-status.test.ts')
      const deployReadiness = await readRepoFile('scripts/deploy-readiness.ts')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const readme = await readRepoFile('README.md')
      const stagingRunbook = await readRepoFile('STAGING_RUNBOOK.md')
      requireIncludes(packageJson, ['"deploy:status"', 'bun scripts/deploy-status.ts'], 'package.json')
      requireIncludes(packageJson, ['"deploy:status:test"', 'bun test scripts/deploy-status.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"deploy:readiness:test"', 'bun test scripts/deploy-readiness.test.ts'], 'package.json')
      requireIncludes(
        smokeDoctor,
        ['evaluateDeployReadiness', 'buildHealthRows', 'buildNextDeploySteps', 'healthFailures', 'nextSteps:'],
        'scripts/smoke-doctor.ts',
      )
      requireIncludes(
        deployStatus,
        ['evaluateDeployReadiness', 'buildNextDeploySteps', '--json', 'stagingBlockerCount', 'productionBlockerCount', 'Maprang Deploy Status'],
        'scripts/deploy-status.ts',
      )
      requireIncludes(
        deployStatusTest,
        ['buildDeployStatusPayload', 'formatDeployStatusText', 'top-level readiness counts', 'local URL and CORS blockers'],
        'scripts/deploy-status.test.ts',
      )
      requireIncludes(
        deployReadiness,
        ['evaluateDeployReadiness', 'buildNextDeploySteps', 'chat provider live smoke is not marked verified', 'RELEASE_HANDOFF.md'],
        'scripts/deploy-readiness.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/deploy-readiness.test.ts'),
        ['separates staging blockers from live provider verification blockers', 'passes a production-ready health payload'],
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
          '"security:audit"',
          'backend-security-audit.ts',
          '"api:audit"',
          'api-route-audit.ts',
          '"api:audit:test"',
          'api-route-audit.test.ts',
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
          '"smoke:ready:test"',
          'readiness-smoke.test.ts',
        ],
        'package.json',
      )
      requireIncludes(
        securityAudit,
        [
          'adminRoutePattern',
          'admin route is missing requireAdminApiKey guard',
          'uuidParamRoutePattern',
          'route with /:id is missing rejectInvalidUuid guard',
          '$queryRawUnsafe',
        ],
        'scripts/backend-security-audit.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/backend-security-audit.test.ts'),
        [
          'catches unsafe raw SQL helpers',
          'allows tagged raw SQL parameterization',
          'catches admin routes without admin api key guards',
          'catches resource id routes without UUID guards',
        ],
        'scripts/backend-security-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-route-audit.test.ts'),
        ['discovers Elysia routes from source', 'reports missing, stale, and weak coverage entries'],
        'scripts/api-route-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/check-frontend-bundles.test.ts'),
        ['passes when main, chat, and lazy chunks stay under budget', 'reports missing split chunks'],
        'scripts/check-frontend-bundles.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-static-audit.test.ts'),
        ['reports buttons without explicit type', 'reports placeholder links'],
        'scripts/frontend-static-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-route-audit.test.ts'),
        ['collects declared React Router paths', 'reports static links and navigate calls'],
        'scripts/frontend-route-audit.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/route-menu-doc-check.test.ts'),
        ['passes when documented rows, routes, navigation, and preloads align', 'reports missing navigation coverage'],
        'scripts/route-menu-doc-check.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/smoke-helpers.test.ts'),
        ['defaults to local backend', 'does not impersonate a user by default against deployed targets'],
        'scripts/smoke-helpers.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/provider-smoke-guards.test.ts'),
        ['formats provider failure messages', 'maps image provider failures to actionable fixes'],
        'scripts/provider-smoke-guards.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/readiness-smoke.test.ts'),
        ['summarizes a ready payload', 'keeps readiness failures visible'],
        'scripts/readiness-smoke.test.ts',
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
      requireIncludes(readme, ['local/non-https CORS'], 'README.md')
      requireIncludes(deploymentQa, ['local/non-https CORS'], 'DEPLOYMENT_QA.md')
      requireIncludes(productionSetup, ['local/non-https CORS origins', 'CORS is local or non-https', 'local/non-https CORS'], 'PRODUCTION_SETUP.md')
      requireIncludes(
        await readRepoFile('DEPLOY_RENDER.md'),
        ['CORS_ORIGINS=https://<frontend-domain>', 'Do not include localhost, `http://` origins, wildcard origins, or the backend URL'],
        'DEPLOY_RENDER.md',
      )
      requireIncludes(await readRepoFile('STAGING_RUNBOOK.md'), ['local/non-https CORS', 'frontend HTTPS origin'], 'STAGING_RUNBOOK.md')
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
          'bun run secrets:patterns:test',
          'bun run memory:audit',
          'bun run knowledge:audit',
          'bun run vault:audit:test',
          'bun run eval:local',
          'bun run security:audit',
          'bun run security:audit:test',
          'bun run api:audit',
          'bun run api:audit:test',
          'bun run frontend:bundle:test',
          'bun run frontend:static:audit:test',
          'bun run frontend:route:audit:test',
          'bun run route-menu:audit',
          'bun run route-menu:audit:test',
          'bun run smoke:helpers:test',
          'bun run provider:smoke:guards:test',
          'bun run smoke:ready:test',
          'bun run release:handoff:check',
          'bun run release:handoff:test',
          'bun run deploy:status:test',
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
          'bun run secrets:patterns:test',
          'bun run vault:audit:test',
          'bun run deploy:doctor:self-test',
          'bun run memory:audit',
          'bun run knowledge:audit',
          'bun run eval:local',
          'bun run security:audit',
          'bun run security:audit:test',
          'bun run api:audit',
          'bun run api:audit:test',
          'bun run frontend:bundle:test',
          'bun run frontend:static:audit:test',
          'bun run frontend:route:audit:test',
          'bun run route-menu:audit',
          'bun run route-menu:audit:test',
          'bun run smoke:helpers:test',
          'bun run provider:smoke:guards:test',
          'bun run smoke:ready:test',
          'bun run release:handoff:check',
          'bun run release:handoff:test',
          'bun run deploy:readiness:test',
          'bun run deploy:status:test',
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
