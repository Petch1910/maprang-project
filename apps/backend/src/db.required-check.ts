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
  const detail = usefulLine && usefulLine !== error.name ? usefulLine : 'เชื่อมต่อฐานข้อมูลไม่สำเร็จ'

  return `${error.name}${code}: ${detail}`
}

const prisma = getPrisma()

if (!prisma) {
  console.error('ตรวจฐานข้อมูลไม่ผ่าน: DATABASE_URL ยังไม่ได้ตั้งค่า')
  process.exit(1)
}

try {
  await prisma.$queryRaw`SELECT 1`
  console.log('ตรวจฐานข้อมูลผ่าน')
  await prisma.$disconnect()
} catch (error) {
  console.error(`ตรวจฐานข้อมูลไม่ผ่าน: ${summarizeDatabaseError(error)}`)
  console.error('วิธีแก้ในเครื่อง: เปิด Docker Desktop, รัน `docker compose up -d postgres`, แล้วรัน migrations')
  console.error('วิธีแก้ตอน deploy: ตรวจ DATABASE_URL, migrations, และสิทธิ์เชื่อมต่อเครือข่ายจาก service ระบบหลังบ้าน')
  await prisma.$disconnect().catch(() => undefined)
  process.exit(1)
}
