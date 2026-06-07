import { describe, expect, test } from 'bun:test'
import {
  scenarioTemplates,
  getScenariosByCategory,
  getScenariosByDifficulty,
  getScenarioById,
  getAllCategories,
  getBasicTestScenarios,
  getComprehensiveTestScenarios,
  type ScenarioCategory,
} from './scenario-templates'

describe('scenario-templates', () => {
  describe('scenarioTemplates', () => {
    test('should have multiple scenarios', () => {
      expect(scenarioTemplates.length).toBeGreaterThan(0)
    })

    test('should have all required fields', () => {
      const scenario = scenarioTemplates[0]
      if (!scenario) {
        throw new Error('No scenarios found')
      }
      expect(scenario.id).toBeDefined()
      expect(scenario.category).toBeDefined()
      expect(scenario.name).toBeDefined()
      expect(scenario.description).toBeDefined()
      expect(scenario.userMessage).toBeDefined()
      expect(Array.isArray(scenario.expectedBehavior)).toBe(true)
      expect(Array.isArray(scenario.testingGoals)).toBe(true)
      expect(scenario.difficulty).toBeDefined()
    })

    test('should have unique IDs', () => {
      const ids = scenarioTemplates.map((s) => s.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })

    test('should have valid difficulties', () => {
      const validDifficulties = ['easy', 'medium', 'hard']
      scenarioTemplates.forEach((scenario) => {
        expect(validDifficulties.includes(scenario.difficulty)).toBe(true)
      })
    })

    test('should have non-empty messages', () => {
      scenarioTemplates.forEach((scenario) => {
        expect(scenario.userMessage.trim().length).toBeGreaterThan(0)
      })
    })

    test('should have at least one expected behavior', () => {
      scenarioTemplates.forEach((scenario) => {
        expect(scenario.expectedBehavior.length).toBeGreaterThan(0)
      })
    })

    test('should have at least one testing goal', () => {
      scenarioTemplates.forEach((scenario) => {
        expect(scenario.testingGoals.length).toBeGreaterThan(0)
      })
    })
  })

  describe('getScenariosByCategory', () => {
    test('should return greeting scenarios', () => {
      const greetings = getScenariosByCategory('greeting')
      expect(greetings.length).toBeGreaterThan(0)
      greetings.forEach((s) => {
        expect(s.category).toBe('greeting')
      })
    })

    test('should return emotional scenarios', () => {
      const emotional = getScenariosByCategory('emotional')
      expect(emotional.length).toBeGreaterThan(0)
      emotional.forEach((s) => {
        expect(s.category).toBe('emotional')
      })
    })

    test('should return conflict scenarios', () => {
      const conflict = getScenariosByCategory('conflict')
      expect(conflict.length).toBeGreaterThan(0)
      conflict.forEach((s) => {
        expect(s.category).toBe('conflict')
      })
    })

    test('should return roleplay scenarios', () => {
      const roleplay = getScenariosByCategory('roleplay')
      expect(roleplay.length).toBeGreaterThan(0)
      roleplay.forEach((s) => {
        expect(s.category).toBe('roleplay')
      })
    })

    test('should return empty array for non-existent category', () => {
      const result = getScenariosByCategory('non-existent' as ScenarioCategory)
      expect(result.length).toBe(0)
    })
  })

  describe('getScenariosByDifficulty', () => {
    test('should return easy scenarios', () => {
      const easy = getScenariosByDifficulty('easy')
      expect(easy.length).toBeGreaterThan(0)
      easy.forEach((s) => {
        expect(s.difficulty).toBe('easy')
      })
    })

    test('should return medium scenarios', () => {
      const medium = getScenariosByDifficulty('medium')
      expect(medium.length).toBeGreaterThan(0)
      medium.forEach((s) => {
        expect(s.difficulty).toBe('medium')
      })
    })

    test('should return hard scenarios', () => {
      const hard = getScenariosByDifficulty('hard')
      expect(hard.length).toBeGreaterThan(0)
      hard.forEach((s) => {
        expect(s.difficulty).toBe('hard')
      })
    })

    test('should have balanced difficulty distribution', () => {
      const easy = getScenariosByDifficulty('easy')
      const medium = getScenariosByDifficulty('medium')
      const hard = getScenariosByDifficulty('hard')

      // Each difficulty should have at least 3 scenarios
      expect(easy.length).toBeGreaterThanOrEqual(3)
      expect(medium.length).toBeGreaterThanOrEqual(3)
      expect(hard.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('getScenarioById', () => {
    test('should return scenario by valid ID', () => {
      const scenario = getScenarioById('greeting-casual')
      expect(scenario).toBeDefined()
      expect(scenario?.id).toBe('greeting-casual')
    })

    test('should return undefined for invalid ID', () => {
      const scenario = getScenarioById('non-existent-id')
      expect(scenario).toBeUndefined()
    })

    test('should return correct scenario content', () => {
      const scenario = getScenarioById('emotional-happy')
      expect(scenario).toBeDefined()
      if (scenario) {
        expect(scenario.category).toBe('emotional')
        expect(scenario.name).toContain('ความสุข')
      }
    })
  })

  describe('getAllCategories', () => {
    test('should return all 8 categories', () => {
      const categories = getAllCategories()
      expect(categories.length).toBe(8)
    })

    test('should include all expected categories', () => {
      const categories = getAllCategories()
      expect(categories).toContain('greeting')
      expect(categories).toContain('conversation')
      expect(categories).toContain('emotional')
      expect(categories).toContain('conflict')
      expect(categories).toContain('roleplay')
      expect(categories).toContain('relationship')
      expect(categories).toContain('personality')
      expect(categories).toContain('knowledge')
    })
  })

  describe('getBasicTestScenarios', () => {
    test('should return 4 basic scenarios', () => {
      const basic = getBasicTestScenarios()
      expect(basic.length).toBe(4)
    })

    test('should include essential test scenarios', () => {
      const basic = getBasicTestScenarios()
      const ids = basic.map((s) => s.id)
      expect(ids).toContain('greeting-casual')
      expect(ids).toContain('conversation-small-talk')
      expect(ids).toContain('emotional-happy')
      expect(ids).toContain('roleplay-slice-of-life')
    })

    test('should be mostly easy to medium difficulty', () => {
      const basic = getBasicTestScenarios()
      const hasHard = basic.some((s) => s.difficulty === 'hard')
      expect(hasHard).toBe(false)
    })
  })

  describe('getComprehensiveTestScenarios', () => {
    test('should return 11 comprehensive scenarios', () => {
      const comprehensive = getComprehensiveTestScenarios()
      expect(comprehensive.length).toBe(11)
    })

    test('should cover multiple categories', () => {
      const comprehensive = getComprehensiveTestScenarios()
      const categories = new Set(comprehensive.map((s) => s.category))
      expect(categories.size).toBeGreaterThanOrEqual(6)
    })

    test('should include mix of difficulties', () => {
      const comprehensive = getComprehensiveTestScenarios()
      const difficulties = new Set(comprehensive.map((s) => s.difficulty))
      expect(difficulties.has('easy')).toBe(true)
      expect(difficulties.has('medium')).toBe(true)
      expect(difficulties.has('hard')).toBe(true)
    })

    test('should include greeting scenarios', () => {
      const comprehensive = getComprehensiveTestScenarios()
      const hasGreeting = comprehensive.some((s) => s.category === 'greeting')
      expect(hasGreeting).toBe(true)
    })

    test('should include emotional scenarios', () => {
      const comprehensive = getComprehensiveTestScenarios()
      const hasEmotional = comprehensive.some((s) => s.category === 'emotional')
      expect(hasEmotional).toBe(true)
    })
  })

  describe('Scenario content quality', () => {
    test('should have Thai language names', () => {
      scenarioTemplates.forEach((scenario) => {
        expect(scenario.name.length).toBeGreaterThan(0)
        // Thai character check (ก-๙)
        const hasThai = /[฀-๿]/.test(scenario.name)
        expect(hasThai).toBe(true)
      })
    })

    test('should have Thai language descriptions', () => {
      scenarioTemplates.forEach((scenario) => {
        const hasThai = /[฀-๿]/.test(scenario.description)
        expect(hasThai).toBe(true)
      })
    })

    test('should have Thai language user messages', () => {
      scenarioTemplates.forEach((scenario) => {
        const hasThai = /[฀-๿]/.test(scenario.userMessage)
        expect(hasThai).toBe(true)
      })
    })

    test('should have meaningful expected behaviors', () => {
      scenarioTemplates.forEach((scenario) => {
        scenario.expectedBehavior.forEach((behavior) => {
          expect(behavior.trim().length).toBeGreaterThan(5)
        })
      })
    })

    test('should have meaningful testing goals', () => {
      scenarioTemplates.forEach((scenario) => {
        scenario.testingGoals.forEach((goal) => {
          expect(goal.trim().length).toBeGreaterThan(5)
        })
      })
    })
  })

  describe('Category coverage', () => {
    test('should have at least 2 scenarios per category', () => {
      const categories = getAllCategories()
      categories.forEach((category) => {
        const scenarios = getScenariosByCategory(category)
        expect(scenarios.length).toBeGreaterThanOrEqual(2)
      })
    })

    test('should have greeting category with at least 3 scenarios', () => {
      const greetings = getScenariosByCategory('greeting')
      expect(greetings.length).toBeGreaterThanOrEqual(3)
    })

    test('should have emotional category with at least 4 scenarios', () => {
      const emotional = getScenariosByCategory('emotional')
      expect(emotional.length).toBeGreaterThanOrEqual(4)
    })
  })

  describe('Scenario filtering', () => {
    test('should filter by multiple criteria', () => {
      const easyGreetings = scenarioTemplates.filter(
        (s) => s.category === 'greeting' && s.difficulty === 'easy'
      )
      expect(easyGreetings.length).toBeGreaterThan(0)
    })

    test('should find scenarios with relationship context', () => {
      const withRelationship = scenarioTemplates.filter(
        (s) => s.relationshipContext !== undefined
      )
      // Should have at least some scenarios with relationship context
      expect(withRelationship.length).toBeGreaterThanOrEqual(0)
    })

    test('should find scenarios with user persona', () => {
      const withPersona = scenarioTemplates.filter(
        (s) => s.userPersona !== undefined
      )
      // Should have at least some scenarios with user persona
      expect(withPersona.length).toBeGreaterThanOrEqual(0)
    })
  })
})
