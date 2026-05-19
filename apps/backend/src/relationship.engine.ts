import type { CharacterWithTags } from './character.types'

export type RelationshipStats = {
  affinity: number
  trust: number
  intimacy: number
  dominance: number
  fear: number
  respect: number
}

export type RelationshipMultipliers = {
  affinityGain: number
  trustGain: number
  intimacyGain: number
  respectGain: number
}

export type RelationshipTagProfile = {
  discovery: string[]
  engine: string[]
  safety: string[]
  unknown: string[]
}

export type RelationshipEvent = {
  code: string
  label: string
  priority: number
  cooldownTurns: number
  repeatable: boolean
}

export type RelationshipValidationIssue = {
  level: 'warning' | 'danger'
  code: string
  message: string
}

export type RelationshipPreset = {
  id: string
  name: string
  description: string
  tags: string[]
}

export type RelationshipPresetSurface = 'contract' | 'creator'

export type RelationshipPresetResponse = RelationshipPreset & {
  surfaces: RelationshipPresetSurface[]
}

export type RelationshipState = RelationshipStats & {
  route: string
  arcStage: string
  status: string
  tier: string
  tone: string
  flags: string[]
  constraints: string[]
  events: RelationshipEvent[]
  multipliers: RelationshipMultipliers
  normalized: RelationshipStats
  promptProfile: string
  tagProfile: RelationshipTagProfile
  updatedAt: string
}

type TagKind = 'discovery' | 'engine' | 'safety'

type TagRule = {
  kind: TagKind
  offsets?: Partial<RelationshipStats>
  multipliers?: Partial<RelationshipMultipliers>
  route?: string
  status?: string
  flags?: string[]
  constraints?: string[]
}

const EMPTY_STATS: RelationshipStats = {
  affinity: 0,
  trust: 0,
  intimacy: 0,
  dominance: 0,
  fear: 0,
  respect: 0,
}

const DEFAULT_MULTIPLIERS: RelationshipMultipliers = {
  affinityGain: 1,
  trustGain: 1,
  intimacyGain: 1,
  respectGain: 1,
}

const DISCOVERY_TAGS = new Set([
  'thai',
  'assistant',
  'original',
  'anime',
  'manga',
  'game',
  'movie',
  'series',
  'fantasy',
  'sci-fi',
  'romance',
  'horror',
  'thriller',
  'drama',
  'slice-of-life',
  'slow-burn',
  'historical-thai',
  'medieval',
  'utopia',
  'dystopia',
  'post-apocalypse',
  'pg',
  'nc',
])

