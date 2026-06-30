import { safeGetStorageItem, safeRemoveStorageItem, safeSetStorageItem, type SafeStorageLike } from './safeStorage'

export type CharacterDraftFields = {
  name: string
  tagline: string
  description: string
  biography: string
  scenario: string
  systemPrompt: string
  compactPrompt: string
  characterAnchor: string
  constraints: string
  greeting: string
  tags: string
}

export type CharacterDraftFormFields = CharacterDraftFields & {
  avatarUrl: string
}

export type CharacterDraftAvatarSource = 'none' | 'manual' | 'placeholder' | 'provider'

export type CreatorStoredDraft = {
  form?: Partial<CharacterDraftFormFields>
  creatorBrief?: string
  avatarSource?: CharacterDraftAvatarSource
  coverImageUrl?: string
  coverImageSource?: CharacterDraftAvatarSource
  hasImageDraft?: boolean
  hasCoverDraft?: boolean
  hasPreviewRun?: boolean
  lastImageSignal?: string
  generatedImages?: { url: string; source: CharacterDraftAvatarSource }[]
  imageStyle?: string
  updatedAt?: number
}

export const CREATOR_DRAFT_STORAGE_KEY = 'maprang:creator-draft:v1'

type CharacterDraftSource = {
  imageName?: string
  imagePrompt?: string
  imageUrl?: string
}

type DraftArchetype = {
  name: string
  mood: string
  visualHook: string
  relationshipHook: string
  scenarioHook: string
  greeting: string
  tags: string[]
}

export type DraftConversationStarter = {
  label: string
  value: string
}

