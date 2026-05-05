import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { apiBaseUrl, isLocalSmokeTarget, readJson, smokeAuthHeaders } from './smoke-helpers'

const health = await readJson<{
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  security: { avatarStorage: 'local' | 'supabase' }
}>('/health')

if (!health.ok || !health.checks.databaseConnected) {
  throw new Error('Backend health check failed')
}

const characters = await readJson<{
  characters?: Array<{ id: string; name: string; tags: string[] }>
}>('/characters?view=admin&q=Maprang&limit=5', {
  headers: smokeAuthHeaders(),
})

const maprang = characters.characters?.find((character) => character.name === 'Maprang')
if (!maprang) throw new Error('Seeded Maprang character was not found')

const lore = await readJson<{ loreEntries?: Array<{ id: string; keyword: string }> }>(`/characters/${maprang.id}/lore`)

const preview = await readJson<{ preview?: { turns?: unknown[] } }>('/relationship/preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tags: ['friendly', 'slow-burn', 'trust-building'],
    messages: ['hello', 'thank you for listening'],
  }),
})

if (!preview.preview?.turns?.length) throw new Error('Relationship preview did not return turns')

const form = new FormData()
form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'qa.png', { type: 'image/png' }))

const upload = await readJson<{
  url: string
  filename: string
  provider: 'local' | 'supabase'
  access: 'local' | 'public' | 'signed'
  contentType: string
}>('/uploads/avatar', {
  method: 'POST',
  headers: smokeAuthHeaders(),
  body: form,
})

if (upload.contentType !== 'image/png') throw new Error('Avatar upload returned an unexpected content type')
if (!upload.access) throw new Error('Avatar upload response is missing storage access')
if (!upload.url.startsWith(`${apiBaseUrl}/uploads/avatars/`)) {
  throw new Error(`Avatar upload returned a non-backend URL: ${upload.url}`)
}

if (upload.provider === 'local' && isLocalSmokeTarget) {
  await unlink(join(import.meta.dir, '..', 'apps', 'backend', 'uploads', 'avatars', upload.filename)).catch(() => {})
}

console.log(
  JSON.stringify(
    {
      ok: true,
      apiBaseUrl,
      databaseConnected: health.checks.databaseConnected,
      openRouterConfigured: health.checks.openRouterConfigured,
      avatarStorage: health.security.avatarStorage,
      character: maprang.name,
      tags: maprang.tags,
      loreCount: lore.loreEntries?.length ?? 0,
      previewTurns: preview.preview.turns.length,
      uploadProvider: upload.provider,
      uploadAccess: upload.access,
    },
    null,
    2,
  ),
)
