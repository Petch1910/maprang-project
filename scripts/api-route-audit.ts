import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type CoverageLevel = 'smoke' | 'e2e' | 'backend-test' | 'live-smoke' | 'admin-smoke' | 'manual-production'

export type RouteKey = `${HttpMethod} ${string}`

export type RouteCoverage = {
  owner: string
  coverage: CoverageLevel[]
  note: string
}

const routeFiles = [
  'apps/backend/index.ts',
  'apps/backend/src/admin.routes.ts',
  'apps/backend/src/character.routes.ts',
  'apps/backend/src/chat.routes.ts',
  'apps/backend/src/health.routes.ts',
  'apps/backend/src/lore.routes.ts',
  'apps/backend/src/report.routes.ts',
  'apps/backend/src/upload.routes.ts',
  'apps/backend/src/user.routes.ts',
]

export const routeCoverage: Record<RouteKey, RouteCoverage> = {
  'GET /': {
    owner: 'platform',
    coverage: ['smoke', 'e2e'],
    note: 'backend root identity endpoint is checked by API smoke and browser preflight as a deployed service sanity check',
  },
  'GET /health': {
    owner: 'platform',
    coverage: ['smoke', 'e2e'],
    note: 'checked by smoke:doctor, smoke:ready, api-smoke, and browser smoke preflight',
  },
  'GET /ready': {
    owner: 'platform',
    coverage: ['smoke', 'manual-production'],
    note: 'checked by smoke:ready and strict production gates',
  },
  'GET /me/usage': {
    owner: 'user/wallet',
    coverage: ['smoke', 'e2e'],
    note: 'api-smoke and Wallet page browser smoke verify wallet summary and transactions',
  },
  'GET /me/content-settings': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, browser smoke, and user service tests cover rating cap persistence',
  },
  'PATCH /me/content-settings': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke preserves current setting; browser smoke toggles teen/adult modes',
  },
  'GET /me/persona': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Profile page cover persisted persona',
  },
  'PATCH /me/persona': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke saves/restores persona and tests enforce max length',
  },
  'GET /creator/draft': {
    owner: 'creator',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Creator Studio autosave smoke verify draft persistence',
  },
  'PUT /creator/draft': {
    owner: 'creator',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke saves/clears draft; browser smoke verifies autosave after reload',
  },
  'POST /creator/ai-draft': {
    owner: 'creator',
    coverage: ['smoke', 'live-smoke', 'backend-test'],
    note: 'api-smoke verifies draft text; smoke:image:live verifies real image provider when billing/quota allows it',
  },
  'GET /relationship/presets': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke and relationship engine tests cover exported presets',
  },
  'POST /relationship/preview': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke and preview simulator tests cover sandbox simulation',
  },
  'POST /relationship/validate': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke and tag validation tests cover conflicts and adult-mode warnings',
  },
  'GET /characters': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Explore/Lobby browser smoke, and persistence tests cover visibility guards',
  },
  'POST /characters': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Creator Studio browser smoke create and clean up a temporary character',
  },
  'GET /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Character Lobby browser smoke cover public/owner access',
  },
  'PATCH /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke edits a temporary character; persistence tests cover owner/admin edits and forbidden edits',
  },
  'DELETE /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Creator Studio smoke delete temporary characters; tests cover authorization',
  },
  'POST /characters/:id/duplicate': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke duplicates a temporary character; persistence tests cover duplicate restrictions and owner access',
  },
  'POST /characters/:id/reset-prompt': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke resets a temporary character prompt; character manager and service tests cover reset behavior',
  },
  'POST /characters/:id/favorite': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke favorites/unfavorites a temporary character; persistence tests cover visibility and ownership paths',
  },
  'POST /characters/:id/view': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke increments a temporary character view; Lobby/explore route smoke opens characters',
  },
  'GET /characters/:id/lore': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke reads lore; route id tests cover invalid ids',
  },
  'POST /characters/:id/lore': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke creates temporary lore; lore manager/service tests cover owner writes and parent id validation',
  },
  'PATCH /lore/:id': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke updates temporary lore; lore manager/service tests cover update authorization and invalid ids',
  },
  'DELETE /lore/:id': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke deletes temporary lore; lore manager/service tests cover soft-delete authorization',
  },
  'GET /chats': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, My Chats browser smoke, and persistence tests cover active/archived lists',
  },
  'POST /chat': {
    owner: 'chat',
    coverage: ['smoke', 'live-smoke', 'backend-test'],
    note: 'api-smoke verifies uncharged validation path; api:smoke:live verifies provider call; runtime tests cover relationship/scene state',
  },
  'POST /chat/stream': {
    owner: 'chat',
    coverage: ['smoke', 'backend-test', 'manual-production'],
    note: 'api-smoke verifies SSE shape on the validation path without spending provider tokens; manual QA covers live streaming UX before release',
  },
  'GET /chats/:id/messages': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Chat Room browser smoke load seeded chat messages',
  },
  'GET /chats/:id/world-state': {
    owner: 'chat/context',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Chat Room browser smoke, and route security tests cover world state reads',
  },
  'PATCH /chats/:id/world-state': {
    owner: 'chat/context',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Chat Room browser smoke, and persistence tests cover owner-scoped world state updates',
  },
  'PATCH /chats/:id': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and browser smoke rename chats on sidebar and My Chats',
  },
  'PATCH /chats/:id/archive': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and browser smoke cover single and bulk archive',
  },
  'PATCH /chats/:id/restore': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and browser smoke cover single and bulk restore',
  },
  'DELETE /chats/:id': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke verifies non-mutating invalid-id validation; browser smoke covers confirm delete and bulk delete; tests cover owner guard',
  },
  'POST /uploads/avatar': {
    owner: 'storage',
    coverage: ['smoke', 'backend-test'],
    note: 'smoke:local uploads a PNG/WebP avatar; upload route tests cover invalid types',
  },
  'GET /uploads/avatars/:filename': {
    owner: 'storage',
    coverage: ['smoke', 'backend-test'],
    note: 'smoke:local fetches avatar URL; supabase:storage:check verifies signed URL fetch',
  },
  'POST /reports': {
    owner: 'moderation',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke verifies non-mutating invalid-id validation; browser smoke opens report dialog; persistence tests cover report creation and access guards',
  },
  'GET /admin/reports': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin and Moderation page smoke verify queue loading',
  },
  'PATCH /admin/reports/:id': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin verifies non-mutating invalid-id guard; report service tests cover status mutation and audit logging',
  },
  'POST /admin/reports/:id/actions': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin verifies non-mutating invalid-id guard; report service tests cover hide character/archive message actions and audit logging',
  },
  'GET /admin/summary': {
    owner: 'admin',
    coverage: ['admin-smoke', 'e2e'],
    note: 'api-smoke --require-admin and Admin Health/Moderation smoke verify admin guard',
  },
  'POST /admin/prompt-inspector': {
    owner: 'admin/context',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke verifies redacted prompt snapshots/diff; backend tests cover redaction, section accounting, and admin guard',
  },
  'GET /admin/evals/local': {
    owner: 'admin/evals',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Admin Evals page verify deterministic prompt/context regression checks behind admin auth',
  },
  'PATCH /admin/users/:id/tokens': {
    owner: 'wallet/admin',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin verifies non-mutating invalid-id guard; wallet/admin tests cover bounded adjustments and ledger records without spending production smoke data',
  },
  'GET /admin/audit-logs': {
    owner: 'admin',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin and Moderation page smoke verify audit logs',
  },
}

