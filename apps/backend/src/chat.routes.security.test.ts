import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { CharacterStatus, MessageRole, Visibility } from '@prisma/client'
import { chatRoutes } from './chat.routes'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'chat route security')
const ownerUserId = '980e8400-e29b-41d4-a716-446655440000'
const otherUserId = '980e8400-e29b-41d4-a716-446655440001'
const testPrefix = 'Chat Route Security Test'

async function cleanup() {
  await prisma?.chat.deleteMany({
    where: {
      OR: [{ title: { startsWith: testPrefix } }, { character: { name: { startsWith: testPrefix } } }],
    },
  })
  await prisma?.character.deleteMany({ where: { name: { startsWith: testPrefix } } })
  await prisma?.user.deleteMany({ where: { id: { in: [ownerUserId, otherUserId] } } })
}

async function createTestChat(ownerId = ownerUserId) {
  const character = await prisma!.character.create({
    data: {
      name: `${testPrefix} Character ${crypto.randomUUID().slice(0, 6)}`,
      tagline: 'A route security test character',
      description: 'Used to verify route-level access control.',
      systemPrompt: 'Stay consistent for route security tests.',
      creatorId: ownerUserId,
      status: CharacterStatus.PUBLISHED,
      visibility: Visibility.PUBLIC,
    },
  })

  return prisma!.chat.create({
    data: {
      title: `${testPrefix} Chat ${crypto.randomUUID().slice(0, 6)}`,
      userId: ownerId,
      characterId: character.id,
      messages: {
        create: [
          {
            role: MessageRole.assistant,
            content: 'Route security seed message.',
          },
        ],
      },
    },
  })
}

function routeRequest(
  path: string,
  options: {
    body?: unknown
    method?: string
    userId?: string
  } = {},
) {
  const headers = new Headers({ 'x-user-id': options.userId ?? ownerUserId })
  const init: RequestInit = {
    method: options.method ?? 'GET',
    headers,
  }

  if (options.body !== undefined) {
    headers.set('content-type', 'application/json')
    init.body = JSON.stringify(options.body)
  }

  return new Request(`http://localhost${path}`, init)
}

describe('chat routes security', () => {
  beforeAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
    await prisma!.user.createMany({
      data: [
        { id: ownerUserId, email: 'route-owner@maprang.io', username: 'RouteOwner' },
        { id: otherUserId, email: 'route-other@maprang.io', username: 'RouteOther' },
      ],
      skipDuplicates: true,
    })
  })

  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
  })

  test('rejects invalid chat ids before they reach persistence', async () => {
    if (!(await shouldRunDbTest())) return

    const invalidId = "' OR 1=1 --"
    const cases = [
      routeRequest(`/chats/${encodeURIComponent(invalidId)}/messages`),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}/world-state`),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}/world-state`, {
        method: 'PATCH',
        body: { location: 'Injected room' },
      }),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}`, { method: 'PATCH', body: { title: 'Injected title' } }),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}/archive`, { method: 'PATCH' }),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}/restore`, { method: 'PATCH' }),
      routeRequest(`/chats/${encodeURIComponent(invalidId)}`, { method: 'DELETE' }),
    ]

    for (const request of cases) {
      const response = await chatRoutes.handle(request)
      const body = (await response.json()) as { error: string }
      expect(response.status).toBe(400)
      expect(body.error).toBe('invalid_chat_id')
    }
  })

  test('does not let a different user operate on another user chat through routes', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat(otherUserId)

    const readResponse = await chatRoutes.handle(routeRequest(`/chats/${chat.id}/messages`))
    expect(readResponse.status).toBe(404)

    const worldReadResponse = await chatRoutes.handle(routeRequest(`/chats/${chat.id}/world-state`))
    expect(worldReadResponse.status).toBe(404)

    const worldPatchResponse = await chatRoutes.handle(
      routeRequest(`/chats/${chat.id}/world-state`, { method: 'PATCH', body: { location: `${testPrefix} Hijacked` } }),
    )
    expect(worldPatchResponse.status).toBe(404)

    const renameResponse = await chatRoutes.handle(
      routeRequest(`/chats/${chat.id}`, { method: 'PATCH', body: { title: `${testPrefix} Hijacked` } }),
    )
    expect(renameResponse.status).toBe(404)

    const archiveResponse = await chatRoutes.handle(routeRequest(`/chats/${chat.id}/archive`, { method: 'PATCH' }))
    expect(archiveResponse.status).toBe(404)

    const deleteResponse = await chatRoutes.handle(routeRequest(`/chats/${chat.id}`, { method: 'DELETE' }))
    expect(deleteResponse.status).toBe(404)

    const otherChat = await prisma!.chat.findUnique({
      where: { id: chat.id },
      select: { title: true, isArchived: true, deletedAt: true, memory: true },
    })
    expect(otherChat).toMatchObject({
      title: chat.title,
      isArchived: false,
      deletedAt: null,
    })
    expect(otherChat?.memory).toBeNull()
  })

  test('lets the owner read and patch world state through chat routes', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat(ownerUserId)
    const patchResponse = await chatRoutes.handle(
      routeRequest(`/chats/${chat.id}/world-state`, {
        method: 'PATCH',
        body: {
          timeOfDay: 'early morning',
          location: 'train platform',
          weather: 'cold mist',
          mood: 'careful distance',
          sceneNotes: ['Do not jump to another location without player input.'],
        },
      }),
    )
    expect(patchResponse.status).toBe(200)
    await expect(patchResponse.json()).resolves.toMatchObject({
      chatId: chat.id,
      worldState: {
        location: 'train platform',
      },
    })

    const readResponse = await chatRoutes.handle(routeRequest(`/chats/${chat.id}/world-state`))
    expect(readResponse.status).toBe(200)
    await expect(readResponse.json()).resolves.toMatchObject({
      chatId: chat.id,
      worldState: {
        mood: 'careful distance',
      },
    })
  })
})
