import { Elysia, t } from 'elysia'
import { defaultUserId } from './config'
import { requireDatabase } from './db'
import { resolveRequestUserId } from './security'
import { loadContentSettings, loadUsageSummary, loadUserPersona, updateContentSettings, updateUserPersona } from './user.service'

const contentRatingSchema = t.Union([
  t.Literal('general'),
  t.Literal('teen_romance'),
  t.Literal('mature_18'),
  t.Literal('restricted_18'),
])

export const userRoutes = new Elysia()
  .get('/me/usage', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

    const summary = await loadUsageSummary(await resolveRequestUserId(request, defaultUserId))
    if (!summary) {
      set.status = 404
      return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
    }

    return summary
  })
  .get('/me/content-settings', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

    const contentSettings = await loadContentSettings(await resolveRequestUserId(request, defaultUserId))
    if (!contentSettings) {
      set.status = 404
      return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
    }

    return { contentSettings }
  })
  .get('/me/persona', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

    const persona = await loadUserPersona(await resolveRequestUserId(request, defaultUserId))
    if (!persona) {
      set.status = 404
      return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
    }

    return { persona }
  })
  .patch(
    '/me/persona',
    async ({ body, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

      const persona = await updateUserPersona(await resolveRequestUserId(request, defaultUserId), body)
      if (!persona) {
        set.status = 404
        return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
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
      if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

      const contentSettings = await updateContentSettings(await resolveRequestUserId(request, defaultUserId), body)
      if (!contentSettings) {
        set.status = 404
        return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
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
