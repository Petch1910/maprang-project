import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { secretPatterns } from './secret-patterns'

const root = join(import.meta.dir, '..')
const file = join(root, 'RELEASE_HANDOFF.md')

const requiredSections = [
  'แม่แบบส่งมอบ release',
  'ตัวตนของ release',
  'ลิงก์ที่ deploy แล้ว (Deployed URLs)',
  'ฐานข้อมูลและ migrations',
  'ระบบ auth/storage และ CORS (Auth, Storage และ CORS)',
  'การยืนยันผู้ให้บริการ AI',
  'เกต QA (QA gates)',
  'การตรวจฝั่งผู้ดูแล',
  'ข้อจำกัดที่ยังรู้ก่อนปล่อย',
  'การตัดสินใจปล่อย',
]

const forbiddenPatterns = [
  ...secretPatterns,
  { name: 'raw access token', pattern: /\b(access|refresh|service)[_-]?token\s*:\s*\S{16,}/i },
]

const forbiddenCopySnippets = ['ผู้ให้บริการ avatar storage', 'รูปแบบการเข้าถึง avatar storage']

const requiredFieldLabels = [
  'Environment',
  'Frontend URL',
  'Backend URL',
  'Health URL',
  'Ready URL',
  'CORS origins',
  'Go / no-go',
]
const requiredFieldSnippets = requiredFieldLabels.map((label) => `- ${label}:`)

const requiredReleaseIdentityFieldLabels = [
  'วันที่ release',
  'Git commit',
  'Branch',
  'ผู้รับผิดชอบ',
]
const requiredReleaseIdentityFieldSnippets = requiredReleaseIdentityFieldLabels

const requiredMigrationFieldLabels = [
  'Database host/provider',
  'คำสั่ง migration',
  'ผล migration',
  'Prisma migration version',
]
const requiredMigrationFieldSnippets = requiredMigrationFieldLabels

const requiredAuthStorageFieldLabels = [
  'โหมด auth',
  'Supabase project ref',
  'ผู้ให้บริการพื้นที่เก็บรูปตัวละคร',
  'รูปแบบการเข้าถึงรูปตัวละคร',
  'อายุ signed URL',
]
const requiredAuthStorageFieldSnippets = requiredAuthStorageFieldLabels

const requiredQaGateLabels = [
  '`bun run qa:local`',
  '`bun run e2e:smoke`',
  'E2E_BASE_URL',
  'E2E_API_BASE_URL',
  '`bun run frontend:env:test`',
  '`bun run frontend:storage:test`',
  '`bun run frontend:clipboard:test`',
  '`bun run staging:verify`',
  '`bun run production:check`',
  'GitHub Production Smoke run',
]
const requiredQaGateSnippets = requiredQaGateLabels

const requiredAdminCheckLabels = [
  '`/admin/health`',
  '`/admin/prompt-inspector`',
  '`/admin/evals`',
  'รายงาน moderation',
  'audit logs ของผู้ดูแล',
]
const requiredAdminCheckSnippets = requiredAdminCheckLabels

export type ReleaseHandoffCheckResult = {
  ok: boolean
  requireFilled: boolean
  findings: string[]
}

