import { Elysia, t } from 'elysia'
import { adjustUserTokenBalance, loadAdminSummary } from './admin.service'
import { requireDatabase } from './db'
import { requireAdminApiKey } from './security'

export const adminRoutes = new Elysia()
  .get('/admin/summary', async ({ request, set }) => {
    if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured' }

    const summary = await loadAdminSummary()
    if (!summary) {
      set.status = 503
      return { error: 'admin_summary_unavailable' }
    }

    return summary
  })
  .patch(
    '/admin/users/:id/tokens',
    async ({ body, params, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      const result = await adjustUserTokenBalance(params.id, body.amount)
      if (!result) {
        set.status = 503
        return { error: 'database_not_configured' }
      }

      if ('error' in result) {
        set.status = result.error === 'user_not_found' ? 404 : 422
        return { error: result.error }
      }

      return result
    },
    {
      body: t.Object({
        amount: t.Integer(),
        reason: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.String(),
      }),
    },
  )