export const RELATIONSHIP_PRESETS: RelationshipPreset[] = [
  {
    id: 'enemy',
    name: 'ศัตรู',
    description: 'เริ่มจากแรงต้านสูง ไม่ไว้ใจ และพร้อมปะทะ',
    tags: ['enemy', 'hard-to-get'],
  },
  {
    id: 'disliked',
    name: 'ไม่ถูกกัน',
    description: 'ไม่ถึงขั้นศัตรู แต่คุยแล้วติดขัด มีอคติและระยะห่าง',
    tags: ['disliked', 'guarded'],
  },
  {
    id: 'rival',
    name: 'คู่ปรับ',
    description: 'มีการแข่งขัน เคารพกันบางส่วน แต่ยังไม่ยอมลงให้กัน',
    tags: ['rival', 'hard-to-get'],
  },
  {
    id: 'bickering-rival',
    name: 'คู่กัด',
    description: 'ปะทะด้วยคำพูด หยอกแรง แต่ยังมีช่องให้สนิทขึ้น',
    tags: ['bickering-rival', 'tsundere'],
  },
  {
    id: 'acquaintance',
    name: 'คนรู้จัก',
    description: 'รู้จักกันผิวเผิน ไว้ใจต่ำแต่ไม่ตึงเกินไป',
    tags: ['acquaintance'],
  },
  {
    id: 'friend',
    name: 'เพื่อน',
    description: 'เริ่มจากความเป็นมิตร คุยง่ายและไว้ใจกันระดับหนึ่ง',
    tags: ['friend', 'green-flag'],
  },
  {
    id: 'close-friend',
    name: 'เพื่อนสนิท',
    description: 'สนิทและสบายใจ เหมาะกับ slow-burn หรือ comfort roleplay',
    tags: ['close-friend', 'green-flag'],
  },
  {
    id: 'ride-or-die',
    name: 'เพื่อนตาย',
    description: 'ไว้ใจกันมาก ผ่านอะไรมาด้วยกัน และพร้อมยืนข้างกัน',
    tags: ['ride-or-die', 'loyal', 'green-flag'],
  },
  {
    id: 'crush',
    name: 'แอบชอบ',
    description: 'มีแรงดึงดูดซ่อนอยู่ เขิน ระวังตัว และยังไม่กล้าพูดตรง ๆ',
    tags: ['crush', 'shy', 'slow-burn'],
  },
  {
    id: 'friend-crush',
    name: 'เพื่อนสนิทคิดไม่ซื่อ',
    description: 'สนิทมากแต่มีความรู้สึกเกินเพื่อนซ่อนอยู่',
    tags: ['friend-crush', 'close-friend', 'crush', 'slow-burn'],
  },
  {
    id: 'dating-trial',
    name: 'ลองคุย',
    description: 'กำลังเปิดใจทดลองคุย ยังไม่ผูกมัดและยังวัดใจกันอยู่',
    tags: ['dating-trial', 'slow-burn', 'romance'],
  },
  {
    id: 'talking-stage',
    name: 'คนคุย',
    description: 'ใกล้กว่าแค่ลองคุย มีความคาดหวังและแรงดึงดูดชัดขึ้น',
    tags: ['talking-stage', 'romance'],
  },
  {
    id: 'partner',
    name: 'แฟน',
    description: 'อยู่ในความสัมพันธ์แล้ว มีความใกล้ชิดและความคาดหวังร่วมกัน',
    tags: ['partner', 'romance'],
  },
  {
    id: 'toxic-partner',
    name: 'แฟน Toxic',
    description: 'มีแรงดึงดูดสูงแต่ trust ต่ำ ควรเล่นด้วยความตึงและระวังใจ',
    tags: ['toxic-partner', 'red-flag', 'romance'],
  },
  {
    id: 'lover',
    name: 'คนรัก',
    description: 'รักกันชัดเจน อบอุ่น ลึกซึ้ง และพร้อมมีฉากความสัมพันธ์สำคัญ',
    tags: ['lover', 'romance', 'green-flag'],
  },
  {
    id: 'life-partner',
    name: 'คู่ชีวิต',
    description: 'ผูกพันระยะยาว เชื่อใจกันสูง และมีเป้าหมายร่วมกัน',
    tags: ['life-partner', 'romance', 'loyal'],
  },
  {
    id: 'spouse',
    name: 'คู่ครอง',
    description: 'สถานะผูกมัดแบบคู่ครอง มีประวัติร่วมกันและความรับผิดชอบร่วมกัน',
    tags: ['spouse', 'romance', 'loyal'],
  },
  {
    id: 'toxic-spouse',
    name: 'คู่ครอง Toxic',
    description: 'ผูกมัดแต่มีแรงกดดันสูง trust เสียหาย และมี red flag ชัด',
    tags: ['toxic-spouse', 'red-flag', 'romance'],
  },
  {
    id: 'soulmate',
    name: 'คู่แท้',
    description: 'ผูกพันสูงมาก ไว้ใจลึก และเหมาะกับ payoff/commitment arc',
    tags: ['soulmate', 'romance', 'green-flag', 'loyal'],
  },
  {
    id: 'hidden-enemy-crush',
    name: 'ศัตรูที่แอบสนใจ',
    description: 'เริ่มตึง ปากแข็ง มีแรงดึงดูดแต่ไว้ใจต่ำ',
    tags: ['enemy', 'crush', 'tsundere', 'hard-to-get'],
  },
  {
    id: 'unfinished-ex',
    name: 'แฟนเก่าที่ยังค้างคา',
    description: 'มีอดีต มี intimacy เดิม แต่ trust เสียหาย',
    tags: ['ex', 'cold', 'unfinished_business', 'romance'],
  },
  {
    id: 'warm-close-friend',
    name: 'เพื่อนสนิทอบอุ่น',
    description: 'เริ่มไว้ใจกันสูง เหมาะกับ slow-burn หรือ comfort roleplay',
    tags: ['close-friend', 'golden', 'slice-of-life', 'green-flag'],
  },
  {
    id: 'dangerous-vampire',
    name: 'ตัวละครอันตรายมีเสน่ห์',
    description: 'fear/dominance สูง มี red flag และ supernatural tension',
    tags: ['vampire', 'red-flag', 'hard-to-get', 'fantasy'],
  },
  {
    id: 'safe-family-bond',
    name: 'ครอบครัวปลอด romance',
    description: 'ล็อก no-romance/no-intimacy สำหรับความสัมพันธ์ครอบครัว',
    tags: ['family', 'no-romance', 'slice-of-life', 'green-flag'],
  },
]

