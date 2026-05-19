import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

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

  if (!supabaseUrl) throw new Error('SUPABASE_URL is missing')
  if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  if (storageAccess !== 'signed') throw new Error('SUPABASE_STORAGE_ACCESS must be signed for production avatar storage')
  if (!Number.isFinite(expiresIn) || expiresIn < 60) throw new Error('SUPABASE_SIGNED_URL_EXPIRES_IN must be at least 60 seconds')

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
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`could not reach Supabase Storage at ${config.supabaseUrl}: ${reason}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseError(response: Response) {
  const text = await response.text().catch(() => '')
  return text.slice(0, 500) || response.statusText
}

async function getBucket(config: SupabaseStorageConfig) {
  const response = await storageRequest(config, `/bucket/${encodeURIComponent(config.bucket)}`)
  if (response.status === 404) return { exists: false as const, public: null }
  if (!response.ok) throw new Error(`bucket read failed with ${response.status}: ${await parseError(response)}`)
  const payload = (await response.json()) as { public?: boolean; id?: string; name?: string }
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
    throw new Error(`bucket create failed with ${response.status}: ${await parseError(response)}`)
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
  if (!response.ok) throw new Error(`bucket privacy update failed with ${response.status}: ${await parseError(response)}`)
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
  if (!response.ok) throw new Error(`smoke avatar upload failed with ${response.status}: ${await parseError(response)}`)
}

async function createSignedUrl(config: SupabaseStorageConfig, objectPath: string) {
  const response = await storageRequest(config, `/object/sign/${encodeURIComponent(config.bucket)}/${encodedPath(objectPath)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn: config.expiresIn }),
  })
  if (!response.ok) throw new Error(`signed URL create failed with ${response.status}: ${await parseError(response)}`)
  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string }
  const signedPath = payload.signedURL ?? payload.signedUrl
  if (!signedPath) throw new Error('signed URL response did not include signedURL')
  return normalizeSignedUrl(signedPath, config.supabaseUrl)
}

async function verifySignedUrl(signedUrl: string) {
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error(`signed URL fetch failed with ${response.status}: ${await parseError(response)}`)
}

async function deleteObject(config: SupabaseStorageConfig, objectPath: string) {
  const response = await storageRequest(config, `/object/${encodeURIComponent(config.bucket)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })
  if (!response.ok) throw new Error(`smoke avatar cleanup failed with ${response.status}: ${await parseError(response)}`)
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
      if (config.checkOnly) throw new Error(`Supabase bucket "${config.bucket}" does not exist. Run bun run supabase:storage:setup after the project is active.`)
      await operations.createBucket(config)
      writeLine(`createdBucket: ${config.bucket}`)
    } else {
      writeLine(`bucket: ${config.bucket}`)
    }

    const currentBucket = await operations.getBucket(config)
    if (!currentBucket.exists) throw new Error(`Supabase bucket "${config.bucket}" could not be read after setup`)

    if (currentBucket.public === true) {
      if (config.checkOnly) throw new Error(`Supabase bucket "${config.bucket}" is public. Production expects a private bucket with signed URLs.`)
      await operations.updateBucketPrivate(config)
      writeLine(`updatedBucketPrivate: ${config.bucket}`)
    }

    const verifiedBucket = await operations.getBucket(config)
    if (verifiedBucket.public === true) throw new Error(`Supabase bucket "${config.bucket}" is still public after update`)

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
    const message = error instanceof Error ? error.message : String(error)
    writeError(`Supabase storage setup failed: ${message}`)
    return 1
  }
}

if (import.meta.main) process.exit(await runSupabaseStorageSetup())
