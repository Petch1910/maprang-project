import { Elysia, t } from 'elysia'
import { requireDatabase } from './db'
import { archiveChat, listChats, loadChatMessages, sendChat, streamChat } from './chat.service'
import { resolveRequestUserId } from './security'

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
    async ({ request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

      return { chats: await listChats(await resolveRequestUserId(request)) }
    },
  )
  .post(
    '/chat',
    async ({ body, request }) => {
      try {
        return await sendChat({ ...body, userId: await resolveRequestUserId(request) })
      } catch (error) {
        console.error('Chat error:', error)
        return {
          reply: 'The AI service is temporarily unavailable. Please try again.',
          chatId: body.chatId ?? null,
        }
      }
    },
    {
      body: chatBody,
    },
  )
  .post(
    '/chat/stream',
    async ({ body, request }) =>
      new Response(streamChat({ ...body, userId: await resolveRequestUserId(request) }), {
        headers: {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      }),
    {
      body: chatBody,
    },
  )
  .get(
    '/chats/:id/messages',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

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
    '/chats/:id/archive',
    async ({ params, request, set }) => {
      const prisma = requireDatabase(set)
      if (!prisma) return { error: 'database_not_configured' }

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
