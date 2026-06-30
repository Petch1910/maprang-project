import { describe, expect, test } from 'bun:test'
import {
  analyzeNarrativeQuality,
  buildNarrativePlan,
  buildNarrativePromptBlock,
  classifyNarrativeIntent,
} from './narrative-engine.service'

describe('narrative engine planner', () => {
  test('classifies relationship-heavy user turns', () => {
    expect(classifyNarrativeIntent('ฉันไว้ใจเธอกับความลับนี้')).toBe('vulnerability')
    expect(classifyNarrativeIntent('คิดถึงเธอมาก')).toBe('affection')
    expect(classifyNarrativeIntent('หยุดโกหกฉันได้แล้ว')).toBe('conflict')
  })

  test('builds an ainovel-inspired coordinator/architect/writer/editor plan', () => {
    const plan = buildNarrativePlan({
      userMessage: 'ฉันยังไม่พร้อมตอบเรื่องเมื่อคืน',
      characterName: 'MIKA',
      scenario: 'rainy rooftop',
      relationshipStatus: 'close friend',
      sceneMode: 'scene',
      activeSceneTitle: 'เปิดใจเรื่องเก่า',
      responseDepth: 'cinematic',
      timelineSummaries: ['ผู้เล่นเคยถอยออกจากคำถามเรื่องอดีต'],
    })
    const block = buildNarrativePromptBlock(plan)

    expect(plan.source).toBe('ainovel-inspired')
    expect(plan.coordinator.checkpoint).toBe('scene')
    expect(plan.contextStrategy.summaryMode).toBe('rolling')
    expect(plan.writer.minimumParagraphs).toBeGreaterThanOrEqual(5)
    expect(block).toContain('Coordinator -> Architect -> Writer -> Editor')
    expect(block).toContain('preserve player agency: yes')
  })
})

describe('narrative quality evaluator', () => {
  test('scores rich scene-aware replies higher than flat replies', () => {
    const shallow = analyzeNarrativeQuality({
      userMessage: 'ฉันยังไม่พร้อมตอบเรื่องเมื่อคืน',
      reply: 'เธอพยักหน้าและรอฟังต่อ',
      responseDepth: 'cinematic',
      activeScene: true,
    })
    const rich = analyzeNarrativeQuality({
      userMessage: 'ฉันยังไม่พร้อมตอบเรื่องเมื่อคืน',
      reply:
        'เธอเงียบไปครู่หนึ่ง สายตายังจับอยู่กับแสงไฟที่สะท้อนบนพื้นเปียกเหมือนกำลังชั่งน้ำหนักคำตอบของคุณกับความสัมพันธ์ที่เปราะบางระหว่างกัน ' +
        'เรื่องเมื่อคืนยังค้างอยู่ในอากาศ แต่เธอไม่ได้บังคับให้คุณพูดทันที เพียงขยับแก้วน้ำออกจากขอบโต๊ะช้า ๆ เพื่อให้มือของตัวเองหยุดสั่น ' +
        '“ฉันจะไม่ตัดสินใจแทนเธอ” เธอพูดเสียงเบาลง “แต่ถ้าเธออยากเริ่มจากส่วนที่เจ็บน้อยที่สุดก่อน ฉันจะฟังตรงนั้นได้ไหม?”',
      responseDepth: 'cinematic',
      activeScene: true,
    })

    expect(rich.score).toBeGreaterThan(shallow.score)
    expect(rich.dimensions.playerAgency).toBeGreaterThanOrEqual(60)
    expect(shallow.notes.length).toBeGreaterThan(0)
  })
})
