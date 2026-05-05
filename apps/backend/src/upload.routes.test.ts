import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'bun:test'
import { uploadRoutes } from './upload.routes'

describe('upload routes', () => {
  const uploadedFiles: string[] = []

  afterEach(async () => {
    await Promise.all(uploadedFiles.splice(0).map((filename) => rm(join(import.meta.dir, '..', 'uploads', 'avatars', filename), { force: true })))
  })

  test('uploads an avatar image and serves it back', async () => {
    const form = new FormData()
    form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'avatar.png', { type: 'image/png' }))

    const uploadResponse = await uploadRoutes.handle(
      new Request('http://localhost/uploads/avatar', {
        method: 'POST',
        body: form,
      }),
    )
    const body = (await uploadResponse.json()) as { url: string; filename: string; provider: string; access: string; contentType: string }
    uploadedFiles.push(body.filename)

    expect(uploadResponse.status).toBe(200)
    expect(body.url).toContain('/uploads/avatars/')
    expect(body.provider).toBe('local')
    expect(body.access).toBe('local')
    expect(body.contentType).toBe('image/png')

    const fileResponse = await uploadRoutes.handle(new Request(body.url))
    expect(fileResponse.status).toBe(200)
    expect(fileResponse.headers.get('content-type')).toContain('image/png')
  })

  test('rejects unsupported avatar file types', async () => {
    const form = new FormData()
    form.append('file', new File(['hello'], 'avatar.txt', { type: 'text/plain' }))

    const response = await uploadRoutes.handle(
      new Request('http://localhost/uploads/avatar', {
        method: 'POST',
        body: form,
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(415)
    expect(body.error).toBe('avatar_type_not_supported')
  })
})