const RELATIONSHIP_CONTRACT_PRESET_IDS = new Set([
  'enemy',
  'disliked',
  'rival',
  'bickering-rival',
  'acquaintance',
  'friend',
  'close-friend',
  'ride-or-die',
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

export function listRelationshipPresets(surface?: RelationshipPresetSurface): RelationshipPresetResponse[] {
  return RELATIONSHIP_PRESETS.map((preset) => ({
    ...preset,
    surfaces: RELATIONSHIP_CONTRACT_PRESET_IDS.has(preset.id)
      ? (['contract', 'creator'] satisfies RelationshipPresetSurface[])
      : (['creator'] satisfies RelationshipPresetSurface[]),
  })).filter((preset) => (surface ? preset.surfaces.includes(surface) : true))
}

const TAG_RULES: Record<string, TagRule> = {
  enemy: { kind: 'engine', offsets: { affinity: -80, trust: -60, respect: -10 }, status: 'ENEMY', flags: ['hostile'] },
  disliked: { kind: 'engine', offsets: { affinity: -55, trust: -25, respect: -5 }, status: 'DISLIKED', flags: ['guarded'] },
  rival: { kind: 'engine', offsets: { affinity: -30, trust: -15, respect: 25 }, status: 'RIVAL', flags: ['competitive'] },
  'bickering-rival': {
    kind: 'engine',
    offsets: { affinity: -25, trust: -5, respect: 15 },
    status: 'BICKERING_RIVAL',
    flags: ['competitive', 'banter_tension'],
  },
  acquaintance: { kind: 'engine', offsets: { affinity: 10, trust: 10 }, status: 'ACQUAINTANCE', flags: ['early_distance'] },
  friend: { kind: 'engine', offsets: { affinity: 45, trust: 45, respect: 15 }, status: 'FRIEND', flags: ['friendly'] },
  'close-friend': { kind: 'engine', offsets: { affinity: 70, trust: 70, intimacy: 10 }, status: 'CLOSE_FRIEND', flags: ['friendly'] },
  'ride-or-die': {
    kind: 'engine',
    offsets: { affinity: 110, trust: 120, intimacy: 25, respect: 55 },
    status: 'RIDE_OR_DIE',
    flags: ['absolute_trust', 'protective'],
  },
  partner: { kind: 'engine', offsets: { affinity: 110, trust: 80, intimacy: 45 }, status: 'PARTNER', route: 'romance' },
  lover: { kind: 'engine', offsets: { affinity: 120, trust: 90, intimacy: 50 }, status: 'LOVER', route: 'romance' },
  'toxic-partner': {
    kind: 'engine',
    offsets: { affinity: 80, trust: -40, intimacy: 35, dominance: 35, fear: 35 },
    status: 'TOXIC_PARTNER',
    route: 'romance',
    flags: ['red_flag', 'toxic_bond'],
    constraints: ['slow_progression'],
  },
  'life-partner': {
    kind: 'engine',
    offsets: { affinity: 140, trust: 130, intimacy: 55, respect: 70 },
    status: 'LIFE_PARTNER',
    route: 'romance',
    flags: ['stable_commitment'],
  },
  spouse: {
    kind: 'engine',
    offsets: { affinity: 130, trust: 120, intimacy: 55, respect: 60 },
    status: 'SPOUSE',
    route: 'romance',
    flags: ['formal_commitment'],
  },
  'toxic-spouse': {
    kind: 'engine',
    offsets: { affinity: 110, trust: -55, intimacy: 45, dominance: 45, fear: 45 },
    status: 'TOXIC_SPOUSE',
    route: 'romance',
    flags: ['red_flag', 'toxic_bond', 'formal_commitment'],
    constraints: ['slow_progression'],
  },
  soulmate: {
    kind: 'engine',
    offsets: { affinity: 170, trust: 150, intimacy: 65, respect: 90 },
    status: 'SOULMATE',
    route: 'romance',
    flags: ['soulmate', 'stable_commitment'],
  },
  ex: { kind: 'engine', offsets: { affinity: -15, trust: -35, intimacy: 25 }, status: 'COMPLICATED', flags: ['unfinished_business'] },
  crush: { kind: 'engine', offsets: { affinity: 35, trust: 5 }, status: 'CRUSH', route: 'romance', flags: ['hidden_feelings'] },
  'friend-crush': {
    kind: 'engine',
    offsets: { affinity: 80, trust: 65, intimacy: 18 },
    status: 'FRIEND_CRUSH',
    route: 'romance',
    flags: ['hidden_feelings', 'friendship_tension'],
  },
  'dating-trial': {
    kind: 'engine',
    offsets: { affinity: 75, trust: 45, intimacy: 20 },
    status: 'DATING_TRIAL',
    route: 'romance',
    flags: ['tentative_romance'],
  },
  'talking-stage': {
    kind: 'engine',
    offsets: { affinity: 90, trust: 55, intimacy: 28 },
    status: 'TALKING_STAGE',
    route: 'romance',
    flags: ['almost_relationship'],
  },
  guarded: { kind: 'engine', offsets: { trust: -15 }, multipliers: { trustGain: 0.75 }, flags: ['guarded'] },
  tsundere: { kind: 'engine', offsets: { affinity: -10, trust: -10 }, multipliers: { affinityGain: 0.7 }, flags: ['guarded'] },
  kuudere: { kind: 'engine', offsets: { trust: -20, respect: 10 }, multipliers: { affinityGain: 0.6, trustGain: 0.8 }, flags: ['reserved'] },
  cold: { kind: 'engine', offsets: { affinity: -20, trust: -15 }, multipliers: { affinityGain: 0.4, trustGain: 0.7 }, flags: ['distant'] },
  shy: { kind: 'engine', offsets: { trust: -5, intimacy: -10 }, multipliers: { trustGain: 0.8, intimacyGain: 0.6 }, flags: ['slow_opening'] },
  cheerful: { kind: 'engine', offsets: { affinity: 20 }, multipliers: { affinityGain: 1.2 }, flags: ['openhearted'] },
  loyal: { kind: 'engine', offsets: { trust: 25, respect: 20 }, multipliers: { trustGain: 1.2 } },
  'hard-to-get': { kind: 'engine', multipliers: { affinityGain: 0.25, trustGain: 0.6, intimacyGain: 0.35 }, flags: ['high_difficulty'] },
  golden: { kind: 'engine', offsets: { affinity: 25, trust: 20 }, multipliers: { affinityGain: 1.5, trustGain: 1.2 }, flags: ['approachable'] },
  mafia: { kind: 'engine', offsets: { dominance: 45, fear: 35, respect: 20 }, flags: ['dangerous'] },
  doctor: { kind: 'engine', offsets: { trust: 20, respect: 25 }, flags: ['professional'] },
  teacher: { kind: 'engine', offsets: { respect: 35, dominance: 15 }, flags: ['authority'] },
  knight: { kind: 'engine', offsets: { trust: 20, respect: 35 }, flags: ['protective'] },
  vampire: { kind: 'engine', offsets: { fear: 30, dominance: 25, intimacy: 10 }, flags: ['dangerous', 'supernatural'] },
  family: {
    kind: 'safety',
    offsets: { affinity: 35, trust: 40, respect: 20 },
    status: 'FAMILY',
    flags: ['family_bond'],
    constraints: ['no_romance', 'no_intimacy'],
  },
  'no-romance': { kind: 'safety', constraints: ['no_romance', 'no_intimacy'], flags: ['boundary_locked'] },
  'red-flag': { kind: 'safety', offsets: { fear: 20, trust: -20 }, flags: ['red_flag'], constraints: ['slow_progression'] },
  'yellow-flag': { kind: 'safety', flags: ['yellow_flag'], constraints: ['cautious_progression'] },
  'green-flag': { kind: 'safety', offsets: { trust: 15, respect: 10 }, flags: ['green_flag'] },
}

const TAG_ALIASES: Record<string, string> = {
  '18+': 'nc',
  adult: 'nc',
  mature: 'nc',
  nsfw: 'nc',
  smut: 'nc',
  spicy: 'nc',
  'ศัตรู': 'enemy',
  'ไม่ถูกกัน': 'disliked',
  'คู่แข่ง': 'rival',
  'คู่ปรับ': 'rival',
  'คู่กัด': 'bickering-rival',
  'คนรู้จัก': 'acquaintance',
  'เพื่อน': 'friend',
  'เพื่อนสนิท': 'close-friend',
  'เพื่อนตาย': 'ride-or-die',
  'แฟน': 'partner',
  'แฟนเก่า': 'ex',
  'แฟน toxic': 'toxic-partner',
  'แฟนtoxic': 'toxic-partner',
  'แอบรัก': 'crush',
  'แอบชอบ': 'crush',
  'คนที่ชอบ': 'crush',
  'เพื่อนสนิทคิดไม่ซื่อ': 'friend-crush',
  'ลองคุย': 'dating-trial',
  'คนคุย': 'talking-stage',
  'คนรัก': 'lover',
  'คู่ชีวิต': 'life-partner',
  'คู่ครอง': 'spouse',
  'คู่ครอง toxic': 'toxic-spouse',
  'คู่ครองtoxic': 'toxic-spouse',
  'คู่แท้': 'soulmate',
  dislike: 'disliked',
  'not-getting-along': 'disliked',
  acquaintance: 'acquaintance',
  'best-friend': 'close-friend',
  'ride-or-die': 'ride-or-die',
  'friend-crush': 'friend-crush',
  'friends-to-lovers': 'friend-crush',
  'dating-trial': 'dating-trial',
  'talking-stage': 'talking-stage',
  partner: 'partner',
  'toxic-partner': 'toxic-partner',
  'life-partner': 'life-partner',
  spouse: 'spouse',
  'toxic-spouse': 'toxic-spouse',
  soulmate: 'soulmate',
  'รักต้องห้าม': 'no-romance',
  'ครอบครัว': 'family',
  'พ่อ': 'family',
  'แม่': 'family',
  'พี่ชาย': 'family',
  'น้องสาว': 'family',
  'ซึนเดเระ': 'tsundere',
  'คุเดเระ': 'kuudere',
  'เย็นชา': 'cold',
  'ขี้อาย': 'shy',
  'ร่าเริง': 'cheerful',
  'จริงจัง': 'loyal',
  'ตัวละครจีบยาก': 'hard-to-get',
  'หมาโกลเด้น': 'golden',
  'มาเฟีย': 'mafia',
  'หมอ': 'doctor',
  'ครู': 'teacher',
  'อัศวิน': 'knight',
  'แวมไพร์': 'vampire',
  'ธงแดง': 'red-flag',
  'ธงเหลือง': 'yellow-flag',
  'ธงเขียว': 'green-flag',
  'แฟนตาซี': 'fantasy',
  'รักโรแมนติก': 'romance',
  'ชีวิตประจำวัน': 'slice-of-life',
  'ไทยโบราณ': 'historical-thai',
}

function clamp(value: number, min = -200, max = 200) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function clampPositive(value: number, max = 200) {
  return Math.max(0, Math.min(max, Math.round(value)))
}

function normalizeTag(tag: string) {
  const value = tag.trim().toLowerCase()
  return TAG_ALIASES[value] ?? value
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))]
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function classifyTags(tags: string[]): RelationshipTagProfile {
  const profile: RelationshipTagProfile = {
    discovery: [],
    engine: [],
    safety: [],
    unknown: [],
  }

  for (const tag of unique(tags.map(normalizeTag))) {
    const rule = TAG_RULES[tag]
    if (rule) {
      profile[rule.kind].push(tag)
      continue
    }

    if (DISCOVERY_TAGS.has(tag)) {
      profile.discovery.push(tag)
      continue
    }

    profile.unknown.push(tag)
  }

  return profile
}

