import { mkdir, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { storageProvider } from './config'

const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export const uploadRoot = join(backendRoot, 'uploads', 'avatars')
export const maxAvatarBytes = 2 * 1024 * 1024
export const localStorageFallbackEnabled = process.env.NODE_ENV !== 'production' && process.env.LOCAL_STORAGE_FALLBACK !== '0'
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

export const avatarStorageMessages = {
  fileRequired: 'กรุณาแนบไฟล์รูปตัวละครก่อนอัปโหลด',
  typeNotSupported: 'รองรับเฉพาะรูป JPG, PNG, WebP หรือ GIF เท่านั้น',
  tooLarge: (maxBytes: number) => `รูปตัวละครใหญ่เกินไป ขนาดสูงสุดคือ ${Math.round(maxBytes / 1024 / 1024)} MB`,
  notFound: 'ไม่พบรูปตัวละครนี้',
  notConfigured: 'ยังไม่ได้ตั้งค่า Supabase Storage สำหรับรูปตัวละคร',
  uploadFailed: (status: number) => `อัปโหลดรูปตัวละครไป Supabase ไม่สำเร็จ สถานะ ${status}`,
  signedUrlFailed: (status: number) => `สร้างลิงก์รูปตัวละครแบบ signed URL ไม่สำเร็จ สถานะ ${status}`,
  signedUrlMissing: 'Supabase ไม่ได้ส่ง signed URL ของรูปตัวละครกลับมา',
  signedUrlMalformed: 'Supabase ส่งข้อมูล signed URL ของรูปตัวละครไม่ถูกต้อง',
  unavailable: 'พื้นที่เก็บรูปตัวละครยังไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ',
}

export const storageObjectMessages = {
  invalidPath: 'ตำแหน่งไฟล์ในพื้นที่เก็บข้อมูลไม่ถูกต้อง',
  notConfigured: 'ยังไม่ได้ตั้งค่า Supabase Storage สำหรับไฟล์นี้',
  signedUrlFailed: (status: number) => `สร้างลิงก์ไฟล์แบบ signed URL ไม่สำเร็จ สถานะ ${status}`,
  signedUrlMissing: 'Supabase ไม่ได้ส่ง signed URL ของไฟล์กลับมา',
  signedUrlMalformed: 'Supabase ส่งข้อมูล signed URL ของไฟล์ไม่ถูกต้อง',
}

export function safeAvatarFilename(filename: string) {
  return /^[a-z0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename) ? filename : null
}

export function safeStorageObjectPath(objectPath: string) {
  const normalized = objectPath.trim().replace(/^\/+/, '')
  if (!normalized || normalized.includes('..') || normalized.includes('\\')) return null
  return /^[a-z0-9][a-z0-9/_.,=-]*$/i.test(normalized) ? normalized : null
}

export function avatarExtension(file: File) {
  const extension = allowedAvatarTypes.get(file.type) ?? extname(file.name).toLowerCase()
  if (!allowedAvatarTypes.has(file.type) || !['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(extension)) return null
  return extension === '.jpeg' ? '.jpg' : extension
}

export function avatarExtensionFromContentType(contentType: string) {
  return allowedAvatarTypes.get(contentType.split(';')[0]?.trim().toLowerCase() ?? '') ?? null
}

export function avatarUrl(origin: string, filename: string) {
  return `${origin}/uploads/avatars/${filename}`
}

export function localAvatarPath(filename: string) {
  return join(uploadRoot, filename)
}

async function localAvatarExists(filename: string) {
  try {
    const file = await stat(localAvatarPath(filename))
    return file.isFile() && file.size > 0
  } catch {
    return false
  }
}

export function normalizeSupabaseSignedUrl(supabaseUrl: string, signedPath: string) {
  if (signedPath.startsWith('http')) return signedPath
  const baseUrl = supabaseUrl.replace(/\/$/, '')
  if (signedPath.startsWith('/storage/v1/')) return `${baseUrl}${signedPath}`
  if (signedPath.startsWith('/object/')) return `${baseUrl}/storage/v1${signedPath}`
  return `${baseUrl}/storage/v1/${signedPath.replace(/^\//, '')}`
}

function localSignedStorageFixtureUrl(objectPath: string) {
  const label = encodeURIComponent(objectPath.replace(/^qa-signed\//, ''))
  return `data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20viewBox=%220%200%20640%20960%22%3E%3Cdefs%3E%3ClinearGradient%20id=%22g%22%20x1=%220%22%20x2=%221%22%20y1=%220%22%20y2=%221%22%3E%3Cstop%20stop-color=%22%2322d3ee%22/%3E%3Cstop%20offset=%221%22%20stop-color=%22%232c0c64%22/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect%20width=%22640%22%20height=%22960%22%20fill=%22url(%23g)%22/%3E%3Crect%20x=%2270%22%20y=%22160%22%20width=%22500%22%20height=%22640%22%20rx=%2236%22%20fill=%22%23070a18%22%20opacity=%22.55%22/%3E%3Ctext%20x=%22320%22%20y=%22440%22%20text-anchor=%22middle%22%20font-family=%22Arial%22%20font-size=%2240%22%20font-weight=%22700%22%20fill=%22white%22%3ESigned%20Storage%3C/text%3E%3Ctext%20x=%22320%22%20y=%22495%22%20text-anchor=%22middle%22%20font-family=%22Arial%22%20font-size=%2224%22%20fill=%22%23f5d36b%22%3E${label}%3C/text%3E%3C/svg%3E`
}

export async function readSupabaseSignedUrlPayload(response: Response) {
  try {
    return (await response.json()) as { signedURL?: string; signedUrl?: string }
  } catch {
    throw new Error(avatarStorageMessages.signedUrlMalformed)
  }
}

export async function readStorageObjectSignedUrlPayload(response: Response) {
  try {
    return (await response.json()) as { signedURL?: string; signedUrl?: string }
  } catch {
    throw new Error(storageObjectMessages.signedUrlMalformed)
  }
}

function supabaseStorageConfig() {
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const bucket = process.env.SUPABASE_STORAGE_BUCKET
  if (!supabaseUrl || !serviceRoleKey || !bucket) throw new Error(avatarStorageMessages.notConfigured)
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
  if (!response.ok) throw new Error(avatarStorageMessages.uploadFailed(response.status))

  return objectPath
}

export async function resolveStorageObjectUrl(objectPath: string) {
  const safePath = safeStorageObjectPath(objectPath)
  if (!safePath) throw new Error(storageObjectMessages.invalidPath)

  if (process.env.NODE_ENV !== 'production' && safePath.startsWith('qa-signed/')) {
    return {
      access: 'signed' as const,
      url: localSignedStorageFixtureUrl(safePath),
      expiresIn: supabaseSignedUrlExpiresInSeconds,
    }
  }

  const { supabaseUrl, serviceRoleKey, bucket } = supabaseStorageConfig()
  if (supabaseStorageAccess === 'public') {
    return {
      access: 'public' as const,
      url: `${supabaseUrl}/storage/v1/object/public/${bucket}/${safePath}`,
      expiresIn: null,
    }
  }

  const response = await fetch(`${supabaseUrl}/storage/v1/object/sign/${bucket}/${safePath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expiresIn: supabaseSignedUrlExpiresInSeconds }),
  })
  if (!response.ok) throw new Error(storageObjectMessages.signedUrlFailed(response.status))

  const body = await readStorageObjectSignedUrlPayload(response)
  const signedPath = body.signedURL ?? body.signedUrl
  if (!signedPath) throw new Error(storageObjectMessages.signedUrlMissing)
  return {
    access: 'signed' as const,
    url: normalizeSupabaseSignedUrl(supabaseUrl, signedPath),
    expiresIn: supabaseSignedUrlExpiresInSeconds,
  }
}

export async function resolveAvatarLocation(filename: string) {
  if (storageProvider === 'local') return { type: 'local' as const, path: localAvatarPath(filename) }
  if (localStorageFallbackEnabled && (await localAvatarExists(filename))) {
    return { type: 'local' as const, path: localAvatarPath(filename) }
  }

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
  if (!response.ok) throw new Error(avatarStorageMessages.signedUrlFailed(response.status))

  const body = await readSupabaseSignedUrlPayload(response)
  const signedPath = body.signedURL ?? body.signedUrl
  if (!signedPath) throw new Error(avatarStorageMessages.signedUrlMissing)
  return {
    type: 'redirect' as const,
    url: normalizeSupabaseSignedUrl(supabaseUrl, signedPath),
  }
}

export async function uploadAvatarFile({ file, origin }: { file: File; origin: string }) {
  if (file.size > maxAvatarBytes) {
    return {
      ok: false as const,
      status: 413,
      error: 'avatar_too_large',
      message: avatarStorageMessages.tooLarge(maxAvatarBytes),
      maxBytes: maxAvatarBytes,
    }
  }

  const extension = avatarExtension(file)
  if (!extension) {
    return {
      ok: false as const,
      status: 415,
      error: 'avatar_type_not_supported',
      message: avatarStorageMessages.typeNotSupported,
    }
  }

  const filename = `${crypto.randomUUID()}${extension}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (storageProvider === 'supabase') {
    try {
      await uploadSupabaseAvatar({ bytes, contentType: file.type, filename })
    } catch (error) {
      if (!localStorageFallbackEnabled) throw error
      await uploadLocalAvatar({ bytes, filename })
      return {
        ok: true as const,
        url: avatarUrl(origin, filename),
        filename,
        provider: 'local' as const,
        access: 'local' as const,
        size: file.size,
        contentType: file.type,
      }
    }
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

export async function uploadAvatarBytes({
  bytes,
  contentType,
  origin,
}: {
  bytes: Uint8Array
  contentType: string
  origin: string
}) {
  if (bytes.byteLength > maxAvatarBytes) {
    return {
      ok: false as const,
      status: 413,
      error: 'avatar_too_large',
      message: avatarStorageMessages.tooLarge(maxAvatarBytes),
      maxBytes: maxAvatarBytes,
    }
  }

  const extension = avatarExtensionFromContentType(contentType)
  if (!extension) {
    return {
      ok: false as const,
      status: 415,
      error: 'avatar_type_not_supported',
      message: avatarStorageMessages.typeNotSupported,
    }
  }

  const filename = `${crypto.randomUUID()}${extension}`
  if (storageProvider === 'supabase') {
    try {
      await uploadSupabaseAvatar({ bytes, contentType, filename })
    } catch (error) {
      if (!localStorageFallbackEnabled) throw error
      await uploadLocalAvatar({ bytes, filename })
      return {
        ok: true as const,
        url: avatarUrl(origin, filename),
        filename,
        provider: 'local' as const,
        access: 'local' as const,
        size: bytes.byteLength,
        contentType,
      }
    }
  } else {
    await uploadLocalAvatar({ bytes, filename })
  }

  return {
    ok: true as const,
    url: avatarUrl(origin, filename),
    filename,
    provider: storageProvider,
    access: storageProvider === 'supabase' ? supabaseStorageAccess : 'local',
    size: bytes.byteLength,
    contentType,
  }
}
