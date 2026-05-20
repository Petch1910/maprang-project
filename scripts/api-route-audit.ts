import { readFile, readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(import.meta.dir, '..')

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type CoverageLevel = 'smoke' | 'e2e' | 'backend-test' | 'live-smoke' | 'admin-smoke' | 'manual-production'

export type RouteKey = `${HttpMethod} ${string}`

export type RouteCoverage = {
  owner: string
  coverage: CoverageLevel[]
  note: string
}

const routeFileTargets = ['apps/backend/index.ts', 'apps/backend/src']

export const routeCoverage: Record<RouteKey, RouteCoverage> = {
  'GET /': {
    owner: 'platform',
    coverage: ['smoke', 'e2e'],
    note: 'api-smoke และ browser preflight ตรวจ root identity ของระบบหลังบ้านก่อนเช็คบริการที่ deploy',
  },
  'GET /health': {
    owner: 'platform',
    coverage: ['smoke', 'e2e'],
    note: 'smoke:doctor, smoke:ready, api-smoke และ browser preflight ตรวจสุขภาพบริการ',
  },
  'GET /ready': {
    owner: 'platform',
    coverage: ['smoke', 'manual-production'],
    note: 'smoke:ready และ production gate แบบเข้มตรวจความพร้อมก่อนปล่อยจริง',
  },
  'GET /me/usage': {
    owner: 'user/wallet',
    coverage: ['smoke', 'e2e'],
    note: 'api-smoke และหน้า Wallet ตรวจสรุปกระเป๋าโทเคนกับธุรกรรม',
  },
  'GET /me/content-settings': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, browser smoke และ user service tests ตรวจการจำค่าเรตเนื้อหา',
  },
  'PATCH /me/content-settings': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke เก็บค่าปัจจุบันไว้ และ browser smoke ตรวจการสลับโหมด teen/adult',
  },
  'GET /me/persona': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และหน้า Profile ตรวจ persona ที่บันทึกไว้',
  },
  'PATCH /me/persona': {
    owner: 'user/profile',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke ตรวจบันทึก/คืนค่า persona และ tests คุมความยาวสูงสุด',
  },
  'GET /creator/draft': {
    owner: 'creator',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ Creator Studio autosave smoke ตรวจ draft ที่บันทึกค้างไว้',
  },
  'PUT /creator/draft': {
    owner: 'creator',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke ตรวจบันทึก/ล้าง draft และ browser smoke ตรวจ autosave หลัง reload',
  },
  'POST /creator/ai-draft': {
    owner: 'creator',
    coverage: ['smoke', 'live-smoke', 'backend-test'],
    note: 'api-smoke ตรวจเนื้อหาร่าง; smoke:image:live ตรวจผู้ให้บริการสร้างรูปจริงเมื่อวงเงินและโควตาพร้อม',
  },
  'GET /relationship/presets': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke และ relationship engine tests ตรวจ preset ที่ส่งออกให้หน้าบ้าน',
  },
  'POST /relationship/preview': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke และ preview simulator tests ตรวจการจำลองแบบ sandbox',
  },
  'POST /relationship/validate': {
    owner: 'relationship',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke และ tag validation tests ตรวจ tag ที่ชนกันกับคำเตือนโหมดผู้ใหญ่',
  },
  'GET /characters': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Explore/Lobby browser smoke และ persistence tests ตรวจการมองเห็นตัวละคร',
  },
  'POST /characters': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ Creator Studio browser smoke สร้างแล้วล้างตัวละครทดสอบ',
  },
  'GET /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ Character Lobby browser smoke ตรวจสิทธิ์ public/owner',
  },
  'PATCH /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke แก้ตัวละครทดสอบ และ persistence tests ตรวจ owner/admin กับกรณีห้ามแก้',
  },
  'DELETE /characters/:id': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ Creator Studio smoke ลบตัวละครทดสอบ และ tests ตรวจสิทธิ์',
  },
  'POST /characters/:id/duplicate': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke ทำสำเนาตัวละครทดสอบ และ persistence tests ตรวจข้อจำกัดกับสิทธิ์เจ้าของ',
  },
  'POST /characters/:id/reset-prompt': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke reset prompt ของตัวละครทดสอบ และ character manager/service tests ตรวจพฤติกรรม reset',
  },
  'POST /characters/:id/favorite': {
    owner: 'characters',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke favorite/unfavorite ตัวละครทดสอบ และ persistence tests ตรวจการมองเห็นกับสิทธิ์เจ้าของ',
  },
  'POST /characters/:id/view': {
    owner: 'characters',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke เพิ่มยอดเข้าชมตัวละครทดสอบ และ Lobby/Explore smoke เปิดหน้าตัวละครจริง',
  },
  'GET /characters/:id/lore': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke อ่าน lore และ route id tests ตรวจ id ที่ไม่ถูกต้อง',
  },
  'POST /characters/:id/lore': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke สร้าง lore ทดสอบ และ lore manager/service tests ตรวจ owner write กับ parent id',
  },
  'PATCH /lore/:id': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke แก้ lore ทดสอบ และ lore manager/service tests ตรวจสิทธิ์แก้กับ id ที่ไม่ถูกต้อง',
  },
  'DELETE /lore/:id': {
    owner: 'lore',
    coverage: ['smoke', 'backend-test'],
    note: 'api-smoke ลบ lore ทดสอบ และ lore manager/service tests ตรวจสิทธิ์ soft delete',
  },
  'GET /chats': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, My Chats browser smoke และ persistence tests ตรวจรายการแชท active/archived',
  },
  'POST /chat': {
    owner: 'chat',
    coverage: ['smoke', 'live-smoke', 'backend-test'],
    note: 'api-smoke ตรวจ validation path ที่ไม่หักโทเคน; api:smoke:live ตรวจการเรียกผู้ให้บริการจริง; runtime tests ตรวจสถานะ relationship/scene',
  },
  'POST /chat/stream': {
    owner: 'chat',
    coverage: ['smoke', 'backend-test', 'manual-production'],
    note: 'api-smoke ตรวจรูปแบบ SSE บน validation path โดยไม่ใช้โทเคนผู้ให้บริการ; manual QA ตรวจ UX สตรีมจริงก่อนปล่อย',
  },
  'GET /chats/:id/messages': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ Chat Room browser smoke โหลดข้อความแชทจาก seed',
  },
  'GET /chats/:id/world-state': {
    owner: 'chat/context',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Chat Room browser smoke และ route security tests ตรวจการอ่าน world state',
  },
  'PATCH /chats/:id/world-state': {
    owner: 'chat/context',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke, Chat Room browser smoke และ persistence tests ตรวจการอัปเดต world state ตามเจ้าของ',
  },
  'PATCH /chats/:id': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ browser smoke ตรวจเปลี่ยนชื่อแชทใน sidebar กับ My Chats',
  },
  'PATCH /chats/:id/archive': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ browser smoke ตรวจเก็บแชททั้งรายการเดียวและหลายรายการ',
  },
  'PATCH /chats/:id/restore': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และ browser smoke ตรวจคืนค่าแชททั้งรายการเดียวและหลายรายการ',
  },
  'DELETE /chats/:id': {
    owner: 'chat',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke ตรวจ invalid-id แบบไม่ลบข้อมูล; browser smoke ตรวจ confirm delete กับ bulk delete; tests ตรวจ owner guard',
  },
  'POST /uploads/avatar': {
    owner: 'storage',
    coverage: ['smoke', 'backend-test'],
    note: 'smoke:local อัปโหลดรูปตัวละคร PNG/WebP และ upload route tests ตรวจชนิดไฟล์ที่ไม่รองรับ',
  },
  'GET /uploads/avatars/:filename': {
    owner: 'storage',
    coverage: ['smoke', 'backend-test'],
    note: 'smoke:local ดึง URL รูปตัวละคร และ supabase:storage:check ตรวจ signed URL',
  },
  'POST /reports': {
    owner: 'moderation',
    coverage: ['smoke', 'e2e', 'backend-test'],
    note: 'api-smoke ตรวจ invalid-id แบบไม่สร้างข้อมูล; browser smoke เปิด report dialog; persistence tests ตรวจสร้างรายงานกับ access guard',
  },
  'GET /admin/reports': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin และหน้า Moderation ตรวจการโหลดคิวรายงาน',
  },
  'PATCH /admin/reports/:id': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin ตรวจ invalid-id แบบไม่แก้ข้อมูล; report service tests ตรวจเปลี่ยนสถานะกับ audit log',
  },
  'POST /admin/reports/:id/actions': {
    owner: 'moderation',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin ตรวจ invalid-id แบบไม่แก้ข้อมูล; report service tests ตรวจซ่อนตัวละคร/เก็บข้อความกับ audit log',
  },
  'GET /admin/summary': {
    owner: 'admin',
    coverage: ['admin-smoke', 'e2e'],
    note: 'api-smoke --require-admin และ Admin Health/Moderation smoke ตรวจ admin guard',
  },
  'POST /admin/prompt-inspector': {
    owner: 'admin/context',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke ตรวจ snapshot/diff ของ prompt ที่ปิดข้อมูลลับแล้ว; backend tests ตรวจ redaction, section accounting และ admin guard',
  },
  'GET /admin/evals/local': {
    owner: 'admin/evals',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke และหน้า Admin Evals ตรวจ eval แบบ deterministic ของ prompt/context หลัง admin auth',
  },
  'PATCH /admin/users/:id/tokens': {
    owner: 'wallet/admin',
    coverage: ['admin-smoke', 'backend-test'],
    note: 'api-smoke --require-admin ตรวจ invalid-id แบบไม่แก้ข้อมูล; wallet/admin tests ตรวจการปรับโทเคนแบบมีขอบเขตกับ ledger โดยไม่ใช้ข้อมูล production smoke',
  },
  'GET /admin/audit-logs': {
    owner: 'admin',
    coverage: ['admin-smoke', 'e2e', 'backend-test'],
    note: 'api-smoke --require-admin และหน้า Moderation ตรวจ audit logs',
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

function normalizeRepoPath(value: string) {
  return value.replaceAll('\\', '/')
}

function shouldScanRouteFile(file: string) {
  const normalized = normalizeRepoPath(file)
  return normalized === 'apps/backend/index.ts' || /\.routes\.tsx?$/.test(normalized)
}

async function collectRouteFilesFromTarget(target: string, rootDir: string): Promise<string[]> {
  const absoluteTarget = join(rootDir, target)
  const targetStat = await stat(absoluteTarget)
  if (targetStat.isFile()) return shouldScanRouteFile(target) ? [normalizeRepoPath(target)] : []
  if (!targetStat.isDirectory()) return []

  const entries = await readdir(absoluteTarget, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const absoluteEntry = join(absoluteTarget, entry.name)
      const relativeEntry = normalizeRepoPath(relative(rootDir, absoluteEntry))
      if (entry.isDirectory()) return collectRouteFilesFromTarget(relativeEntry, rootDir)
      return shouldScanRouteFile(relativeEntry) ? [relativeEntry] : []
    }),
  )
  return nested.flat()
}

