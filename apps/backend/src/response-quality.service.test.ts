import { describe, expect, test } from 'bun:test'
import {
  analyzeResponseQuality,
  buildResponseQualityPromptBlock,
  normalizeResponseDepth,
} from './response-quality.service'

describe('response quality controller', () => {
  test('normalizes response depth from explicit value, reply profile, and scene state', () => {
    expect(normalizeResponseDepth('cinematic', 'quick', false)).toBe('cinematic')
    expect(normalizeResponseDepth(undefined, 'deep_roleplay', false)).toBe('deep')
    expect(normalizeResponseDepth(undefined, 'balanced', true)).toBe('cinematic')
    expect(normalizeResponseDepth('unknown', 'quick', false)).toBe('quick')
  })

  test('builds a prompt block that prevents shallow roleplay replies', () => {
    const prompt = buildResponseQualityPromptBlock({ responseDepth: 'deep', replyProfile: 'deep_roleplay' })

    expect(prompt).toContain('ตัวควบคุมคุณภาพคำตอบ')
    expect(prompt).toContain('ระดับคำตอบ: deep')
    expect(prompt).toContain('ห้ามตอบตื้นแบบประโยคเดียว')
    expect(prompt).toContain('hook ให้ผู้เล่นตอบต่อ')
  })

  test('flags shallow replies and scores richer replies higher', () => {
    const shallow = analyzeResponseQuality({
      reply: 'เธอยิ้มบาง ๆ แล้วพยักหน้า',
      userMessage: 'เมื่อคืนหมายความว่ายังไง',
      responseDepth: 'deep',
      replyProfile: 'deep_roleplay',
    })
    const richer = analyzeResponseQuality({
      reply:
        'เธอยิ้มบาง ๆ แล้วหลบตา ปลายนิ้วจับขอบแก้วแน่นเหมือนกำลังกลั้นอะไรไว้ในใจ ' +
        'คำถามเรื่องเมื่อคืนทำให้ความเงียบระหว่างเราหนักขึ้นกว่าเดิม แต่เธอยังจำน้ำเสียงของคุณได้ชัดเจน ' +
        'เธอถอนหายใจเบา ๆ ก่อนถามกลับว่า “ถ้าฉันตอบตรง ๆ เธอจะยังมองฉันเหมือนเดิมไหม?”',
      userMessage: 'เมื่อคืนหมายความว่ายังไง',
      responseDepth: 'deep',
      replyProfile: 'deep_roleplay',
    })

    expect(shallow.likelyTooShort).toBe(true)
    expect(shallow.notes.length).toBeGreaterThan(0)
    expect(richer.score).toBeGreaterThan(shallow.score)
    expect(richer.hasAction).toBe(true)
    expect(richer.hasEmotion).toBe(true)
    expect(richer.hasNextHook).toBe(true)
  })
})
