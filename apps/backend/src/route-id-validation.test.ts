import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { adminRoutes } from './admin.routes'
import { characterRoutes } from './character.routes'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import { loreRoutes } from './lore.routes'
import { reportRoutes } from './report.routes'
import { rejectInvalidUuid, routeErrorMessage, routeErrorResponse, safeRouteErrorSummary } from './route-guards'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'route id validation')
const adminKey = 'route-id-validation-admin-key'
let previousAdminKey: string | undefined

function request(path: string, options: { body?: unknown; method?: string; admin?: boolean } = {}) {
  const headers = new Headers()
  if (options.admin) headers.set('x-admin-key', adminKey)
  if (options.body !== undefined) headers.set('content-type', 'application/json')

  return new Request(`http://localhost${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

describe('route id validation', () => {
  beforeAll(async () => {
    previousAdminKey = process.env.ADMIN_API_KEY
    process.env.ADMIN_API_KEY = adminKey
  })

  afterAll(() => {
    if (previousAdminKey === undefined) {
      delete process.env.ADMIN_API_KEY
    } else {
      process.env.ADMIN_API_KEY = previousAdminKey
    }
  })

  test('route id guard returns Thai-first validation messages without database work', () => {
    const set = { status: 200 }

    expect(rejectInvalidUuid("' OR 1=1 --", set, 'invalid_character_id')).toEqual({
      error: 'invalid_character_id',
      message: 'รหัสตัวละครไม่ถูกต้อง',
    })
    expect(set.status).toBe(400)
    expect(routeErrorMessage('invalid_parent_lore_id')).toBe('รหัสคลังความรู้หลักไม่ถูกต้อง')
    expect(routeErrorResponse('database_not_configured')).toEqual({
      error: 'database_not_configured',
      message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
    })
    expect(routeErrorResponse('chat_not_found')).toEqual({
      error: 'chat_not_found',
      message: 'ไม่พบแชทนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
    })
    expect(routeErrorResponse('character_not_found')).toEqual({
      error: 'character_not_found',
      message: 'ไม่พบตัวละครนี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
    })
    expect(routeErrorResponse('character_forbidden')).toEqual({
      error: 'character_forbidden',
      message: 'คุณไม่มีสิทธิ์จัดการตัวละครนี้',
    })
    expect(routeErrorResponse('lore_not_found')).toEqual({
      error: 'lore_not_found',
      message: 'ไม่พบคลังความรู้นี้ หรือคุณไม่มีสิทธิ์เข้าถึง',
    })
    expect(routeErrorResponse('lore_forbidden')).toEqual({
      error: 'lore_forbidden',
      message: 'คุณไม่มีสิทธิ์จัดการคลังความรู้ของตัวละครนี้',
    })
    expect(routeErrorResponse('report_not_found')).toEqual({
      error: 'report_not_found',
      message: 'ไม่พบรายงานนี้',
    })
    expect(routeErrorResponse('message_not_found')).toEqual({
      error: 'message_not_found',
      message: 'ไม่พบข้อความนี้ หรือคุณไม่มีสิทธิ์รายงาน',
    })
    expect(routeErrorResponse('admin_unauthorized')).toEqual({
      error: 'admin_unauthorized',
      message: 'กรุณาใช้สิทธิ์ผู้ดูแลเพื่อใช้งานส่วนนี้',
    })
    expect(routeErrorMessage('unknown_error')).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    expect(routeErrorMessage('new_unmapped_code')).toBe('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
  })

  test('route error log summary does not expose raw error messages', () => {
    expect(safeRouteErrorSummary(new Error('secret-like-url https://example.invalid?token=leak'))).toEqual({
      name: 'Error',
    })
    expect(safeRouteErrorSummary('plain failure')).toEqual({ type: 'string' })
  })

  test('returns Thai-first messages when lore persistence is unavailable', async () => {
    const previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    try {
      const response = await loreRoutes.handle(request('/characters/11111111-1111-4111-8111-111111111111/lore'))
      const body = (await response.json()) as { error: string; message: string }

      expect(response.status).toBe(503)
      expect(body).toEqual({
        error: 'database_not_configured',
        message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
      })
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl
      }
    }
  })

  test('returns Thai-first messages for report route access and persistence failures', async () => {
    const unauthorizedResponse = await reportRoutes.handle(request('/admin/reports'))
    const unauthorizedBody = (await unauthorizedResponse.json()) as { error: string; message: string }

    expect(unauthorizedResponse.status).toBe(401)
    expect(unauthorizedBody).toEqual({
      error: 'admin_unauthorized',
      message: 'กรุณาใช้สิทธิ์ผู้ดูแลเพื่อใช้งานส่วนนี้',
    })

    const previousDatabaseUrl = process.env.DATABASE_URL
    delete process.env.DATABASE_URL

    try {
      const response = await reportRoutes.handle(
        request('/reports', {
          method: 'POST',
          body: {
            targetType: 'CHARACTER',
            characterId: '11111111-1111-4111-8111-111111111111',
            reason: 'policy concern',
          },
        }),
      )
      const body = (await response.json()) as { error: string; message: string }

      expect(response.status).toBe(503)
      expect(body).toEqual({
        error: 'database_not_configured',
        message: 'ยังไม่ได้ตั้งค่าฐานข้อมูลสำหรับใช้งานส่วนนี้',
      })
    } finally {
      if (previousDatabaseUrl === undefined) {
        delete process.env.DATABASE_URL
      } else {
        process.env.DATABASE_URL = previousDatabaseUrl
      }
    }
  })

  test('rejects invalid character and lore ids before persistence errors', async () => {
    if (!(await shouldRunDbTest())) return

    const encodedInvalidId = encodeURIComponent("' OR 1=1 --")

    const characterResponse = await characterRoutes.handle(request(`/characters/${encodedInvalidId}`))
    expect(characterResponse.status).toBe(400)
    await expect(characterResponse.json()).resolves.toMatchObject({ error: 'invalid_character_id' })

    const loreResponse = await loreRoutes.handle(request(`/characters/${encodedInvalidId}/lore`))
    expect(loreResponse.status).toBe(400)
    await expect(loreResponse.json()).resolves.toMatchObject({ error: 'invalid_character_id' })

    const parentLoreResponse = await loreRoutes.handle(
      request('/characters/11111111-1111-4111-8111-111111111111/lore', {
        method: 'POST',
        body: {
          keyword: 'origin',
          content: 'test',
          parentLoreId: "' OR 1=1 --",
        },
      }),
    )
    expect(parentLoreResponse.status).toBe(400)
    await expect(parentLoreResponse.json()).resolves.toMatchObject({ error: 'invalid_parent_lore_id' })
  })

  test('rejects invalid report and admin user ids before persistence errors', async () => {
    if (!(await shouldRunDbTest())) return

    const reportCreateResponse = await reportRoutes.handle(
      request('/reports', {
        method: 'POST',
        body: {
          targetType: 'CHARACTER',
          characterId: "' OR 1=1 --",
          reason: 'policy concern',
        },
      }),
    )
    expect(reportCreateResponse.status).toBe(400)
    await expect(reportCreateResponse.json()).resolves.toMatchObject({ error: 'invalid_character_id' })

    const encodedInvalidId = encodeURIComponent("' OR 1=1 --")
    const reportAdminResponse = await reportRoutes.handle(
      request(`/admin/reports/${encodedInvalidId}`, {
        method: 'PATCH',
        admin: true,
        body: { status: 'REVIEWED' },
      }),
    )
    expect(reportAdminResponse.status).toBe(400)
    await expect(reportAdminResponse.json()).resolves.toMatchObject({ error: 'invalid_report_id' })

    const tokenResponse = await adminRoutes.handle(
      request(`/admin/users/${encodedInvalidId}/tokens`, {
        method: 'PATCH',
        admin: true,
        body: { amount: 10, reason: 'qa' },
      }),
    )
    expect(tokenResponse.status).toBe(400)
    await expect(tokenResponse.json()).resolves.toMatchObject({ error: 'invalid_user_id' })
  })
})
