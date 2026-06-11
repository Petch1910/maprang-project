import type { Character, ChatMessage } from './api'
import { displayMessageContent } from './characterDisplay'

export const fallbackCharacter: Character = {
  id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  name: 'น้องมะปราง',
  avatarUrl: null,
  tagline: 'ผู้ช่วย AI ภาษาไทยที่คุยง่ายและช่วยคิดงานได้จริง',
  description: 'AI ผู้ช่วยภาษาไทยที่พร้อมดูแลคุณทุกเรื่อง',
  biography: null,
  scenario: null,
  systemPrompt:
    'คุณคือมะปราง AI ผู้ช่วยภาษาไทยที่คุยง่าย ใจดี ช่วยคิดงาน สรุปเนื้อหา และตอบอย่างสุภาพเป็นธรรมชาติ',
  compactPrompt: 'มะปราง: ผู้ช่วย AI ภาษาไทย โทนอ่อนโยน สุภาพ ตอบชัด ใช้งานได้จริง',
  characterAnchor: null,
  constraints: null,
  greeting: 'สวัสดีค่ะ วันนี้มะปรางมีอะไรให้ช่วยไหมคะ?',
  status: 'PUBLISHED',
  visibility: 'PUBLIC',
  qualityScore: 90,
  promptVersion: 1,
  tags: ['thai', 'assistant', 'friendly'],
  chatCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

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
