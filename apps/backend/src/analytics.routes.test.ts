import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { analyticsRoutes } from './analytics.routes'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'frontend analytics events')
const analyticsRouteUserId = '990e8400-e29b-41d4-a716-446655440001'

async function cleanup() {
  await prisma?.analyticsEvent.deleteMany({ where: { userId: analyticsRouteUserId } })
  await prisma?.user.deleteMany({ where: { id: analyticsRouteUserId } })
}

describe('frontend analytics routes', () => {
  beforeAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
    await prisma!.user.create({
      data: {
        id: analyticsRouteUserId,
        email: 'analytics-route@maprang.io',
        username: 'AnalyticsRoute',
      },
    })
  })

  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
  })

  test('persists sanitized frontend process-mining events', async () => {
    if (!(await shouldRunDbTest())) return

    const response = await analyticsRoutes.handle(
      new Request('http://localhost/analytics/events', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': analyticsRouteUserId,
        },
        body: JSON.stringify({
          eventName: 'marketplace_view',
          route: '/',
          entityType: 'surface',
          entityId: 'explore',
          metadata: {
            tab: 'popular',
            prompt: 'OPENROUTER_API_KEY=sk-or-v1-secret',
          },
        }),
      }),
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as { ok: boolean; eventId: string }
    expect(payload.ok).toBe(true)
    expect(payload.eventId).toBeTruthy()

    const event = await prisma!.analyticsEvent.findUniqueOrThrow({ where: { id: payload.eventId } })
    expect(event.userId).toBe(analyticsRouteUserId)
    expect(event.eventName).toBe('marketplace_view')
    expect(event.source).toBe('frontend')
    expect(event.route).toBe('/')
    expect(JSON.stringify(event.metadata)).toContain('[REDACTED_SECRET]')
  })

  test('rejects unknown frontend event names before persistence', async () => {
    const response = await analyticsRoutes.handle(
      new Request('http://localhost/analytics/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventName: 'unknown_event' }),
      }),
    )

    expect(response.status).toBe(422)
  })
})
