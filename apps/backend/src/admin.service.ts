import { AdminAuditAction, CharacterStatus, TokenTransactionType } from '@prisma/client'
import { createAdminAuditLog } from './audit.service'
import { getPrisma } from './db'

export function validateTokenAdjustment(amount: number) {
  if (!Number.isInteger(amount)) return 'amount_must_be_integer'
  if (amount === 0) return 'amount_required'
  if (Math.abs(amount) > 1_000_000) return 'amount_too_large'
  return null
}

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

export async function adjustUserTokenBalance(userId: string, amount: number, actorUserId?: string | null, reason?: string | null) {
  const prisma = getPrisma()
  if (!prisma) return null

  const validationError = validateTokenAdjustment(amount)
  if (validationError) return { error: validationError }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, username: true, role: true, tokenBalance: true },
  })
  if (!user) return { error: 'user_not_found' }

  const nextBalance = user.tokenBalance + amount
  if (nextBalance < 0) return { error: 'insufficient_token_balance' }

  return prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: nextBalance },
      select: { id: true, email: true, username: true, role: true, tokenBalance: true },
    })

    const transaction = await tx.tokenTransaction.create({
      data: {
        userId,
        type: TokenTransactionType.ADMIN_ADJUSTMENT,
        amount,
        balanceAfter: nextBalance,
        reason: reason?.trim() || null,
        metadata: {
          actorUserId,
          previousBalance: user.tokenBalance,
        },
      },
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        reason: true,
        createdAt: true,
      },
    })

    await createAdminAuditLog(
      {
        action: AdminAuditAction.TOKEN_ADJUSTMENT,
        targetType: 'USER',
        targetId: userId,
        actorUserId,
        metadata: {
          amount,
          previousBalance: user.tokenBalance,
          nextBalance,
          reason: reason?.trim() || null,
        },
      },
      tx,
    )

    return { user: updatedUser, adjustment: amount, transaction }
  })
}
