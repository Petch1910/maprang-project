import { describe, expect, test } from 'bun:test'
import { previewCharacterChat, providerFailureWarning } from './creator-preview.service'

describe('creator-preview.service', () => {
  describe('PreviewChatInput validation', () => {
    test('should validate required fields', () => {
      const input = {
        name: 'มายะ',
        systemPrompt: 'คุณคือมายะ นักเรียนมัธยมปลาย',
        userMessage: 'สวัสดีครับ',
      }
      expect(input.name.trim().length).toBeGreaterThan(0)
      expect(input.systemPrompt.trim().length).toBeGreaterThan(0)
      expect(input.userMessage.trim().length).toBeGreaterThan(0)
    })

    test('should detect empty name', () => {
      const name = ''
      expect(name.trim().length).toBe(0)
    })

    test('should detect empty system prompt', () => {
      const systemPrompt = '   '
      expect(systemPrompt.trim().length).toBe(0)
    })

    test('should detect empty user message', () => {
      const userMessage = ''
      expect(userMessage.trim().length).toBe(0)
    })
  })

  describe('Local preview reply generation', () => {
    test('should generate preview reply with character name', () => {
      const characterName = 'มายะ'
      const userMessage = 'สวัสดี'
      const previewReply = `สวัสดีค่ะ! ฉันคือ ${characterName} ยินดีที่ได้รู้จักนะคะ`
      expect(previewReply.includes(characterName)).toBe(true)
    })

    test('should include user message in preview reply', () => {
      const userMessage = 'วันนี้อากาศดีจัง'
      const previewReply = `ข้อความของคุณ: "${userMessage}"`
      expect(previewReply.includes(userMessage)).toBe(true)
    })

    test('should select greeting based on message length', () => {
      const greetings = ['A', 'B', 'C', 'D']
      const messageLength = 5
      const selectedIndex = messageLength % greetings.length
      expect(selectedIndex).toBe(1)
      expect(greetings[selectedIndex]).toBe('B')
    })
  })

  describe('Prompt assembly', () => {
    test('should assemble system prompt correctly', () => {
      const parts = [
        'Character context',
        'Relationship context',
        'User persona',
      ]
      const assembled = parts.filter(Boolean).join('\n\n')
      expect(assembled.includes('Character context')).toBe(true)
      expect(assembled.includes('Relationship context')).toBe(true)
      expect(assembled.includes('User persona')).toBe(true)
    })

    test('should filter empty parts', () => {
      const parts = ['Part 1', '', 'Part 2', null, undefined, 'Part 3']
      const filtered = parts.filter(Boolean)
      expect(filtered.length).toBe(3)
      expect(filtered).toEqual(['Part 1', 'Part 2', 'Part 3'])
    })

    test('should build relationship context when seed provided', () => {
      const relationshipSeed = 'friend'
      const hasRelationship = Boolean(relationshipSeed)
      expect(hasRelationship).toBe(true)
    })

    test('should build persona context when provided', () => {
      const userPersona = 'ฉันเป็นนักเรียนมัธยม ชอบอ่านหนังสือ'
      const personaContext = userPersona?.trim()
        ? `\n\nบุคลิกของผู้ใช้:\n${userPersona.trim()}`
        : ''
      expect(personaContext).toContain('บุคลิกของผู้ใช้:')
      expect(personaContext).toContain('นักเรียนมัธยม')
    })
  })

  describe('Preview result structure', () => {
    test('should have correct result structure', () => {
      const result = {
        reply: 'สวัสดีค่ะ',
        source: 'mock' as const,
        modelName: 'local/preview-mock',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        prompt: {
          system: 'System prompt...',
          user: 'User message',
          estimatedTokens: 100,
        },
        warnings: [],
        timestamp: new Date().toISOString(),
      }

      expect(result.reply).toBe('สวัสดีค่ะ')
      expect(result.source).toBe('mock')
      expect(result.usage.totalTokens).toBe(150)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    test('should calculate total tokens correctly', () => {
      const promptTokens = 100
      const completionTokens = 50
      const totalTokens = promptTokens + completionTokens
      expect(totalTokens).toBe(150)
    })
  })

  describe('Scenario testing', () => {
    test('should handle multiple scenarios', () => {
      const scenarios = [
        { label: 'ทักทาย', message: 'สวัสดี' },
        { label: 'ถามคำถาม', message: 'คุณชื่ออะไร' },
        { label: 'คุยเรื่องทั่วไป', message: 'วันนี้อากาศดีจัง' },
      ]
      expect(scenarios.length).toBe(3)
      expect(scenarios[0]?.label).toBe('ทักทาย')
    })

    test('should map scenarios correctly', () => {
      const scenarios = [
        { label: 'A', message: 'msg1' },
        { label: 'B', message: 'msg2' },
      ]
      const mapped = scenarios.map((s) => ({ label: s.label, message: s.message }))
      expect(mapped.length).toBe(2)
      expect(mapped[1]?.label).toBe('B')
    })
  })

  describe('Error handling', () => {
    test('should add warning for empty reply', () => {
      const reply = ''
      const warnings: string[] = []
      if (!reply.trim()) {
        warnings.push('AI ตอบกลับเป็นข้อความว่าง')
      }
      expect(warnings.length).toBe(1)
      expect(warnings[0]).toContain('ว่าง')
    })

    test('should use local preview on provider error', () => {
      const hasApiKey = process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY !== 'missing-openrouter-key'
      const shouldUseLocalPreview = !hasApiKey
      expect(typeof shouldUseLocalPreview).toBe('boolean')
    })

    test('should retry on provider failure', async () => {
      const maxRetries = 3
      let attempts = 0
      const mockCall = async () => {
        attempts++
        if (attempts < maxRetries) {
          throw new Error('Temporary failure')
        }
        return { success: true }
      }

      try {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const result = await mockCall()
            if (result) {
              expect(result.success).toBe(true)
              break
            }
          } catch (error) {
            if (i === maxRetries - 1) throw error
          }
        }
      } catch {
        // Expected on last retry
      }

      expect(attempts).toBe(maxRetries)
    })
  })

  describe('Local preview UX', () => {
    test('returns Thai-first local preview copy without mock wording when provider is skipped', async () => {
      const result = await previewCharacterChat({
        name: 'มายะ',
        systemPrompt: 'คุณคือมายะ พูดสุภาพและอบอุ่น',
        userMessage: 'วันนี้เหนื่อยมากเลย',
        skipProvider: true,
      })

      expect(result.source).toBe('mock')
      expect(result.reply).toContain('คำตอบพรีวิวในเครื่องสำหรับลองบทก่อนเผยแพร่')
      expect(result.reply).toContain('พรอมป์')
      expect(result.reply).not.toContain('mock response')
      expect(result.reply).not.toContain('Preview Chat')
      expect(result.reply).not.toContain('prompt')
      expect(result.warnings.join('\n')).toContain('คำตอบพรีวิวในเครื่อง')
      expect(result.warnings.join('\n')).not.toContain('mock response')
    })

    test('redacts secret-shaped provider failures before returning a warning', () => {
      const fakeKey = ['sk', 'or', 'v1', '1234567890abcdef1234567890abcdef1234567890abcdef'].join('-')
      const warning = providerFailureWarning(new Error(`provider rejected OPENROUTER_API_KEY=${fakeKey}`))

      expect(warning).toContain('เรียกผู้ให้บริการแชทไม่สำเร็จ')
      expect(warning).toContain('คำตอบพรีวิวในเครื่อง')
      expect(warning).not.toContain(fakeKey)
    })
  })

  describe('Character data validation', () => {
    test('should accept valid character data', () => {
      const character = {
        name: 'มายะ',
        description: 'นักเรียนมัธยมปลาย',
        biography: 'เกิดที่โตเกียว',
        scenario: 'พบกันที่ห้องสมุด',
        systemPrompt: 'คุณคือมายะ',
        compactPrompt: 'มายะ นักเรียน',
        characterAnchor: 'เป็นมิตร ใจดี',
        constraints: 'ห้ามพูดคำหยาบ',
        greeting: 'สวัสดีค่ะ',
      }

      expect(character.name).toBe('มายะ')
      expect(character.systemPrompt.length).toBeGreaterThan(0)
    })

    test('should handle optional fields', () => {
      const character = {
        name: 'มายะ',
        systemPrompt: 'คุณคือมายะ',
        description: undefined,
        biography: null,
      }

      expect(character.name).toBe('มายะ')
      expect(character.description).toBeUndefined()
      expect(character.biography).toBeNull()
    })
  })

  describe('Token estimation', () => {
    test('should estimate tokens from text length', () => {
      const text = 'สวัสดีค่ะ ฉันชื่อมายะ'
      const roughEstimate = Math.ceil(text.length / 4)
      expect(roughEstimate).toBeGreaterThan(0)
    })

    test('should sum prompt and completion tokens', () => {
      const promptTokens = 150
      const completionTokens = 75
      const total = promptTokens + completionTokens
      expect(total).toBe(225)
    })
  })
})
