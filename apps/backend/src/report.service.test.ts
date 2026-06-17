import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
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

    expect(
      validateReportInput({
        targetType: ReportTargetType.GENERATION_OUTPUT,
        reason: 'unsafe output',
      }),
    ).toBe('generation_output_id_required')
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

    expect(
      validateReportInput({
        targetType: ReportTargetType.GENERATION_OUTPUT,
        generationOutputId: "' OR 1=1 --",
        reason: 'unsafe output',
      }),
    ).toBe('invalid_generation_output_id')
  })

  test('validates admin report actions', () => {
    expect(validateReportAdminAction('HIDE_CHARACTER')).toBeNull()
    expect(validateReportAdminAction('ARCHIVE_MESSAGE')).toBeNull()
    expect(validateReportAdminAction('HIDE_GENERATION_OUTPUT')).toBeNull()
    expect(validateReportAdminAction('BANANA')).toBe('invalid_report_action')
  })

  test('admin report action source keeps target mutations, audit logs, and resolved status together', () => {
    const source = readFileSync(new URL('./report.service.ts', import.meta.url), 'utf8')

    expect(source).toContain("export type ReportAdminAction = 'HIDE_CHARACTER' | 'ARCHIVE_MESSAGE' | 'HIDE_GENERATION_OUTPUT'")
    expect(source).toContain('AdminAuditAction.HIDE_CHARACTER')
    expect(source).toContain('AdminAuditAction.ARCHIVE_MESSAGE')
    expect(source).toContain('AdminAuditAction.HIDE_GENERATION_OUTPUT')
    expect(source).toContain("targetType: 'CHARACTER'")
    expect(source).toContain("targetType: 'MESSAGE'")
    expect(source).toContain("targetType: 'GENERATION_OUTPUT'")
    expect(source).toContain('data: {')
    expect(source).toContain('visibility: Visibility.PRIVATE')
    expect(source).toContain('deletedAt: new Date()')
    expect(source).toContain('status: ReportStatus.RESOLVED')
    expect(source).toContain('reviewedAt: new Date()')
    expect(source.match(/createAdminAuditLog\(/g)?.length).toBeGreaterThanOrEqual(4)
  })
})
