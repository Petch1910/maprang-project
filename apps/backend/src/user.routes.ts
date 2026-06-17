import { Elysia, t } from 'elysia'
import { defaultUserId } from './config'
import { requireDatabase } from './db'
import { routeErrorResponse } from './route-guards'
import { resolveRequestUserId } from './security'
import {
  deleteUserProviderKey,
  listUserProviderKeys,
  loadContentSettings,
  loadUsageSummary,
  loadUserPersona,
  upsertUserProviderKey,
  updateContentSettings,
  updateUserPersona,
} from './user.service'
import { processDailyLogin, getDailyLoginStats } from './daily-login.service'

const contentRatingSchema = t.Union([
  t.Literal('general'),
  t.Literal('teen_romance'),
  t.Literal('mature_18'),
  t.Literal('restricted_18'),
])

export const userRoutes = new Elysia()
  .get('/me/provider-keys', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const keys = await listUserProviderKeys(await resolveRequestUserId(request, defaultUserId))
    if (!keys) {
      set.status = 404
      return routeErrorResponse('user_not_found')
    }

    return { keys }
  })
  .put(
    '/me/provider-keys/:provider',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      try {
        const key = await upsertUserProviderKey(await resolveRequestUserId(request, defaultUserId), params.provider, body)
        if (!key) {
          set.status = 404
          return routeErrorResponse('user_not_found')
        }
        return { key }
      } catch (error) {
        set.status = 400
        return routeErrorResponse('provider_key_invalid')
      }
    },
    {
      params: t.Object({
        provider: t.String({ minLength: 1, maxLength: 40 }),
      }),
      body: t.Object({
        apiKey: t.String({ minLength: 1, maxLength: 8000 }),
      }),
    },
  )
  .delete(
    '/me/provider-keys/:provider',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      const result = await deleteUserProviderKey(await resolveRequestUserId(request, defaultUserId), params.provider)
      if (!result) {
        set.status = 404
        return routeErrorResponse('user_not_found')
      }
      return result
    },
    {
      params: t.Object({
        provider: t.String({ minLength: 1, maxLength: 40 }),
      }),
    },
  )
  .get('/me/usage', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const summary = await loadUsageSummary(await resolveRequestUserId(request, defaultUserId))
    if (!summary) {
      set.status = 404
      return routeErrorResponse('user_not_found')
    }

    return summary
  })
  .get('/me/content-settings', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const contentSettings = await loadContentSettings(await resolveRequestUserId(request, defaultUserId))
    if (!contentSettings) {
      set.status = 404
      return routeErrorResponse('user_not_found')
    }

    return { contentSettings }
  })
  .get('/me/persona', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const persona = await loadUserPersona(await resolveRequestUserId(request, defaultUserId))
    if (!persona) {
      set.status = 404
      return routeErrorResponse('user_not_found')
    }

    return { persona }
  })
  .patch(
    '/me/persona',
    async ({ body, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      const persona = await updateUserPersona(await resolveRequestUserId(request, defaultUserId), body)
      if (!persona) {
        set.status = 404
        return routeErrorResponse('user_not_found')
      }

      return { persona }
    },
    {
      body: t.Object({
        persona: t.String({ maxLength: 2000 }),
      }),
    },
  )
  .patch(
    '/me/content-settings',
    async ({ body, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      const contentSettings = await updateContentSettings(await resolveRequestUserId(request, defaultUserId), body)
      if (!contentSettings) {
        set.status = 404
        return routeErrorResponse('user_not_found')
      }

      return { contentSettings }
    },
    {
      body: t.Object({
        isAdult: t.Boolean(),
        maxRating: t.Optional(contentRatingSchema),
      }),
    },
  )
  .post('/me/daily-login', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const userId = await resolveRequestUserId(request, defaultUserId)

    try {
      const result = await processDailyLogin(userId)
      return result
    } catch (error) {
      set.status = 500
      return routeErrorResponse('daily_login_failed')
    }
  })
  .get('/me/daily-login-stats', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const userId = await resolveRequestUserId(request, defaultUserId)

    try {
      const stats = await getDailyLoginStats(userId)
      return stats
    } catch (error) {
      set.status = 500
      return routeErrorResponse('failed_to_load_stats')
    }
  })
