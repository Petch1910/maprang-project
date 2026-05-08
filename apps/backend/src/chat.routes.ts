import { Elysia, t } from 'elysia'
import { requireDatabase } from './db'
import { archiveChat, deleteChat, listChats, loadChatMessages, restoreChat, sendChat, streamChat, updateChatTitle } from './chat.service'
import { AuthError, isUuid, resolveRequestUserId } from './security'
import { rejectInvalidUuid } from './route-guards'

function responseChatId(chatId?: string) {
  return isUuid(chatId) ? chatId : null
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

export const chatRoutes = new Elysia()
  .get(
    '/chats',
    async ({ query, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

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
        return await sendChat({ ...body, userId: await resolveRequestUserId(request) })
      } catch (error) {
        if (error instanceof AuthError) {
          set.status = 401
          return {
            error: error.code,
            message: error.message,
            chatId: responseChatId(body.chatId),
          }
        }

        console.error('Chat error:', error)
        return {
          reply: 'The AI service is temporarily unavailable. Please try again.',
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
        return new Response(streamChat({ ...body, userId: await resolveRequestUserId(request) }), {
          headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
          },
        })
      } catch (error) {
        if (error instanceof AuthError) {
          set.status = 401
          return {
            error: error.code,
            message: error.message,
            chatId: responseChatId(body.chatId),
          }
        }

        throw error
      }
    },
    {
      body: chatBody,
    },
  )
  .get(
    '/chats/:id/messages',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const chat = await loadChatMessages(params.id, await resolveRequestUserId(request))
      if (!chat) {
        set.status = 404
        return { error: 'chat_not_found' }
      }

      return { chat }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
  .patch(
    '/chats/:id',
    async ({ body, params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const chat = await updateChatTitle(params.id, body.title, await resolveRequestUserId(request))
      if (!chat) {
        set.status = 404
        return { error: 'chat_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const archived = await archiveChat(params.id, await resolveRequestUserId(request))
      if (!archived) {
        set.status = 404
        return { error: 'chat_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const restored = await restoreChat(params.id, await resolveRequestUserId(request))
      if (!restored) {
        set.status = 404
        return { error: 'chat_not_found' }
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
      if (!prisma) return { error: 'database_not_configured' }
      const invalidId = rejectInvalidUuid(params.id, set, 'invalid_chat_id')
      if (invalidId) return invalidId

      const deleted = await deleteChat(params.id, await resolveRequestUserId(request))
      if (!deleted) {
        set.status = 404
        return { error: 'chat_not_found' }
      }

      return { ok: true }
    },
    {
      params: t.Object({
        id: t.String(),
      }),
    },
  )
