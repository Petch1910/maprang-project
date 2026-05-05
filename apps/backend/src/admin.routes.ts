import { Elysia } from 'elysia'
import { loadAdminSummary } from './admin.service'
import { requireDatabase } from './db'
import { requireAdminApiKey } from './security'

export const adminRoutes = new Elysia().get('/admin/summary', async ({ request, set }) => {
  if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

  const prisma = requireDatabase(set)
  if (!prisma) return { error: 'ยังไม่ได้ตั้งค่า DATABASE_URL' }

  const summary = await loadAdminSummary()
  if (!summary) {
    set.status = 503
    return { error: 'โหลด dashboard summary ไม่สำเร็จ' }
  }

  return summary
})
