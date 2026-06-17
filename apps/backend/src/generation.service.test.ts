import { describe, expect, test } from 'bun:test'
import {
  buildBlockedGenerationJob,
  cancelGenerationJobForUser,
  createGenerationJob,
  deleteGenerationOutputForUser,
  getGenerationOutputCreatorReferenceForUser,
  getGenerationOutputDownloadForUser,
  getGenerationJobForUser,
  listGenerationJobsForUser,
  retryGenerationJobForUser,
  setGenerationOutputFavoriteForUser,
  listGenerationTemplates,
  validateGenerationJobInput,
} from './generation.service'

describe('generation.service', () => {
  test('lists repo-owned generation templates without provider calls', () => {
    const templates = listGenerationTemplates()
    expect(templates.map((template) => template.id)).toContain('character-avatar')
    expect(templates.every((template) => template.creditCost > 0)).toBe(true)
    expect(templates.every((template) => Array.isArray(template.acceptedFileTypes))).toBe(true)
  })

  test('validates prompt, upload, and disabled template before creating a job', () => {
    expect(validateGenerationJobInput({ templateId: 'missing', prompt: 'x' })).toMatchObject({
      ok: false,
      status: 400,
      error: 'generation_template_not_found',
    })
    expect(validateGenerationJobInput({ templateId: 'character-avatar', prompt: '' })).toMatchObject({
      ok: false,
      status: 400,
      error: 'generation_prompt_required',
    })
    expect(validateGenerationJobInput({ templateId: 'character-consistency', prompt: 'portrait' })).toMatchObject({
      ok: false,
      status: 400,
      error: 'generation_image_input_required',
    })
    expect(validateGenerationJobInput({ templateId: 'image-to-video-preview', prompt: 'move' })).toMatchObject({
      ok: false,
      status: 409,
      error: 'generation_template_disabled',
    })
    expect(
      validateGenerationJobInput({
        templateId: 'character-consistency',
        prompt: ' portrait ',
        imageInputs: ['  output-key  '],
        imageInputMetadata: [{ name: 'ref.webp', mimeType: 'IMAGE/WEBP', sizeBytes: 1024 }],
      }),
    ).toMatchObject({
      ok: true,
      sanitized: {
        prompt: 'portrait',
        imageInputs: ['output-key'],
        imageInputMetadata: [{ name: 'ref.webp', mimeType: 'image/webp', sizeBytes: 1024 }],
      },
    })
    expect(
      validateGenerationJobInput({
        templateId: 'character-consistency',
        prompt: 'portrait',
        imageInputs: ['output-key'],
        imageInputMetadata: [{ name: 'ref.gif', mimeType: 'image/gif', sizeBytes: 1024 }],
      }),
    ).toMatchObject({
      ok: false,
      status: 400,
      error: 'generation_image_input_type_invalid',
    })
    expect(
      validateGenerationJobInput({
        templateId: 'character-consistency',
        prompt: 'portrait',
        imageInputs: ['output-key'],
        imageInputMetadata: [{ name: 'large.png', mimeType: 'image/png', sizeBytes: 11 * 1024 * 1024 }],
      }),
    ).toMatchObject({
      ok: false,
      status: 400,
      error: 'generation_image_input_too_large',
    })
  })

  test('builds blocked local-safe jobs without debit until storage/job backend exists', () => {
    const preflight = validateGenerationJobInput({
      templateId: 'character-avatar',
      prompt: 'soft portrait',
    })
    expect(preflight.ok).toBe(true)
    if (!preflight.ok) throw new Error('preflight should pass')

    const job = buildBlockedGenerationJob({
      userId: '11111111-1111-4111-8111-111111111111',
      template: preflight.template,
      prompt: preflight.sanitized.prompt,
      imageInputs: preflight.sanitized.imageInputs,
      videoInputs: preflight.sanitized.videoInputs,
    })

    expect(job).toMatchObject({
      status: 'blocked',
      source: 'local-safe-preflight',
      failureCode: 'generation_job_backend_not_ready',
      debit: { charged: false, amount: 0 },
    })
  })

  test('keeps generation job creation local-safe when persistence is unavailable', async () => {
    const preflight = validateGenerationJobInput({
      templateId: 'character-avatar',
      prompt: 'soft portrait',
    })
    expect(preflight.ok).toBe(true)
    if (!preflight.ok) throw new Error('preflight should pass')

    const result = await createGenerationJob({
      userId: '11111111-1111-4111-8111-111111111111',
      template: preflight.template,
      prompt: preflight.sanitized.prompt,
      imageInputs: preflight.sanitized.imageInputs,
      videoInputs: preflight.sanitized.videoInputs,
      prisma: null,
    })

    expect(result.persisted).toBe(false)
    expect(result.job).toMatchObject({
      status: 'blocked',
      failureCode: 'generation_job_backend_not_ready',
      debit: { charged: false, amount: 0 },
    })
  })

  test('keeps owner generation library reads local-safe when persistence is unavailable', async () => {
    await expect(
      listGenerationJobsForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        prisma: null,
      }),
    ).resolves.toEqual({
      jobs: [],
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })

    await expect(
      getGenerationJobForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        jobId: '22222222-2222-4222-8222-222222222222',
        prisma: null,
      }),
    ).resolves.toEqual({
      job: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation output favorite mutations local-safe when persistence is unavailable', async () => {
    await expect(
      setGenerationOutputFavoriteForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        outputId: '33333333-3333-4333-8333-333333333333',
        isFavorite: true,
        prisma: null,
      }),
    ).resolves.toEqual({
      output: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation job retry local-safe when persistence is unavailable', async () => {
    await expect(
      retryGenerationJobForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        jobId: '22222222-2222-4222-8222-222222222222',
        prisma: null,
      }),
    ).resolves.toEqual({
      job: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation job cancel local-safe when persistence is unavailable', async () => {
    await expect(
      cancelGenerationJobForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        jobId: '22222222-2222-4222-8222-222222222222',
        prisma: null,
      }),
    ).resolves.toEqual({
      job: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation output download URLs local-safe when persistence is unavailable', async () => {
    await expect(
      getGenerationOutputDownloadForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        outputId: '33333333-3333-4333-8333-333333333333',
        prisma: null,
      }),
    ).resolves.toEqual({
      download: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation output creator references local-safe when persistence is unavailable', async () => {
    await expect(
      getGenerationOutputCreatorReferenceForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        outputId: '33333333-3333-4333-8333-333333333333',
        target: 'cover',
        prisma: null,
      }),
    ).resolves.toEqual({
      reference: null,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })

  test('keeps generation output delete local-safe when persistence is unavailable', async () => {
    await expect(
      deleteGenerationOutputForUser({
        userId: '11111111-1111-4111-8111-111111111111',
        outputId: '33333333-3333-4333-8333-333333333333',
        prisma: null,
      }),
    ).resolves.toEqual({
      deleted: false,
      persisted: false,
      persistenceWarning: 'generation_persistence_unavailable',
    })
  })
})
