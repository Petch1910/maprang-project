import 'dotenv/config'
import { getPrisma } from './db'

function summarizeDatabaseError(error: unknown) {
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

const prisma = getPrisma()

if (!prisma) {
  console.error('Database check failed: DATABASE_URL is not configured.')
  process.exit(1)
}

try {
  await prisma.$queryRaw`SELECT 1`
  console.log('Database check passed.')
  await prisma.$disconnect()
} catch (error) {
  console.error(`Database check failed: ${summarizeDatabaseError(error)}`)
  console.error('Local fix: start Docker Desktop, run `docker compose up -d postgres`, then run migrations.')
  console.error('Deploy fix: verify DATABASE_URL, migrations, and network access from the backend service.')
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
}
