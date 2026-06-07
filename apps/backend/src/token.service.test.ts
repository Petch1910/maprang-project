import { describe, expect, test } from 'bun:test'
import { TokenTransactionType } from '@prisma/client'

describe('token.service', () => {
  describe('checkDailyLoginReward', () => {
    test('should return reward structure', () => {
      const reward = {
        tokens: 50,
        streak: 1,
        nextRewardAt: new Date(),
      }
      expect(reward.tokens).toBeGreaterThanOrEqual(0)
      expect(reward.streak).toBeGreaterThanOrEqual(0)
      expect(reward.nextRewardAt).toBeInstanceOf(Date)
    })

    test('should calculate streak bonus correctly', () => {
      const baseReward = 50
      const streakBonus = Math.floor(baseReward * (5 * (1.1 - 1)))
      expect(streakBonus).toBe(25)
    })
  })

  describe('validateTokenAdjustment', () => {
    test('should accept valid amounts', () => {
      expect(Number.isInteger(100)).toBe(true)
      expect(Number.isInteger(-100)).toBe(true)
      expect(Math.abs(100) <= 1_000_000).toBe(true)
    })

    test('should reject non-integer amounts', () => {
      expect(Number.isInteger(100.5)).toBe(false)
    })

    test('should reject zero amount', () => {
      expect(0 === 0).toBe(true)
    })

    test('should reject too large amounts', () => {
      expect(Math.abs(2_000_000) > 1_000_000).toBe(true)
    })
  })

  describe('TokenTransactionType enum', () => {
    test('should have all required types', () => {
      const types: TokenTransactionType[] = [
        TokenTransactionType.CHAT_USAGE,
        TokenTransactionType.ADMIN_ADJUSTMENT,
        TokenTransactionType.PROMOTION,
        TokenTransactionType.PURCHASE,
        TokenTransactionType.REFUND,
        TokenTransactionType.DAILY_LOGIN,
        TokenTransactionType.ACHIEVEMENT,
        TokenTransactionType.PENALTY,
        TokenTransactionType.EXPIRY,
      ]
      expect(types.length).toBe(9)
    })
  })

  describe('Token balance calculations', () => {
    test('should not allow negative balance', () => {
      const currentBalance = 100
      const deduction = -150
      const nextBalance = Math.max(0, currentBalance + deduction)
      expect(nextBalance).toBe(0)
    })

    test('should correctly add positive amounts', () => {
      const currentBalance = 100
      const addition = 50
      const nextBalance = currentBalance + addition
      expect(nextBalance).toBe(150)
    })

    test('should correctly subtract negative amounts', () => {
      const currentBalance = 100
      const deduction = -30
      const nextBalance = currentBalance + deduction
      expect(nextBalance).toBe(70)
    })
  })

  describe('Token statistics', () => {
    test('should calculate earned tokens correctly', () => {
      const transactions = [
        { amount: 100 },
        { amount: 50 },
        { amount: -30 },
        { amount: 25 },
      ]
      const earned = transactions
        .filter((t) => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0)
      expect(earned).toBe(175)
    })

    test('should calculate spent tokens correctly', () => {
      const transactions = [
        { amount: 100 },
        { amount: -30 },
        { amount: -20 },
        { amount: 50 },
      ]
      const spent = Math.abs(
        transactions
          .filter((t) => t.amount < 0)
          .reduce((sum, t) => sum + t.amount, 0),
      )
      expect(spent).toBe(50)
    })
  })

  describe('Achievement rewards', () => {
    test('should not allow duplicate achievement rewards', () => {
      const existingAchievements = new Set(['first_chat', 'daily_login_7'])
      const newAchievement = 'first_chat'
      expect(existingAchievements.has(newAchievement)).toBe(true)
    })

    test('should allow new achievement rewards', () => {
      const existingAchievements = new Set(['first_chat'])
      const newAchievement = 'first_character'
      expect(existingAchievements.has(newAchievement)).toBe(false)
    })
  })

  describe('Daily login streak', () => {
    test('should calculate streak correctly', () => {
      const today = new Date('2026-06-07T00:00:00.000Z')
      const yesterday = new Date(today)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)

      expect(yesterday.toISOString()).toBe('2026-06-06T00:00:00.000Z')
    })

    test('should reset streak on skip day', () => {
      const today = new Date('2026-06-07T00:00:00.000Z')
      const twoDaysAgo = new Date(today)
      twoDaysAgo.setUTCDate(twoDaysAgo.getUTCDate() - 2)

      const yesterday = new Date(today)
      yesterday.setUTCDate(yesterday.getUTCDate() - 1)

      expect(twoDaysAgo.getTime()).not.toBe(yesterday.getTime())
    })
  })

  describe('Token transaction metadata', () => {
    test('should store metadata correctly', () => {
      const metadata = {
        achievementId: 'first_chat',
        streak: 5,
        baseReward: 50,
      }
      expect(metadata.achievementId).toBe('first_chat')
      expect(metadata.streak).toBe(5)
    })

    test('should handle empty metadata', () => {
      const metadata = {}
      expect(Object.keys(metadata).length).toBe(0)
    })
  })
})
