import type { Character } from './api'

type SummaryCharacter = Pick<Character, 'tagline' | 'description' | 'greeting'>
type DetailCharacter = Pick<Character, 'biography' | 'description' | 'tagline' | 'greeting'>

const oldMaprangSummary = /warm Thai-first AI companion/i
const oldMaprangGreeting = /^Hi, I am Maprang\. What would you like to work on together today\??$/i
const serviceSetupMessage = /backend|OPENROUTER_API_KEY/i

export function displayCharacterText(text: string) {
  const trimmed = text.trim()
  if (oldMaprangSummary.test(trimmed)) {
    return 'ผู้ช่วย AI ภาษาไทยโทนอุ่น สำหรับวางแผน เขียนงาน และคิดเรื่องยากให้ง่ายขึ้น'
  }
  if (oldMaprangGreeting.test(trimmed)) {
    return 'สวัสดี ฉันคือ Maprang วันนี้อยากให้ช่วยคิด วางแผน หรือจัดการเรื่องไหนก่อนดี?'
  }
  return text
}

export function displayCharacterSummary(
  character: SummaryCharacter,
  fallback = 'เริ่มคุย แล้วให้ระบบความสัมพันธ์ค่อย ๆ เปิดฉากตามจังหวะของเรื่อง',
) {
  return displayCharacterText(character.tagline || character.description || character.greeting || fallback)
}

export function displayCharacterDetail(
  character: DetailCharacter,
  fallback = 'เลือกสัญญาความสัมพันธ์ก่อนเริ่มเส้นทางนี้',
) {
  return displayCharacterText(character.biography || character.description || character.tagline || character.greeting || fallback)
}

export function displayMessageContent(content: string) {
  if (oldMaprangGreeting.test(content.trim())) {
    return 'สวัสดี ฉันคือ Maprang วันนี้อยากให้ช่วยคิด วางแผน หรือจัดการเรื่องไหนก่อนดี?'
  }
  if (serviceSetupMessage.test(content) && content.includes('เชื่อมต่อบริการ AI ไม่ได้')) {
    return 'เชื่อมต่อบริการ AI ไม่ได้ กรุณาตรวจว่าบริการแชทและกุญแจ AI พร้อมใช้งานแล้ว'
  }
  return content
}
