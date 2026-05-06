import { CharacterStatus, type Visibility } from '@prisma/client'
import { Elysia, t } from 'elysia'
import { defaultUserId } from './config'
import { clampMaxRating, normalizeMaxRating } from './content-rating'
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
  RELATIONSHIP_PRESETS,
  buildRelationshipSeedFromTags,
  simulateRelationshipPreview,
  validateRelationshipTags,
} from './relationship.engine'
import { canAccessOwnerResource, isAdminRequest, requestUserId, resolveRequestUserId } from './security'
import { effectiveMaxRatingForUser } from './user.service'

const visibilitySchema = t.Union([t.Literal('PUBLIC'), t.Literal('UNLISTED'), t.Literal('PRIVATE')])
const statusSchema = t.Union([
  t.Literal('DRAFT'),
  t.Literal('REVIEW'),
  t.Literal('PUBLISHED'),
  t.Literal('REJECTED'),
  t.Literal('ARCHIVED'),
])

const characterBody = t.Object({
  name: t.String({ minLength: 1 }),
  avatarUrl: t.Optional(t.Nullable(t.String())),
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

export const characterRoutes = new Elysia()
  .get('/relationship/presets', () => ({ presets: RELATIONSHIP_PRESETS }))
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
      const viewerUserId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : '__anonymous__'
      const requestedMaxRating = normalizeMaxRating(query.maxRating)
      const maxRating =
        admin || viewerUserId === '__anonymous__'
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
      if (!prisma) return { error: 'database_not_configured' }

      const character = await createCharacter(normalizeCharacterBody(body) as CharacterInput, await resolveRequestUserId(request))
      if (!character) return { error: 'character_create_failed' }

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
      const character = await loadCharacter(params.id)

      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const includePrivateFields = actorId ? canAccessOwnerResource({ request, ownerId: character.creatorId, actorId }) : isAdminRequest(request)
      const isPublicCharacter = character.status === CharacterStatus.PUBLISHED && character.visibility === 'PUBLIC'

      if (!isPublicCharacter && !includePrivateFields) {
        set.status = 404
        return { error: 'character_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return { error: 'character_forbidden' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return { error: 'character_forbidden' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const canDuplicateSource = actorId
        ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId })
        : isAdminRequest(request)

      if (!canDuplicateSource) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const character = await duplicateCharacter(params.id, actorId ?? defaultUserId)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }
      if (!canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return { error: 'character_forbidden' }
      }

      const character = await resetCharacterPrompt(params.id)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const canFavorite =
        (existing.status === CharacterStatus.PUBLISHED && existing.visibility === 'PUBLIC') ||
        (actorId ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId }) : isAdminRequest(request))

      if (!canFavorite) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const character = await setFavorite(params.id, body.favorite, actorId ?? defaultUserId)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }

      const existing = await loadCharacter(params.id)
      if (!existing) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const actorId = hasRequestIdentity(request) ? await resolveRequestUserId(request, defaultUserId) : null
      const includePrivateFields = actorId ? canAccessOwnerResource({ request, ownerId: existing.creatorId, actorId }) : isAdminRequest(request)
      const canView =
        (existing.status === CharacterStatus.PUBLISHED && existing.visibility === 'PUBLIC') || includePrivateFields

      if (!canView) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const character = await trackCharacterView(params.id)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      return { character: publicCharacter(character, { viewerUserId: actorId ?? defaultUserId, includePrivateFields }) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
