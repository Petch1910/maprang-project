import { Elysia, t } from 'elysia'
import {
  cancelGenerationJobForUser,
  createGenerationJob,
  deleteGenerationOutputForUser,
  getGenerationOutputCreatorReferenceForUser,
  getGenerationOutputDownloadForUser,
  getGenerationJobForUser,
  listGenerationJobsForUser,
  listGenerationTemplates,
  retryGenerationJobForUser,
  setGenerationOutputFavoriteForUser,
  setGenerationOutputVisibilityForUser,
  listPublicGenerationOutputs,
  getPublicGenerationOutput,
  validateGenerationJobInput,
} from './generation.service'
import { rejectInvalidUuid, routeErrorResponse } from './route-guards'
import { resolveRequestUserId } from './security'

const generationJobBody = t.Object({
  templateId: t.String({ minLength: 1 }),
  prompt: t.Optional(t.Nullable(t.String())),
  imageInputs: t.Optional(t.Array(t.String())),
  videoInputs: t.Optional(t.Array(t.String())),
  imageInputMetadata: t.Optional(t.Array(t.Object({
    name: t.Optional(t.Nullable(t.String())),
    mimeType: t.Optional(t.Nullable(t.String())),
    sizeBytes: t.Optional(t.Nullable(t.Number())),
    durationSeconds: t.Optional(t.Nullable(t.Number())),
  }))),
  videoInputMetadata: t.Optional(t.Array(t.Object({
    name: t.Optional(t.Nullable(t.String())),
    mimeType: t.Optional(t.Nullable(t.String())),
    sizeBytes: t.Optional(t.Nullable(t.Number())),
    durationSeconds: t.Optional(t.Nullable(t.Number())),
  }))),
})

function hasRequestIdentity(request: Request) {
  return Boolean(request.headers.get('authorization') || request.headers.get('x-user-id'))
}

export const generationRoutes = new Elysia()
  .get('/generation/templates', () => ({
    templates: listGenerationTemplates(),
  }))
  .get(
    '/generation/jobs',
    async ({ query, request, set }) => {
      if (!hasRequestIdentity(request)) {
        set.status = 401
        return routeErrorResponse('unauthorized')
      }

      const result = await listGenerationJobsForUser({
        userId: await resolveRequestUserId(request),
        limit: query.limit ? Number(query.limit) : undefined,
      })

      return {
        jobs: result.jobs,
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get('/generation/jobs/:id', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await getGenerationJobForUser({
      userId: await resolveRequestUserId(request),
      jobId: params.id,
    })
    if (!result.job) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_job_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      job: result.job,
      persisted: result.persisted,
    }
  })
  .post('/generation/jobs/:id/retry', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await retryGenerationJobForUser({
      userId: await resolveRequestUserId(request),
      jobId: params.id,
    })
    if (result.retryBlockedReason) {
      set.status = 409
      return {
        ...routeErrorResponse(result.retryBlockedReason),
        persisted: result.persisted,
      }
    }
    if (!result.job) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_job_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      job: result.job,
      persisted: result.persisted,
    }
  })
  .post('/generation/jobs/:id/cancel', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await cancelGenerationJobForUser({
      userId: await resolveRequestUserId(request),
      jobId: params.id,
    })
    if (result.cancelBlockedReason) {
      set.status = 409
      return {
        ...routeErrorResponse(result.cancelBlockedReason),
        job: result.job,
        persisted: result.persisted,
      }
    }
    if (!result.job) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_job_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      job: result.job,
      persisted: result.persisted,
    }
  })
  .post('/generation/outputs/:id/favorite', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await setGenerationOutputFavoriteForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      isFavorite: true,
    })
    if (!result.output) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      output: result.output,
      persisted: result.persisted,
    }
  })
  .delete('/generation/outputs/:id/favorite', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await setGenerationOutputFavoriteForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      isFavorite: false,
    })
    if (!result.output) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      output: result.output,
      persisted: result.persisted,
    }
  })
  .get('/generation/outputs/:id/download', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await getGenerationOutputDownloadForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
    })
    if (!result.download) {
      if (result.persistenceWarning === 'generation_storage_unavailable') {
        set.status = 502
        return {
          ...routeErrorResponse('generation_storage_unavailable'),
          persisted: result.persisted,
          persistenceWarning: result.persistenceWarning,
        }
      }

      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      download: result.download,
      persisted: result.persisted,
    }
  })
  .post('/generation/outputs/:id/use-as-character-image', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await getGenerationOutputCreatorReferenceForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      target: 'character-image',
    })
    if (!result.reference) {
      set.status = result.reason === 'generation_output_image_required' ? 409 : 404
      return {
        ...routeErrorResponse(result.reason ?? 'generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      reference: result.reference,
      persisted: result.persisted,
    }
  })
  .post('/generation/outputs/:id/use-as-cover', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await getGenerationOutputCreatorReferenceForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      target: 'cover',
    })
    if (!result.reference) {
      set.status = result.reason === 'generation_output_image_required' ? 409 : 404
      return {
        ...routeErrorResponse(result.reason ?? 'generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      reference: result.reference,
      persisted: result.persisted,
    }
  })
  .delete('/generation/outputs/:id', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await deleteGenerationOutputForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
    })
    if (!result.deleted) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      ok: true,
      deleted: true,
      persisted: result.persisted,
    }
  })
  .post('/generation/gallery/:id/publish', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await setGenerationOutputVisibilityForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      visibility: 'PUBLIC',
    })
    
    if (!result.output) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      output: result.output,
      persisted: result.persisted,
    }
  })
  .delete('/generation/gallery/:id', async ({ params, request, set }) => {
    if (!hasRequestIdentity(request)) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }

    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await setGenerationOutputVisibilityForUser({
      userId: await resolveRequestUserId(request),
      outputId: params.id,
      visibility: 'PRIVATE',
    })
    
    if (!result.output) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      output: result.output,
      persisted: result.persisted,
    }
  })
  .get(
    '/generation/gallery',
    async ({ query }) => {
      const result = await listPublicGenerationOutputs({
        limit: query.limit ? Number(query.limit) : undefined,
      })

      return {
        outputs: result.outputs,
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    },
    {
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get('/generation/gallery/:id', async ({ params, set }) => {
    const invalidId = rejectInvalidUuid(params.id, set, 'invalid_id')
    if (invalidId) return invalidId

    const result = await getPublicGenerationOutput({
      outputId: params.id,
    })
    if (!result.output) {
      set.status = 404
      return {
        ...routeErrorResponse('generation_output_not_found'),
        persisted: result.persisted,
        persistenceWarning: result.persistenceWarning,
      }
    }

    return {
      output: result.output,
      persisted: result.persisted,
    }
  })
  .post(
    '/generation/jobs',
    async ({ body, request, set }) => {
      if (!hasRequestIdentity(request)) {
        set.status = 401
        return routeErrorResponse('unauthorized')
      }

      const actorId = await resolveRequestUserId(request)

      const preflight = validateGenerationJobInput(body)
      if (!preflight.ok) {
        set.status = preflight.status
        return {
          error: preflight.error,
          message: preflight.message,
        }
      }

      const result = await createGenerationJob({
        userId: actorId,
        template: preflight.template,
        prompt: preflight.sanitized.prompt,
        imageInputs: preflight.sanitized.imageInputs,
        videoInputs: preflight.sanitized.videoInputs,
      })

      return { job: result.job }
    },
    {
      body: generationJobBody,
    },
  )
