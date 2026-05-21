import { readFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { formatDiagnosticText } from './smoke-helpers'

const root = join(import.meta.dir, '..')

export type EnvMap = Map<string, string>
export type Status = 'pass' | 'warn' | 'fail'
export type Area = 'backend' | 'frontend' | 'cross-check'

export type Finding = {
  area: Area
  status: Status
  check: string
  detail: string
}

export type DeployEnvDoctorResult = {
  ok: boolean
  pass: number
  warn: number
  fail: number
  backendEnv: string
  frontendEnv: string
  findings: Finding[]
}

let requireImageLiveVerified = true
let findings: Finding[] = []

export function formatDeployDoctorStatus(status: Status) {
  const labels: Record<Status, string> = {
    pass: 'ผ่าน',
    warn: 'เตือน',
    fail: 'ไม่ผ่าน',
  }
  return labels[status]
}

export function formatDeployDoctorArea(area: Area) {
  const labels: Record<Area, string> = {
    backend: 'ระบบหลังบ้าน',
    frontend: 'หน้าบ้าน',
    'cross-check': 'ตรวจเทียบสองฝั่ง',
  }
  return labels[area]
}

export async function runDeployEnvDoctor(argv = process.argv.slice(2), writeLine: (line: string) => void = (line) => console.log(line)): Promise<DeployEnvDoctorResult> {
const args = parseArgs(argv)
const backendEnvPath = resolveFromRoot(args.get('backend-env') ?? 'apps/backend/.env')
const frontendEnvPath = resolveFromRoot(args.get('frontend-env') ?? 'apps/frontend/.env')
requireImageLiveVerified = !args.has('allow-unverified-image')
findings = []

let backendEnv: EnvMap
let frontendEnv: EnvMap

try {
  backendEnv = await readEnvFile(backendEnvPath)
} catch (error) {
  fail('backend', 'ไฟล์ env ระบบหลังบ้าน', `อ่านไฟล์ env ระบบหลังบ้านไม่ได้: ${formatDeployEnvDoctorError(error)}`)
  backendEnv = new Map()
}

try {
  frontendEnv = await readEnvFile(frontendEnvPath)
} catch (error) {
  fail('frontend', 'ไฟล์ env หน้าบ้าน', `อ่านไฟล์ env หน้าบ้านไม่ได้: ${formatDeployEnvDoctorError(error)}`)
  frontendEnv = new Map()
}

auditBackendEnv(backendEnv)
auditFrontendEnv(frontendEnv)
auditCrossEnv(backendEnv, frontendEnv)

writeLine(`ตรวจ env ก่อน deploy`)
writeLine(`ไฟล์ env ระบบหลังบ้าน: ${displayPath(backendEnvPath)}`)
writeLine(`ไฟล์ env หน้าบ้าน: ${displayPath(frontendEnvPath)}`)

for (const finding of findings) {
  const label = formatDeployDoctorStatus(finding.status)
  const areaLabel = formatDeployDoctorArea(finding.area)
  writeLine(`${label} - ${areaLabel} ${finding.check}: ${finding.detail}`)
}

const failCount = findings.filter((finding) => finding.status === 'fail').length
const warnCount = findings.filter((finding) => finding.status === 'warn').length
const passCount = findings.filter((finding) => finding.status === 'pass').length
const result: DeployEnvDoctorResult = {
  ok: failCount === 0,
  pass: passCount,
  warn: warnCount,
  fail: failCount,
  backendEnv: displayPath(backendEnvPath),
  frontendEnv: displayPath(frontendEnvPath),
  findings: [...findings],
}

writeLine(
  JSON.stringify(
    {
      ok: result.ok,
      pass: result.pass,
      warn: result.warn,
      fail: result.fail,
      backendEnv: result.backendEnv,
      frontendEnv: result.frontendEnv,
    },
    null,
    2,
  ),
)

return result
}

if (import.meta.main) {
  const result = await runDeployEnvDoctor()
  if (!result.ok) process.exit(1)
}

function auditBackendEnv(env: EnvMap) {
  expectExact(env, 'NODE_ENV', 'production', 'backend', 'ต้องเป็น production ก่อน deploy จริง')
  expectPresent(env, 'DATABASE_URL', 'backend', 'ต้องใช้ production Postgres URL')
  auditDatabaseUrl(env.get('DATABASE_URL'))
  expectPresent(env, 'OPENROUTER_API_KEY', 'backend', 'ต้องใช้ OpenRouter key สำหรับแชทและ creator text')
  auditOpenRouterKey(env.get('OPENROUTER_API_KEY'))
  expectPresent(env, 'MODEL_TEMPERATURE', 'backend', 'ต้องตั้ง MODEL_TEMPERATURE เพื่อคุมโทนการตอบของแชท')
  auditNumberRange(env.get('MODEL_TEMPERATURE'), 'backend', 'MODEL_TEMPERATURE', 0, 2)
  expectPresent(env, 'MODEL_MAX_OUTPUT_TOKENS', 'backend', 'ต้องตั้ง MODEL_MAX_OUTPUT_TOKENS เพื่อให้บอทมีพื้นที่ตอบยาวพอ')
  auditIntegerRangeWithRecommendedMin(env.get('MODEL_MAX_OUTPUT_TOKENS'), 'backend', 'MODEL_MAX_OUTPUT_TOKENS', 128, 2400, 1200)
  auditPreferredIntegerMin(env.get('MODEL_MAX_OUTPUT_TOKENS'), 'backend', 'MODEL_MAX_OUTPUT_TOKENS', 1200, 1600)
  expectPresent(env, 'MODEL_MIN_ROLEPLAY_REPLY_CHARS', 'backend', 'ต้องตั้ง MODEL_MIN_ROLEPLAY_REPLY_CHARS เพื่อกันคำตอบ roleplay สั้นเกินไป')
  auditIntegerRangeWithRecommendedMin(env.get('MODEL_MIN_ROLEPLAY_REPLY_CHARS'), 'backend', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS', 0, 1200, 320)
  auditPreferredIntegerMin(env.get('MODEL_MIN_ROLEPLAY_REPLY_CHARS'), 'backend', 'MODEL_MIN_ROLEPLAY_REPLY_CHARS', 320, 420)
  expectPresent(env, 'CHAT_PROVIDER_RETRY_ATTEMPTS', 'backend', 'ตั้งจำนวน retry ของ chat provider เพื่อกัน provider ล่มชั่วคราว')
  auditIntegerRange(env.get('CHAT_PROVIDER_RETRY_ATTEMPTS'), 'backend', 'CHAT_PROVIDER_RETRY_ATTEMPTS', 1, 5)
  expectPresent(env, 'CHAT_PROVIDER_RETRY_DELAY_MS', 'backend', 'ตั้ง delay retry ของ chat provider')
  auditIntegerRange(env.get('CHAT_PROVIDER_RETRY_DELAY_MS'), 'backend', 'CHAT_PROVIDER_RETRY_DELAY_MS', 0, 5000)
  expectPresent(env, 'CREATOR_DRAFT_RETRY_ATTEMPTS', 'backend', 'ตั้งจำนวน retry ของ creator draft provider เพื่อกัน JSON ขาดหรือ timeout')
  auditIntegerRange(env.get('CREATOR_DRAFT_RETRY_ATTEMPTS'), 'backend', 'CREATOR_DRAFT_RETRY_ATTEMPTS', 1, 5)
  expectPresent(env, 'CREATOR_DRAFT_RETRY_DELAY_MS', 'backend', 'ตั้ง delay retry ของ creator draft provider')
  auditIntegerRange(env.get('CREATOR_DRAFT_RETRY_DELAY_MS'), 'backend', 'CREATOR_DRAFT_RETRY_DELAY_MS', 0, 5000)
  expectPresent(env, 'CORS_ORIGINS', 'backend', 'ต้องเป็น frontend domain จริง')
  auditCorsOrigins(env.get('CORS_ORIGINS'))
  expectPresent(env, 'ADMIN_API_KEY', 'backend', 'ต้องมี admin key ยาวและสุ่ม')
  auditAdminKey(env.get('ADMIN_API_KEY'))
  expectPresent(env, 'SUPABASE_URL', 'backend', 'ต้องเป็น project API URL ไม่ใช่ dashboard URL')
  auditSupabaseUrl(env.get('SUPABASE_URL'), 'backend', 'SUPABASE_URL')
  expectPresent(env, 'SUPABASE_JWT_ISSUER', 'backend', 'ต้องเท่ากับ SUPABASE_URL + /auth/v1')
  auditSupabaseIssuer(env.get('SUPABASE_URL'), env.get('SUPABASE_JWT_ISSUER'))
  expectPresent(env, 'SUPABASE_SERVICE_ROLE_KEY', 'backend', 'ใช้ backend เท่านั้น ห้ามส่งไป frontend')
  auditJwtRole(env.get('SUPABASE_SERVICE_ROLE_KEY'), 'service_role', 'backend', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!hasRealValue(env.get('SUPABASE_ANON_KEY')) && !hasRealValue(env.get('SUPABASE_PUBLISHABLE_KEY'))) {
    fail('backend', 'SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY', 'ต้องมี public auth key ฝั่ง backend เพื่อช่วยตรวจ access token')
  } else {
    pass('backend', 'SUPABASE_ANON_KEY or SUPABASE_PUBLISHABLE_KEY', 'ตั้งค่า public auth key แล้ว')
    if (hasRealValue(env.get('SUPABASE_ANON_KEY'))) {
      auditJwtRole(env.get('SUPABASE_ANON_KEY'), 'anon', 'backend', 'SUPABASE_ANON_KEY')
    }
  }

  expectExact(env, 'STORAGE_PROVIDER', 'supabase', 'backend', 'โปรดักชันต้องเก็บรูปตัวละครผ่าน Supabase')
  expectPresent(env, 'SUPABASE_STORAGE_BUCKET', 'backend', 'ต้องมี bucket รูปตัวละคร')
  if (hasRealValue(env.get('SUPABASE_STORAGE_BUCKET'))) {
    const bucket = env.get('SUPABASE_STORAGE_BUCKET')?.trim()
    if (bucket === 'avatars') pass('backend', 'SUPABASE_STORAGE_BUCKET', 'ใช้ bucket avatars แล้ว')
    else warn('backend', 'SUPABASE_STORAGE_BUCKET', 'ไม่ใช่ชื่อ avatars ต้องแน่ใจว่า host และ Supabase bucket ตรงกัน')
  }
  expectExact(env, 'SUPABASE_STORAGE_ACCESS', 'signed', 'backend', 'โปรดักชันควรใช้ private bucket + signed URL')
  auditPositiveInteger(env.get('SUPABASE_SIGNED_URL_EXPIRES_IN'), 'backend', 'SUPABASE_SIGNED_URL_EXPIRES_IN')

  const imageKey = env.get('IMAGE_GENERATION_API_KEY') ?? env.get('OPENAI_API_KEY')
  if (!hasRealValue(imageKey)) {
    fail('backend', 'IMAGE_GENERATION_API_KEY or OPENAI_API_KEY', 'ต้องมีคีย์ผู้ให้บริการสร้างรูป ถ้าจะเปิด AI สร้างรูปจริง')
  } else {
    pass('backend', 'IMAGE_GENERATION_API_KEY or OPENAI_API_KEY', 'ตั้งค่าคีย์ผู้ให้บริการสร้างรูปแล้ว')
    auditImageKey(imageKey)
  }

  if (requireImageLiveVerified) {
    expectExact(
      env,
      'IMAGE_GENERATION_LIVE_VERIFIED',
      '1',
      'backend',
      'ตั้งเป็น 1 เฉพาะหลัง smoke:image:live หรือ api:smoke:live ผ่านจริง',
    )
  } else {
    warn('backend', 'IMAGE_GENERATION_LIVE_VERIFIED', 'ข้ามการบังคับ live image verification ตาม --allow-unverified-image')
  }
}

function auditFrontendEnv(env: EnvMap) {
  expectPresent(env, 'VITE_API_BASE_URL', 'frontend', 'ต้องเป็น backend URL จริง')
  auditHttpsNonLocalUrl(env.get('VITE_API_BASE_URL'), 'frontend', 'VITE_API_BASE_URL')
  expectPresent(env, 'VITE_SUPABASE_URL', 'frontend', 'ต้องเป็น Supabase project URL')
  auditSupabaseUrl(env.get('VITE_SUPABASE_URL'), 'frontend', 'VITE_SUPABASE_URL')
  expectPresent(env, 'VITE_SUPABASE_ANON_KEY', 'frontend', 'ต้องเป็น anon/public key เท่านั้น')
  auditJwtRole(env.get('VITE_SUPABASE_ANON_KEY'), 'anon', 'frontend', 'VITE_SUPABASE_ANON_KEY')

  const frontendRole = jwtRole(env.get('VITE_SUPABASE_ANON_KEY'))
  if (frontendRole === 'service_role') {
    fail('frontend', 'VITE_SUPABASE_ANON_KEY', 'ห้ามใช้ service role key ใน frontend เด็ดขาด')
  }
}

function auditCrossEnv(backend: EnvMap, frontend: EnvMap) {
  const backendSupabaseUrl = normalizeUrl(backend.get('SUPABASE_URL'))
  const frontendSupabaseUrl = normalizeUrl(frontend.get('VITE_SUPABASE_URL'))
  if (backendSupabaseUrl && frontendSupabaseUrl) {
    if (backendSupabaseUrl === frontendSupabaseUrl) pass('cross-check', 'Supabase URL match', 'backend และ frontend ใช้ project เดียวกัน')
    else fail('cross-check', 'Supabase URL match', 'backend และ frontend ใช้ Supabase project คนละตัว')
  }

  const backendAnon = backend.get('SUPABASE_ANON_KEY')
  const frontendAnon = frontend.get('VITE_SUPABASE_ANON_KEY')
  if (hasRealValue(backendAnon) && hasRealValue(frontendAnon)) {
    if (backendAnon === frontendAnon) pass('cross-check', 'Supabase anon key match', 'anon key ตรงกันทั้งสองฝั่ง')
    else fail('cross-check', 'Supabase anon key match', 'backend SUPABASE_ANON_KEY กับ frontend VITE_SUPABASE_ANON_KEY ไม่ตรงกัน')
  }

  const apiBaseOrigin = originOf(frontend.get('VITE_API_BASE_URL'))
  const corsOrigins = csv(backend.get('CORS_ORIGINS'))
  if (apiBaseOrigin && corsOrigins.includes(apiBaseOrigin)) {
    warn('cross-check', 'CORS_ORIGINS', 'CORS ควรใส่ origin ของหน้าบ้าน ไม่ใช่ origin ของระบบหลังบ้าน ตรวจ domain อีกครั้ง')
  }
}

export function parseArgs(values: string[]) {
  const map = new Map<string, string>()
  for (let index = 0; index < values.length; index += 1) {
    const item = values[index]
    if (!item?.startsWith('--')) continue
    const key = item.slice(2)
    const next = values[index + 1]
    if (next && !next.startsWith('--')) {
      map.set(key, next)
      index += 1
    } else {
      map.set(key, '1')
    }
  }
  return map
}

export async function readEnvFile(path: string) {
  const content = await readFile(path, 'utf8')
  const env = new Map<string, string>()

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const normalized = trimmed.startsWith('export ') ? trimmed.slice('export '.length).trim() : trimmed
    const separator = normalized.indexOf('=')
    if (separator <= 0) continue
    const key = normalized.slice(0, separator).trim()
    const value = stripQuotes(normalized.slice(separator + 1).trim())
    if (key) env.set(key, value)
  }

  return env
}

function stripQuotes(value: string) {
  const first = value[0]
  const last = value[value.length - 1]
  if ((first === '"' && last === '"') || (first === "'" && last === "'") || (first === '`' && last === '`')) {
    return value.slice(1, -1)
  }
  return value
}

function resolveFromRoot(path: string) {
  return isAbsolute(path) ? path : resolve(root, path)
}

function displayPath(path: string) {
  return relative(root, path).replaceAll('\\', '/') || '.'
}

export function hasRealValue(value: string | undefined) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return false
  const placeholderFragments = [
    '<',
    '>',
    'replace-with-',
    'example.com',
    'your-project.supabase.co',
    'postgresql://user:password@host',
    'postgres://user:password@host',
  ]
  const placeholderTokens = ['user', 'username', 'password', 'host', 'database', 'backend-domain']
  return !placeholderFragments.some((fragment) => normalized.includes(fragment)) && !placeholderTokens.includes(normalized)
}

