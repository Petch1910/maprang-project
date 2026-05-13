import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
type CoverageLevel = 'smoke' | 'e2e' | 'backend-test' | 'live-smoke' | 'admin-smoke' | 'manual-production'

type RouteKey = `${HttpMethod} ${string}`

type RouteCoverage = {
  owner: string
  coverage: CoverageLevel[]
  note: string
}

const routeFiles = [
  'apps/backend/src/admin.routes.ts',
  'apps/backend/src/character.routes.ts',
  'apps/backend/src/chat.routes.ts',
  'apps/backend/src/health.routes.ts',
  'apps/backend/src/lore.routes.ts',
  'apps/backend/src/report.routes.ts',
  'apps/backend/src/upload.routes.ts',
  'apps/backend/src/user.routes.ts',
]

const routeCoverage: Record<RouteKey, RouteCoverage> = {
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
    coverage: ['live-smoke', 'backend-test'],
    note: 'api:smoke:live verifies provider call; runtime tests cover relationship/scene state',
  },
  'POST /chat/stream': {
    owner: 'chat',
    coverage: ['backend-test', 'manual-production'],
    note: 'route shares chat body/auth path with POST /chat; manual QA covers streaming UX before release',
  },
  'GET /chats/:id/messages': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke and Chat Room browser smoke load seeded chat messages',
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
    coverage: ['e2e', 'backend-test'],
    note: 'browser smoke covers confirm delete and bulk delete; tests cover owner guard',
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
    coverage: ['e2e', 'backend-test'],
    note: 'browser smoke opens report dialog; persistence tests cover report creation and access guards',
  },
  'GET /admin/reports': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin and Moderation page smoke verify queue loading',
  },
  'PATCH /admin/reports/:id': {
    owner: 'moderation',
    coverage: ['backend-test'],
    note: 'report service tests cover status validation and audit logging',
  },
  'POST /admin/reports/:id/actions': {
    owner: 'moderation',
    coverage: ['backend-test'],
    note: 'report service tests cover hide character/archive message actions and audit logging',
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
    coverage: ['backend-test'],
    note: 'wallet/admin tests cover bounded adjustments and ledger records without spending production smoke data',
  },
  'GET /admin/audit-logs': {
    owner: 'admin',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin and Moderation page smoke verify audit logs',
  },
}

type DiscoveredRoute = {
  key: RouteKey
  file: string
}

const discoveredRoutes = await discoverRoutes()
const discoveredKeys = new Set(discoveredRoutes.map((route) => route.key))
const coveredKeys = new Set(Object.keys(routeCoverage) as RouteKey[])
const missingCoverage = discoveredRoutes.filter((route) => !coveredKeys.has(route.key))
const staleCoverage = [...coveredKeys].filter((key) => !discoveredKeys.has(key))
const weakCoverage = discoveredRoutes.filter((route) => {
  const coverage = routeCoverage[route.key]?.coverage ?? []
  return coverage.length === 0
})

const byOwner = new Map<string, number>()
for (const route of discoveredRoutes) {
  const owner = routeCoverage[route.key]?.owner ?? 'unknown'
  byOwner.set(owner, (byOwner.get(owner) ?? 0) + 1)
}

console.log(`API route audit: ${discoveredRoutes.length} routes discovered`)
for (const [owner, count] of [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`- ${owner}: ${count}`)
}

if (missingCoverage.length > 0) {
  console.error('API route audit failed: missing coverage map entries')
  for (const route of missingCoverage) console.error(`- ${route.key} (${route.file})`)
}

if (staleCoverage.length > 0) {
  console.error('API route audit failed: stale coverage map entries')
  for (const key of staleCoverage) console.error(`- ${key}`)
}

if (weakCoverage.length > 0) {
  console.error('API route audit failed: routes with no coverage levels')
  for (const route of weakCoverage) console.error(`- ${route.key}`)
}

if (missingCoverage.length > 0 || staleCoverage.length > 0 || weakCoverage.length > 0) {
  process.exit(1)
}

console.log('ok - backend API route audit passed')

async function discoverRoutes() {
  const routes: DiscoveredRoute[] = []
  const routePattern = /\.(get|post|patch|put|delete)\(\s*(['"`])([^'"`]+)\2/g

  for (const file of routeFiles) {
    const content = await readFile(join(root, file), 'utf8')
    for (const match of content.matchAll(routePattern)) {
      const method = match[1].toUpperCase() as HttpMethod
      const path = match[3]
      if (!path.startsWith('/')) continue
      routes.push({ key: `${method} ${path}`, file })
    }
  }

  return routes.sort((a, b) => a.key.localeCompare(b.key))
}
