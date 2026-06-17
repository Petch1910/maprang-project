import { CharacterStatus, type Visibility } from '@prisma/client'
import { Elysia, t } from 'elysia'
import { defaultUserId } from './config'
import { clampMaxRating, normalizeMaxRating } from './content-rating'
import { generateCreatorDraft, getCreatorDraft, saveCreatorDraft } from './creator-draft.service'
import { previewCharacterChat } from './creator-preview.service'
import {
  scenarioTemplates,
  getScenariosByCategory,
  getScenariosByDifficulty,
  getScenarioById,
  getAllCategories,
  getBasicTestScenarios,
  getComprehensiveTestScenarios,
  type ScenarioCategory,
  type ScenarioTemplate,
} from './scenario-templates'
import { requireDatabase } from './db'
import {
  createCharacter,
  duplicateCharacter,
  loadCharacter,
  publicCharacter,
  resetCharacterPrompt,
  searchCharacters,
  setFavorite,
  softDeleteCharacter,
  trackCharacterView,
  updateCharacter,
  type CharacterInput,
} from './character.service'
import {
  buildRelationshipSeedFromTags,
  listRelationshipPresets,
  simulateRelationshipPreview,
  validateRelationshipTags,
} from './relationship.engine'
import { rejectInvalidUuid, routeErrorResponse } from './route-guards'
import { canAccessOwnerResource, isAdminRequest, resolveRequestUserId } from './security'
import { effectiveMaxRatingForUser, resolveUserProviderKey } from './user.service'

const visibilitySchema = t.Union([t.Literal('PUBLIC'), t.Literal('UNLISTED'), t.Literal('PRIVATE')])
const statusSchema = t.Union([
  t.Literal('DRAFT'),
  t.Literal('REVIEW'),
  t.Literal('PUBLISHED'),
  t.Literal('REJECTED'),
  t.Literal('ARCHIVED'),
])
const scenarioCategorySchema = t.Union([
  t.Literal('greeting'),
  t.Literal('conversation'),
  t.Literal('emotional'),
  t.Literal('conflict'),
  t.Literal('roleplay'),
  t.Literal('relationship'),
  t.Literal('personality'),
  t.Literal('knowledge'),
])
const scenarioDifficultySchema = t.Union([t.Literal('easy'), t.Literal('medium'), t.Literal('hard')])

const characterBody = t.Object({
  name: t.String({ minLength: 1 }),
  avatarUrl: t.Optional(t.Nullable(t.String())),
  coverUrl: t.Optional(t.Nullable(t.String())),
  tagline: t.Optional(t.Nullable(t.String())),
  description: t.Optional(t.Nullable(t.String())),
  biography: t.Optional(t.Nullable(t.String())),
  scenario: t.Optional(t.Nullable(t.String())),
  systemPrompt: t.String({ minLength: 1 }),
  compactPrompt: t.Optional(t.Nullable(t.String())),
  characterAnchor: t.Optional(t.Nullable(t.String())),
  constraints: t.Optional(t.Nullable(t.String())),
  greeting: t.Optional(t.Nullable(t.String())),
  tags: t.Optional(t.Array(t.String())),
  visibility: t.Optional(visibilitySchema),
  status: t.Optional(statusSchema),
})

const characterPatchBody = t.Partial(characterBody)
const creatorDraftBody = t.Object({
  brief: t.Optional(t.String()),
  imagePrompt: t.Optional(t.String()),
  imageOnly: t.Optional(t.Boolean()),
  skipImageProvider: t.Optional(t.Boolean()),
  imageStyle: t.Optional(t.String()),
  current: t.Optional(
    t.Partial(
      t.Object({
        name: t.String(),
        tagline: t.String(),
        description: t.String(),
        biography: t.String(),
        scenario: t.String(),
        systemPrompt: t.String(),
        compactPrompt: t.String(),
        characterAnchor: t.String(),
        constraints: t.String(),
        greeting: t.String(),
        tags: t.String(),
      }),
    ),
  ),
})

function normalizeCharacterBody(body: Partial<typeof characterBody.static>): Partial<CharacterInput> {
  return {
    ...body,
    visibility: body.visibility as Visibility | undefined,
    status: body.status as CharacterStatus | undefined,
  }
}

function hasRequestIdentity(request: Request) {
  return Boolean(request.headers.get('authorization') || request.headers.get('x-user-id'))
}

async function resolveCreatorUserApiKey(request: Request) {
  const userApiKey = request.headers.get('x-user-api-key')?.trim() || undefined
  const userApiProvider = request.headers.get('x-user-api-provider')?.trim() || undefined
  const useVault = request.headers.get('x-user-api-vault') === '1'

  if (userApiKey || !useVault) {
    return { userApiKey, userApiProvider }
  }

  const userId = await resolveRequestUserId(request, defaultUserId)
  const vaultKey = await resolveUserProviderKey(userId, userApiProvider)
  return {
    userApiKey: vaultKey?.apiKey,
    userApiProvider: vaultKey?.provider ?? userApiProvider,
  }
}

