import type { PrismaClient } from '@prisma/client'

type DbGateOptions = {
  silent?: boolean
}

function summarizeDbGateError(error: unknown) {
  if (!(error instanceof Error)) return String(error)

  const errorWithCode = error as Error & { code?: unknown }
  const code = typeof errorWithCode.code === 'string' ? ` (${errorWithCode.code})` : ''
  const usefulLine =
    error.message
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !/^Invalid\b.*prisma.*invocation/i.test(line)) ?? error.name

  const detail = usefulLine && usefulLine !== error.name ? usefulLine : 'database connection failed'
  return `${error.name}${code}: ${detail}`
}

export function createDbTestGate(prisma: PrismaClient | null, suiteName: string) {
  let checked = false
  let available = false
  let reason = 'database_not_checked'
  let announced = false

  async function checkDb() {
    if (checked) return
    checked = true

    if (!prisma) {
      reason = 'DATABASE_URL is not configured'
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

    const message = `[db-test-skip] ${suiteName} requires a reachable Postgres database: ${reason}`
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
