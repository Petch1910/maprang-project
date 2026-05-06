import { CharacterStatus } from '@prisma/client'
import { getPrisma } from './db'

export async function loadAdminSummary() {
  const prisma = getPrisma()
  if (!prisma) return null

  const [
    userCount,
    characterCount,
    publishedCharacterCount,
    reviewCharacterCount,
    chatCount,
    messageCount,
    loreEntryCount,
    favoriteCount,
    pendingReportCount,
    usageAggregate,
    topCharacters,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.character.count({ where: { deletedAt: null } }),
    prisma.character.count({ where: { deletedAt: null, status: CharacterStatus.PUBLISHED } }),
    prisma.character.count({ where: { deletedAt: null, status: CharacterStatus.REVIEW } }),
    prisma.chat.count({ where: { deletedAt: null } }),
    prisma.message.count({ where: { deletedAt: null } }),
    prisma.loreEntry.count({ where: { deletedAt: null } }),
    prisma.favorite.count(),
    prisma.report.count({ where: { status: 'PENDING' } }),
    prisma.usage.aggregate({
      _sum: {
        tokens: true,
        cost: true,
      },
      _count: {
        id: true,
      },
    }),
    prisma.character.findMany({
      where: { deletedAt: null },
      orderBy: [{ chatCount: 'desc' }, { viewCount: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        name: true,
        status: true,
        visibility: true,
        qualityScore: true,
        chatCount: true,
        viewCount: true,
        _count: {
          select: {
            favoritedBy: true,
          },
        },
      },
    }),
  ])

  return {
    totals: {
      users: userCount,
      characters: characterCount,
      publishedCharacters: publishedCharacterCount,
      reviewCharacters: reviewCharacterCount,
      chats: chatCount,
      messages: messageCount,
      loreEntries: loreEntryCount,
      favorites: favoriteCount,
      pendingReports: pendingReportCount,
      usageRequests: usageAggregate._count.id,
      tokens: usageAggregate._sum.tokens ?? 0,
      cost: usageAggregate._sum.cost?.toString() ?? '0',
    },
    topCharacters: topCharacters.map((character) => ({
      id: character.id,
      name: character.name,
      status: character.status,
      visibility: character.visibility,
      qualityScore: character.qualityScore,
      chatCount: character.chatCount,
      viewCount: character.viewCount,
      favoriteCount: character._count.favoritedBy,
    })),
  }
}
