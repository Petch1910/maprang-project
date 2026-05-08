import { describe, expect, test } from 'bun:test'
import { ReportTargetType } from '@prisma/client'
import { validateReportAdminAction, validateReportInput } from './report.service'

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
        characterId: '11111111-1111-4111-8111-111111111111',
        reason: 'policy concern',
      }),
    ).toBeNull()
  })

  test('rejects invalid target ids before persistence', () => {
    expect(
      validateReportInput({
        targetType: ReportTargetType.CHARACTER,
        characterId: "' OR 1=1 --",
        reason: 'policy concern',
      }),
    ).toBe('invalid_character_id')

    expect(
      validateReportInput({
        targetType: ReportTargetType.MESSAGE,
        messageId: "' OR 1=1 --",
        reason: 'unsafe message',
      }),
    ).toBe('invalid_message_id')
  })

  test('validates admin report actions', () => {
    expect(validateReportAdminAction('HIDE_CHARACTER')).toBeNull()
    expect(validateReportAdminAction('ARCHIVE_MESSAGE')).toBeNull()
    expect(validateReportAdminAction('BANANA')).toBe('invalid_report_action')
  })
})
