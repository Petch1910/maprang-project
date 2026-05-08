import { Elysia, t } from 'elysia'
import { loadCharacter } from './character.service'
import { defaultUserId } from './config'
import { requireDatabase } from './db'
import { createLoreEntry, listLoreEntries, loadLoreEntry, softDeleteLoreEntry, updateLoreEntry } from './lore.service'
import { rejectInvalidUuid } from './route-guards'
import { canAccessOwnerResource, resolveRequestUserId } from './security'

const loreBody = t.Object({
  keyword: t.String({ minLength: 1 }),
  aliases: t.Optional(t.Array(t.String())),
  content: t.String({ minLength: 1 }),
  priority: t.Optional(t.Number()),
  hierarchyLevel: t.Optional(t.Number()),
  parentLoreId: t.Optional(t.Nullable(t.String())),
})

const lorePatchBody = t.Partial(loreBody)

export const loreRoutes = new Elysia()
  .get(
    '/characters/:id/lore',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId

      const characterId = params.id
      const character = await loadCharacter(characterId)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      return { loreEntries: await listLoreEntries(characterId) }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .post(
    '/characters/:id/lore',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_character_id')
      if (invalidId) return invalidId
      if (body.parentLoreId) {
        const invalidParentId = rejectInvalidUuid(body.parentLoreId, set, 'invalid_parent_lore_id')
        if (invalidParentId) return invalidParentId
      }

      const characterId = params.id
      const character = await loadCharacter(characterId)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      if (!canAccessOwnerResource({ request, ownerId: character.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
        set.status = 403
        return { error: 'lore_forbidden' }
      }

      const loreEntry = await createLoreEntry(characterId, body)
      if (!loreEntry) return { error: 'lore_create_failed' }

      set.status = 201
      return { loreEntry }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: loreBody,
    },
  )
  .patch(
    '/lore/:id',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_lore_id')
      if (invalidId) return invalidId
      if (body.parentLoreId) {
        const invalidParentId = rejectInvalidUuid(body.parentLoreId, set, 'invalid_parent_lore_id')
        if (invalidParentId) return invalidParentId
      }

      try {
        const existing = await loadLoreEntry(params.id)
        if (!existing) {
          set.status = 404
          return { error: 'lore_not_found' }
        }
        if (!canAccessOwnerResource({ request, ownerId: existing.character.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
          set.status = 403
          return { error: 'lore_forbidden' }
        }

        return { loreEntry: await updateLoreEntry(params.id, body) }
      } catch {
        set.status = 404
        return { error: 'lore_not_found' }
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: lorePatchBody,
    },
  )
  .delete(
    '/lore/:id',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_lore_id')
      if (invalidId) return invalidId

      try {
        const existing = await loadLoreEntry(params.id)
        if (!existing) {
          set.status = 404
          return { error: 'lore_not_found' }
        }
        if (!canAccessOwnerResource({ request, ownerId: existing.character.creatorId, actorId: await resolveRequestUserId(request, defaultUserId) })) {
          set.status = 403
          return { error: 'lore_forbidden' }
        }

        await softDeleteLoreEntry(params.id)
        return { ok: true }
      } catch {
        set.status = 404
        return { error: 'lore_not_found' }
      }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
