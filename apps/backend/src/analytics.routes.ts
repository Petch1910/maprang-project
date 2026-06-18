import { Elysia, t } from 'elysia'
import { recordAnalyticsEventSafe } from './analytics.service'
import { defaultUserId } from './config'
import { requireDatabase } from './db'
import { routeErrorResponse } from './route-guards'
import { resolveRequestUserId } from './security'

const analyticsEventNameSchema = t.Union([
  t.Literal('marketplace_view'),
  t.Literal('character_impression'),
  t.Literal('character_detail_view'),
  t.Literal('wallet_view'),
  t.Literal('creator_opened'),
  t.Literal('creator_draft_generated'),
  t.Literal('creator_publish'),
  t.Literal('ai_creator_opened'),
  t.Literal('ai_creator_generate_started'),
  t.Literal('report_opened'),
])

export const analyticsRoutes = new Elysia().post(
  '/analytics/events',
  async ({ body, request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const event = await recordAnalyticsEventSafe(
      {
        userId: await resolveRequestUserId(request, defaultUserId),
        chatId: body.chatId,
        characterId: body.characterId,
        eventName: body.eventName,
        source: 'frontend',
        route: body.route,
        entityType: body.entityType,
        entityId: body.entityId,
        metadata: body.metadata,
      },
      prisma,
    )

    if (!event) {
      set.status = 503
      return routeErrorResponse('analytics_event_failed')
    }

    set.status = 201
    return { ok: true, eventId: event.id }
  },
  {
    body: t.Object({
      eventName: analyticsEventNameSchema,
      route: t.Optional(t.String({ maxLength: 160 })),
      entityType: t.Optional(t.String({ maxLength: 80 })),
      entityId: t.Optional(t.String({ maxLength: 120 })),
      chatId: t.Optional(t.String({ maxLength: 80 })),
      characterId: t.Optional(t.String({ maxLength: 80 })),
      metadata: t.Optional(t.Record(t.String({ maxLength: 80 }), t.Unknown())),
    }),
  },
)
