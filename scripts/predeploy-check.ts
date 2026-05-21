import { access, readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { collectDocsCommandAuditResult } from './docs-command-audit'

const root = join(import.meta.dir, '..')

type Check = {
  name: string
  run: () => Promise<void>
}

const requiredFiles = [
  'AGENTS.md',
  'ABUSE_QA_CHECKLIST.md',
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
  'scripts/predeploy-check.test.ts',
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
  'scripts/docs-command-audit.ts',
  'scripts/docs-command-audit.test.ts',
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

const markdownHeadingFiles = [
  'README.md',
  'AGENTS.md',
  'agent.md',
  'ABUSE_QA_CHECKLIST.md',
  'DEPLOY_RENDER.md',
  'DEPLOYMENT_QA.md',
  'PRODUCTION_SETUP.md',
  'RELEASE_HANDOFF.md',
  'ROUTE_MENU_AUDIT.md',
  'SECURITY_CHECKLIST.md',
  'STAGING_RUNBOOK.md',
  'apps/backend/README.md',
  'apps/frontend/README.md',
  'evals/README.md',
  'knowledge/README.md',
  'knowledge/raw/README.md',
  'knowledge/wiki/INDEX.md',
  'knowledge/wiki/creator-studio.md',
  'knowledge/wiki/maprang-product.md',
  'knowledge/wiki/production-deploy.md',
  'knowledge/wiki/relationship-engine.md',
  'memory/README.md',
  'memory/api-backend/current-direction.md',
  'memory/deploy-blockers.md',
  'memory/production/checklist.md',
  'memory/qa-status.md',
  'memory/ui-ux/current-direction.md',
  'memory/working-context.md',
  'memory/decisions/0001-use-socraticode-local-tool.md',
  'memory/decisions/0002-add-markdown-memory-vault.md',
  'memory/decisions/0003-separate-live-provider-verification.md',
  'memory/decisions/0004-adult-mode-conflict-policy.md',
  'memory/decisions/0005-audit-memory-in-local-qa.md',
  'memory/decisions/0006-add-runtime-knowledge-layer.md',
  'memory/decisions/0007-add-deterministic-roleplay-evals.md',
  'memory/decisions/0008-stage-background-observability-tooling.md',
  'memory/decisions/0009-add-admin-prompt-inspector.md',
  'memory/decisions/0010-add-admin-automated-evals.md',
  'memory/decisions/0011-add-chat-world-state-controller.md',
  'memory/decisions/0012-add-usage-cost-intelligence.md',
  'memory/decisions/0013-add-prompt-budgeting.md',
  'memory/decisions/0014-add-chat-provider-failure-classification.md',
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
    throw new Error(`${file} ยังไม่มีข้อความที่ต้องมี: ${missing.join(', ')}`)
  }
}

function forbidIncludes(content: string, values: string[], file: string) {
  const present = values.filter((value) => content.includes(value))
  if (present.length > 0) {
    throw new Error(`${file} ยังมีข้อความเก่าที่ต้องเอาออก: ${present.join(', ')}`)
  }
}

function assertThaiFirstMarkdownHeadings(content: string, file: string) {
  const allowedTechnicalHeadings = [/^#{1,6}\s+API\b/, /^#{1,6}\s+URL\b/, /^#\s+\d{4}\s+-\s+/]
  const offenders = content
    .split(/\r?\n/)
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => /^#{1,6}\s+[A-Za-z0-9]/.test(line))
    .filter(({ line }) => !allowedTechnicalHeadings.some((pattern) => pattern.test(line)))

  if (offenders.length > 0) {
    const details = offenders.map(({ line, number }) => `${number}: ${line}`).join('; ')
    throw new Error(`${file} ยังมีหัวข้อ Markdown ที่ไม่ได้ขึ้นต้นแบบ Thai-first: ${details}`)
  }
}

const checks: Check[] = [
  {
    name: 'ไฟล์ deploy ที่จำเป็นต้องมีครบ',
    run: async () => {
      await Promise.all(requiredFiles.map(assertFile))
      const gitignore = await readRepoFile('.gitignore')
      requireIncludes(gitignore, ['.env.*', '!.env.example', '!.env.production.example'], '.gitignore')
    },
  },
  {
    name: 'หัวข้อ Markdown สำคัญต้องเป็น Thai-first',
    run: async () => {
      for (const file of markdownHeadingFiles) {
        assertThaiFirstMarkdownHeadings(await readRepoFile(file), file)
      }
    },
  },
  {
    name: 'คำสั่งในเอกสารและ workflow ต้องตรงกับ package scripts',
    run: async () => {
      const result = await collectDocsCommandAuditResult()
      if (result.findings.length > 0) {
        throw new Error(result.findings.join('; '))
      }
    },
  },
  {
    name: 'คู่มือส่งต่องาน agent พร้อมใช้งาน',
    run: async () => {
      const agentEntry = await readRepoFile('AGENTS.md')
      const agentGuide = await readRepoFile('agent.md')
      requireIncludes(
        agentEntry,
        [
          'agent.md',
          'ขอบเขต (Scope)',
          'การสานต่องาน (Continue Requests)',
          'memory/working-context.md',
          'memory/deploy-blockers.md',
          'เช็คขั้นต่ำ (Minimum Checks)',
          'bun run predeploy:check',
          'bun run secrets:check',
          'git diff --check',
          'การ commit และ push (Commit And Push)',
          'git status --short',
          'Do not commit secrets',
        ],
        'AGENTS.md',
      )
      requireIncludes(
        agentGuide,
        [
          'Maprang AI Agent Guide',
          'สถานะปัจจุบัน (Current Status)',
          'ทิศทางผลิตภัณฑ์ (Product Direction)',
          'กฎความปลอดภัยและเนื้อหา (Safety And Content Rules)',
          'ระบบหลักที่ต้องปกป้อง (Core Systems To Protect)',
          'Relationship Engine',
          'Scene Runtime',
          'Prompt/Context Engine',
          'คำสั่ง QA (QA Commands)',
          'bun run import-cycle:audit',
          'ตัวกั้น production (Production Blockers)',
          'เงื่อนไขว่างานเสร็จ (Definition Of Done)',
          'Backend URL เป็น deployed HTTPS URL จริง',
          '`CORS_ORIGINS` เป็น frontend HTTPS domain จริง',
        ],
        'agent.md',
      )
    },
  },
  {
    name: 'ตัวอย่าง env production ฝั่ง backend ครอบคลุมค่าจำเป็น',
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
    name: 'แนวทาง prompt ความยาว roleplay ตรงกับค่า production',
    run: async () => {
      const contextService = await readRepoFile('apps/backend/src/context.service.ts')
      const chatService = await readRepoFile('apps/backend/src/chat.service.ts')
      const config = await readRepoFile('apps/backend/src/config.ts')
      const creatorDraftService = await readRepoFile('apps/backend/src/creator-draft.service.ts')
      const promptInspectorService = await readRepoFile('apps/backend/src/prompt-inspector.service.ts')
      const relationshipEngine = await readRepoFile('apps/backend/src/relationship.engine.ts')
      const sceneRuntime = await readRepoFile('apps/backend/src/scene.runtime.ts')
      const chatStyleGuide = await readRepoFile('knowledge/structured/chat-style-guide.json')
      const backendEnv = await readRepoFile('apps/backend/src/env.ts')
      const backendEnvTest = await readRepoFile('apps/backend/src/env.test.ts')
      requireIncludes(
        contextService,
        ['กฎคุมพรอมป์ของแพลตฟอร์ม', 'คลังความรู้ที่เกี่ยวข้อง', 'คำสั่งขณะรัน'],
        'apps/backend/src/context.service.ts',
      )
      requireIncludes(
        promptInspectorService,
        ['กฎคุมพรอมป์ของแพลตฟอร์ม', 'คำสั่งขณะรัน', 'ความจำขณะรัน', 'ข้อความผู้ใช้'],
        'apps/backend/src/prompt-inspector.service.ts',
      )
      forbidIncludes(
        contextService,
        ['Platform prompt-control policy', 'Relevant lorebook entries', 'Runtime instructions'],
        'apps/backend/src/context.service.ts',
      )
      forbidIncludes(
        promptInspectorService,
        ['Platform prompt-control policy', 'Relevant lorebook entries', 'Runtime instructions', 'Runtime memory', 'User message'],
        'apps/backend/src/prompt-inspector.service.ts',
      )
      requireIncludes(
        contextService,
        ['4-6 ย่อหน้าสั้น', 'อย่างน้อย 5 ประโยคสมบูรณ์', '8-14 ประโยค'],
        'apps/backend/src/context.service.ts',
      )
      requireIncludes(config, ['คุณคือ Maprang', '4-6 ย่อหน้าสั้น', 'อย่างน้อย 5 ประโยคสมบูรณ์'], 'apps/backend/src/config.ts')
      requireIncludes(chatService, ['3-5 ย่อหน้าสั้น', 'ห้ามเขียนซ้ำข้อความก่อนหน้า'], 'apps/backend/src/chat.service.ts')
      requireIncludes(
        chatService,
        ['ผู้ใช้เปิดเผยความเปราะบาง', 'แรงกดดันจากผู้ใช้กระทบ trust/fear', 'จบด้วย outcome='],
        'apps/backend/src/chat.service.ts',
      )
      requireIncludes(
        creatorDraftService,
        ['สร้างดราฟต์ตัวละครโรลเพลย์ภาษาไทยสำหรับ Maprang AI', 'ตอบเป็น JSON เท่านั้น', 'คุณคือผู้ออกแบบตัวละครภาษาไทยระดับ senior'],
        'apps/backend/src/creator-draft.service.ts',
      )
      requireIncludes(
        sceneRuntime,
        ['สถานะ Scene Engine', 'โหมดฉาก', 'มีแจ้งเตือนฉากที่รอให้ผู้ใช้เลือก'],
        'apps/backend/src/scene.runtime.ts',
      )
      requireIncludes(
        relationshipEngine,
        ['สถานะ Relationship Engine', 'ตัวปรับพรอมป์', 'ใช้เป็นทิศทางพฤติกรรมแบบซ่อนอยู่'],
        'apps/backend/src/relationship.engine.ts',
      )
      requireIncludes(
        chatStyleGuide,
        ['4-6 ย่อหน้าสั้น', 'อย่างน้อย 5 ประโยคสมบูรณ์', '8-14 ประโยค'],
        'knowledge/structured/chat-style-guide.json',
      )
      forbidIncludes(
        config,
        ['You are Maprang', 'For roleplay, write naturally in scene', 'Do not invent facts you are unsure about'],
        'apps/backend/src/config.ts',
      )
      forbidIncludes(
        contextService,
        ['write 3-6 short paragraphs', 'at least 4 complete sentences', '7-12 sentences', 'write 4-6 short paragraphs', 'Reply naturally in Thai by default'],
        'apps/backend/src/context.service.ts',
      )
      forbidIncludes(
        chatService,
        [
          '2-4 short paragraphs',
          '3-5 short paragraphs',
          'The previous assistant turn was too short',
          'Do not repeat the previous text',
          'User shared vulnerability',
          'User pressure affected trust/fear',
          'ended as',
        ],
        'apps/backend/src/chat.service.ts',
      )
      forbidIncludes(
        creatorDraftService,
        ['Create a Thai roleplay character draft', 'Return JSON only', 'senior Thai character designer'],
        'apps/backend/src/creator-draft.service.ts',
      )
      forbidIncludes(
        sceneRuntime,
        ['Scene engine state', 'Pending scene notifications', 'Sandbox mode: continue', 'Let the character open up carefully', 'Run a focused relationship scene'],
        'apps/backend/src/scene.runtime.ts',
      )
      forbidIncludes(
        relationshipEngine,
        ['Relationship engine state', 'Status is', 'Behavior:', 'Progression:', 'Narrative:', 'Safety:', 'Constraint:', 'Active hooks'],
        'apps/backend/src/relationship.engine.ts',
      )
      forbidIncludes(
        chatStyleGuide,
        ['write 3-6 short paragraphs', 'at least 4 complete sentences', '7-12 sentences', 'write 4-6 short paragraphs', 'Reply naturally in Thai by default'],
        'knowledge/structured/chat-style-guide.json',
      )
      requireIncludes(
        backendEnv,
        ['MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production'],
        'apps/backend/src/env.ts',
      )
      requireIncludes(
        backendEnvTest,
        ['rejects production roleplay reply budget below baseline', 'MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS ต้องไม่น้อยกว่า 320 สำหรับคำตอบ roleplay ใน production'],
        'apps/backend/src/env.test.ts',
      )
    },
  },
  {
    name: 'ตัวอย่าง env production ฝั่ง frontend ครอบคลุมค่าจำเป็น',
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
    name: 'Dockerfile เปิด service ที่คาดไว้ครบ',
    run: async () => {
      const backend = await readRepoFile('apps/backend/Dockerfile')
      const frontend = await readRepoFile('apps/frontend/Dockerfile')
      requireIncludes(backend, ['COPY knowledge ./knowledge', 'RUN bunx prisma generate', 'EXPOSE 3000', 'CMD ["bun", "run", "start"]'], 'apps/backend/Dockerfile')
      requireIncludes(frontend, ['bun run build', 'FROM nginx', 'EXPOSE 80'], 'apps/frontend/Dockerfile')
    },
  },
  {
    name: 'migration ที่จำเป็นต้องมีครบ',
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
      if (missing.length > 0) throw new Error(`ยังไม่มี migration: ${missing.join(', ')}`)
    },
  },
  {
    name: 'เอกสาร production ระบุ migration, smoke test และ signed storage',
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
          'Production: bucket private พร้อม `SUPABASE_STORAGE_ACCESS=signed`',
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
          'ห้ามใส่ localhost, origin แบบ `http://`, wildcard origins, หรือ backend URL',
          'VITE_API_BASE_URL=https://<backend-domain>',
        ],
        'DEPLOY_RENDER.md',
      )
    },
  },
  {
    name: 'แม่แบบ release handoff พร้อมใช้งาน',
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
          'แม่แบบส่งมอบ release',
          'ห้ามวาง secrets',
          'ลิงก์ที่ deploy แล้ว (Deployed URLs)',
          'ฐานข้อมูลและ migrations',
          'ระบบ auth/storage และ CORS (Auth, Storage และ CORS)',
          'การยืนยันผู้ให้บริการ AI',
          'เกต QA (QA gates)',
          'การตรวจฝั่งผู้ดูแล',
          'ข้อจำกัดที่ยังรู้ก่อนปล่อย',
          'การตัดสินใจปล่อย',
        ],
        'RELEASE_HANDOFF.md',
      )
      requireIncludes(
        readme,
        ['RELEASE_HANDOFF.md', 'bun run production:check', 'ก่อนเปิดให้ผู้ใช้จริง', 'regression tests สำหรับ secret-pattern', 'tracked `.env`'],
        'README.md',
      )
      requireIncludes(deploymentQa, ['bun run secrets:patterns:test', 'secrets/secret-pattern/memory', 'Real `.env`'], 'DEPLOYMENT_QA.md')
      requireIncludes(packageJson, ['"release:handoff:check"', 'bun scripts/release-handoff-check.ts'], 'package.json')
      requireIncludes(packageJson, ['"release:handoff:test"', 'bun test scripts/release-handoff-check.test.ts'], 'package.json')
      requireIncludes(packageJson, ['"secrets:patterns:test"', 'bun test scripts/secret-patterns.test.ts'], 'package.json')
      requireIncludes(
        script,
        [
          'checkReleaseHandoffContent',
          'collectReleaseHandoffCheckResult',
          'runReleaseHandoffCheck',
          '--filled',
          'forbiddenPatterns',
          'forbiddenCopySnippets',
          'ตรวจเอกสารส่งมอบ release ไม่ผ่าน',
        ],
        'scripts/release-handoff-check.ts',
      )
      requireIncludes(
        test,
        ['accepts a filled release handoff', 'secret-shaped values', 'stale avatar-storage handoff labels', 'พบ GitHub token', 'requireFilled: true', 'importable runner'],
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
      requireIncludes(
        secretPatterns,
        ['Anthropic key', 'Hugging Face token', 'Stripe live secret key', 'GitHub token', 'Google API key', 'Slack token', 'Private key block'],
        'scripts/secret-patterns.ts',
      )
      requireIncludes(
        secretPatternsTest,
        ['Anthropic key', 'Hugging Face token', 'Stripe live secret key', 'repo scan allows placeholder docs', 'handoff and memory scans inherit repo secret coverage'],
        'scripts/secret-patterns.test.ts',
      )
    },
  },
  {
    name: 'สคริปต์ QA ครอบคลุม seed และ Playwright e2e smoke',
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
          '"frontend:api:test"',
          '"frontend:storage:test"',
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
          '"predeploy:check:test"',
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
          '"qa:repo"',
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
      const qaRepo = packageJson.scripts?.['qa:repo'] ?? ''
      const qaLocal = packageJson.scripts?.['qa:local'] ?? ''
      const qaLocalCoverage = `${qaRepo} ${qaLocal}`
      const stagingCheck = packageJson.scripts?.['staging:check'] ?? ''
      const stagingVerify = packageJson.scripts?.['staging:verify'] ?? ''
      const productionCheck = packageJson.scripts?.['production:check'] ?? ''
      if (smokeLive.includes('smoke:chat')) {
        throw new Error('package.json smoke:live ควรเรียก api:smoke:live เพียงครั้งเดียวแทนการเรียก smoke:chat แยก')
      }
      if (qaLive.includes('smoke:chat') || qaLive.includes('smoke:image')) {
        throw new Error('package.json qa:live ไม่ควรยิง provider ซ้ำจากคำสั่งนอก api:smoke:live')
      }
      if (!qaRepo.includes('predeploy:check') || !qaRepo.includes('backend:check') || !qaRepo.includes('frontend:check')) {
        throw new Error('package.json qa:repo ต้องครอบ predeploy, backend, และ frontend checks แบบ deterministic')
      }
      if (/(^|&&\s*)bun run (?:smoke:local|api:smoke|e2e:smoke)(?:\s|&&|$)/.test(qaRepo)) {
        throw new Error('package.json qa:repo ต้องไม่เรียก runtime smoke ที่ต้องมี backend/Postgres หรือ browser จริง')
      }
      if (!qaLocal.includes('bun run qa:repo') || !qaLocal.includes('bun run smoke:doctor') || !qaLocal.includes('bun run smoke:local') || !qaLocal.includes('bun run api:smoke')) {
        throw new Error('package.json qa:local ต้องต่อจาก qa:repo แล้วค่อยรัน runtime smoke สำหรับ backend/Postgres จริง')
      }
      if (!qaLocalCoverage.includes('secrets:patterns:test')) {
        throw new Error('package.json qa:local ต้องรัน secrets:patterns:test เพื่อจับ regression ของ secret pattern กลาง')
      }
      if (!qaLocalCoverage.includes('secrets:check:test')) {
        throw new Error('package.json qa:local ต้องรัน secrets:check:test เพื่อจับ regression ของเส้นทางสแกน secret ที่ commit แล้ว')
      }
      if (!qaLocalCoverage.includes('vault:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน vault:audit:test เพื่อจับ regression ของตัวช่วย audit memory/knowledge')
      }
      if (!qaLocalCoverage.includes('eval:local:test')) {
        throw new Error('package.json qa:local ต้องรัน eval:local:test เพื่อจับ regression ของผลลัพธ์ local eval')
      }
      if (!qaLocalCoverage.includes('security:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน security:audit:test เพื่อจับ regression ของ backend security audit')
      }
      if (!qaLocalCoverage.includes('import-cycle:audit') || !qaLocalCoverage.includes('import-cycle:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน import-cycle audit และ regression test เพื่อจับวงจร import ในสถาปัตยกรรม')
      }
      if (!qaLocalCoverage.includes('api:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน api:audit:test เพื่อจับ regression ของ route audit')
      }
      if (!qaLocalCoverage.includes('api:smoke:test')) {
        throw new Error('package.json qa:local ต้องรัน api:smoke:test เพื่อจับ regression ของตัวช่วย API smoke')
      }
      if (!qaLocalCoverage.includes('frontend:api:test')) {
        throw new Error('package.json qa:local ต้องรัน frontend:api:test เพื่อจับ regression ของ error API ฝั่ง frontend')
      }
      if (!qaLocalCoverage.includes('frontend:storage:test')) {
        throw new Error('package.json qa:local ต้องรัน frontend:storage:test เพื่อจับ regression ของ localStorage ฝั่ง frontend')
      }
      if (!qaLocalCoverage.includes('frontend:bundle:test')) {
        throw new Error('package.json qa:local ต้องรัน frontend:bundle:test เพื่อจับ regression ของ bundle budget')
      }
      if (!qaLocalCoverage.includes('frontend:static:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน frontend:static:audit:test เพื่อจับ regression ของ frontend static audit')
      }
      if (!qaLocalCoverage.includes('frontend:route:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน frontend:route:audit:test เพื่อจับ regression ของ frontend route audit')
      }
      if (!qaLocalCoverage.includes('route-menu:audit:test')) {
        throw new Error('package.json qa:local ต้องรัน route-menu:audit:test เพื่อจับ regression ของเอกสาร route/menu')
      }
      if (!qaLocalCoverage.includes('smoke:helpers:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:helpers:test เพื่อจับ regression ของ auth/url ใน smoke')
      }
      if (!qaLocalCoverage.includes('provider:smoke:guards:test')) {
        throw new Error('package.json qa:local ต้องรัน provider:smoke:guards:test เพื่อจับ regression ของ provider smoke guard')
      }
      if (!qaLocalCoverage.includes('smoke:doctor:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:doctor:test เพื่อจับ regression ของผลลัพธ์ blocker ใน smoke doctor')
      }
      if (!qaLocalCoverage.includes('smoke:ready:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:ready:test เพื่อจับ regression ของผลลัพธ์ readiness smoke')
      }
      if (!qaLocalCoverage.includes('smoke:image:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:image:test เพื่อจับ regression ของ image smoke fallback')
      }
      if (!qaLocalCoverage.includes('smoke:chat:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:chat:test เพื่อจับ regression ของการตรวจ live chat smoke')
      }
      if (!qaLocalCoverage.includes('smoke:local:test')) {
        throw new Error('package.json qa:local ต้องรัน smoke:local:test เพื่อจับ regression ของตัวช่วย local smoke')
      }
      if (!qaLocalCoverage.includes('e2e:smoke:test')) {
        throw new Error('package.json qa:local ต้องรัน e2e:smoke:test เพื่อจับ regression ของคำสั่ง browser smoke')
      }
      if (!qaLocalCoverage.includes('backend:check:db:test')) {
        throw new Error('package.json qa:local ต้องรัน backend:check:db:test เพื่อจับ regression ของแผนเช็ค backend ที่ต้องใช้ DB')
      }
      if (!qaLocalCoverage.includes('supabase:storage:test')) {
        throw new Error('package.json qa:local ต้องรัน supabase:storage:test เพื่อจับ regression ของตัวช่วย signed storage')
      }
      if (!qaLocalCoverage.includes('deploy:status:test')) {
        throw new Error('package.json qa:local ต้องรัน deploy:status:test เพื่อจับ regression ของผลลัพธ์ deploy status')
      }
      if (!qaLocalCoverage.includes('deploy:doctor:test')) {
        throw new Error('package.json qa:local ต้องรัน deploy:doctor:test เพื่อจับ regression ของตัวช่วย deploy env')
      }
      if (!qaLocalCoverage.includes('deploy:doctor:self-test')) {
        throw new Error('package.json qa:local ต้องรัน deploy:doctor:self-test เพื่อให้ self-test ของ deploy env CLI ยังถูกครอบไว้')
      }
      if (!qaLocalCoverage.includes('predeploy:check:test')) {
        throw new Error('package.json qa:local ต้องรัน predeploy:check:test เพื่อจับ regression ของการผูก predeploy guard')
      }
      if (!stagingCheck.includes('qa:full') || !stagingCheck.includes('supabase:storage:check') || !stagingCheck.includes('--require-admin')) {
        throw new Error('package.json staging:check ต้องครอบ qa:full, Supabase storage และ admin API smoke')
      }
      if (
        !stagingVerify.includes('bun scripts/smoke-doctor.ts --strict-staging') ||
        !stagingVerify.includes('bun run deploy:status') ||
        !stagingVerify.includes('supabase:storage:check') ||
        !stagingVerify.includes('smoke:ready') ||
        !stagingVerify.includes('--require-admin')
      ) {
        throw new Error('package.json staging:verify ต้องพิมพ์ deploy status และบังคับ strict staging smoke doctor, Supabase storage, readiness และ admin API smoke')
      }
      if (!productionCheck.includes('bun run deploy:status')) {
        throw new Error('package.json production:check ต้องพิมพ์ deploy status ก่อน strict production gates')
      }
      if (!productionCheck.includes('supabase:storage:check')) {
        throw new Error('package.json production:check ต้องตรวจ Supabase signed URL สำหรับรูปตัวละคร')
      }
      if (!productionCheck.includes('--require-admin')) {
        throw new Error('package.json production:check ต้องบังคับ admin smoke checks')
      }
      requireIncludes(
        frontendPackage,
        ['frontend-static-audit.ts', 'frontend-route-audit.ts', 'check-frontend-bundles.ts'],
        'apps/frontend/package.json',
      )
    },
  },
  {
    name: 'คลังความจำของโปรเจกต์พร้อมใช้งาน',
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
      requireIncludes(readme, ['memory/README.md', 'ความจำโปรเจกต์ (Project Memory)'], 'README.md')
      requireIncludes(memoryReadme, ['ห้ามเก็บ secrets', 'ขั้นตอนอัปเดต', 'บริบทงานปัจจุบัน', 'ตัวกั้นก่อน deploy'], 'memory/README.md')
      requireIncludes(workingContext, ['สถานะ local ปัจจุบัน', 'สถานะ production ปัจจุบัน'], 'memory/working-context.md')
      requireIncludes(deployBlockers, ['CHAT_PROVIDER_LIVE_VERIFIED', 'IMAGE_GENERATION_LIVE_VERIFIED'], 'memory/deploy-blockers.md')
      requireIncludes(
        productionChecklist,
        ['bun run deploy:doctor', 'bun run deploy:status', 'bun run api:smoke:live', 'อย่าชี้ `qa:local`'],
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
    name: 'ชั้นความรู้ของโปรเจกต์พร้อมใช้งาน',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const readme = await readRepoFile('README.md')
      const knowledgeReadme = await readRepoFile('knowledge/README.md')
      const wikiIndex = await readRepoFile('knowledge/wiki/INDEX.md')
      const backendKnowledge = await readRepoFile('apps/backend/src/knowledge.service.ts')
      const knowledgeAudit = await readRepoFile('scripts/knowledge-audit.ts')
      requireIncludes(packageJson, ['"knowledge:audit"', 'bun scripts/knowledge-audit.ts', 'bun run knowledge:audit'], 'package.json')
      requireIncludes(readme, ['ชั้นความรู้ (Knowledge Layer)', 'knowledge/README.md', 'bun run knowledge:audit'], 'README.md')
      requireIncludes(knowledgeReadme, ['การใช้งาน runtime', 'ชุดข้อมูล structured', 'ห้ามเก็บ secrets'], 'knowledge/README.md')
      requireIncludes(wikiIndex, ['โมเดลผลิตภัณฑ์ Maprang', 'Relationship Engine', 'Creator Studio', 'Production Deploy'], 'knowledge/wiki/INDEX.md')
      requireIncludes(
        backendKnowledge,
        ['buildChatKnowledgePrompt', 'buildCreatorKnowledgePrompt', 'structuredKnowledgeHealth', 'ชุดความรู้ structured ของ Maprang', 'รูปทรงคำตอบ', 'ชุดความรู้ครีเอเตอร์ของ Maprang'],
        'apps/backend/src/knowledge.service.ts',
      )
      requireIncludes(
        knowledgeAudit,
        ['collectKnowledgeAuditResult', 'runKnowledgeAudit', 'KnowledgeAuditResult', 'forbiddenStructuredEnglishSnippets', 'Roleplay content is fictional simulation.', 'if (import.meta.main) process.exit(await runKnowledgeAudit())'],
        'scripts/knowledge-audit.ts',
      )
    },
  },
  {
    name: 'ฐานทดสอบคุณภาพของโปรเจกต์พร้อมใช้งาน',
    run: async () => {
      const packageJson = await readRepoFile('package.json')
      const readme = await readRepoFile('README.md')
      const deploymentQa = await readRepoFile('DEPLOYMENT_QA.md')
      const evalReadme = await readRepoFile('evals/README.md')
      const evalService = await readRepoFile('apps/backend/src/eval.service.ts')
      const golden = await readRepoFile('evals/golden-roleplay.json')
      const promptfooRoleplay = await readRepoFile('evals/promptfoo.roleplay.yaml')
      const ciWorkflow = await readRepoFile('.github/workflows/ci.yml')
      requireIncludes(
        packageJson,
        ['"eval:local"', 'bun scripts/eval-local.ts', '"eval:local:test"', 'bun test scripts/eval-local.test.ts', '"eval:promptfoo"'],
        'package.json',
      )
      requireIncludes(readme, ['ชั้นประเมินผล (Evaluation Layer)', 'bun run eval:local', 'evals/golden-roleplay.json'], 'README.md')
      requireIncludes(deploymentQa, ['bun run eval:local', 'deterministic prompt assembly'], 'DEPLOYMENT_QA.md')
      requireIncludes(evalReadme, ['ชุดทดสอบหลัก (Golden Dataset)', 'คำสั่ง (Commands)', 'Promptfoo', 'ห้ามใส่ secret ใน eval fixtures'], 'evals/README.md')
      requireIncludes(
        evalService,
        ['ตัวละครทดสอบ Maprang', 'ไม่พบข้อความที่ต้องมี', 'โทเคนพรอมป์โดยประมาณ'],
        'apps/backend/src/eval.service.ts',
      )
      forbidIncludes(
        evalService,
        ['A slow-burn roleplay character', 'missing required text', 'found in assembled prompt', 'estimated prompt tokens'],
        'apps/backend/src/eval.service.ts',
      )
      requireIncludes(
        promptfooRoleplay,
        ['ชุดตรวจพรอมป์ roleplay แบบ deterministic ของ Maprang', 'echo สำหรับตรวจการประกอบพรอมป์', 'มี prompt-control policy ในพรอมป์'],
        'evals/promptfoo.roleplay.yaml',
      )
      requireIncludes(
        golden,
        ['roleplay-depth-and-knowledge', 'prompt-injection-defense', 'relationship-scene-continuity'],
        'evals/golden-roleplay.json',
      )
      requireIncludes(ciWorkflow, ['bun run eval:local', 'bun run eval:local:test'], '.github/workflows/ci.yml')
    },
  },
  {
    name: 'QA สำหรับ deploy ครอบคลุม relationship contract',
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
    name: 'local smoke ต้องไม่ซ่อนการยืนยัน live image',
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
        throw new Error('scripts/api-smoke.ts ต้องข้าม image provider ได้เฉพาะผ่าน skipImageProvider: !live')
      }
      if (!packageJson.scripts?.['api:smoke:live']?.includes('--live --require-live-image')) {
        throw new Error('package.json api:smoke:live ต้องบังคับตรวจ live image provider จริง')
      }
      if (!packageJson.scripts?.['production:check']?.includes('bun scripts/smoke-doctor.ts --strict-production')) {
        throw new Error('package.json production:check ต้องรัน smoke-doctor ใน strict production mode')
      }
      if (!packageJson.scripts?.['staging:verify']?.includes('bun scripts/smoke-doctor.ts --strict-staging')) {
        throw new Error('package.json staging:verify ต้องรัน smoke-doctor ใน strict staging mode')
      }
    },
  },
  {
    name: 'deploy status ใช้ readiness logic ร่วมกัน',
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
          'ขั้นตอนถัดไป:',
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
          'สถานะ deploy Maprang',
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
        ['evaluateDeployReadiness', 'buildNextDeploySteps', 'live smoke ของผู้ให้บริการแชทยังไม่ได้ยืนยันผ่าน', 'RELEASE_HANDOFF.md'],
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
          'คำตอบ roleplay ใน production',
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
          'ควรตั้งอย่างน้อย 1200 สำหรับคำตอบ roleplay ใน production',
          'ควรตั้งอย่างน้อย 320 สำหรับคำตอบ roleplay ใน production',
          'แนะนำ 1600 เพื่อให้ roleplay ตอบได้มีมิติมากขึ้น',
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
          'MODEL_MAX_OUTPUT_TOKENS ต้องไม่น้อยกว่า 1200 สำหรับคำตอบ roleplay ใน production',
        ],
        'scripts/deploy-readiness.test.ts',
      )
      requireIncludes(deploymentQa, ['bun run deploy:status', 'bun scripts/deploy-status.ts --json'], 'DEPLOYMENT_QA.md')
      requireIncludes(readme, ['bun run deploy:status', '`staging:verify` จะพิมพ์', 'stagingBlockerCount', 'สรุป blocker และ next steps'], 'README.md')
      requireIncludes(stagingRunbook, ['bun run deploy:status', 'bun run staging:verify', 'bun run production:check'], 'STAGING_RUNBOOK.md')
    },
  },
  {
    name: 'security checklist และ audit script พร้อมใช้งาน',
    run: async () => {
      const checklist = await readRepoFile('SECURITY_CHECKLIST.md')
      const abuseChecklist = await readRepoFile('ABUSE_QA_CHECKLIST.md')
      const packageJson = await readRepoFile('package.json')
      const securityAudit = await readRepoFile('scripts/backend-security-audit.ts')
      const authPanel = await readRepoFile('apps/frontend/src/components/AuthPanel.tsx')
      const workspacePage = await readRepoFile('apps/frontend/src/pages/WorkspacePage.tsx')
      const backendRedaction = await readRepoFile('apps/backend/src/redaction.ts')
      const creatorDraft = await readRepoFile('apps/backend/src/creator-draft.service.ts')
      const creatorDraftTest = await readRepoFile('apps/backend/src/creator-draft.service.test.ts')
      const promptInspector = await readRepoFile('apps/backend/src/prompt-inspector.service.ts')
      const promptInspectorTest = await readRepoFile('apps/backend/src/prompt-inspector.service.test.ts')
      const routeGuards = await readRepoFile('apps/backend/src/route-guards.ts')
      const routeIdValidationTest = await readRepoFile('apps/backend/src/route-id-validation.test.ts')
      requireIncludes(
        checklist,
        [
          'SQL Injection',
          'การฉีดคำสั่งฐานข้อมูล',
          'Broken Access Control',
          'สิทธิ์เข้าถึงข้ามบัญชี',
          'ความปลอดภัย frontend XSS และลิงก์ (Frontend XSS / Link Safety)',
          'ความปลอดภัย frontend XSS และลิงก์',
          'dangerouslySetInnerHTML',
          'rel="noopener noreferrer"',
          'logUnexpectedError',
          'Prompt Control',
          'การคุมพรอมป์',
          'bun run security:audit',
          'requireAdminApiKey',
          'retrieved lore preview',
          'Production Must-Pass',
          'สิ่งที่ต้องผ่านก่อน production',
          'ABUSE_QA_CHECKLIST.md',
        ],
        'SECURITY_CHECKLIST.md',
      )
      requireIncludes(
        abuseChecklist,
        [
          'SQL-like input',
          'Broken access',
          'Auth spoofing',
          'Prompt control',
          'Frontend XSS',
          'Admin audit',
          'Token/rate limit',
          'Storage/avatar',
        ],
        'ABUSE_QA_CHECKLIST.md',
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
          'route ผู้ดูแลยังไม่มี requireAdminApiKey guard',
          'uuidParamRoutePattern',
          'route ที่มี /:id ยังไม่มี rejectInvalidUuid guard',
          'rawRouteErrorResponsePattern',
          'rawRouteErrorThrowPattern',
          'catchErrorStartPattern',
          'rawErrorCodePropertyPattern',
          'collectRawRouteCatchMessageFindings',
          'route response ห้ามส่ง raw error.message ใน detail',
          'route response ห้ามส่ง raw error detail ตรงๆ',
          'route catch ห้ามคืน error.message เป็น message ตรงๆ',
          'route error response ยังไม่มี message แบบ Thai-first',
          'route throw raw error object',
          'collectKnownRouteErrorMessages',
          'runBackendSecurityAudit',
          '$queryRawUnsafe',
        ],
        'scripts/backend-security-audit.ts',
      )
      requireIncludes(
        routeGuards,
        ['const code = routeErrorMessages[error] ? error : \'unknown_error\'', 'return { error: code, message: routeErrorMessage(code) }'],
        'apps/backend/src/route-guards.ts',
      )
      requireIncludes(
        routeIdValidationTest,
        ['routeErrorResponse(\'new_unmapped_code\')', 'error: \'unknown_error\''],
        'apps/backend/src/route-id-validation.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/backend-security-audit.test.ts'),
        [
          'collects direct source-file targets and skips test fixtures',
          'catches unsafe raw SQL helpers',
          'allows tagged raw SQL parameterization',
          'catches raw error message details in route responses',
          'catches direct raw error details in route responses',
          'catches route catch responses that expose raw error messages',
          'catches route catch responses that expose stringified raw errors',
          'catches route catch error fields derived from raw errors',
          'catches generic raw error messages after an AuthError branch',
          'allows route catch responses for controlled AuthError messages',
          'catches admin routes without admin api key guards',
          'catches resource id routes without UUID guards',
          'catches route error responses without Thai-first messages',
          'catches route raw error throws',
          'extracts route error message keys and helper calls for explicit-copy checks',
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
        ['allows live smoke to continue only for live verification readiness failures', 'validates machine-readable API smoke error codes', 'imports the API smoke runner without executing the smoke flow', 'builds API smoke summary counts for automation'],
        'scripts/api-smoke-helpers.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/api-smoke.ts'),
        ['GET /', 'validateBackendRootIdentity', 'assertMachineReadableErrorCode(payload', 'ApiSmokeRunnerOptions', 'buildApiSmokeSummary', 'runApiSmoke', 'if (import.meta.main) process.exit(await runApiSmoke())'],
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
        await readRepoFile('apps/frontend/src/lib/api.ts'),
        ['safeApiUserMessage', 'rawTechnicalMessagePattern', "safeApiUserMessage(payloadString(payload, 'message'))", 'parseChatStreamEvent', 'chatStreamMalformedPayload', 'malformedChatStreamError'],
        'apps/frontend/src/lib/api.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-api-errors.test.ts'),
        ['does not surface raw technical backend messages even when message exists', 'wraps malformed chat stream events in a Thai ApiError', 'wraps interrupted chat stream reads in a Thai ApiError', 'safeApiUserMessage', 'parseChatStreamEvent', 'Cannot read properties of undefined'],
        'scripts/frontend-api-errors.test.ts',
      )
      requireIncludes(
        await readRepoFile('apps/frontend/src/lib/safeStorage.ts'),
        ['safeGetStorageItem', 'safeSetStorageItem', 'safeRemoveStorageItem'],
        'apps/frontend/src/lib/safeStorage.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-storage.test.ts'),
        [
          'wraps localStorage reads, writes, and removals without throwing',
          'parses pinned chat ids defensively',
          'keeps frontend source on safe storage wrappers',
        ],
        'scripts/frontend-storage.test.ts',
      )
      requireIncludes(
        await readRepoFile('apps/frontend/src/lib/pinnedChats.ts'),
        ['loadPinnedChatIdsFromRaw', 'serializePinnedChatIds', 'safeSetStorageItem'],
        'apps/frontend/src/lib/pinnedChats.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/frontend-static-audit.test.ts'),
        [
          'reports buttons without explicit type',
          'reports unsafe new-tab links without opener protection',
          'reports placeholder links',
          'reports risky frontend DOM and code execution patterns',
          'reports Thai placeholder and mojibake text regressions',
          'reports English UI label regressions for Thai-first surfaces',
          'reports mixed English debug copy regressions for Thai-first surfaces',
          'พบข้อความ error ดิบจาก auth/provider ที่อาจแสดงให้ผู้ใช้เห็น',
          'พบข้อความ error ดิบจาก Redux async ที่อาจแสดงให้ผู้ใช้เห็น',
          'พบข้อความ Creator Studio ปนอังกฤษที่ควรเป็น Thai-first',
          'reports mixed Admin Health operational copy regressions',
          'reports mixed prompt and admin tooling wording regressions',
          'reports mixed lorebook and persona wording regressions',
          'reports mixed profile and tag helper wording regressions',
          'frontend source ห้าม log raw error object',
          'พบข้อความ Admin Health ปนอังกฤษที่ควรเป็น Thai-first',
          'พบข้อความ prompt/admin tooling ปนอังกฤษที่ควรเป็น Thai-first',
          'พบข้อความคลังความรู้หรือตัวตนผู้เล่นปนอังกฤษที่ควรเป็น Thai-first',
          'พบข้อความ profile/tag helper ปนอังกฤษที่ควรเป็น Thai-first',
          'Lorebook',
          'Persona ชั่วคราว',
          'keyword',
          'visual cue',
          'roleplay, thai',
          'AI roleplay ภาษาไทย',
          'image provider',
          'backend',
          'Lobby',
          'Relationship Contract',
          'prompt-control',
          'โน้ต runtime',
          'persona ชั่วคราว',
          'ยัง fallback',
          'เหตุผล disabled',
          'runs the committed frontend static audit through an importable runner',
          'dangerouslySetInnerHTML',
          'target="_blank"',
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
          'auditLinksWithAst',
          'dangerouslySetInnerHTML',
          '\\.innerHTML\\s*=',
          '\\beval\\s*\\(',
          '\\bnew\\s+Function\\s*\\(',
          '\\bwindow\\.open\\s*\\(',
          'console\\.error',
          'logUnexpectedError',
          `targetValue === '_blank'`,
          'setNote\\(\\s*error\\s+instanceof\\s+Error\\s*\\?\\s*error\\.message',
          'state\\.error\\s*=\\s*action\\.error\\.message',
          'image provider',
          'production\\s+ควรตั้งค่า',
          'roleplay,\\s*thai',
          'AI\\s+roleplay\\s+ภาษาไทย',
          'Lobby\\s+ดูน่ากด',
          'แกน\\s+prompt',
          'backend\\s+ช่วยร่าง',
          'backend\\s+ยังไม่พร้อมเต็ม',
          'health\\s+response\\s+จาก\\s+backend',
          'backend\\/frontend\\s+domain',
          'System\\s+prompt',
          'redacted\\s+prompt',
          'prompt\\s+snapshot',
          'admin\\s+API',
          'Lorebook',
          'lore\\s+ที่ดึงมาใช้',
          'Persona\\s+ชั่วคราว',
          'keyword|aliases|priority',
          'visual\\s+cue',
          'โน้ต\\s+runtime',
          'persona\\s+ชั่วคราว',
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
        authPanel,
        ['authFailureMessage', 'logUnexpectedError', 'เชื่อมต่อระบบบัญชีไม่สำเร็จ:', '.catch((error)', 'disabled={isBusy}'],
        'apps/frontend/src/components/AuthPanel.tsx',
      )
      requireIncludes(
        workspacePage,
        ['refreshWorkspaceAuth', 'โหลดสถานะบัญชีไม่สำเร็จ:', 'โหลดสถานะบัญชีไม่สำเร็จ แต่ยังใช้โหมดในเครื่องต่อได้'],
        'apps/frontend/src/pages/WorkspacePage.tsx',
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
          'Automated route smoke',
          'horizontal overflow',
          'runs the committed route/menu doc check through an importable runner',
        ],
        'scripts/route-menu-doc-check.test.ts',
      )
      requireIncludes(
        await readRepoFile('scripts/route-menu-doc-check.ts'),
        ['defaultForbiddenSnippets', 'Automated route smoke', 'horizontal overflow', 'ข้อความ placeholder', 'collectRouteMenuDocCheckResult', 'runRouteMenuDocCheck', 'if (import.meta.main) process.exit(await runRouteMenuDocCheck())'],
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
        ['redactSensitiveText', 'redactLoreForInspector', 'retrievalRedactionCount', 'redactedLore.map'],
        'apps/backend/src/prompt-inspector.service.ts',
      )
      requireIncludes(
        backendRedaction,
        ['redactSensitiveText', 'sk-ant-', 'hf_', 'sk_live_', 'github_pat_', 'AIza', 'xox', 'PRIVATE KEY', 'postgres'],
        'apps/backend/src/redaction.ts',
      )
      requireIncludes(
        creatorDraft,
        ['redactSensitiveText', 'safeFailureDetail', 'friendlyImageFailureReason', 'ผู้ให้บริการสร้างรูปตอบกลับ'],
        'apps/backend/src/creator-draft.service.ts',
      )
      requireIncludes(
        creatorDraftTest,
        [
          'redacts secret-shaped text model failures before returning creator warnings',
          'redacts secret-shaped image provider failures before returning notes',
          'not.toContain(leakedProviderKey)',
          'not.toContain(leakedImageKey)',
        ],
        'apps/backend/src/creator-draft.service.test.ts',
      )
      requireIncludes(
        promptInspectorTest,
        ['fakeDatabaseUrl', 'fakeAnthropicKey', 'fakeHuggingFaceToken', 'fakeStripeKey', 'fakeGitHubToken', 'fakeGoogleKey', 'fakeSlackToken', 'fakePrivateKey', 'retrieval.lore', 'not.toContain(fakeDatabaseUrl)'],
        'apps/backend/src/prompt-inspector.service.test.ts',
      )
    },
  },
  {
    name: 'route/menu audit และ staging runbook พร้อมใช้งาน',
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
          'Supabase สำหรับ Staging',
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
      requireIncludes(productionSetup, ['local/non-https CORS origins', 'CORS เป็น local หรือไม่ใช่ HTTPS', 'local/non-https CORS'], 'PRODUCTION_SETUP.md')
      forbidIncludes(
        await readRepoFile('ROUTE_MENU_AUDIT.md'),
        ['รัน eval', 'prompt-control', 'token budget', 'accordion', ' disabled '],
        'ROUTE_MENU_AUDIT.md',
      )
      requireIncludes(
        await readRepoFile('DEPLOY_RENDER.md'),
        ['CORS_ORIGINS=https://<frontend-domain>', 'ห้ามใส่ localhost, origin แบบ `http://`, wildcard origins, หรือ backend URL'],
        'DEPLOY_RENDER.md',
      )
      requireIncludes(await readRepoFile('STAGING_RUNBOOK.md'), ['local/non-https CORS', 'frontend HTTPS origin'], 'STAGING_RUNBOOK.md')
      requireIncludes(
        e2eSmoke,
        ['ตรวจเส้นทาง/เมนู', 'ตรวจพรอมป์ก่อนยิงโมเดล', 'กฎคุมพรอมป์ของแพลตฟอร์ม', 'ทดสอบคุณภาพพรอมป์และบริบท', 'สรุป blocker production', 'เช็กลิสต์ deploy', 'แถบแชท'],
        'tests/e2e/maprang-smoke.spec.ts',
      )
      requireIncludes(e2eSmoke, ['expectBackendRootIdentity', 'maprang-backend'], 'tests/e2e/maprang-smoke.spec.ts')
      forbidIncludes(
        e2eSmoke,
        ['Production blocker summary', 'Deploy checklist', 'Chat Sidebar', 'Prompt Inspector', 'Automated Evals', 'prompt/context', 'Platform prompt-control policy'],
        'tests/e2e/maprang-smoke.spec.ts',
      )
    },
  },
  {
    name: 'workflow production smoke พร้อมใช้งาน',
    run: async () => {
      const workflow = await readRepoFile('.github/workflows/production-smoke.yml')
      const ciWorkflow = await readRepoFile('.github/workflows/ci.yml')
      requireIncludes(
        workflow,
        [
          'workflow_dispatch',
          'Backend URL ที่ต้องการทดสอบ ถ้าเว้นว่างจะใช้ repository secret SMOKE_API_BASE_URL',
          'รันทดสอบแชทจริงกับ AI คำสั่งนี้ใช้เครดิตผู้ให้บริการจริง',
          'รันทดสอบสร้างรูปจริง คำสั่งนี้ใช้เครดิตสร้างรูปจริง',
          'ยอดโทเคนขั้นต่ำของผู้ใช้ smoke ก่อนรันทดสอบแชทจริงที่ใช้เครดิตผู้ให้บริการจริง',
          'ตรวจ config ก่อนรัน smoke',
          'พิมพ์สถานะ deploy readiness',
          'ตรวจ Supabase signed URL สำหรับรูปตัวละคร',
          'ตรวจ admin APIs',
          'SMOKE_API_BASE_URL',
          'SMOKE_ADMIN_API_KEY',
          'SMOKE_MIN_TOKEN_BALANCE_FOR_CHAT',
          'SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY',
          'ตั้ง workflow input api_base_url หรือ repository secret SMOKE_API_BASE_URL ก่อนรัน smoke',
          'SMOKE_API_BASE_URL ต้องเป็น backend URL ที่ deploy แล้วแบบ https',
          'ตั้ง repository secret SMOKE_ADMIN_API_KEY เพื่อให้ production smoke ตรวจรายงานและ audit log ฝั่งผู้ดูแล',
          '--require-admin',
          'bun install --frozen-lockfile',
          'bun run predeploy:check',
          'bun run predeploy:check:test',
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
          'bun run frontend:api:test',
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
      forbidIncludes(
        workflow,
        [
          'Set workflow input api_base_url',
          'must be a deployed https backend URL',
          'Set repository secret SMOKE_ACCESS_TOKEN',
          'Set repository secret SMOKE_ADMIN_API_KEY',
          'Set repository secrets SUPABASE_URL',
          'Set repository secret SUPABASE_STORAGE_BUCKET',
          'Set repository secret SUPABASE_STORAGE_ACCESS',
          'Set repository secret SUPABASE_SIGNED_URL_EXPIRES_IN',
          'Backend URL to test',
          'รัน live AI chat smoke',
          'รัน live image generation smoke',
          'ยอดโทเคนขั้นต่ำของ smoke user ก่อนรัน live chat smoke',
          'This uses provider credits',
          'This uses image provider credits',
          'Minimum smoke-user token balance',
          'Validate smoke configuration',
          'Print deploy readiness status',
          'Verify Supabase signed avatar storage',
          'ตรวจ Supabase signed avatar storage',
          'Verify admin APIs',
        ],
        '.github/workflows/production-smoke.yml',
      )
      requireIncludes(
        ciWorkflow,
        [
          'bun run predeploy:check',
          'bun run predeploy:check:test',
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
          'bun run frontend:api:test',
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
      const ciRootInstallCount = ciWorkflow.match(/name: ติดตั้ง dependencies ระดับ repo[\s\S]*?run: bun install --frozen-lockfile/g)?.length ?? 0
      if (ciRootInstallCount < 2) {
        throw new Error('CI ต้องติดตั้ง root dependencies ก่อนรัน secrets และ predeploy repo-owned gates')
      }
      requireIncludes(ciWorkflow, ['รัน local smoke จาก seed'], '.github/workflows/ci.yml')
      forbidIncludes(ciWorkflow, ['Install root dependencies', 'Run seeded local smoke tests'], '.github/workflows/ci.yml')
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
  console.log(`${result.ok ? 'ผ่าน' : 'ไม่ผ่าน'} - ${result.name}${result.error ? `: ${result.error}` : ''}`)
}

if (results.some((result) => !result.ok)) process.exit(1)
