import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { apiBaseUrl, isLocalSmokeTarget, readJson, smokeAuthHeaders } from './smoke-helpers'

export type HealthPayload = {
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  security: { avatarStorage: 'local' | 'supabase' }
}

export type RootPayload = {
  ok: boolean
  service?: string
}

export type SmokeCharacter = { id: string; name: string; tags: string[] }

export type AvatarUploadPayload = {
  url: string
  filename: string
  provider: 'local' | 'supabase'
  access: 'local' | 'public' | 'signed'
  contentType: string
}

export type LocalSmokeJsonReader = <T>(path: string, init?: RequestInit) => Promise<T>

export type LocalSmokeRunnerOptions = {
  apiBaseUrl?: string
  isLocalTarget?: boolean
  readJson?: LocalSmokeJsonReader
  authHeaders?: () => Record<string, string>
  cleanupLocalUpload?: (filename: string) => Promise<void>
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
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

export function validateBackendRootIdentity(root: RootPayload) {
  if (!root.ok) throw new Error('Backend root identity returned ok=false')
  if (root.service !== 'maprang-backend') throw new Error('Backend root identity returned an unexpected service name')
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

export async function cleanupLocalAvatarUpload(filename: string) {
  await unlink(join(import.meta.dir, '..', 'apps', 'backend', 'uploads', 'avatars', filename)).catch(() => {})
}

export async function runLocalSmoke(options: LocalSmokeRunnerOptions = {}) {
  const currentApiBaseUrl = options.apiBaseUrl ?? apiBaseUrl
  const currentIsLocalTarget = options.isLocalTarget ?? isLocalSmokeTarget
  const jsonReader = options.readJson ?? readJson
  const authHeaders = options.authHeaders ?? smokeAuthHeaders
  const cleanupUpload = options.cleanupLocalUpload ?? cleanupLocalAvatarUpload
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  try {
    const root = await jsonReader<RootPayload>('/')
    validateBackendRootIdentity(root)

    const health = await jsonReader<HealthPayload>('/health')

    if (!health.ok || !health.checks.databaseConnected) {
      throw new Error('Backend health check failed')
    }

    const characters = await jsonReader<{
      characters?: SmokeCharacter[]
    }>('/characters?view=admin&limit=10', {
      headers: authHeaders(),
    })

    const smokeCharacter = pickSmokeCharacter(characters.characters)
    if (!smokeCharacter) throw new Error('No seeded smoke character was found')

    const lore = await jsonReader<{ loreEntries?: Array<{ id: string; keyword: string }> }>(`/characters/${smokeCharacter.id}/lore`)

    const preview = await jsonReader<{ preview?: { turns?: unknown[] } }>('/relationship/preview', {
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

    const upload = await jsonReader<AvatarUploadPayload>('/uploads/avatar', {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })

    validateAvatarUpload(upload, currentApiBaseUrl)

    if (upload.provider === 'local' && currentIsLocalTarget) {
      await cleanupUpload(upload.filename)
    }

    writeLine(
      JSON.stringify(
        buildLocalSmokeSummary({
          apiBaseUrl: currentApiBaseUrl,
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
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    writeError(`Local smoke failed: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runLocalSmoke())