function fieldValue(content: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function hasField(content: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^- ${escaped}:`, 'm').test(content)
}

function fieldValueByCodeLabel(content: string, codeLabel: string) {
  const escaped = codeLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return content.match(new RegExp(`^- [^:\\n]*${escaped}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? ''
}

function isLoopbackHost(hostname: string) {
  return ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'].includes(hostname.toLowerCase())
}

function deployedHttpsUrl(value: string) {
  const normalized = value.trim()
  if (normalized.includes('<') || normalized.includes('>') || normalized.includes('*')) return null
  try {
    const url = new URL(normalized)
    if (url.protocol !== 'https:') return null
    if (isLoopbackHost(url.hostname)) return null
    if (url.username || url.password) return null
    return url
  } catch {
    return null
  }
}

function looksLikeDeployedHttpsUrl(value: string) {
  return deployedHttpsUrl(value) !== null
}

function looksLikeFrontendCorsOrigin(value: string, backendOrigin = '') {
  const url = deployedHttpsUrl(value)
  if (!url) return false
  const normalized = value.trim().replace(/\/$/, '')
  if (`${url.protocol}//${url.host}` !== normalized) return false
  if (backendOrigin && url.origin === backendOrigin) return false
  return true
}

function isDeployedOrigin(value: string) {
  const url = deployedHttpsUrl(value)
  if (!url) return false
  return value.trim().replace(/\/$/, '') === url.origin
}

function looksLikeBackendCheckUrl(value: string, backendOrigin: string, expectedPath: '/health' | '/ready') {
  const url = deployedHttpsUrl(value)
  if (!url || !backendOrigin) return false
  return url.origin === backendOrigin && url.pathname === expectedPath && !url.search && !url.hash
}

function validateFilledReleaseHandoffUrls(content: string, findings: string[]) {
  for (const label of ['Frontend URL', 'Backend URL', 'Health URL', 'Ready URL']) {
    const value = fieldValue(content, label)
    if (value && !looksLikeDeployedHttpsUrl(value)) findings.push(`URL ใน release handoff ต้องเป็น https deployed URL: ${label}`)
  }

  const backendOrigin = deployedHttpsUrl(fieldValue(content, 'Backend URL'))?.origin ?? ''
  for (const label of ['Frontend URL', 'Backend URL']) {
    const value = fieldValue(content, label)
    if (value && !isDeployedOrigin(value)) findings.push(`URL ใน release handoff ต้องเป็น deployed origin ไม่มี path/query/hash: ${label}`)
  }
  const healthUrl = fieldValue(content, 'Health URL')
  if (healthUrl && !looksLikeBackendCheckUrl(healthUrl, backendOrigin, '/health')) {
    findings.push('Health URL ใน release handoff ต้องชี้ backend origin เดียวกับ Backend URL และใช้ path /health โดยไม่มี query/hash')
  }
  const readyUrl = fieldValue(content, 'Ready URL')
  if (readyUrl && !looksLikeBackendCheckUrl(readyUrl, backendOrigin, '/ready')) {
    findings.push('Ready URL ใน release handoff ต้องชี้ backend origin เดียวกับ Backend URL และใช้ path /ready โดยไม่มี query/hash')
  }

  const corsOrigins = fieldValue(content, 'CORS origins')
  const origins = corsOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (corsOrigins && (origins.length === 0 || origins.some((origin) => !looksLikeFrontendCorsOrigin(origin, backendOrigin)))) {
    findings.push('CORS origins ใน release handoff ต้องเป็น frontend HTTPS origin จริงเท่านั้น')
  }
}

function validateProductionVerificationFlags(content: string, findings: string[]) {
  const environment = releaseEnvironment(content)
  if (environment !== 'production') return

  if (fieldValueByCodeLabel(content, '`CHAT_PROVIDER_LIVE_VERIFIED`') !== '1') {
    findings.push('production release handoff ต้องมี CHAT_PROVIDER_LIVE_VERIFIED=1')
  }
  if (fieldValueByCodeLabel(content, '`IMAGE_GENERATION_LIVE_VERIFIED`') !== '1') {
    findings.push('production release handoff ต้องมี IMAGE_GENERATION_LIVE_VERIFIED=1')
  }
}

function validateProductionLiveSmokeResults(content: string, findings: string[]) {
  const environment = releaseEnvironment(content)
  if (environment !== 'production') return

  for (const label of ['ผล live smoke แชท', 'ผล live smoke รูป']) {
    const value = fieldValue(content, label)
    if (value && !isPassed(value)) findings.push(`production release handoff ต้องมีผล live smoke ผ่าน: ${label}`)
  }
}

function isPassed(value: string) {
  return /^(pass|ผ่าน)\b/i.test(value.trim())
}

function releaseEnvironment(content: string) {
  return fieldValue(content, 'Environment').trim().toLowerCase()
}

function validateFilledReleaseDecision(content: string, findings: string[]) {
  const environment = releaseEnvironment(content)
  if (!['staging', 'production'].includes(environment)) {
    findings.push('Environment ใน release handoff ต้องเป็น staging หรือ production เท่านั้น')
  }

  const decision = fieldValue(content, 'Go / no-go').trim().toLowerCase()
  if (decision !== 'go') {
    findings.push('Go / no-go ใน release handoff ต้องเป็น go หลัง QA ผ่านครบก่อนแชร์ handoff')
  }
}

function validateFilledReleaseIdentity(content: string, findings: string[]) {
  const releaseDate = fieldValue(content, 'วันที่ release')
  if (releaseDate && !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    findings.push('วันที่ release ใน handoff ต้องเป็นรูปแบบ YYYY-MM-DD')
  }

  const commit = fieldValue(content, 'Git commit')
  if (commit && !/^[a-f0-9]{7,40}$/i.test(commit)) {
    findings.push('Git commit ใน release handoff ต้องเป็น commit hash 7-40 ตัวอักษร')
  }

  const branch = fieldValue(content, 'Branch')
  if (branch && (branch.includes('<') || branch.includes('>') || /\bplaceholder\b/i.test(branch))) {
    findings.push('Branch ใน release handoff ต้องเป็นชื่อ branch จริง')
  }

  const owner = fieldValue(content, 'ผู้รับผิดชอบ')
  if (owner && (owner.includes('<') || owner.includes('>') || /\bplaceholder\b/i.test(owner))) {
    findings.push('ผู้รับผิดชอบ ใน release handoff ต้องเป็นชื่อผู้รับผิดชอบจริง')
  }
}

function validateProductionQaResults(content: string, findings: string[]) {
  const environment = releaseEnvironment(content)
  if (environment !== 'production') return

  for (const label of [
    '`bun run qa:local`',
    '`bun run e2e:smoke`',
    '`bun run frontend:env:test`',
    '`bun run frontend:storage:test`',
    '`bun run frontend:clipboard:test`',
    '`bun run staging:verify`',
    '`bun run production:check`',
    'GitHub Production Smoke run',
  ]) {
    const value = fieldValue(content, label)
    if (value && !isPassed(value)) findings.push(`production release handoff ต้องมีผล QA ผ่าน: ${label}`)
  }
}

function validateStagingQaResults(content: string, findings: string[]) {
  const environment = releaseEnvironment(content)
  if (environment !== 'staging') return

  for (const label of [
    '`bun run qa:local`',
    '`bun run e2e:smoke`',
    '`bun run frontend:env:test`',
    '`bun run frontend:storage:test`',
    '`bun run frontend:clipboard:test`',
    '`bun run staging:verify`',
  ]) {
    const value = fieldValue(content, label)
    if (value && !isPassed(value)) findings.push(`staging release handoff ต้องมีผล QA ผ่าน: ${label}`)
  }
}

function validateDeployedMigrationResults(content: string, findings: string[]) {
  const environment = deployedEvidenceEnvironment(content)
  if (!environment) return

  const command = fieldValue(content, 'คำสั่ง migration')
  if (command && !/\bbunx prisma migrate deploy\b/.test(command)) {
    findings.push(`${environment} release handoff ต้องใช้คำสั่ง migration: bunx prisma migrate deploy`)
  }

  const result = fieldValue(content, 'ผล migration')
  if (result && !isPassed(result)) findings.push(`${environment} release handoff ต้องมีผล migration ผ่าน`)

  const version = fieldValue(content, 'Prisma migration version')
  if (version && !/^\d{14}_[a-z0-9_]+$/.test(version)) {
    findings.push(`${environment} release handoff ต้องมี Prisma migration version เป็นชื่อ migration จริง`)
  }
}

function validateDeployedAuthStorageResults(content: string, findings: string[]) {
  const environment = deployedEvidenceEnvironment(content)
  if (!environment) return

  if (fieldValue(content, 'โหมด auth').toLowerCase() !== 'supabase-jwt') {
    findings.push(`${environment} release handoff ต้องใช้โหมด auth เป็น supabase-jwt`)
  }

  const projectRef = fieldValue(content, 'Supabase project ref')
  if (!/^[a-z0-9]{8,}$/.test(projectRef) || projectRef.includes('example') || projectRef.includes('placeholder')) {
    findings.push(`${environment} release handoff ต้องมี Supabase project ref จริง ไม่ใช่ URL หรือ placeholder`)
  }

  if (fieldValue(content, 'ผู้ให้บริการพื้นที่เก็บรูปตัวละคร').toLowerCase() !== 'supabase') {
    findings.push(`${environment} release handoff ต้องใช้พื้นที่เก็บรูปตัวละครเป็น supabase`)
  }

  if (fieldValue(content, 'รูปแบบการเข้าถึงรูปตัวละคร').toLowerCase() !== 'signed') {
    findings.push(`${environment} release handoff ต้องใช้รูปตัวละครแบบ signed URL`)
  }

  if (fieldValue(content, 'อายุ signed URL') !== '3600') {
    findings.push(`${environment} release handoff ต้องตั้งอายุ signed URL เป็น 3600`)
  }
}

function validateDeployedAdminResults(content: string, findings: string[]) {
  const environment = deployedEvidenceEnvironment(content)
  if (!environment) return

  for (const label of requiredAdminCheckLabels) {
    const value = fieldValue(content, label)
    if (value && !isPassed(value)) findings.push(`${environment} release handoff ต้องมีผลตรวจผู้ดูแลผ่าน: ${label}`)
  }
}

function deployedEvidenceEnvironment(content: string) {
  const environment = releaseEnvironment(content)
  if (environment === 'production') return 'production'
  if (environment === 'staging') return 'staging'
  return ''
}

function validateDeployedE2eTargets(content: string, findings: string[]) {
  const environment = deployedEvidenceEnvironment(content)
  if (!environment) return

  const frontendOrigin = deployedHttpsUrl(fieldValue(content, 'Frontend URL'))?.origin ?? ''
  const backendOrigin = deployedHttpsUrl(fieldValue(content, 'Backend URL'))?.origin ?? ''
  const e2eFrontend = fieldValue(content, 'E2E_BASE_URL')
  const e2eBackend = fieldValue(content, 'E2E_API_BASE_URL')

  if (e2eFrontend && (!isDeployedOrigin(e2eFrontend) || (frontendOrigin && deployedHttpsUrl(e2eFrontend)?.origin !== frontendOrigin))) {
    findings.push(`${environment} release handoff ต้องมี E2E_BASE_URL เป็น frontend deployed origin เดียวกับ Frontend URL`)
  }
  if (e2eBackend && (!isDeployedOrigin(e2eBackend) || (backendOrigin && deployedHttpsUrl(e2eBackend)?.origin !== backendOrigin))) {
    findings.push(`${environment} release handoff ต้องมี E2E_API_BASE_URL เป็น backend deployed origin เดียวกับ Backend URL`)
  }
}

export function checkReleaseHandoffContent(content: string, options: { requireFilled?: boolean } = {}) {
  const findings: string[] = []

  for (const section of requiredSections) {
    if (!content.includes(section)) findings.push(`ยังไม่มี section: ${section}`)
  }

  for (const forbidden of forbiddenPatterns) {
    if (forbidden.pattern.test(content)) findings.push(`พบ ${forbidden.name}`)
  }

  for (const snippet of forbiddenCopySnippets) {
    if (content.includes(snippet)) findings.push(`พบข้อความส่งมอบที่ยังใช้คำเก่า: ${snippet}`)
  }

  for (const label of requiredFieldLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี field ใน release handoff: ${label}`)
  }

  for (const label of requiredReleaseIdentityFieldLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี release identity field ใน release handoff: ${label}`)
  }

  for (const label of requiredMigrationFieldLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี migration field ใน release handoff: ${label}`)
  }

  for (const label of requiredAuthStorageFieldLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี auth/storage field ใน release handoff: ${label}`)
  }

  for (const label of requiredQaGateLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี QA gate: ${label}`)
  }

  for (const label of requiredAdminCheckLabels) {
    if (!hasField(content, label)) findings.push(`ยังไม่มี admin verification ใน release handoff: ${label}`)
  }

  if (options.requireFilled) {
    const blankFields = content
      .split(/\r?\n/)
      .map((line, index) => ({ line: line.trim(), index: index + 1 }))
      .filter(({ line }) => line.startsWith('- ') && /:\s*$/.test(line))
    for (const field of blankFields) findings.push(`บรรทัด ${field.index} ยังว่างอยู่: ${field.line}`)
    validateFilledReleaseIdentity(content, findings)
    validateFilledReleaseHandoffUrls(content, findings)
    validateFilledReleaseDecision(content, findings)
    validateProductionVerificationFlags(content, findings)
    validateProductionLiveSmokeResults(content, findings)
    validateProductionQaResults(content, findings)
    validateStagingQaResults(content, findings)
    validateDeployedMigrationResults(content, findings)
    validateDeployedAuthStorageResults(content, findings)
    validateDeployedAdminResults(content, findings)
    validateDeployedE2eTargets(content, findings)
  }

  return findings
}

export async function collectReleaseHandoffCheckResult(requireFilled = false): Promise<ReleaseHandoffCheckResult> {
  const findings = checkReleaseHandoffContent(await readFile(file, 'utf8'), { requireFilled })
  return { ok: findings.length === 0, requireFilled, findings }
}

export async function runReleaseHandoffCheck(
  argv = process.argv.slice(2),
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const result = await collectReleaseHandoffCheckResult(argv.includes('--filled'))
  if (!result.ok) {
    writeError('ตรวจเอกสารส่งมอบ release ไม่ผ่าน:')
    for (const finding of result.findings) writeError(`- ${finding}`)
    return 1
  }

  writeLine(`ผ่าน - ตรวจเอกสารส่งมอบ release ${result.requireFilled ? 'กรอกครบและ' : ''}ปลอดภัยต่อการ commit`)
  return 0
}

if (import.meta.main) process.exit(await runReleaseHandoffCheck())
