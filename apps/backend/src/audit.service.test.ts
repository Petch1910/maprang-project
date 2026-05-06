import { AdminAuditAction } from '@prisma/client'
import { describe, expect, test } from 'bun:test'
import { sanitizeAuditTarget, validateAdminAuditInput } from './audit.service'

describe('admin audit validation', () => {
  test('requires target type and id', () => {
    expect(
      validateAdminAuditInput({
        action: AdminAuditAction.TOKEN_ADJUSTMENT,
        targetType: '',
        targetId: 'user-1',
      }),
    ).toBe('target_type_required')
    expect(
      validateAdminAuditInput({
        action: AdminAuditAction.TOKEN_ADJUSTMENT,
        targetType: 'USER',
        targetId: '',
      }),
    ).toBe('target_id_required')
  })

  test('trims and clips target values', () => {
    expect(sanitizeAuditTarget(`  ${'a'.repeat(120)}  `)).toHaveLength(80)
  })
})
