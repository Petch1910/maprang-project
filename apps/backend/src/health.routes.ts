import { Elysia } from 'elysia'
import { loadHealthStatus, loadReadinessStatus } from './health.service'

export const healthRoutes = new Elysia().get('/health', async ({ set }) => {
  const health = await loadHealthStatus()
  if (!health.ok) set.status = 503
  return health
}).get('/ready', async ({ set }) => {
  const readiness = await loadReadinessStatus()
  if (!readiness.ok) set.status = 503
  return readiness
})
