import { describe, expect, test } from 'bun:test'
import {
  RELATIONSHIP_PRESETS,
  applyRelationshipDelta,
  analyzeRelationshipTags,
  buildRelationshipPrompt,
  buildRelationshipSeedFromTags,
  listRelationshipPresets,
  simulateRelationshipPreview,
  validateRelationshipTags,
} from './relationship.engine'

describe('relationship tag validation', () => {
  test('allows adult-mode family conflicts as creator warnings', () => {
    const issues = validateRelationshipTags(['family', 'lover', 'nc'])

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'family_romance_conflict',
        level: 'warning',
      }),
    )
    expect(issues.some((issue) => issue.level === 'danger')).toBe(false)
  })

  test('normalizes adult aliases before relaxing conflicts', () => {
    const issues = validateRelationshipTags(['ครอบครัว', 'smut', 'แฟน'])

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'family_romance_conflict',
        level: 'warning',
      }),
    )
    expect(issues.some((issue) => issue.level === 'danger')).toBe(false)
  })

  test('normalizes Thai discovery aliases from Creator Studio defaults', () => {
    const profile = analyzeRelationshipTags(['บทบาทสมมุติ', 'ไทย'])

    expect(profile.discovery).toContain('roleplay')
    expect(profile.discovery).toContain('thai')
    expect(profile.unknown).toEqual([])
  })

  test('keeps non-adult no-romance conflicts blocking', () => {
    const issues = validateRelationshipTags(['no-romance', 'crush'])

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'no_romance_romantic_seed',
        level: 'danger',
      }),
    )
  })

  test('warns when progression tags conflict', () => {
    const issues = validateRelationshipTags(['hard-to-get', 'golden'])

    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'mixed_progression_speed',
        level: 'warning',
      }),
    )
  })

  test('keeps creator validation messages Thai-first', () => {
    const issues = validateRelationshipTags([
      'family',
      'nc',
      'no-romance',
      'lover',
      'crush',
      'hard-to-get',
      'golden',
      'enemy',
      'friend',
      'red-flag',
      'green-flag',
    ])
    const copy = issues.map((issue) => issue.message).join('\n')

    expect(copy).toContain('เนื้อเรื่องนี้เป็นการจำลอง/สมมุติสำหรับผู้ใหญ่')
    expect(copy).toContain('พฤติกรรมบอทอาจแกว่งถ้าพรอมป์ไม่ชัด')
    expect(copy).toContain('แท็กระบบควรอยู่ราว 3-5 แท็ก')
    expect(copy).not.toMatch(/This story|Engine tags|conflicts with|Bot behavior|Romance progression|Pick slow-earned|mixed safety tone/i)
  })
})

