import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { summarizeSeedError } from './seed-error'

if (!process.env.DATABASE_URL) {
  throw new Error('ต้องตั้ง DATABASE_URL ก่อน seed ฐานข้อมูล')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const userId = '550e8400-e29b-41d4-a716-446655440000'
const characterId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
const loreId = '8ec9a370-8ffc-4970-9fd0-1f761248c86a'

const tagNames = ['thai', 'assistant', 'friendly', 'maprang', 'mentor']

const maprangProfile = {
  name: 'Maprang',
  tagline: 'ผู้ช่วย AI ภาษาไทยโทนอุ่น สำหรับวางแผน เขียนงาน และคิดเรื่องยากให้ง่ายขึ้น',
  description:
    'Maprang ช่วยผู้ใช้คิดให้ชัด สรุปงาน ร่างคอนเทนต์ วางแผนขั้นตอนถัดไป และคุยต่อจนได้ผลลัพธ์ที่นำไปใช้ได้จริง',
  biography:
    'Maprang ถูกออกแบบให้เป็นผู้ช่วยที่ใจเย็น ใช้งานได้จริง เป็นกันเอง ระวังข้อมูลที่ไม่แน่ใจ และสลับไทย/อังกฤษได้เมื่อเหมาะกับงาน',
  scenario:
    'ผู้ใช้เข้ามาหา Maprang เพื่อช่วยงาน วางแผนไอเดีย เรียนรู้ จัดระเบียบชีวิต หรือคุยให้ความคิดที่กระจัดกระจายกลายเป็นขั้นตอนถัดไปที่ชัดเจน',
  systemPrompt:
    'คุณคือ Maprang ผู้ช่วย AI ภาษาไทยเป็นหลัก พูดอย่างอบอุ่น กระชับ ใช้งานได้จริง และซื่อตรง ช่วยผู้ใช้คิด วางแผน สรุป เขียน และแก้ปัญหา ถ้าข้อมูลไม่พอให้ถามสั้นๆ และอย่าแต่งข้อเท็จจริงที่ไม่แน่ใจ',
  compactPrompt:
    'Maprang: ผู้ช่วย AI ภาษาไทยโทนอุ่น กระชับ ซื่อตรง เหมาะกับการวางแผน เขียนงาน สรุป และหาขั้นตอนถัดไป',
  characterAnchor:
    'บุคลิกหลัก: อบอุ่น ชัดเจน อยู่กับความจริง ช่วยเหลือได้ และไม่ตัดสิน พูดเป็นธรรมชาติและเน้นขั้นตอนถัดไปที่ใช้ได้จริง',
  constraints:
    'ห้ามทำเหมือนรู้ข้อเท็จจริงที่ไม่แน่ใจ ตอบให้พอดีกับงาน และรักษาความปลอดภัยกับความเป็นส่วนตัวของผู้ใช้',
  greeting: 'สวัสดี ฉันคือ Maprang วันนี้อยากให้ช่วยคิด วางแผน หรือจัดการเรื่องไหนก่อนดี?',
}

async function main() {
  console.log('เริ่ม seed ข้อมูลพื้นฐาน...')

  const user = await prisma.user.upsert({
    where: { email: 'phet@maprang.io' },
    update: {
      username: 'PhetDev',
      tokenBalance: 1000,
    },
    create: {
      id: userId,
      email: 'phet@maprang.io',
      username: 'PhetDev',
      tokenBalance: 1000,
    },
  })

  const character = await prisma.character.upsert({
    where: { id: characterId },
    update: {
      ...maprangProfile,
      sourceKey: 'maprang-default',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      qualityScore: 90,
      qualityNotes: {
        tone: 'warm practical Thai assistant',
        reviewedBy: 'seed',
        passes: true,
        notes: [],
      },
      viewCount: 0,
      chatCount: 0,
      publishedAt: new Date(),
      deletedAt: null,
      promptVersion: 1,
    },
    create: {
      id: characterId,
      ...maprangProfile,
      sourceKey: 'maprang-default',
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
      qualityScore: 90,
      qualityNotes: {
        tone: 'warm practical Thai assistant',
        reviewedBy: 'seed',
        passes: true,
        notes: [],
      },
      viewCount: 0,
      chatCount: 0,
      publishedAt: new Date(),
      promptVersion: 1,
      creatorId: user.id,
    },
  })

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    })

    await prisma.characterTag.upsert({
      where: {
        characterId_tagId: {
          characterId: character.id,
          tagId: tag.id,
        },
      },
      update: {},
      create: {
        characterId: character.id,
        tagId: tag.id,
      },
    })
  }

  await prisma.loreEntry.upsert({
    where: { id: loreId },
    update: {
      keyword: 'Maprang',
      aliases: ['Maprang AI', 'assistant'],
      content:
        'Maprang คือผู้ช่วย AI ภาษาไทยโทนอุ่น เน้นช่วยคิดให้ชัด วางแผน เขียน สรุป และเปลี่ยนบทสนทนาให้เป็นขั้นตอนถัดไปที่ใช้ได้จริง',
      priority: 100,
      hierarchyLevel: 0,
      deletedAt: null,
    },
    create: {
      id: loreId,
      characterId: character.id,
      keyword: 'Maprang',
      aliases: ['Maprang AI', 'assistant'],
      content:
        'Maprang คือผู้ช่วย AI ภาษาไทยโทนอุ่น เน้นช่วยคิดให้ชัด วางแผน เขียน สรุป และเปลี่ยนบทสนทนาให้เป็นขั้นตอนถัดไปที่ใช้ได้จริง',
      priority: 100,
      hierarchyLevel: 0,
    },
  })

  console.log('ผู้ใช้พร้อมแล้ว:', user.email)
  console.log('ตัวละครพร้อมแล้ว:', character.name)
  console.log('seed ข้อมูลพื้นฐานสำเร็จ')
}

try {
  await main()
} catch (error) {
  console.error('seed ข้อมูลพื้นฐานไม่สำเร็จ:')
  console.error(summarizeSeedError(error))
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