const archetypes: DraftArchetype[] = [
  {
    name: 'ไอริส | IRIS',
    mood: 'นิ่ง สุภาพ แต่แอบมีมุมยั่วเย้าในคำพูด',
    visualHook: 'หญิงสาวผมสีอ่อน ดวงตาใส และรอยยิ้มที่ดูเหมือนรู้ความลับมากกว่าที่พูดออกมา',
    relationshipHook: 'เริ่มจากความคุ้นเคยแบบระวังตัว แล้วค่อย ๆ เปิดช่องให้ความไว้ใจและแรงดึงดูดเติบโต',
    scenarioHook: 'ตรอกเมืองเก่าหลังฝนตก แสงแดดลอดผ่านหลังคาไม้ และเสียงผู้คนเบาบางจนเหลือแค่บทสนทนาของทั้งสองคน',
    greeting: 'มองฉันนานขนาดนั้น... กำลังพยายามอ่านใจฉันอยู่ หรืออยากให้ฉันอ่านใจเธอก่อนดี?',
    tags: ['anime', 'romance', 'slow-burn', 'trust-building', 'green-flag'],
  },
  {
    name: 'เรน่า | RENA',
    mood: 'มั่นใจ ฉลาด และชอบทดสอบขอบเขตทางอารมณ์ของอีกฝ่าย',
    visualHook: 'หญิงสาวลุคแฟชั่นเมืองใหญ่ สีหน้าสงบแต่สายตาคมเหมือนกำลังประเมินทุกคำตอบ',
    relationshipHook: 'เหมาะกับเส้นทางคู่แข่งที่ค่อย ๆ เปลี่ยนเป็นความไว้ใจแบบมีแรงปะทะ',
    scenarioHook: 'ห้องรับรองส่วนตัวในงานกลางคืนที่เสียงเพลงดังอยู่ไกล ๆ ขณะที่บทสนทนากลายเป็นเกมวัดใจ',
    greeting: 'ถ้าอยากคุยกับฉันจริง ๆ ก็อย่าตอบแบบปลอดภัยเกินไปสิ น่าเบื่อออกนะ',
    tags: ['original', 'rival', 'hard-to-get', 'drama', 'yellow-flag'],
  },
  {
    name: 'มิกะ | MIKA',
    mood: 'อบอุ่น ขี้เล่น และอ่านบรรยากาศเก่ง',
    visualHook: 'ตัวละครโทนอ่อนที่ให้ความรู้สึกเป็นมิตร เหมาะกับบทสนทนาที่เริ่มธรรมดาแต่ค่อย ๆ ลึกขึ้น',
    relationshipHook: 'เหมาะกับความสัมพันธ์เพื่อนสนิทที่มีพื้นที่ปลอดภัยให้เล่าความจริง',
    scenarioHook: 'ร้านกาแฟเงียบ ๆ ช่วงบ่ายแก่ ๆ โต๊ะริมหน้าต่าง และโน้ตเล็ก ๆ ที่เธอเขียนไว้ให้ก่อนเริ่มคุย',
    greeting: 'วันนี้หน้าตาเหมือนมีเรื่องเต็มหัวเลยนะ เอามาวางตรงนี้ก่อนก็ได้ ฉันฟังอยู่',
    tags: ['slice-of-life', 'close-friend', 'comfort', 'trust-building', 'green-flag'],
  },
  {
    name: 'เซลีน | SELENE',
    mood: 'ลึกลับ สุขุม และพูดน้อยแต่ทุกประโยคมีน้ำหนัก',
    visualHook: 'หญิงสาวบรรยากาศกลางคืน ดวงตาเหมือนเก็บเรื่องราวเก่า ๆ ไว้มากกว่าที่ใครคาด',
    relationshipHook: 'เหมาะกับ slow-burn ที่ต้องใช้ความจริงใจเพื่อปลดล็อกฉากสำคัญ',
    scenarioHook: 'ระเบียงโรงแรมเก่าที่มองเห็นไฟเมือง เธอถือแก้วน้ำเย็นไว้แต่ยังไม่ยอมบอกว่ากำลังรอใคร',
    greeting: 'เธอมาช้ากว่าที่ฉันคิด แต่ก็ยังมา... งั้นคืนนี้ลองทำให้ฉันเชื่อหน่อยว่าเธอไม่ได้มาเพราะความบังเอิญ',
    tags: ['drama', 'slow-burn', 'mystery', 'hard-to-get', 'red-flag'],
  },
  {
    name: 'อาเรีย | ARIA',
    mood: 'สง่างาม ใจดี แต่มีมาตรฐานสูงกับคนที่เข้ามาใกล้',
    visualHook: 'ตัวละครลุคคุณหนูหรือแฟนตาซีเมืองเก่า ท่าทีเรียบร้อยแต่ไม่ยอมให้ใครข้ามเส้นง่าย ๆ',
    relationshipHook: 'เริ่มด้วยระยะห่างทางชนชั้นหรือบทบาท แล้วค่อย ๆ เปิดใจเมื่อผู้เล่นแสดงความจริงใจ',
    scenarioHook: 'สวนหลังคฤหาสน์ในเย็นวันหนึ่ง เธออนุญาตให้คุณเดินข้าง ๆ ได้เพียงสิบห้านาที',
    greeting: 'ฉันให้เวลาเธอสิบห้านาที เลือกคำถามแรกให้ดี เพราะฉันจำคำตอบแรกของคนเสมอ',
    tags: ['fantasy', 'mentor', 'slow-burn', 'trust-building', 'green-flag'],
  },
]

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

function pickArchetype(source: CharacterDraftSource) {
  const signal =
    [source.imageName, source.imagePrompt, source.imageUrl].filter(Boolean).join('|') ||
    'original-thai-roleplay-character-slow-burn'
  return archetypes[hashText(signal) % archetypes.length] ?? archetypes[0]
}

function shortCharacterName(name: string) {
  return name.split('|')[0]?.trim() || name.trim() || 'ตัวละคร'
}

function normalizedDraftTags(tags: string) {
  return tags
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}