export type DiscoveredRoute = {
  key: RouteKey
  file: string
}

export function summarizeRoutesByOwner(discoveredRoutes: DiscoveredRoute[], coverage = routeCoverage) {
  const byOwner = new Map<string, number>()
  for (const route of discoveredRoutes) {
    const owner = coverage[route.key]?.owner ?? 'unknown'
    byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1)
  }
  return byOwner
}

export function auditRouteCoverage(discoveredRoutes: DiscoveredRoute[], coverage = routeCoverage) {
  const discoveredKeys = new Set(discoveredRoutes.map((route) => route.key))
  const coveredKeys = new Set(Object.keys(coverage) as RouteKey[])
  const missingCoverage = discoveredRoutes.filter((route) => !coveredKeys.has(route.key))
  const staleCoverage = [...coveredKeys].filter((key) => !discoveredKeys.has(key))
  const weakCoverage = discoveredRoutes.filter((route) => {
    const entry = coverage[route.key]
    if (!entry) return false
    const levels = entry.coverage
    return levels.length === 0
  })

  return {
    missingCoverage,
    staleCoverage,
    weakCoverage,
    byOwner: summarizeRoutesByOwner(discoveredRoutes, coverage),
  }
}

export function discoverRoutesFromSource(file: string, content: string) {
  const routes: DiscoveredRoute[] = []
  const routePattern = /\.(get|post|patch|put|delete)\(\s*(['"`])([^'"`]+)\2/g

  for (const match of content.matchAll(routePattern)) {
    const method = match[1].toUpperCase() as HttpMethod
    const path = match[3]
    if (!path.startsWith('/')) continue
    routes.push({ key: `${method} ${path}`, file })
  }

  return routes
}

export async function discoverRoutes(files = routeFiles, rootDir = root) {
  const routes: DiscoveredRoute[] = []

  for (const file of files) {
    const content = await readFile(join(rootDir, file), 'utf8')
    routes.push(...discoverRoutesFromSource(file, content))
  }

  return routes.sort((a, b) => a.key.localeCompare(b.key))
}

export async function runApiRouteAudit(
  writeLine: (line: string) => void = (line) => console.log(line),
  writeError: (line: string) => void = (line) => console.error(line),
) {
  const discoveredRoutes = await discoverRoutes()
  const { missingCoverage, staleCoverage, weakCoverage, byOwner } = auditRouteCoverage(discoveredRoutes)

  writeLine(`API route audit: ${discoveredRoutes.length} routes discovered`)
  for (const [owner, count] of [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    writeLine(`- ${owner}: ${count}`)
  }

  if (missingCoverage.length > 0) {
    writeError('API route audit failed: missing coverage map entries')
    for (const route of missingCoverage) writeError(`- ${route.key} (${route.file})`)
  }

  if (staleCoverage.length > 0) {
    writeError('API route audit failed: stale coverage map entries')
    for (const key of staleCoverage) writeError(`- ${key}`)
  }

  if (weakCoverage.length > 0) {
    writeError('API route audit failed: routes with no coverage levels')
    for (const route of weakCoverage) writeError(`- ${route.key}`)
  }

  if (missingCoverage.length > 0 || staleCoverage.length > 0 || weakCoverage.length > 0) {
    return 1
  }

  writeLine('ok - backend API route audit passed')
  return 0
}

if (import.meta.main) process.exit(await runApiRouteAudit())
