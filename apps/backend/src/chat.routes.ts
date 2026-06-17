import { Elysia, t } from 'elysia'
import { requireDatabase } from './db'
import { archiveChat, deleteChat, listChats, loadChatMessages, restoreChat, sendChat, streamChat, updateChatTitle, testUserApiKey } from './chat.service'
import { AuthError, authErrorResponse, isUuid, resolveRequestUserId } from './security'
import { rejectInvalidUuid, routeErrorResponse, safeRouteErrorSummary } from './route-guards'
import { loadChatWorldState, updateChatWorldState } from './world-state.service'
import { resolveUserProviderKey } from './user.service'

function responseChatId(chatId?: string) {
  return isUuid(chatId) ? chatId : null
}

async function resolveRequestUserApiKey(request: Request, userId: string) {
  const userApiKey = request.headers.get('x-user-api-key')?.trim() || undefined
  const userApiProvider = request.headers.get('x-user-api-provider')?.trim() || undefined
  const useVault = request.headers.get('x-user-api-vault') === '1'

  if (userApiKey || !useVault) {
    return { userApiKey, userApiProvider }
  }

  const vaultKey = await resolveUserProviderKey(userId, userApiProvider)
  return {
    userApiKey: vaultKey?.apiKey,
    userApiProvider: vaultKey?.provider ?? userApiProvider,
  }
}

const chatBody = t.Object({
  message: t.String({ minLength: 1 }),
  characterId: t.Optional(t.String()),
  chatId: t.Optional(t.String()),
  relationshipSeed: t.Optional(t.String()),
  userPersona: t.Optional(t.String()),
  maxRating: t.Optional(
    t.Union([
      t.Literal('general'),
      t.Literal('teen_romance'),
      t.Literal('mature_18'),
      t.Literal('restricted_18'),
    ]),
  ),
  history: t.Optional(
    t.Array(
      t.Object({
        role: t.Union([t.Literal('system'), t.Literal('user'), t.Literal('assistant')]),
        content: t.String(),
      }),
    ),
  ),
})

const worldStateBody = t.Object({
  timeOfDay: t.Optional(t.String({ maxLength: 80 })),
  location: t.Optional(t.String({ maxLength: 120 })),
  weather: t.Optional(t.String({ maxLength: 80 })),
  mood: t.Optional(t.String({ maxLength: 80 })),
  sceneNotes: t.Optional(t.Array(t.String({ maxLength: 300 }), { maxItems: 5 })),
})

export const chatRoutes = new Elysia()
  .get(
    '/chats',
    async ({ query, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')

      return { chats: await listChats(await resolveRequestUserId(request), { archived: query.archived === 'true' }) }
    },
    {
      query: t.Object({
        archived: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/chat',
    async ({ body, request, set }) => {
      try {
        const userId = await resolveRequestUserId(request)
        const { userApiKey, userApiProvider } = await resolveRequestUserApiKey(request, userId)
        return await sendChat({
          ...body,
          userId,
          userApiKey,
          userApiProvider,
        })
      } catch (error) {
        if (error instanceof AuthError) {
          set.status = 401
          return {
            ...authErrorResponse(error),
            chatId: responseChatId(body.chatId),
          }
        }

        console.error('แชทไม่สำเร็จ:', safeRouteErrorSummary(error))
        return {
          reply: 'บริการ AI ขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง',
          chatId: responseChatId(body.chatId),
        }
      }
    },
    {
      body: chatBody,
    },
  )
  .post(
    '/chat/stream',
    async ({ body, request, set }) => {
      try {
        const userId = await resolveRequestUserId(request)
        const { userApiKey, userApiProvider } = await resolveRequestUserApiKey(request, userId)
        return new Response(
          streamChat({
            ...body,
            userId,
            userApiKey,
            userApiProvider,
          }),
          {
            headers: {
              'Content-Type': 'text/event-stream; charset=utf-8',
              'Cache-Control': 'no-cache, no-transform',
              Connection: 'keep-alive',
            },
          }
        )
      } catch (error) {
        if (error instanceof AuthError) {
          set.status = 401
          return {
            ...authErrorResponse(error),
            chatId: responseChatId(body.chatId),
          }
        }

        console.error('เริ่มสตรีมแชทไม่สำเร็จ:', safeRouteErrorSummary(error))
        set.status = 500
        return routeErrorResponse('unknown_error')
      }
    },
    {
      body: chatBody,
    },
  )
  .post(
    '/chat/test-key',
    async ({ body, set }) => {
      try {
        const result = await testUserApiKey(body.apiKey, body.provider)
        if (!result.ok) {
          set.status = 400
        }
        return result
      } catch (error) {
        set.status = 500
        return { ok: false, message: error instanceof Error ? error.message : 'Error testing connection' }
      }
    },
    {
      body: t.Object({
        apiKey: t.String({ minLength: 1 }),
        provider: t.String(),
      }),
    }
  )
  .get(
    '/chats/:id/messages',
    async ({ params, query, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const chat = await loadChatMessages(params.id, await resolveRequestUserId(request), { limit: query.limit })
      if (!chat) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return { chat }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      query: t.Object({
        limit: t.Optional(t.String()),
      }),
    },
  )
  .get(
    '/chats/:id/world-state',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const chatId = params.id ?? ''
      const invalidId = rejectInvalidUuid(chatId, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const worldState = await loadChatWorldState(chatId, await resolveRequestUserId(request))
      if (!worldState) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return worldState
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .patch(
    '/chats/:id/world-state',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const chatId = params.id ?? ''
      const invalidId = rejectInvalidUuid(chatId, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const worldState = await updateChatWorldState(chatId, await resolveRequestUserId(request), body, prisma)
      if (!worldState) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return worldState
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: worldStateBody,
    },
  )
  .patch(
    '/chats/:id',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const chat = await updateChatTitle(params.id, body.title, await resolveRequestUserId(request))
      if (!chat) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return { chat }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 80 }),
      }),
    },
  )
  .patch(
    '/chats/:id/archive',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const archived = await archiveChat(params.id, await resolveRequestUserId(request))
      if (!archived) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return { ok: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .patch(
    '/chats/:id/restore',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const restored = await restoreChat(params.id, await resolveRequestUserId(request))
      if (!restored) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return { ok: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .delete(
    '/chats/:id',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return routeErrorResponse('database_not_configured')
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const deleted = await deleteChat(params.id, await resolveRequestUserId(request))
      if (!deleted) {
        set.status = 404
        return routeErrorResponse('chat_not_found')
      }

      return { ok: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
