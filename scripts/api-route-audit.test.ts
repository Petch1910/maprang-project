import { describe, expect, test } from 'bun:test'
import {
  auditRouteCoverage,
  discoverRoutes,
  discoverRoutesFromSource,
  routeCoverage,
  runApiRouteAudit,
  type DiscoveredRoute,
  type RouteCoverage,
  type RouteKey,
} from './api-route-audit'

describe('api route audit', () => {
  test('discovers Elysia routes from source and ignores non-route paths', () => {
    const routes = discoverRoutesFromSource(
      'fixture.routes.ts',
      `
        export const routes = new Elysia()
          .get('/health', () => ({}))
          .post('/chat', () => ({}))
          .patch('/characters/:id', () => ({}))
          .get('relative-path', () => ({}))
      `,
    )

    expect(routes.map((route) => route.key)).toEqual(['GET /health', 'POST /chat', 'PATCH /characters/:id'])
  })

  test('reports missing, stale, and weak coverage entries', () => {
    const discoveredRoutes: DiscoveredRoute[] = [
      { key: 'GET /health', file: 'fixture.routes.ts' },
      { key: 'POST /chat', file: 'fixture.routes.ts' },
      { key: 'PATCH /characters/:id', file: 'fixture.routes.ts' },
    ]
    const coverage: Record<RouteKey, RouteCoverage> = {
      'GET /health': { owner: 'platform', coverage: ['smoke'], note: 'covered' },
      'PATCH /characters/:id': { owner: 'characters', coverage: [], note: 'weak coverage' },
      'DELETE /stale': { owner: 'old', coverage: ['smoke'], note: 'stale' },
    }

    const result = auditRouteCoverage(discoveredRoutes, coverage)

    expect(result.missingCoverage.map((route) => route.key)).toEqual(['POST /chat'])
    expect(result.staleCoverage).toEqual(['DELETE /stale'])
    expect(result.weakCoverage.map((route) => route.key)).toEqual(['PATCH /characters/:id'])
    expect(result.byOwner.get('platform')).toBe(1)
    expect(result.byOwner.get('unknown')).toBe(1)
  })

  test('covers the backend root identity route', () => {
    const routes = discoverRoutesFromSource(
      'apps/backend/index.ts',
      `
        export const app = new Elysia()
          .get('/', () => ({ ok: true, service: 'maprang-backend' }))
      `,
    )

    expect(routes.map((route) => route.key)).toEqual(['GET /'])
    expect(routeCoverage['GET /']).toMatchObject({ owner: 'platform' })
    expect(routeCoverage['GET /'].coverage).toEqual(expect.arrayContaining(['smoke', 'e2e']))
  })

  test('runs the committed API route audit through an importable runner', async () => {
    const routes = await discoverRoutes()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runApiRouteAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(routes.length).toBeGreaterThan(0)
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('API route audit:')
    expect(lines.at(-1)).toBe('ok - backend API route audit passed')
    expect(errors).toEqual([])
  })
})
