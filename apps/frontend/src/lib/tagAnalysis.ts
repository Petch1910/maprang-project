export type TagIssue = {
  level: 'warning' | 'danger'
  message: string
}

export type TagAnalysis = {
  discovery: string[]
  engine: string[]
  safety: string[]
  unknown: string[]
  issues: TagIssue[]
}

const discoveryTags = new Set([
  'thai',
  'assistant',
  'roleplay',
  'original',
  'anime',
  'manga',
  'game',
  'fantasy',
  'romance',
  'drama',
  'slice-of-life',
  'pg',
  'nc',
])

const engineTags = new Set([
  'enemy',
  'rival',
  'friend',
  'close-friend',
  'lover',
  'ex',
  'crush',
  'tsundere',
  'kuudere',
  'cold',
  'shy',
  'cheerful',
  'loyal',
  'hard-to-get',
  'golden',
  'mafia',
  'doctor',
  'teacher',
  'knight',
  'vampire',
])

const safetyTags = new Set(['family', 'no-romance', 'red-flag', 'yellow-flag', 'green-flag'])

const aliases: Record<string, string> = {
  ศัตรู: 'enemy',
  คู่แข่ง: 'rival',
  เพื่อน: 'friend',
  เพื่อนสนิท: 'close-friend',
  แฟน: 'lover',
  แฟนเก่า: 'ex',
  แอบรัก: 'crush',
  ครอบครัว: 'family',
  รักต้องห้าม: 'no-romance',
  ซึนเดเระ: 'tsundere',
  คุเดเระ: 'kuudere',
  เย็นชา: 'cold',
  ขี้อาย: 'shy',
  ร่าเริง: 'cheerful',
  ตัวละครจีบยาก: 'hard-to-get',
  หมาโกลเด้น: 'golden',
  มาเฟีย: 'mafia',
  หมอ: 'doctor',
  ครู: 'teacher',
  อัศวิน: 'knight',
  แวมไพร์: 'vampire',
  ธงแดง: 'red-flag',
  ธงเหลือง: 'yellow-flag',
  ธงเขียว: 'green-flag',
}

export function parseTags(value: string | string[]) {
  const tags = Array.isArray(value) ? value : value.split(',')
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

function normalize(tag: string) {
  const value = tag.trim().toLowerCase()
  return aliases[value] ?? value
}

export function analyzeTags(value: string | string[]): TagAnalysis {
  const normalized = parseTags(value).map(normalize)
  const analysis: TagAnalysis = {
    discovery: [],
    engine: [],
    safety: [],
    unknown: [],
    issues: [],
  }

  for (const tag of normalized) {
    if (engineTags.has(tag)) analysis.engine.push(tag)
    else if (safetyTags.has(tag)) analysis.safety.push(tag)
    else if (discoveryTags.has(tag)) analysis.discovery.push(tag)
    else analysis.unknown.push(tag)
  }

  if (analysis.engine.length > 5) {
    analysis.issues.push({ level: 'warning', message: 'Engine tags มากกว่า 5 ตัว อาจทำให้บุคลิกแกว่งหรือคุม progression ยาก' })
  }

  if (analysis.safety.includes('family') && (analysis.discovery.includes('nc') || analysis.engine.includes('lover'))) {
    analysis.issues.push({ level: 'danger', message: 'family ขัดกับ nc/lover ควรเปลี่ยนเป็น no-romance หรือถอด tag เสี่ยงออก' })
  }

  if (analysis.safety.includes('no-romance') && (analysis.engine.includes('lover') || analysis.engine.includes('crush'))) {
    analysis.issues.push({ level: 'danger', message: 'no-romance ขัดกับ lover/crush ระบบจะบล็อก romance escalation' })
  }

  if (analysis.engine.includes('hard-to-get') && analysis.engine.includes('golden')) {
    analysis.issues.push({ level: 'warning', message: 'hard-to-get + golden ให้สัญญาณตรงข้ามกัน ควรเลือกว่าต้องการ progression ช้าหรือเข้าหาง่าย' })
  }

  if (analysis.safety.includes('red-flag') && analysis.safety.includes('green-flag')) {
    analysis.issues.push({ level: 'warning', message: 'red-flag + green-flag อาจทำให้ safety tone สับสน ควรใช้ yellow-flag แทนถ้าต้องการกลาง ๆ' })
  }

  return analysis
}