export const characterRoutes = new Elysia()
  .get('/creator/draft', async ({ request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const actorId = await resolveRequestUserId(request)
    if (!actorId) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }
    const payload = await getCreatorDraft(actorId)
    return { draft: payload ?? null }
  })
  .put('/creator/draft', async ({ body, request, set }) => {
    const prisma = requireDatabase(set)
    if (!prisma) return routeErrorResponse('database_not_configured')

    const actorId = await resolveRequestUserId(request)
    if (!actorId) {
      set.status = 401
      return routeErrorResponse('unauthorized')
    }
    await saveCreatorDraft(actorId, body.payload)
    return { ok: true }
  }, {
    body: t.Object({
      payload: t.Any(),
    }),
  })
  .post('/creator/ai-draft', async ({ body, request }) => {
    const { userApiKey, userApiProvider } = await resolveCreatorUserApiKey(request)
    return generateCreatorDraft({
      ...body,
      origin: new URL(request.url).origin,
      userApiKey,
      userApiProvider,
    })
  }, {
    body: creatorDraftBody,
  })
  .post(
    '/creator/preview-chat',
    async ({ body }) => {
      const result = await previewCharacterChat({
        name: body.name,
        description: body.description ?? undefined,
        biography: body.biography ?? undefined,
        scenario: body.scenario ?? undefined,
        systemPrompt: body.systemPrompt,
        compactPrompt: body.compactPrompt ?? undefined,
        characterAnchor: body.characterAnchor ?? undefined,
        constraints: body.constraints ?? undefined,
        greeting: body.greeting ?? undefined,
        userMessage: body.userMessage,
        userPersona: body.userPersona ?? undefined,
        relationshipSeed: body.relationshipSeed ?? undefined,
        skipProvider: body.skipProvider,
      })
      return { preview: result }
    },
    {
      body: t.Object({
        name: t.String({ minLength: 1 }),
        description: t.Optional(t.Nullable(t.String())),
        biography: t.Optional(t.Nullable(t.String())),
        scenario: t.Optional(t.Nullable(t.String())),
        systemPrompt: t.String({ minLength: 1 }),
        compactPrompt: t.Optional(t.Nullable(t.String())),
        characterAnchor: t.Optional(t.Nullable(t.String())),
        constraints: t.Optional(t.Nullable(t.String())),
        greeting: t.Optional(t.Nullable(t.String())),
        userMessage: t.String({ minLength: 1 }),
        userPersona: t.Optional(t.Nullable(t.String())),
        relationshipSeed: t.Optional(t.Nullable(t.String())),
        skipProvider: t.Optional(t.Boolean()),
      }),
    },
  )
  .get('/creator/scenarios', () => ({ scenarios: scenarioTemplates }))
  .get('/creator/scenarios/categories', () => ({ categories: getAllCategories() }))
  .get('/creator/scenarios/category/:category', ({ params }) => ({
    scenarios: getScenariosByCategory(params.category as ScenarioCategory),
  }), {
    params: t.Object({
      category: scenarioCategorySchema,
    }),
  })
  .get('/creator/scenarios/difficulty/:difficulty', ({ params }) => ({
    scenarios: getScenariosByDifficulty(params.difficulty as ScenarioTemplate['difficulty']),
  }), {
    params: t.Object({
      difficulty: scenarioDifficultySchema,
    }),
  })
  .get('/creator/scenarios/preset/basic', () => ({ scenarios: getBasicTestScenarios() }))
  .get('/creator/scenarios/preset/comprehensive', () => ({ scenarios: getComprehensiveTestScenarios() }))
  .get('/creator/scenarios/:scenarioId', ({ params }) => {
    const scenario = getScenarioById(params.scenarioId)
    return scenario ? { scenario } : { scenario: null }
  }, {
    params: t.Object({
      scenarioId: t.String(),
    }),
  })
  .get('/relationship/presets', ({ query }) => ({ presets: listRelationshipPresets(query.surface) }), {
    query: t.Object({
      surface: t.Optional(t.Union([t.Literal('contract'), t.Literal('creator')])),
    }),
  })
  .post(
    '/relationship/preview',
    ({ body }) => ({
      preview: simulateRelationshipPreview({
        tags: body.tags,
        messages: body.messages,
      }),
    }),
    {
      body: t.Object({
        tags: t.Array(t.String()),
        messages: t.Optional(t.Array(t.String())),
      }),
    },
  )
  .post(
    '/relationship/validate',
    ({ body }) => ({
      tagProfile: buildRelationshipSeedFromTags(body.tags).tagProfile,
      seed: buildRelationshipSeedFromTags(body.tags),
      issues: validateRelationshipTags(body.tags),
    }),
    {
      body: t.Object({
        tags: t.Array(t.String()),
      }),
    },
  )
  .get(
    '/characters',
    async ({ query, request }) => {
      const admin = isAdminRequest(request)
      const viewerUserId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : defaultUserId
      const requestedMaxRating = normalizeMaxRating(query.maxRating)
      const maxRating =
        admin || !hasRequestIdentity(request)
          ? clampMaxRating(requestedMaxRating, admin ? 'restricted_18' : 'teen_romance')
          : await effectiveMaxRatingForUser(viewerUserId, requestedMaxRating)

      return {
        characters: await searchCharacters({
          view: query.view ?? 'public',
          viewerUserId,
          includePrivateFields: admin,
          query: query.q,
          tag: query.tag,
          status: query.status as CharacterStatus | undefined,
          visibility: query.visibility as Visibility | undefined,
          sort: query.sort,
          favoriteOnly: query.favoriteOnly,
          maxRating,
          limit: query.limit,
        }),
      }
    },
    {
      query: t.Object({
        view: t.Optional(t.Union([t.Literal('public'), t.Literal('admin')])),
        q: t.Optional(t.String()),
        tag: t.Optional(t.String()),
        status: t.Optional(statusSchema),
        visibility: t.Optional(visibilitySchema),
        sort: t.Optional(
          t.Union([
            t.Literal('popular'),
            t.Literal('newest'),
            t.Literal('quality'),
            t.Literal('viewed'),
            t.Literal('favorited'),
          ]),
        ),
        favoriteOnly: t.Optional(t.Boolean()),
        maxRating: t.Optional(
          t.Union([
            t.Literal('general'),
            t.Literal('teen_romance'),
            t.Literal('mature_18'),
            t.Literal('restricted_18'),
          ]),
        ),
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .post(
    '/characters',
    async ({ body, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      const character = await createCharacter(normalizeCharacterBody(body) as CharacterInput, await resolveRequestUserId(request))
      if (!character) return routeErrorResponse('character_create_failed')

      set.status = 201
      return { character: publicCharacter(character, { includePrivateFields: true }) }
    },
    {
      body: characterBody,
    },
  )
  .get(
    '/characters/:id',
    async ({ params, request, set }) => {
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const character = await loadCharacter(params.id)

      if (!character) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const includePrivateFields = actorId ? canAccessOwnerResource({ request, ownerId: character.creatorId, actorId }) : isAdminRequest(request)
      const isPublicCharacter = character.status === CharacterStatus.PUBLISHED && character.visibility === 'PUBLIC'

      if (!isPublicCharacter && !includePrivateFields) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      return { character: publicCharacter(character, { viewerUserId: actorId ?? defaultUserId, includePrivateFields }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .patch(
    '/characters/:id',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return routeErrorResponse('character_forbidden')
      }

      const character = await updateCharacter(params.id, normalizeCharacterBody(body))
      return { character: character ? publicCharacter(character, { includePrivateFields: true }) : null }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: characterPatchBody,
    },
  )
  .delete(
    '/characters/:id',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return routeErrorResponse('character_forbidden')
      }

      await softDeleteCharacter(params.id)
      return { ok: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    '/characters/:id/duplicate',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const canDuplicateSource = actorId
        ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId })
        : isAdminRequest(request)

      if (!canDuplicateSource) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const character = await duplicateCharacter(params.id, actorId ?? defaultUserId)
      if (!character) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      set.status = 201
      return { character: publicCharacter(character, { includePrivateFields: true }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    '/characters/:id/reset-prompt',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }
      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return routeErrorResponse('character_forbidden')
      }

      const character = await resetCharacterPrompt(params.id)
      if (!character) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      return { character: publicCharacter(character, { includePrivateFields: true }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    '/characters/:id/favorite',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const canFavorite =
        (existing.status === CharacterStatus.PUBLISHED && existing.visibility === 'PUBLIC') ||
        (actorId ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId }) : isAdminRequest(request))

      if (!canFavorite) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const character = await setFavorite(params.id, body.favorite, actorId ?? defaultUserId)
      if (!character) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      return { character: publicCharacter(character, { viewerUserId: actorId ?? defaultUserId }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        favorite: t.Boolean(),
      }),
    },
  )
  .post(
    '/characters/:id/view',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const includePrivateFields = actorId ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId }) : isAdminRequest(request)
      const canView =
        (existing.status === CharacterStatus.PUBLISHED && existing.visibility === 'PUBLIC') || includePrivateFields

      if (!canView) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      const character = await trackCharacterView(params.id)
      if (!character) {
        set.status = 404
        return routeErrorResponse('character_not_found')
      }

      return { character: publicCharacter(character, { viewerUserId: actorId ?? defaultUserId, includePrivateFields }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