export function normalizeUrl(value: string | undefined) {
  if (!hasRealValue(value)) return null
  try {
    return new URL(value!.trim()).toString().replace(/\/+$/, '')
  } catch {
    return null
  }
}

function originOf(value: string | undefined) {
  if (!hasRealValue(value)) return null
  try {
    return new URL(value!.trim()).origin
  } catch {
    return null
  }
}

function csv(value: string | undefined) {
  return value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean) ?? []
}

export function jwtRole(value: string | undefined) {
  if (!hasRealValue(value) || !value!.startsWith('eyJ')) return null
  const [, payload] = value!.split('.')
  if (!payload) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { role?: unknown }
    return typeof parsed.role === 'string' ? parsed.role : null
  } catch {
    return null
  }
}

function isLocalHost(hostname: string) {
  return ['localhost', '127.0.0.1', '::1'].includes(hostname)
}

function auditDatabaseUrl(value: string | undefined) {
  if (!hasRealValue(value)) return
  try {
    const url = new URL(value!.trim())
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      fail('backend', 'DATABASE_URL', 'ต้องเป็น postgres/postgresql connection string')
      return
    }
    if (isLocalHost(url.hostname)) fail('backend', 'DATABASE_URL', 'ห้ามชี้ localhost ใน production')
    const username = decodeURIComponent(url.username).toLowerCase()
    const password = decodeURIComponent(url.password).toLowerCase()
    const databaseName = decodeURIComponent(url.pathname.replace(/^\//, '')).toLowerCase()
    if (['user', 'username'].includes(username) || ['password', 'pass'].includes(password) || ['database', 'db'].includes(databaseName)) {
      fail('backend', 'DATABASE_URL', 'ยังมีค่าตัวอย่างของ credential หรือชื่อฐานข้อมูล')
    }
    if (url.searchParams.get('sslmode') !== 'require') fail('backend', 'DATABASE_URL', 'ต้องมี sslmode=require')
    if (!findings.some((finding) => finding.area === 'backend' && finding.check === 'DATABASE_URL' && finding.status === 'fail')) {
      pass('backend', 'DATABASE_URL', 'รูปแบบ production Postgres URL พร้อม sslmode=require')
    }
  } catch {
    fail('backend', 'DATABASE_URL', 'ไม่ใช่ URL ที่อ่านได้')
  }
}

function auditOpenRouterKey(value: string | undefined) {
  if (!hasRealValue(value)) return
  const key = value!.trim()
  if (!key.startsWith('sk-or-')) {
    if (key.startsWith('sk-proj-')) fail('backend', 'OPENROUTER_API_KEY', 'ค่านี้ดูเป็น OpenAI project key ไม่ใช่ OpenRouter key')
    else fail('backend', 'OPENROUTER_API_KEY', 'คีย์ OpenRouter ควรขึ้นต้นด้วย sk-or-')
    return
  }
  if (key.length < 24) {
    fail('backend', 'OPENROUTER_API_KEY', 'OpenRouter key ดูสั้นผิดปกติ ตรวจว่าคัดลอกมาครบ')
    return
  }
  pass('backend', 'OPENROUTER_API_KEY', 'รูปแบบเป็น OpenRouter key แล้ว')
}

function auditImageKey(value: string | undefined) {
  if (!hasRealValue(value)) return
  const key = value!.trim()
  if (key.startsWith('sk-or-')) fail('backend', 'IMAGE_GENERATION_API_KEY', 'ค่านี้ดูเป็น OpenRouter key ไม่ใช่คีย์สร้างรูปหรือ OpenAI key')
  else if (key.startsWith('sk-') && key.length >= 20) pass('backend', 'IMAGE_GENERATION_API_KEY', 'รูปแบบคีย์ผู้ให้บริการสร้างรูปดูถูกต้อง')
  else if (key.startsWith('sk-')) fail('backend', 'IMAGE_GENERATION_API_KEY', 'คีย์ผู้ให้บริการสร้างรูปดูสั้นผิดปกติ ตรวจว่าคัดลอกมาครบ')
  else warn('backend', 'IMAGE_GENERATION_API_KEY', 'รูปแบบคีย์ไม่คุ้นตา ตรวจสิทธิ์ผู้ให้บริการ/โมเดลอีกครั้ง')
}

function auditAdminKey(value: string | undefined) {
  if (!hasRealValue(value)) return
  if (value!.trim().length >= 32) pass('backend', 'ADMIN_API_KEY', 'ความยาวเหมาะสม')
  else fail('backend', 'ADMIN_API_KEY', 'ต้องยาวอย่างน้อย 32 ตัวอักษร')
}

function auditCorsOrigins(value: string | undefined) {
  if (!hasRealValue(value)) return
  const origins = csv(value)
  if (origins.length === 0) {
    fail('backend', 'CORS_ORIGINS', 'ต้องมีอย่างน้อยหนึ่ง origin ของหน้าบ้าน')
    return
  }

  let failed = false
  let reportedNonHttps = false
  let reportedLocal = false
  for (const origin of origins) {
    try {
      const url = new URL(origin)
      if (url.protocol !== 'https:' && !reportedNonHttps) {
        fail('backend', 'CORS_ORIGINS', 'production ต้องใช้ https origin เท่านั้น')
        failed = true
        reportedNonHttps = true
      }
      if (isLocalHost(url.hostname) && !reportedLocal) {
        fail('backend', 'CORS_ORIGINS', 'ห้ามใส่ localhost/127.0.0.1 ใน production')
        failed = true
        reportedLocal = true
      }
    } catch {
      fail('backend', 'CORS_ORIGINS', 'ต้องเป็น comma-separated origin URL ที่ถูกต้อง')
      failed = true
    }
  }

  if (!failed) pass('backend', 'CORS_ORIGINS', `ตั้งค่า origin ของหน้าบ้านแล้ว ${origins.length} ค่า`)
}

function auditSupabaseUrl(value: string | undefined, area: Area, check: string) {
  if (!hasRealValue(value)) return
  try {
    const url = new URL(value!.trim())
    if (url.protocol === 'https:' && url.hostname.endsWith('.supabase.co')) {
      pass(area, check, 'เป็น Supabase project API URL')
      return
    }
    fail(area, check, 'ต้องเป็น https://<project-ref>.supabase.co ไม่ใช่ dashboard URL')
  } catch {
    fail(area, check, 'ไม่ใช่ URL ที่ถูกต้อง')
  }
}

function auditSupabaseIssuer(supabaseUrl: string | undefined, issuer: string | undefined) {
  if (!hasRealValue(supabaseUrl) || !hasRealValue(issuer)) return
  const expected = `${supabaseUrl!.trim().replace(/\/+$/, '')}/auth/v1`
  if (issuer!.trim().replace(/\/+$/, '') === expected) pass('backend', 'SUPABASE_JWT_ISSUER', 'ตรงกับ SUPABASE_URL + /auth/v1')
  else fail('backend', 'SUPABASE_JWT_ISSUER', 'ต้องเท่ากับ SUPABASE_URL + /auth/v1')
}

function auditJwtRole(value: string | undefined, expected: string, area: Area, check: string) {
  if (!hasRealValue(value)) return
  const role = jwtRole(value)
  if (!role) {
    warn(area, check, 'อ่าน role จาก JWT ไม่ได้ ตรวจว่า key ถูกคัดลอกมาครบ')
    return
  }
  if (role === expected) pass(area, check, `JWT role=${expected}`)
  else fail(area, check, `JWT role ต้องเป็น ${expected}`)
}

function auditHttpsNonLocalUrl(value: string | undefined, area: Area, check: string) {
  if (!hasRealValue(value)) return
  try {
    const url = new URL(value!.trim())
    if (url.protocol !== 'https:') fail(area, check, 'production URL ต้องใช้ https')
    else if (isLocalHost(url.hostname)) fail(area, check, 'production URL ห้ามเป็น localhost')
    else pass(area, check, 'เป็น https URL จริง')
  } catch {
    fail(area, check, 'ไม่ใช่ URL ที่ถูกต้อง')
  }
}

function auditPositiveInteger(value: string | undefined, area: Area, check: string) {
  if (!hasRealValue(value)) {
    fail(area, check, 'ต้องระบุเป็นจำนวนวินาที')
    return
  }
  const number = Number(value)
  if (Number.isInteger(number) && number > 0) pass(area, check, 'เป็นจำนวนเต็มบวก')
  else fail(area, check, 'ต้องเป็นจำนวนเต็มบวก')
}

function auditNumberRange(value: string | undefined, area: Area, check: string, min: number, max: number) {
  if (!hasRealValue(value)) return
  const number = Number(value)
  if (Number.isFinite(number) && number >= min && number <= max) {
    pass(area, check, `อยู่ในช่วง ${min}-${max}`)
  } else {
    fail(area, check, `ต้องเป็นตัวเลขในช่วง ${min}-${max}`)
  }
}

function auditIntegerRange(value: string | undefined, area: Area, check: string, min: number, max: number) {
  if (!hasRealValue(value)) return
  const number = Number(value)
  if (Number.isInteger(number) && number >= min && number <= max) {
    pass(area, check, `เป็นจำนวนเต็มในช่วง ${min}-${max}`)
  } else {
    fail(area, check, `ต้องเป็นจำนวนเต็มในช่วง ${min}-${max}`)
  }
}

function auditIntegerRangeWithRecommendedMin(value: string | undefined, area: Area, check: string, min: number, max: number, recommendedMin: number) {
  if (!hasRealValue(value)) return
  const number = Number(value)
  if (!Number.isInteger(number) || number < min || number > max) {
    fail(area, check, `ต้องเป็นจำนวนเต็มในช่วง ${min}-${max}`)
    return
  }
  if (number < recommendedMin) {
    fail(area, check, `ควรตั้งอย่างน้อย ${recommendedMin} สำหรับคำตอบ roleplay ใน production`)
    return
  }
  pass(area, check, `เป็นจำนวนเต็มในช่วง ${min}-${max} และถึง baseline production ${recommendedMin}`)
}

function auditPreferredIntegerMin(value: string | undefined, area: Area, check: string, baselineMin: number, preferredMin: number) {
  if (!hasRealValue(value)) return
  const number = Number(value)
  if (Number.isInteger(number) && number >= baselineMin && number < preferredMin) {
    warn(area, check, `ผ่าน baseline production ${baselineMin} แล้ว แต่แนะนำ ${preferredMin} เพื่อให้ roleplay ตอบได้มีมิติมากขึ้น`)
  }
}

function expectPresent(env: EnvMap, key: string, area: Area, detail: string) {
  if (hasRealValue(env.get(key))) pass(area, key, 'มีค่าแล้ว')
  else fail(area, key, detail)
}

function expectExact(env: EnvMap, key: string, expected: string, area: Area, detail: string) {
  const value = env.get(key)?.trim()
  if (value === expected) pass(area, key, `ตั้งเป็น ${expected} แล้ว`)
  else fail(area, key, detail)
}

function pass(area: Area, check: string, detail: string) {
  findings.push({ area, status: 'pass', check, detail })
}

function warn(area: Area, check: string, detail: string) {
  findings.push({ area, status: 'warn', check, detail })
}

function fail(area: Area, check: string, detail: string) {
  findings.push({ area, status: 'fail', check, detail })
}

export function formatDeployEnvDoctorError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  return formatDiagnosticText(raw, 500) || 'ไม่ทราบสาเหตุ'
}