export async function collectRouteFiles(rootDir = root, targets = routeFileTargets) {
  return [...new Set((await Promise.all(targets.map((target) => collectRouteFilesFromTarget(target, rootDir)))).flat())].sort()
}

export async function discoverRoutes(files?: string[], rootDir = root) {
  const routeFiles = files ?? (await collectRouteFiles(rootDir))
  const routes: DiscoveredRoute[] = []

  for (const file of routeFiles) {
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

  writeLine(`API route audit: พบ ${discoveredRoutes.length} routes`)
  for (const [owner, count] of [...byOwner.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    writeLine(`- ${owner}: ${count}`)
  }

  if (missingCoverage.length > 0) {
    writeError('API route audit ไม่ผ่าน: มี route ที่ยังไม่มี coverage map')
    for (const route of missingCoverage) writeError(`- ${route.key} (${route.file})`)
  }

  if (staleCoverage.length > 0) {
    writeError('API route audit ไม่ผ่าน: coverage map มี route เก่าที่ไม่เจอใน source')
    for (const key of staleCoverage) writeError(`- ${key}`)
  }

  if (weakCoverage.length > 0) {
    writeError('API route audit ไม่ผ่าน: มี route ที่ยังไม่มีระดับ coverage')
    for (const route of weakCoverage) writeError(`- ${route.key}`)
  }

  if (missingCoverage.length > 0 || staleCoverage.length > 0 || weakCoverage.length > 0) {
    return 1
  }

  writeLine('ผ่าน - backend API route audit ผ่านแล้ว')
  return 0
}

if (import.meta.main) process.exit(await runApiRouteAudit())
