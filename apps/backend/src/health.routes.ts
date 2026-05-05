import { Elysia } from 'elysia'
import { loadHealthStatus } from './health.service'

export const healthRoutes = new Elysia().get('/health', async ({ set }) => {
  const health = await loadHealthStatus()
  if (!health.ok) set.status = 503
  return health
})