export function buildDraftConversationStarters(
  draft: Pick<CharacterDraftFields, 'name' | 'tagline' | 'scenario' | 'greeting' | 'tags'>,
): DraftConversationStarter[] {
  const name = shortCharacterName(draft.name)
  const tags = normalizedDraftTags(draft.tags)
  const isHostile = tags.some((tag) => ['rival', 'enemy', 'red-flag', 'toxic', 'drama', 'hard-to-get'].includes(tag))
  const isWarm = tags.some((tag) => ['green-flag', 'comfort', 'close-friend', 'trust-building', 'romance'].includes(tag))
  const scene = draft.scenario.trim()
  const tagline = draft.tagline.trim()
  const greeting = draft.greeting.trim()

  if (isHostile) {
    return [
      {
        label: 'เปิดด้วยแรงปะทะ',
        value: `ฉันมอง${name}ตรง ๆ แล้วพูดให้ชัดว่า “เราคงต้องคุยกันให้รู้เรื่อง”`,
      },
      {
        label: 'จับพิรุธ',
        value: `ฉันสังเกตน้ำเสียงของ${name} ก่อนถามว่า “เธอกำลังซ่อนอะไรจากฉันอยู่หรือเปล่า”`,
      },
      {
        label: 'เว้นระยะ',
        value: scene ? `ฉันถอยไปครึ่งก้าวในฉากนี้ แล้วปล่อยให้${name}เป็นฝ่ายเลือกว่าจะเริ่มยังไง` : `ฉันถอยไปครึ่งก้าว แล้วรอดูว่า${name}จะเปิดเกมก่อนหรือไม่`,
      },
      {
        label: 'ย้อนคำทัก',
        value: greeting ? `ฉันฟังคำพูดแรกของ${name}แล้วตอบกลับอย่างใจเย็นว่า “ทำไมถึงพูดแบบนั้น”` : `ฉันไม่รีบตอบรับหรือปฏิเสธ แค่รอให้${name}เผยท่าทีจริงออกมา`,
      },
    ]
  }

  if (isWarm) {
    return [
      {
        label: 'เริ่มแบบอ่อนโยน',
        value: `ฉันยิ้มบาง ๆ ให้${name} แล้วถามว่า “วันนี้อยากให้ฉันฟังเรื่องอะไรก่อนดี”`,
      },
      {
        label: 'ชวนเล่า',
        value: tagline ? `ฉันนั่งลงใกล้พอประมาณ แล้วชวน${name}เล่าเรื่องที่ซ่อนอยู่หลัง “${tagline}”` : `ฉันชวน${name}เล่าเรื่องที่ไม่จำเป็นต้องรีบพูดให้จบในครั้งเดียว`,
      },
      {
        label: 'ค่อย ๆ เข้าใกล้',
        value: scene ? `ฉันปล่อยให้บรรยากาศของฉากนำไปก่อน แล้วค่อยถาม${name}ด้วยน้ำเสียงที่ไม่เร่งรัด` : `ฉันค่อย ๆ เข้าใกล้ด้วยคำถามง่าย ๆ ที่เปิดพื้นที่ให้${name}ตอบตามจังหวะของตัวเอง`,
      },
      {
        label: 'ให้เธอนำจังหวะ',
        value: `ฉันบอก${name}ว่า “ไม่ต้องรีบก็ได้ ฉันอยากรู้ว่าเธออยากเริ่มจากตรงไหน”`,
      },
    ]
  }

  return [
    {
      label: 'เริ่มจากฉาก',
      value: scene ? `ฉันมองไปรอบ ๆ แล้วเริ่มบทสนทนาจากสิ่งที่เกิดขึ้นในฉากนี้` : `ฉันมองบรรยากาศรอบตัว แล้วเริ่มคุยด้วยคำถามที่ไม่กดดัน`,
    },
    {
      label: 'ถามตรงประเด็น',
      value: `ฉันถาม${name}อย่างสุภาพว่า “มีเรื่องอะไรที่เธออยากให้ฉันรู้ก่อนหรือเปล่า”`,
    },
    {
      label: 'สังเกตท่าที',
      value: `ฉันสังเกตสีหน้าและท่าทีของ${name}ก่อนเลือกคำพูดแรกอย่างระวัง`,
    },
    {
      label: 'ต่อจากคำทัก',
      value: greeting ? `ฉันรับคำทักของ${name} แล้วถามต่อในจังหวะที่ยังเปิดพื้นที่ให้เธอเลือกทาง` : `ฉันรอให้${name}เริ่มก่อน แล้วค่อยตอบรับตามบรรยากาศที่เกิดขึ้น`,
    },
  ]
}

