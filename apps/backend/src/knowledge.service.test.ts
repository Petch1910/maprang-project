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

    expect(prompt).toContain('Maprang structured knowledge pack')
    expect(prompt).toContain('Reply shape')
    expect(prompt).toContain('Default mode: sandbox')
    expect(prompt).toContain('Fiction notice')
  })

  test('builds creator drafting prompt', () => {
    const prompt = buildCreatorKnowledgePrompt()

    expect(prompt).toContain('Maprang creator knowledge pack')
    expect(prompt).toContain('Creator drafting principles')
    expect(prompt).toContain('Required character qualities')
  })
})
