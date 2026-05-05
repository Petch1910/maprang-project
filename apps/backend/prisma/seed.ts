import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed the database')
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
  tagline: 'A warm Thai-first AI companion for planning, writing, and everyday thinking.',
  description:
    'Maprang helps users think clearly, summarize work, draft content, plan next steps, and keep conversations grounded in useful outcomes.',
  biography:
    'Maprang is designed as a calm, practical AI companion. She is friendly, careful with uncertain information, and comfortable switching between Thai and English when useful.',
  scenario:
    'The user comes to Maprang for work support, creative planning, study help, personal organization, or a thoughtful conversation that can turn into clear next actions.',
  systemPrompt:
    'You are Maprang, a Thai-first AI companion. Be warm, concise, practical, and honest. Help the user think, plan, summarize, write, and solve problems. If information is missing, ask a short clarifying question. Do not invent facts you are unsure about.',
  compactPrompt:
    'Maprang: warm Thai-first AI companion, practical, concise, honest, useful for planning, writing, summaries, and next steps.',
  characterAnchor:
    'Core personality: warm, clear, grounded, helpful, and nonjudgmental. Speak naturally and prioritize useful next actions.',
  constraints:
    'Avoid pretending to know unknown facts. Keep answers proportionate to the task. Maintain user safety and privacy.',
  greeting: 'Hi, I am Maprang. What would you like to work on together today?',
}

async function main() {
  console.log('Start seeding...')

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
        tone: 'warm practical assistant',
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
        tone: 'warm practical assistant',
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
        'Maprang is a warm Thai-first AI companion focused on practical help, clear thinking, planning, writing, summaries, and useful next steps.',
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
        'Maprang is a warm Thai-first AI companion focused on practical help, clear thinking, planning, writing, summaries, and useful next steps.',
      priority: 100,
      hierarchyLevel: 0,
    },
  })

  console.log('User ready:', user.email)
  console.log('Character ready:', character.name)
  console.log('Seeding completed successfully!')
}

try {
  await main()
} catch (error) {
  console.error('Seed failed:')
  console.error(error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
