import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  auditFrontendApiCalls,
  auditRouteCoverage,
  collectFrontendApiCallsFromSource,
  collectRouteFiles,
  discoverRoutes,
  discoverRoutesFromSource,
  routeCoverage,
  runApiRouteAudit,
  type DiscoveredRoute,
  type RouteCoverage,
  type RouteKey,
} from './api-route-audit'

describe('api route audit', () => {
  test('collects backend index and route files automatically', async () => {
    const root = await mkdtemp(join(tmpdir(), 'maprang-api-route-audit-'))
    try {
      await mkdir(join(root, 'apps/backend/src/nested'), { recursive: true })
      await writeFile(join(root, 'apps/backend/index.ts'), 'new Elysia().get("/", () => ({}))')
      await writeFile(join(root, 'apps/backend/src/chat.routes.ts'), 'new Elysia().post("/chat", () => ({}))')
      await writeFile(join(root, 'apps/backend/src/nested/lore.routes.ts'), 'new Elysia().get("/lore", () => ({}))')
      await writeFile(join(root, 'apps/backend/src/not-a-route.ts'), 'new Elysia().get("/hidden", () => ({}))')

      expect(await collectRouteFiles(root)).toEqual([
        'apps/backend/index.ts',
        'apps/backend/src/chat.routes.ts',
        'apps/backend/src/nested/lore.routes.ts',
      ])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test('discovers Elysia routes from source and ignores non-route paths', () => {
    const routes = discoverRoutesFromSource(
      'fixture.routes.ts',
      `
        export const routes = new Elysia()
          .get(
            '/health',
            () => ({})
          )
          .post('/chat', () => ({}))
          .patch('/characters/:id', () => ({}))
          .get('relative-path', () => ({}))
      `,
    )

    expect(routes.map((route) => route.key)).toEqual(['GET /health', 'POST /chat', 'PATCH /characters/:id'])
  })

  test('discovers Elysia routes from top-level path constants', () => {
    const routes = discoverRoutesFromSource(
      'fixture.routes.ts',
      `
        const healthPath = '/health' as const
        const routePaths = {
          chat: '/chat',
          character: '/characters/:id',
        } as const

        export const routes = new Elysia()
          .get(healthPath, () => ({ ok: true }))
          .post(routePaths.chat, () => ({ ok: true }))
          .patch(routePaths['character'], () => ({ ok: true }))
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

  test('flags coverage quality for admin, live, manual-only, and empty-note routes', () => {
    const discoveredRoutes: DiscoveredRoute[] = [
      { key: 'GET /health', file: 'fixture.routes.ts' },
      { key: 'GET /ready', file: 'fixture.routes.ts' },
      { key: 'POST /chat', file: 'fixture.routes.ts' },
      { key: 'POST /chat/stream', file: 'fixture.routes.ts' },
      { key: 'POST /creator/ai-draft', file: 'fixture.routes.ts' },
      { key: 'GET /admin/reports', file: 'fixture.routes.ts' },
      { key: 'PATCH /characters/:id', file: 'fixture.routes.ts' },
      { key: 'GET /empty-note', file: 'fixture.routes.ts' },
    ]
    const coverage: Record<RouteKey, RouteCoverage> = {
      'GET /health': { owner: 'platform', coverage: ['smoke'], note: 'covered' },
      'GET /ready': { owner: 'platform', coverage: ['manual-production'], note: 'manual only is too weak' },
      'POST /chat': { owner: 'chat', coverage: ['smoke'], note: 'missing live smoke' },
      'POST /chat/stream': { owner: 'chat', coverage: ['smoke'], note: 'missing stream live smoke' },
      'POST /creator/ai-draft': { owner: 'creator', coverage: ['smoke'], note: 'missing live smoke' },
      'GET /admin/reports': { owner: 'moderation', coverage: ['backend-test'], note: 'missing admin smoke' },
      'PATCH /characters/:id': { owner: 'characters', coverage: [], note: 'no coverage level' },
      'GET /empty-note': { owner: 'platform', coverage: ['smoke'], note: '   ' },
    }

    const result = auditRouteCoverage(discoveredRoutes, coverage)

    expect(result.missingCoverage).toEqual([])
    expect(result.staleCoverage).toEqual([])
    expect(result.weakCoverage.map((route) => route.key)).toEqual([
      'GET /ready',
      'POST /chat',
      'POST /chat/stream',
      'POST /creator/ai-draft',
      'GET /admin/reports',
      'PATCH /characters/:id',
      'GET /empty-note',
    ])
    expect(result.weakCoverageIssues.map((issue) => [issue.route.key, issue.reasons])).toEqual([
      ['GET /ready', ['มีแค่ manual-production']],
      ['POST /chat', ['live-provider route ขาด live-smoke']],
      ['POST /chat/stream', ['live-provider route ขาด live-smoke']],
      ['POST /creator/ai-draft', ['live-provider route ขาด live-smoke']],
      ['GET /admin/reports', ['admin route ขาด admin-smoke']],
      ['PATCH /characters/:id', ['ไม่มีระดับ coverage']],
      ['GET /empty-note', ['coverage note ว่าง']],
    ])
  })

  test('collects frontend API helper calls with methods and dynamic ids', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        export function loadCharacter(characterId: string) {
          return requestJson<{ character: Character }>(\`/characters/\${characterId}\`)
        }
        export function saveContent() {
          return requestJson('/me/content-settings', { method: 'PATCH', body: '{}' })
        }
        export function listCharacters(params: URLSearchParams) {
          return requestJson(\`/characters?\${params.toString()}\`)
        }
        export function upload(formData: FormData) {
          return fetch(\`\${API_BASE_URL}/uploads/avatar\`, { method: 'POST', body: formData })
        }
        async function requestJson(path: string) {
          return fetch(\`\${API_BASE_URL}\${path}\`)
        }
      `,
    )

    expect(calls.map((call) => call.key)).toEqual([
      'GET /characters/:id',
      'PATCH /me/content-settings',
      'GET /characters',
      'POST /uploads/avatar',
    ])
  })

  test('collects frontend API helper calls from top-level route constants', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        const usagePath = '/me/usage' as const
        const characterPath = '/characters' as const
        const streamPath = '/chat/stream' as const

        export function loadUsage() {
          return requestJson(usagePath)
        }
        export function loadCharacter(characterId: string) {
          return requestJson(\`\${characterPath}/\${characterId}\`)
        }
        export function streamChat() {
          return fetch(\`\${API_BASE_URL}\${streamPath}\`, { method: 'POST' })
        }
      `,
    )

    expect(calls.map((call) => call.key)).toEqual(['GET /me/usage', 'GET /characters/:id', 'POST /chat/stream'])
  })

  test('collects frontend API helper method constants', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        const patchMethod = 'PATCH' as const
        const postMethod = 'POST' as const

        export function saveContent() {
          return requestJson('/me/content-settings', { method: patchMethod, body: '{}' })
        }
        export function streamChat() {
          return fetch(\`\${API_BASE_URL}/chat/stream\`, { method: postMethod })
        }
      `,
    )

    expect(calls.map((call) => call.key)).toEqual(['PATCH /me/content-settings', 'POST /chat/stream'])
  })

  test('collects frontend API helper route and method maps', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        const apiRoutes = {
          usage: '/me/usage',
          contentSettings: '/me/content-settings',
          chatStream: '/chat/stream',
        } as const
        const apiMethods = {
          patch: 'PATCH',
          post: 'POST',
        } as const

        export function loadUsage() {
          return requestJson(apiRoutes.usage)
        }
        export function saveContent() {
          return requestJson(apiRoutes['contentSettings'], { method: apiMethods.patch, body: '{}' })
        }
        export function streamChat() {
          return fetch(\`\${API_BASE_URL}\${apiRoutes.chatStream}\`, { method: apiMethods.post })
        }
      `,
    )

    expect(calls.map((call) => call.key)).toEqual([
      'GET /me/usage',
      'PATCH /me/content-settings',
      'POST /chat/stream',
    ])
  })

  test('collects frontend API helper fetch concatenation paths', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        const apiRoutes = {
          upload: '/uploads/avatar',
          character: '/characters',
          stream: '/chat/stream',
        } as const
        const postMethod = 'POST' as const

        export function upload() {
          return fetch(API_BASE_URL + apiRoutes.upload, { method: postMethod })
        }
        export function loadCharacter(characterId: string) {
          return fetch(API_BASE_URL + apiRoutes.character + '/' + characterId)
        }
        async function requestJson(path: string) {
          return fetch(API_BASE_URL + path)
        }
      `,
    )

    expect(calls.map((call) => call.key)).toEqual(['POST /uploads/avatar', 'GET /characters/:id'])
  })

  test('reports frontend API helper calls that do not match backend routes', () => {
    const calls = collectFrontendApiCallsFromSource(
      'apps/frontend/src/lib/api.ts',
      `
        export function loadHealth() {
          return requestJson('/health')
        }
        export function loadGhost() {
          return requestJson('/ghost')
        }
      `,
    )

    const missing = auditFrontendApiCalls(calls, [{ key: 'GET /health', file: 'apps/backend/src/health.routes.ts' }])

    expect(missing).toEqual([
      {
        key: 'GET /ghost',
        file: 'apps/frontend/src/lib/api.ts',
        line: 6,
      },
    ])
  })

  test('matches frontend dynamic id helpers to semantic backend route params', () => {
    const missing = auditFrontendApiCalls(
      [
        {
          key: 'PUT /me/provider-keys/:id',
          file: 'apps/frontend/src/lib/api.ts',
          line: 10,
        },
      ],
      [
        {
          key: 'PUT /me/provider-keys/:provider',
          file: 'apps/backend/src/user.routes.ts',
        },
      ],
    )

    expect(missing).toEqual([])
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

  test('keeps committed coverage notes Thai-first', () => {
    const notes = Object.values(routeCoverage)
      .map((entry) => entry.note)
      .join('\n')

    for (const staleSnippet of [
      'backend root identity endpoint is checked by',
      'deployed service sanity check',
      'browser smoke',
      'provider call; runtime tests cover relationship/scene state',
      'redacted prompt snapshots/diff; backend tests cover',
      'prompt/context regression checks behind admin auth',
      'prompt/context หลัง admin auth',
      'without spending provider tokens',
    ]) {
      expect(notes).not.toContain(staleSnippet)
    }

    expect(notes).toContain('preflight ฝั่งเบราว์เซอร์')
    expect(notes).toContain('การตรวจเบราว์เซอร์หน้า Chat Room')
    expect(notes).toContain('พรอมป์/บริบทหลัง admin auth')
  })

  test('runs the committed API route audit through an importable runner', async () => {
    const routes = await discoverRoutes()
    const lines: string[] = []
    const errors: string[] = []
    const exitCode = await runApiRouteAudit((line) => lines.push(line), (line) => errors.push(line))

    expect(routes.length).toBeGreaterThan(0)
    expect(exitCode).toBe(0)
    expect(lines[0]).toContain('ตรวจ API route: พบ')
    expect(lines[0]).toContain('รายการ')
    expect(lines[1]).toContain('ตรวจ frontend API helper: พบ')
    expect(lines[1]).toContain('รายการ')
    expect(lines[0]).not.toContain(' routes')
    expect(lines.at(-1)).toBe('ผ่าน - ตรวจ backend API route และ frontend API helper ผ่านแล้ว')
    expect(lines.join('\n')).not.toContain('API route audit:')
    expect(lines.join('\n')).not.toContain('backend API route audit')
    expect(errors).toEqual([])
  })
})