function applyConstraints(stats: RelationshipStats, constraints: string[]) {
  const next = { ...stats }

  if (constraints.includes('no_intimacy') || constraints.includes('no_romance')) {
    next.intimacy = Math.min(next.intimacy, 0)
  }

  if (constraints.includes('slow_progression')) {
    next.affinity = Math.min(next.affinity, 120)
    next.trust = Math.min(next.trust, 120)
  }

  return {
    affinity: clamp(next.affinity),
    trust: clamp(next.trust),
    intimacy: clampPositive(next.intimacy),
    dominance: clamp(next.dominance),
    fear: clampPositive(next.fear),
    respect: clamp(next.respect),
  }
}

function normalizeForPrompt(stats: RelationshipStats) {
  return {
    affinity: clamp(stats.affinity, -120, 120),
    trust: clamp(stats.trust, -120, 120),
    intimacy: clampPositive(stats.intimacy, 120),
    dominance: clamp(stats.dominance, -120, 120),
    fear: clampPositive(stats.fear, 120),
    respect: clamp(stats.respect, -120, 120),
  }
}

function tierFromStats(stats: RelationshipStats) {
  if (stats.fear >= 160 || stats.affinity <= -160) return 'breaking-negative'
  if (stats.affinity <= -90 || stats.trust <= -90) return 'hostile'
  if (stats.affinity <= -25) return 'rival'
  if (stats.affinity < 25 && stats.trust < 40) return 'neutral'
  if (stats.affinity < 90 || stats.trust < 70) return 'warming'
  if (stats.affinity < 160) return 'bonded'
  return 'breaking-positive'
}

