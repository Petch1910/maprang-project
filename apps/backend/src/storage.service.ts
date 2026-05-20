import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { storageProvider } from './config'

const backendRoot = dirname(dirname(fileURLToPath(import.meta.url)))

export const uploadRoot = join(backendRoot, 'uploads', 'avatars')
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

export const avatarStorageMessages = {
  fileRequired: 'กรุณาแนบไฟล์รูปตัวละครก่อนอัปโหลด',
  typeNotSupported: 'รองรับเฉพาะรูป JPG, PNG, WebP หรือ GIF เท่านั้น',
  tooLarge: (maxBytes: number) => `รูปตัวละครใหญ่เกินไป ขนาดสูงสุดคือ ${Math.round(maxBytes / 1024 / 1024)} MB`,
  notFound: 'ไม่พบรูปตัวละครนี้',
  notConfigured: 'ยังไม่ได้ตั้งค่า Supabase Storage สำหรับรูปตัวละคร',
  uploadFailed: (status: number) => `อัปโหลดรูปตัวละครไป Supabase ไม่สำเร็จ สถานะ ${status}`,
  signedUrlFailed: (status: number) => `สร้างลิงก์รูปตัวละครแบบ signed URL ไม่สำเร็จ สถานะ ${status}`,
  signedUrlMissing: 'Supabase ไม่ได้ส่ง signed URL ของรูปตัวละครกลับมา',
  unavailable: 'พื้นที่เก็บรูปตัวละครยังไม่พร้อมใช้งาน กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ',
}

export function safeAvatarFilename(filename: string) {
  return /^[a-z0-9-]+\.(jpg|jpeg|png|webp|gif)$/i.test(filename) ? filename : null
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

export function normalizeSupabaseSignedUrl(supabaseUrl: string, signedPath: string) {
  if (signedPath.startsWith('http')) return signedPath
  const baseUrl = supabaseUrl.replace(/\/$/, '')
  if (signedPath.startsWith('/storage/v1/')) return `${baseUrl}${signedPath}`
  if (signedPath.startsWith('/object/')) return `${baseUrl}/storage/v1${signedPath}`
  return `${baseUrl}/storage/v1/${signedPath.replace(/^\//, '')}`
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
  if (!response.ok) throw new Error(avatarStorageMessages.signedUrlFailed(response.status))

  const body = (await response.json()) as { signedURL?: string; signedUrl?: string }
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
    await uploadSupabaseAvatar({ bytes, contentType, filename })
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
