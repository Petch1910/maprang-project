import { unlink } from 'node:fs/promises'
import { join } from 'node:path'
import {
  apiBaseUrl,
  isLocalSmokeTarget,
  readJson,
  smokeAuthHeaders,
  validateBackendRootIdentity,
  type RootIdentityPayload,
} from './smoke-helpers'

export type HealthPayload = {
  ok: boolean
  checks: { databaseConnected: boolean; openRouterConfigured: boolean }
  security: { avatarStorage: 'local' | 'supabase' }
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
  if (upload.contentType !== 'image/png') throw new Error('อัปโหลด avatar คืน content type ไม่ถูกต้อง')
  if (!upload.access) throw new Error('ผลอัปโหลด avatar ไม่ระบุ storage access')
  if (!upload.url.startsWith(`${baseUrl}/uploads/avatars/`)) {
    throw new Error(`อัปโหลด avatar คืน URL ที่ไม่ได้มาจาก backend: ${upload.url}`)
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
    const root = await jsonReader<RootIdentityPayload>('/')
    validateBackendRootIdentity(root)

    const health = await jsonReader<HealthPayload>('/health')

    if (!health.ok || !health.checks.databaseConnected) {
      throw new Error('ตรวจสุขภาพ backend ไม่ผ่าน')
    }

    const characters = await jsonReader<{
      characters?: SmokeCharacter[]
    }>('/characters?view=admin&limit=10', {
      headers: authHeaders(),
    })

    const smokeCharacter = pickSmokeCharacter(characters.characters)
    if (!smokeCharacter) throw new Error('ไม่พบตัวละคร seed สำหรับ smoke')

    const lore = await jsonReader<{ loreEntries?: Array<{ id: string; keyword: string }> }>(`/characters/${smokeCharacter.id}/lore`)

    const preview = await jsonReader<{ preview?: { turns?: unknown[] } }>('/relationship/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tags: ['friendly', 'slow-burn', 'trust-building'],
        messages: ['hello', 'thank you for listening'],
      }),
    })

    if (!preview.preview?.turns?.length) throw new Error('Relationship preview ไม่คืน turn ทดสอบ')

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
    writeError(`ตรวจระบบ local ไม่ผ่าน: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runLocalSmoke())
