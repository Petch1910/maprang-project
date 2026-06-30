import type { Character, ChatMessage } from './api'
import { displayMessageContent } from './characterDisplay'

type GreetingOptions = {
  relationshipSeedName?: string | null
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

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}