const SPECIFIC_STATUS_STICKY = new Set([
  'DISLIKED',
  'BICKERING_RIVAL',
  'ACQUAINTANCE',
  'CLOSE_FRIEND',
  'RIDE_OR_DIE',
  'FRIEND_CRUSH',
  'DATING_TRIAL',
  'TALKING_STAGE',
  'PARTNER',
  'TOXIC_PARTNER',
  'LIFE_PARTNER',
  'SPOUSE',
  'TOXIC_SPOUSE',
  'SOULMATE',
])

const ROMANTIC_ENGINE_TAGS = new Set([
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

function statusFromStats(stats: RelationshipStats, constraints: string[], fallback = 'NEUTRAL') {
  if (constraints.includes('no_romance') && fallback === 'FAMILY') return 'FAMILY'
  if (stats.fear >= 150 && stats.trust <= -60) return 'TRAUMA'
  if (SPECIFIC_STATUS_STICKY.has(fallback) && stats.affinity > -90 && stats.trust > -90) return fallback
  if (stats.affinity >= 150 && stats.trust >= 100 && !constraints.includes('no_romance')) return 'DEVOTED'
  if (stats.affinity >= 120 && stats.trust >= 80 && !constraints.includes('no_romance')) return 'LOVER'
  if (stats.affinity >= 90 && stats.trust >= 80) return 'CLOSE_FRIEND'
  if (stats.affinity >= 60 && stats.trust >= 40) return 'FRIEND'
  if (stats.affinity <= -80 || stats.trust <= -80) return 'ENEMY'
  if (stats.affinity < -20) return 'RIVAL'
  return fallback
}

function toneFromStats(stats: RelationshipStats) {
  if (stats.fear >= 100) return 'fearful'
  if (stats.affinity >= 90 && stats.trust >= 60) return 'warm'
  if (stats.affinity <= -60) return 'hostile'
  if (stats.trust <= -40) return 'guarded'
  if (stats.respect >= 80) return 'respectful'
  return 'neutral'
}

function relationshipEvents(stats: RelationshipStats, constraints: string[], flags: string[]) {
  const events: RelationshipEvent[] = []

  if (stats.affinity > 80 && stats.trust > 60 && !constraints.includes('no_romance')) {
    events.push({
      code: 'soft_confession_available',
      label: 'soft confession available',
      priority: 30,
      cooldownTurns: 8,
      repeatable: false,
    })
  }

  if (stats.affinity > 175 && stats.trust > 120 && !constraints.includes('no_romance')) {
    events.push({ code: 'devotion_shift', label: 'devotion shift', priority: 80, cooldownTurns: 14, repeatable: false })
  }

  if (stats.affinity < -140 || stats.trust < -130) {
    events.push({ code: 'relationship_break', label: 'relationship break risk', priority: 70, cooldownTurns: 10, repeatable: true })
  }

  if (stats.fear > 140) {
    events.push({ code: 'fear_lock', label: 'fear lock', priority: 60, cooldownTurns: 8, repeatable: true })
  }

  if (flags.includes('unfinished_business') && stats.trust > 30) {
    events.push({
      code: 'unfinished_business_surfaces',
      label: 'unfinished business surfaces',
      priority: 45,
      cooldownTurns: 10,
      repeatable: false,
    })
  }

  if (constraints.includes('no_romance') && stats.intimacy > 0) {
    events.push({ code: 'constraint_guard', label: 'constraint guard', priority: 100, cooldownTurns: 6, repeatable: true })
  }

  return events.sort((a, b) => b.priority - a.priority).slice(0, 4)
}

function arcStageFromState(route: string, status: string, tier: string) {
  if (status === 'TRAUMA' || tier === 'breaking-negative') return 'crisis'
  if (status === 'ENEMY' || status === 'DISLIKED' || status === 'RIVAL' || status === 'BICKERING_RIVAL') {
    return route === 'romance' ? 'tension' : 'conflict'
  }
  if (status === 'ACQUAINTANCE') return 'getting-to-know'
  if (status === 'FRIEND' || status === 'CLOSE_FRIEND' || status === 'RIDE_OR_DIE') return 'bond-building'
  if (status === 'CRUSH' || status === 'FRIEND_CRUSH') return 'hidden-feelings'
  if (status === 'DATING_TRIAL' || status === 'TALKING_STAGE') return 'testing-chemistry'
  if (status === 'PARTNER' || status === 'LOVER' || status === 'LIFE_PARTNER' || status === 'SPOUSE') return 'commitment-test'
  if (status === 'TOXIC_PARTNER' || status === 'TOXIC_SPOUSE') return 'volatile-bond'
  if (status === 'DEVOTED' || status === 'SOULMATE') return 'payoff'
  if (tier === 'warming') return 'opening-up'
  return route === 'romance' ? 'slow-burn' : 'setup'
}

function promptProfileForState(state: {
  status: string
  tier: string
  tone: string
  flags: string[]
  constraints: string[]
  events: RelationshipEvent[]
  normalized: RelationshipStats
}) {
  const lines = [
    `Status is ${state.status}; tier is ${state.tier}; tone should read as ${state.tone}.`,
    state.tone === 'warm' ? 'Behavior: softer wording, more willingness to share, gentle curiosity.' : '',
    state.tone === 'guarded' ? 'Behavior: cautious, short trust tests, avoids immediate vulnerability.' : '',
    state.tone === 'hostile' ? 'Behavior: tense, defensive, may challenge the user without breaking character.' : '',
    state.tone === 'fearful' ? 'Behavior: careful compliance, visible unease, does not become instantly affectionate.' : '',
    state.flags.includes('high_difficulty') ? 'Progression: affection and trust should rise slowly; make earned moments feel meaningful.' : '',
    state.flags.includes('unfinished_business') ? 'Narrative: unresolved history may surface through subtext, hesitation, or pointed questions.' : '',
    state.flags.includes('banter_tension') ? 'Narrative: use teasing friction and push-pull banter without turning every line into hostility.' : '',
    state.flags.includes('friendship_tension') ? 'Narrative: preserve the comfort of friendship while hinting at feelings that are not fully spoken yet.' : '',
    state.flags.includes('tentative_romance') ? 'Progression: keep the bond exploratory; avoid acting like commitment is already settled.' : '',
    state.flags.includes('almost_relationship') ? 'Progression: show expectation and chemistry, but leave room for uncertainty and negotiation.' : '',
    state.flags.includes('toxic_bond') ? 'Safety: portray toxicity as tension and conflict, not as healthy romance; let trust repair require explicit behavior.' : '',
    state.flags.includes('stable_commitment') ? 'Narrative: reference shared history, routine care, and long-term stakes.' : '',
    state.flags.includes('soulmate') ? 'Narrative: the bond can feel fated or deeply aligned, but still respond to the user turn naturally.' : '',
    state.constraints.includes('no_romance') ? 'Constraint: block romance/intimacy escalation and redirect to safe relationship dynamics.' : '',
    state.events.length > 0 ? `Active hooks: ${state.events.map((event) => event.code).join(', ')}.` : '',
  ].filter(Boolean)

  return lines.join(' ')
}

function stateFromParts({
  stats,
  multipliers,
  route,
  status,
  flags,
  constraints,
  tagProfile,
  updatedAt,
}: {
  stats: RelationshipStats
  multipliers: RelationshipMultipliers
  route: string
  status: string
  flags: string[]
  constraints: string[]
  tagProfile: RelationshipTagProfile
  updatedAt: string
}): RelationshipState {
  const normalizedFlags = unique(flags)
  const normalizedConstraints = unique(constraints)
  const constrained = applyConstraints(stats, normalizedConstraints)
  const nextStatus = statusFromStats(constrained, normalizedConstraints, status)
  const tier = tierFromStats(constrained)
  const arcStage = arcStageFromState(route, nextStatus, tier)
  const tone = toneFromStats(constrained)
  const normalized = normalizeForPrompt(constrained)
  const events = relationshipEvents(constrained, normalizedConstraints, normalizedFlags)
  const promptProfile = promptProfileForState({
    status: nextStatus,
    tier,
    tone,
    flags: normalizedFlags,
    constraints: normalizedConstraints,
    events,
    normalized,
  })

  return {
    ...constrained,
    route,
    arcStage,
    status: nextStatus,
    tier,
    tone,
    flags: normalizedFlags,
    constraints: normalizedConstraints,
    events,
    multipliers,
    normalized,
    promptProfile,
    tagProfile,
    updatedAt,
  }
}

export function buildRelationshipSeed(character: CharacterWithTags | null): RelationshipState {
  const tags = (character?.tags ?? []).map((item) => item.tag.name)
  const tagProfile = classifyTags(tags)
  const stats = { ...EMPTY_STATS }
  const multipliers = { ...DEFAULT_MULTIPLIERS }
  let status = 'NEUTRAL'
  let route = tagProfile.discovery.includes('romance') ? 'romance' : 'general'
  const flags: string[] = []
  const constraints: string[] = []

  for (const tag of [...tagProfile.engine, ...tagProfile.safety].slice(0, 8)) {
    const rule = TAG_RULES[tag]
    if (!rule) continue

    for (const [key, value] of Object.entries(rule.offsets ?? {})) {
      stats[key as keyof RelationshipStats] += value ?? 0
    }

    for (const [key, value] of Object.entries(rule.multipliers ?? {})) {
      multipliers[key as keyof RelationshipMultipliers] *= value ?? 1
    }

    if (rule.status && status === 'NEUTRAL') status = rule.status
    if (rule.route) route = rule.route
    flags.push(...(rule.flags ?? []))
    constraints.push(...(rule.constraints ?? []))
  }

  return stateFromParts({
    stats,
    multipliers,
    route,
    status,
    flags,
    constraints,
    tagProfile,
    updatedAt: new Date().toISOString(),
  })
}

export function analyzeRelationshipTags(tags: string[]) {
  return classifyTags(tags)
}

export function validateRelationshipTags(tags: string[]): RelationshipValidationIssue[] {
  const profile = classifyTags(tags)
  const issues: RelationshipValidationIssue[] = []
  const adultMode = profile.discovery.includes('nc')
  const strictConflictLevel: RelationshipValidationIssue['level'] = adultMode ? 'warning' : 'danger'
  const adultSimulationDisclosure =
    'This story is fictional simulated adult roleplay. Adult mode keeps this as a creator-facing warning instead of blocking publish; define context and boundaries clearly.'
  const hasRomanticSeed = profile.engine.some((tag) => ROMANTIC_ENGINE_TAGS.has(tag))

  if (profile.engine.length > 5) {
    issues.push({
      level: 'warning',
      code: 'too_many_engine_tags',
      message: 'Engine tags should stay around 3-5 items so behavior remains readable.',
    })
  }

  if (profile.safety.includes('family') && (profile.discovery.includes('nc') || hasRomanticSeed)) {
    issues.push({
      level: strictConflictLevel,
      code: 'family_romance_conflict',
      message: adultMode
        ? `family conflicts with nc/romantic relationship tags. ${adultSimulationDisclosure}`
        : 'family conflicts with romantic relationship tags. The relationship should use no-romance or remove romantic tags before publishing.',
    })
  }

  if (profile.safety.includes('no-romance') && hasRomanticSeed) {
    issues.push({
      level: strictConflictLevel,
      code: 'no_romance_romantic_seed',
      message: adultMode
        ? `no-romance conflicts with romantic relationship tags. ${adultSimulationDisclosure} Bot behavior may drift unless the prompt is explicit.`
        : 'no-romance conflicts with romantic relationship tags. Romance progression will be blocked.',
    })
  }

  if (profile.engine.includes('hard-to-get') && profile.engine.includes('golden')) {
    issues.push({
      level: 'warning',
      code: 'mixed_progression_speed',
      message: 'hard-to-get and golden send opposite progression signals. Pick slow-earned or quickly approachable.',
    })
  }

  if (profile.safety.includes('red-flag') && profile.safety.includes('green-flag')) {
    issues.push({
      level: 'warning',
      code: 'mixed_safety_tone',
      message: 'red-flag and green-flag create mixed safety tone. Use yellow-flag for ambiguity.',
    })
  }

  return issues
}

export function buildRelationshipSeedFromTags(tags: string[]) {
  return buildRelationshipSeed({
    tags: tags.map((name) => ({ tag: { name } })),
  } as CharacterWithTags)
}

export function relationshipPresetById(id: string) {
  return RELATIONSHIP_PRESETS.find((preset) => preset.id === id) ?? null
}

export function simulateRelationshipPreview({
  tags,
  messages,
}: {
  tags: string[]
  messages?: string[]
}) {
  const script =
    messages && messages.length > 0
      ? messages
      : ['สวัสดี เราอยากรู้จักเธอมากขึ้น', 'ขอบคุณที่เล่าให้ฟังนะ เราไว้ใจเธอ', 'ถ้าไม่พร้อมก็ไม่เป็นไร']
  let state = buildRelationshipSeedFromTags(tags)
  const turns = script.map((message, index) => {
    state = updateRelationshipState({
      previous: state,
      character: {
        tags: tags.map((name) => ({ tag: { name } })),
      } as CharacterWithTags,
      userMessage: message,
    })

    return {
      turn: index + 1,
      message,
      status: state.status,
      tier: state.tier,
      tone: state.tone,
      stats: state.normalized,
      events: state.events,
    }
  })

  return {
    seed: buildRelationshipSeedFromTags(tags),
    turns,
    finalState: state,
    validationIssues: validateRelationshipTags(tags),
  }
}

export function coerceRelationshipState(value: unknown, character: CharacterWithTags | null): RelationshipState {
  const seed = buildRelationshipSeed(character)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return seed

  const record = value as Record<string, unknown>
  const previousMultipliers = record.multipliers as Record<string, unknown> | undefined
  const rawStats: RelationshipStats = {
    affinity: typeof record.affinity === 'number' ? record.affinity : seed.affinity,
    trust: typeof record.trust === 'number' ? record.trust : seed.trust,
    intimacy: typeof record.intimacy === 'number' ? record.intimacy : seed.intimacy,
    dominance: typeof record.dominance === 'number' ? record.dominance : seed.dominance,
    fear: typeof record.fear === 'number' ? record.fear : seed.fear,
    respect: typeof record.respect === 'number' ? record.respect : seed.respect,
  }

  return stateFromParts({
    stats: rawStats,
    multipliers: {
      affinityGain:
        typeof previousMultipliers?.affinityGain === 'number' ? previousMultipliers.affinityGain : seed.multipliers.affinityGain,
      trustGain:
        typeof previousMultipliers?.trustGain === 'number' ? previousMultipliers.trustGain : seed.multipliers.trustGain,
      intimacyGain:
        typeof previousMultipliers?.intimacyGain === 'number' ? previousMultipliers.intimacyGain : seed.multipliers.intimacyGain,
      respectGain:
        typeof previousMultipliers?.respectGain === 'number' ? previousMultipliers.respectGain : seed.multipliers.respectGain,
    },
    route: typeof record.route === 'string' ? record.route : seed.route,
    status: typeof record.status === 'string' ? record.status : seed.status,
    flags: unique([...seed.flags, ...asStringArray(record.flags)]),
    constraints: unique([...seed.constraints, ...asStringArray(record.constraints)]),
    tagProfile: seed.tagProfile,
    updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : seed.updatedAt,
  })
}

export function updateRelationshipState({
  previous,
  character,
  userMessage,
}: {
  previous: unknown
  character: CharacterWithTags | null
  userMessage: string
}) {
  const state = coerceRelationshipState(previous, character)
  const message = userMessage.toLowerCase()
  const positive = /(ขอบคุณ|ดี|เยี่ยม|ชอบ|รัก|คิดถึง|ห่วง|thanks|thank|love|like)/i.test(message)
  const negative = /(เกลียด|รำคาญ|โกรธ|แย่|ไม่ชอบ|หุบปาก|hate|angry|annoy)/i.test(message)
  const respectful = /(ครับ|ค่ะ|ขอโทษ|ขออนุญาต|respect|sorry)/i.test(message)
  const threatening = /(กลัว|ขู่|ฆ่า|ทำร้าย|threat|hurt|kill)/i.test(message)
  const vulnerable = /(ไว้ใจ|เล่าให้ฟัง|ความลับ|กลัวว่า|เหงา|trust|secret|lonely)/i.test(message)

  const affinityDelta = (positive ? 6 : 0) + (negative ? -8 : 0)
  const trustDelta = (positive ? 3 : 0) + (negative ? -7 : 0) + (respectful ? 2 : 0) + (vulnerable ? 5 : 0)
  const intimacyDelta = positive && state.trust > 20 && !state.constraints.includes('no_intimacy') ? 2 : 0

  return stateFromParts({
    stats: {
      affinity: state.affinity + affinityDelta * state.multipliers.affinityGain,
      trust: state.trust + trustDelta * state.multipliers.trustGain,
      intimacy: state.intimacy + intimacyDelta * state.multipliers.intimacyGain,
      dominance: state.dominance + (threatening ? 4 : 0),
      fear: state.fear + (threatening ? 8 : negative ? 2 : 0),
      respect: state.respect + (respectful ? 4 : negative ? -3 : 0) * state.multipliers.respectGain,
    },
    multipliers: state.multipliers,
    route: state.route,
    status: state.status,
    flags: state.flags,
    constraints: state.constraints,
    tagProfile: state.tagProfile,
    updatedAt: new Date().toISOString(),
  })
}

export function applyRelationshipDelta(
  state: RelationshipState,
  delta: Partial<RelationshipStats>,
  label = 'manual-adjustment',
) {
  return stateFromParts({
    stats: {
      affinity: state.affinity + (delta.affinity ?? 0),
      trust: state.trust + (delta.trust ?? 0),
      intimacy: state.intimacy + (delta.intimacy ?? 0),
      dominance: state.dominance + (delta.dominance ?? 0),
      fear: state.fear + (delta.fear ?? 0),
      respect: state.respect + (delta.respect ?? 0),
    },
    multipliers: state.multipliers,
    route: state.route,
    status: state.status,
    flags: unique([...state.flags, label]),
    constraints: state.constraints,
    tagProfile: state.tagProfile,
    updatedAt: new Date().toISOString(),
  })
}

export function buildRelationshipPrompt(state: RelationshipState) {
  const stats = state.normalized
  const tagProfile = [
    state.tagProfile.engine.length > 0 ? `engine tags=${state.tagProfile.engine.join(', ')}` : '',
    state.tagProfile.safety.length > 0 ? `safety tags=${state.tagProfile.safety.join(', ')}` : '',
    state.tagProfile.discovery.length > 0 ? `discovery tags=${state.tagProfile.discovery.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join('; ')

  return [
    'Relationship engine state:',
    `- route=${state.route}, arc=${state.arcStage}, status=${state.status}, tier=${state.tier}, tone=${state.tone}`,
    `- normalized stats: affinity=${stats.affinity}, trust=${stats.trust}, intimacy=${stats.intimacy}, dominance=${stats.dominance}, fear=${stats.fear}, respect=${stats.respect}`,
    tagProfile ? `- tag profile: ${tagProfile}` : '',
    state.flags.length > 0 ? `- behavior flags: ${state.flags.join(', ')}` : '',
    state.constraints.length > 0 ? `- constraints: ${state.constraints.join(', ')}` : '',
    state.events.length > 0 ? `- active relationship hooks: ${state.events.map((event) => event.code).join(', ')}` : '',
    `- prompt adapter: ${state.promptProfile}`,
    '- Use this as hidden behavioral direction. Do not expose raw numbers or engine labels unless the user asks for debug details.',
  ]
    .filter(Boolean)
    .join('\n')
}
