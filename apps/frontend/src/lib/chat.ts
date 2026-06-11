import type { Character, ChatMessage } from './api'
import { displayMessageContent } from './characterDisplay'

export function createGreeting(character: Character): ChatMessage {
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
