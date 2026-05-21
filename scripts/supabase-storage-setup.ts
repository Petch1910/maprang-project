import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { formatDiagnosticText, formatUnknownDiagnosticText } from './smoke-helpers'

const root = join(import.meta.dir, '..')
const backendDir = join(root, 'apps', 'backend')

export const maxAvatarBytes = 2 * 1024 * 1024
export const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export type SupabaseStorageConfig = {
  checkOnly: boolean
  bucket: string
  expiresIn: number
  supabaseUrl: string
  serviceRoleKey: string
  storageAccess: string
  authHeaders: Record<string, string>
}

export type SupabaseBucketState = {
  exists: boolean
  public: boolean | null
}

export type SupabaseStorageOperations = {
  getBucket: (config: SupabaseStorageConfig) => Promise<SupabaseBucketState>
  createBucket: (config: SupabaseStorageConfig) => Promise<void>
  updateBucketPrivate: (config: SupabaseStorageConfig) => Promise<void>
  uploadSmokeImage: (config: SupabaseStorageConfig, objectPath: string) => Promise<void>
  createSignedUrl: (config: SupabaseStorageConfig, objectPath: string) => Promise<string>
  verifySignedUrl: (signedUrl: string) => Promise<void>
  deleteObject: (config: SupabaseStorageConfig, objectPath: string) => Promise<void>
}

export type SupabaseStorageSetupRunnerOptions = {
  loadEnvFiles?: boolean
  operations?: SupabaseStorageOperations
  now?: () => number
  writeLine?: (line: string) => void
  writeError?: (line: string) => void
}

export function loadEnvContent(content: string, env: Record<string, string | undefined> = process.env) {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (env[key]) continue
    env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
  }
}

function loadEnvFile(path: string, env: Record<string, string | undefined> = process.env) {
  if (!existsSync(path)) return
  loadEnvContent(readFileSync(path, 'utf8'), env)
}

export function resolveSupabaseStorageConfig(
  env: Record<string, string | undefined> = process.env,
  argv: string[] = process.argv,
): SupabaseStorageConfig {
  const checkOnly = argv.includes('--check')
  const bucket = env.SUPABASE_STORAGE_BUCKET || 'avatars'
  const expiresIn = Number(env.SUPABASE_SIGNED_URL_EXPIRES_IN || 3600)
  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, '')
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY
  const storageAccess = env.SUPABASE_STORAGE_ACCESS || 'signed'

  if (!supabaseUrl) throw new Error('SUPABASE_URL ยังไม่ได้ตั้งค่า')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ยังไม่ได้ตั้งค่า')
  if (storageAccess !== 'signed') throw new Error('SUPABASE_STORAGE_ACCESS ต้องเป็น signed สำหรับพื้นที่เก็บรูปตัวละครใน production')
  if (!Number.isFinite(expiresIn) || expiresIn < 60) throw new Error('SUPABASE_SIGNED_URL_EXPIRES_IN ต้องไม่น้อยกว่า 60 วินาที')

  return {
    checkOnly,
    bucket,
    expiresIn,
    supabaseUrl,
    serviceRoleKey,
    storageAccess,
    authHeaders: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
  }
}

export function encodedPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

export function normalizeSignedUrl(signedPath: string, supabaseUrl: string) {
  const normalizedSupabaseUrl = supabaseUrl.replace(/\/$/, '')
  if (signedPath.startsWith('http')) return signedPath
  if (signedPath.startsWith('/storage/v1/')) return `${normalizedSupabaseUrl}${signedPath}`
  if (signedPath.startsWith('/object/')) return `${normalizedSupabaseUrl}/storage/v1${signedPath}`
  return `${normalizedSupabaseUrl}/storage/v1/${signedPath.replace(/^\//, '')}`
}

export function formatSupabaseStorageSetupError(error: unknown) {
  return formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
}

