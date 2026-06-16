import { access, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const docPath = join(root, 'docs/MISSAI_TEMPLATE_AUDIT.md')
const appPath = join(root, 'apps/frontend/src/App.tsx')
const cssPath = join(root, 'apps/frontend/src/index.css')
const publicFontPath = join(root, 'apps/frontend/public/fonts/missai/source_sans/source-sans-3-v18-latin-regular.woff2')

export type MissAiTemplateAuditResult = {
  findings: string[]
}

const requiredMappings = [
  ['home.html', '/'],
  ['history.html', '/chats'],
  ['creation.html', '/create'],
  ['ai-creator.html', '/ai-creator'],
  ['notifications.html', '/events'],
  ['points.html', '/wallet'],
  ['settings.html', '/profile'],
  ['announcements.html', '/announcements'],
  ['support.html', '/support'],
  ['creators.html', '/creators'],
  ['favorites.html', '/favorites'],
  ['works.html', '/works'],
  ['creative-plaza.html', 'community/creator discovery'],
] as const

const requiredRoutes = [
  '/',
  '/chats',
  '/chat',
  '/chat/:chatId',
  '/create',
  '/ai-creator',
  '/wallet',
  '/profile',
  '/events',
  '/characters/:id',
  '/moderation',
  '/admin/health',
  '/admin/prompt-inspector',
  '/admin/evals',
] as const

const requiredUtilities = [
  'missai-page',
  'missai-shell',
  'missai-card',
  'missai-button-primary',
  'missai-button-secondary',
  'missai-button-danger',
  'missai-icon-button',
  'missai-input',
  'missai-dialog',
  'missai-rail',
  'missai-sidebar',
  'missai-bottom-nav',
  'missai-menu',
  'missai-menu-item',
  'missai-menu-item-danger',
  'missai-tab',
  'missai-tab-active',
  'missai-badge',
  'missai-empty',
] as const

function includesToken(content: string, token: string) {
  return content.includes(token)
}

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

export async function collectMissAiTemplateAuditResult(): Promise<MissAiTemplateAuditResult> {
  const findings: string[] = []
  const [doc, app, css] = await Promise.all([
    readFile(docPath, 'utf8').catch(() => ''),
    readFile(appPath, 'utf8').catch(() => ''),
    readFile(cssPath, 'utf8').catch(() => ''),
  ])

  if (!doc) findings.push('docs/MISSAI_TEMPLATE_AUDIT.md ยังไม่มีหรืออ่านไม่ได้')
  if (!app) findings.push('apps/frontend/src/App.tsx ยังไม่มีหรืออ่านไม่ได้')
  if (!css) findings.push('apps/frontend/src/index.css ยังไม่มีหรืออ่านไม่ได้')

  for (const [source, route] of requiredMappings) {
    if (!includesToken(doc, source) || !includesToken(doc, route)) {
      findings.push(`template mapping ยังไม่ครอบคลุม ${source} -> ${route}`)
    }
  }

  for (const route of requiredRoutes) {
    if (!includesToken(app, `path="${route}"`) && !includesToken(app, `path='${route}'`)) {
      findings.push(`App.tsx ยังไม่มี Route path="${route}"`)
    }
  }

  for (const utility of requiredUtilities) {
    if (!includesToken(css, `.${utility}`)) findings.push(`index.css ยังไม่มี utility .${utility}`)
    if (!includesToken(doc, utility)) findings.push(`MISSAI_TEMPLATE_AUDIT.md ยังไม่ระบุ utility ${utility}`)
  }

  if (css.includes('_next/') || css.includes('/_next/')) {
    findings.push('index.css ห้ามอ้างอิง _next runtime/chunks จาก MissAI')
  }

  if (!(await exists(publicFontPath))) {
    findings.push('ยังไม่พบ local MissAI font ใน apps/frontend/public/fonts/missai')
  }

  return { findings }
}

export async function runMissAiTemplateAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectMissAiTemplateAuditResult()

  if (result.findings.length > 0) {
    writeError('ตรวจ MissAI template migration ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine('ผ่าน - ตรวจ MissAI template migration ผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runMissAiTemplateAudit())