export function buildGeneratedAvatarDataUrl(source: CharacterDraftSource) {
  const signal =
    [source.imageName, source.imagePrompt, source.imageUrl].filter(Boolean).join('|') ||
    'original-thai-roleplay-character-generated-avatar'
  const hash = hashText(signal)
  const palettes = [
    ['#fb7185', '#f97316', '#111827'],
    ['#38bdf8', '#8b5cf6', '#111827'],
    ['#34d399', '#14b8a6', '#0f172a'],
    ['#f59e0b', '#ec4899', '#111827'],
    ['#a78bfa', '#6366f1', '#111827'],
  ]
  const palette = palettes[hash % palettes.length] ?? palettes[0]
  const accent = palette[0]
  const secondary = palette[1]
  const base = palette[2]
  const tilt = (hash % 18) - 9
  const glowX = 180 + (hash % 180)
  const glowY = 150 + ((hash >> 3) % 220)
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 1024">
      <defs>
        <radialGradient id="glow" cx="${glowX}" cy="${glowY}" r="560" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.8"/>
          <stop offset="0.48" stop-color="${secondary}" stop-opacity="0.42"/>
          <stop offset="1" stop-color="${base}" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="card" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#ffffff" stop-opacity="0.24"/>
          <stop offset="1" stop-color="#ffffff" stop-opacity="0.04"/>
        </linearGradient>
        <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18"/>
        </filter>
      </defs>
      <rect width="768" height="1024" fill="url(#glow)"/>
      <circle cx="610" cy="120" r="180" fill="#ffffff" opacity="0.10" filter="url(#soft)"/>
      <circle cx="120" cy="840" r="240" fill="${accent}" opacity="0.22" filter="url(#soft)"/>
      <g transform="translate(384 476) rotate(${tilt})">
        <ellipse cx="0" cy="-120" rx="146" ry="174" fill="#f8fafc" opacity="0.88"/>
        <path d="M-210 286 C-166 86 -74 16 0 16 C74 16 166 86 210 286 Z" fill="#f8fafc" opacity="0.84"/>
        <path d="M-230 -84 C-174 -258 -42 -330 90 -284 C200 -246 254 -118 220 72 C128 0 42 -18 -44 4 C-118 22 -178 -4 -230 -84 Z" fill="#0f172a" opacity="0.72"/>
        <path d="M-188 242 C-118 180 -54 152 0 152 C54 152 118 180 188 242" fill="none" stroke="${secondary}" stroke-width="18" stroke-linecap="round" opacity="0.72"/>
      </g>
      <rect x="46" y="54" width="676" height="916" rx="42" fill="none" stroke="url(#card)" stroke-width="3"/>
      <path d="M78 826 C210 766 314 786 430 850 C522 900 614 898 694 848" fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="6" stroke-linecap="round"/>
    </svg>
  `

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

function sourceNote(source: CharacterDraftSource) {
  const raw = source.imagePrompt || source.imageName || source.imageUrl || ''
  if (!raw.trim()) return 'ภาพตัวละครที่เพิ่งสร้าง'
  const clean = raw.split(/[\\/]/).pop()?.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').trim()
  return clean || 'ภาพตัวละครที่เพิ่งสร้าง'
}

export function buildCharacterDraftFromImage(source: CharacterDraftSource): CharacterDraftFields {
  const archetype = pickArchetype(source)
  const imageCue = sourceNote(source)

  return {
    name: archetype.name,
    tagline: archetype.relationshipHook,
    description: `${archetype.visualHook} ภาพต้นทางให้โทน "${imageCue}" จึงวางคาแรกเตอร์ให้มีบรรยากาศชัดตั้งแต่แรกเห็น แต่ยังเหลือช่องว่างให้ผู้เล่นค่อย ๆ ค้นพบความจริงผ่านบทสนทนา`,
    biography: [
      `${archetype.name} เป็นตัวละครที่ดูควบคุมตัวเองได้ดี แต่จริง ๆ แล้วเก็บความรู้สึกไว้ลึกกว่าที่แสดงออก`,
      `เธอไม่เปิดใจให้ใครง่าย ๆ และจะตอบสนองต่อผู้เล่นตามความสม่ำเสมอ ความจริงใจ และวิธีเคารพขอบเขตของเธอ`,
      `อดีตของเธอมีบางเรื่องที่ยังไม่อยากเล่าในทันที ฉากสำคัญควรถูกปลดล็อกเมื่อความไว้ใจหรือแรงปะทะทางอารมณ์ไปถึงจุดที่เหมาะสม`,
    ].join('\n\n'),
    scenario: archetype.scenarioHook,
    systemPrompt: [
      `คุณคือ ${archetype.name} ตัวละครโรลเพลย์ภาษาไทยสำหรับผู้เล่นผู้ใหญ่ บุคลิกหลักคือ ${archetype.mood}`,
      `ให้คงโทนภาพรวม: ${archetype.visualHook}`,
      `รูปแบบความสัมพันธ์: ${archetype.relationshipHook}`,
      'ตอบเป็นภาษาไทยตามบุคลิกของตัวละคร ใช้รายละเอียดเชิงบรรยากาศและภาษากายพอประมาณ แต่ไม่บรรยายแทนการกระทำหรือความคิดของผู้เล่น',
      'ให้ความสัมพันธ์เติบโตแบบมีจังหวะ ไม่เร่งความสนิททันที และให้การเปลี่ยนแปลงทางอารมณ์เกิดจากสิ่งที่ผู้เล่นพูดหรือเลือกทำ',
      'ถ้าผู้เล่นถามนอกบท ให้ตอบอย่างเป็นธรรมชาติในเสียงของตัวละคร แล้วค่อยดึงกลับเข้าสถานการณ์',
    ].join('\n'),
    compactPrompt: `${archetype.name}: ${archetype.mood}. ${archetype.relationshipHook}`,
    characterAnchor: `${archetype.name} จำเป็นต้องมีความเป็นตัวเองสูง ไม่ยอมเปลี่ยนใจเพราะผู้เล่นเร่ง แต่จะเปิดเผยด้านอ่อนโยนหรืออันตรายมากขึ้นเมื่อความสัมพันธ์พัฒนา`,
    constraints: [
      'อย่าเขียนบทพูดหรือการกระทำแทนผู้เล่น',
      'รักษาขอบเขตของตัวละครและเคารพการปฏิเสธ',
      'ค่อย ๆ เพิ่มความใกล้ชิดตามบริบทความสัมพันธ์',
      'หลีกเลี่ยงการทำให้ตัวละครหลุดบุคลิกเพื่อเอาใจผู้เล่นเร็วเกินไป',
    ].join('\n'),
    greeting: archetype.greeting,
    tags: ['roleplay', 'thai', 'original', ...archetype.tags].join(', '),
  }
}

export function mergeDraftTags(currentTags: string, draftTags: string) {
  const tags = [...currentTags.split(','), ...draftTags.split(',')]
    .map((tag) => tag.trim())
    .filter(Boolean)
  return [...new Set(tags)].join(', ')
}

export function readStoredCreatorDraft(storage: SafeStorageLike): CreatorStoredDraft | null {
  try {
    const raw = safeGetStorageItem(storage, CREATOR_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CreatorStoredDraft
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

export function writeStoredCreatorDraft(storage: SafeStorageLike, draft: CreatorStoredDraft) {
  safeSetStorageItem(storage, CREATOR_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearStoredCreatorDraft(storage: SafeStorageLike) {
  safeRemoveStorageItem(storage, CREATOR_DRAFT_STORAGE_KEY)
}
