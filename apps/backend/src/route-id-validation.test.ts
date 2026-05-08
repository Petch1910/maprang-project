import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { adminRoutes } from './admin.routes'
import { characterRoutes } from './character.routes'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import { loreRoutes } from './lore.routes'
import { reportRoutes } from './report.routes'

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
