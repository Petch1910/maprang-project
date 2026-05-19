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
  'disliked',
  'rival',
  'bickering-rival',
  'acquaintance',
  'friend',
  'close-friend',
  'ride-or-die',
  'partner',
  'toxic-partner',
  'lover',
  'life-partner',
  'spouse',
  'toxic-spouse',
  'soulmate',
  'ex',
  'crush',
  'friend-crush',
  'dating-trial',
  'talking-stage',
  'guarded',
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
  ศัตรู: 'enemy',
  'ไม่ถูกกัน': 'disliked',
  คู่แข่ง: 'rival',
  คู่ปรับ: 'rival',
  คู่กัด: 'bickering-rival',
  คนรู้จัก: 'acquaintance',
  เพื่อน: 'friend',
  เพื่อนสนิท: 'close-friend',
  เพื่อนตาย: 'ride-or-die',
  แอบชอบ: 'crush',
  แอบรัก: 'crush',
  เพื่อนสนิทคิดไม่ซื่อ: 'friend-crush',
  ลองคุย: 'dating-trial',
  คนคุย: 'talking-stage',
  แฟน: 'partner',
  'แฟน toxic': 'toxic-partner',
  แฟนtoxic: 'toxic-partner',
  คู่รัก: 'lover',
  คนรัก: 'lover',
  คู่ชีวิต: 'life-partner',
  คู่ครอง: 'spouse',
  'คู่ครอง toxic': 'toxic-spouse',
  คู่ครองtoxic: 'toxic-spouse',
  คู่แท้: 'soulmate',
}

const romanticEngineTags = new Set([
  'crush',
  'friend-crush',
  'dating-trial',
  'talking-stage',
  'partner',
  'toxic-partner',
  'lover',
  'life-partner',
  'spouse',
  'toxic-spouse',
  'soulmate',
])

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
  const hasRomanticSeed = analysis.engine.some((tag) => romanticEngineTags.has(tag))

  if (analysis.engine.length > 5) {
    analysis.issues.push({
      level: 'warning',
      message: 'แท็กระบบมากกว่า 5 แท็กอาจทำให้บุคลิกและความสัมพันธ์ควบคุมยากขึ้น',
    })
  }

  if (analysis.safety.includes('family') && (analysis.discovery.includes('nc') || hasRomanticSeed)) {
    analysis.issues.push({
      level: strictConflictLevel,
      message: adultMode
        ? `family + nc/romance เป็นโหมดผู้ใหญ่ที่มีความเสี่ยงด้านบริบท ${adultSimulationDisclosure}`
        : 'family ขัดแย้งกับแท็ก romance ให้ใช้ no-romance หรือเอาแท็กเสี่ยงออกก่อนเผยแพร่',
    })
  }

  if (analysis.safety.includes('no-romance') && hasRomanticSeed) {
    analysis.issues.push({
      level: strictConflictLevel,
      message: adultMode
        ? `no-romance + romance ส่งสัญญาณความสัมพันธ์คนละทาง ${adultSimulationDisclosure} พฤติกรรมบอทอาจแกว่งถ้า prompt ไม่ชัด`
        : 'no-romance ขัดแย้งกับแท็ก romance และจะบล็อกการพัฒนาความโรแมนติก',
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
