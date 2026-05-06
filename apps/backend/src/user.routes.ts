import { Elysia } from 'elysia'
import { defaultUserId } from './config'
import { requireDatabase } from './db'
import { resolveRequestUserId } from './security'
import { loadUsageSummary } from './user.service'

export const userRoutes = new Elysia().get(
  '/me/usage',
  async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured', message: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

    const summary = await loadUsageSummary(await resolveRequestUserId(request, defaultUserId))
    if (!summary) {
      set.status = 404
      return { error: 'user_not_found', message: 'ไม่พบผู้ใช้นี้' }
    }

    return summary
  },
)
