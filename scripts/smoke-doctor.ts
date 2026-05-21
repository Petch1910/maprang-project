import {
  apiBaseUrl,
  formatDiagnosticText,
  isLocalSmokeTarget,
  readJson,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'
import {
  buildHealthRows,
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  type HealthPayload,
} from './deploy-readiness'

const recommendedRoleplayMaxOutputTokens = 1600
const recommendedMinRoleplayReplyChars = 420
const baselineRoleplayMaxOutputTokens = 1200
const baselineMinRoleplayReplyChars = 320

export type SmokeDoctorReport = {
  exitCode: number
  stdout: string[]
  stderr: string[]
  warnings: string[]
}

export type SmokeDoctorRunnerOptions = {
  argv?: string[]
  apiBaseUrl?: string
  isLocalSmokeTarget?: boolean
  rootIdentityReader?: () => Promise<RootIdentityPayload>
  healthReader?: () => Promise<HealthPayload>
  writeLine?: (line: string) => void
  writeWarning?: (line: string) => void
  writeError?: (line: string) => void
}

export function buildSmokeDoctorReport(
  health: HealthPayload,
  options: {
    apiBaseUrl: string
    isLocalSmokeTarget: boolean
    strictProductionGate?: boolean
    strictStagingGate?: boolean
  },
): SmokeDoctorReport {
  const stdout: string[] = []
  const stderr: string[] = []
  const warnings: string[] = []

  for (const [name, value] of buildHealthRows(health, options.apiBaseUrl)) {
    stdout.push(`${name}: ${value}`)
  }

  if (health.env?.missingRequired?.length) stdout.push(`env จำเป็นที่ขาด: ${health.env.missingRequired.join(', ')}`)
  if (health.env?.missingRecommended?.length) {
    stdout.push(`env แนะนำที่ขาด: ${health.env.missingRecommended.join(', ')}`)
  }
  if (health.env?.invalid?.length) stdout.push(`env ไม่ถูกต้อง: ${health.env.invalid.join('; ')}`)
  if (health.databaseError) stdout.push(`ข้อผิดพลาดฐานข้อมูล: ${health.databaseError}`)

  const failures = healthFailures(health)

  if (failures.length > 0) {
    stderr.push(`ตรวจ smoke doctor ไม่ผ่าน: ${failures.join('; ')}`)
    stderr.push('วิธีแก้ในเครื่อง: เปิด Docker Desktop, รัน `docker compose up -d postgres`, รัน migrations, แล้วเริ่มระบบหลังบ้าน')
    stderr.push('วิธีแก้ตอน deploy: ตรวจ DATABASE_URL, migrations, และเครือข่ายของ service ระบบหลังบ้าน')
    return { exitCode: 1, stdout, stderr, warnings }
  }

  if (!health.checks.openRouterConfigured) {
    warnings.push('คำเตือน: OPENROUTER_API_KEY ยังไม่ได้ตั้งค่า `smoke:local` อาจผ่านได้ แต่ `smoke:chat` จะไม่ผ่าน')
  }
  if (!(health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured)) {
    warnings.push('คำเตือน: ยังไม่ได้ตั้งค่าผู้ให้บริการสร้างรูป Creator Studio จะใช้ภาพตัวอย่างชั่วคราว')
  }
  if (health.model) {
    const maxOutputTokens = health.model.maxOutputTokens ?? 0
    const minRoleplayReplyChars = health.model.minRoleplayReplyChars ?? 0
    if (
      maxOutputTokens > 0 &&
      minRoleplayReplyChars > 0 &&
      maxOutputTokens >= baselineRoleplayMaxOutputTokens &&
      minRoleplayReplyChars >= baselineMinRoleplayReplyChars &&
      (maxOutputTokens < recommendedRoleplayMaxOutputTokens ||
        minRoleplayReplyChars < recommendedMinRoleplayReplyChars)
    ) {
      warnings.push(
        `คำเตือน: งบคำตอบ roleplay ต่ำกว่าค่าแนะนำ ${recommendedRoleplayMaxOutputTokens}/${recommendedMinRoleplayReplyChars} ตอนนี้ MODEL_MAX_OUTPUT_TOKENS=${maxOutputTokens}, MODEL_MIN_ROLEPLAY_REPLY_CHARS=${minRoleplayReplyChars}`,
      )
    }
  }

  const {
    productionReady,
    productionBlockers,
    productionFixes,
    stagingReady,
    stagingBlockers,
    stagingFixes,
  } = evaluateDeployReadiness(health, { isLocalSmokeTarget: options.isLocalSmokeTarget })

  stdout.push(`stagingReady: ${stagingReady}`)
  stdout.push(`stagingBlockerCount: ${stagingBlockers.length}`)
  if (stagingBlockers.length > 0) {
    stdout.push(`stagingBlockers: ${stagingBlockers.join('; ')}`)
    stdout.push('วิธีแก้สเตจจิง:')
    for (const fix of stagingFixes) stdout.push(`- ${fix}`)
    stdout.push('ด่านสเตจจิง: รัน `bun run staging:verify` กับระบบหลังบ้านสเตจจิงที่ deploy แล้วก่อนยืนยันโปรดักชัน')
    if (options.strictStagingGate) {
      stderr.push('ด่านสเตจจิงไม่ผ่าน: แก้ตัวกั้นสเตจจิงด้านบน แล้วรันใหม่ด้วย URL ระบบหลังบ้านที่ deploy แล้ว')
      return { exitCode: 1, stdout, stderr, warnings }
    }
  } else {
    stdout.push('stagingBlockers: ไม่พบ')
  }

  stdout.push(`productionReady: ${productionReady}`)
  stdout.push(`productionBlockerCount: ${productionBlockers.length}`)

  if (productionBlockers.length > 0) {
    stdout.push(`productionBlockers: ${productionBlockers.join('; ')}`)
    stdout.push('วิธีแก้โปรดักชัน:')
    for (const fix of productionFixes) stdout.push(`- ${fix}`)
    stdout.push('ด่านโปรดักชัน: รัน `bun run production:check` กับระบบหลังบ้านสเตจจิงหรือโปรดักชันก่อน deploy')
    if (options.strictProductionGate) {
      stderr.push('ด่านโปรดักชันไม่ผ่าน: แก้ตัวกั้นโปรดักชันด้านบน แล้วรันใหม่ด้วย URL ระบบหลังบ้านที่ deploy แล้ว')
      return { exitCode: 1, stdout, stderr, warnings }
    }
  } else {
    stdout.push('productionBlockers: ไม่พบ')
  }

  const nextSteps = buildNextDeploySteps({
    productionReady,
    productionBlockers,
    productionFixes,
    stagingReady,
    stagingBlockers,
    stagingFixes,
  })
  stdout.push('ขั้นตอนถัดไป:')
  for (const [index, step] of nextSteps.entries()) {
    stdout.push(`${index + 1}. ${step}`)
  }

  stdout.push('ผ่าน - ตรวจ smoke doctor ผ่านแล้ว')
  return { exitCode: 0, stdout, stderr, warnings }
}

export function formatSmokeDoctorCaughtError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error)
  return formatDiagnosticText(raw, 500) || 'ไม่ทราบสาเหตุ'
}

