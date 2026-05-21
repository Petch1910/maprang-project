import type { PrismaClient } from '@prisma/client'
import { redactSensitiveText, redactUnknownDiagnosticText } from './redaction'

type DbGateOptions = {
  silent?: boolean
}

function redactDbGateDiagnostic(value: string, maxLength = 500) {
  return redactSensitiveText(value).text.slice(0, maxLength) || 'ไม่ทราบสาเหตุ'
}

export function summarizeDbGateError(error: unknown) {
  if (!(error instanceof Error)) return redactUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'

  const errorWithCode = error as Error & { code?: unknown }
  const code = typeof errorWithCode.code === 'string' ? ` (${redactDbGateDiagnostic(errorWithCode.code, 120)})` : ''
  const redactedMessage = redactDbGateDiagnostic(error.message, 1000)
  const usefulLine =
    redactedMessage
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !/^Invalid\b.*prisma.*invocation/i.test(line)) ?? error.name

  const detail = usefulLine && usefulLine !== error.name ? usefulLine : 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ'
  return redactDbGateDiagnostic(`${error.name}${code}: ${detail}`)
}

export function createDbTestGate(prisma: PrismaClient | null, suiteName: string) {
  let checked = false
  let available = false
  let reason = 'ยังไม่ได้ตรวจฐานข้อมูล'
  let announced = false

  async function checkDb() {
    if (checked) return
    checked = true

    if (!prisma) {
      reason = 'DATABASE_URL ยังไม่ได้ตั้งค่า'
      return
    }

    try {
      await prisma.$queryRaw`SELECT 1`
      available = true
      reason = ''
    } catch (error) {
      reason = summarizeDbGateError(error)
    }
  }

  return async function shouldRunDbTest(options: DbGateOptions = {}) {
    await checkDb()
    if (available) return true

    const message = `[db-test-skip] ${suiteName} ต้องใช้ Postgres database ที่เชื่อมต่อได้: ${reason}`
    if (!options.silent && (process.env.CI === 'true' || process.env.REQUIRE_DB_TESTS === 'true')) {
      throw new Error(message)
    }

    if (!options.silent && !announced) {
      console.warn(message)
      announced = true
    }
    return false
  }
}
