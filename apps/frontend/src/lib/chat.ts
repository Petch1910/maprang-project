import type { Character, ChatMessage, ChatRuntimeState } from './api'
import { displayMessageContent } from './characterDisplay'

type GreetingOptions = {
  relationshipSeedName?: string | null
}

export type OpeningChoice = {
  label: string
  value: string
  tone: 'neutral' | 'guarded' | 'warm' | 'direct'
}

function compact(value?: string | null, maxLength = 360) {
  const normalized = displayMessageContent(value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function openingSceneContent(character: Character, options: GreetingOptions) {
  const greeting = compact(character.greeting, 520)
  const scenario = compact(character.scenario, 420)
  const summary = compact(character.description || character.tagline, 320)
  const biography = compact(character.biography, 320)
  const relationship = compact(options.relationshipSeedName ? `จุดเริ่มต้นความสัมพันธ์: ${options.relationshipSeedName}` : '', 180)
  const fallback = `${character.name} เงยหน้าขึ้นมองคุณช้า ๆ เหมือนบทสนทนานี้เริ่มต้นก่อนที่ใครสักคนจะพูดออกมา`

  return [greeting || fallback, scenario ? `ฉากเริ่ม: ${scenario}` : '', relationship, summary ? `แกนตัวละคร: ${summary}` : '', biography ? `พื้นหลังสำคัญ: ${biography}` : '']
    .filter(Boolean)
    .filter((item, index, all) => all.findIndex((candidate) => candidate === item) === index)
    .slice(0, 4)
    .join('\n\n')
}

export function createGreeting(sourceCharacter: Character, options: GreetingOptions = {}): ChatMessage {
  const character = { ...sourceCharacter, greeting: openingSceneContent(sourceCharacter, options) }

  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    content: displayMessageContent(character.greeting || 'สวัสดีค่ะ มะปรางพร้อมช่วยแล้วนะคะ'),
  }
}

export function buildOpeningChoices(character: Character, runtimeState?: ChatRuntimeState | null): OpeningChoice[] {
  const relationship = runtimeState?.relationshipState
  const tone = relationship?.tone?.toLowerCase() || ''
  const status = relationship?.status?.toLowerCase() || ''
  const scene = compact(character.scenario, 80) || 'สถานการณ์ตรงหน้า'

  if (tone === 'hostile' || status.includes('enemy') || status.includes('rival')) {
    return [
      {
        label: 'ทักแบบไม่ยอมถอย',
        value: `ฉันสบตา${character.name}ตรง ๆ แล้วพูดด้วยน้ำเสียงนิ่งว่า เราควรคุยกันให้ชัดก่อนที่${scene}จะบานปลายไปกว่านี้`,
        tone: 'direct',
      },
      {
        label: 'จับพิรุธเงียบ ๆ',
        value: `ฉันยังไม่รีบตอบโต้ แค่สังเกตท่าที น้ำเสียง และช่องว่างระหว่างคำพูดของ${character.name}ก่อน`,
        tone: 'guarded',
      },
      {
        label: 'ถามแรงแต่ไม่หยาบ',
        value: 'ฉันถามกลับไปตรง ๆ ว่า เธอต้องการทดสอบฉัน หรือแค่ไม่อยากยอมรับว่าเรายังมีเรื่องต้องคุยกัน',
        tone: 'direct',
      },
      {
        label: 'เว้นระยะให้เริ่มก่อน',
        value: `ฉันถอยไปครึ่งก้าวแล้วรอให้${character.name}เป็นฝ่ายเลือกว่าจะเริ่มบทสนทนานี้ด้วยความจริงหรือการป้องกันตัว`,
        tone: 'guarded',
      },
    ]
  }

  if (tone === 'warm' || status.includes('lover') || status.includes('partner') || status.includes('friend')) {
    return [
      {
        label: 'เข้าใกล้อย่างอ่อนโยน',
        value: `ฉันขยับเข้าใกล้${character.name}อย่างไม่เร่งรัด แล้วถามเบา ๆ ว่า วันนี้เธออยากให้ฉันเริ่มจากตรงไหนดี`,
        tone: 'warm',
      },
      {
        label: 'ชวนเล่าความรู้สึก',
        value: `ฉันนั่งลงข้าง ๆ และเปิดพื้นที่ให้${character.name}เล่าความรู้สึกของตัวเอง โดยไม่ตัดสินหรือเร่งคำตอบ`,
        tone: 'warm',
      },
      {
        label: 'เริ่มจากเรื่องเล็ก',
        value: `ฉันเริ่มจากคำถามง่าย ๆ เกี่ยวกับ${scene} เพื่อให้บรรยากาศผ่อนลงก่อนค่อยขยับเข้าเรื่องลึก`,
        tone: 'neutral',
      },
      {
        label: 'ให้เธอนำจังหวะ',
        value: `ฉันยิ้มบาง ๆ แล้วปล่อยให้${character.name}เลือกจังหวะของบทสนทนา เพราะครั้งนี้ฉันอยากฟังมากกว่าควบคุม`,
        tone: 'warm',
      },
    ]
  }

  return [
    {
      label: 'เดินเข้าไปทัก',
      value: `ฉันเดินเข้าไปใกล้${character.name}ขึ้นเล็กน้อย แล้วเริ่มทักด้วยน้ำเสียงที่ไม่เร่งรัด`,
      tone: 'neutral',
    },
    {
      label: 'ถามเรื่องสถานที่',
      value: `ที่นี่ดูมีเรื่องราวมากกว่าที่เห็นนะ... ${character.name}มาที่นี่บ่อยเหรอ?`,
      tone: 'neutral',
    },
    {
      label: 'สังเกตท่าที',
      value: `ฉันยังไม่พูดทันที แค่สังเกตสีหน้าและบรรยากาศรอบตัว${character.name}ก่อน`,
      tone: 'guarded',
    },
    {
      label: 'ให้เธอเริ่มก่อน',
      value: `ฉันรอให้${character.name}เป็นฝ่ายพูดก่อน เพื่อดูว่าเธออยากเปิดบทสนทนายังไง`,
      tone: 'warm',
    },
  ]
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