export async function runSmokeDoctor(argvOrOptions: string[] | SmokeDoctorRunnerOptions = process.argv) {
  const options: SmokeDoctorRunnerOptions = Array.isArray(argvOrOptions) ? { argv: argvOrOptions } : argvOrOptions
  const argv = options.argv ?? process.argv
  const strictProductionGate = argv.includes('--strict-production') || process.env.STRICT_PRODUCTION_GATE === '1'
  const strictStagingGate = argv.includes('--strict-staging') || process.env.STRICT_STAGING_GATE === '1'
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const currentIsLocalSmokeTarget = options.isLocalSmokeTarget ?? isLocalSmokeTarget
  const rootIdentityReader = options.rootIdentityReader ?? (() => readJson<RootIdentityPayload>('/'))
  const healthReader = options.healthReader ?? (() => readJson<HealthPayload>('/health'))
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeWarning = options.writeWarning ?? ((line: string) => console.warn(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  try {
    validateBackendRootIdentity(await rootIdentityReader())
  } catch (error) {
    writeError(`ตรวจ smoke doctor ไม่ผ่าน: ${formatSmokeDoctorCaughtError(error)}`)
    writeError('วิธีแก้ในเครื่อง: เริ่มระบบหลังบ้าน แล้วเช็กว่า GET / คืน identity payload ของ maprang-backend')
    writeError('วิธีแก้ตอน deploy: ตรวจ SMOKE_API_BASE_URL และยืนยันว่า root ของระบบหลังบ้านที่ deploy แล้วไม่ใช่ proxy ของหน้าบ้าน/static')
    return 1
  }

  let health: HealthPayload
  try {
    health = await healthReader()
  } catch (error) {
    writeError(`ตรวจ smoke doctor ไม่ผ่าน: ${formatSmokeDoctorCaughtError(error)}`)
    writeError('วิธีแก้ในเครื่อง: เปิด Docker Desktop, รัน `docker compose up -d postgres`, รัน migrations, แล้วเริ่มระบบหลังบ้าน')
    writeError('วิธีแก้ตอน deploy: ตรวจ SMOKE_API_BASE_URL และยืนยันว่าระบบหลังบ้านที่ deploy แล้วเข้าถึงได้')
    return 1
  }

  const report = buildSmokeDoctorReport(health, {
    apiBaseUrl: currentApiBaseUrl,
    isLocalSmokeTarget: currentIsLocalSmokeTarget,
    strictProductionGate,
    strictStagingGate,
  })

  for (const line of report.stdout) writeLine(line)
  for (const warning of report.warnings) writeWarning(warning)
  for (const line of report.stderr) writeError(line)

  return report.exitCode
}

if (import.meta.main) {
  process.exit(await runSmokeDoctor())
}
