import { describe, expect, test } from 'bun:test'
import { ReportTargetType } from '@prisma/client'
import { validateReportInput } from './report.service'

describe('report validation', () => {
  test('requires target ids for character and message reports', () => {
    expect(
      validateReportInput({
        targetType: ReportTargetType.CHARACTER,
        reason: 'unsafe content',
      }),
    ).toBe('character_id_required')

    expect(
      validateReportInput({
        targetType: ReportTargetType.MESSAGE,
        reason: 'unsafe message',
      }),
    ).toBe('message_id_required')
  })

  test('accepts valid report input', () => {
    expect(
      validateReportInput({
        targetType: ReportTargetType.CHARACTER,
        characterId: '11111111-1111-1111-1111-111111111111',
        reason: 'policy concern',
      }),
    ).toBeNull()
  })
})
