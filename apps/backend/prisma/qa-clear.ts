import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { summarizeSeedError } from './seed-error'

if (!process.env.DATABASE_URL) {
  throw new Error('ต้องตั้ง DATABASE_URL ก่อนล้างข้อมูล QA')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const qaUsageId = '11111111-1111-4111-8111-111111111111'
const qaReportId = '22222222-2222-4222-8222-222222222222'
const qaAuditId = '33333333-3333-4333-8333-333333333333'

const qaChatIds = [
  '61aaecf2-a85b-4e01-a7ee-0973eef62699',
  'aaaaaaaa-1111-4111-8111-aaaaaaaa1111',
  'aaaaaaaa-2222-4222-8222-aaaaaaaa2222',
  'bbbbbbbb-1111-4111-8111-bbbbbbbb1111',
  'bbbbbbbb-2222-4222-8222-bbbbbbbb2222',
  'cccccccc-1111-4111-8111-cccccccc1111',
  'cccccccc-2222-4222-8222-cccccccc2222',
  'dddddddd-1111-4111-8111-dddddddd1111',
  'dddddddd-2222-4222-8222-dddddddd2222',
  'eeeeeeee-1111-4111-8111-eeeeeeee1111',
  'eeeeeeee-2222-4222-8222-eeeeeeee2222',
  'ffffffff-1111-4111-8111-ffffffff1111',
  'ffffffff-2222-4222-8222-ffffffff2222',
]

const qaSeedMessageIds = [
  'qa-smoke-message-user-1',
  'qa-smoke-message-assistant-1',
  'qa-menu-archive-desktop-message-1',
  'qa-menu-archive-mobile-message-1',
  'qa-menu-delete-desktop-message-1',
  'qa-menu-delete-mobile-message-1',
  'qa-my-chats-archive-desktop-message-1',
  'qa-my-chats-archive-mobile-message-1',
  'qa-my-chats-delete-desktop-message-1',
  'qa-my-chats-delete-mobile-message-1',
  'qa-my-chats-bulk-archive-desktop-message-1',
  'qa-my-chats-bulk-archive-mobile-message-1',
  'qa-my-chats-bulk-delete-desktop-message-1',
  'qa-my-chats-bulk-delete-mobile-message-1',
]

async function clearQaSeed() {
  console.log('QA clear: กำลังล้างข้อมูล seed ทดสอบ...')

  const [
    audit,
    reports,
    transactions,
    usages,
    messages,
    chats,
    characters,
  ] = await prisma.$transaction([
    prisma.adminAuditLog.deleteMany({
      where: {
        OR: [
          { id: qaAuditId },
          { metadata: { path: ['source'], equals: 'qa-seed' } },
        ],
      },
    }),
    prisma.report.deleteMany({
      where: {
        OR: [
          { id: qaReportId },
          { metadata: { path: ['source'], equals: 'qa-seed' } },
          { character: { sourceKey: { startsWith: 'qa-' } } },
          { message: { chatId: { in: qaChatIds } } },
        ],
      },
    }),
    prisma.tokenTransaction.deleteMany({
      where: {
        OR: [
          { usageId: qaUsageId },
          { metadata: { path: ['source'], equals: 'qa-seed' } },
        ],
      },
    }),
    prisma.usage.deleteMany({
      where: {
        OR: [
          { id: qaUsageId },
          { modelName: 'qa-seed-smoke' },
        ],
      },
    }),
    prisma.message.deleteMany({
      where: {
        OR: [
          { id: { in: qaSeedMessageIds } },
          { chatId: { in: qaChatIds } },
          { modelUsed: 'qa-seed' },
          { metadata: { path: ['source'], equals: 'qa-seed' } },
        ],
      },
    }),
    prisma.chat.deleteMany({
      where: {
        OR: [
          { id: { in: qaChatIds } },
          { character: { sourceKey: { startsWith: 'qa-' } } },
          { title: { startsWith: 'QA Smoke ' } },
        ],
      },
    }),
    prisma.character.deleteMany({
      where: {
        OR: [
          { sourceKey: { startsWith: 'qa-' } },
          { name: { startsWith: 'QA Smoke ' } },
        ],
      },
    }),
  ])

  console.log(
    `QA clear เสร็จแล้ว: audit ${audit.count}, reports ${reports.count}, transactions ${transactions.count}, usages ${usages.count}, messages ${messages.count}, chats ${chats.count}, characters ${characters.count}`,
  )
}

try {
  await clearQaSeed()
} catch (error) {
  console.error('QA clear ไม่สำเร็จ:')
  console.error(summarizeSeedError(error))
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
