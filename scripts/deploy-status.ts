import {
  apiBaseUrl,
  formatSmokeTargetDiagnosticText,
  formatUnknownDiagnosticText,
  isLocalSmokeTarget,
  readJson,
  smokeTargetIssuesForDeployedGate,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'
import {
  buildHealthRows,
  buildNextDeploySteps,
  evaluateDeployReadiness,
  healthFailures,
  type DeployReadiness,
  type HealthPayload,
} from './deploy-readiness'

type DeployStatusPayload = {
  ok: boolean
  apiBaseUrl: string
  stagingReady: boolean
  stagingBlockerCount: number
  productionReady: boolean
  productionBlockerCount: number
  health: {
    backend: boolean
    databaseConfigured: boolean
    databaseConnected: boolean
    openRouterConfigured: boolean
    imageGenerationConfigured: boolean
    authMode: string
    avatarStorage: string
    avatarStorageAccess: string
    chatStatus: string
    imageStatus: string
  }
  readiness: DeployReadiness
  nextSteps: string[]
  failures: string[]
  rootIdentity: {
    ok: boolean | undefined
    service?: string
  }
}

type DeployStatusFailurePayload = {
  ok: false
  apiBaseUrl: string
  error: string
  failures: string[]
  nextSteps: string[]
  rootIdentity: {
    ok: boolean
    service?: string
  }
}

export type DeployStatusRunnerOptions = {
  argv?: string[]
  readRootIdentity?: () => Promise<RootIdentityPayload>
  readHealth?: () => Promise<HealthPayload>
  currentApiBaseUrl?: string
  currentIsLocalSmokeTarget?: boolean
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function buildDeployStatusPayload(
  health: HealthPayload,
  options: { apiBaseUrl: string; isLocalSmokeTarget: boolean; rootIdentity?: RootIdentityPayload },
): DeployStatusPayload {
  const readiness = evaluateDeployReadiness(health, { isLocalSmokeTarget: options.isLocalSmokeTarget })
  const nextSteps = buildNextDeploySteps(readiness)
  const failures = healthFailures(health)

  return {
    ok: failures.length === 0,
    apiBaseUrl: options.apiBaseUrl,
    stagingReady: readiness.stagingReady,
    stagingBlockerCount: readiness.stagingBlockers.length,
    productionReady: readiness.productionReady,
    productionBlockerCount: readiness.productionBlockers.length,
    health: {
      backend: health.ok,
      databaseConfigured: health.checks.databaseConfigured,
      databaseConnected: health.checks.databaseConnected,
      openRouterConfigured: health.checks.openRouterConfigured,
      imageGenerationConfigured: health.checks.imageGenerationConfigured ?? health.model?.imageGeneration?.configured ?? false,
      authMode: health.security?.authMode ?? 'unknown',
      avatarStorage: health.security?.avatarStorage ?? 'unknown',
      avatarStorageAccess: health.security?.avatarStorageAccess ?? 'unknown',
      chatStatus: health.model?.chatProvider?.status ?? 'unknown',
      imageStatus: health.model?.imageGeneration?.status ?? 'unknown',
    },
    readiness,
    nextSteps,
    failures,
    rootIdentity: {
      ok: options.rootIdentity?.ok,
      service: options.rootIdentity?.service,
    },
  }
}

export function formatDeployStatusText(
  health: HealthPayload,
  options: { apiBaseUrl: string; isLocalSmokeTarget: boolean; rootIdentity?: RootIdentityPayload },
) {
  const payload = buildDeployStatusPayload(health, options)
  const { readiness, nextSteps, failures } = payload
  const lines = ['สถานะ deploy Maprang', '=====================']

  for (const [name, value] of buildHealthRows(health, options.apiBaseUrl)) {
    lines.push(`${name}: ${value}`)
  }
  if (payload.rootIdentity.service) lines.push(`root identity ระบบหลังบ้าน: ${payload.rootIdentity.service}`)

  if (health.env?.missingRequired?.length) lines.push(`env จำเป็นที่ขาด: ${health.env.missingRequired.join(', ')}`)
  if (health.env?.missingRecommended?.length) lines.push(`env แนะนำที่ขาด: ${health.env.missingRecommended.join(', ')}`)
  if (health.env?.invalid?.length) lines.push(`env ไม่ถูกต้อง: ${health.env.invalid.join('; ')}`)
  if (health.databaseError) lines.push(`ข้อผิดพลาดฐานข้อมูล: ${health.databaseError}`)
  if (failures.length > 0) lines.push(`ปัญหา health: ${failures.join('; ')}`)

  lines.push('')
  lines.push(`stagingReady: ${readiness.stagingReady}`)
  lines.push(`stagingBlockerCount: ${readiness.stagingBlockers.length}`)
  lines.push(
    readiness.stagingBlockers.length > 0
      ? `stagingBlockers: ${readiness.stagingBlockers.join('; ')}`
      : 'stagingBlockers: ไม่พบ',
  )
  if (readiness.stagingFixes.length > 0) {
    lines.push('วิธีแก้สเตจจิง:')
    for (const fix of readiness.stagingFixes) lines.push(`- ${fix}`)
  }

  lines.push('')
  lines.push(`productionReady: ${readiness.productionReady}`)
  lines.push(`productionBlockerCount: ${readiness.productionBlockers.length}`)
  lines.push(
    readiness.productionBlockers.length > 0
      ? `productionBlockers: ${readiness.productionBlockers.join('; ')}`
      : 'productionBlockers: ไม่พบ',
  )
  if (readiness.productionFixes.length > 0) {
    lines.push('วิธีแก้โปรดักชัน:')
    for (const fix of readiness.productionFixes) lines.push(`- ${fix}`)
  }

  lines.push('')
  lines.push('ขั้นตอนถัดไป:')
  for (const [index, step] of nextSteps.entries()) {
    lines.push(`${index + 1}. ${step}`)
  }

  return lines.join('\n')
}

export function formatDeployStatusCaughtError(error: unknown) {
  return formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
}

export function deployStatusTargetIssues(baseUrl: string, localTarget: boolean) {
  return smokeTargetIssuesForDeployedGate(baseUrl, localTarget)
}

function buildDeployStatusFailurePayload({
  apiBaseUrl,
  error,
  rootIdentity,
  nextSteps,
}: {
  apiBaseUrl: string
  error: string
  rootIdentity?: RootIdentityPayload
  nextSteps: string[]
}): DeployStatusFailurePayload {
  return {
    ok: false,
    apiBaseUrl,
    error,
    failures: [error],
    nextSteps,
    rootIdentity: {
      ok: rootIdentity?.ok ?? false,
      service: rootIdentity?.service,
    },
  }
}

export async function runDeployStatus(options: DeployStatusRunnerOptions | string[] = {}) {
  const normalized = Array.isArray(options) ? { argv: options } : options
  const argv = normalized.argv ?? process.argv
  const currentApiBaseUrl = normalized.currentApiBaseUrl ?? apiBaseUrl
  const currentIsLocalSmokeTarget = normalized.currentIsLocalSmokeTarget ?? isLocalSmokeTarget
  const writeLine = normalized.writeLine ?? ((line: string) => console.log(line))
  const writeError = normalized.writeError ?? ((line: string) => console.error(line))
  const readRootIdentity = normalized.readRootIdentity ?? (() => readJson<RootIdentityPayload>('/'))
  const readHealth = normalized.readHealth ?? (() => readJson<HealthPayload>('/health'))
  const jsonMode = argv.includes('--json')
  const targetIssues = deployStatusTargetIssues(currentApiBaseUrl, currentIsLocalSmokeTarget)
  let rootIdentity: RootIdentityPayload
  let health: HealthPayload

  if (targetIssues.length > 0) {
    const message = targetIssues.join('; ')
    const safeApiBaseUrl = formatSmokeTargetDiagnosticText(currentApiBaseUrl, 300)
    if (jsonMode) {
      writeLine(
        JSON.stringify(
          buildDeployStatusFailurePayload({
            apiBaseUrl: safeApiBaseUrl,
            error: message,
            nextSteps: [
              'ตั้ง SMOKE_API_BASE_URL เป็น backend origin ที่ deploy แล้วแบบ https',
              'ห้ามใส่ localhost/loopback, credential/userinfo, หรือ path/query/hash ใน SMOKE_API_BASE_URL',
            ],
          }),
          null,
          2,
        ),
      )
    } else {
      writeError(`ตรวจสถานะ deploy ไม่ผ่าน: ${message}`)
      writeError('วิธีแก้สเตจจิง: ตั้ง SMOKE_API_BASE_URL เป็น backend origin ที่ deploy แล้วแบบ https ไม่มี credential/userinfo, path/query/hash, หรือ localhost/loopback')
    }
    return 1
  }

  try {
    rootIdentity = await readRootIdentity()
    validateBackendRootIdentity(rootIdentity)
  } catch (error) {
    const message = formatDeployStatusCaughtError(error)
    if (jsonMode) {
      writeLine(
        JSON.stringify(
          buildDeployStatusFailurePayload({
            apiBaseUrl: formatSmokeTargetDiagnosticText(currentApiBaseUrl, 300),
            error: message,
            nextSteps: [
              'เริ่มระบบหลังบ้าน แล้วเช็กว่า GET / คืน identity payload ของ maprang-backend',
              'สเตจจิงต้องตั้ง SMOKE_API_BASE_URL เป็น URL ระบบหลังบ้านที่ deploy แล้ว ไม่ใช่ proxy ของหน้าบ้าน/static',
            ],
          }),
          null,
          2,
        ),
      )
    } else {
      writeError(`ตรวจสถานะ deploy ไม่ผ่าน: ${message}`)
      writeError('วิธีแก้ในเครื่อง: เริ่มระบบหลังบ้าน แล้วเช็กว่า GET / คืน identity payload ของ maprang-backend')
      writeError('วิธีแก้สเตจจิง: ตั้ง SMOKE_API_BASE_URL เป็น URL ระบบหลังบ้านที่ deploy แล้ว ไม่ใช่ proxy ของหน้าบ้าน/static')
    }
    return 1
  }

  try {
    health = await readHealth()
  } catch (error) {
    const message = formatDeployStatusCaughtError(error)
    if (jsonMode) {
      writeLine(
        JSON.stringify(
          buildDeployStatusFailurePayload({
            apiBaseUrl: formatSmokeTargetDiagnosticText(currentApiBaseUrl, 300),
            error: message,
            rootIdentity,
            nextSteps: [
              'เริ่มระบบหลังบ้านและฐานข้อมูล แล้วรัน deploy status ใหม่',
              'สเตจจิงต้องตั้ง SMOKE_API_BASE_URL เป็น URL ระบบหลังบ้านที่ deploy แล้ว',
            ],
          }),
          null,
          2,
        ),
      )
    } else {
      writeError(`ตรวจสถานะ deploy ไม่ผ่าน: ${message}`)
      writeError('วิธีแก้ในเครื่อง: เริ่มระบบหลังบ้านและฐานข้อมูล แล้วรัน `bun run deploy:status` ใหม่')
      writeError('วิธีแก้สเตจจิง: ตั้ง SMOKE_API_BASE_URL เป็น URL ระบบหลังบ้านที่ deploy แล้ว')
    }
    return 1
  }

  if (jsonMode) {
    const payload = buildDeployStatusPayload(health, {
      apiBaseUrl: currentApiBaseUrl,
      isLocalSmokeTarget: currentIsLocalSmokeTarget,
      rootIdentity,
    })
    writeLine(JSON.stringify(payload, null, 2))
    return payload.failures.length > 0 ? 1 : 0
  }

  const text = formatDeployStatusText(health, {
    apiBaseUrl: currentApiBaseUrl,
    isLocalSmokeTarget: currentIsLocalSmokeTarget,
    rootIdentity,
  })
  writeLine(text)
  return healthFailures(health).length > 0 ? 1 : 0
}

if (import.meta.main) process.exit(await runDeployStatus())