async function storageRequest(config: SupabaseStorageConfig, path: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20_000)
  try {
    return await fetch(`${config.supabaseUrl}/storage/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...config.authHeaders,
        ...init.headers,
      },
    })
  } catch (error) {
    const reason = formatUnknownDiagnosticText(error, 500) || 'ไม่ทราบสาเหตุ'
    throw new Error(`ติดต่อ Supabase Storage ที่ ${config.supabaseUrl} ไม่สำเร็จ: ${reason}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseError(response: Response) {
  const text = await response.text().catch(() => '')
  return formatDiagnosticText(text, 500) || response.statusText
}

async function readStorageJson<T>(response: Response, label: string) {
  try {
    return (await response.json()) as T
  } catch {
    throw new Error(`${label} คืน JSON ไม่ถูกต้อง`)
  }
}

async function getBucket(config: SupabaseStorageConfig) {
  const response = await storageRequest(config, `/bucket/${encodeURIComponent(config.bucket)}`)
  if (response.status === 404) return { exists: false as const, public: null }
  if (!response.ok) throw new Error(`อ่าน bucket ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
  const payload = await readStorageJson<{ public?: boolean; id?: string; name?: string }>(response, 'อ่าน bucket')
  return { exists: true as const, public: payload.public === true }
}

async function createBucket(config: SupabaseStorageConfig) {
  const response = await storageRequest(config, '/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: config.bucket,
      name: config.bucket,
      public: false,
      file_size_limit: maxAvatarBytes,
      allowed_mime_types: allowedMimeTypes,
    }),
  })
  if (!response.ok && response.status !== 409) {
    throw new Error(`สร้าง bucket ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
  }
}

async function updateBucketPrivate(config: SupabaseStorageConfig) {
  const response = await storageRequest(config, `/bucket/${encodeURIComponent(config.bucket)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public: false,
      file_size_limit: maxAvatarBytes,
      allowed_mime_types: allowedMimeTypes,
    }),
  })
  if (!response.ok) throw new Error(`ปรับ bucket ให้เป็น private ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
}

async function uploadSmokeImage(config: SupabaseStorageConfig, objectPath: string) {
  const bytes = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'))
  const response = await storageRequest(config, `/object/${encodeURIComponent(config.bucket)}/${encodedPath(objectPath)}`, {
    method: 'POST',
    headers: {
      'Cache-Control': '3600',
      'Content-Type': 'image/png',
      'x-upsert': 'true',
    },
    body: bytes,
  })
  if (!response.ok) throw new Error(`อัปโหลดรูป smoke ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
}

async function createSignedUrl(config: SupabaseStorageConfig, objectPath: string) {
  const response = await storageRequest(config, `/object/sign/${encodeURIComponent(config.bucket)}/${encodedPath(objectPath)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: config.expiresIn }),
  })
  if (!response.ok) throw new Error(`สร้าง signed URL ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
  const payload = await readStorageJson<{ signedURL?: string; signedUrl?: string }>(response, 'สร้าง signed URL')
  const signedPath = payload.signedURL ?? payload.signedUrl
  if (!signedPath) throw new Error('ผลลัพธ์ signed URL ไม่มี signedURL')
  return normalizeSignedUrl(signedPath, config.supabaseUrl)
}

async function verifySignedUrl(signedUrl: string) {
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error(`เรียก signed URL ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
}

async function deleteObject(config: SupabaseStorageConfig, objectPath: string) {
  const response = await storageRequest(config, `/object/${encodeURIComponent(config.bucket)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })
  if (!response.ok) throw new Error(`ลบรูป smoke ไม่สำเร็จด้วยสถานะ ${response.status}: ${await parseError(response)}`)
}

export const liveSupabaseStorageOperations: SupabaseStorageOperations = {
  getBucket,
  createBucket,
  updateBucketPrivate,
  uploadSmokeImage,
  createSignedUrl,
  verifySignedUrl,
  deleteObject,
}

export async function runSupabaseStorageSetup(
  env: Record<string, string | undefined> = process.env,
  argv: string[] = process.argv,
  options: SupabaseStorageSetupRunnerOptions = {},
) {
  const operations = options.operations ?? liveSupabaseStorageOperations
  const now = options.now ?? (() => Date.now())
  const writeLine = options.writeLine ?? ((line: string) => console.log(line))
  const writeError = options.writeError ?? ((line: string) => console.error(line))

  try {
    if (options.loadEnvFiles !== false) {
      loadEnvFile(join(backendDir, '.env'), env)
      loadEnvFile(join(backendDir, '.env.production'), env)
    }

    const config = resolveSupabaseStorageConfig(env, argv)

    const bucketState = await operations.getBucket(config)
    if (!bucketState.exists) {
      if (config.checkOnly) throw new Error(`ไม่พบ Supabase bucket "${config.bucket}" ให้รัน bun run supabase:storage:setup หลังโปรเจกต์พร้อมใช้งาน`)
      await operations.createBucket(config)
      writeLine(`createdBucket: ${config.bucket}`)
    } else {
      writeLine(`bucket: ${config.bucket}`)
    }

    const currentBucket = await operations.getBucket(config)
    if (!currentBucket.exists) throw new Error(`อ่าน Supabase bucket "${config.bucket}" หลังตั้งค่าไม่สำเร็จ`)

    if (currentBucket.public === true) {
      if (config.checkOnly) throw new Error(`Supabase bucket "${config.bucket}" ยังเป็น public; ก่อนโปรดักชันต้องใช้ private bucket พร้อม signed URL`)
      await operations.updateBucketPrivate(config)
      writeLine(`updatedBucketPrivate: ${config.bucket}`)
    }

    const verifiedBucket = await operations.getBucket(config)
    if (verifiedBucket.public === true) throw new Error(`Supabase bucket "${config.bucket}" ยังเป็น public หลังปรับค่า`)

    const objectPath = `avatars/smoke-${now()}.png`
    await operations.uploadSmokeImage(config, objectPath)
    const signedUrl = await operations.createSignedUrl(config, objectPath)
    await operations.verifySignedUrl(signedUrl)
    await operations.deleteObject(config, objectPath)

    writeLine(
      JSON.stringify(
        {
          ok: true,
          supabaseUrl: config.supabaseUrl,
          bucket: config.bucket,
          bucketPublic: false,
          access: 'signed',
          signedUrlExpiresIn: config.expiresIn,
          checked: {
            bucketReadable: true,
            upload: true,
            signedUrl: true,
            signedUrlFetch: true,
            cleanup: true,
          },
        },
        null,
        2,
      ),
    )
    return 0
  } catch (error) {
    const message = formatSupabaseStorageSetupError(error)
    writeError(`ตั้งค่า Supabase storage ไม่ผ่าน: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runSupabaseStorageSetup())
