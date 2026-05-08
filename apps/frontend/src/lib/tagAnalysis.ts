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
  'comfort',
  'mystery',
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
  'slow-burn',
  'trust-building',
  'mentor',
  'hostile',
  'mafia',
  'doctor',
  'teacher',
  'knight',
  'vampire',
])

const safetyTags = new Set(['family', 'no-romance', 'red-flag', 'yellow-flag', 'green-flag'])

const aliases: Record<string, string> = {
  '18+': 'nc',
  adult: 'nc',
  mature: 'nc',
  nsfw: 'nc',
  smut: 'nc',
  spicy: 'nc',
  'คอนเทนต์ผู้ใหญ่': 'nc',
  ผู้ใหญ่: 'nc',
  ครอบครัว: 'family',
  คนในครอบครัว: 'family',
  คู่รัก: 'lover',
  แฟน: 'lover',
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

  const adultMode = analysis.discovery.includes('nc')
  const strictConflictLevel: TagIssue['level'] = adultMode ? 'warning' : 'danger'
  const adultSimulationDisclosure = 'เนื้อเรื่องนี้เป็นการจำลอง/สมมุติสำหรับผู้ใหญ่ ระบบจะปล่อยผ่านเป็นคำเตือน แต่ควรเขียนขอบเขตและสถานการณ์ให้ชัด'

  if (analysis.engine.length > 5) {
    analysis.issues.push({
      level: 'warning',
      message: 'แท็กระบบมากกว่า 5 แท็กอาจทำให้บุคลิกและความสัมพันธ์ควบคุมยากขึ้น',
    })
  }

  if (analysis.safety.includes('family') && (analysis.discovery.includes('nc') || analysis.engine.includes('lover'))) {
    analysis.issues.push({
      level: strictConflictLevel,
      message: adultMode
        ? `family + nc/lover เป็นโหมดผู้ใหญ่ที่มีความเสี่ยงด้านบริบท ${adultSimulationDisclosure}`
        : 'family ขัดแย้งกับ nc/lover ให้ใช้ no-romance หรือเอาแท็กเสี่ยงออกก่อนเผยแพร่',
    })
  }

  if (analysis.safety.includes('no-romance') && (analysis.engine.includes('lover') || analysis.engine.includes('crush'))) {
    analysis.issues.push({
      level: strictConflictLevel,
      message: adultMode
        ? `no-romance + lover/crush ส่งสัญญาณความสัมพันธ์คนละทาง ${adultSimulationDisclosure} พฤติกรรมบอทอาจแกว่งถ้า prompt ไม่ชัด`
        : 'no-romance ขัดแย้งกับ lover/crush และจะบล็อกการพัฒนาความโรแมนติก',
    })
  }

  if (analysis.engine.includes('hard-to-get') && analysis.engine.includes('golden')) {
    analysis.issues.push({
      level: 'warning',
      message: 'hard-to-get + golden ส่งสัญญาณความสัมพันธ์คนละทาง ควรเลือก tension ช้าๆ หรือความอบอุ่นเข้าถึงง่าย',
    })
  }

  if (analysis.safety.includes('red-flag') && analysis.safety.includes('green-flag')) {
    analysis.issues.push({
      level: 'warning',
      message: 'red-flag + green-flag ทำให้โทนความปลอดภัยสับสน ควรใช้ yellow-flag ถ้าต้องการทางกลาง',
    })
  }

  return analysis
}
