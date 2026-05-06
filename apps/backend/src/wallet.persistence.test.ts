import { afterAll, describe, expect, test } from 'bun:test'
import { TokenTransactionType } from '@prisma/client'
import { adjustUserTokenBalance } from './admin.service'
import { debitUserTokensWithoutOverdraft } from './chat.service'
import { defaultUserId } from './config'
import { getPrisma } from './db'

const prisma = getPrisma()
const ledgerUserId = '770e8400-e29b-41d4-a716-446655440000'

describe('wallet token ledger', () => {
  afterAll(async () => {
    await prisma?.user.deleteMany({ where: { id: ledgerUserId } })
  })

  test('records admin token adjustments as wallet transactions', async () => {
    expect(prisma).not.toBeNull()

    await prisma!.tokenTransaction.deleteMany({ where: { userId: ledgerUserId } })
    await prisma!.user.upsert({
      where: { id: ledgerUserId },
      update: { email: 'ledger@maprang.io', username: 'LedgerUser', tokenBalance: 100 },
      create: {
        id: ledgerUserId,
        email: 'ledger@maprang.io',
        username: 'LedgerUser',
        tokenBalance: 100,
      },
    })

    const result = await adjustUserTokenBalance(ledgerUserId, 250, defaultUserId, 'ledger_test')

    expect(result).not.toBeNull()
    expect('error' in result!).toBe(false)
    if (!result || 'error' in result) return

    expect(result.user.tokenBalance).toBe(350)
    expect(result.transaction).toMatchObject({
      type: TokenTransactionType.ADMIN_ADJUSTMENT,
      amount: 250,
      balanceAfter: 350,
      reason: 'ledger_test',
    })

    const transactions = await prisma!.tokenTransaction.findMany({
      where: { userId: ledgerUserId },
      orderBy: { createdAt: 'desc' },
    })

    expect(transactions).toHaveLength(1)
    expect(transactions[0]).toMatchObject({
      type: TokenTransactionType.ADMIN_ADJUSTMENT,
      amount: 250,
      balanceAfter: 350,
      reason: 'ledger_test',
    })
  })

  test('debits chat usage without allowing negative token balances', async () => {
    expect(prisma).not.toBeNull()

    await prisma!.tokenTransaction.deleteMany({ where: { userId: ledgerUserId } })
    await prisma!.user.upsert({
      where: { id: ledgerUserId },
      update: { email: 'ledger@maprang.io', username: 'LedgerUser', tokenBalance: 100 },
      create: {
        id: ledgerUserId,
        email: 'ledger@maprang.io',
        username: 'LedgerUser',
        tokenBalance: 100,
      },
    })

    const debit = await debitUserTokensWithoutOverdraft(prisma!, ledgerUserId, 250)
    const user = await prisma!.user.findUnique({
      where: { id: ledgerUserId },
      select: { tokenBalance: true },
    })

    expect(debit).toEqual({
      previousBalance: 100,
      tokenBalance: 0,
      chargedTokens: 100,
    })
    expect(user?.tokenBalance).toBe(0)
  })
})
