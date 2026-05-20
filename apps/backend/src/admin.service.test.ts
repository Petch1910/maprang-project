import { describe, expect, test } from 'bun:test'
import { validateTokenAdjustment } from './admin.service'
import { routeErrorResponse } from './route-guards'

describe('admin token adjustment validation', () => {
  test('accepts bounded integer adjustments', () => {
    expect(validateTokenAdjustment(1000)).toBeNull()
    expect(validateTokenAdjustment(-1000)).toBeNull()
  })

  test('rejects empty, fractional, and very large adjustments', () => {
    expect(validateTokenAdjustment(0)).toBe('amount_required')
    expect(validateTokenAdjustment(1.5)).toBe('amount_must_be_integer')
    expect(validateTokenAdjustment(1_000_001)).toBe('amount_too_large')
    expect(routeErrorResponse('amount_required')).toEqual({
      error: 'amount_required',
      message: 'กรุณาระบุจำนวนโทเคนที่ต้องการปรับ',
    })
    expect(routeErrorResponse('insufficient_token_balance')).toEqual({
      error: 'insufficient_token_balance',
      message: 'ยอดโทเคนของผู้ใช้นี้ไม่พอสำหรับการปรับลด',
    })
  })
})
