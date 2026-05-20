import { describe, expect, test } from 'bun:test'
import { buildChatKnowledgePrompt, buildCreatorKnowledgePrompt, loadStructuredKnowledge } from './knowledge.service'

describe('structured knowledge service', () => {
  test('loads and validates required knowledge packs', () => {
    const knowledge = loadStructuredKnowledge({ force: true })

    expect(knowledge.status.ok).toBe(true)
    expect(knowledge.status.missing).toEqual([])
    expect(knowledge.status.files.filter((file) => file.ok).length).toBeGreaterThanOrEqual(5)
  })

  test('builds compact chat runtime prompt', () => {
    const prompt = buildChatKnowledgePrompt()

    expect(prompt).toContain('ชุดความรู้ structured ของ Maprang')
    expect(prompt).toContain('รูปทรงคำตอบ')
    expect(prompt).toContain('โหมดเริ่มต้น: sandbox')
    expect(prompt).toContain('คำเตือนเรื่องสมมุติ')
  })

  test('builds creator drafting prompt', () => {
    const prompt = buildCreatorKnowledgePrompt()

    expect(prompt).toContain('ชุดความรู้ครีเอเตอร์ของ Maprang')
    expect(prompt).toContain('หลักการร่างตัวละครสำหรับครีเอเตอร์')
    expect(prompt).toContain('คุณภาพตัวละครที่ต้องมี')
  })
})
