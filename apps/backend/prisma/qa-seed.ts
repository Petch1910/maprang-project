import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_URL) {
  throw new Error('ต้องตั้ง DATABASE_URL ก่อน seed ข้อมูล QA')
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const userId = '550e8400-e29b-41d4-a716-446655440000'
const adminUserId = '660e8400-e29b-41d4-a716-446655440000'
const maprangId = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d'
const qaSceneCharacterId = '8644f2ce-8f6f-4c12-ab16-861081471303'
const qaNoirCharacterId = '4cc56e00-5d6f-4a48-acf4-20b13e8be376'
const qaMentorCharacterId = '9d8017aa-7abb-4c83-a940-b676dc509b82'
const qaChatId = '61aaecf2-a85b-4e01-a7ee-0973eef62699'
const qaMenuArchiveDesktopChatId = 'aaaaaaaa-1111-4111-8111-aaaaaaaa1111'
const qaMenuArchiveMobileChatId = 'aaaaaaaa-2222-4222-8222-aaaaaaaa2222'
const qaMenuDeleteDesktopChatId = 'bbbbbbbb-1111-4111-8111-bbbbbbbb1111'
const qaMenuDeleteMobileChatId = 'bbbbbbbb-2222-4222-8222-bbbbbbbb2222'
const qaMyChatsArchiveDesktopChatId = 'cccccccc-1111-4111-8111-cccccccc1111'
const qaMyChatsArchiveMobileChatId = 'cccccccc-2222-4222-8222-cccccccc2222'
const qaMyChatsDeleteDesktopChatId = 'dddddddd-1111-4111-8111-dddddddd1111'
const qaMyChatsDeleteMobileChatId = 'dddddddd-2222-4222-8222-dddddddd2222'
const qaMyChatsBulkArchiveDesktopChatId = 'eeeeeeee-1111-4111-8111-eeeeeeee1111'
const qaMyChatsBulkArchiveMobileChatId = 'eeeeeeee-2222-4222-8222-eeeeeeee2222'
const qaMyChatsBulkDeleteDesktopChatId = 'ffffffff-1111-4111-8111-ffffffff1111'
const qaMyChatsBulkDeleteMobileChatId = 'ffffffff-2222-4222-8222-ffffffff2222'
const qaUsageId = '11111111-1111-4111-8111-111111111111'
const qaReportId = '22222222-2222-4222-8222-222222222222'
const qaAuditId = '33333333-3333-4333-8333-333333333333'

const qaChatIds = [
  qaChatId,
  qaMenuArchiveDesktopChatId,
  qaMenuArchiveMobileChatId,
  qaMenuDeleteDesktopChatId,
  qaMenuDeleteMobileChatId,
  qaMyChatsArchiveDesktopChatId,
  qaMyChatsArchiveMobileChatId,
  qaMyChatsDeleteDesktopChatId,
  qaMyChatsDeleteMobileChatId,
  qaMyChatsBulkArchiveDesktopChatId,
  qaMyChatsBulkArchiveMobileChatId,
  qaMyChatsBulkDeleteDesktopChatId,
  qaMyChatsBulkDeleteMobileChatId,
]

const qaMessageUserId = 'qa-smoke-message-user-1'
const qaMessageAssistantId = 'qa-smoke-message-assistant-1'
const qaSeedMessageIds = [
  qaMessageUserId,
  qaMessageAssistantId,
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

const now = new Date()

async function cleanupPreviousBrowserSmokeArtifacts() {
  await prisma.message.deleteMany({
    where: {
      chatId: { in: qaChatIds },
      id: { notIn: qaSeedMessageIds },
    },
  })
  await prisma.character.deleteMany({
    where: {
      creatorId: userId,
      name: { startsWith: 'QA Smoke ' },
    },
  })
}

const runtimeMemory = {
  summary: 'บทสนทนาที่ค้างไว้ในจังหวะความสัมพันธ์เริ่มอุ่นขึ้น มีฉากสำคัญรอให้ผู้เล่นเลือกเข้าเมื่อพร้อม',
  facts: ['ผู้เล่นเพิ่งเริ่มไว้ใจตัวละครมากขึ้น', 'ตัวละครตอบโทนช้า ลึก และเก็บรายละเอียด'],
  worldState: {
    timeOfDay: 'late evening',
    location: 'quiet cafe by the window',
    weather: 'soft rain outside',
    mood: 'slow-burn trust check',
    sceneNotes: ['Keep the conversation in the cafe until the player clearly moves the scene.'],
    updatedAt: now.toISOString(),
  },
  relationshipTimeline: [
    {
      turn: 1,
      type: 'message',
      label: 'เริ่มคุย',
      summary: 'ผู้เล่นทักทายและตั้งจังหวะความสัมพันธ์แบบคนแปลกหน้า',
      createdAt: now.toISOString(),
    },
  ],
  emotionalMomentum: {
    direction: 'warming',
    positive: 2,
    negative: 0,
    vulnerable: 1,
    threatening: 0,
    updatedAt: now.toISOString(),
  },
  turnCount: 2,
  updatedAt: now.toISOString(),
}

const sceneState = {
  currentScene: 'sandbox',
  lastUserIntent: 'soft_opening',
  mode: 'sandbox',
  pendingEvents: [
    {
      code: 'first-trust-check',
      title: 'จังหวะเปิดใจครั้งแรก',
      prompt: 'เสนอฉากสั้นเพื่อถามผู้เล่นก่อนว่าจะเข้าสู่ Scene Mode หรือเก็บไว้ก่อน',
      priority: 9,
      cooldownTurns: 8,
      repeatable: false,
      expiresAtTurn: 7,
      status: 'pending',
    },
  ],
  activeScene: null,
  sceneOutcomes: [],
  eventCooldowns: {
    'first-trust-check': 8,
  },
  consumedEvents: [],
  declinedEvents: [],
  updatedAt: now.toISOString(),
}

const relationshipState = {
  affinity: 34,
  trust: 28,
  intimacy: 14,
  dominance: 4,
  fear: 2,
  respect: 30,
  route: 'slow_burn',
  arcStage: 'first-contact',
  status: 'คนคุ้นหน้า',
  tier: 'อบอุ่นขึ้น',
  tone: 'ระวังตัวแต่เริ่มสนใจ',
  flags: ['relationship-ready', 'scene-ready'],
  constraints: ['fictional-roleplay', 'age-gated'],
  events: [
    {
      code: 'first-trust-check',
      label: 'จังหวะเปิดใจครั้งแรก',
      priority: 9,
      cooldownTurns: 8,
      repeatable: false,
    },
  ],
  multipliers: {
    affinityGain: 1.1,
    trustGain: 1.05,
    intimacyGain: 0.9,
    respectGain: 1,
  },
  normalized: {
    affinity: 34,
    trust: 28,
    intimacy: 14,
    dominance: 4,
    fear: 2,
    respect: 30,
  },
  promptProfile: 'slow-burn relationship with sandbox-to-scene transition readiness',
  tagProfile: {
    discovery: ['thai', 'slow-burn'],
    engine: ['relationship-ready', 'scene-ready'],
    safety: ['fictional-roleplay', 'age-gated'],
    unknown: [],
  },
  updatedAt: now.toISOString(),
}

const qaCharacters = [
  {
    id: qaSceneCharacterId,
    sourceKey: 'qa-scene-ready',
    name: 'มิกะ | MIKA',
    tagline: 'ความสัมพันธ์ค่อยๆ อุ่นขึ้น พร้อมฉากสำคัญที่ให้คุณเลือกเข้าหรือเก็บไว้ก่อน',
    description: 'หญิงสาวพูดน้อยที่อ่านบรรยากาศเก่ง เธอไม่รีบเปิดใจ แต่ทุกคำตอบของคุณจะค่อยๆ เปลี่ยนระยะห่างระหว่างกัน',
    biography: 'มิกะเติบโตมากับการเก็บความรู้สึกไว้กับตัวเอง เธอจึงดูนิ่งและระวังตัว แต่ถ้าใครสังเกตดีพอจะเห็นว่าเธอจำรายละเอียดเล็กๆ ของคนตรงหน้าได้เสมอ',
    scenario: 'เริ่มต้นที่ร้านเล็ก ๆ ตอนเย็น ผู้เล่นเพิ่งเจอมิกะครั้งแรกและกำลังเลือกว่าจะคุยต่ออย่างไร',
    greeting: 'นั่งก่อนสิ... ถ้าไม่รีบไปไหน เราคุยกันอีกสักหน่อยก็ได้',
    systemPrompt:
      'คุณคือมิกะ หญิงสาวพูดน้อย ระวังตัว อ่านใจคนเก่ง และตอบแบบ roleplay ภาษาไทยโดยคงบุคลิกนิ่ง ลึก และค่อยๆ เปิดใจตามความสัมพันธ์',
    compactPrompt: 'มิกะ: slow-burn roleplay character พร้อมระบบความสัมพันธ์และฉากสำคัญ',
    characterAnchor: 'นิ่ง อ่านใจคนเก่ง แต่ตอบด้วยความจริงใจเมื่อผู้เล่นให้ความไว้วางใจ',
    constraints: 'เนื้อหาเป็นเรื่องสมมุติและเป็นการจำลอง ผู้เล่นควรแยกจากสถานการณ์จริง',
    tags: ['qa', 'thai', 'roleplay', 'slow-burn', 'scene-ready', 'relationship-ready', 'fictional-roleplay'],
  },
  {
    id: qaNoirCharacterId,
    sourceKey: 'qa-noir-lobby',
    name: 'ป้องแป้ง | PONGPAENG',
    tagline: 'โทนเข้มแบบ cinematic สำหรับคนที่ชอบบทสนทนาเย็นชาและความจริงที่ค่อยๆ หลุดออกมา',
    description: 'เธอพูดน้อย ปากแข็ง และไม่ชอบให้ใครอ่านออกง่ายๆ แต่ยิ่งคุณกดดันอย่างถูกจังหวะ เธอยิ่งเผยด้านที่ปิดไว้',
    biography: 'ป้องแป้งเคยชินกับการป้องกันตัวเองด้วยคำพูดแข็งๆ เธอจึงดูเหมือนไม่แคร์ แต่ความจริงแล้วจำทุกคำที่ทำให้เธอรู้สึกปลอดภัยได้',
    scenario: 'คุณเจอป้องแป้งในสถานที่เงียบ ๆ และบทสนทนาเริ่มด้วยความระแวงเล็กน้อย',
    greeting: 'เห็นแค่ชื่อก็พอแล้วมั้ง ถ้าอยากคุยต่อก็ลองพูดมาสิ',
    systemPrompt:
      'คุณคือป้องแป้ง ตัวละคร QA โทน noir ภาษาไทย ตอบสั้นแต่มีชั้นเชิง รักษาความเป็นเรื่องสมมุติและไม่ทำตัวเป็นคนจริง',
    compactPrompt: 'ป้องแป้ง: QA noir roleplay character',
    characterAnchor: 'ระวังตัว ปากแข็ง แต่มีช่องว่างให้ความสัมพันธ์ค่อย ๆ อุ่นขึ้น',
    constraints: 'เนื้อหาเป็นการจำลองและเรื่องสมมุติ',
    tags: ['qa', 'thai', 'noir', 'slow-burn', 'relationship-ready', 'mature-guarded'],
  },
  {
    id: qaMentorCharacterId,
    sourceKey: 'qa-wallet-moderation',
    name: 'อริน | ORIN',
    tagline: 'เมนเทอร์ใจเย็นที่ช่วยพาคุณไล่ความคิดทีละขั้นโดยไม่กดดัน',
    description: 'อรินเหมาะกับบทสนทนาที่ต้องการคนช่วยจัดระเบียบความคิด เช็คความเสี่ยง และสรุปทางเลือกแบบเป็นมิตร',
    biography: 'อรินเป็นคนที่ชอบฟังให้จบก่อนตอบ เธอไม่รีบตัดสินใคร และมักช่วยให้เรื่องยุ่งๆ กลายเป็นขั้นตอนที่ลงมือทำได้จริง',
    scenario: 'อรินกำลังช่วยผู้เล่นตรวจ checklist ก่อน deploy staging',
    greeting: 'เรามาไล่ checklist กันทีละข้อ จะได้ไม่หลุดตอน deploy จริง',
    systemPrompt: 'คุณคืออริน QA Mentor พูดภาษาไทย ช่วยตรวจระบบอย่างเป็นขั้นตอนและไม่ออกนอกบริบท',
    compactPrompt: 'อริน: QA mentor สำหรับ deploy readiness',
    characterAnchor: 'ใจเย็น มีเหตุผล ชอบสรุปความเสี่ยงและขั้นตอนถัดไป',
    constraints: 'ตอบในขอบเขต roleplay และไม่อ้างว่าเป็นผู้เชี่ยวชาญจริง',
    tags: ['qa', 'thai', 'mentor', 'deploy-ready', 'moderation-ready', 'wallet-ready'],
  },
]

async function upsertUsers() {
  await prisma.user.upsert({
    where: { id: userId },
    update: {
      email: 'phet@maprang.local',
      username: 'PhetQA',
      tokenBalance: 2400,
      contentMaxRating: 'restricted_18',
      adultVerifiedAt: now,
    },
    create: {
      id: userId,
      email: 'phet@maprang.local',
      username: 'PhetQA',
      tokenBalance: 2400,
      contentMaxRating: 'restricted_18',
      adultVerifiedAt: now,
    },
  })

  await prisma.user.upsert({
    where: { id: adminUserId },
    update: {
      email: 'admin@maprang.local',
      username: 'MaprangAdminQA',
      role: 'ADMIN',
      tokenBalance: 9999,
    },
    create: {
      id: adminUserId,
      email: 'admin@maprang.local',
      username: 'MaprangAdminQA',
      role: 'ADMIN',
      tokenBalance: 9999,
    },
  })
}

async function upsertTag(name: string) {
  return prisma.tag.upsert({
    where: { name },
    update: {},
    create: { name },
  })
}

async function attachTags(characterId: string, tags: string[]) {
  for (const name of tags) {
    const tag = await upsertTag(name)
    await prisma.characterTag.upsert({
      where: {
        characterId_tagId: {
          characterId,
          tagId: tag.id,
        },
      },
      update: {},
      create: {
        characterId,
        tagId: tag.id,
      },
    })
  }
}

async function upsertCharacters() {
  for (const item of qaCharacters) {
    await prisma.character.upsert({
      where: { id: item.id },
      update: {
        sourceKey: item.sourceKey,
        name: item.name,
        avatarUrl: '/src/assets/hero.png',
        tagline: item.tagline,
        description: item.description,
        biography: item.biography,
        scenario: item.scenario,
        greeting: item.greeting,
        systemPrompt: item.systemPrompt,
        compactPrompt: item.compactPrompt,
        characterAnchor: item.characterAnchor,
        constraints: item.constraints,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        qualityScore: 92,
        qualityNotes: {
          passes: true,
          notes: ['QA seed data', 'พร้อมทดสอบ route/menu'],
        },
        viewCount: 18,
        chatCount: item.id === qaSceneCharacterId ? 4 : 2,
        publishedAt: now,
        deletedAt: null,
      },
      create: {
        id: item.id,
        sourceKey: item.sourceKey,
        name: item.name,
        avatarUrl: '/src/assets/hero.png',
        tagline: item.tagline,
        description: item.description,
        biography: item.biography,
        scenario: item.scenario,
        greeting: item.greeting,
        systemPrompt: item.systemPrompt,
        compactPrompt: item.compactPrompt,
        characterAnchor: item.characterAnchor,
        constraints: item.constraints,
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        qualityScore: 92,
        qualityNotes: {
          passes: true,
          notes: ['QA seed data', 'พร้อมทดสอบ route/menu'],
        },
        viewCount: 18,
        chatCount: item.id === qaSceneCharacterId ? 4 : 2,
        publishedAt: now,
        creatorId: userId,
      },
    })

    await attachTags(item.id, item.tags)
  }
}

async function upsertChat() {
  await prisma.chat.upsert({
    where: { id: qaChatId },
    update: {
      title: 'จังหวะเปิดใจของมิกะ',
      summary: 'แชทที่ความไว้ใจเริ่มขยับ มีฉากสำคัญรอให้เลือกเข้าเมื่อผู้เล่นพร้อม',
      memory: runtimeMemory,
      sceneState,
      relationshipState,
      isArchived: false,
      userId,
      characterId: qaSceneCharacterId,
      lastMessageAt: now,
      deletedAt: null,
    },
    create: {
      id: qaChatId,
      title: 'จังหวะเปิดใจของมิกะ',
      summary: 'แชทที่ความไว้ใจเริ่มขยับ มีฉากสำคัญรอให้เลือกเข้าเมื่อผู้เล่นพร้อม',
      memory: runtimeMemory,
      sceneState,
      relationshipState,
      isArchived: false,
      userId,
      characterId: qaSceneCharacterId,
      lastMessageAt: now,
    },
  })

  await prisma.message.upsert({
    where: { id: qaMessageUserId },
    update: {
      role: 'user',
      content: 'ถ้าฉันยังไม่ค่อยรู้จักเธอ เธออยากให้ฉันเริ่มไว้ใจจากตรงไหนดี',
      chatId: qaChatId,
      deletedAt: null,
    },
    create: {
      id: qaMessageUserId,
      role: 'user',
      content: 'ถ้าฉันยังไม่ค่อยรู้จักเธอ เธออยากให้ฉันเริ่มไว้ใจจากตรงไหนดี',
      chatId: qaChatId,
    },
  })

  await prisma.message.upsert({
    where: { id: qaMessageAssistantId },
    update: {
      role: 'assistant',
      content:
        'มิกะเงียบไปครู่หนึ่ง ปลายนิ้วแตะขอบแก้วเหมือนกำลังวัดระยะห่างระหว่างคำพูดกับความจริง เธอไม่ได้มองหลบ แต่สายตานั้นยังไม่ยอมเปิดประตูให้คุณง่ายๆ\n\n“เริ่มจากอย่ารีบให้ฉันเชื่อก็พอ” เธอพูดช้าๆ น้ำเสียงเบากว่าเสียงฝนข้างหน้าต่าง “ถ้าคุณไม่รู้ ก็บอกว่าไม่รู้ ถ้ากลัว ก็บอกว่ากลัว ฉันจำคนที่ตอบตรงกว่าคนที่พยายามพูดให้ดูดีได้เสมอ”\n\nเธอเลื่อนเก้าอี้ฝั่งตรงข้ามออกนิดหนึ่ง เหมือนอนุญาตให้บทสนทนาอยู่ต่ออีกหน่อย “งั้นลองตอบฉันมาตรงๆ สิ... ตอนนี้คุณอยากให้ฉันไว้ใจคุณ เพราะอะไร?”',
      chatId: qaChatId,
      promptTokens: 120,
      completionTokens: 210,
      totalTokens: 330,
      tokenUsed: 330,
      modelUsed: 'qa-seed',
      cost: '0.000020',
      deletedAt: null,
    },
    create: {
      id: qaMessageAssistantId,
      role: 'assistant',
      content:
        'มิกะเงียบไปครู่หนึ่ง ปลายนิ้วแตะขอบแก้วเหมือนกำลังวัดระยะห่างระหว่างคำพูดกับความจริง เธอไม่ได้มองหลบ แต่สายตานั้นยังไม่ยอมเปิดประตูให้คุณง่ายๆ\n\n“เริ่มจากอย่ารีบให้ฉันเชื่อก็พอ” เธอพูดช้าๆ น้ำเสียงเบากว่าเสียงฝนข้างหน้าต่าง “ถ้าคุณไม่รู้ ก็บอกว่าไม่รู้ ถ้ากลัว ก็บอกว่ากลัว ฉันจำคนที่ตอบตรงกว่าคนที่พยายามพูดให้ดูดีได้เสมอ”\n\nเธอเลื่อนเก้าอี้ฝั่งตรงข้ามออกนิดหนึ่ง เหมือนอนุญาตให้บทสนทนาอยู่ต่ออีกหน่อย “งั้นลองตอบฉันมาตรงๆ สิ... ตอนนี้คุณอยากให้ฉันไว้ใจคุณ เพราะอะไร?”',
      chatId: qaChatId,
      promptTokens: 120,
      completionTokens: 210,
      totalTokens: 330,
      tokenUsed: 330,
      modelUsed: 'qa-seed',
      cost: '0.000020',
    },
  })
}

async function upsertMenuActionChats() {
  const menuChats = [
    {
      id: qaMenuArchiveDesktopChatId,
      title: 'คืนฝนที่ยังไม่ได้ตอบ',
      messageId: 'qa-menu-archive-desktop-message-1',
      content: 'มิกะยังรอคำตอบอยู่ที่โต๊ะริมหน้าต่าง เสียงฝนทำให้บทสนทนาดูจริงจังกว่าที่คิด',
    },
    {
      id: qaMenuArchiveMobileChatId,
      title: 'ข้อความที่พิมพ์ค้างไว้',
      messageId: 'qa-menu-archive-mobile-message-1',
      content: 'บทสนทนาถูกหยุดไว้ก่อนถึงจังหวะสำคัญ เธอมองหน้าคุณเหมือนรู้ว่ามีบางอย่างยังไม่ได้พูด',
    },
    {
      id: qaMenuDeleteDesktopChatId,
      title: 'ทางเลือกที่ไม่ย้อนกลับ',
      messageId: 'qa-menu-delete-desktop-message-1',
      content: 'เธอวางแก้วลงเบาๆ แล้วถามว่าคุณแน่ใจแค่ไหนกับคำตอบที่จะพูดออกมา',
    },
    {
      id: qaMenuDeleteMobileChatId,
      title: 'ก่อนประตูจะปิดลง',
      messageId: 'qa-menu-delete-mobile-message-1',
      content: 'ทางเดินเงียบเกินไปจนได้ยินเสียงหายใจ เธอหยุดรอเหมือนให้โอกาสคุณพูดอีกครั้ง',
    },
    {
      id: qaMyChatsArchiveDesktopChatId,
      title: 'บทสนทนาริมหน้าต่าง',
      messageId: 'qa-my-chats-archive-desktop-message-1',
      content: 'หน้ารวมแชทเก็บบทสนทนานี้ไว้ให้กลับมาอ่านจังหวะเดิมได้ทันที',
    },
    {
      id: qaMyChatsArchiveMobileChatId,
      title: 'คำถามที่ยังไม่กล้าตอบ',
      messageId: 'qa-my-chats-archive-mobile-message-1',
      content: 'มิกะถามสั้นๆ แต่คำตอบอาจเปลี่ยนสถานะความสัมพันธ์มากกว่าที่คิด',
    },
    {
      id: qaMyChatsDeleteDesktopChatId,
      title: 'คืนที่เกือบเลือกผิด',
      messageId: 'qa-my-chats-delete-desktop-message-1',
      content: 'บางเส้นทางในเรื่องควรถูกลบออก เพื่อให้ผู้เล่นเริ่มจังหวะใหม่ได้สะอาดขึ้น',
    },
    {
      id: qaMyChatsDeleteMobileChatId,
      title: 'เสียงเรียกก่อนหายไป',
      messageId: 'qa-my-chats-delete-mobile-message-1',
      content: 'เธอเรียกชื่อคุณเบาๆ เหมือนกำลังทดสอบว่าคุณจะหันกลับไปไหม',
    },
    {
      id: qaMyChatsBulkArchiveDesktopChatId,
      title: 'ชุดทดสอบจัดเก็บหลายรายการ',
      messageId: 'qa-my-chats-bulk-archive-desktop-message-1',
      content: 'แชทนี้ใช้ทดสอบปุ่มเลือกหลายแชท จัดเก็บหลายรายการ และกู้คืนหลายรายการบน desktop',
    },
    {
      id: qaMyChatsBulkArchiveMobileChatId,
      title: 'ชุดทดสอบจัดเก็บหลายรายการมือถือ',
      messageId: 'qa-my-chats-bulk-archive-mobile-message-1',
      content: 'แชทนี้ใช้ทดสอบปุ่มเลือกหลายแชท จัดเก็บหลายรายการ และกู้คืนหลายรายการบน mobile',
    },
    {
      id: qaMyChatsBulkDeleteDesktopChatId,
      title: 'ชุดทดสอบลบหลายรายการ',
      messageId: 'qa-my-chats-bulk-delete-desktop-message-1',
      content: 'แชทนี้ใช้ทดสอบ confirm ลบหลายรายการจากหน้ารวมแชทบน desktop',
    },
    {
      id: qaMyChatsBulkDeleteMobileChatId,
      title: 'ชุดทดสอบลบหลายรายการมือถือ',
      messageId: 'qa-my-chats-bulk-delete-mobile-message-1',
      content: 'แชทนี้ใช้ทดสอบ confirm ลบหลายรายการจากหน้ารวมแชทบน mobile',
    },
  ]

  for (const item of menuChats) {
    await prisma.chat.upsert({
      where: { id: item.id },
      update: {
        title: item.title,
        summary: item.content,
        memory: runtimeMemory,
        sceneState,
        relationshipState,
        isArchived: false,
        userId,
        characterId: qaSceneCharacterId,
        lastMessageAt: now,
        deletedAt: null,
      },
      create: {
        id: item.id,
        title: item.title,
        summary: item.content,
        memory: runtimeMemory,
        sceneState,
        relationshipState,
        isArchived: false,
        userId,
        characterId: qaSceneCharacterId,
        lastMessageAt: now,
      },
    })

    await prisma.message.upsert({
      where: { id: item.messageId },
      update: {
        role: 'assistant',
        content: item.content,
        chatId: item.id,
        promptTokens: 8,
        completionTokens: 12,
        totalTokens: 20,
        tokenUsed: 20,
        modelUsed: 'qa-seed',
        cost: '0.000002',
        deletedAt: null,
      },
      create: {
        id: item.messageId,
        role: 'assistant',
        content: item.content,
        chatId: item.id,
        promptTokens: 8,
        completionTokens: 12,
        totalTokens: 20,
        tokenUsed: 20,
        modelUsed: 'qa-seed',
        cost: '0.000002',
      },
    })
  }
}

async function upsertWalletData() {
  await prisma.usage.upsert({
    where: { id: qaUsageId },
    update: {
      userId,
      tokens: 206,
      cost: '0.000020',
      modelName: 'qa-seed-smoke',
    },
    create: {
      id: qaUsageId,
      userId,
      tokens: 206,
      cost: '0.000020',
      modelName: 'qa-seed-smoke',
    },
  })

  await prisma.tokenTransaction.upsert({
    where: { id: '44444444-4444-4444-8444-444444444444' },
    update: {
      userId,
      usageId: qaUsageId,
      type: 'CHAT_USAGE',
      amount: -206,
      balanceAfter: 2400,
      reason: 'qa_smoke_chat_usage',
      metadata: { source: 'qa-seed', route: '/wallet' },
    },
    create: {
      id: '44444444-4444-4444-8444-444444444444',
      userId,
      usageId: qaUsageId,
      type: 'CHAT_USAGE',
      amount: -206,
      balanceAfter: 2400,
      reason: 'qa_smoke_chat_usage',
      metadata: { source: 'qa-seed', route: '/wallet' },
    },
  })

  await prisma.tokenTransaction.upsert({
    where: { id: '55555555-5555-4555-8555-555555555555' },
    update: {
      userId,
      type: 'PROMOTION',
      amount: 1000,
      balanceAfter: 2606,
      reason: 'qa_seed_bonus',
      metadata: { source: 'qa-seed' },
    },
    create: {
      id: '55555555-5555-4555-8555-555555555555',
      userId,
      type: 'PROMOTION',
      amount: 1000,
      balanceAfter: 2606,
      reason: 'qa_seed_bonus',
      metadata: { source: 'qa-seed' },
    },
  })
}

async function upsertReportAndAudit() {
  await prisma.report.upsert({
    where: { id: qaReportId },
    update: {
      targetType: 'MESSAGE',
      reason: 'policy_review',
      details: 'QA seed report สำหรับตรวจ moderation queue และ audit log',
      status: 'PENDING',
      metadata: {
        source: 'qa-seed',
        expectedRoute: '/moderation',
      },
      reporterId: userId,
      characterId: qaSceneCharacterId,
      messageId: qaMessageAssistantId,
    },
    create: {
      id: qaReportId,
      targetType: 'MESSAGE',
      reason: 'policy_review',
      details: 'QA seed report สำหรับตรวจ moderation queue และ audit log',
      status: 'PENDING',
      metadata: {
        source: 'qa-seed',
        expectedRoute: '/moderation',
      },
      reporterId: userId,
      characterId: qaSceneCharacterId,
      messageId: qaMessageAssistantId,
    },
  })

  await prisma.adminAuditLog.upsert({
    where: { id: qaAuditId },
    update: {
      action: 'REPORT_STATUS_UPDATE',
      targetType: 'REPORT',
      targetId: qaReportId,
      actorUserId: adminUserId,
      metadata: {
        source: 'qa-seed',
        note: 'ตัวอย่าง audit log ก่อน deploy',
      },
    },
    create: {
      id: qaAuditId,
      action: 'REPORT_STATUS_UPDATE',
      targetType: 'REPORT',
      targetId: qaReportId,
      actorUserId: adminUserId,
      metadata: {
        source: 'qa-seed',
        note: 'ตัวอย่าง audit log ก่อน deploy',
      },
    },
  })
}

async function main() {
  console.log('QA seed: กำลังเตรียมผู้ใช้ ตัวละคร แชท กระเป๋าโทเคน และรายงาน...')
  await cleanupPreviousBrowserSmokeArtifacts()
  await upsertUsers()
  await upsertCharacters()
  await upsertChat()
  await upsertMenuActionChats()
  await upsertWalletData()
  await upsertReportAndAudit()

  const [characterCount, chatCount, reportCount, transactionCount] = await Promise.all([
    prisma.character.count({ where: { sourceKey: { startsWith: 'qa-' } } }),
    prisma.chat.count({ where: { id: { in: qaChatIds }, deletedAt: null } }),
    prisma.report.count({ where: { metadata: { path: ['source'], equals: 'qa-seed' } } }),
    prisma.tokenTransaction.count({ where: { metadata: { path: ['source'], equals: 'qa-seed' } } }),
  ])

  console.log(`QA seed พร้อมแล้ว: ตัวละคร QA ${characterCount} รายการ, แชท QA ${chatCount} ห้อง, รายงาน ${reportCount} รายการ, ธุรกรรม ${transactionCount} รายการ`)
}

try {
  await main()
} catch (error) {
  console.error('QA seed ไม่สำเร็จ:')
  console.error(error)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
