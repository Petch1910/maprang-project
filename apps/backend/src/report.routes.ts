import { ReportStatus, ReportTargetType } from '@prisma/client'
import { Elysia, t } from 'elysia'
import { requireDatabase } from './db'
import { applyReportAdminAction, createReport, listReports, updateReportStatus, type ReportAdminAction } from './report.service'
import { requireAdminApiKey, resolveRequestUserId } from './security'

const reportTargetTypeSchema = t.Union([t.Literal('CHARACTER'), t.Literal('MESSAGE')])
const reportStatusSchema = t.Union([
  t.Literal('PENDING'),
  t.Literal('REVIEWED'),
  t.Literal('RESOLVED'),
  t.Literal('REJECTED'),
])
const reportAdminActionSchema = t.Union([t.Literal('HIDE_CHARACTER'), t.Literal('ARCHIVE_MESSAGE')])

export const reportRoutes = new Elysia()
  .post(
    '/reports',
    async ({ body, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      const result = await createReport(
        {
          targetType: body.targetType as ReportTargetType,
          characterId: body.characterId,
          messageId: body.messageId,
          reason: body.reason,
          details: body.details,
          metadata: body.metadata as Record<string, unknown> | undefined,
        },
        await resolveRequestUserId(request),
      )

      if (!result) return { error: 'report_create_failed' }
      if ('error' in result) {
        const error = result.error ?? 'report_create_failed'
        set.status = error.endsWith('_not_found') ? 404 : 400
        return { error }
      }

      set.status = 201
      return result
    },
    {
      body: t.Object({
        targetType: reportTargetTypeSchema,
        characterId: t.Optional(t.String()),
        messageId: t.Optional(t.String()),
        reason: t.String({ minLength: 1 }),
        details: t.Optional(t.String()),
        metadata: t.Optional(t.Record(t.String(), t.Unknown())),
      }),
    },
  )
  .get(
    '/admin/reports',
    async ({ query, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      return {
        reports: await listReports({
          status: query.status as ReportStatus | undefined,
          targetType: query.targetType as ReportTargetType | undefined,
          limit: query.limit,
        }),
      }
    },
    {
      query: t.Object({
        status: t.Optional(reportStatusSchema),
        targetType: t.Optional(reportTargetTypeSchema),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .patch(
    '/admin/reports/:id',
    async ({ body, params, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      try {
        return { report: await updateReportStatus(params.id, body.status as ReportStatus) }
      } catch {
        set.status = 404
        return { error: 'report_not_found' }
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ status: reportStatusSchema }),
    },
  )
  .post(
    '/admin/reports/:id/actions',
    async ({ body, params, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      const result = await applyReportAdminAction(params.id, body.action as ReportAdminAction)
      if (!result) {
        set.status = 503
        return { error: 'database_not_configured' }
      }

      if ('error' in result) {
        set.status = result.error === 'report_not_found' ? 404 : 422
        return { error: result.error }
      }

      return result
    },
    {
      params: t.Object({ id: t.String() }),
      body: t.Object({ action: reportAdminActionSchema }),
    },
  )
