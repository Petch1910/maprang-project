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
    const previousFetch = globalThis.fetch
    let supabaseUploadRequested = false
    let supabaseSignRequested = false
    globalThis.fetch = (async (input, init) => {
      const url = String(input)
      if (url.includes('/storage/v1/object/sign/')) {
        supabaseSignRequested = true
        return new Response(JSON.stringify({ signedURL: '/object/sign/avatars/avatars/test.png?token=test' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        })
      }
      if (url.includes('/storage/v1/object/')) {
        supabaseUploadRequested = true
        expect(init?.method).toBe('POST')
        return new Response('{}', { headers: { 'Content-Type': 'application/json' }, status: 200 })
      }
      return previousFetch(input, init)
    }) as typeof fetch

    const form = new FormData()
    form.append('file', new File([new Uint8Array([137, 80, 78, 71])], 'avatar.png', { type: 'image/png' }))

    try {
      const uploadResponse = await uploadRoutes.handle(
        new Request('http://localhost/uploads/avatar', {
          method: 'POST',
          body: form,
        }),
      )
      const body = (await uploadResponse.json()) as { url: string; filename: string; provider: string; access: string; contentType: string }
      if (body.provider === 'local') uploadedFiles.push(body.filename)

      expect(uploadResponse.status).toBe(200)
      expect(body.url).toContain('/uploads/avatars/')
      expect(['local', 'supabase']).toContain(body.provider)
      expect(body.access).toBe(body.provider === 'supabase' ? 'signed' : 'local')
      expect(body.contentType).toBe('image/png')

      const fileResponse = await uploadRoutes.handle(new Request(body.url))
      if (body.provider === 'supabase') {
        expect(supabaseUploadRequested).toBe(true)
        expect(supabaseSignRequested).toBe(true)
        expect([200, 302, 307]).toContain(fileResponse.status)
      } else {
        expect(fileResponse.status).toBe(200)
        expect(fileResponse.headers.get('content-type')).toContain('image/png')
      }
    } finally {
      globalThis.fetch = previousFetch
    }
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
