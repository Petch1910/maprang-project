import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { CharacterStatus, MessageRole, Visibility } from '@prisma/client'
import { archiveChat, deleteChat, listChats, loadChatMessages, restoreChat, updateChatTitle } from './chat.service'
import { getPrisma } from './db'
import { createDbTestGate } from './db.test-gate'
import { loadChatWorldState, updateChatWorldState } from './world-state.service'

const prisma = getPrisma()
const shouldRunDbTest = createDbTestGate(prisma, 'chat archive persistence')
const ownerUserId = '880e8400-e29b-41d4-a716-446655440000'
const otherUserId = '880e8400-e29b-41d4-a716-446655440001'
const testPrefix = 'Archive Restore Test'

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
      tagline: 'A persisted chat archive test character',
      description: 'Used to verify archived chat filtering and restoration.',
      systemPrompt: 'Stay consistent for archive persistence tests.',
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
            content: 'Archive persistence seed message.',
          },
        ],
      },
    },
  })
}

describe('chat archive persistence', () => {
  beforeAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
    await prisma!.user.createMany({
      data: [
        { id: ownerUserId, email: 'archive-owner@maprang.io', username: 'ArchiveOwner' },
        { id: otherUserId, email: 'archive-other@maprang.io', username: 'ArchiveOther' },
      ],
      skipDuplicates: true,
    })
  })

  afterAll(async () => {
    if (!(await shouldRunDbTest({ silent: true }))) return
    await cleanup()
  })

  test('moves chats between active and archived lists, then restores them', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat()
    expect(await archiveChat(chat.id, ownerUserId)).toBe(true)

    const activeChats = await listChats(ownerUserId)
    const archivedChats = await listChats(ownerUserId, { archived: true })
    expect(activeChats?.some((item) => item.id === chat.id)).toBe(false)
    expect(archivedChats?.find((item) => item.id === chat.id)).toMatchObject({
      id: chat.id,
      isArchived: true,
      preview: 'Archive persistence seed message.',
    })

    expect(await restoreChat(chat.id, ownerUserId)).toBe(true)

    const restoredActiveChats = await listChats(ownerUserId)
    const restoredArchivedChats = await listChats(ownerUserId, { archived: true })
    expect(restoredActiveChats?.some((item) => item.id === chat.id)).toBe(true)
    expect(restoredArchivedChats?.some((item) => item.id === chat.id)).toBe(false)
  })

  test('does not restore another user archived chat', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat(otherUserId)
    expect(await archiveChat(chat.id, otherUserId)).toBe(true)
    expect(await restoreChat(chat.id, ownerUserId)).toBe(false)

    const ownerArchivedChats = await listChats(ownerUserId, { archived: true })
    const otherArchivedChats = await listChats(otherUserId, { archived: true })
    expect(ownerArchivedChats?.some((item) => item.id === chat.id)).toBe(false)
    expect(otherArchivedChats?.some((item) => item.id === chat.id)).toBe(true)
  })

  test('does not let another user read, rename, archive, or delete a chat', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat(otherUserId)

    expect(await loadChatMessages(chat.id, ownerUserId)).toBeNull()
    expect(await updateChatTitle(chat.id, `${testPrefix} Hijacked`, ownerUserId)).toBeNull()
    expect(await archiveChat(chat.id, ownerUserId)).toBe(false)
    expect(await deleteChat(chat.id, ownerUserId)).toBe(false)

    const otherChat = await prisma!.chat.findUnique({
      where: { id: chat.id },
      select: { title: true, isArchived: true, deletedAt: true },
    })
    expect(otherChat).toMatchObject({
      title: chat.title,
      isArchived: false,
      deletedAt: null,
    })
  })

  test('persists world state only for the chat owner', async () => {
    if (!(await shouldRunDbTest())) return

    const chat = await createTestChat(ownerUserId)
    const saved = await updateChatWorldState(chat.id, ownerUserId, {
      timeOfDay: 'late night',
      location: 'empty library',
      weather: 'soft rain',
      mood: 'quiet pressure',
      sceneNotes: ['Keep the scene in the same room until the player moves.'],
    })

    expect(saved?.worldState).toMatchObject({
      location: 'empty library',
      mood: 'quiet pressure',
    })
    expect(saved?.worldState.sceneNotes).toContain('Keep the scene in the same room until the player moves.')

    const loaded = await loadChatWorldState(chat.id, ownerUserId)
    expect(loaded?.worldState.location).toBe('empty library')

    expect(
      await updateChatWorldState(chat.id, otherUserId, {
        location: 'hijacked room',
      }),
    ).toBeNull()
    expect((await loadChatWorldState(chat.id, ownerUserId))?.worldState.location).toBe('empty library')
  })
})