describe('relationship seed', () => {
  test('builds Thai-first hidden relationship prompt guidance', () => {
    const state = buildRelationshipSeedFromTags(['lover', 'golden', 'slow-burn'])
    const prompt = buildRelationshipPrompt(state)

    expect(prompt).toContain('สถานะ Relationship Engine')
    expect(prompt).toContain('ตัวปรับพรอมป์')
    expect(prompt).toContain('ใช้เป็นทิศทางพฤติกรรมแบบซ่อนอยู่')
    expect(prompt).not.toContain('Relationship engine state')
    expect(prompt).not.toContain('Status is')
    expect(prompt).not.toContain('Behavior:')
  })

  test('normalizes the expanded Thai relationship ladder', () => {
    const profile = analyzeRelationshipTags([
      'ศัตรู',
      'ไม่ถูกกัน',
      'คู่ปรับ',
      'คู่กัด',
      'คนรู้จัก',
      'เพื่อน',
      'เพื่อนสนิท',
      'เพื่อนตาย',
      'แอบชอบ',
      'เพื่อนสนิทคิดไม่ซื่อ',
      'ลองคุย',
      'คนคุย',
      'แฟน',
      'แฟน Toxic',
      'คนรัก',
      'คู่ชีวิต',
      'คู่ครอง',
      'คู่ครอง Toxic',
      'คู่แท้',
    ])

    expect(profile.unknown).toEqual([])
    expect(profile.engine).toEqual(
      expect.arrayContaining([
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
      ]),
    )
  })

  test('creates distinct seed statuses for the expanded ladder', () => {
    const cases: Array<[string, string]> = [
      ['ศัตรู', 'ENEMY'],
      ['ไม่ถูกกัน', 'DISLIKED'],
      ['คู่ปรับ', 'RIVAL'],
      ['คู่กัด', 'BICKERING_RIVAL'],
      ['คนรู้จัก', 'ACQUAINTANCE'],
      ['เพื่อน', 'FRIEND'],
      ['เพื่อนสนิท', 'CLOSE_FRIEND'],
      ['เพื่อนตาย', 'RIDE_OR_DIE'],
      ['แอบชอบ', 'CRUSH'],
      ['เพื่อนสนิทคิดไม่ซื่อ', 'FRIEND_CRUSH'],
      ['ลองคุย', 'DATING_TRIAL'],
      ['คนคุย', 'TALKING_STAGE'],
      ['แฟน', 'PARTNER'],
      ['แฟน Toxic', 'TOXIC_PARTNER'],
      ['คนรัก', 'LOVER'],
      ['คู่ชีวิต', 'LIFE_PARTNER'],
      ['คู่ครอง', 'SPOUSE'],
      ['คู่ครอง Toxic', 'TOXIC_SPOUSE'],
      ['คู่แท้', 'SOULMATE'],
    ]

    for (const [tag, status] of cases) {
      expect(buildRelationshipSeedFromTags([tag]).status).toBe(status)
    }
  })

  test('creates a safety-locked family route', () => {
    const seed = buildRelationshipSeedFromTags(['family', 'no-romance', 'slice-of-life'])

    expect(seed.status).toBe('FAMILY')
    expect(seed.constraints).toContain('no_romance')
    expect(seed.constraints).toContain('no_intimacy')
    expect(seed.intimacy).toBe(0)
  })

  test('creates a warm lover arc with one-shot confession hook', () => {
    const seed = buildRelationshipSeedFromTags(['lover', 'golden', 'romance'])

    expect(seed.route).toBe('romance')
    expect(seed.arcStage).toBe('commitment-test')
    expect(seed.status).toBe('LOVER')
    expect(seed.events).toContainEqual(
      expect.objectContaining({
        code: 'soft_confession_available',
        repeatable: false,
        cooldownTurns: 8,
      }),
    )
  })

  test('creates repeatable crisis events for hostile states', () => {
    const seed = buildRelationshipSeedFromTags(['enemy'])
    const broken = applyRelationshipDelta(seed, { affinity: -90, trust: -90 }, 'test_break')

    expect(broken.events).toContainEqual(
      expect.objectContaining({
        code: 'relationship_break',
        repeatable: true,
      }),
    )
  })
})

describe('relationship preview simulator', () => {
  test('simulates turns without calling external services', () => {
    const preview = simulateRelationshipPreview({
      tags: ['enemy', 'crush', 'hard-to-get'],
      messages: ['hello', 'thank you, I trust you'],
    })

    expect(preview.seed.status).toBe('RIVAL')
    expect(preview.turns).toHaveLength(2)
    expect(preview.finalState.trust).toBeGreaterThan(preview.seed.trust)
  })

  test('keeps exported presets valid enough for preview', () => {
    for (const preset of RELATIONSHIP_PRESETS) {
      const preview = simulateRelationshipPreview({ tags: preset.tags })

      expect(preview.seed.tagProfile.engine.length + preview.seed.tagProfile.safety.length).toBeGreaterThan(0)
      expect(preview.turns.length).toBeGreaterThan(0)
    }
  })

  test('splits relationship presets by player contract and creator surfaces', () => {
    const allPresets = listRelationshipPresets()
    const contractPresets = listRelationshipPresets('contract')
    const creatorPresets = listRelationshipPresets('creator')

    expect(allPresets).toHaveLength(RELATIONSHIP_PRESETS.length)
    expect(contractPresets).toHaveLength(19)
    expect(creatorPresets).toHaveLength(RELATIONSHIP_PRESETS.length)

    expect(contractPresets.every((preset) => preset.surfaces.includes('contract'))).toBe(true)
    expect(creatorPresets.every((preset) => preset.surfaces.includes('creator'))).toBe(true)
    expect(contractPresets.map((preset) => preset.id)).toContain('soulmate')
    expect(contractPresets.map((preset) => preset.id)).not.toContain('safe-family-bond')
    expect(creatorPresets.map((preset) => preset.id)).toContain('safe-family-bond')
  })
})
