import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { storageProvider } from './config'

export const uploadRoot = join(dirname(fileURLToPath(import.meta.url)), '..', 'uploads', 'avatars')
export const maxAvatarBytes = 2 * 1024 * 1024
export const supabaseSignedUrlExpiresInSeconds = Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN ?? 3600)
export const supabaseStorageAccess =
  process.env.SUPABASE_STORAGE_ACCESS === 'public' || process.env.SUPABASE_STORAGE_ACCESS === 'signed'
    ? process.env.SUPABASE_STORAGE_ACCESS
    : 'signed'

export const allowedAvatarTypes = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
])

export function safeAvatarFilename(filename: string) {
  return /^[a-z0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename) ? filename : null
}

export function avatarExtension(file: File) {
  const extension = allowedAvatarTypes.get(file.type) ?? extname(file.name).toLowerCase()
  if (!allowedAvatarTypes.has(file.type) || !['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) return null
  return extension === '.jpeg' ? '.jpg' : extension
}

export function avatarUrl(origin: string, filename: string) {
  return `${origin}/uploads/avatars/${filename}`
}

function supabaseStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET
  if (!supabaseUrl || !serviceRoleKey || !bucket) throw new Error('Supabase storage is not configured')
  return { supabaseUrl, serviceRoleKey, bucket }
}

async function uploadLocalAvatar({ bytes, filename }: { bytes: Uint8Array; filename: string }) {
  await mkdir(uploadRoot, { recursive: true })
  await writeFile(join(uploadRoot, filename), bytes)
}

async function uploadSupabaseAvatar({
  bytes,
  contentType,
  filename,
}: {
  bytes: Uint8Array
  contentType: string
  filename: string
}) {
  const { supabaseUrl, serviceRoleKey, bucket } = supabaseStorageConfig()

  const objectPath = `avatars/${filename}`
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Cache-Control': '3600',
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: bytes,
  })
  if (!response.ok) throw new Error(`Supabase avatar upload failed with status ${response.status}`)

  return objectPath
}

export async function resolveAvatarLocation(filename: string) {
  if (storageProvider === 'local') return { type: 'local' as const, path: join(uploadRoot, filename) }

  const { supabaseUrl, serviceRoleKey, bucket } = supabaseStorageConfig()
  const objectPath = `avatars/${filename}`
  if (supabaseStorageAccess === 'public') {
    return { type: 'redirect' as const, url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath}` }
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: supabaseSignedUrlExpiresInSeconds }),
  })
  if (!response.ok) throw new Error(`Supabase signed avatar URL failed with status ${response.status}`)

  const body = (await response.json()) as { signedURL?: string; signedUrl?: string }
  const signedPath = body.signedURL ?? body.signedUrl
  if (!signedPath) throw new Error('Supabase signed avatar URL response is missing signedURL')
  return {
    type: 'redirect' as const,
    url: signedPath.startsWith('http') ? signedPath : `${supabaseUrl}${signedPath}`,
  }
}

export async function uploadAvatarFile({ file, origin }: { file: File; origin: string }) {
  if (file.size > maxAvatarBytes) {
    return { ok: false as const, status: 413, error: 'avatar_too_large', maxBytes: maxAvatarBytes }
  }

  const extension = avatarExtension(file)
  if (!extension) return { ok: false as const, status: 415, error: 'avatar_type_not_supported' }

  const filename = `${crypto.randomUUID()}${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (storageProvider === 'supabase') {
    await uploadSupabaseAvatar({ bytes, contentType: file.type, filename })
  } else {
    await uploadLocalAvatar({ bytes, filename })
  }

  return {
    ok: true as const,
    url: avatarUrl(origin, filename),
    filename,
    provider: storageProvider,
    access: storageProvider === 'supabase' ? supabaseStorageAccess : 'local',
    size: file.size,
    contentType: file.type,
  }
}
