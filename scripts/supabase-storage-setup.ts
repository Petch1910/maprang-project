import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(import.meta.dir, '..')
const backendDir = join(root, 'apps', 'backend')
const checkOnly = process.argv.includes('--check')
const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars'
const expiresIn = Number(process.env.SUPABASE_SIGNED_URL_EXPIRES_IN || 3600)
const maxAvatarBytes = 2 * 1024 * 1024
const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

loadEnvFile(join(backendDir, '.env'))
loadEnvFile(join(backendDir, '.env.production'))

const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '')
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const storageAccess = process.env.SUPABASE_STORAGE_ACCESS || 'signed'

if (!supabaseUrl) fail('SUPABASE_URL is missing')
if (!serviceRoleKey) fail('SUPABASE_SERVICE_ROLE_KEY is missing')
if (storageAccess !== 'signed') fail('SUPABASE_STORAGE_ACCESS must be signed for production avatar storage')
if (!Number.isFinite(expiresIn) || expiresIn < 60) fail('SUPABASE_SIGNED_URL_EXPIRES_IN must be at least 60 seconds')

const authHeaders = {
  Authorization: `Bearer ${serviceRoleKey}`,
  apikey: serviceRoleKey,
}

try {
  const bucketState = await getBucket()
  if (!bucketState.exists) {
    if (checkOnly) fail(`Supabase bucket "${bucket}" does not exist. Run bun run supabase:storage:setup after the project is active.`)
    await createBucket()
    console.log(`createdBucket: ${bucket}`)
  } else {
    console.log(`bucket: ${bucket}`)
  }

  const currentBucket = await getBucket()
  if (!currentBucket.exists) fail(`Supabase bucket "${bucket}" could not be read after setup`)

  if (currentBucket.public === true) {
    if (checkOnly) fail(`Supabase bucket "${bucket}" is public. Production expects a private bucket with signed URLs.`)
    await updateBucketPrivate()
    console.log(`updatedBucketPrivate: ${bucket}`)
  }

  const verifiedBucket = await getBucket()
  if (verifiedBucket.public === true) fail(`Supabase bucket "${bucket}" is still public after update`)

  const objectPath = `avatars/smoke-${Date.now()}.png`
  await uploadSmokeImage(objectPath)
  const signedUrl = await createSignedUrl(objectPath)
  await verifySignedUrl(signedUrl)
  await deleteObject(objectPath)

  console.log(
    JSON.stringify(
      {
        ok: true,
        supabaseUrl,
        bucket,
        bucketPublic: false,
        access: 'signed',
        signedUrlExpiresIn: expiresIn,
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
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const content = readFileSync(path, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, rawValue] = match
    if (process.env[key]) continue
    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '')
  }
}

function fail(message: string): never {
  console.error(`Supabase storage setup failed: ${message}`)
  process.exit(1)
}

function encodedPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/')
}

function normalizeSignedUrl(signedPath: string) {
  if (signedPath.startsWith('http')) return signedPath
  if (signedPath.startsWith('/storage/v1/')) return `${supabaseUrl}${signedPath}`
  if (signedPath.startsWith('/object/')) return `${supabaseUrl}/storage/v1${signedPath}`
  return `${supabaseUrl}/storage/v1/${signedPath.replace(/^\//, '')}`
}

async function storageRequest(path: string, init: RequestInit = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 20_000)
  try {
    return await fetch(`${supabaseUrl}/storage/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        ...authHeaders,
        ...init.headers,
      },
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`could not reach Supabase Storage at ${supabaseUrl}: ${reason}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

async function parseError(response: Response) {
  const text = await response.text().catch(() => '')
  return text.slice(0, 500) || response.statusText
}

async function getBucket() {
  const response = await storageRequest(`/bucket/${encodeURIComponent(bucket)}`)
  if (response.status === 404) return { exists: false as const, public: null }
  if (!response.ok) throw new Error(`bucket read failed with ${response.status}: ${await parseError(response)}`)
  const payload = (await response.json()) as { public?: boolean; id?: string; name?: string }
  return { exists: true as const, public: payload.public === true }
}

async function createBucket() {
  const response = await storageRequest('/bucket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: false,
      file_size_limit: maxAvatarBytes,
      allowed_mime_types: allowedMimeTypes,
    }),
  })
  if (!response.ok && response.status !== 409) {
    throw new Error(`bucket create failed with ${response.status}: ${await parseError(response)}`)
  }
}

async function updateBucketPrivate() {
  const response = await storageRequest(`/bucket/${encodeURIComponent(bucket)}`, {
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

async function uploadSmokeImage(objectPath: string) {
  const bytes = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=', 'base64'))
  const response = await storageRequest(`/object/${encodeURIComponent(bucket)}/${encodedPath(objectPath)}`, {
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

async function createSignedUrl(objectPath: string) {
  const response = await storageRequest(`/object/sign/${encodeURIComponent(bucket)}/${encodedPath(objectPath)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ expiresIn }),
  })
  if (!response.ok) throw new Error(`signed URL create failed with ${response.status}: ${await parseError(response)}`)
  const payload = (await response.json()) as { signedURL?: string; signedUrl?: string }
  const signedPath = payload.signedURL ?? payload.signedUrl
  if (!signedPath) throw new Error('signed URL response did not include signedURL')
  return normalizeSignedUrl(signedPath)
}

async function verifySignedUrl(signedUrl: string) {
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error(`signed URL fetch failed with ${response.status}: ${await parseError(response)}`)
}

async function deleteObject(objectPath: string) {
  const response = await storageRequest(`/object/${encodeURIComponent(bucket)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })
  if (!response.ok) throw new Error(`smoke avatar cleanup failed with ${response.status}: ${await parseError(response)}`)
}
