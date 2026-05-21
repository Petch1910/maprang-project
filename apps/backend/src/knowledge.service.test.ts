import { describe, expect, test } from 'bun:test'
import { buildChatKnowledgePrompt, buildCreatorKnowledgePrompt, formatKnowledgeError, loadStructuredKnowledge } from './knowledge.service'

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

  test('redacts secret-shaped values from knowledge diagnostics', () => {
    const fakeDatabaseUrl = 'postgresql://maprang:super-secret@db.example.com:5432/maprang?sslmode=require'
    const message = formatKnowledgeError(new Error(`โหลด knowledge ไม่ผ่าน DATABASE_URL=${fakeDatabaseUrl}`))

    expect(message).toContain('[REDACTED_SECRET]')
    expect(message).not.toContain('super-secret')
    expect(message).not.toContain(fakeDatabaseUrl)
  })
})
