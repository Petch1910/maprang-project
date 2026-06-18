export type ResponseDepth = 'quick' | 'balanced' | 'deep' | 'cinematic'

export type ResponseQualityInput = {
  reply: string
  userMessage?: string | null
  responseDepth?: string | null
  replyProfile?: string | null
  activeScene?: boolean
}

export type ResponseQualityMetadata = {
  responseDepth: ResponseDepth
  minRecommendedChars: number
  charCount: number
  lineCount: number
  hasAction: boolean
  hasEmotion: boolean
  hasNextHook: boolean
  hasContextReference: boolean
  likelyTooShort: boolean
  score: number
  notes: string[]
}

const depthMinChars: Record<ResponseDepth, number> = {
  quick: 180,
  balanced: 360,
  deep: 620,
  cinematic: 760,
}

const depthLabels: Record<ResponseDepth, string> = {
  quick: 'กระชับ',
  balanced: 'สมดุล',
  deep: 'ละเอียด',
  cinematic: 'cinematic',
}

const actionHints = [
  'เดิน',
  'ยิ้ม',
  'มอง',
  'จับ',
  'แตะ',
  'ก้ม',
  'เงย',
  'หัน',
  'ขยับ',
  'ถอนหายใจ',
  'กระซิบ',
  'หัวเราะ',
  '*',
]

const emotionHints = [
  'รู้สึก',
  'ใจ',
  'สั่น',
  'เขิน',
  'กลัว',
  'โกรธ',
  'เหงา',
  'อบอุ่น',
  'เจ็บ',
  'หวั่น',
  'คิดถึง',
  'น้อยใจ',
]

const contextHints = [
  'เมื่อกี้',
  'ก่อนหน้านี้',
  'เมื่อคืน',
  'เรื่องนั้น',
  'คำพูดของ',
  'จำได้',
  'สถานะ',
  'ความสัมพันธ์',
  'ฉาก',
]

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function normalizeResponseDepth(value?: string | null, replyProfile?: string | null, activeScene = false): ResponseDepth {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'quick' || normalized === 'balanced' || normalized === 'deep' || normalized === 'cinematic') {
    return normalized
  }

  const profile = replyProfile?.trim().toLowerCase()
  if (profile === 'quick') return 'quick'
  if (profile === 'deep_roleplay') return 'deep'
  if (profile === 'cinematic_scene' || activeScene) return 'cinematic'
  return 'balanced'
}

export function buildResponseQualityPromptBlock(input: {
  responseDepth?: string | null
  replyProfile?: string | null
  activeScene?: boolean
}) {
  const depth = normalizeResponseDepth(input.responseDepth, input.replyProfile, input.activeScene)
  const minChars = depthMinChars[depth]
  const lines = [
    'ตัวควบคุมคุณภาพคำตอบ:',
    `- ระดับคำตอบ: ${depth} (${depthLabels[depth]})`,
    `- ความยาวแนะนำขั้นต่ำ: ประมาณ ${minChars} ตัวอักษร เว้นแต่ผู้ใช้ขอคำตอบสั้นโดยตรง`,
    '- คำตอบ roleplay ต้องมีอย่างน้อย: การกระทำหรือบรรยากาศ, อารมณ์ภายใน, การอ้างอิงบริบทล่าสุด, และ hook ให้ผู้เล่นตอบต่อ',
    '- ห้ามตอบตื้นแบบประโยคเดียวเมื่อกำลังเล่นบทบาทหรืออยู่ในฉากสำคัญ',
  ]

  if (depth === 'cinematic') {
    lines.push('- โหมด cinematic ให้เน้นจังหวะฉาก ภาพ บรรยากาศ และแรงกดดันทางอารมณ์มากกว่าการสรุป')
  }

  if (depth === 'deep') {
    lines.push('- โหมดละเอียดให้เพิ่ม subtext ความลังเล ผลของความสัมพันธ์ และรายละเอียดที่ต่อเนื่องจากเทิร์นก่อน')
  }

  if (depth === 'quick') {
    lines.push('- โหมดกระชับยังต้องคงคาแรกเตอร์และมี hook สั้น ๆ ไม่ใช่คำตอบทั่วไป')
  }

  return lines.join('\n')
}

export function analyzeResponseQuality(input: ResponseQualityInput): ResponseQualityMetadata {
  const reply = input.reply.trim()
  const depth = normalizeResponseDepth(input.responseDepth, input.replyProfile, input.activeScene)
  const minRecommendedChars = depthMinChars[depth]
  const charCount = reply.length
  const lineCount = reply ? reply.split(/\r?\n/).filter((line) => line.trim()).length : 0
  const hasAction = actionHints.some((hint) => reply.includes(hint))
  const hasEmotion = emotionHints.some((hint) => reply.includes(hint))
  const hasContextReference = contextHints.some((hint) => reply.includes(hint))
  const hasNextHook = /[?？]|\.\.\.|…|ไหม|หรือ|เธอจะ|คุณจะ|อยาก/.test(reply)
  const likelyTooShort = charCount < minRecommendedChars
  const notes: string[] = []

  if (likelyTooShort) notes.push(`สั้นกว่าความยาวแนะนำสำหรับระดับ ${depth}`)
  if (!hasAction) notes.push('ยังไม่เห็นการกระทำหรือบรรยากาศชัดเจน')
  if (!hasEmotion) notes.push('ยังไม่เห็นอารมณ์ภายในชัดเจน')
  if (!hasContextReference) notes.push('ยังไม่อ้างอิงบริบทหรือความต่อเนื่องล่าสุด')
  if (!hasNextHook) notes.push('ยังไม่มี hook ให้ผู้เล่นตอบต่อ')

  const score = clampScore(
    100 -
      (likelyTooShort ? 28 : 0) -
      (hasAction ? 0 : 16) -
      (hasEmotion ? 0 : 16) -
      (hasContextReference ? 0 : 14) -
      (hasNextHook ? 0 : 12),
  )

  return {
    responseDepth: depth,
    minRecommendedChars,
    charCount,
    lineCount,
    hasAction,
    hasEmotion,
    hasNextHook,
    hasContextReference,
    likelyTooShort,
    score,
    notes,
  }
}
