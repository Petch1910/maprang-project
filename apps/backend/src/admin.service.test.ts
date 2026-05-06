import { describe, expect, test } from 'bun:test'
import { validateTokenAdjustment } from './admin.service'

describe('admin token adjustment validation', () => {
  test('accepts bounded integer adjustments', () => {
    expect(validateTokenAdjustment(1000)).toBeNull()
    expect(validateTokenAdjustment(-1000)).toBeNull()
  })

  test('rejects empty, fractional, and very large adjustments', () => {
    expect(validateTokenAdjustment(0)).toBe('amount_required')
    expect(validateTokenAdjustment(1.5)).toBe('amount_must_be_integer')
    expect(validateTokenAdjustment(1_000_001)).toBe('amount_too_large')
  })
})
