import { describe, expect, test } from 'bun:test'
import { generationRoutes } from './generation.routes'

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })
}

function getRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'GET',
    headers,
  })
}

function deleteRequest(path: string, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${path}`, {
    method: 'DELETE',
    headers,
  })
}

describe('generation.routes', () => {
  test('returns generation templates without requiring auth', async () => {
    const response = await generationRoutes.handle(new Request('http://localhost/generation/templates'))
    const body = (await response.json()) as { templates: Array<{ id: string; mode: string }> }

    expect(response.status).toBe(200)
    expect(body.templates.map((template) => template.id)).toContain('character-avatar')
    expect(body.templates.map((template) => template.mode)).toContain('text-to-image')
  })

  test('requires a user identity before creating a generation job', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/jobs', {
        templateId: 'character-avatar',
        prompt: 'portrait',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('requires a user identity before listing generation jobs', async () => {
    const response = await generationRoutes.handle(getRequest('/generation/jobs'))
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('lists owner generation jobs with a local-safe empty fallback', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/jobs?limit=5', { 'x-user-id': '11111111-1111-4111-8111-111111111111' }),
    )
    const body = (await response.json()) as { jobs: unknown[]; persisted: boolean }

    expect(response.status).toBe(200)
    expect(body.jobs).toEqual([])
    expect(typeof body.persisted).toBe('boolean')
  })

  test('rejects invalid generation job ids before owner lookup', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/jobs/%27%20OR%201%3D1%20--', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('invalid_id')
  })

  test('returns not found for missing owner generation job detail', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/jobs/22222222-2222-4222-8222-222222222222', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_job_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('requires identity before retrying generation jobs', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/jobs/22222222-2222-4222-8222-222222222222/retry', {}),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('rejects invalid generation job ids before retry', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/jobs/not-a-uuid/retry', {}, {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('invalid_id')
  })

  test('returns not found for missing owner generation job retry', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/jobs/22222222-2222-4222-8222-222222222222/retry', {}, {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_job_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('requires identity before favoriting generation outputs', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/outputs/33333333-3333-4333-8333-333333333333/favorite', {}),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('rejects invalid generation output ids before favorite mutation', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/outputs/not-a-uuid/favorite', {}, {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('invalid_id')
  })

  test('returns not found for missing owner generation output favorite mutation', async () => {
    const response = await generationRoutes.handle(
      jsonRequest('/generation/outputs/33333333-3333-4333-8333-333333333333/favorite', {}, {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_output_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('returns not found for missing owner generation output unfavorite mutation', async () => {
    const response = await generationRoutes.handle(
      deleteRequest('/generation/outputs/33333333-3333-4333-8333-333333333333/favorite', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_output_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('requires identity before generating output download URLs', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/outputs/33333333-3333-4333-8333-333333333333/download'),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('rejects invalid generation output ids before download lookup', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/outputs/not-a-uuid/download', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('invalid_id')
  })

  test('returns not found for missing owner generation output download', async () => {
    const response = await generationRoutes.handle(
      getRequest('/generation/outputs/33333333-3333-4333-8333-333333333333/download', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_output_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('requires identity before deleting generation outputs', async () => {
    const response = await generationRoutes.handle(
      deleteRequest('/generation/outputs/33333333-3333-4333-8333-333333333333'),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(401)
    expect(body.error).toBe('unauthorized')
  })

  test('rejects invalid generation output ids before delete mutation', async () => {
    const response = await generationRoutes.handle(
      deleteRequest('/generation/outputs/not-a-uuid', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('invalid_id')
  })

  test('returns not found for missing owner generation output delete', async () => {
    const response = await generationRoutes.handle(
      deleteRequest('/generation/outputs/33333333-3333-4333-8333-333333333333', {
        'x-user-id': '11111111-1111-4111-8111-111111111111',
      }),
    )
    const body = (await response.json()) as { error: string; persisted: boolean }

    expect(response.status).toBe(404)
    expect(body.error).toBe('generation_output_not_found')
    expect(typeof body.persisted).toBe('boolean')
  })

  test('rejects invalid generation job input before job creation', async () => {
    const response = await generationRoutes.handle(
      jsonRequest(
        '/generation/jobs',
        {
          templateId: 'character-consistency',
          prompt: 'portrait',
        },
        { 'x-user-id': '11111111-1111-4111-8111-111111111111' },
      ),
    )
    const body = (await response.json()) as { error: string; message: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('generation_image_input_required')
    expect(body.message).toContain('ต้องแนบรูปอ้างอิง')
  })

  test('rejects invalid generation upload metadata before job creation', async () => {
    const response = await generationRoutes.handle(
      jsonRequest(
        '/generation/jobs',
        {
          templateId: 'character-consistency',
          prompt: 'portrait',
          imageInputs: ['output-key'],
          imageInputMetadata: [{ name: 'ref.gif', mimeType: 'image/gif', sizeBytes: 1024 }],
        },
        { 'x-user-id': '11111111-1111-4111-8111-111111111111' },
      ),
    )
    const body = (await response.json()) as { error: string; message: string }

    expect(response.status).toBe(400)
    expect(body.error).toBe('generation_image_input_type_invalid')
    expect(body.message).toBeTruthy()
  })

  test('returns a blocked local-safe preflight job without charging tokens', async () => {
    const response = await generationRoutes.handle(
      jsonRequest(
        '/generation/jobs',
        {
          templateId: 'character-avatar',
          prompt: ' portrait ',
        },
        { 'x-user-id': '11111111-1111-4111-8111-111111111111' },
      ),
    )
    const body = (await response.json()) as {
      job: {
        status: string
        failureCode: string
        debit: { charged: boolean; amount: number; reason: string }
        input: { prompt: string }
      }
    }

    expect(response.status).toBe(200)
    expect(body.job.status).toBe('blocked')
    expect(body.job.failureCode).toBe('generation_job_backend_not_ready')
    expect(body.job.debit).toEqual({ charged: false, amount: 0, reason: 'ยังไม่รับงานเข้าคิว จึงไม่หักโทเคน' })
    expect(body.job.input.prompt).toBe('portrait')
  })
})
