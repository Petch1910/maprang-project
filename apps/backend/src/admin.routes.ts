import { Elysia, t } from 'elysia'
import { adjustUserTokenBalance, loadAdminSummary } from './admin.service'
import { listAdminAuditLogs } from './audit.service'
import { loadCharacter } from './character.service'
import { loadRelevantLore } from './context.service'
import { requireDatabase } from './db'
import { runLocalEvalSuite } from './eval.service'
import {
  buildPromptInspectorSnapshot,
  diffPromptSnapshots,
  type PromptInspectorRuntimeMemory,
} from './prompt-inspector.service'
import { rejectInvalidUuid } from './route-guards'
import { requireAdminApiKey, resolveRequestUserId } from './security'
import { loadUserPersona } from './user.service'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function chatRuntimeMemory(chat: {
  summary: string | null
  memory: unknown
  sceneState: unknown
  relationshipState: unknown
  lastMessageAt: Date
}): PromptInspectorRuntimeMemory {
  const memory = asRecord(chat.memory)
  const sceneState = asRecord(chat.sceneState)
  const relationshipState = asRecord(chat.relationshipState)
  const timeline = (Array.isArray(memory.relationshipTimeline) ? memory.relationshipTimeline : [])
    .filter((entry): entry is Record<string, unknown> => entry && typeof entry === 'object')
    .map((entry) => entry.summary)
    .filter((summary): summary is string => typeof summary === 'string')
    .slice(-5)
  const activeScene = asRecord(sceneState.activeScene)

  return {
    chatSummary: chat.summary,
    memorySummary: typeof memory.summary === 'string' ? memory.summary : '',
    knownFacts: asStringArray(memory.facts).slice(-6),
    worldState: asRecord(memory.worldState),
    emotionalMomentum: asRecord(memory.emotionalMomentum).direction,
    relationshipTimeline: timeline,
    relationshipStatus: relationshipState.status,
    relationshipTrust: relationshipState.trust,
    relationshipAffinity: relationshipState.affinity,
    sceneMode: sceneState.mode,
    activeSceneObjective: activeScene.objective,
    pendingEvents: Array.isArray(sceneState.pendingEvents) ? sceneState.pendingEvents.length : 0,
    lastMessageAt: chat.lastMessageAt.toISOString(),
  }
}

export const adminRoutes = new Elysia()
  .get('/admin/summary', async ({ request, set }) => {
    if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

    const prisma = requireDatabase(set)
    if (!prisma) return { error: 'database_not_configured' }

    const summary = await loadAdminSummary()
    if (!summary) {
      set.status = 503
      return { error: 'admin_summary_unavailable' }
    }

    return summary
  })
  .patch(
    '/admin/users/:id/tokens',
    async ({ body, params, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_user_id')
      if (invalidId) return invalidId

      const result = await adjustUserTokenBalance(
        params.id,
        body.amount,
        await resolveRequestUserId(request),
        body.reason,
      )
      if (!result) {
        set.status = 503
        return { error: 'database_not_configured' }
      }

      if ('error' in result) {
        set.status = result.error === 'user_not_found' ? 404 : 422
        return { error: result.error }
      }

      return result
    },
    {
      body: t.Object({
        amount: t.Integer(),
        reason: t.Optional(t.String()),
      }),
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .get(
    '/admin/audit-logs',
    async ({ query, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      return { logs: await listAdminAuditLogs(query.limit) }
    },
    {
      query: t.Object({
        limit: t.Optional(t.Number()),
      }),
    },
  )
  .get('/admin/evals/local', async ({ request, set }) => {
    if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

    try {
      return await runLocalEvalSuite()
    } catch (error) {
      set.status = 500
      return {
        error: 'local_eval_unavailable',
        message: error instanceof Error ? error.message : String(error),
      }
    }
  })
  .post(
    '/admin/prompt-inspector',
    async ({ body, request, set }) => {
      if (!requireAdminApiKey({ request, set })) return { error: 'admin_unauthorized' }

      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      const invalidCharacterId = rejectInvalidUuid(body.characterId, set, 'invalid_character_id')
      if (invalidCharacterId) return invalidCharacterId
      if (body.chatId) {
        const invalidChatId = rejectInvalidUuid(body.chatId, set, 'invalid_chat_id')
        if (invalidChatId) return invalidChatId
      }

      const viewerUserId = await resolveRequestUserId(request)
      const character = await loadCharacter(body.characterId, viewerUserId)
      if (!character) {
        set.status = 404
        return { error: 'character_not_found' }
      }

      const runtimeWarnings: string[] = []
      let runtimeMemory: PromptInspectorRuntimeMemory | null = body.runtimeNote ?? null
      if (body.chatId) {
        const chat = await prisma.chat.findFirst({
          where: {
            id: body.chatId,
            characterId: body.characterId,
            deletedAt: null,
          },
          select: {
            summary: true,
            memory: true,
            sceneState: true,
            relationshipState: true,
            lastMessageAt: true,
          },
        })

        if (chat) runtimeMemory = chatRuntimeMemory(chat)
        else runtimeWarnings.push('chatId was provided but no matching active chat was found for this character.')
      }

      const savedPersona =
        body.userPersona !== undefined || body.includeSavedPersona === false
          ? null
          : await loadUserPersona(viewerUserId)
      const userPersona = body.userPersona ?? savedPersona?.persona ?? ''
      const currentLore = await loadRelevantLore(character.id, body.message)
      const snapshot = buildPromptInspectorSnapshot({
        character,
        loreEntries: currentLore,
        runtimeMemory,
        userMessage: body.message,
        userPersona,
      })
      snapshot.warnings.push(...runtimeWarnings)

      if (!body.compareWithMessage) return { snapshot }

      const previousLore = await loadRelevantLore(character.id, body.compareWithMessage)
      const previousSnapshot = buildPromptInspectorSnapshot({
        character,
        loreEntries: previousLore,
        runtimeMemory,
        userMessage: body.compareWithMessage,
        userPersona,
      })

      return {
        snapshot,
        diff: diffPromptSnapshots(previousSnapshot, snapshot),
        ...(body.includePreviousSnapshot ? { previousSnapshot } : {}),
      }
    },
    {
      body: t.Object({
        characterId: t.String(),
        message: t.String({ minLength: 1, maxLength: 4000 }),
        chatId: t.Optional(t.String()),
        compareWithMessage: t.Optional(t.String({ minLength: 1, maxLength: 4000 })),
        includePreviousSnapshot: t.Optional(t.Boolean()),
        includeSavedPersona: t.Optional(t.Boolean()),
        runtimeNote: t.Optional(t.String({ maxLength: 2000 })),
        userPersona: t.Optional(t.String({ maxLength: 2000 })),
      }),
    },
  )
