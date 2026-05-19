import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { apiBaseUrl, isLocalSmokeTarget, readJson, smokeAuthHeaders } from './smoke-helpers'

type HealthPayload = {
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  security: { avatarStorage: 'local' | 'supabase' }
}

type SmokeCharacter = { id: string; name: string; tags: string[] }

type AvatarUploadPayload = {
  url: string
  filename: string
  provider: 'local' | 'supabase'
  access: 'local' | 'public' | 'signed'
  contentType: string
}

export function pickSmokeCharacter(characters: SmokeCharacter[] = []) {
  return (
    characters.find((character) => character.name.includes('MIKA')) ??
    characters.find((character) => character.name === 'Maprang') ??
    characters[0] ??
    null
  )
}

export function validateAvatarUpload(upload: AvatarUploadPayload, baseUrl: string) {
  if (upload.contentType !== 'image/png') throw new Error('Avatar upload returned an unexpected content type')
  if (!upload.access) throw new Error('Avatar upload response is missing storage access')
  if (!upload.url.startsWith(`${baseUrl}/uploads/avatars/`)) {
    throw new Error(`Avatar upload returned a non-backend URL: ${upload.url}`)
  }
}

export function buildLocalSmokeSummary(input: {
  apiBaseUrl: string
  health: HealthPayload
  smokeCharacter: SmokeCharacter
  loreCount: number
  previewTurns: number
  upload: AvatarUploadPayload
}) {
  return {
    ok: true,
    apiBaseUrl: input.apiBaseUrl,
    databaseConnected: input.health.checks.databaseConnected,
    openRouterConfigured: input.health.checks.openRouterConfigured,
    avatarStorage: input.health.security.avatarStorage,
    character: input.smokeCharacter.name,
    tags: input.smokeCharacter.tags,
    loreCount: input.loreCount,
    previewTurns: input.previewTurns,
    uploadProvider: input.upload.provider,
    uploadAccess: input.upload.access,
  }
}

export async function runLocalSmoke() {
  const health = await readJson<HealthPayload>('/health')

  if (!health.ok || !health.checks.databaseConnected) {
    throw new Error('Backend health check failed')
  }

  const characters = await readJson<{
    characters?: SmokeCharacter[]
  }>('/characters?view=admin&limit=10', {
    headers: smokeAuthHeaders(),
  })

  const smokeCharacter = pickSmokeCharacter(characters.characters)
  if (!smokeCharacter) throw new Error('No seeded smoke character was found')

  const lore = await readJson<{ loreEntries?: Array<{ id: string; keyword: string }> }>(`/characters/${smokeCharacter.id}/lore`)

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

  const upload = await readJson<AvatarUploadPayload>('/uploads/avatar', {
    method: 'POST',
    headers: smokeAuthHeaders(),
    body: form,
  })

  validateAvatarUpload(upload, apiBaseUrl)

  if (upload.provider === 'local' && isLocalSmokeTarget) {
    await unlink(join(import.meta.dir, '..', 'apps', 'backend', 'uploads', 'avatars', upload.filename)).catch(() => {})
  }

  console.log(
    JSON.stringify(
      buildLocalSmokeSummary({
        apiBaseUrl,
        health,
        smokeCharacter,
        loreCount: lore.loreEntries?.length ?? 0,
        previewTurns: preview.preview.turns.length,
        upload,
      }),
      null,
      2,
    ),
  )
}

if (import.meta.main) await runLocalSmoke()
